import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock, Eye, FolderGit2, PenLine } from 'lucide-react';
import { api } from '@/lib/api';
import { useSeo } from '@/lib/seo';
import { useAsync } from '@/hooks/useAsync';
import { trackAnalytics } from '@/hooks/useAnalytics';
import { formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingBlock } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { MediaImage } from '@/components/public/MediaImage';
import { PageHeading } from '@/components/public/PageHeading';
import { StructuredData } from '@/components/public/StructuredData';
import { BlogCard } from '@/components/public/BlogGrid';
import type { BlogDetail } from '@/types/api';

export function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const query = useAsync<BlogDetail>(
    () => api.get<BlogDetail>(`/api/public/blog/${slug}`).then((r) => r.data),
    [slug],
  );
  const post = query.data;

  useEffect(() => {
    if (post) trackAnalytics('BLOG_VIEW', { blogPostId: post.id, label: post.title });
    // Track a view once per article id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id]);

  useSeo(
    {
      title: post?.seoTitle || post?.title || 'Article',
      exact: Boolean(post?.seoTitle),
      description: post?.seoDescription || post?.excerpt || undefined,
      image: post?.cover?.url ?? null,
      type: 'article',
    },
    [post?.seoTitle, post?.title, post?.excerpt, post?.cover?.url],
  );

  if (query.loading) return <LoadingBlock label="Loading article…" />;

  if (query.error || !post) {
    return (
      <div className="container-page py-20">
        <EmptyState
          icon={<PenLine className="h-5 w-5" />}
          title="Article not found"
          description="This article may be unpublished or the link is incorrect."
          action={
            <Link to="/blog">
              <Button variant="outline" iconLeft={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
                Back to blog
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
    headline: post.title,
    description: post.seoDescription || post.excerpt || undefined,
    datePublished: post.publishedAt ?? undefined,
    image: post.cover?.url || undefined,
    articleSection: post.category || undefined,
    keywords: post.tags.map((tag) => tag.name).join(', ') || undefined,
  };

  return (
    <article>
      <StructuredData data={structuredData} />

      <div className="relative">
        <div className="aurora-bg" aria-hidden="true" />
        <PageHeading
          eyebrow={post.category || 'Article'}
          title={post.title}
          description={post.excerpt}
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog' }, { label: post.title }]}
        />
      </div>

      <div className="container-page">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm" style={{ color: 'var(--muted)' }}>
          {post.publishedAt ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" aria-hidden="true" /> {formatDate(post.publishedAt)}
            </span>
          ) : null}
          {post.readingMinutes ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" aria-hidden="true" /> {post.readingMinutes} min read
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-4 w-4" aria-hidden="true" /> {post.viewCount.toLocaleString()} views
          </span>
        </div>

        {post.cover ? (
          <div className="mt-8">
            <MediaImage
              media={post.cover}
              alt={post.title}
              loading="eager"
              className="aspect-[16/9] w-full overflow-hidden rounded-2xl"
              imgClassName="h-full w-full object-cover"
            />
          </div>
        ) : null}

        {post.tags.length ? (
          <ul className="mt-6 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <li key={tag.id}>
                <Link to={`/blog?tag=${encodeURIComponent(tag.slug)}`} className="badge hover:underline">
                  #{tag.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-2 grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="max-w-3xl">
            {post.contentHtml ? (
              <div className="rich-text text-base" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
            ) : (
              <EmptyState icon={<PenLine className="h-5 w-5" />} title="No content yet" description="This post has no body content." />
            )}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {post.project ? (
              <Card>
                <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                  Project
                </h2>
                <Link
                  to={`/projects/${post.project.slug}`}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium hover:underline"
                >
                  <FolderGit2 className="h-4 w-4" aria-hidden="true" /> {post.project.title}
                </Link>
              </Card>
            ) : null}
          </aside>
        </div>

        {post.related.length ? (
          <section className="mt-14">
            <h2 className="mb-6 text-2xl font-semibold">Related articles</h2>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {post.related.map((related) => (
                <li key={related.id}>
                  <BlogCard post={related} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-12">
          <Link to="/blog" className="btn btn-outline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All articles
          </Link>
        </div>
      </div>
    </article>
  );
}
