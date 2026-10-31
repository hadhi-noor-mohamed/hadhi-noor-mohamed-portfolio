import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookMarked, CalendarDays, ExternalLink, PlayCircle, Search } from 'lucide-react';
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
import type { JourneySummary, PageSection } from '@/types/api';

export function JourneyCard({ entry }: { entry: JourneySummary }) {
  return (
    <Card as="article" interactive className="overflow-hidden p-0">
      <div className="grid gap-0 sm:grid-cols-[minmax(0,14rem)_1fr]">
        {entry.cover ? (
          <Link to={`/journey/${entry.slug}`} className="block">
            <MediaImage
              media={entry.cover}
              alt={entry.title}
              className="h-44 w-full overflow-hidden sm:h-full"
              imgClassName="h-full w-full object-cover"
            />
          </Link>
        ) : null}
        <div className="p-5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="primary" icon={<CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />}>
              {formatDate(entry.date)}
            </Badge>
            {entry.featured ? <Badge>Featured</Badge> : null}
          </div>
          <h3 className="text-lg font-semibold">
            <Link to={`/journey/${entry.slug}`} className="hover:underline">
              {entry.title}
            </Link>
          </h3>
          {entry.description ? (
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
              {entry.description}
            </p>
          ) : null}

          {entry.tags.length ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {entry.tags.map((tag) => (
                <li key={tag}>
                  <span className="badge">#{tag}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <Link to={`/journey/${entry.slug}`} className="font-medium hover:underline">
              Read update →
            </Link>
            {entry.videoUrl ? (
              <a href={entry.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                <PlayCircle className="h-4 w-4" aria-hidden="true" /> Video
              </a>
            ) : null}
            {entry.externalUrl ? (
              <a href={entry.externalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                <ExternalLink className="h-4 w-4" aria-hidden="true" /> Link
              </a>
            ) : null}
            {entry.project ? (
              <Link to={`/projects/${entry.project.slug}`} className="hover:underline">
                {entry.project.title}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}

interface JourneyFeedProps {
  section?: PageSection;
  limit?: number;
  showFilters?: boolean;
  showPagination?: boolean;
  title?: string;
}

export function JourneyFeed({ section, limit, showFilters = true, showPagination = true }: JourneyFeedProps) {
  const [tag, setTag] = useState('');
  const [month, setMonth] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search, 250);
  const pageSize = limit ?? 9;

  const filters = useAsync<{ tags: string[]; months: string[] }>(
    () => api.get<{ tags: string[]; months: string[] }>('/api/public/journey/filters').then((r) => r.data),
    [],
  );

  const list = useAsync<{ items: JourneySummary[]; meta: PageMeta }>(
    () =>
      api.getList<JourneySummary>('/api/public/journey', {
        page,
        pageSize,
        tag: tag || undefined,
        month: month || undefined,
        search: debounced,
      }),
    [page, pageSize, tag, month, debounced],
  );

  const items = list.data?.items ?? [];
  const meta = list.data?.meta;

  const monthLabel = useMemo(
    () => (value: string) => {
      const [year, monthNumber] = value.split('-');
      const date = new Date(Number(year), Number(monthNumber) - 1, 1);
      return new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(date);
    },
    [],
  );

  const resetTo = (updater: () => void) => {
    updater();
    setPage(1);
  };

  return (
    <SectionShell section={section} id="journey" showTitle={Boolean(section)}>
      {showFilters ? (
        <div className="mb-8 space-y-3">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" aria-hidden="true" />
            <Input
              value={search}
              onChange={(event) => resetTo(() => setSearch(event.target.value))}
              placeholder="Search learning updates…"
              aria-label="Search learning journey"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="chip" aria-pressed={!tag && !month} onClick={() => resetTo(() => { setTag(''); setMonth(''); })}>
              All
            </button>
            {(filters.data?.tags ?? []).map((item) => (
              <button
                key={item}
                type="button"
                className="chip"
                aria-pressed={tag === item}
                onClick={() => resetTo(() => { setTag(tag === item ? '' : item); })}
              >
                #{item}
              </button>
            ))}
            {(filters.data?.months ?? []).map((item) => (
              <button
                key={item}
                type="button"
                className="chip"
                aria-pressed={month === item}
                onClick={() => resetTo(() => { setMonth(month === item ? '' : item); })}
              >
                {monthLabel(item)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {list.loading ? (
        <LoadingBlock label="Loading journey…" />
      ) : list.error ? (
        <EmptyState icon={<BookMarked className="h-5 w-5" />} title="Journey unavailable" description="Please try again shortly." />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<BookMarked className="h-5 w-5" />}
          title="No learning updates yet"
          description="Notes on what I am learning and building will be posted here."
        />
      ) : (
        <ul className="space-y-5">
          {items.map((entry) => (
            <li key={entry.id}>
              <JourneyCard entry={entry} />
            </li>
          ))}
        </ul>
      )}

      {showPagination && meta ? (
        <div className="mt-8">
          <Pagination meta={meta} onChange={setPage} />
        </div>
      ) : null}
    </SectionShell>
  );
}
