import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/validate.js';
import { paginated } from '../../lib/api.js';
import { pageMeta, parsePagination } from '../../lib/pagination.js';
import { loadMediaByIds } from '../../services/serializers.js';

export const publicSearchRouter = Router();

publicSearchRouter.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string | undefined) ?? '';
    const term = q.trim();
    const { page, pageSize, skip, take } = parsePagination(req.query as Record<string, unknown>, 10, 30);

    if (term.length < 2) {
      return paginated(res, [], pageMeta(page, pageSize, 0));
    }

    const whereCommon = {
      OR: [
        { title: { contains: term, mode: 'insensitive' as const } },
        { shortDescription: { contains: term, mode: 'insensitive' as const } },
      ],
    };

    const [projects, posts, journey, skills] = await Promise.all([
      prisma.project.findMany({
        where: { ...whereCommon, state: 'PUBLISHED', deletedAt: null },
        take: 20,
        include: { cover: true },
      }),
      prisma.blogPost.findMany({
        where: {
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { excerpt: { contains: term, mode: 'insensitive' } },
          ],
          AND: [
            {
              OR: [
                { state: 'PUBLISHED', publishedAt: null },
                { state: 'PUBLISHED', publishedAt: { lte: new Date() } },
                { state: 'SCHEDULED', scheduledFor: { lte: new Date() } },
              ],
            } as Prisma.BlogPostWhereInput,
          ],
        },
        take: 20,
        include: { cover: true },
      }),
      prisma.journeyEntry.findMany({
        where: {
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ],
          state: 'PUBLISHED',
        },
        take: 20,
        include: { cover: true },
      }),
      prisma.skill.findMany({
        where: { published: true, OR: [{ name: { contains: term, mode: 'insensitive' } }, { description: { contains: term, mode: 'insensitive' } }] },
        take: 20,
        include: { logo: true },
      }),
    ]);

    const results = [
      ...projects.map((p) => ({
        type: 'project' as const,
        id: p.id,
        title: p.title,
        slug: p.slug,
        description: p.shortDescription,
        cover: p.cover,
      })),
      ...posts.map((b) => ({
        type: 'blog' as const,
        id: b.id,
        title: b.title,
        slug: b.slug,
        description: b.excerpt,
        cover: b.cover,
      })),
      ...journey.map((j) => ({
        type: 'journey' as const,
        id: j.id,
        title: j.title,
        slug: j.slug,
        description: j.description,
        cover: j.cover,
      })),
      ...skills.map((s) => ({
        type: 'skill' as const,
        id: s.id,
        title: s.name,
        slug: s.slug,
        description: s.description,
        cover: s.logo,
      })),
    ];

    const total = results.length;
    const pageSlice = results.slice(skip, skip + take);
    const media = await loadMediaByIds(pageSlice.map((r) => r.cover?.id).filter(Boolean) as string[]);
    const data = pageSlice.map((r) => ({
      ...r,
      cover: r.cover ? media.get(r.cover.id) ?? null : null,
    }));

    return paginated(res, data, pageMeta(page, pageSize, total));
  }),
);
