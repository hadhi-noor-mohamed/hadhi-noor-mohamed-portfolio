import { useState } from 'react';
import { Mail, MailOpen, Reply, Search, Trash2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/context/ToastContext';
import { formatDate, timeAgo } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { AdminPageHeader, DetailItem, RowActions, TableWrap, Td, Th, Toolbar } from '@/components/admin/AdminUI';
import type { ContactCategory, ContactStatus, Message } from '@/types/api';
import type { PageMeta } from '@/lib/api';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'READ', label: 'Read' },
  { value: 'REPLIED', label: 'Replied' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  { value: 'JOB_OPPORTUNITY', label: 'Job opportunity' },
  { value: 'PROJECT_COLLABORATION', label: 'Project collaboration' },
  { value: 'TECHNICAL_DISCUSSION', label: 'Technical discussion' },
  { value: 'FEEDBACK', label: 'Feedback' },
  { value: 'OTHER', label: 'Other' },
];

const CATEGORY_LABELS: Record<ContactCategory, string> = {
  JOB_OPPORTUNITY: 'Job opportunity',
  PROJECT_COLLABORATION: 'Project collaboration',
  TECHNICAL_DISCUSSION: 'Technical discussion',
  FEEDBACK: 'Feedback',
  OTHER: 'Other',
};

const STATUS_VARIANTS: Record<ContactStatus, 'primary' | 'muted' | 'success' | 'warning'> = {
  NEW: 'primary',
  READ: 'muted',
  REPLIED: 'success',
  ARCHIVED: 'warning',
};

export function AdminInboxPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Message | null>(null);
  const debounced = useDebounce(search, 250);

  const list = useAsync<{ items: Message[]; meta: PageMeta }>(
    () =>
      api.getList<Message>('/api/admin/messages', {
        page,
        pageSize: 20,
        search: debounced || undefined,
        status: status || undefined,
        category: category || undefined,
      }),
    [page, debounced, status, category],
  );

  const items = list.data?.items ?? [];
  const meta = list.data?.meta;

  const resetPage = (fn: () => void) => {
    fn();
    setPage(1);
  };

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

  const bulk = async (action: 'read' | 'archive' | 'delete') => {
    setBusy(true);
    try {
      await api.post('/api/admin/messages/bulk', { ids: [...selected], action });
      toast.success('Bulk action applied');
      setSelected(new Set());
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
      await api.delete(`/api/admin/messages/${toDelete.id}`);
      setToDelete(null);
      if (openId === toDelete.id) setOpenId(null);
      await list.reload();
      toast.success('Message deleted');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const openMessage = async (message: Message) => {
    setOpenId(message.id);
    if (message.status === 'NEW') {
      try {
        await api.post(`/api/admin/messages/${message.id}/read`, {});
        await list.reload();
      } catch {
        /* non-critical */
      }
    }
  };

  const active = items.find((item) => item.id === openId) ?? null;

  return (
    <div>
      <AdminPageHeader title="Inbox" description="Messages sent through the public contact form." />

      <Toolbar>
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" aria-hidden="true" />
          <Input value={search} onChange={(e) => resetPage(() => setSearch(e.target.value))} placeholder="Search messages…" aria-label="Search messages" className="pl-9" />
        </div>
        <Select aria-label="Filter by status" value={status} onChange={(e) => resetPage(() => setStatus(e.target.value))} options={STATUS_OPTIONS} className="w-40" />
        <Select aria-label="Filter by category" value={category} onChange={(e) => resetPage(() => setCategory(e.target.value))} options={CATEGORY_OPTIONS} className="w-48" />
      </Toolbar>

      {selected.size > 0 ? (
        <Toolbar className="rounded-xl border p-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => void bulk('read')} disabled={busy} iconLeft={<MailOpen className="h-4 w-4" aria-hidden="true" />}>
            Mark read
          </Button>
          <Button size="sm" variant="outline" onClick={() => void bulk('archive')} disabled={busy}>
            Archive
          </Button>
          <Button size="sm" variant="ghost" className="text-red-400" onClick={() => void bulk('delete')} disabled={busy} iconLeft={<Trash2 className="h-4 w-4" aria-hidden="true" />}>
            Delete
          </Button>
        </Toolbar>
      ) : null}

      {list.loading ? (
        <LoadingBlock label="Loading messages…" />
      ) : list.error ? (
        <EmptyState title="Inbox unavailable" description="Please retry shortly." />
      ) : items.length === 0 ? (
        <EmptyState icon={<Mail className="h-5 w-5" />} title="No messages" description="When someone uses the contact form, it will appear here." />
      ) : (
        <TableWrap>
          <table className="w-full min-w-[48rem]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <Th className="w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
                </Th>
                <Th>From</Th>
                <Th>Subject</Th>
                <Th>Category</Th>
                <Th>Status</Th>
                <Th>Received</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((message) => (
                <tr key={message.id} style={{ borderBottom: '1px solid var(--border)', fontWeight: message.status === 'NEW' ? 600 : 400 }}>
                  <Td>
                    <input type="checkbox" checked={selected.has(message.id)} onChange={() => toggleOne(message.id)} aria-label={`Select message from ${message.name}`} />
                  </Td>
                  <Td>
                    <button type="button" className="text-left hover:underline" onClick={() => void openMessage(message)}>
                      <span className="block text-sm">{message.name}</span>
                      <span className="block text-xs font-normal" style={{ color: 'var(--muted)' }}>
                        {message.email}
                      </span>
                    </button>
                  </Td>
                  <Td>
                    <span className="line-clamp-1 max-w-[18rem]">{message.subject || '(no subject)'}</span>
                  </Td>
                  <Td>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {CATEGORY_LABELS[message.category]}
                    </span>
                  </Td>
                  <Td>
                    <Badge variant={STATUS_VARIANTS[message.status]}>{message.status}</Badge>
                  </Td>
                  <Td>
                    <span className="text-xs" style={{ color: 'var(--muted)' }} title={formatDate(message.createdAt)}>
                      {timeAgo(message.createdAt)}
                    </span>
                  </Td>
                  <Td>
                    <RowActions>
                      <Button size="sm" variant="ghost" onClick={() => void openMessage(message)}>
                        Open
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => setToDelete(message)} aria-label="Delete">
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

      {meta && items.length > 0 ? (
        <div className="mt-5">
          <Pagination meta={meta} onChange={setPage} />
        </div>
      ) : null}

      <MessageDetail
        key={active?.id ?? 'none'}
        message={active}
        onClose={() => setOpenId(null)}
        onChanged={() => void list.reload()}
        onDelete={(message) => {
          setOpenId(null);
          setToDelete(message);
        }}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete message?"
        description={toDelete ? `The message from ${toDelete.name} will be permanently removed.` : ''}
        destructive
        confirmLabel="Delete"
        onConfirm={() => void remove()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function MessageDetail({
  message,
  onClose,
  onChanged,
  onDelete,
}: {
  message: Message | null;
  onClose: () => void;
  onChanged: () => void;
  onDelete: (message: Message) => void;
}) {
  const toast = useToast();
  const [status, setStatus] = useState<ContactStatus>(message?.status ?? 'NEW');
  const [notes, setNotes] = useState(message?.notes ?? '');
  const [saving, setSaving] = useState(false);

  return (
    <Modal
      open={Boolean(message)}
      onClose={onClose}
      title={message?.subject || '(no subject)'}
      description={message ? `From ${message.name} · ${formatDate(message.createdAt)}` : undefined}
      size="lg"
      footer={
        message ? (
          <>
            <Button variant="ghost" className="text-red-400" onClick={() => onDelete(message)} iconLeft={<Trash2 className="h-4 w-4" aria-hidden="true" />}>
              Delete
            </Button>
            <a className="btn btn-outline" href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject || 'Your message'}`)}`} onClick={() => setStatus('REPLIED')}>
              <Reply className="h-4 w-4" aria-hidden="true" /> Reply by email
            </a>
            <Button
              loading={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await api.patch(`/api/admin/messages/${message.id}`, { status, notes });
                  toast.success('Message updated');
                  onChanged();
                  onClose();
                } catch (error) {
                  toast.error(errorMessage(error));
                } finally {
                  setSaving(false);
                }
              }}
            >
              Save
            </Button>
          </>
        ) : null
      }
    >
      {message ? (
        <div className="space-y-5">
          <dl className="grid gap-4 sm:grid-cols-2">
            <DetailItem label="Name">{message.name}</DetailItem>
            <DetailItem label="Email">
              <a href={`mailto:${message.email}`} className="hover:underline">
                {message.email}
              </a>
            </DetailItem>
            <DetailItem label="Category">{CATEGORY_LABELS[message.category]}</DetailItem>
            <DetailItem label="Consent">{message.consent ? 'Consented to be contacted' : 'Not recorded'}</DetailItem>
          </dl>

          <div>
            <p className="label">Message</p>
            <p className="whitespace-pre-wrap rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--border)' }}>
              {message.message}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status" htmlFor="msg-status">
              <Select id="msg-status" value={status} onChange={(e) => setStatus(e.target.value as ContactStatus)} options={STATUS_OPTIONS.filter((o) => o.value)} />
            </Field>
            <Field label="Private notes" htmlFor="msg-notes" hint="Only visible to you.">
              <Textarea id="msg-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
