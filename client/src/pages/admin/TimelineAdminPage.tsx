import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { useMediaLookup } from '@/hooks/useMediaLookup';
import { formatDateRange } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Switch } from '@/components/ui/Field';
import { ListEditor } from '@/components/ui/ListEditor';
import { TagInput } from '@/components/ui/TagInput';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { MediaField } from '@/components/admin/MediaField';
import { AdminPageHeader, AdminSection, RowActions, TableWrap, Td, Th, Toolbar } from '@/components/admin/AdminUI';
import type { TimelineEntry, TimelineType } from '@/types/api';

const TYPE_OPTIONS: Array<{ value: TimelineType; label: string }> = [
  { value: 'EDUCATION', label: 'Education' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'WORK', label: 'Work' },
  { value: 'TRAINING', label: 'Training' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'VOLUNTEER', label: 'Volunteer' },
  { value: 'CERTIFICATION', label: 'Certification' },
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(TYPE_OPTIONS.map((o) => [o.value, o.label]));

interface Draft {
  id?: string;
  type: TimelineType;
  organization: string;
  role: string;
  field: string;
  specialization: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  grade: string;
  hours: string;
  description: string[];
  technologies: string[];
  logoMediaId: string | null;
  documentMediaId: string | null;
  url: string;
  sortOrder: number;
  visible: boolean;
}

function toDateInput(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

export function AdminTimelineAdminPage() {
  const toast = useToast();
  const media = useMediaLookup();
  const [type, setType] = useState('');
  const list = useAsync<TimelineEntry[]>(
    () => api.getList<TimelineEntry>('/api/admin/timeline', { pageSize: 100, type: type || undefined }).then((r) => r.items),
    [type],
  );
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<TimelineEntry | null>(null);

  const startNew = () =>
    setEditing({
      type: 'EDUCATION',
      organization: '',
      role: '',
      field: '',
      specialization: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      grade: '',
      hours: '',
      description: [],
      technologies: [],
      logoMediaId: null,
      documentMediaId: null,
      url: '',
      sortOrder: list.data?.length ?? 0,
      visible: true,
    });

  const startEdit = (entry: TimelineEntry) =>
    setEditing({
      id: entry.id,
      type: entry.type,
      organization: entry.organization,
      role: entry.role,
      field: entry.field,
      specialization: entry.specialization,
      location: entry.location,
      startDate: toDateInput(entry.startDate),
      endDate: toDateInput(entry.endDate),
      current: entry.current,
      grade: entry.grade,
      hours: entry.hours,
      description: entry.description ?? [],
      technologies: entry.technologies ?? [],
      logoMediaId: entry.logoMediaId ?? null,
      documentMediaId: entry.documentMediaId ?? null,
      url: entry.url,
      sortOrder: entry.sortOrder,
      visible: entry.visible,
    });

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const body = {
        type: editing.type,
        organization: editing.organization,
        role: editing.role,
        field: editing.field,
        specialization: editing.specialization,
        location: editing.location,
        startDate: editing.startDate || null,
        endDate: editing.endDate || null,
        current: editing.current,
        grade: editing.grade,
        hours: editing.hours,
        description: editing.description.filter(Boolean),
        technologies: editing.technologies.filter(Boolean),
        logoMediaId: editing.logoMediaId,
        documentMediaId: editing.documentMediaId,
        url: editing.url,
        sortOrder: editing.sortOrder,
        visible: editing.visible,
      };
      if (editing.id) await api.put(`/api/admin/timeline/${editing.id}`, body);
      else await api.post('/api/admin/timeline', body);
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
      await api.delete(`/api/admin/timeline/${toDelete.id}`);
      setToDelete(null);
      await list.reload();
      toast.success('Entry removed');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div>
      <AdminPageHeader title="Timeline" description="Education, internships, work and training history." />

      <Toolbar>
        <Select
          aria-label="Filter by type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="All types"
          options={TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          className="w-48"
        />
        <div className="flex-1" />
        <Button size="sm" onClick={startNew} iconLeft={<Plus className="h-4 w-4" aria-hidden="true" />}>
          Add entry
        </Button>
      </Toolbar>

      <AdminSection title="Entries" description={`${list.data?.length ?? 0} entry(ies).`}>
        {list.loading ? (
          <LoadingBlock />
        ) : (list.data ?? []).length === 0 ? (
          <EmptyState title="No timeline entries" description="Add education, internships or work experience." />
        ) : (
          <TableWrap>
            <table className="w-full min-w-[44rem]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <Th>Organization</Th>
                  <Th>Type</Th>
                  <Th>Period</Th>
                  <Th>Visible</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {(list.data ?? []).map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <Td>
                      <span className="font-medium">{entry.organization}</span>
                      {entry.role ? (
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>
                          {entry.role}
                        </p>
                      ) : null}
                    </Td>
                    <Td>
                      <Badge>{TYPE_LABELS[entry.type] ?? entry.type}</Badge>
                    </Td>
                    <Td>
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>
                        {formatDateRange(entry.startDate, entry.endDate, entry.current)}
                      </span>
                    </Td>
                    <Td>{entry.visible ? <Badge variant="success">Visible</Badge> : <Badge variant="muted">Hidden</Badge>}</Td>
                    <Td>
                      <RowActions>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(entry)} iconLeft={<Pencil className="h-4 w-4" aria-hidden="true" />}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-400" onClick={() => setToDelete(entry)} aria-label="Delete">
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
      </AdminSection>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit timeline entry' : 'Add timeline entry'}
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} loading={saving} disabled={!editing?.organization}>
              Save
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="tl-type" required>
              <Select id="tl-type" value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as TimelineType })} options={TYPE_OPTIONS} />
            </Field>
            <Field label="Organization" htmlFor="tl-org" required>
              <Input id="tl-org" value={editing.organization} onChange={(e) => setEditing({ ...editing, organization: e.target.value })} />
            </Field>
            <Field label="Role" htmlFor="tl-role">
              <Input id="tl-role" value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} />
            </Field>
            <Field label="Field" htmlFor="tl-field">
              <Input id="tl-field" value={editing.field} onChange={(e) => setEditing({ ...editing, field: e.target.value })} />
            </Field>
            <Field label="Specialisation" htmlFor="tl-spec">
              <Input id="tl-spec" value={editing.specialization} onChange={(e) => setEditing({ ...editing, specialization: e.target.value })} />
            </Field>
            <Field label="Location" htmlFor="tl-loc">
              <Input id="tl-loc" value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
            </Field>
            <Field label="Start date" htmlFor="tl-start">
              <Input id="tl-start" type="date" value={editing.startDate} onChange={(e) => setEditing({ ...editing, startDate: e.target.value })} />
            </Field>
            <Field label="End date" htmlFor="tl-end">
              <Input id="tl-end" type="date" value={editing.endDate} onChange={(e) => setEditing({ ...editing, endDate: e.target.value })} disabled={editing.current} />
            </Field>
            <Field label="Grade / result" htmlFor="tl-grade">
              <Input id="tl-grade" value={editing.grade} onChange={(e) => setEditing({ ...editing, grade: e.target.value })} />
            </Field>
            <Field label="Hours" htmlFor="tl-hours">
              <Input id="tl-hours" value={editing.hours} onChange={(e) => setEditing({ ...editing, hours: e.target.value })} />
            </Field>
            <Field label="URL" htmlFor="tl-url" className="sm:col-span-2">
              <Input id="tl-url" value={editing.url} onChange={(e) => setEditing({ ...editing, url: e.target.value })} placeholder="https://" />
            </Field>
            <Field label="Description points" className="sm:col-span-2">
              <ListEditor value={editing.description} onChange={(v) => setEditing({ ...editing, description: v })} addLabel="Add point" />
            </Field>
            <Field label="Technologies" className="sm:col-span-2">
              <TagInput value={editing.technologies} onChange={(v) => setEditing({ ...editing, technologies: v })} />
            </Field>
            <MediaField
              label="Logo"
              value={editing.logoMediaId}
              asset={media.resolve(editing.logoMediaId)}
              kind="IMAGE"
              onChange={(id) => setEditing({ ...editing, logoMediaId: id })}
            />
            <MediaField
              label="Certificate / document"
              value={editing.documentMediaId}
              asset={media.resolve(editing.documentMediaId)}
              onChange={(id) => setEditing({ ...editing, documentMediaId: id })}
            />
            <Field label="Sort order" htmlFor="tl-sort">
              <Input id="tl-sort" type="number" value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) || 0 })} />
            </Field>
            <div className="flex flex-wrap items-center gap-4">
              <Switch checked={editing.current} onChange={(v) => setEditing({ ...editing, current: v, endDate: v ? '' : editing.endDate })} label="Current" />
              <Switch checked={editing.visible} onChange={(v) => setEditing({ ...editing, visible: v })} label="Visible" />
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete entry?"
        description={toDelete ? `“${toDelete.organization}” will be removed.` : ''}
        destructive
        confirmLabel="Delete"
        onConfirm={() => void remove()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
