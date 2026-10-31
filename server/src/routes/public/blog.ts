import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/validate.js';
import { ApiError } from '../../lib/errors.js';
import { ok, paginated } from '../../lib/api.js';
import { pageMeta, parsePagination } from '../../lib/pagination.js';
import { loadMediaByIds } from '../../services/serializers.js';

export const publicBlogRouter = Router();

/**
 * A post is publicly visible when it is PUBLISHED and either has no publish
 * date or the date has passed. SCHEDULED posts automatically become visible
 * once `publishedAt`/`scheduledFor` is reached.
 */
function publishedWhere(): Prisma.BlogPostWhereInput {
  const now = new Date();
  return {
    OR: [
      { state: 'PUBLISHED', publishedAt: null },
      { state: 'PUBLISHED', publishedAt: { lte: now } },
      { state: 'SCHEDULED', scheduledFor: { lte: now } },
    ],
  };
}

publicBlogRouter.get(
  '/blog',
  asyncHandler(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const { page, pageSize, skip, take } = parsePagination(q, 9, 50);

    const where: Prisma.BlogPostWhereInput = { AND: [publishedWhere()] };
    if (q.tag) where.AND = [...(where.AND as Prisma.BlogPostWhereInput[]), { tags: { some: { slug: q.tag } } }];
    if (q.category) where.AND = [...(where.AND as Prisma.BlogPostWhereInput[]), { category: q.category }];
    if (q.search) {
      where.AND = [
        ...(where.AND as Prisma.BlogPostWhereInput[]),
        {
          OR: [
            { title: { contains: q.search, mode: 'insensitive' } },
            { excerpt: { contains: q.search, mode: 'insensitive' } },
            { contentMd: { contains: q.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.blogPost.count({ where }),
      prisma.blogPost.findMany({
        where,
        orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
        include: { tags: true },
      }),
    ]);

    const media = await loadMediaByIds(rows.map((r) => r.coverMediaId));
    const data = rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      category: row.category,
      readingMinutes: row.readingMinutes,
      publishedAt: row.publishedAt,
      featured: row.featured,
      tags: row.tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
      cover: row.coverMediaId ? media.get(row.coverMediaId) ?? null : null,
    }));

    return paginated(res, data, pageMeta(page, pageSize, total));
  }),
);

publicBlogRouter.get(
  '/blog/filters',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.blogPost.findMany({
      where: publishedWhere(),
      select: { category: true, tags: { select: { id: true, name: true, slug: true } } },
    });
    const categories = [...new Set(rows.map((r) => r.category).filter(Boolean))].sort();
    const tagMap = new Map<string, { id: string; name: string; slug: string }>();
    for (const row of rows) {
      for (const tag of row.tags) tagMap.set(tag.id, tag);
    }
    return ok(res, { categories, tags: [...tagMap.values()].sort((a, b) => a.name.localeCompare(b.name)) });
  }),
);

publicBlogRouter.get(
  '/blog/:slug',
  asyncHandler(async (req, res) => {
    const post = await prisma.blogPost.findFirst({
      where: { slug: req.params.slug, AND: [publishedWhere()] },
      include: {
        tags: true,
        project: { select: { id: true, title: true, slug: true } },
      },
    });
    if (!post) throw ApiError.notFound('Blog post not found');

    // viewCount increments only for genuinely published posts (also recorded as
    // an analytics event by the client beacon / this counter).
    await prisma.blogPost
      .update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => undefined);

    const media = await loadMediaByIds([post.coverMediaId]);
    const related = await prisma.blogPost.findMany({
      where: {
        id: { not: post.id },
        AND: [publishedWhere()],
        ...(post.category ? { category: post.category } : {}),
      },
      take: 3,
      orderBy: { publishedAt: 'desc' },
      include: { tags: true },
    });
    const relatedMedia = await loadMediaByIds(related.map((r) => r.coverMediaId));

    return ok(res, {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      contentHtml: post.contentHtml,
      category: post.category,
      readingMinutes: post.readingMinutes,
      publishedAt: post.publishedAt ?? post.scheduledFor,
      featured: post.featured,
      viewCount: post.viewCount + 1,
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      tags: post.tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
      project: post.project,
      cover: post.coverMediaId ? media.get(post.coverMediaId) ?? null : null,
      related: related.map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        excerpt: r.excerpt,
        publishedAt: r.publishedAt,
        readingMinutes: r.readingMinutes,
        tags: r.tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
        cover: r.coverMediaId ? relatedMedia.get(r.coverMediaId) ?? null : null,
      })),
    });
  }),
);
