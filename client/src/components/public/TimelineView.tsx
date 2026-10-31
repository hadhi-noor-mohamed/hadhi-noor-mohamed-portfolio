import { useMemo } from 'react';
import { Award, Briefcase, CalendarDays, GraduationCap, HeartHandshake, Presentation, Sparkles } from 'lucide-react';
import { SectionShell } from './SectionShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { MediaImage } from './MediaImage';
import { api } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { formatDateRange } from '@/lib/utils';
import type { PageSection, TimelineEntry, TimelineType } from '@/types/api';

const TYPE_META: Record<TimelineType, { label: string; Icon: typeof Briefcase }> = {
  EDUCATION: { label: 'Education', Icon: GraduationCap },
  INTERNSHIP: { label: 'Internship', Icon: Briefcase },
  WORK: { label: 'Work', Icon: Briefcase },
  TRAINING: { label: 'Training', Icon: Presentation },
  WORKSHOP: { label: 'Workshop', Icon: Sparkles },
  VOLUNTEER: { label: 'Volunteer', Icon: HeartHandshake },
  CERTIFICATION: { label: 'Certification', Icon: Award },
};

interface TimelineViewProps {
  section?: PageSection;
  /** Only show the given types; omit to show everything. */
  types?: TimelineType[];
  /** Hide the entry-type badge (useful on the single-type pages). */
  showType?: boolean;
  id?: string;
}

function TimelineEntryCard({ entry, showType }: { entry: TimelineEntry; showType: boolean }) {
  const meta = TYPE_META[entry.type];
  const Icon = meta.Icon;
  const dateLabel = formatDateRange(entry.startDate, entry.endDate, entry.current);

  return (
    <li className="relative pl-12 sm:pl-16">
      <span
        className="absolute left-0 top-1 flex h-9 w-9 items-center justify-center rounded-full border sm:h-11 sm:w-11"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-strong)' }}
        aria-hidden="true"
      >
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </span>

      <Card elevated className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {showType ? <Badge variant="primary">{meta.label}</Badge> : null}
              {entry.current ? <Badge variant="success">Current</Badge> : null}
            </div>
            <h3 className="mt-2 text-lg font-semibold">{entry.role || entry.organization}</h3>
            {entry.role && entry.organization ? (
              <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
                {entry.organization}
              </p>
            ) : null}
          </div>
          {entry.logo ? (
            <MediaImage media={entry.logo} alt={entry.organization} className="h-12 w-12 shrink-0 overflow-hidden rounded-lg" imgClassName="h-full w-full object-contain" />
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--muted)' }}>
          {dateLabel ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> {dateLabel}
            </span>
          ) : null}
          {entry.location ? <span>{entry.location}</span> : null}
          {entry.grade ? <span>{entry.grade}</span> : null}
          {entry.hours ? <span>{entry.hours}</span> : null}
        </div>

        {entry.field || entry.specialization ? (
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
            {[entry.field, entry.specialization].filter(Boolean).join(' · ')}
          </p>
        ) : null}

        {entry.description.length ? (
          <ul className="mt-3 space-y-1.5 text-sm">
            {entry.description.map((line, index) => (
              <li key={index} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: 'var(--brand-primary)' }} />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {entry.technologies.length ? (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {entry.technologies.map((tech) => (
              <li key={tech}>
                <span className="badge">{tech}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {entry.url ? (
          <a href={entry.url} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm hover:underline">
            Learn more →
          </a>
        ) : null}
      </Card>
    </li>
  );
}

/** Vertical timeline of education, work and training entries. */
export function TimelineView({ section, types, showType = true, id = 'timeline' }: TimelineViewProps) {
  const query = useAsync<TimelineEntry[]>(() => api.get<TimelineEntry[]>('/api/public/timeline').then((r) => r.data), []);

  const entries = useMemo(() => {
    const rows = query.data ?? [];
    return types ? rows.filter((row) => types.includes(row.type)) : rows;
  }, [query.data, types]);

  return (
    <SectionShell section={section} id={id}>
      {query.loading ? (
        <LoadingBlock label="Loading timeline…" />
      ) : query.error ? (
        <EmptyState icon={<CalendarDays className="h-5 w-5" />} title="Timeline unavailable" description="Please try again shortly." />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-5 w-5" />}
          title="Nothing here yet"
          description="Timeline entries will appear here once they are added."
        />
      ) : (
        <ol className="relative">
          <span
            className="absolute left-[18px] top-2 bottom-2 w-px sm:left-[22px]"
            style={{ backgroundColor: 'var(--border)' }}
            aria-hidden="true"
          />
          {entries.map((entry) => (
            <TimelineEntryCard key={entry.id} entry={entry} showType={showType} />
          ))}
        </ol>
      )}
    </SectionShell>
  );
}
