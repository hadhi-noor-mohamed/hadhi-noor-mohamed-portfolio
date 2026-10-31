import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/validate.js';
import { ok, paginated } from '../../lib/api.js';
import { ApiError } from '../../lib/errors.js';
import { pageMeta, parsePagination, safeOrderBy } from '../../lib/pagination.js';
import { loadMediaByIds, toMediaDTO } from '../../services/serializers.js';

export const publicProjectsRouter = Router();

const PUBLISHED = { state: 'PUBLISHED' as const, deletedAt: null };

publicProjectsRouter.get(
  '/projects',
  asyncHandler(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const { page, pageSize, skip, take } = parsePagination(q, 12, 60);

    const where: Prisma.ProjectWhereInput = { ...PUBLISHED };
    if (q.search) {
      where.OR = [
        { title: { contains: q.search, mode: 'insensitive' } },
        { shortDescription: { contains: q.search, mode: 'insensitive' } },
        { overview: { contains: q.search, mode: 'insensitive' } },
        { skills: { some: { name: { contains: q.search, mode: 'insensitive' } } } },
      ];
    }
    if (q.category) where.category = q.category;
    if (q.status) where.status = q.status as Prisma.ProjectWhereInput['status'];
    if (q.featured === 'true') where.featured = true;
    if (q.technology) {
      where.skills = { some: { slug: q.technology } };
    }

    const orderBy = safeOrderBy(
      q.sort,
      q.dir,
      ['sortOrder', 'createdAt', 'updatedAt', 'title', 'startDate'] as const,
      'sortOrder',
    );
    const finalOrder = q.sort
      ? [orderBy] as Prisma.ProjectOrderByWithRelationInput[]
      : ([{ featured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }] as Prisma.ProjectOrderByWithRelationInput[]);

    const [total, rows] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        orderBy: finalOrder,
        skip,
        take,
        include: { skills: { select: { id: true, name: true, slug: true } } },
      }),
    ]);

    const media = await loadMediaByIds(rows.map((r) => r.coverMediaId));
    const data = rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      shortDescription: row.shortDescription,
      category: row.category,
      status: row.status,
      role: row.role,
      featured: row.featured,
      startDate: row.startDate,
      endDate: row.endDate,
      technologies: row.skills,
      cover: row.coverMediaId ? media.get(row.coverMediaId) ?? null : null,
    }));

    return paginated(res, data, pageMeta(page, pageSize, total));
  }),
);

/** Distinct categories and technologies, for the public filter controls. */
publicProjectsRouter.get(
  '/projects/filters',
  asyncHandler(async (_req, res) => {
    const [categories, technologies] = await Promise.all([
      prisma.project.findMany({
        where: { ...PUBLISHED, category: { not: '' } },
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      }),
      prisma.skill.findMany({
        where: { projects: { some: { ...PUBLISHED } } },
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    return ok(res, {
      categories: categories.map((c) => c.category).filter(Boolean),
      technologies,
    });
  }),
);

publicProjectsRouter.get(
  '/projects/:slug',
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findFirst({
      where: { slug: req.params.slug, ...PUBLISHED },
      include: {
        skills: { select: { id: true, name: true, slug: true, icon: true } },
        images: { include: { media: true }, orderBy: { sortOrder: 'asc' } },
        docs: { include: { media: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!project) throw ApiError.notFound('Project not found');

    const [cover, report] = await Promise.all([
      toMediaDTO(project.coverMediaId ? await prisma.mediaAsset.findUnique({ where: { id: project.coverMediaId } }) : null),
      toMediaDTO(project.reportMediaId ? await prisma.mediaAsset.findUnique({ where: { id: project.reportMediaId } }) : null),
    ]);

    const [relatedPosts, relatedJourney, relatedProjects] = await Promise.all([
      prisma.blogPost.findMany({
        where: { projectId: project.id, state: 'PUBLISHED' },
        select: { id: true, title: true, slug: true, excerpt: true, publishedAt: true },
        orderBy: { publishedAt: 'desc' },
        take: 6,
      }),
      prisma.journeyEntry.findMany({
        where: { projectId: project.id, state: 'PUBLISHED' },
        select: { id: true, title: true, slug: true, date: true },
        orderBy: { date: 'desc' },
        take: 6,
      }),
      prisma.project.findMany({
        where: {
          ...PUBLISHED,
          id: { not: project.id },
          OR: [
            ...(project.category ? [{ category: project.category }] : []),
            { skills: { some: { id: { in: project.skills.map((s) => s.id) } } } },
          ],
        },
        take: 3,
        include: { skills: { select: { id: true, name: true, slug: true } } },
      }),
    ]);

    const relatedMedia = await loadMediaByIds(relatedProjects.map((p) => p.coverMediaId));

    const { coverMediaId: _c, reportMediaId: _r, deletedAt: _d, ...rest } = project;

    return ok(res, {
      ...rest,
      cover,
      report,
      gallery: await Promise.all(
        project.images.map(async (img) => ({
          id: img.id,
          caption: img.caption,
          alt: img.alt || img.media.alt,
          media: await toMediaDTO(img.media),
        })),
      ),
      documents: await Promise.all(
        project.docs.map(async (doc) => ({
          id: doc.id,
          label: doc.label || doc.media.displayLabel,
          media: await toMediaDTO(doc.media),
        })),
      ),
      relatedPosts,
      relatedJourney,
      relatedProjects: relatedProjects.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        shortDescription: p.shortDescription,
        status: p.status,
        technologies: p.skills,
        cover: p.coverMediaId ? relatedMedia.get(p.coverMediaId) ?? null : null,
      })),
    });
  }),
);
