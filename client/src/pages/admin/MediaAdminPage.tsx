import { useCallback, useRef, useState, type ChangeEvent } from 'react';
import { FileText, Film, Image as ImageIcon, Pencil, RefreshCw, Trash2, Upload } from 'lucide-react';
import { api, errorMessage, type PageMeta } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/context/ToastContext';
import { formatBytes } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Switch } from '@/components/ui/Field';
import { TagInput } from '@/components/ui/TagInput';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingBlock, Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { AdminPageHeader, TableWrap, Td, Th, Toolbar } from '@/components/admin/AdminUI';
import type { MediaDTO, MediaKind } from '@/types/api';

const KIND_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All kinds' },
  { value: 'IMAGE', label: 'Images' },
  { value: 'PDF', label: 'PDFs' },
  { value: 'VIDEO', label: 'Videos' },
  { value: 'DOCUMENT', label: 'Documents' },
  { value: 'OTHER', label: 'Other' },
];

function KindIcon({ kind }: { kind: MediaKind }) {
  if (kind === 'IMAGE') return <ImageIcon className="h-5 w-5" aria-hidden="true" />;
  if (kind === 'VIDEO') return <Film className="h-5 w-5" aria-hidden="true" />;
  return <FileText className="h-5 w-5" aria-hidden="true" />;
}

interface EditDraft {
  id: string;
  displayLabel: string;
  alt: string;
  tags: string[];
  isPublic: boolean;
}

export function AdminMediaPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('');
  const [tag, setTag] = useState('');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<EditDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [replacingFor, setReplacingFor] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<{ asset: MediaDTO; usages: string[] } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const debounced = useDebounce(search, 250);

  const list = useAsync<{ items: MediaDTO[]; meta: PageMeta }>(
    () =>
      api.getList<MediaDTO>('/api/admin/media', {
        page,
        pageSize: 24,
        search: debounced || undefined,
        kind: kind || undefined,
        tag: tag || undefined,
      }),
    [page, debounced, kind, tag],
  );

  const tags = useAsync<string[]>(() => api.get<string[]>('/api/admin/media/tags').then((r) => r.data), []);

  const items = list.data?.items ?? [];
  const meta = list.data?.meta;

  const resetPage = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const uploadFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const form = new FormData();
      Array.from(files).forEach((file) => form.append('files', file));
      const result = await api.upload<MediaDTO[]>('/api/admin/media', form);
      toast.success(`${result.data?.length ?? 0} file(s) uploaded`);
      await Promise.all([list.reload(), tags.reload()]);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openEdit = (asset: MediaDTO) =>
    setEditing({
      id: asset.id,
      displayLabel: asset.displayLabel,
      alt: asset.alt,
      tags: asset.tags ?? [],
      isPublic: asset.isPublic ?? true,
    });

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.patch(`/api/admin/media/${editing.id}`, {
        displayLabel: editing.displayLabel,
        alt: editing.alt,
        tags: editing.tags.filter(Boolean),
        isPublic: editing.isPublic,
      });
      toast.success('Asset updated');
      setEditing(null);
      await Promise.all([list.reload(), tags.reload()]);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const replaceFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !replacingFor) return;
    setSaving(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await api.upload(`/api/admin/media/${replacingFor}/replace`, form);
      toast.success('File replaced');
      setReplacingFor(null);
      await list.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  };

  const requestDelete = useCallback(async (asset: MediaDTO) => {
    try {
      const result = await api.get<{ usages: string[] }>(`/api/admin/media/${asset.id}/usage`);
      setToDelete({ asset, usages: result.data.usages ?? [] });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, [toast]);

  const confirmDelete = async (force: boolean) => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/api/admin/media/${toDelete.asset.id}`, force ? { force: 'true' } : undefined);
      toast.success('Asset deleted');
      setToDelete(null);
      await Promise.all([list.reload(), tags.reload()]);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Media library"
        description="Upload, organise and reuse images, documents and videos across the site."
        actions={
          <>
            <input ref={fileInputRef} type="file" multiple className="sr-only" onChange={(e) => void uploadFiles(e)} aria-hidden="true" />
            <Button size="sm" loading={uploading} onClick={() => fileInputRef.current?.click()} iconLeft={<Upload className="h-4 w-4" aria-hidden="true" />}>
              Upload files
            </Button>
          </>
        }
      />

      <Toolbar>
        <div className="relative min-w-[14rem] flex-1">
          <Input value={search} onChange={(e) => resetPage(() => setSearch(e.target.value))} placeholder="Search by name, label or alt text…" aria-label="Search media" />
        </div>
        <Select aria-label="Filter by kind" value={kind} onChange={(e) => resetPage(() => setKind(e.target.value))} options={KIND_OPTIONS} className="w-36" />
        <Select
          aria-label="Filter by tag"
          value={tag}
          onChange={(e) => resetPage(() => setTag(e.target.value))}
          placeholder="All tags"
          options={(tags.data ?? []).map((t) => ({ value: t, label: t }))}
          className="w-40"
        />
        <div className="flex overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border)' }}>
          <button type="button" onClick={() => setView('grid')} className="px-3 py-1.5 text-sm" style={view === 'grid' ? { backgroundColor: 'color-mix(in srgb, var(--brand-primary) 18%, transparent)' } : undefined}>
            Grid
          </button>
          <button type="button" onClick={() => setView('list')} className="px-3 py-1.5 text-sm" style={view === 'list' ? { backgroundColor: 'color-mix(in srgb, var(--brand-primary) 18%, transparent)' } : undefined}>
            List
          </button>
        </div>
      </Toolbar>

      {list.loading ? (
        <LoadingBlock label="Loading media…" />
      ) : list.error ? (
        <EmptyState title="Media unavailable" description="Please retry shortly." />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="h-5 w-5" />}
          title="No media yet"
          description="Upload an image or document to use it across the site."
          action={
            <Button size="sm" onClick={() => fileInputRef.current?.click()} iconLeft={<Upload className="h-4 w-4" aria-hidden="true" />}>
              Upload files
            </Button>
          }
        />
      ) : view === 'grid' ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((asset) => (
            <li key={asset.id} className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)' }}>
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden" style={{ backgroundColor: 'color-mix(in srgb, var(--muted) 10%, transparent)' }}>
                {asset.kind === 'IMAGE' ? (
                  <img src={asset.url} alt={asset.alt || asset.displayLabel} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <KindIcon kind={asset.kind} />
                )}
              </div>
              <div className="space-y-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium" title={asset.displayLabel || asset.originalName}>
                    {asset.displayLabel || asset.originalName}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    {asset.kind} · {formatBytes(asset.size)}
                    {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {asset.tags?.slice(0, 2).map((t) => (
                    <Badge key={t} variant="muted">
                      {t}
                    </Badge>
                  ))}
                  {asset.isPublic === false ? <Badge variant="warning">Private</Badge> : null}
                </div>
                <div className="flex items-center justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(asset)} aria-label="Edit asset" title="Edit">
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-400" onClick={() => void requestDelete(asset)} aria-label="Delete asset" title="Delete">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <TableWrap>
          <table className="w-full min-w-[42rem]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <Th>Asset</Th>
                <Th>Kind</Th>
                <Th>Size</Th>
                <Th>Tags</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((asset) => (
                <tr key={asset.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded" style={{ backgroundColor: 'color-mix(in srgb, var(--muted) 10%, transparent)' }}>
                        {asset.kind === 'IMAGE' ? <img src={asset.url} alt="" className="h-full w-full object-cover" /> : <KindIcon kind={asset.kind} />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{asset.displayLabel || asset.originalName}</p>
                        <p className="truncate font-mono text-[0.68rem]" style={{ color: 'var(--muted)' }}>
                          {asset.originalName}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span className="text-xs">{asset.kind}</span>
                  </Td>
                  <Td>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {formatBytes(asset.size)}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {asset.tags?.length ? asset.tags.map((t) => <Badge key={t} variant="muted">{t}</Badge>) : <span className="text-xs opacity-50">—</span>}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(asset)} iconLeft={<Pencil className="h-4 w-4" aria-hidden="true" />}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => void requestDelete(asset)} aria-label="Delete">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}

      {meta && items.length > 0 ? (
        <div className="mt-5">
          <Pagination meta={meta} onChange={setPage} />
        </div>
      ) : null}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit asset"
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
            <Field label="Display label" htmlFor="m-label" hint="Shown in the library and as a fallback alt text.">
              <Input id="m-label" value={editing.displayLabel} onChange={(e) => setEditing({ ...editing, displayLabel: e.target.value })} />
            </Field>
            <Field label="Alt text" htmlFor="m-alt" hint="Accessibility text — describe the image, not the file.">
              <Input id="m-alt" value={editing.alt} onChange={(e) => setEditing({ ...editing, alt: e.target.value })} />
            </Field>
            <Field label="Tags">
              <TagInput value={editing.tags} onChange={(v) => setEditing({ ...editing, tags: v })} />
            </Field>
            <Switch checked={editing.isPublic} onChange={(v) => setEditing({ ...editing, isPublic: v })} label="Publicly accessible" description="Private assets use short-lived signed URLs." />
            <div className="flex flex-wrap items-center gap-2 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
              <input ref={replaceInputRef} type="file" className="sr-only" onChange={(e) => void replaceFile(e)} aria-hidden="true" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={saving && replacingFor === editing.id}
                onClick={() => {
                  setReplacingFor(editing.id);
                  replaceInputRef.current?.click();
                }}
                iconLeft={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
              >
                Replace file
              </Button>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                Keeps the same id, so existing references stay intact.
              </span>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={toDelete?.usages.length ? 'Asset is still in use' : 'Delete asset?'}
        description={
          toDelete
            ? toDelete.usages.length
              ? `This asset is referenced by: ${toDelete.usages.join(', ')}. Deleting it will leave those references broken.`
              : `“${toDelete.asset.displayLabel || toDelete.asset.originalName}” will be permanently removed.`
            : ''
        }
        destructive
        confirmLabel={toDelete?.usages.length ? 'Delete anyway' : 'Delete'}
        requireText={toDelete?.usages.length ? 'DELETE' : undefined}
        loading={deleting}
        onConfirm={() => void confirmDelete(Boolean(toDelete?.usages.length))}
        onCancel={() => setToDelete(null)}
      />

      {uploading ? (
        <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-black/30">
          <Spinner className="text-white" label="Uploading" />
        </div>
      ) : null}
    </div>
  );
}
