import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { useMediaLookup } from '@/hooks/useMediaLookup';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/Field';
import { MarkdownEditor } from '@/components/ui/RichText';
import { TagInput } from '@/components/ui/TagInput';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { MediaField } from '@/components/admin/MediaField';
import { AdminPageHeader, AdminSection } from '@/components/admin/AdminUI';
import type { AdminProject, MediaDTO, PublishState } from '@/types/api';

const STATE_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

interface AdminJourney {
  id: string;
  title: string;
  slug: string;
  date: string;
  description: string;
  contentMd: string;
  coverMediaId: string | null;
  videoUrl: string;
  videoMediaId: string | null;
  images: string[];
  tags: string[];
  projectId: string | null;
  externalUrl: string;
  state: PublishState;
  featured: boolean;
  sortOrder: number;
  cover: MediaDTO | null;
  video: MediaDTO | null;
  project: { id: string; title: string; slug: string } | null;
}

interface FormState {
  title: string;
  slug: string;
  date: string;
  description: string;
  contentMd: string;
  coverMediaId: string | null;
  videoUrl: string;
  videoMediaId: string | null;
  images: string[];
  tags: string[];
  projectId: string;
  externalUrl: string;
  state: string;
  featured: boolean;
  sortOrder: number;
}

function toDateInput(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

const EMPTY: FormState = {
  title: '',
  slug: '',
  date: toDateInput(new Date().toISOString()),
  description: '',
  contentMd: '',
  coverMediaId: null,
  videoUrl: '',
  videoMediaId: null,
  images: [],
  tags: [],
  projectId: '',
  externalUrl: '',
  state: 'DRAFT',
  featured: false,
  sortOrder: 0,
};

export function AdminJourneyEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const media = useMediaLookup();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const projects = useAsync<AdminProject[]>(
    () => api.getList<AdminProject>('/api/admin/projects', { pageSize: 100 }).then((r) => r.items),
    [],
  );

  const query = useAsync<AdminJourney | null>(
    () => (id ? api.get<AdminJourney>(`/api/admin/journey/${id}`).then((r) => r.data) : Promise.resolve(null)),
    [id],
  );

  useEffect(() => {
    const entry = query.data;
    if (!entry) return;
    setForm({
      title: entry.title,
      slug: entry.slug,
      date: toDateInput(entry.date),
      description: entry.description,
      contentMd: entry.contentMd ?? '',
      coverMediaId: entry.coverMediaId,
      videoUrl: entry.videoUrl ?? '',
      videoMediaId: entry.videoMediaId,
      images: entry.images ?? [],
      tags: entry.tags ?? [],
      projectId: entry.projectId ?? '',
      externalUrl: entry.externalUrl ?? '',
      state: entry.state ?? 'DRAFT',
      featured: entry.featured,
      sortOrder: entry.sortOrder,
    });
  }, [query.data]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        date: form.date || new Date().toISOString().slice(0, 10),
        coverMediaId: form.coverMediaId || null,
        videoMediaId: form.videoMediaId || null,
        projectId: form.projectId || null,
        images: form.images.filter(Boolean),
        tags: form.tags.filter(Boolean),
      };
      if (isNew) {
        const result = await api.post<AdminJourney>('/api/admin/journey', payload);
        toast.success('Entry created');
        navigate(`/admin/journey/${result.data.id}`, { replace: true });
      } else {
        await api.put(`/api/admin/journey/${id}`, payload);
        toast.success('Entry saved');
        await query.reload();
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (id && query.loading) return <LoadingBlock label="Loading entry…" />;
  if (id && (query.error || !query.data)) {
    return (
      <EmptyState
        title="Entry not found"
        action={
          <Link to="/admin/journey" className="btn btn-outline btn-sm">
            Back to journey
          </Link>
        }
      />
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <AdminPageHeader
        title={isNew ? 'New journey entry' : 'Edit journey entry'}
        actions={
          <>
            <Link to="/admin/journey" className="btn btn-outline btn-sm">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
            </Link>
            <Button type="submit" size="sm" loading={saving} iconLeft={<Save className="h-4 w-4" aria-hidden="true" />}>
              {isNew ? 'Create entry' : 'Save changes'}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <AdminSection title="Content">
            <div className="space-y-4">
              <Field label="Title" htmlFor="j-title" required>
                <Input id="j-title" value={form.title} onChange={(e) => update('title', e.target.value)} required />
              </Field>
              <Field label="Summary" htmlFor="j-desc" hint="Shown in the feed.">
                <Textarea id="j-desc" rows={2} value={form.description} onChange={(e) => update('description', e.target.value)} />
              </Field>
              <MarkdownEditor label="Body" value={form.contentMd} onChange={(v) => update('contentMd', v)} rows={14} />
            </div>
          </AdminSection>

          <AdminSection
            title="Gallery"
            actions={
              <Button type="button" size="sm" variant="outline" onClick={() => update('images', [...form.images, ''])} iconLeft={<Plus className="h-4 w-4" aria-hidden="true" />}>
                Add image
              </Button>
            }
          >
            {form.images.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                No gallery images.
              </p>
            ) : (
              <div className="space-y-4">
                {form.images.map((imageId, index) => (
                  <div key={index} className="flex items-end gap-3">
                    <div className="flex-1">
                      <MediaField
                        value={imageId}
                        asset={media.resolve(imageId)}
                        kind="IMAGE"
                        onChange={(mid) => update('images', form.images.map((item, i) => (i === index ? mid ?? '' : item)))}
                      />
                    </div>
                    <Button type="button" variant="ghost" className="text-red-400" onClick={() => update('images', form.images.filter((_, i) => i !== index))} aria-label="Remove image">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </AdminSection>
        </div>

        <div className="space-y-6">
          <AdminSection title="Publishing">
            <div className="space-y-4">
              <Field label="Title slug" htmlFor="j-slug" hint="Optional.">
                <Input id="j-slug" value={form.slug} onChange={(e) => update('slug', e.target.value)} />
              </Field>
              <Field label="Date" htmlFor="j-date" required>
                <Input id="j-date" type="date" value={form.date} onChange={(e) => update('date', e.target.value)} required />
              </Field>
              <Field label="State" htmlFor="j-state">
                <Select id="j-state" value={form.state} onChange={(e) => update('state', e.target.value)} options={STATE_OPTIONS} />
              </Field>
              <Field label="Linked project" htmlFor="j-project">
                <Select
                  id="j-project"
                  value={form.projectId}
                  onChange={(e) => update('projectId', e.target.value)}
                  placeholder="No project"
                  options={(projects.data ?? []).map((p) => ({ value: p.id, label: p.title }))}
                />
              </Field>
              <Switch checked={form.featured} onChange={(v) => update('featured', v)} label="Featured" />
            </div>
          </AdminSection>

          <AdminSection title="Media & links">
            <div className="space-y-4">
              <MediaField label="Cover image" value={form.coverMediaId} asset={media.resolve(form.coverMediaId)} kind="IMAGE" onChange={(mid) => update('coverMediaId', mid)} />
              <Field label="Video URL" htmlFor="j-videourl" hint="YouTube or Vimeo link.">
                <Input id="j-videourl" value={form.videoUrl} onChange={(e) => update('videoUrl', e.target.value)} placeholder="https://" />
              </Field>
              <MediaField label="Video file" value={form.videoMediaId} asset={media.resolve(form.videoMediaId)} kind="VIDEO" onChange={(mid) => update('videoMediaId', mid)} />
              <Field label="External URL" htmlFor="j-ext">
                <Input id="j-ext" value={form.externalUrl} onChange={(e) => update('externalUrl', e.target.value)} placeholder="https://" />
              </Field>
              <Field label="Tags">
                <TagInput value={form.tags} onChange={(v) => update('tags', v)} />
              </Field>
            </div>
          </AdminSection>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button type="submit" loading={saving} iconLeft={<Save className="h-4 w-4" aria-hidden="true" />}>
          {isNew ? 'Create entry' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
