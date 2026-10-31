import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { asyncHandler, validate } from '../../lib/validate.js';
import { created, noContent, ok } from '../../lib/api.js';
import { ApiError } from '../../lib/errors.js';
import { uniqueSlug } from '../../lib/slug.js';
import { renderMarkdown, stripHtml } from '../../lib/sanitize.js';
import { writeAudit } from '../../services/audit.js';
import { mountReorder } from './crud.js';

export const adminJourneyRouter = Router();

const journeySchema = z.object({
  title: z.string().min(1).max(220),
  slug: z.string().max(220).optional(),
  date: z
    .union([z.string(), z.date()])
    .transform((v) => (v instanceof Date ? v : new Date(v))),
  description: z.string().max(600).default(''),
  contentMd: z.string().default(''),
  coverMediaId: z.string().cuid().nullable().optional(),
  videoUrl: z.string().max(500).default(''),
  videoMediaId: z.string().cuid().nullable().optional(),
  images: z.array(z.string().cuid()).default([]),
  tags: z.array(z.string()).default([]),
  projectId: z.string().cuid().nullable().optional(),
  externalUrl: z.string().max(500).default(''),
  state: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'SCHEDULED']).default('DRAFT'),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

function journeyData(b: z.infer<typeof journeySchema>) {
  return {
    title: b.title,
    date: b.date,
    description: stripHtml(b.description).slice(0, 500),
    contentHtml: b.contentMd ? renderMarkdown(b.contentMd) : '',
    coverMediaId: b.coverMediaId ?? null,
    videoUrl: b.videoUrl,
    videoMediaId: b.videoMediaId ?? null,
    images: b.images.filter(Boolean),
    tags: b.tags.map((t) => t.trim()).filter(Boolean),
    projectId: b.projectId ?? null,
    externalUrl: b.externalUrl,
    state: b.state,
    featured: b.featured,
    sortOrder: b.sortOrder,
  };
}

const include = { cover: true, video: true, project: { select: { id: true, title: true, slug: true } } } as const;

adminJourneyRouter.get(
  '/journey',
  asyncHandler(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const rows = await prisma.journeyEntry.findMany({
      where: {
        ...(q.search ? { title: { contains: q.search, mode: 'insensitive' } } : {}),
        ...(q.state ? { state: q.state as 'DRAFT' } : {}),
      },
      orderBy: [{ date: 'desc' }, { sortOrder: 'asc' }],
      include,
      take: 300,
    });
    return ok(res, rows);
  }),
);

adminJourneyRouter.get(
  '/journey/:id',
  asyncHandler(async (req, res) => {
    const entry = await prisma.journeyEntry.findUnique({ where: { id: req.params.id }, include });
    if (!entry) throw ApiError.notFound('Journey entry not found');
    return ok(res, entry);
  }),
);

adminJourneyRouter.post(
  '/journey',
  validate(journeySchema),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const slug = await uniqueSlug('journeyEntry', b.slug || b.title);
    const entry = await prisma.journeyEntry.create({ data: { ...journeyData(b), slug }, include });
    await writeAudit(req, 'create', 'journeyEntry', entry.id);
    return created(res, entry);
  }),
);

adminJourneyRouter.put(
  '/journey/:id',
  validate(journeySchema.partial()),
  asyncHandler(async (req, res) => {
    const b = req.body as Partial<z.infer<typeof journeySchema>>;
    const full = journeyData(b as z.infer<typeof journeySchema>);
    const data: Record<string, unknown> = {};
    for (const key of Object.keys(full)) {
      if (key in b) data[key] = (full as Record<string, unknown>)[key];
    }
    if (typeof b.title === 'string') {
      data.slug = await uniqueSlug('journeyEntry', b.slug || b.title, req.params.id);
    }
    const entry = await prisma.journeyEntry.update({ where: { id: req.params.id }, data, include });
    await writeAudit(req, 'update', 'journeyEntry', entry.id);
    return ok(res, entry);
  }),
);

adminJourneyRouter.delete(
  '/journey/:id',
  asyncHandler(async (req, res) => {
    await prisma.journeyEntry.delete({ where: { id: req.params.id } });
    await writeAudit(req, 'delete', 'journeyEntry', req.params.id);
    return noContent(res);
  }),
);

mountReorder(adminJourneyRouter, '/journey', prisma.journeyEntry, 'journeyEntry');
