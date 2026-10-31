import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { useMediaLookup } from '@/hooks/useMediaLookup';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/Field';
import { ListEditor } from '@/components/ui/ListEditor';
import { MarkdownEditor } from '@/components/ui/RichText';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { MediaField } from '@/components/admin/MediaField';
import { AdminPageHeader, AdminSection } from '@/components/admin/AdminUI';
import type { AdminProject, MediaDTO, Skill } from '@/types/api';

const STATUS_OPTIONS = [
  { value: 'CONCEPT', label: 'Concept' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'PROTOTYPE', label: 'Prototype' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const PUBLISH_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'ARCHIVED', label: 'Archived' },
];

interface GalleryItem {
  id?: string;
  mediaId: string;
  caption: string;
  alt: string;
  media?: MediaDTO | null;
}
interface DocItem {
  id?: string;
  mediaId: string;
  label: string;
  media?: MediaDTO | null;
}

interface FormState {
  title: string;
  slug: string;
  shortDescription: string;
  overview: string;
  problemStatement: string;
  approach: string;
  solution: string;
  outcome: string;
  keyFeatures: string[];
  challenges: string[];
  learnings: string[];
  category: string;
  role: string;
  teamInfo: string;
  startDate: string;
  endDate: string;
  status: string;
  coverMediaId: string | null;
  githubUrl: string;
  liveDemoUrl: string;
  demoVideoUrl: string;
  reportMediaId: string | null;
  featured: boolean;
  state: string;
  seoTitle: string;
  seoDescription: string;
  skillIds: string[];
  images: GalleryItem[];
  documents: DocItem[];
}

const EMPTY: FormState = {
  title: '',
  slug: '',
  shortDescription: '',
  overview: '',
  problemStatement: '',
  approach: '',
  solution: '',
  outcome: '',
  keyFeatures: [],
  challenges: [],
  learnings: [],
  category: '',
  role: '',
  teamInfo: '',
  startDate: '',
  endDate: '',
  status: 'CONCEPT',
  coverMediaId: null,
  githubUrl: '',
  liveDemoUrl: '',
  demoVideoUrl: '',
  reportMediaId: null,
  featured: false,
  state: 'DRAFT',
  seoTitle: '',
  seoDescription: '',
  skillIds: [],
  images: [],
  documents: [],
};

function toDateInput(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

export function AdminProjectEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const media = useMediaLookup();
  const [tab, setTab] = useState('basics');
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const skillsQuery = useAsync<Skill[]>(
    () => api.getList<Skill>('/api/admin/skills', { pageSize: 500 }).then((r) => r.items),
    [],
  );

  const projectQuery = useAsync<AdminProject | null>(
    () => (id ? api.get<AdminProject>(`/api/admin/projects/${id}`).then((r) => r.data) : Promise.resolve(null)),
    [id],
  );

  useEffect(() => {
    const project = projectQuery.data;
    if (!project) return;
    setForm({
      title: project.title,
      slug: project.slug,
      shortDescription: project.shortDescription,
      overview: project.overview,
      problemStatement: project.problemStatement,
      approach: project.approach,
      solution: project.solution,
      outcome: project.outcome,
      keyFeatures: project.keyFeatures ?? [],
      challenges: project.challenges ?? [],
      learnings: project.learnings ?? [],
      category: project.category,
      role: project.role ?? '',
      teamInfo: project.teamInfo ?? '',
      startDate: toDateInput(project.startDate),
      endDate: toDateInput(project.endDate),
      status: project.status,
      coverMediaId: project.coverMediaId,
      githubUrl: project.githubUrl ?? '',
      liveDemoUrl: project.liveDemoUrl ?? '',
      demoVideoUrl: project.demoVideoUrl ?? '',
      reportMediaId: project.reportMediaId,
      featured: project.featured,
      state: project.state,
      seoTitle: project.seoTitle ?? '',
      seoDescription: project.seoDescription ?? '',
      skillIds: (project.skills ?? []).map((s) => s.id),
      images: (project.images ?? []).map((img) => ({ id: img.id, mediaId: img.mediaId, caption: img.caption, alt: img.alt, media: img.media })),
      documents: (project.docs ?? []).map((doc) => ({ id: doc.id, mediaId: doc.mediaId, label: doc.label, media: doc.media })),
    });
  }, [projectQuery.data]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const allSkills = useMemo(() => skillsQuery.data ?? [], [skillsQuery.data]);

  const toggleSkill = (skillId: string) =>
    setForm((prev) => ({
      ...prev,
      skillIds: prev.skillIds.includes(skillId) ? prev.skillIds.filter((s) => s !== skillId) : [...prev.skillIds, skillId],
    }));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        coverMediaId: form.coverMediaId || null,
        reportMediaId: form.reportMediaId || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        images: form.images.filter((img) => img.mediaId).map((img) => ({ mediaId: img.mediaId, caption: img.caption, alt: img.alt })),
        documents: form.documents.filter((doc) => doc.mediaId).map((doc) => ({ mediaId: doc.mediaId, label: doc.label })),
      };
      if (isNew) {
        const result = await api.post<AdminProject>('/api/admin/projects', payload);
        toast.success('Project created');
        navigate(`/admin/projects/${result.data.id}`, { replace: true });
      } else {
        await api.put(`/api/admin/projects/${id}`, payload);
        toast.success('Project saved');
        await projectQuery.reload();
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (id && projectQuery.loading) return <LoadingBlock label="Loading project…" />;
  if (id && (projectQuery.error || !projectQuery.data)) {
    return (
      <EmptyState
        title="Project not found"
        description="It may have been deleted."
        action={
          <Link to="/admin/projects" className="btn btn-outline btn-sm">
            Back to projects
          </Link>
        }
      />
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <AdminPageHeader
        title={isNew ? 'New project' : 'Edit project'}
        description="Write the case study, attach media and choose when to publish."
        actions={
          <>
            <Link to="/admin/projects" className="btn btn-outline btn-sm">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
            </Link>
            <Button type="submit" size="sm" loading={saving} iconLeft={<Save className="h-4 w-4" aria-hidden="true" />}>
              {isNew ? 'Create project' : 'Save changes'}
            </Button>
          </>
        }
      />

      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'basics', label: 'Basics' },
          { id: 'story', label: 'Case study' },
          { id: 'media', label: 'Media' },
          { id: 'seo', label: 'Publishing & SEO' },
        ]}
      />

      {tab === 'basics' ? (
        <div className="space-y-6">
          <AdminSection title="Overview">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" htmlFor="pr-title" required className="sm:col-span-2">
                <Input id="pr-title" value={form.title} onChange={(e) => update('title', e.target.value)} required />
              </Field>
              <Field label="Slug" htmlFor="pr-slug" hint="Leave blank to generate from the title.">
                <Input id="pr-slug" value={form.slug} onChange={(e) => update('slug', e.target.value)} />
              </Field>
              <Field label="Category" htmlFor="pr-category" hint="e.g. Data analytics, Web app.">
                <Input id="pr-category" value={form.category} onChange={(e) => update('category', e.target.value)} />
              </Field>
              <Field label="Short description" htmlFor="pr-short" className="sm:col-span-2" hint="One or two sentences used in cards and previews.">
                <Textarea id="pr-short" rows={2} value={form.shortDescription} onChange={(e) => update('shortDescription', e.target.value)} />
              </Field>
              <Field label="Role" htmlFor="pr-role" hint="Your role, e.g. Solo developer.">
                <Input id="pr-role" value={form.role} onChange={(e) => update('role', e.target.value)} />
              </Field>
              <Field label="Team" htmlFor="pr-team" hint="Team info if collaborative.">
                <Input id="pr-team" value={form.teamInfo} onChange={(e) => update('teamInfo', e.target.value)} />
              </Field>
              <Field label="Start date" htmlFor="pr-start">
                <Input id="pr-start" type="date" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} />
              </Field>
              <Field label="End date" htmlFor="pr-end" hint="Leave blank if ongoing.">
                <Input id="pr-end" type="date" value={form.endDate} onChange={(e) => update('endDate', e.target.value)} />
              </Field>
              <Field label="Project status" htmlFor="pr-status">
                <Select id="pr-status" value={form.status} onChange={(e) => update('status', e.target.value)} options={STATUS_OPTIONS} />
              </Field>
            </div>
          </AdminSection>

          <AdminSection title="Links" description="Only add links that are real and public.">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Source code URL" htmlFor="pr-github">
                <Input id="pr-github" value={form.githubUrl} onChange={(e) => update('githubUrl', e.target.value)} placeholder="https://github.com/…" />
              </Field>
              <Field label="Live demo URL" htmlFor="pr-live">
                <Input id="pr-live" value={form.liveDemoUrl} onChange={(e) => update('liveDemoUrl', e.target.value)} placeholder="https://…" />
              </Field>
              <Field label="Demo video URL" htmlFor="pr-video">
                <Input id="pr-video" value={form.demoVideoUrl} onChange={(e) => update('demoVideoUrl', e.target.value)} placeholder="https://…" />
              </Field>
            </div>
          </AdminSection>

          <AdminSection title="Technologies" description="Link the skills this project demonstrates.">
            {skillsQuery.loading ? (
              <LoadingBlock label="Loading skills…" />
            ) : allSkills.length === 0 ? (
              <EmptyState title="No skills yet" description="Add skills first, then link them here." />
            ) : (
              <div className="flex flex-wrap gap-2">
                {allSkills.map((skill) => {
                  const active = form.skillIds.includes(skill.id);
                  return (
                    <button key={skill.id} type="button" className="chip" aria-pressed={active} onClick={() => toggleSkill(skill.id)}>
                      {skill.name}
                    </button>
                  );
                })}
              </div>
            )}
          </AdminSection>
        </div>
      ) : null}

      {tab === 'story' ? (
        <div className="space-y-6">
          <AdminSection title="Case study" description="Markdown is supported and sanitised on save.">
            <div className="space-y-5">
              <MarkdownEditor label="Overview" value={form.overview} onChange={(v) => update('overview', v)} rows={6} />
              <MarkdownEditor label="The problem" value={form.problemStatement} onChange={(v) => update('problemStatement', v)} rows={5} />
              <MarkdownEditor label="Approach" value={form.approach} onChange={(v) => update('approach', v)} rows={5} />
              <MarkdownEditor label="Solution" value={form.solution} onChange={(v) => update('solution', v)} rows={5} />
              <MarkdownEditor label="Outcome" value={form.outcome} onChange={(v) => update('outcome', v)} rows={5} />
            </div>
          </AdminSection>

          <div className="grid gap-6 lg:grid-cols-3">
            <AdminSection title="Key features">
              <ListEditor value={form.keyFeatures} onChange={(v) => update('keyFeatures', v)} addLabel="Add feature" />
            </AdminSection>
            <AdminSection title="Challenges">
              <ListEditor value={form.challenges} onChange={(v) => update('challenges', v)} addLabel="Add challenge" />
            </AdminSection>
            <AdminSection title="What I learned">
              <ListEditor value={form.learnings} onChange={(v) => update('learnings', v)} addLabel="Add learning" />
            </AdminSection>
          </div>
        </div>
      ) : null}

      {tab === 'media' ? (
        <div className="space-y-6">
          <AdminSection title="Cover & report">
            <div className="grid gap-5 sm:grid-cols-2">
              <MediaField
                label="Cover image"
                value={form.coverMediaId}
                asset={media.resolve(form.coverMediaId)}
                kind="IMAGE"
                onChange={(mid) => update('coverMediaId', mid)}
              />
              <MediaField
                label="Full report (PDF)"
                value={form.reportMediaId}
                asset={media.resolve(form.reportMediaId)}
                kind="PDF"
                onChange={(mid) => update('reportMediaId', mid)}
              />
            </div>
          </AdminSection>

          <AdminSection
            title="Gallery"
            description="Screenshots and diagrams."
            actions={
              <Button type="button" size="sm" variant="outline" onClick={() => update('images', [...form.images, { mediaId: '', caption: '', alt: '' }])} iconLeft={<Plus className="h-4 w-4" aria-hidden="true" />}>
                Add image
              </Button>
            }
          >
            {form.images.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                No gallery images yet.
              </p>
            ) : (
              <div className="space-y-4">
                {form.images.map((image, index) => (
                  <div key={index} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[12rem_1fr_auto]" style={{ borderColor: 'var(--border)' }}>
                    <MediaField
                      value={image.mediaId}
                      asset={image.media ?? media.resolve(image.mediaId)}
                      kind="IMAGE"
                      onChange={(mid, asset) =>
                        update(
                          'images',
                          form.images.map((item, i) => (i === index ? { ...item, mediaId: mid ?? '', media: asset } : item)),
                        )
                      }
                    />
                    <div className="grid gap-2">
                      <Input
                        placeholder="Caption"
                        value={image.caption}
                        onChange={(e) => update('images', form.images.map((item, i) => (i === index ? { ...item, caption: e.target.value } : item)))}
                      />
                      <Input
                        placeholder="Alt text (accessibility)"
                        value={image.alt}
                        onChange={(e) => update('images', form.images.map((item, i) => (i === index ? { ...item, alt: e.target.value } : item)))}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="self-start text-red-400"
                      onClick={() => update('images', form.images.filter((_, i) => i !== index))}
                      aria-label={`Remove image ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </AdminSection>

          <AdminSection
            title="Documents"
            description="Supporting files (PDFs, slides)."
            actions={
              <Button type="button" size="sm" variant="outline" onClick={() => update('documents', [...form.documents, { mediaId: '', label: '' }])} iconLeft={<Plus className="h-4 w-4" aria-hidden="true" />}>
                Add document
              </Button>
            }
          >
            {form.documents.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                No documents yet.
              </p>
            ) : (
              <div className="space-y-4">
                {form.documents.map((doc, index) => (
                  <div key={index} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[12rem_1fr_auto]" style={{ borderColor: 'var(--border)' }}>
                    <MediaField
                      value={doc.mediaId}
                      asset={doc.media ?? media.resolve(doc.mediaId)}
                      onChange={(mid, asset) =>
                        update(
                          'documents',
                          form.documents.map((item, i) => (i === index ? { ...item, mediaId: mid ?? '', media: asset } : item)),
                        )
                      }
                    />
                    <Input
                      placeholder="Label"
                      value={doc.label}
                      onChange={(e) => update('documents', form.documents.map((item, i) => (i === index ? { ...item, label: e.target.value } : item)))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      className="self-start text-red-400"
                      onClick={() => update('documents', form.documents.filter((_, i) => i !== index))}
                      aria-label={`Remove document ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </AdminSection>
        </div>
      ) : null}

      {tab === 'seo' ? (
        <div className="space-y-6">
          <AdminSection title="Publishing">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="State" htmlFor="pr-state" hint="Only published projects appear on the public site.">
                <Select id="pr-state" value={form.state} onChange={(e) => update('state', e.target.value)} options={PUBLISH_OPTIONS} />
              </Field>
              <div className="flex items-end">
                <Switch checked={form.featured} onChange={(v) => update('featured', v)} label="Featured project" description="Highlight on the home page." />
              </div>
            </div>
          </AdminSection>

          <AdminSection title="Search engine metadata">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="SEO title" htmlFor="pr-seotitle" hint="Leave blank to use the project title.">
                <Input id="pr-seotitle" value={form.seoTitle} onChange={(e) => update('seoTitle', e.target.value)} />
              </Field>
              <Field label="SEO description" htmlFor="pr-seodesc">
                <Input id="pr-seodesc" value={form.seoDescription} onChange={(e) => update('seoDescription', e.target.value)} />
              </Field>
            </div>
          </AdminSection>
        </div>
      ) : null}

      <div className="mt-8 flex justify-end">
        <Button type="submit" loading={saving} iconLeft={<Save className="h-4 w-4" aria-hidden="true" />}>
          {isNew ? 'Create project' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
