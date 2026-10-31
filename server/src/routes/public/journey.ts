import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/validate.js';
import { ApiError } from '../../lib/errors.js';
import { ok, paginated } from '../../lib/api.js';
import { pageMeta, parsePagination } from '../../lib/pagination.js';
import { loadMediaByIds } from '../../services/serializers.js';

export const publicJourneyRouter = Router();

const PUBLISHED = { state: 'PUBLISHED' as const };

publicJourneyRouter.get(
  '/journey',
  asyncHandler(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const { page, pageSize, skip, take } = parsePagination(q, 12, 60);

    const where: Prisma.JourneyEntryWhereInput = { ...PUBLISHED };
    if (q.tag) where.tags = { has: q.tag };
    if (q.search) {
      where.OR = [
        { title: { contains: q.search, mode: 'insensitive' } },
        { description: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    if (q.month) {
      const [year, month] = q.month.split('-').map(Number);
      if (year && month) {
        const start = new Date(Date.UTC(year, month - 1, 1));
        const end = new Date(Date.UTC(year, month, 1));
        where.date = { gte: start, lt: end };
      }
    }
    if (q.featured === 'true') where.featured = true;

    const [total, rows] = await Promise.all([
      prisma.journeyEntry.count({ where }),
      prisma.journeyEntry.findMany({
        where,
        orderBy: [{ date: 'desc' }, { sortOrder: 'asc' }],
        skip,
        take,
        include: { project: { select: { id: true, title: true, slug: true } } },
      }),
    ]);

    const media = await loadMediaByIds(rows.map((r) => r.coverMediaId));
    const data = rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      date: row.date,
      description: row.description,
      tags: row.tags,
      featured: row.featured,
      externalUrl: row.externalUrl,
      videoUrl: row.videoUrl,
      project: row.project,
      cover: row.coverMediaId ? media.get(row.coverMediaId) ?? null : null,
    }));

    return paginated(res, data, pageMeta(page, pageSize, total));
  }),
);

publicJourneyRouter.get(
  '/journey/filters',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.journeyEntry.findMany({
      where: PUBLISHED,
      select: { tags: true, date: true },
    });
    const tags = [...new Set(rows.flatMap((r) => r.tags))].sort();
    const months = [...new Set(rows.map((r) => r.date.toISOString().slice(0, 7)))].sort().reverse();
    return ok(res, { tags, months });
  }),
);

publicJourneyRouter.get(
  '/journey/:slug',
  asyncHandler(async (req, res) => {
    const entry = await prisma.journeyEntry.findFirst({
      where: { slug: req.params.slug, ...PUBLISHED },
      include: { project: { select: { id: true, title: true, slug: true } } },
    });
    if (!entry) throw ApiError.notFound('Journey entry not found');
    const media = await loadMediaByIds([entry.coverMediaId, entry.videoMediaId, ...entry.images]);
    return ok(res, {
      ...entry,
      cover: entry.coverMediaId ? media.get(entry.coverMediaId) ?? null : null,
      video: entry.videoMediaId ? media.get(entry.videoMediaId) ?? null : null,
      gallery: entry.images.map((id) => media.get(id)).filter(Boolean),
    });
  }),
);
