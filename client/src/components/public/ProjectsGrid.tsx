import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Search, SlidersHorizontal } from 'lucide-react';
import { SectionShell } from './SectionShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Field';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { MediaImage } from './MediaImage';
import { api, type PageMeta } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDateRange } from '@/lib/utils';
import type { PageSection, ProjectSummary, ProjectStatus } from '@/types/api';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  CONCEPT: 'Concept',
  IN_PROGRESS: 'In progress',
  PROTOTYPE: 'Prototype',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Card as="article" interactive className="flex h-full flex-col overflow-hidden p-0">
      <Link to={`/projects/${project.slug}`} className="group block">
        <MediaImage
          media={project.cover}
          alt={project.title}
          className="aspect-[16/10] w-full overflow-hidden"
          imgClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {project.category ? <Badge variant="primary">{project.category}</Badge> : null}
          <Badge variant={project.status === 'COMPLETED' ? 'success' : 'info'}>{STATUS_LABELS[project.status]}</Badge>
          {project.featured ? <Badge>Featured</Badge> : null}
        </div>
        <h3 className="text-lg font-semibold">
          <Link to={`/projects/${project.slug}`} className="hover:underline">
            {project.title}
          </Link>
        </h3>
        {project.shortDescription ? (
          <p className="mt-2 flex-1 text-sm" style={{ color: 'var(--muted)' }}>
            {project.shortDescription}
          </p>
        ) : (
          <div className="flex-1" />
        )}

        {project.technologies.length ? (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {project.technologies.slice(0, 5).map((tech) => (
              <li key={tech.id}>
                <span className="badge">{tech.name}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {project.startDate || project.endDate ? (
          <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
            {formatDateRange(project.startDate, project.endDate, !project.endDate)}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

interface ProjectsGridProps {
  section?: PageSection;
  limit?: number;
  featuredOnly?: boolean;
  showFilters?: boolean;
  showPagination?: boolean;
}

export function ProjectsGrid({ section, limit, featuredOnly = false, showFilters = true, showPagination = true }: ProjectsGridProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [technology, setTechnology] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search, 250);
  const pageSize = limit ?? 12;

  const filters = useAsync<{ categories: string[]; technologies: Array<{ id: string; name: string; slug: string }> }>(
    () => api.get<{ categories: string[]; technologies: Array<{ id: string; name: string; slug: string }> }>('/api/public/projects/filters').then((r) => r.data),
    [],
  );

  const list = useAsync<{ items: ProjectSummary[]; meta: PageMeta }>(
    () =>
      api.getList<ProjectSummary>('/api/public/projects', {
        page,
        pageSize,
        search: debounced,
        category: category || undefined,
        technology: technology || undefined,
        status: status || undefined,
        featured: featuredOnly ? 'true' : undefined,
      }),
    [page, pageSize, debounced, category, technology, status, featuredOnly],
  );

  const items = list.data?.items ?? [];
  const meta = list.data?.meta;

  const statusOptions = useMemo(
    () => Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
    [],
  );

  const resetTo = (updater: () => void) => {
    updater();
    setPage(1);
  };

  return (
    <SectionShell section={section} id="projects">
      {showFilters ? (
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" aria-hidden="true" />
            <Input
              value={search}
              onChange={(event) => resetTo(() => setSearch(event.target.value))}
              placeholder="Search projects…"
              aria-label="Search projects"
              className="pl-9"
            />
          </div>
          <Select
            aria-label="Filter by category"
            placeholder="All categories"
            value={category}
            onChange={(event) => resetTo(() => setCategory(event.target.value))}
            options={(filters.data?.categories ?? []).map((value) => ({ value, label: value }))}
          />
          <Select
            aria-label="Filter by technology"
            placeholder="All technologies"
            value={technology}
            onChange={(event) => resetTo(() => setTechnology(event.target.value))}
            options={(filters.data?.technologies ?? []).map((tech) => ({ value: tech.slug, label: tech.name }))}
          />
          <Select
            aria-label="Filter by status"
            placeholder="Any status"
            value={status}
            onChange={(event) => resetTo(() => setStatus(event.target.value))}
            options={statusOptions}
          />
        </div>
      ) : null}

      {list.loading ? (
        <LoadingBlock label="Loading projects…" />
      ) : list.error ? (
        <EmptyState icon={<FolderKanban className="h-5 w-5" />} title="Projects unavailable" description="Please try again shortly." />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<SlidersHorizontal className="h-5 w-5" />}
          title="No projects found"
          description="Try adjusting the filters, or check back soon."
        />
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
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
