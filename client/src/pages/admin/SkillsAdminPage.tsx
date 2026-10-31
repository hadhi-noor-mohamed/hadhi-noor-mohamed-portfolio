import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { useMediaLookup } from '@/hooks/useMediaLookup';
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
import { ICON_NAMES } from '@/components/ui/Icon';
import type { Skill, SkillCategory } from '@/types/api';

interface SkillDraft {
  id?: string;
  name: string;
  description: string;
  categoryId: string;
  icon: string;
  logoMediaId: string | null;
  proficiencyLabel: string;
  proficiencyPercent: string;
  featured: boolean;
  published: boolean;
  sortOrder: number;
}

interface CategoryDraft {
  id?: string;
  name: string;
  description: string;
  icon: string;
  visible: boolean;
  sortOrder: number;
}

export function AdminSkillsPage() {
  const [tab, setTab] = useState('skills');
  return (
    <div>
      <AdminPageHeader title="Skills" description="Organise skills into categories and control what is published." />
      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'skills', label: 'Skills' },
          { id: 'categories', label: 'Categories' },
        ]}
      />
      {tab === 'skills' ? <SkillsTab /> : <CategoriesTab />}
    </div>
  );
}

function SkillsTab() {
  const toast = useToast();
  const media = useMediaLookup();
  const list = useAsync<Skill[]>(() => api.getList<Skill>('/api/admin/skills', { pageSize: 500 }).then((r) => r.items), []);
  const categories = useAsync<SkillCategory[]>(
    () => api.getList<SkillCategory>('/api/admin/skill-categories', { pageSize: 200 }).then((r) => r.items),
    [],
  );
  const [editing, setEditing] = useState<SkillDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Skill | null>(null);

  const categoryOptions = [
    { value: '', label: 'No category' },
    ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];

  const startNew = () =>
    setEditing({
      name: '',
      description: '',
      categoryId: '',
      icon: '',
      logoMediaId: null,
      proficiencyLabel: '',
      proficiencyPercent: '',
      featured: false,
      published: true,
      sortOrder: (list.data?.length ?? 0),
    });

  const startEdit = (skill: Skill) =>
    setEditing({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      categoryId: skill.categoryId ?? '',
      icon: skill.icon,
      logoMediaId: skill.logoMediaId ?? null,
      proficiencyLabel: skill.proficiencyLabel,
      proficiencyPercent: skill.proficiencyPercent === null || skill.proficiencyPercent === undefined ? '' : String(skill.proficiencyPercent),
      featured: skill.featured,
      published: skill.published,
      sortOrder: skill.sortOrder,
    });

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const body = {
        name: editing.name,
        description: editing.description,
        categoryId: editing.categoryId || null,
        icon: editing.icon,
        logoMediaId: editing.logoMediaId,
        proficiencyLabel: editing.proficiencyLabel,
        proficiencyPercent: editing.proficiencyPercent === '' ? null : Number(editing.proficiencyPercent),
        featured: editing.featured,
        published: editing.published,
        sortOrder: editing.sortOrder,
      };
      if (editing.id) await api.put(`/api/admin/skills/${editing.id}`, body);
      else await api.post('/api/admin/skills', body);
      toast.success('Saved');
      setEditing(null);
      await list.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (skill: Skill) => {
    try {
      await api.put(`/api/admin/skills/${skill.id}`, { published: !skill.published });
      await list.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/api/admin/skills/${toDelete.id}`);
      setToDelete(null);
      await list.reload();
      toast.success('Skill removed');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <AdminSection
      title="All skills"
      description={`${list.data?.length ?? 0} skill(s).`}
      actions={
        <Button size="sm" onClick={startNew} iconLeft={<Plus className="h-4 w-4" aria-hidden="true" />}>
          Add skill
        </Button>
      }
    >
      {list.loading ? (
        <LoadingBlock />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState title="No skills yet" description="Add your first skill." />
      ) : (
        <TableWrap>
          <table className="w-full min-w-[44rem]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <Th>Skill</Th>
                <Th>Category</Th>
                <Th>Proficiency</Th>
                <Th>Published</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {(list.data ?? []).map((skill) => (
                <tr key={skill.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{skill.name}</span>
                      {skill.featured ? <Badge variant="primary">Featured</Badge> : null}
                    </div>
                    {skill.description ? (
                      <p className="mt-0.5 line-clamp-1 text-xs" style={{ color: 'var(--muted)' }}>
                        {skill.description}
                      </p>
                    ) : null}
                  </Td>
                  <Td>{skill.category?.name ?? <span className="text-xs opacity-50">—</span>}</Td>
                  <Td>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {skill.proficiencyLabel || '—'}
                      {skill.proficiencyPercent !== null && skill.proficiencyPercent !== undefined ? ` (${skill.proficiencyPercent}%)` : ''}
                    </span>
                  </Td>
                  <Td>
                    <Button size="sm" variant="ghost" onClick={() => void togglePublished(skill)}>
                      {skill.published ? <Badge variant="success">Published</Badge> : <Badge variant="muted">Hidden</Badge>}
                    </Button>
                  </Td>
                  <Td>
                    <RowActions>
                      <Button size="sm" variant="ghost" onClick={() => startEdit(skill)} iconLeft={<Pencil className="h-4 w-4" aria-hidden="true" />}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => setToDelete(skill)} aria-label="Delete">
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
        title={editing?.id ? 'Edit skill' : 'Add skill'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} loading={saving} disabled={!editing?.name}>
              Save
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="sk-name" required className="sm:col-span-2">
              <Input id="sk-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="Category" htmlFor="sk-cat">
              <Select id="sk-cat" value={editing.categoryId} onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })} options={categoryOptions} />
            </Field>
            <Field label="Icon" htmlFor="sk-icon">
              <Select
                id="sk-icon"
                value={editing.icon}
                onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                placeholder="No icon"
                options={ICON_NAMES.map((name) => ({ value: name, label: name }))}
              />
            </Field>
            <Field label="Proficiency label" htmlFor="sk-label" hint="e.g. Advanced, Working knowledge.">
              <Input id="sk-label" value={editing.proficiencyLabel} onChange={(e) => setEditing({ ...editing, proficiencyLabel: e.target.value })} />
            </Field>
            <Field label="Proficiency %" htmlFor="sk-percent" hint="Optional, 0–100.">
              <Input
                id="sk-percent"
                type="number"
                min={0}
                max={100}
                value={editing.proficiencyPercent}
                onChange={(e) => setEditing({ ...editing, proficiencyPercent: e.target.value })}
              />
            </Field>
            <Field label="Description" htmlFor="sk-desc" className="sm:col-span-2">
              <Textarea id="sk-desc" rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </Field>
            <Field label="Sort order" htmlFor="sk-sort">
              <Input id="sk-sort" type="number" value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) || 0 })} />
            </Field>
            <div className="sm:col-span-2">
              <MediaField
                label="Logo (optional)"
                value={editing.logoMediaId}
                asset={media.resolve(editing.logoMediaId)}
                kind="IMAGE"
                onChange={(id) => setEditing({ ...editing, logoMediaId: id })}
              />
            </div>
            <Switch checked={editing.featured} onChange={(v) => setEditing({ ...editing, featured: v })} label="Featured" />
            <Switch checked={editing.published} onChange={(v) => setEditing({ ...editing, published: v })} label="Published" />
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete skill?"
        description={toDelete ? `“${toDelete.name}” will be removed.` : ''}
        destructive
        confirmLabel="Delete"
        onConfirm={() => void remove()}
        onCancel={() => setToDelete(null)}
      />
    </AdminSection>
  );
}

function CategoriesTab() {
  const toast = useToast();
  const list = useAsync<SkillCategory[]>(() => api.getList<SkillCategory>('/api/admin/skill-categories', { pageSize: 200 }).then((r) => r.items), []);
  const [editing, setEditing] = useState<CategoryDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<SkillCategory | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) setError(null);
  }, [editing]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: editing.name,
        description: editing.description,
        icon: editing.icon,
        visible: editing.visible,
        sortOrder: editing.sortOrder,
      };
      if (editing.id) await api.put(`/api/admin/skill-categories/${editing.id}`, body);
      else await api.post('/api/admin/skill-categories', body);
      toast.success('Saved');
      setEditing(null);
      await list.reload();
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/api/admin/skill-categories/${toDelete.id}`);
      setToDelete(null);
      await list.reload();
      toast.success('Category removed');
    } catch (err) {
      toast.error(errorMessage(err));
      setToDelete(null);
    }
  };

  return (
    <AdminSection
      title="Skill categories"
      description="Group skills into categories."
      actions={
        <Button
          size="sm"
          onClick={() => setEditing({ name: '', description: '', icon: '', visible: true, sortOrder: list.data?.length ?? 0 })}
          iconLeft={<Plus className="h-4 w-4" aria-hidden="true" />}
        >
          Add category
        </Button>
      }
    >
      {list.loading ? (
        <LoadingBlock />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState title="No categories yet" description="Create a category to group skills." />
      ) : (
        <TableWrap>
          <table className="w-full min-w-[32rem]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <Th>Category</Th>
                <Th>Skills</Th>
                <Th>Visible</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {(list.data ?? []).map((category) => (
                <tr key={category.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <Td>
                    <span className="font-medium">{category.name}</span>
                    {category.description ? (
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>
                        {category.description}
                      </p>
                    ) : null}
                  </Td>
                  <Td>{category._count?.skills ?? '—'}</Td>
                  <Td>{category.visible ? <Badge variant="success">Visible</Badge> : <Badge variant="muted">Hidden</Badge>}</Td>
                  <Td>
                    <RowActions>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setEditing({
                            id: category.id,
                            name: category.name,
                            description: category.description,
                            icon: category.icon,
                            visible: category.visible,
                            sortOrder: category.sortOrder,
                          })
                        }
                        iconLeft={<Pencil className="h-4 w-4" aria-hidden="true" />}
                      >
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => setToDelete(category)} aria-label="Delete">
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
        title={editing?.id ? 'Edit category' : 'Add category'}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} loading={saving} disabled={!editing?.name}>
              Save
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="space-y-4">
            <Field label="Name" htmlFor="cat-name" required>
              <Input id="cat-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="Description" htmlFor="cat-desc">
              <Textarea id="cat-desc" rows={2} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </Field>
            <Field label="Icon" htmlFor="cat-icon">
              <Select
                id="cat-icon"
                value={editing.icon}
                onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                placeholder="No icon"
                options={ICON_NAMES.map((name) => ({ value: name, label: name }))}
              />
            </Field>
            <Field label="Sort order" htmlFor="cat-sort">
              <Input id="cat-sort" type="number" value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) || 0 })} />
            </Field>
            <Switch checked={editing.visible} onChange={(v) => setEditing({ ...editing, visible: v })} label="Visible" />
            {error ? <p className="error-text">{error}</p> : null}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete category?"
        description={toDelete ? `“${toDelete.name}” will be removed if it has no skills.` : ''}
        destructive
        confirmLabel="Delete"
        onConfirm={() => void remove()}
        onCancel={() => setToDelete(null)}
      />
    </AdminSection>
  );
}
