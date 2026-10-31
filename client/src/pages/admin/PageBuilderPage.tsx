import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, RotateCcw, Save, Settings2, Trash2, UploadCloud } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { AdminPageHeader, AdminSection } from '@/components/admin/AdminUI';
import type { PageSection } from '@/types/api';

const ALL_KEYS = [
  'hero', 'about', 'skills', 'projects', 'experience', 'education',
  'achievements', 'certifications', 'journey', 'blog', 'contact', 'resume',
] as const;

const LAYOUT_OPTIONS = ['default', 'split', 'grid', 'timeline', 'compact', 'centered'].map((v) => ({ value: v, label: v }));
const VARIANT_OPTIONS = ['default', 'gradient', 'filterable', 'compact', 'cards', 'masonry', 'feed', 'featured', 'form', 'cta'].map((v) => ({ value: v, label: v }));
const CARD_OPTIONS = ['elevated', 'glass', 'bordered', 'flat'].map((v) => ({ value: v, label: v }));
const BACKGROUND_OPTIONS = ['default', 'subtle', 'aurora', 'muted'].map((v) => ({ value: v, label: v }));
const ACCENT_OPTIONS = ['primary', 'secondary', 'accent', 'pink'].map((v) => ({ value: v, label: v }));
const SPACING_OPTIONS = ['normal', 'compact', 'relaxed'].map((v) => ({ value: v, label: v }));
const ANIMATION_OPTIONS = ['none', 'subtle', 'moderate', 'expressive'].map((v) => ({ value: v, label: v }));

type DraftFields = Pick<
  PageSection,
  'title' | 'subtitle' | 'description' | 'layout' | 'variant' | 'cardStyle' | 'background' | 'accent' | 'spacing' | 'animation'
>;

function fieldsOf(section: PageSection): DraftFields {
  return {
    title: section.title,
    subtitle: section.subtitle,
    description: section.description,
    layout: section.layout,
    variant: section.variant,
    cardStyle: section.cardStyle,
    background: section.background,
    accent: section.accent,
    spacing: section.spacing,
    animation: section.animation,
  };
}

export function AdminPageBuilderPage() {
  const toast = useToast();
  const list = useAsync<PageSection[]>(() => api.get<PageSection[]>('/api/admin/sections').then((r) => r.data), []);
  const [editing, setEditing] = useState<PageSection | null>(null);
  const [draftFields, setDraftFields] = useState<DraftFields | null>(null);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<PageSection | null>(null);
  const [adding, setAdding] = useState(false);
  const [addKey, setAddKey] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const sections = useMemo(
    () => [...(list.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key)),
    [list.data],
  );

  const draftCount = sections.filter((s) => s.draftConfig).length;

  const missingKeys = ALL_KEYS.filter((key) => !sections.some((section) => section.key === key));

  const run = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(message);
      await list.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const move = (index: number, delta: number) => {
    const next = [...sections];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    void run(() => api.post('/api/admin/sections/reorder', { ids: next.map((s) => s.id) }), 'Order updated');
  };

  const toggleEnabled = (section: PageSection) =>
    run(() => api.put(`/api/admin/sections/${section.id}`, { enabled: !section.enabled }), section.enabled ? 'Section hidden' : 'Section shown');

  const openEditor = (section: PageSection) => {
    setEditing(section);
    setDraftFields({
      ...fieldsOf(section),
      ...((section.draftConfig as Partial<DraftFields> | null) ?? {}),
    });
  };

  const saveDraft = async () => {
    if (!editing || !draftFields) return;
    setBusy(true);
    try {
      await api.post('/api/admin/sections/save-draft', { items: [{ id: editing.id, draftConfig: draftFields }] });
      toast.success('Draft saved');
      setEditing(null);
      setDraftFields(null);
      await list.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const saveLive = async () => {
    if (!editing || !draftFields) return;
    setBusy(true);
    try {
      await api.put(`/api/admin/sections/${editing.id}`, draftFields);
      toast.success('Changes published immediately');
      setEditing(null);
      setDraftFields(null);
      await list.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const publishAll = () => run(() => api.post('/api/admin/sections/publish'), 'All drafts published');
  const discardAll = async () => {
    await run(() => api.post('/api/admin/sections/discard-drafts'), 'Drafts discarded');
    setConfirmDiscard(false);
  };

  const addSection = async () => {
    if (!addKey) return;
    setBusy(true);
    try {
      await api.post('/api/admin/sections', {
        key: addKey,
        label: addKey.charAt(0).toUpperCase() + addKey.slice(1),
        title: addKey.charAt(0).toUpperCase() + addKey.slice(1),
        enabled: true,
        sortOrder: sections.length,
      });
      toast.success('Section added');
      setAdding(false);
      setAddKey('');
      await list.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/api/admin/sections/${toDelete.id}`);
      setToDelete(null);
      await list.reload();
      toast.success('Section removed');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Page builder"
        description="Control the public sections, their layout and order. Changes are drafted until published."
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAdding(true)}
              disabled={missingKeys.length === 0}
              iconLeft={<Plus className="h-4 w-4" aria-hidden="true" />}
            >
              Add section
            </Button>
            <Button size="sm" loading={busy} onClick={() => void publishAll()} disabled={draftCount === 0} iconLeft={<UploadCloud className="h-4 w-4" aria-hidden="true" />}>
              Publish drafts
            </Button>
          </>
        }
      />

      {draftCount > 0 ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm">
            <span className="font-medium">{draftCount}</span> section{draftCount === 1 ? '' : 's'} have unpublished draft changes.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setConfirmDiscard(true)} iconLeft={<RotateCcw className="h-4 w-4" aria-hidden="true" />}>
              Discard drafts
            </Button>
          </div>
        </div>
      ) : null}

      {list.loading ? (
        <LoadingBlock label="Loading sections…" />
      ) : list.error ? (
        <EmptyState title="Page builder unavailable" description="Please retry shortly." />
      ) : sections.length === 0 ? (
        <EmptyState title="No sections" description="Add a section to start building the page." />
      ) : (
        <AdminSection title="Sections" description="Reorder with the arrows. Toggle visibility instantly." contentClassName="space-y-2">
          {sections.map((section, index) => (
            <div key={section.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex flex-col">
                <button
                  type="button"
                  className="rounded p-0.5 opacity-60 hover:opacity-100 disabled:opacity-20"
                  onClick={() => move(index, -1)}
                  disabled={index === 0 || busy}
                  aria-label={`Move ${section.label} up`}
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="rounded p-0.5 opacity-60 hover:opacity-100 disabled:opacity-20"
                  onClick={() => move(index, 1)}
                  disabled={index === sections.length - 1 || busy}
                  aria-label={`Move ${section.label} down`}
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {section.label}
                  <Badge variant="muted">{section.key}</Badge>
                  {section.draftConfig ? <Badge variant="warning">Draft</Badge> : null}
                  {!section.enabled ? <Badge variant="muted">Hidden</Badge> : null}
                </p>
                <p className="truncate text-xs" style={{ color: 'var(--muted)' }}>
                  {section.title || 'No title'} · {section.layout} · {section.variant}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void toggleEnabled(section)}
                  disabled={busy}
                  aria-label={section.enabled ? 'Hide section' : 'Show section'}
                  title={section.enabled ? 'Hide section' : 'Show section'}
                >
                  {section.enabled ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
                </Button>
                <Button size="sm" variant="outline" onClick={() => openEditor(section)} iconLeft={<Settings2 className="h-4 w-4" aria-hidden="true" />}>
                  Configure
                </Button>
                <Button size="sm" variant="ghost" className="text-red-400" onClick={() => setToDelete(section)} aria-label="Remove section">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
        </AdminSection>
      )}

      <Modal
        open={Boolean(editing && draftFields)}
        onClose={() => {
          setEditing(null);
          setDraftFields(null);
        }}
        title={editing ? `Configure “${editing.label}”` : 'Configure section'}
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(null);
                setDraftFields(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="outline" onClick={() => void saveDraft()} loading={busy} iconLeft={<Save className="h-4 w-4" aria-hidden="true" />}>
              Save as draft
            </Button>
            <Button onClick={() => void saveLive()} loading={busy}>
              Publish now
            </Button>
          </>
        }
      >
        {editing && draftFields ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="sec-title" className="sm:col-span-2">
              <Input id="sec-title" value={draftFields.title} onChange={(e) => setDraftFields({ ...draftFields, title: e.target.value })} />
            </Field>
            <Field label="Subtitle" htmlFor="sec-subtitle" className="sm:col-span-2">
              <Input id="sec-subtitle" value={draftFields.subtitle} onChange={(e) => setDraftFields({ ...draftFields, subtitle: e.target.value })} />
            </Field>
            <Field label="Description" htmlFor="sec-desc" className="sm:col-span-2">
              <Textarea id="sec-desc" rows={3} value={draftFields.description} onChange={(e) => setDraftFields({ ...draftFields, description: e.target.value })} />
            </Field>
            <Field label="Layout" htmlFor="sec-layout">
              <Select id="sec-layout" value={draftFields.layout} onChange={(e) => setDraftFields({ ...draftFields, layout: e.target.value })} options={LAYOUT_OPTIONS} />
            </Field>
            <Field label="Variant" htmlFor="sec-variant">
              <Select id="sec-variant" value={draftFields.variant} onChange={(e) => setDraftFields({ ...draftFields, variant: e.target.value })} options={VARIANT_OPTIONS} />
            </Field>
            <Field label="Card style" htmlFor="sec-card">
              <Select id="sec-card" value={draftFields.cardStyle} onChange={(e) => setDraftFields({ ...draftFields, cardStyle: e.target.value })} options={CARD_OPTIONS} />
            </Field>
            <Field label="Background" htmlFor="sec-bg">
              <Select id="sec-bg" value={draftFields.background} onChange={(e) => setDraftFields({ ...draftFields, background: e.target.value })} options={BACKGROUND_OPTIONS} />
            </Field>
            <Field label="Accent" htmlFor="sec-accent">
              <Select id="sec-accent" value={draftFields.accent} onChange={(e) => setDraftFields({ ...draftFields, accent: e.target.value })} options={ACCENT_OPTIONS} />
            </Field>
            <Field label="Spacing" htmlFor="sec-spacing">
              <Select id="sec-spacing" value={draftFields.spacing} onChange={(e) => setDraftFields({ ...draftFields, spacing: e.target.value })} options={SPACING_OPTIONS} />
            </Field>
            <Field label="Animation" htmlFor="sec-anim">
              <Select id="sec-anim" value={draftFields.animation} onChange={(e) => setDraftFields({ ...draftFields, animation: e.target.value })} options={ANIMATION_OPTIONS} />
            </Field>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add a section"
        description="Add one of the standard page sections."
        footer={
          <>
            <Button variant="outline" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button onClick={() => void addSection()} loading={busy} disabled={!addKey}>
              Add section
            </Button>
          </>
        }
      >
        <Field label="Section" htmlFor="add-key">
          <Select id="add-key" value={addKey} onChange={(e) => setAddKey(e.target.value)} placeholder="Choose a section" options={missingKeys.map((key) => ({ value: key, label: key }))} />
        </Field>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Remove section?"
        description={toDelete ? `“${toDelete.label}” will be removed from the page builder.` : ''}
        destructive
        confirmLabel="Remove"
        onConfirm={() => void remove()}
        onCancel={() => setToDelete(null)}
      />

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard all drafts?"
        description="Unpublished draft changes to every section will be thrown away."
        destructive
        confirmLabel="Discard drafts"
        onConfirm={() => void discardAll()}
        onCancel={() => setConfirmDiscard(false)}
      />
    </div>
  );
}
