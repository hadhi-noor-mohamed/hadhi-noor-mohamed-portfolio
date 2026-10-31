import { useCallback, useEffect, useState } from 'react';
import { ImageIcon, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { api, errorMessage } from '@/lib/api';
import { formatBytes, cn } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import type { MediaDTO, MediaKind } from '@/types/api';

interface MediaFieldProps {
  value: string | null | undefined;
  /** The resolved asset, when the parent already has it (avoids a refetch). */
  asset?: MediaDTO | null;
  onChange: (id: string | null, asset: MediaDTO | null) => void;
  label?: string;
  /** Restrict the library to a single kind (e.g. only PDFs for reports). */
  kind?: MediaKind;
  hint?: string;
}

export function MediaField({ value, asset, onChange, label, kind, hint }: MediaFieldProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaDTO[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getList<MediaDTO>('/api/admin/media', { kind, search, pageSize: 48 });
      setItems(result.items);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [kind, search, toast]);

  useEffect(() => {
    if (open) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, search, kind]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const form = new FormData();
      Array.from(files).forEach((file) => form.append('files', file));
      const result = await api.upload<MediaDTO[]>('/api/admin/media', form);
      const first = result.data?.[0];
      if (first) {
        onChange(first.id, first);
        setOpen(false);
        toast.success('Uploaded and selected');
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1">
      {label ? <span className="label">{label}</span> : null}
      <div className="flex items-center gap-3">
        <div
          className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border"
          style={{ borderColor: 'var(--border)', backgroundColor: 'color-mix(in srgb, var(--muted) 8%, transparent)' }}
        >
          {asset?.kind === 'IMAGE' && asset.url ? (
            <img src={asset.url} alt="" className="h-full w-full object-cover" />
          ) : asset ? (
            <span className="px-2 text-center text-[0.65rem] uppercase" style={{ color: 'var(--muted)' }}>
              {asset.kind}
            </span>
          ) : (
            <ImageIcon className="h-6 w-6 opacity-40" aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            {asset ? 'Change' : 'Choose media'}
          </Button>
          {asset ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null, null)} iconLeft={<Trash2 className="h-4 w-4" aria-hidden="true" />}>
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      {asset ? (
        <p className="hint truncate">
          {asset.displayLabel} · {formatBytes(asset.size)}
        </p>
      ) : hint ? (
        <p className="hint">{hint}</p>
      ) : null}
      {value && !asset ? <p className="hint font-mono text-[0.7rem]">id: {value}</p> : null}

      <Modal open={open} onClose={() => setOpen(false)} title="Media library" size="xl">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search by name, label or alt text…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-xs"
          />
          <label className="btn btn-outline btn-sm cursor-pointer">
            {uploading ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
            Upload
            <input type="file" multiple className="sr-only" onChange={(event) => void upload(event.target.files)} />
          </label>
        </div>

        {loading ? (
          <div className="py-16">
            <Spinner className="mx-auto" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ImageIcon className="h-5 w-5" />}
            title="No media yet"
            description="Upload an image or document to use it across the site."
          />
        ) : (
          <ul className="grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(item.id, item);
                    setOpen(false);
                  }}
                  className={cn(
                    'group w-full overflow-hidden rounded-lg border text-left transition',
                    value === item.id ? 'ring-2' : 'hover:border-[var(--brand-primary)]',
                  )}
                  style={{ borderColor: 'var(--border)', ...(value === item.id ? { boxShadow: '0 0 0 2px var(--brand-primary)' } : {}) }}
                >
                  <div
                    className="flex aspect-[4/3] items-center justify-center overflow-hidden"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--muted) 10%, transparent)' }}
                  >
                    {item.kind === 'IMAGE' ? (
                      <img src={item.url} alt={item.alt || item.displayLabel} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs uppercase" style={{ color: 'var(--muted)' }}>
                        {item.kind}
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="truncate text-xs font-medium">{item.displayLabel}</p>
                    <p className="truncate text-[0.65rem]" style={{ color: 'var(--muted)' }}>
                      {formatBytes(item.size)}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
