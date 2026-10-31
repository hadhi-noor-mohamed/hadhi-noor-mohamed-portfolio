import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, Copy, Pencil, Plus, RotateCcw, Search, Sparkles, Trash2 } from 'lucide-react';
import { api, errorMessage, type PageMeta } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/context/ToastContext';
import { formatDateRange } from '@/lib/utils';
import { Badge, StateBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { MediaImage } from '@/components/public/MediaImage';
import { AdminPageHeader, RowActions, TableWrap, Td, Th, Toolbar } from '@/components/admin/AdminUI';
import type { AdminProject, PublishState } from '@/types/api';

const STATE_OPTIONS = [
  { value: '', label: 'All states' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
  { value: 'SCHEDULED', label: 'Scheduled' },
];

export function AdminProjectsPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [trash, setTrash] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ project: AdminProject; permanent: boolean } | null>(null);
  const debounced = useDebounce(search, 250);

  const list = useAsync<{ items: AdminProject[]; meta: PageMeta }>(
    () =>
      api.getList<AdminProject>('/api/admin/projects', {
        page,
        pageSize: 20,
        search: debounced,
        state: state || undefined,
        trash: trash ? 'true' : undefined,
      }),
    [page, debounced, state, trash],
  );

  const items = list.data?.items ?? [];
  const meta = list.data?.meta;

  const allSelected = items.length > 0 && items.every((item) => selected.has(item.id));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) items.forEach((item) => next.delete(item.id));
      else items.forEach((item) => next.add(item.id));
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const run = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(message);
      setSelected(new Set());
      await list.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const setProjectState = (project: AdminProject, next: PublishState) =>
    run(() => api.post(`/api/admin/projects/${project.id}/publish`, { state: next }), 'State updated');

  const bulk = (action: string) =>
    run(() => api.post('/api/admin/projects/bulk', { ids: [...selected], action }), 'Bulk action applied');

  const remove = async () => {
    if (!confirm) return;
    const { project, permanent } = confirm;
    await run(
      () => (permanent ? api.delete(`/api/admin/projects/${project.id}/permanent`) : api.delete(`/api/admin/projects/${project.id}`)),
      permanent ? 'Project deleted permanently' : 'Project moved to trash',
    );
    setConfirm(null);
  };

  const resetPage = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <div>
      <AdminPageHeader
        title="Projects"
        description="Create, organise and publish your project portfolio."
        actions={
          <Link to="/admin/projects/new" className="btn btn-primary btn-sm">
            <Plus className="h-4 w-4" aria-hidden="true" /> New project
          </Link>
        }
      />

      <Toolbar>
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => resetPage(() => setSearch(e.target.value))}
            placeholder="Search projects…"
            aria-label="Search projects"
            className="pl-9"
          />
        </div>
        <Select
          aria-label="Filter by state"
          value={state}
          onChange={(e) => resetPage(() => setState(e.target.value))}
          options={STATE_OPTIONS}
          className="w-40"
        />
        <Button variant={trash ? 'primary' : 'outline'} size="sm" onClick={() => resetPage(() => setTrash((v) => !v))}>
          {trash ? 'Viewing trash' : 'Trash'}
        </Button>
      </Toolbar>

      {selected.size > 0 ? (
        <Toolbar className="rounded-xl border p-3" >
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => bulk(trash ? 'restore' : 'publish')} disabled={busy}>
            {trash ? 'Restore' : 'Publish'}
          </Button>
          {!trash ? (
            <Button size="sm" variant="outline" onClick={() => bulk('unpublish')} disabled={busy}>
              Unpublish
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" className="text-red-400" onClick={() => bulk(trash ? 'delete' : 'archive')} disabled={busy}>
            {trash ? 'Delete' : 'Archive'}
          </Button>
        </Toolbar>
      ) : null}

      {list.loading ? (
        <LoadingBlock label="Loading projects…" />
      ) : list.error ? (
        <EmptyState title="Projects unavailable" description="Please retry shortly." />
      ) : items.length === 0 ? (
        <EmptyState
          title={trash ? 'Trash is empty' : 'No projects yet'}
          description={trash ? 'Archived projects appear here.' : 'Create your first project to get started.'}
          action={
            !trash ? (
              <Link to="/admin/projects/new" className="btn btn-primary btn-sm">
                New project
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <TableWrap>
            <table className="w-full min-w-[54rem]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <Th className="w-10">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
                  </Th>
                  <Th>Project</Th>
                  <Th>State</Th>
                  <Th>Status</Th>
                  <Th>Featured</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((project) => (
                  <tr key={project.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <Td>
                      <input type="checkbox" checked={selected.has(project.id)} onChange={() => toggleOne(project.id)} aria-label={`Select ${project.title}`} />
                    </Td>
                    <Td>
                      <div className="flex items-center gap-3">
                        <MediaImage
                          media={project.cover}
                          alt={project.title}
                          className="h-10 w-16 shrink-0 overflow-hidden rounded"
                          imgClassName="h-full w-full object-cover"
                        />
                        <div className="min-w-0">
                          <Link to={`/admin/projects/${project.id}`} className="font-medium hover:underline">
                            {project.title}
                          </Link>
                          <p className="truncate text-xs" style={{ color: 'var(--muted)' }}>
                            {project.category || 'Uncategorised'} · {formatDateRange(project.startDate, project.endDate)}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <StateBadge state={project.state} />
                    </Td>
                    <Td>
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>
                        {project.status}
                      </span>
                    </Td>
                    <Td>{project.featured ? <Badge variant="primary">Featured</Badge> : <span className="text-xs opacity-50">—</span>}</Td>
                    <Td>
                      <RowActions>
                        {trash ? (
                          <>
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => api.post(`/api/admin/projects/${project.id}/restore`), 'Restored')} iconLeft={<RotateCcw className="h-4 w-4" aria-hidden="true" />}>
                              Restore
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-400" onClick={() => setConfirm({ project, permanent: true })} iconLeft={<Trash2 className="h-4 w-4" aria-hidden="true" />}>
                              Delete
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setProjectState(project, project.state === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED')} disabled={busy}>
                              {project.state === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => run(() => api.post(`/api/admin/projects/${project.id}/duplicate`), 'Duplicated as draft')} disabled={busy} aria-label="Duplicate" title="Duplicate">
                              <Copy className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Link to={`/admin/projects/${project.id}`} className="btn btn-ghost btn-sm" aria-label={`Edit ${project.title}`} title="Edit">
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </Link>
                            <Button size="sm" variant="ghost" className="text-red-400" onClick={() => setConfirm({ project, permanent: false })} disabled={busy} aria-label="Archive" title="Archive">
                              <Archive className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </>
                        )}
                      </RowActions>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>

          {meta ? (
            <div className="mt-5">
              <Pagination meta={meta} onChange={setPage} />
            </div>
          ) : null}
        </>
      )}

      {items.length > 0 && !trash ? (
        <p className="mt-4 flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Only published projects are visible on the public site.
        </p>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.permanent ? 'Delete permanently?' : 'Move to trash?'}
        description={
          confirm?.permanent
            ? `“${confirm.project.title}” and its gallery links will be permanently removed. This cannot be undone.`
            : confirm
              ? `“${confirm.project.title}” will be moved to trash and hidden from the site.`
              : ''
        }
        destructive={Boolean(confirm?.permanent)}
        confirmLabel={confirm?.permanent ? 'Delete permanently' : 'Move to trash'}
        loading={busy}
        onConfirm={() => void remove()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
