import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Save } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { useMediaLookup } from '@/hooks/useMediaLookup';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/Field';
import { MarkdownEditor, renderMarkdown } from '@/components/ui/RichText';
import { TagInput } from '@/components/ui/TagInput';
import { Modal } from '@/components/ui/Modal';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { MediaField } from '@/components/admin/MediaField';
import { AdminPageHeader, AdminSection } from '@/components/admin/AdminUI';
import type { AdminProject, BlogTag, MediaDTO, PublishState } from '@/types/api';

const STATE_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'ARCHIVED', label: 'Archived' },
];

interface AdminBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  contentMd: string;
  contentHtml: string;
  coverMediaId: string | null;
  category: string;
  state: PublishState;
  publishedAt: string | null;
  scheduledFor: string | null;
  seoTitle: string;
  seoDescription: string;
  tags: BlogTag[];
  projectId: string | null;
  featured: boolean;
  readingMinutes: number;
  updatedAt: string;
  cover: MediaDTO | null;
  project?: { id: string; title: string; slug: string } | null;
}

interface FormState {
  title: string;
  slug: string;
  excerpt: string;
  contentMd: string;
  coverMediaId: string | null;
  category: string;
  state: string;
  publishedAt: string;
  scheduledFor: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  projectId: string;
  featured: boolean;
}

function toDateInput(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

const EMPTY: FormState = {
  title: '',
  slug: '',
  excerpt: '',
  contentMd: '',
  coverMediaId: null,
  category: '',
  state: 'DRAFT',
  publishedAt: '',
  scheduledFor: '',
  seoTitle: '',
  seoDescription: '',
  tags: [],
  projectId: '',
  featured: false,
};

export function AdminBlogEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const media = useMediaLookup();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ open: boolean; html: string; title: string }>({ open: false, html: '', title: '' });

  const projects = useAsync<AdminProject[]>(
    () => api.getList<AdminProject>('/api/admin/projects', { pageSize: 100 }).then((r) => r.items),
    [],
  );

  const query = useAsync<AdminBlogPost | null>(
    () => (id ? api.get<AdminBlogPost>(`/api/admin/blog/${id}`).then((r) => r.data) : Promise.resolve(null)),
    [id],
  );

  useEffect(() => {
    const post = query.data;
    if (!post) return;
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? '',
      contentMd: post.contentMd ?? '',
      coverMediaId: post.coverMediaId,
      category: post.category ?? '',
      state: post.state ?? 'DRAFT',
      publishedAt: toDateInput(post.publishedAt),
      scheduledFor: toDateInput(post.scheduledFor),
      seoTitle: post.seoTitle ?? '',
      seoDescription: post.seoDescription ?? '',
      tags: (post.tags ?? []).map((tag) => tag.name),
      projectId: post.projectId ?? '',
      featured: post.featured,
    });
  }, [query.data]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const estimatedMinutes = useMemo(() => {
    const words = form.contentMd.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  }, [form.contentMd]);

  const openPreview = async () => {
    if (id) {
      try {
        const result = await api.get<AdminBlogPost>(`/api/admin/blog/${id}/preview`);
        setPreview({ open: true, html: result.data.contentHtml, title: form.title || 'Draft preview' });
        return;
      } catch (error) {
        toast.error(errorMessage(error));
      }
    }
    setPreview({ open: true, html: renderMarkdown(form.contentMd), title: form.title || 'Draft preview' });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        slug: form.slug || undefined,
        excerpt: form.excerpt,
        contentMd: form.contentMd,
        coverMediaId: form.coverMediaId || null,
        category: form.category,
        state: form.state,
        publishedAt: form.publishedAt || null,
        scheduledFor: form.scheduledFor || null,
        seoTitle: form.seoTitle,
        seoDescription: form.seoDescription,
        tags: form.tags.filter(Boolean),
        projectId: form.projectId || null,
        featured: form.featured,
      };
      if (isNew) {
        const result = await api.post<AdminBlogPost>('/api/admin/blog', payload);
        toast.success('Post created');
        navigate(`/admin/blog/${result.data.id}`, { replace: true });
      } else {
        await api.put(`/api/admin/blog/${id}`, payload);
        toast.success('Post saved');
        await query.reload();
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (id && query.loading) return <LoadingBlock label="Loading post…" />;
  if (id && (query.error || !query.data)) {
    return (
      <EmptyState
        title="Post not found"
        action={
          <Link to="/admin/blog" className="btn btn-outline btn-sm">
            Back to blog
          </Link>
        }
      />
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <AdminPageHeader
        title={isNew ? 'New post' : 'Edit post'}
        description={!isNew && query.data ? `Last updated ${formatDate(query.data.updatedAt)}` : undefined}
        actions={
          <>
            <Link to="/admin/blog" className="btn btn-outline btn-sm">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
            </Link>
            <Button type="button" variant="outline" size="sm" onClick={() => void openPreview()} iconLeft={<Eye className="h-4 w-4" aria-hidden="true" />}>
              Preview
            </Button>
            <Button type="submit" size="sm" loading={saving} iconLeft={<Save className="h-4 w-4" aria-hidden="true" />}>
              {isNew ? 'Create post' : 'Save changes'}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <AdminSection title="Content">
            <div className="space-y-4">
              <Field label="Title" htmlFor="b-title" required>
                <Input id="b-title" value={form.title} onChange={(e) => update('title', e.target.value)} required />
              </Field>
              <Field label="Excerpt" htmlFor="b-excerpt" hint="A short summary shown in feeds and search results. Left blank, one is generated.">
                <Textarea id="b-excerpt" rows={3} maxLength={500} value={form.excerpt} onChange={(e) => update('excerpt', e.target.value)} />
              </Field>
              <MarkdownEditor label={`Body · about ${estimatedMinutes} min read`} value={form.contentMd} onChange={(v) => update('contentMd', v)} rows={18} />
            </div>
          </AdminSection>

          <AdminSection title="Search engine listing">
            <div className="space-y-4">
              <Field label="SEO title" htmlFor="b-seotitle" hint="Falls back to the post title.">
                <Input id="b-seotitle" value={form.seoTitle} onChange={(e) => update('seoTitle', e.target.value)} maxLength={240} />
              </Field>
              <Field label="SEO description" htmlFor="b-seodesc">
                <Textarea id="b-seodesc" rows={2} maxLength={400} value={form.seoDescription} onChange={(e) => update('seoDescription', e.target.value)} />
              </Field>
            </div>
          </AdminSection>
        </div>

        <div className="space-y-6">
          <AdminSection title="Publishing">
            <div className="space-y-4">
              <Field label="State" htmlFor="b-state">
                <Select id="b-state" value={form.state} onChange={(e) => update('state', e.target.value)} options={STATE_OPTIONS} />
              </Field>
              {form.state === 'SCHEDULED' ? (
                <Field label="Scheduled for" htmlFor="b-sched" required>
                  <Input id="b-sched" type="date" value={form.scheduledFor} onChange={(e) => update('scheduledFor', e.target.value)} />
                </Field>
              ) : null}
              <Field label="Publish date" htmlFor="b-pub" hint="Leave blank to stamp on publish.">
                <Input id="b-pub" type="date" value={form.publishedAt} onChange={(e) => update('publishedAt', e.target.value)} />
              </Field>
              <Field label="URL slug" htmlFor="b-slug" hint="Auto-generated from the title if blank.">
                <Input id="b-slug" value={form.slug} onChange={(e) => update('slug', e.target.value)} />
              </Field>
              <Field label="Category" htmlFor="b-cat">
                <Input id="b-cat" value={form.category} onChange={(e) => update('category', e.target.value)} placeholder="e.g. Engineering" />
              </Field>
              <Field label="Linked project" htmlFor="b-project">
                <Select
                  id="b-project"
                  value={form.projectId}
                  onChange={(e) => update('projectId', e.target.value)}
                  placeholder="No project"
                  options={(projects.data ?? []).map((p) => ({ value: p.id, label: p.title }))}
                />
              </Field>
              <Field label="Tags">
                <TagInput value={form.tags} onChange={(v) => update('tags', v)} />
              </Field>
              <Switch checked={form.featured} onChange={(v) => update('featured', v)} label="Featured" />
            </div>
          </AdminSection>

          <AdminSection title="Cover image">
            <MediaField value={form.coverMediaId} asset={media.resolve(form.coverMediaId)} kind="IMAGE" onChange={(mid) => update('coverMediaId', mid)} />
          </AdminSection>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button type="submit" loading={saving} iconLeft={<Save className="h-4 w-4" aria-hidden="true" />}>
          {isNew ? 'Create post' : 'Save changes'}
        </Button>
      </div>

      <Modal open={preview.open} onClose={() => setPreview({ open: false, html: '', title: '' })} title={preview.title} description="Draft preview — not visible to the public." size="lg">
        <div className="mb-3">
          <Badge variant="info">Preview</Badge>
        </div>
        {/* Content is rendered and sanitised on the server (and by DOMPurify client-side for unsaved drafts). */}
        <article className="rich-text max-h-[60vh] overflow-y-auto" dangerouslySetInnerHTML={{ __html: preview.html || '<p style="opacity:.6">Nothing to preview yet.</p>' }} />
      </Modal>
    </form>
  );
}
