import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  FileText,
  Github,
  Layers,
  Link as LinkIcon,
  PlayCircle,
  Target,
  Users,
} from 'lucide-react';
import { useSite } from '@/context/SiteContext';
import { useSeo } from '@/lib/seo';
import { api } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import { trackAnalytics } from '@/hooks/useAnalytics';
import { formatDateRange } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { MediaImage } from '@/components/public/MediaImage';
import { ProjectCard } from '@/components/public/ProjectsGrid';
import { PageHeading } from '@/components/public/PageHeading';
import { StructuredData } from '@/components/public/StructuredData';
import type { ProjectDetail } from '@/types/api';

const STATUS_LABELS: Record<string, string> = {
  CONCEPT: 'Concept',
  IN_PROGRESS: 'In progress',
  PROTOTYPE: 'Prototype',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

function RichBlock({ title, html }: { title: string; html: string }) {
  if (!html) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xl font-semibold">{title}</h2>
      <div className="rich-text text-base" dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}

function StringList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xl font-semibold">{title}</h2>
      <ul className="space-y-2 text-sm">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2.5">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: 'var(--brand-primary)' }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { profile } = useSite();

  const query = useAsync<ProjectDetail>(
    () => api.get<ProjectDetail>(`/api/public/projects/${slug}`).then((r) => r.data),
    [slug],
  );
  const project = query.data;

  useEffect(() => {
    if (project) trackAnalytics('PROJECT_VIEW', { projectId: project.id, label: project.title });
    // Track a view once per project id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  useSeo(
    {
      title: project?.seoTitle || project?.title || 'Project',
      exact: Boolean(project?.seoTitle),
      description: project?.seoDescription || project?.shortDescription || undefined,
      image: project?.cover?.url ?? null,
      type: 'article',
    },
    [project?.seoTitle, project?.title, project?.cover?.url],
  );

  if (query.loading) return <LoadingBlock label="Loading project…" />;

  if (query.error || !project) {
    return (
      <div className="container-page py-20">
        <EmptyState
          icon={<Layers className="h-5 w-5" />}
          title="Project not found"
          description="This project may have been unpublished or the link is incorrect."
          action={
            <Link to="/projects">
              <Button variant="outline" iconLeft={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
                Back to projects
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const links = [
    project.githubUrl ? { href: project.githubUrl, label: 'Source code', Icon: Github } : null,
    project.liveDemoUrl ? { href: project.liveDemoUrl, label: 'Live demo', Icon: LinkIcon } : null,
    project.demoVideoUrl ? { href: project.demoVideoUrl, label: 'Demo video', Icon: PlayCircle } : null,
  ].filter(Boolean) as Array<{ href: string; label: string; Icon: typeof Github }>;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: project.title,
    description: project.seoDescription || project.shortDescription,
    codeRepository: project.githubUrl || undefined,
    programmingLanguage: project.technologies.map((t) => t.name).join(', ') || undefined,
    author: { '@type': 'Person', name: profile?.fullName ?? 'Hadhi Noor Mohamed H' },
    dateCreated: project.startDate ?? undefined,
  };

  return (
    <article>
      <StructuredData data={structuredData} />

      <div className="relative">
        <div className="aurora-bg" aria-hidden="true" />
        <PageHeading
          eyebrow={project.category || 'Project'}
          title={project.title}
          description={project.shortDescription}
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Projects', href: '/projects' }, { label: project.title }]}
        />
      </div>

      <div className="container-page">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Badge variant={project.status === 'COMPLETED' ? 'success' : 'info'}>{STATUS_LABELS[project.status] ?? project.status}</Badge>
          {project.role ? <Badge variant="primary">{project.role}</Badge> : null}
          {project.featured ? <Badge>Featured</Badge> : null}
        </div>

        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          {project.startDate || project.endDate ? (
            <div className="flex items-start gap-2.5">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
              <div>
                <dt className="font-medium">Timeline</dt>
                <dd style={{ color: 'var(--muted)' }}>{formatDateRange(project.startDate, project.endDate, !project.endDate)}</dd>
              </div>
            </div>
          ) : null}
          {project.teamInfo ? (
            <div className="flex items-start gap-2.5">
              <Users className="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
              <div>
                <dt className="font-medium">Team</dt>
                <dd style={{ color: 'var(--muted)' }}>{project.teamInfo}</dd>
              </div>
            </div>
          ) : null}
          {project.category ? (
            <div className="flex items-start gap-2.5">
              <Target className="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
              <div>
                <dt className="font-medium">Category</dt>
                <dd style={{ color: 'var(--muted)' }}>{project.category}</dd>
              </div>
            </div>
          ) : null}
        </dl>

        {links.length ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {links.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline btn-sm"
                onClick={() => trackAnalytics('PROJECT_LINK_CLICK', { projectId: project.id, label })}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
                <ExternalLink className="h-3 w-3 opacity-60" aria-hidden="true" />
              </a>
            ))}
          </div>
        ) : null}

        <div className="mt-8">
          <MediaImage
            media={project.cover}
            alt={project.title}
            loading="eager"
            className="aspect-[16/9] w-full overflow-hidden rounded-2xl"
            imgClassName="h-full w-full object-cover"
          />
        </div>

        {project.technologies.length ? (
          <ul className="mt-8 flex flex-wrap gap-2">
            {project.technologies.map((tech) => (
              <li key={tech.id}>
                <span className="badge badge-primary">{tech.name}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4 grid gap-10 lg:grid-cols-[2fr_1fr]">
          <div>
            <RichBlock title="Overview" html={project.overview} />
            <RichBlock title="The problem" html={project.problemStatement} />
            <RichBlock title="Approach" html={project.approach} />
            <RichBlock title="Solution" html={project.solution} />
            <RichBlock title="Outcome" html={project.outcome} />
            <StringList title="Key features" items={project.keyFeatures} />
            <StringList title="Challenges" items={project.challenges} />
            <StringList title="What I learned" items={project.learnings} />

            {project.gallery.length ? (
              <section className="mt-10">
                <h2 className="mb-4 text-xl font-semibold">Gallery</h2>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {project.gallery.map((image) => (
                    <li key={image.id}>
                      <figure>
                        <MediaImage
                          media={image.media}
                          alt={image.alt}
                          className="aspect-[4/3] w-full overflow-hidden rounded-xl"
                          imgClassName="h-full w-full object-cover"
                        />
                        {image.caption ? (
                          <figcaption className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
                            {image.caption}
                          </figcaption>
                        ) : null}
                      </figure>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="space-y-6">
            {project.documents.length ? (
              <Card>
                <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                  Documents
                </h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {project.documents.map((doc) => (
                    <li key={doc.id}>
                      {doc.media ? (
                        <a href={doc.media.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:underline">
                          <FileText className="h-4 w-4" aria-hidden="true" /> {doc.label}
                        </a>
                      ) : (
                        <span>{doc.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {project.report ? (
              <Card>
                <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                  Full report
                </h2>
                <a href={project.report.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm hover:underline">
                  <FileText className="h-4 w-4" aria-hidden="true" /> {project.report.displayLabel}
                </a>
              </Card>
            ) : null}

            {project.relatedPosts.length ? (
              <Card>
                <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                  Related writing
                </h2>
                <ul className="mt-3 space-y-3 text-sm">
                  {project.relatedPosts.map((post) => (
                    <li key={post.id}>
                      <Link to={`/blog/${post.slug}`} className="font-medium hover:underline">
                        {post.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {project.relatedJourney.length ? (
              <Card>
                <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                  Learning journey
                </h2>
                <ul className="mt-3 space-y-3 text-sm">
                  {project.relatedJourney.map((entry) => (
                    <li key={entry.id}>
                      <Link to={`/journey/${entry.slug}`} className="font-medium hover:underline">
                        {entry.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </aside>
        </div>

        {project.relatedProjects.length ? (
          <section className="mt-14">
            <h2 className="mb-6 text-2xl font-semibold">More projects</h2>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {project.relatedProjects.map((related) => (
                <li key={related.id}>
                  <ProjectCard project={related} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-12">
          <Link to="/projects" className="btn btn-outline" >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All projects
          </Link>
        </div>
      </div>
    </article>
  );
}
