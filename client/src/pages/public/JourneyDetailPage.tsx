import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookMarked, CalendarDays, ExternalLink, FolderGit2, PlayCircle, Tag } from 'lucide-react';
import { api } from '@/lib/api';
import { useSeo } from '@/lib/seo';
import { useAsync } from '@/hooks/useAsync';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { MediaImage } from '@/components/public/MediaImage';
import { PageHeading } from '@/components/public/PageHeading';
import { StructuredData } from '@/components/public/StructuredData';
import type { JourneyDetail } from '@/types/api';

export function JourneyDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const query = useAsync<JourneyDetail>(
    () => api.get<JourneyDetail>(`/api/public/journey/${slug}`).then((r) => r.data),
    [slug],
  );
  const entry = query.data;

  useSeo(
    {
      title: entry?.title ?? 'Learning update',
      description: entry?.description || undefined,
      image: entry?.cover?.url ?? null,
      type: 'article',
    },
    [entry?.title, entry?.description, entry?.cover?.url],
  );

  if (query.loading) return <LoadingBlock label="Loading update…" />;

  if (query.error || !entry) {
    return (
      <div className="container-page py-20">
        <EmptyState
          icon={<BookMarked className="h-5 w-5" />}
          title="Update not found"
          description="This learning update may have been unpublished or the link is incorrect."
          action={
            <Link to="/journey">
              <Button variant="outline" iconLeft={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
                Back to journey
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: entry.title,
    description: entry.description || undefined,
    datePublished: entry.date,
    image: entry.cover?.url || undefined,
  };

  return (
    <article>
      <StructuredData data={structuredData} />

      <div className="relative">
        <div className="aurora-bg" aria-hidden="true" />
        <PageHeading
          eyebrow="Learning journey"
          title={entry.title}
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Journey', href: '/journey' }, { label: entry.title }]}
        />
      </div>

      <div className="container-page">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary" icon={<CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />}>
            {formatDate(entry.date)}
          </Badge>
          {entry.featured ? <Badge>Featured</Badge> : null}
        </div>

        {entry.description ? (
          <p className="mt-5 max-w-3xl text-lg" style={{ color: 'var(--muted)' }}>
            {entry.description}
          </p>
        ) : null}

        {entry.cover ? (
          <div className="mt-8">
            <MediaImage
              media={entry.cover}
              alt={entry.title}
              loading="eager"
              className="aspect-[16/9] w-full overflow-hidden rounded-2xl"
              imgClassName="h-full w-full object-cover"
            />
          </div>
        ) : null}

        {entry.video ? (
          <div className="mt-8">
            <video
              controls
              preload="metadata"
              className="w-full overflow-hidden rounded-2xl"
              src={entry.video.url}
            >
              <track kind="captions" />
            </video>
          </div>
        ) : null}

        <div className="mt-8 grid gap-10 lg:grid-cols-[2fr_1fr]">
          <div>
            {entry.contentHtml ? (
              <div className="rich-text text-base" dangerouslySetInnerHTML={{ __html: entry.contentHtml }} />
            ) : (
              <EmptyState
                icon={<BookMarked className="h-5 w-5" />}
                title="No write-up yet"
                description="This entry has no detailed notes."
              />
            )}

            {entry.gallery.length ? (
              <section className="mt-10">
                <h2 className="mb-4 text-xl font-semibold">Gallery</h2>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {entry.gallery.map((image) => (
                    <li key={image.id}>
                      <MediaImage
                        media={image}
                        alt={image.alt ?? entry.title}
                        className="aspect-[4/3] w-full overflow-hidden rounded-xl"
                        imgClassName="h-full w-full object-cover"
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="space-y-6">
            {entry.tags.length ? (
              <Card>
                <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                  Tags
                </h2>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {entry.tags.map((tag) => (
                    <li key={tag}>
                      <span className="badge inline-flex items-center gap-1">
                        <Tag className="h-3 w-3" aria-hidden="true" /> {tag}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {entry.project || entry.externalUrl || entry.videoUrl ? (
              <Card>
                <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                  Related
                </h2>
                <ul className="mt-3 space-y-3 text-sm">
                  {entry.project ? (
                    <li>
                      <Link to={`/projects/${entry.project.slug}`} className="inline-flex items-center gap-2 font-medium hover:underline">
                        <FolderGit2 className="h-4 w-4" aria-hidden="true" /> {entry.project.title}
                      </Link>
                    </li>
                  ) : null}
                  {entry.externalUrl ? (
                    <li>
                      <a href={entry.externalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:underline">
                        <ExternalLink className="h-4 w-4" aria-hidden="true" /> External link
                      </a>
                    </li>
                  ) : null}
                  {entry.videoUrl ? (
                    <li>
                      <a href={entry.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:underline">
                        <PlayCircle className="h-4 w-4" aria-hidden="true" /> Watch video
                      </a>
                    </li>
                  ) : null}
                </ul>
              </Card>
            ) : null}
          </aside>
        </div>

        <div className="mt-12">
          <Link to="/journey" className="btn btn-outline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All updates
          </Link>
        </div>
      </div>
    </article>
  );
}
