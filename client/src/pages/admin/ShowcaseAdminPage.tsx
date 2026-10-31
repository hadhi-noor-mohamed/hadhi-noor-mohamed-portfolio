import { useState } from 'react';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { useMediaLookup } from '@/hooks/useMediaLookup';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input, Switch, Textarea } from '@/components/ui/Field';
import { TagInput } from '@/components/ui/TagInput';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { MediaField } from '@/components/admin/MediaField';
import { AdminPageHeader, AdminSection, RowActions, TableWrap, Td, Th } from '@/components/admin/AdminUI';
import type { Achievement, Certification } from '@/types/api';

function toDateInput(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

export function AdminShowcaseAdminPage() {
  const [tab, setTab] = useState('certifications');
  return (
    <div>
      <AdminPageHeader title="Achievements" description="Certifications, awards and recognition." />
      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'certifications', label: 'Certifications' },
          { id: 'achievements', label: 'Achievements' },
        ]}
      />
      {tab === 'certifications' ? <CertificationsTab /> : <AchievementsTab />}
    </div>
  );
}

interface CertDraft {
  id?: string;
  title: string;
  issuer: string;
  issueDate: string;
  description: string;
  credentialUrl: string;
  imageMediaId: string | null;
  pdfMediaId: string | null;
  skillTags: string[];
  featured: boolean;
  visible: boolean;
  sortOrder: number;
}

function CertificationsTab() {
  const toast = useToast();
  const media = useMediaLookup();
  const list = useAsync<Certification[]>(() => api.getList<Certification>('/api/admin/certifications', { pageSize: 100 }).then((r) => r.items), []);
  const [editing, setEditing] = useState<CertDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Certification | null>(null);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const body = {
        title: editing.title,
        issuer: editing.issuer,
        issueDate: editing.issueDate || null,
        description: editing.description,
        credentialUrl: editing.credentialUrl,
        imageMediaId: editing.imageMediaId,
        pdfMediaId: editing.pdfMediaId,
        skillTags: editing.skillTags.filter(Boolean),
        featured: editing.featured,
        visible: editing.visible,
        sortOrder: editing.sortOrder,
      };
      if (editing.id) await api.put(`/api/admin/certifications/${editing.id}`, body);
      else await api.post('/api/admin/certifications', body);
      toast.success('Saved');
      setEditing(null);
      await list.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/api/admin/certifications/${toDelete.id}`);
      setToDelete(null);
      await list.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <AdminSection
      title="Certifications"
      description={`${list.data?.length ?? 0} certification(s).`}
      actions={
        <Button
          size="sm"
          onClick={() =>
            setEditing({ title: '', issuer: '', issueDate: '', description: '', credentialUrl: '', imageMediaId: null, pdfMediaId: null, skillTags: [], featured: false, visible: true, sortOrder: list.data?.length ?? 0 })
          }
          iconLeft={<Plus className="h-4 w-4" aria-hidden="true" />}
        >
          Add certification
        </Button>
      }
    >
      {list.loading ? (
        <LoadingBlock />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState title="No certifications" description="Add a certification you have actually earned." />
      ) : (
        <TableWrap>
          <table className="w-full min-w-[40rem]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <Th>Certification</Th>
                <Th>Issued</Th>
                <Th>Visible</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {(list.data ?? []).map((cert) => (
                <tr key={cert.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <Td>
                    <span className="font-medium">{cert.title}</span>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {cert.issuer || '—'}
                    </p>
                  </Td>
                  <Td>{cert.issueDate ? formatDate(cert.issueDate) : '—'}</Td>
                  <Td>{cert.visible ? <Badge variant="success">Visible</Badge> : <Badge variant="muted">Hidden</Badge>}</Td>
                  <Td>
                    <RowActions>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setEditing({
                            id: cert.id,
                            title: cert.title,
                            issuer: cert.issuer,
                            issueDate: toDateInput(cert.issueDate),
                            description: cert.description,
                            credentialUrl: cert.credentialUrl,
                            imageMediaId: cert.imageMediaId ?? null,
                            pdfMediaId: cert.pdfMediaId ?? null,
                            skillTags: cert.skillTags ?? [],
                            featured: cert.featured,
                            visible: cert.visible,
                            sortOrder: cert.sortOrder,
                          })
                        }
                        iconLeft={<Pencil className="h-4 w-4" aria-hidden="true" />}
                      >
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => setToDelete(cert)} aria-label="Delete">
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
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit certification' : 'Add certification'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} loading={saving} disabled={!editing?.title}>
              Save
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="ce-title" required className="sm:col-span-2">
              <Input id="ce-title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </Field>
            <Field label="Issuer" htmlFor="ce-issuer">
              <Input id="ce-issuer" value={editing.issuer} onChange={(e) => setEditing({ ...editing, issuer: e.target.value })} />
            </Field>
            <Field label="Issue date" htmlFor="ce-date">
              <Input id="ce-date" type="date" value={editing.issueDate} onChange={(e) => setEditing({ ...editing, issueDate: e.target.value })} />
            </Field>
            <Field label="Credential URL" htmlFor="ce-url" hint="Only if a real, public verification link exists." className="sm:col-span-2">
              <Input id="ce-url" value={editing.credentialUrl} onChange={(e) => setEditing({ ...editing, credentialUrl: e.target.value })} placeholder="https://" />
            </Field>
            <Field label="Description" htmlFor="ce-desc" className="sm:col-span-2">
              <Textarea id="ce-desc" rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </Field>
            <Field label="Skill tags" className="sm:col-span-2">
              <TagInput value={editing.skillTags} onChange={(v) => setEditing({ ...editing, skillTags: v })} />
            </Field>
            <MediaField label="Image" value={editing.imageMediaId} asset={media.resolve(editing.imageMediaId)} kind="IMAGE" onChange={(id) => setEditing({ ...editing, imageMediaId: id })} />
            <MediaField label="PDF" value={editing.pdfMediaId} asset={media.resolve(editing.pdfMediaId)} kind="PDF" onChange={(id) => setEditing({ ...editing, pdfMediaId: id })} />
            <Field label="Sort order" htmlFor="ce-sort">
              <Input id="ce-sort" type="number" value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) || 0 })} />
            </Field>
            <div className="flex flex-wrap items-center gap-4">
              <Switch checked={editing.featured} onChange={(v) => setEditing({ ...editing, featured: v })} label="Featured" />
              <Switch checked={editing.visible} onChange={(v) => setEditing({ ...editing, visible: v })} label="Visible" />
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete certification?"
        description={toDelete ? `“${toDelete.title}” will be removed.` : ''}
        destructive
        confirmLabel="Delete"
        onConfirm={() => void remove()}
        onCancel={() => setToDelete(null)}
      />
    </AdminSection>
  );
}

interface AchDraft {
  id?: string;
  title: string;
  organization: string;
  date: string;
  description: string;
  verificationUrl: string;
  projectId: string;
  imageMediaId: string | null;
  pdfMediaId: string | null;
  featured: boolean;
  visible: boolean;
  sortOrder: number;
}

function AchievementsTab() {
  const toast = useToast();
  const media = useMediaLookup();
  const list = useAsync<Achievement[]>(() => api.getList<Achievement>('/api/admin/achievements', { pageSize: 100 }).then((r) => r.items), []);
  const [editing, setEditing] = useState<AchDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Achievement | null>(null);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const body = {
        title: editing.title,
        organization: editing.organization,
        date: editing.date || null,
        description: editing.description,
        verificationUrl: editing.verificationUrl,
        projectId: editing.projectId || null,
        imageMediaId: editing.imageMediaId,
        pdfMediaId: editing.pdfMediaId,
        featured: editing.featured,
        visible: editing.visible,
        sortOrder: editing.sortOrder,
      };
      if (editing.id) await api.put(`/api/admin/achievements/${editing.id}`, body);
      else await api.post('/api/admin/achievements', body);
      toast.success('Saved');
      setEditing(null);
      await list.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/api/admin/achievements/${toDelete.id}`);
      setToDelete(null);
      await list.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <AdminSection
      title="Achievements"
      description={`${list.data?.length ?? 0} achievement(s).`}
      actions={
        <Button
          size="sm"
          onClick={() =>
            setEditing({ title: '', organization: '', date: '', description: '', verificationUrl: '', projectId: '', imageMediaId: null, pdfMediaId: null, featured: false, visible: true, sortOrder: list.data?.length ?? 0 })
          }
          iconLeft={<Plus className="h-4 w-4" aria-hidden="true" />}
        >
          Add achievement
        </Button>
      }
    >
      {list.loading ? (
        <LoadingBlock />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState title="No achievements" description="Awards, recognitions or milestones." />
      ) : (
        <TableWrap>
          <table className="w-full min-w-[40rem]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <Th>Achievement</Th>
                <Th>Date</Th>
                <Th>Link</Th>
                <Th>Visible</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {(list.data ?? []).map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <Td>
                    <span className="font-medium">{item.title}</span>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {item.organization || '—'}
                    </p>
                  </Td>
                  <Td>{item.date ? formatDate(item.date) : '—'}</Td>
                  <Td>
                    {item.verificationUrl ? (
                      <a href={item.verificationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Link
                      </a>
                    ) : (
                      <span className="text-xs opacity-50">—</span>
                    )}
                  </Td>
                  <Td>{item.visible ? <Badge variant="success">Visible</Badge> : <Badge variant="muted">Hidden</Badge>}</Td>
                  <Td>
                    <RowActions>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setEditing({
                            id: item.id,
                            title: item.title,
                            organization: item.organization,
                            date: toDateInput(item.date),
                            description: item.description,
                            verificationUrl: item.verificationUrl,
                            projectId: item.projectId ?? '',
                            imageMediaId: item.imageMediaId ?? null,
                            pdfMediaId: item.pdfMediaId ?? null,
                            featured: item.featured,
                            visible: item.visible,
                            sortOrder: item.sortOrder,
                          })
                        }
                        iconLeft={<Pencil className="h-4 w-4" aria-hidden="true" />}
                      >
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => setToDelete(item)} aria-label="Delete">
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
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit achievement' : 'Add achievement'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} loading={saving} disabled={!editing?.title}>
              Save
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="ac-title" required className="sm:col-span-2">
              <Input id="ac-title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </Field>
            <Field label="Organization" htmlFor="ac-org">
              <Input id="ac-org" value={editing.organization} onChange={(e) => setEditing({ ...editing, organization: e.target.value })} />
            </Field>
            <Field label="Date" htmlFor="ac-date">
              <Input id="ac-date" type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} />
            </Field>
            <Field label="Verification URL" htmlFor="ac-url" hint="Only if a real link exists." className="sm:col-span-2">
              <Input id="ac-url" value={editing.verificationUrl} onChange={(e) => setEditing({ ...editing, verificationUrl: e.target.value })} placeholder="https://" />
            </Field>
            <Field label="Description" htmlFor="ac-desc" className="sm:col-span-2">
              <Textarea id="ac-desc" rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </Field>
            <MediaField label="Image" value={editing.imageMediaId} asset={media.resolve(editing.imageMediaId)} kind="IMAGE" onChange={(id) => setEditing({ ...editing, imageMediaId: id })} />
            <MediaField label="PDF" value={editing.pdfMediaId} asset={media.resolve(editing.pdfMediaId)} kind="PDF" onChange={(id) => setEditing({ ...editing, pdfMediaId: id })} />
            <Field label="Sort order" htmlFor="ac-sort">
              <Input id="ac-sort" type="number" value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) || 0 })} />
            </Field>
            <div className="flex flex-wrap items-center gap-4">
              <Switch checked={editing.featured} onChange={(v) => setEditing({ ...editing, featured: v })} label="Featured" />
              <Switch checked={editing.visible} onChange={(v) => setEditing({ ...editing, visible: v })} label="Visible" />
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete achievement?"
        description={toDelete ? `“${toDelete.title}” will be removed.` : ''}
        destructive
        confirmLabel="Delete"
        onConfirm={() => void remove()}
        onCancel={() => setToDelete(null)}
      />
    </AdminSection>
  );
}
