import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/context/ToastContext';
import { formatDate } from '@/lib/utils';
import { Badge, StateBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AdminPageHeader, RowActions, TableWrap, Td, Th, Toolbar } from '@/components/admin/AdminUI';
import type { JourneySummary, PublishState } from '@/types/api';

const STATE_OPTIONS = [
  { value: '', label: 'All states' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export function AdminJourneyAdminPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<JourneySummary | null>(null);
  const debounced = useDebounce(search, 250);

  const list = useAsync<JourneySummary[]>(
    () => api.get<JourneySummary[]>('/api/admin/journey', { search: debounced || undefined, state: state || undefined }).then((r) => r.data),
    [debounced, state],
  );

  const setStateFor = async (entry: JourneySummary, next: PublishState) => {
    setBusy(true);
    try {
      await api.put(`/api/admin/journey/${entry.id}`, { state: next });
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
      await api.delete(`/api/admin/journey/${toDelete.id}`);
      setToDelete(null);
      await list.reload();
      toast.success('Entry removed');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Learning journey"
        description="Short posts about what you are learning and building."
        actions={
          <Link to="/admin/journey/new" className="btn btn-primary btn-sm">
            <Plus className="h-4 w-4" aria-hidden="true" /> New entry
          </Link>
        }
      />

      <Toolbar>
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" aria-hidden="true" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search entries…" aria-label="Search journey" className="pl-9" />
        </div>
        <Select aria-label="Filter by state" value={state} onChange={(e) => setState(e.target.value)} options={STATE_OPTIONS} className="w-40" />
      </Toolbar>

      {list.loading ? (
        <LoadingBlock label="Loading journey…" />
      ) : list.error ? (
        <EmptyState title="Journey unavailable" description="Please retry shortly." />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState
          title="No entries yet"
          description="Publish a learning update to get started."
          action={
            <Link to="/admin/journey/new" className="btn btn-primary btn-sm">
              New entry
            </Link>
          }
        />
      ) : (
        <TableWrap>
          <table className="w-full min-w-[44rem]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <Th>Entry</Th>
                <Th>Date</Th>
                <Th>State</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {(list.data ?? []).map((entry) => (
                <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <Td>
                    <Link to={`/admin/journey/${entry.id}`} className="font-medium hover:underline">
                      {entry.title}
                    </Link>
                    {entry.project ? (
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>
                        {entry.project.title}
                      </p>
                    ) : null}
                  </Td>
                  <Td>{formatDate(entry.date)}</Td>
                  <Td>
                    <StateBadge state={entry.state ?? 'DRAFT'} />
                  </Td>
                  <Td>
                    <RowActions>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => setStateFor(entry, entry.state === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED')}>
                        {entry.state === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Link to={`/admin/journey/${entry.id}`} className="btn btn-ghost btn-sm" aria-label={`Edit ${entry.title}`} title="Edit">
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Link>
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

      {list.data && list.data.length > 0 ? (
        <p className="mt-4 text-xs" style={{ color: 'var(--muted)' }}>
          <Badge variant="muted">Tip</Badge> Only published entries appear on the public journey page.
        </p>
      ) : null}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete entry?"
        description={toDelete ? `“${toDelete.title}” will be permanently removed.` : ''}
        destructive
        confirmLabel="Delete"
        onConfirm={() => void remove()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
