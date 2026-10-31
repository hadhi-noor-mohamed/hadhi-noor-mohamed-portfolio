import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
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
import { MediaImage } from '@/components/public/MediaImage';
import { AdminPageHeader, RowActions, TableWrap, Td, Th, Toolbar } from '@/components/admin/AdminUI';
import type { BlogTag, MediaDTO, PublishState } from '@/types/api';

interface AdminBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  state: PublishState;
  publishedAt: string | null;
  scheduledFor: string | null;
  updatedAt: string;
  readingMinutes: number;
  viewCount: number;
  featured: boolean;
  cover: MediaDTO | null;
  tags: BlogTag[];
  project?: { id: string; title: string; slug: string } | null;
}

const STATE_OPTIONS = [
  { value: '', label: 'All states' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export function AdminBlogPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<AdminBlogPost | null>(null);
  const debounced = useDebounce(search, 250);

  const list = useAsync<AdminBlogPost[]>(
    () =>
      api
        .get<AdminBlogPost[]>('/api/admin/blog', {
          search: debounced || undefined,
          state: state || undefined,
          category: category || undefined,
        })
        .then((r) => r.data),
    [debounced, state, category],
  );

  const items = useMemo(() => list.data ?? [], [list.data]);

  const categoryOptions = useMemo(() => {
    const found = [...new Set(items.map((post) => post.category).filter(Boolean))].sort();
    return [{ value: '', label: 'All categories' }, ...found.map((c) => ({ value: c, label: c }))];
  }, [items]);

  const setStateFor = async (post: AdminBlogPost, next: PublishState) => {
    setBusy(true);
    try {
      await api.post(`/api/admin/blog/${post.id}/publish`, { state: next });
      await list.reload();
      toast.success(next === 'PUBLISHED' ? 'Post published' : 'Post updated');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/api/admin/blog/${toDelete.id}`);
      setToDelete(null);
      await list.reload();
      toast.success('Post deleted');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Blog"
        description="Technical writing, notes and reflections."
        actions={
          <Link to="/admin/blog/new" className="btn btn-primary btn-sm">
            <Plus className="h-4 w-4" aria-hidden="true" /> New post
          </Link>
        }
      />

      <Toolbar>
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" aria-hidden="true" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts…" aria-label="Search posts" className="pl-9" />
        </div>
        <Select aria-label="Filter by state" value={state} onChange={(e) => setState(e.target.value)} options={STATE_OPTIONS} className="w-40" />
        <Select aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)} options={categoryOptions} className="w-44" />
      </Toolbar>

      {list.loading ? (
        <LoadingBlock label="Loading posts…" />
      ) : list.error ? (
        <EmptyState title="Blog unavailable" description="Please retry shortly." />
      ) : items.length === 0 ? (
        <EmptyState
          title="No posts yet"
          description="Write your first technical post to get started."
          action={
            <Link to="/admin/blog/new" className="btn btn-primary btn-sm">
              New post
            </Link>
          }
        />
      ) : (
        <TableWrap>
          <table className="w-full min-w-[52rem]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <Th>Post</Th>
                <Th>Category</Th>
                <Th>State</Th>
                <Th>Published</Th>
                <Th>Views</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((post) => (
                <tr key={post.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <MediaImage
                        media={post.cover}
                        alt={post.title}
                        className="h-10 w-16 shrink-0 overflow-hidden rounded"
                        imgClassName="h-full w-full object-cover"
                      />
                      <div className="min-w-0">
                        <Link to={`/admin/blog/${post.id}`} className="font-medium hover:underline">
                          {post.title}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1">
                          {post.featured ? <Badge variant="primary">Featured</Badge> : null}
                          {post.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag.id} variant="muted">
                              {tag.name}
                            </Badge>
                          ))}
                          {post.tags.length > 3 ? <span className="text-xs opacity-60">+{post.tags.length - 3}</span> : null}
                        </div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {post.category || '—'}
                    </span>
                  </Td>
                  <Td>
                    <StateBadge state={post.state ?? 'DRAFT'} />
                  </Td>
                  <Td>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {post.state === 'SCHEDULED' && post.scheduledFor ? `For ${formatDate(post.scheduledFor)}` : formatDate(post.publishedAt) || '—'}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {post.viewCount ?? 0}
                    </span>
                  </Td>
                  <Td>
                    <RowActions>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => setStateFor(post, post.state === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED')}>
                        {post.state === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Link to={`/admin/blog/${post.id}`} className="btn btn-ghost btn-sm" aria-label={`Edit ${post.title}`} title="Edit">
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => setToDelete(post)} aria-label="Delete">
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

      {items.length > 0 ? (
        <p className="mt-4 flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
          <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Only published posts (and scheduled posts past their date) appear publicly.
        </p>
      ) : null}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete post?"
        description={toDelete ? `“${toDelete.title}” will be permanently removed.` : ''}
        destructive
        confirmLabel="Delete"
        onConfirm={() => void remove()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
