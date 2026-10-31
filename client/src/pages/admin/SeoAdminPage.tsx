import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { CheckCircle2, Download, FileText, Pencil, Plus, Save, Star, Trash2, Upload } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { useMediaLookup } from '@/hooks/useMediaLookup';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { MediaField } from '@/components/admin/MediaField';
import { AdminPageHeader, AdminSection, RowActions, TableWrap, Td, Th } from '@/components/admin/AdminUI';
import type { ResumeVersion, SiteSettings } from '@/types/api';

const ROBOTS_OPTIONS = [
  { value: 'index,follow', label: 'index, follow (default)' },
  { value: 'index,nofollow', label: 'index, nofollow' },
  { value: 'noindex,follow', label: 'noindex, follow' },
  { value: 'noindex,nofollow', label: 'noindex, nofollow (hide from search)' },
];

const RESUME_MODE_OPTIONS = [
  { value: 'UPLOADED', label: 'Download the uploaded PDF (recommended)' },
  { value: 'GENERATED', label: 'Use the generated web resume' },
];

export function AdminSeoPage() {
  const [tab, setTab] = useState('site');
  return (
    <div>
      <AdminPageHeader title="SEO & settings" description="Search metadata, site-wide options and resume versions." />
      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'site', label: 'Site & SEO' },
          { id: 'resume', label: 'Resume' },
        ]}
      />
      {tab === 'site' ? <SiteSettingsForm /> : <ResumeManager />}
    </div>
  );
}

function SiteSettingsForm() {
  const toast = useToast();
  const media = useMediaLookup();
  const query = useAsync<SiteSettings>(() => api.get<SiteSettings>('/api/admin/settings').then((r) => r.data), []);
  const [form, setForm] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (query.data) setForm({ ...query.data });
  }, [query.data]);

  const update = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      await api.put('/api/admin/settings', {
        siteUrl: form.siteUrl,
        siteTitle: form.siteTitle,
        siteDescription: form.siteDescription,
        robots: form.robots,
        analyticsEnabled: form.analyticsEnabled,
        resumePrimaryMode: form.resumePrimaryMode,
        footerNote: form.footerNote,
        privacyNote: form.privacyNote,
        defaultOgImageId: form.defaultOgImageId || null,
      });
      toast.success('Settings saved');
      await query.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (query.loading || !form) return <LoadingBlock label="Loading settings…" />;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <AdminSection title="Site identity" description="Used for metadata, Open Graph tags and canonical URLs.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Site URL" htmlFor="s-url" hint="Full origin, e.g. https://example.com." className="sm:col-span-2">
            <Input id="s-url" value={form.siteUrl} onChange={(e) => update('siteUrl', e.target.value)} placeholder="https://" />
          </Field>
          <Field label="Site title" htmlFor="s-title">
            <Input id="s-title" value={form.siteTitle} onChange={(e) => update('siteTitle', e.target.value)} />
          </Field>
          <Field label="Robots" htmlFor="s-robots">
            <Select id="s-robots" value={form.robots} onChange={(e) => update('robots', e.target.value)} options={ROBOTS_OPTIONS} />
          </Field>
          <Field label="Site description" htmlFor="s-desc" className="sm:col-span-2">
            <Textarea id="s-desc" rows={3} value={form.siteDescription} onChange={(e) => update('siteDescription', e.target.value)} />
          </Field>
          <MediaField
            label="Default Open Graph image"
            value={form.defaultOgImageId}
            asset={form.defaultOgImage ?? media.resolve(form.defaultOgImageId)}
            kind="IMAGE"
            onChange={(id) => update('defaultOgImageId', id)}
          />
        </div>
      </AdminSection>

      <AdminSection title="Behaviour">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Resume primary mode" htmlFor="s-resume">
            <Select id="s-resume" value={form.resumePrimaryMode} onChange={(e) => update('resumePrimaryMode', e.target.value as SiteSettings['resumePrimaryMode'])} options={RESUME_MODE_OPTIONS} />
          </Field>
          <div className="flex items-end">
            <Switch
              checked={form.analyticsEnabled}
              onChange={(v) => update('analyticsEnabled', v)}
              label="Collect first-party analytics"
              description="Counts page views and interactions in this site's own database."
            />
          </div>
        </div>
      </AdminSection>

      <AdminSection title="Footer & privacy">
        <div className="grid gap-4">
          <Field label="Footer note" htmlFor="s-footer">
            <Input id="s-footer" value={form.footerNote} onChange={(e) => update('footerNote', e.target.value)} />
          </Field>
          <Field label="Privacy note" htmlFor="s-privacy">
            <Textarea id="s-privacy" rows={3} value={form.privacyNote} onChange={(e) => update('privacyNote', e.target.value)} />
          </Field>
        </div>
      </AdminSection>

      <div className="flex justify-end">
        <Button type="submit" loading={saving} iconLeft={<Save className="h-4 w-4" aria-hidden="true" />}>
          Save settings
        </Button>
      </div>
    </form>
  );
}

interface ResumeDraft {
  id?: string;
  title: string;
  versionLabel: string;
  downloadFilename: string;
  notes: string;
  publicDownload: boolean;
  isActive: boolean;
}

function ResumeManager() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const query = useAsync<ResumeVersion[]>(() => api.get<ResumeVersion[]>('/api/admin/resumes').then((r) => r.data), []);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [draft, setDraft] = useState<ResumeDraft>({ title: 'Resume', versionLabel: '', downloadFilename: '', notes: '', publicDownload: true, isActive: false });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ResumeDraft | null>(null);
  const [toDelete, setToDelete] = useState<ResumeVersion | null>(null);

  const items = query.data ?? [];

  const openUpload = () => {
    const nextVersion = `v${items.length + 1}`;
    setDraft({ title: 'Resume', versionLabel: nextVersion, downloadFilename: '', notes: '', publicDownload: true, isActive: items.length === 0 });
    setFile(null);
    setUploadOpen(true);
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    if (selected) setDraft((prev) => ({ ...prev, downloadFilename: prev.downloadFilename || selected.name }));
  };

  const upload = async () => {
    if (!file) {
      toast.error('Please attach a PDF resume');
      return;
    }
    setSaving(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('title', draft.title);
      form.append('versionLabel', draft.versionLabel);
      form.append('downloadFilename', draft.downloadFilename);
      form.append('notes', draft.notes);
      form.append('publicDownload', String(draft.publicDownload));
      form.append('isActive', String(draft.isActive));
      await api.upload('/api/admin/resumes', form);
      toast.success('Resume uploaded');
      setUploadOpen(false);
      await query.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const saveEdit = async () => {
    if (!editing?.id) return;
    setSaving(true);
    try {
      await api.put(`/api/admin/resumes/${editing.id}`, {
        title: editing.title,
        versionLabel: editing.versionLabel,
        downloadFilename: editing.downloadFilename,
        notes: editing.notes,
        publicDownload: editing.publicDownload,
        isActive: editing.isActive,
      });
      toast.success('Resume updated');
      setEditing(null);
      await query.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const activate = async (version: ResumeVersion) => {
    try {
      await api.put(`/api/admin/resumes/${version.id}`, { isActive: true });
      toast.success('Set as active resume');
      await query.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/api/admin/resumes/${toDelete.id}`);
      setToDelete(null);
      await query.reload();
      toast.success('Resume removed');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <AdminSection
      title="Resume versions"
      description="Upload PDFs and choose which is offered for download."
      actions={
        <Button size="sm" onClick={openUpload} iconLeft={<Plus className="h-4 w-4" aria-hidden="true" />}>
          Upload resume
        </Button>
      }
    >
      {query.loading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState icon={<FileText className="h-5 w-5" />} title="No resume uploaded" description="Upload a PDF so visitors can download it." action={<Button size="sm" onClick={openUpload}>Upload resume</Button>} />
      ) : (
        <TableWrap>
          <table className="w-full min-w-[44rem]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <Th>Resume</Th>
                <Th>Uploaded</Th>
                <Th>Active</Th>
                <Th>Public</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((version) => (
                <tr key={version.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{version.title}</span>
                      {version.versionLabel ? <Badge variant="muted">{version.versionLabel}</Badge> : null}
                    </div>
                    <p className="truncate text-xs" style={{ color: 'var(--muted)' }}>
                      {version.media?.originalName ?? version.downloadFilename}
                    </p>
                  </Td>
                  <Td>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {formatDate(version.createdAt)}
                    </span>
                  </Td>
                  <Td>{version.isActive ? <Badge variant="success">Active</Badge> : <span className="text-xs opacity-50">—</span>}</Td>
                  <Td>{version.publicDownload ? <Badge variant="primary">Public</Badge> : <Badge variant="muted">Private</Badge>}</Td>
                  <Td>
                    <RowActions>
                      {version.media ? (
                        <a href={version.media.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" aria-label="Download resume" title="Download">
                          <Download className="h-4 w-4" aria-hidden="true" />
                        </a>
                      ) : null}
                      {!version.isActive ? (
                        <Button size="sm" variant="ghost" onClick={() => void activate(version)} aria-label="Set active" title="Set active">
                          <Star className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setEditing({
                            id: version.id,
                            title: version.title,
                            versionLabel: version.versionLabel,
                            downloadFilename: version.downloadFilename,
                            notes: version.notes,
                            publicDownload: version.publicDownload,
                            isActive: version.isActive,
                          })
                        }
                        iconLeft={<Pencil className="h-4 w-4" aria-hidden="true" />}
                      >
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => setToDelete(version)} aria-label="Delete">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </RowActions>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}

      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload resume"
        description="PDF only. Uploading an active resume deactivates the previous one."
        footer={
          <>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void upload()} loading={saving} disabled={!file || !draft.title}>
              Upload
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="PDF file" htmlFor="r-file" required>
            <input
              id="r-file"
              ref={fileRef}
              type="file"
              accept="application/pdf"
              onChange={onFileChange}
              className="block w-full cursor-pointer rounded-lg border p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-[color-mix(in_srgb,var(--brand-primary)_18%,transparent)] file:px-3 file:py-1.5 file:text-sm"
              style={{ borderColor: 'var(--border)' }}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="r-title" required>
              <Input id="r-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </Field>
            <Field label="Version label" htmlFor="r-version">
              <Input id="r-version" value={draft.versionLabel} onChange={(e) => setDraft({ ...draft, versionLabel: e.target.value })} placeholder="e.g. 2026-01" />
            </Field>
          </div>
          <Field label="Download filename" htmlFor="r-filename" hint="What visitors see when they download.">
            <Input id="r-filename" value={draft.downloadFilename} onChange={(e) => setDraft({ ...draft, downloadFilename: e.target.value })} placeholder="Hadhi-Noor-Resume.pdf" />
          </Field>
          <Field label="Notes" htmlFor="r-notes" hint="Private — never shown publicly.">
            <Textarea id="r-notes" rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </Field>
          <div className="flex flex-wrap gap-4">
            <Switch checked={draft.publicDownload} onChange={(v) => setDraft({ ...draft, publicDownload: v })} label="Publicly downloadable" />
            <Switch checked={draft.isActive} onChange={(v) => setDraft({ ...draft, isActive: v })} label="Set as active" />
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit resume"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => void saveEdit()} loading={saving}>
              Save
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" htmlFor="re-title" required>
                <Input id="re-title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </Field>
              <Field label="Version label" htmlFor="re-version">
                <Input id="re-version" value={editing.versionLabel} onChange={(e) => setEditing({ ...editing, versionLabel: e.target.value })} />
              </Field>
            </div>
            <Field label="Download filename" htmlFor="re-filename">
              <Input id="re-filename" value={editing.downloadFilename} onChange={(e) => setEditing({ ...editing, downloadFilename: e.target.value })} />
            </Field>
            <Field label="Notes" htmlFor="re-notes">
              <Textarea id="re-notes" rows={2} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
            </Field>
            <div className="flex flex-wrap gap-4">
              <Switch checked={editing.publicDownload} onChange={(v) => setEditing({ ...editing, publicDownload: v })} label="Publicly downloadable" />
              <Switch checked={editing.isActive} onChange={(v) => setEditing({ ...editing, isActive: v })} label="Active" />
            </div>
            <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
              <Upload className="h-3.5 w-3.5" aria-hidden="true" /> To change the file, upload a new version.
            </p>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete resume?"
        description={toDelete ? `“${toDelete.title} ${toDelete.versionLabel}” will be removed.` : ''}
        destructive
        confirmLabel="Delete"
        onConfirm={() => void remove()}
        onCancel={() => setToDelete(null)}
      />

      {items.some((v) => v.isActive) ? (
        <p className="mt-4 flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" /> An active resume is available for download.
        </p>
      ) : null}
    </AdminSection>
  );
}
