import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock, PenLine, Search } from 'lucide-react';
import { SectionShell } from './SectionShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Field';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { MediaImage } from './MediaImage';
import { api, type PageMeta } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate } from '@/lib/utils';
import type { BlogSummary, PageSection } from '@/types/api';

export function BlogCard({ post, featured = false }: { post: BlogSummary; featured?: boolean }) {
  return (
    <Card
      as="article"
      interactive
      className={featured ? 'grid overflow-hidden p-0 sm:grid-cols-2' : 'flex h-full flex-col overflow-hidden p-0'}
    >
      <Link to={`/blog/${post.slug}`} className="block">
        <MediaImage
          media={post.cover}
          alt={post.title}
          className={featured ? 'h-56 w-full overflow-hidden sm:h-full' : 'aspect-[16/9] w-full overflow-hidden'}
          imgClassName="h-full w-full object-cover"
        />
      </Link>
      <div className={featured ? 'flex flex-col p-6' : 'flex flex-1 flex-col p-5'}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {post.category ? <Badge variant="primary">{post.category}</Badge> : null}
          {post.featured ? <Badge>Featured</Badge> : null}
        </div>
        <h3 className={featured ? 'text-2xl font-semibold' : 'text-lg font-semibold'}>
          <Link to={`/blog/${post.slug}`} className="hover:underline">
            {post.title}
          </Link>
        </h3>
        {post.excerpt ? (
          <p className={featured ? 'mt-3 flex-1 text-base' : 'mt-2 flex-1 text-sm'} style={{ color: 'var(--muted)' }}>
            {post.excerpt}
          </p>
        ) : (
          <div className="flex-1" />
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--muted)' }}>
          {post.publishedAt ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> {formatDate(post.publishedAt)}
            </span>
          ) : null}
          {post.readingMinutes ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {post.readingMinutes} min read
            </span>
          ) : null}
        </div>

        {post.tags.length ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {post.tags.slice(0, 4).map((tag) => (
              <li key={tag.id}>
                <span className="badge">#{tag.name}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Card>
  );
}

interface BlogGridProps {
  section?: PageSection;
  limit?: number;
  showFilters?: boolean;
  showPagination?: boolean;
  showFeatured?: boolean;
}

export function BlogGrid({ section, limit, showFilters = true, showPagination = true, showFeatured = true }: BlogGridProps) {
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search, 250);
  const pageSize = limit ?? 9;

  const filters = useAsync<{ categories: string[]; tags: Array<{ id: string; name: string; slug: string }> }>(
    () => api.get<{ categories: string[]; tags: Array<{ id: string; name: string; slug: string }> }>('/api/public/blog/filters').then((r) => r.data),
    [],
  );

  const list = useAsync<{ items: BlogSummary[]; meta: PageMeta }>(
    () =>
      api.getList<BlogSummary>('/api/public/blog', {
        page,
        pageSize,
        category: category || undefined,
        tag: tag || undefined,
        search: debounced,
      }),
    [page, pageSize, category, tag, debounced],
  );

  const items = list.data?.items ?? [];
  const meta = list.data?.meta;
  const featured = showFeatured && !limit && page === 1 && !search && !category && !tag ? items.find((post) => post.featured) : undefined;
  const rest = featured ? items.filter((post) => post.id !== featured.id) : items;

  const resetTo = (updater: () => void) => {
    updater();
    setPage(1);
  };

  return (
    <SectionShell section={section} id="blog" showTitle={Boolean(section)}>
      {showFilters ? (
        <div className="mb-8 space-y-3">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" aria-hidden="true" />
            <Input
              value={search}
              onChange={(event) => resetTo(() => setSearch(event.target.value))}
              placeholder="Search articles…"
              aria-label="Search blog"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="chip"
              aria-pressed={!category && !tag}
              onClick={() => resetTo(() => { setCategory(''); setTag(''); })}
            >
              All
            </button>
            {(filters.data?.categories ?? []).map((item) => (
              <button
                key={item}
                type="button"
                className="chip"
                aria-pressed={category === item}
                onClick={() => resetTo(() => setCategory(category === item ? '' : item))}
              >
                {item}
              </button>
            ))}
            {(filters.data?.tags ?? []).map((item) => (
              <button
                key={item.id}
                type="button"
                className="chip"
                aria-pressed={tag === item.slug}
                onClick={() => resetTo(() => setTag(tag === item.slug ? '' : item.slug))}
              >
                #{item.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {list.loading ? (
        <LoadingBlock label="Loading articles…" />
      ) : list.error ? (
        <EmptyState icon={<PenLine className="h-5 w-5" />} title="Blog unavailable" description="Please try again shortly." />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<PenLine className="h-5 w-5" />}
          title="No articles yet"
          description="Technical writing and notes will be published here."
        />
      ) : (
        <div className="space-y-6">
          {featured ? <BlogCard post={featured} featured /> : null}
          {rest.length ? (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <li key={post.id}>
                  <BlogCard post={post} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      {showPagination && meta ? (
        <div className="mt-8">
          <Pagination meta={meta} onChange={setPage} />
        </div>
      ) : null}
    </SectionShell>
  );
}
