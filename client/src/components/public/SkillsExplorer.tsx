import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Sparkles } from 'lucide-react';
import { SectionShell } from './SectionShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Field';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { DynamicIcon } from '@/components/ui/Icon';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import type { PageSection, Skill, SkillCategory } from '@/types/api';

interface SkillsExplorerProps {
  section?: PageSection;
  /** Cap the number of skills shown when used on the home page. */
  limit?: number;
  showFilters?: boolean;
  showSearch?: boolean;
}

/**
 * Filterable skills explorer. Skills and categories are read from the public
 * API so admin edits appear immediately. Proficiency labels are shown verbatim
 * (no invented percentages unless the owner supplied one).
 */
export function SkillsExplorer({ section, limit, showFilters = true, showSearch = true }: SkillsExplorerProps) {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 250);

  const skills = useAsync<Skill[]>(() => api.get<Skill[]>('/api/public/skills').then((r) => r.data), []);
  const categories = useAsync<SkillCategory[]>(
    () => api.get<SkillCategory[]>('/api/public/skill-categories').then((r) => r.data),
    [],
  );

  const filtered = useMemo(() => {
    let rows = skills.data ?? [];
    if (category !== 'all') rows = rows.filter((skill) => skill.category?.slug === category);
    const term = debounced.trim().toLowerCase();
    if (term) {
      rows = rows.filter(
        (skill) =>
          skill.name.toLowerCase().includes(term) ||
          skill.description.toLowerCase().includes(term) ||
          (skill.category?.name ?? '').toLowerCase().includes(term),
      );
    }
    return rows;
  }, [skills.data, category, debounced]);

  const visible = limit ? filtered.slice(0, limit) : filtered;
  const categoryList = categories.data ?? [];

  return (
    <SectionShell section={section} id="skills">
      {showFilters || showSearch ? (
        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {showFilters && categoryList.length ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="chip"
                aria-pressed={category === 'all'}
                onClick={() => setCategory('all')}
              >
                All
              </button>
              {categoryList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="chip"
                  aria-pressed={category === item.slug}
                  onClick={() => setCategory(item.slug)}
                >
                  <DynamicIcon name={item.icon} className="h-3.5 w-3.5" />
                  {item.name}
                </button>
              ))}
            </div>
          ) : null}

          {showSearch ? (
            <div className="relative lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" aria-hidden="true" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search skills…"
                aria-label="Search skills"
                className="pl-9"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {skills.loading ? (
        <LoadingBlock label="Loading skills…" />
      ) : skills.error ? (
        <EmptyState icon={<Sparkles className="h-5 w-5" />} title="Skills unavailable" description="Please try again shortly." />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-5 w-5" />}
          title="No skills found"
          description={search ? 'Try a different search term or clear the filters.' : 'Skills will appear here once they are published.'}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((skill) => (
            <li key={skill.id}>
              <Card interactive className="flex h-full flex-col p-4">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 14%, transparent)' }}
                    aria-hidden="true"
                  >
                    <DynamicIcon name={skill.icon} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{skill.name}</h3>
                    {skill.category ? (
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>
                        {skill.category.name}
                      </p>
                    ) : null}
                  </div>
                  {skill.featured ? (
                    <Badge variant="primary" className="shrink-0">
                      Featured
                    </Badge>
                  ) : null}
                </div>

                {skill.description ? (
                  <p className="mt-3 flex-1 text-sm" style={{ color: 'var(--muted)' }}>
                    {skill.description}
                  </p>
                ) : (
                  <div className="flex-1" />
                )}

                <div className="mt-4 space-y-2">
                  {typeof skill.proficiencyPercent === 'number' ? (
                    <ProgressBar value={skill.proficiencyPercent} label={skill.proficiencyLabel || 'Proficiency'} showValue />
                  ) : skill.proficiencyLabel ? (
                    <Badge>{skill.proficiencyLabel}</Badge>
                  ) : null}

                  {skill.relatedProjects?.length ? (
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      Used in{' '}
                      {skill.relatedProjects.map((project, index) => (
                        <span key={project.id}>
                          {index > 0 ? ', ' : ''}
                          <Link to={`/projects/${project.slug}`} className="hover:underline">
                            {project.title}
                          </Link>
                        </span>
                      ))}
                    </p>
                  ) : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {limit && filtered.length > limit ? (
        <div className="mt-8">
          <Link to="/skills" className={cn('btn btn-outline')}>
            View all {filtered.length} skills
          </Link>
        </div>
      ) : null}
    </SectionShell>
  );
}
