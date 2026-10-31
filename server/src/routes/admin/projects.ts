import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { asyncHandler, validate } from '../../lib/validate.js';
import { created, noContent, ok, paginated } from '../../lib/api.js';
import { ApiError } from '../../lib/errors.js';
import { pageMeta, parsePagination } from '../../lib/pagination.js';
import { uniqueSlug } from '../../lib/slug.js';
import { sanitizeRichText, stripHtml } from '../../lib/sanitize.js';
import { writeAudit } from '../../services/audit.js';
import { findMediaUsages } from '../../services/media.js';
import { mountReorder } from './crud.js';

export const adminProjectsRouter = Router();

const dateish = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((v) => {
    if (v === null || v === undefined || v === '') return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  });

const projectSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().max(220).optional(),
  shortDescription: z.string().max(400).default(''),
  overview: z.string().default(''),
  problemStatement: z.string().default(''),
  approach: z.string().default(''),
  solution: z.string().default(''),
  outcome: z.string().default(''),
  keyFeatures: z.array(z.string()).default([]),
  challenges: z.array(z.string()).default([]),
  learnings: z.array(z.string()).default([]),
  category: z.string().max(80).default(''),
  role: z.string().max(160).default(''),
  teamInfo: z.string().max(400).default(''),
  startDate: dateish,
  endDate: dateish,
  status: z.enum(['CONCEPT', 'IN_PROGRESS', 'PROTOTYPE', 'COMPLETED', 'ARCHIVED']).default('CONCEPT'),
  coverMediaId: z.string().cuid().nullable().optional(),
  githubUrl: z.string().max(500).default(''),
  liveDemoUrl: z.string().max(500).default(''),
  demoVideoUrl: z.string().max(500).default(''),
  reportMediaId: z.string().cuid().nullable().optional(),
  featured: z.boolean().default(false),
  state: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'SCHEDULED']).default('DRAFT'),
  sortOrder: z.number().int().default(0),
  seoTitle: z.string().max(200).default(''),
  seoDescription: z.string().max(400).default(''),
  skillIds: z.array(z.string().cuid()).optional(),
  images: z
    .array(z.object({ mediaId: z.string().cuid(), caption: z.string().max(300).default(''), alt: z.string().max(300).default('') }))
    .optional(),
  documents: z
    .array(z.object({ mediaId: z.string().cuid(), label: z.string().max(200).default('') }))
    .optional(),
});

type ProjectPayload = z.infer<typeof projectSchema>;

function toData(b: ProjectPayload) {
  // `b` may be a partial payload (PUT uses `projectSchema.partial()`), so every
  // field is defensively defaulted before sanitising to avoid runtime crashes.
  return {
    title: b.title,
    shortDescription: stripHtml(b.shortDescription ?? '').slice(0, 400),
    overview: sanitizeRichText(b.overview ?? ''),
    problemStatement: sanitizeRichText(b.problemStatement ?? ''),
    approach: sanitizeRichText(b.approach ?? ''),
    solution: sanitizeRichText(b.solution ?? ''),
    outcome: sanitizeRichText(b.outcome ?? ''),
    keyFeatures: (b.keyFeatures ?? []).filter(Boolean),
    challenges: (b.challenges ?? []).filter(Boolean),
    learnings: (b.learnings ?? []).filter(Boolean),
    category: b.category ?? '',
    role: b.role ?? '',
    teamInfo: b.teamInfo ?? '',
    startDate: b.startDate ?? null,
    endDate: b.endDate ?? null,
    status: b.status,
    coverMediaId: b.coverMediaId ?? null,
    githubUrl: b.githubUrl ?? '',
    liveDemoUrl: b.liveDemoUrl ?? '',
    demoVideoUrl: b.demoVideoUrl ?? '',
    reportMediaId: b.reportMediaId ?? null,
    featured: b.featured,
    state: b.state,
    sortOrder: b.sortOrder,
    seoTitle: b.seoTitle ?? '',
    seoDescription: stripHtml(b.seoDescription ?? '').slice(0, 400),
  };
}

const include = {
  cover: true,
  report: true,
  skills: { select: { id: true, name: true, slug: true } },
  images: { include: { media: true }, orderBy: { sortOrder: 'asc' } },
  docs: { include: { media: true }, orderBy: { sortOrder: 'asc' } },
} as const;

adminProjectsRouter.get(
  '/projects',
  asyncHandler(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const { page, pageSize, skip, take } = parsePagination(q, 20, 100);
    const where: Record<string, unknown> = {};
    if (q.trash === 'true') where.deletedAt = { not: null };
    else if (q.includeArchived !== 'true') where.deletedAt = null;
    if (q.search) {
      where.OR = [
        { title: { contains: q.search, mode: 'insensitive' } },
        { shortDescription: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    if (q.state) where.state = q.state;
    if (q.status) where.status = q.status;
    if (q.category) where.category = q.category;

    const [total, rows] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        include,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
    ]);
    return paginated(res, rows, pageMeta(page, pageSize, total));
  }),
);

adminProjectsRouter.get(
  '/projects/:id',
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id }, include });
    if (!project) throw ApiError.notFound('Project not found');
    return ok(res, project);
  }),
);

adminProjectsRouter.post(
  '/projects',
  validate(projectSchema),
  asyncHandler(async (req, res) => {
    const b = req.body as z.infer<typeof projectSchema>;
    const slug = await uniqueSlug('project', b.slug || b.title);
    const project = await prisma.project.create({
      data: {
        ...toData(b),
        slug,
        skills: { connect: (b.skillIds ?? []).map((id: string) => ({ id })) },
        images: {
          create: (b.images ?? []).map((img, index) => ({
            mediaId: img.mediaId,
            caption: img.caption,
            alt: img.alt,
            sortOrder: index,
          })),
        },
        docs: {
          create: (b.documents ?? []).map((doc, index) => ({
            mediaId: doc.mediaId,
            label: doc.label,
            sortOrder: index,
          })),
        },
      },
      include,
    });
    await writeAudit(req, 'create', 'project', project.id);
    return created(res, project);
  }),
);

adminProjectsRouter.put(
  '/projects/:id',
  validate(projectSchema.partial()),
  asyncHandler(async (req, res) => {
    const b = req.body as Partial<ProjectPayload>;
    const data: Record<string, unknown> = {};
    // Build the update payload only from provided keys.
    const full = toData(b as ProjectPayload);
    for (const key of Object.keys(full)) {
      if (key in b) data[key] = (full as Record<string, unknown>)[key];
    }
    if (typeof b.title === 'string') {
      data.slug = await uniqueSlug('project', b.slug || b.title, req.params.id);
    }
    if (Array.isArray(b.skillIds)) data.skills = { set: b.skillIds.map((id) => ({ id })) };

    const project = await prisma.$transaction(async (tx) => {
      if (Array.isArray(b.images)) {
        await tx.projectImage.deleteMany({ where: { projectId: req.params.id } });
        await tx.projectImage.createMany({
          data: b.images.map((img, index) => ({
            projectId: req.params.id,
            mediaId: img.mediaId,
            caption: img.caption,
            alt: img.alt,
            sortOrder: index,
          })),
        });
      }
      if (Array.isArray(b.documents)) {
        await tx.projectDocument.deleteMany({ where: { projectId: req.params.id } });
        await tx.projectDocument.createMany({
          data: b.documents.map((doc, index) => ({
            projectId: req.params.id,
            mediaId: doc.mediaId,
            label: doc.label,
            sortOrder: index,
          })),
        });
      }
      return tx.project.update({ where: { id: req.params.id }, data, include });
    });
    await writeAudit(req, 'update', 'project', project.id);
    return ok(res, project);
  }),
);

// Publish / unpublish a single project
adminProjectsRouter.post(
  '/projects/:id/publish',
  asyncHandler(async (req, res) => {
    const state = (req.body?.state ?? 'PUBLISHED') as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    const project = await prisma.project.update({ where: { id: req.params.id }, data: { state }, include });
    await writeAudit(req, 'publish', 'project', project.id, `state=${state}`);
    return ok(res, project);
  }),
);

// Duplicate as a draft
adminProjectsRouter.post(
  '/projects/:id/duplicate',
  asyncHandler(async (req, res) => {
    const source = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { images: true, docs: true, skills: true },
    });
    if (!source) throw ApiError.notFound('Project not found');
    const title = `${source.title} (copy)`;
    const slug = await uniqueSlug('project', title);
    const {
      id: _id,
      createdAt: _c,
      updatedAt: _u,
      deletedAt: _d,
      images,
      docs,
      skills,
      ...rest
    } = source;
    const copy = await prisma.project.create({
      data: {
        ...rest,
        title,
        slug,
        state: 'DRAFT',
        featured: false,
        skills: { connect: skills.map((s) => ({ id: s.id })) },
        images: {
          create: images.map((img) => ({
            mediaId: img.mediaId,
            caption: img.caption,
            alt: img.alt,
            sortOrder: img.sortOrder,
          })),
        },
        docs: {
          create: docs.map((doc) => ({
            projectId: undefined as never,
            mediaId: doc.mediaId,
            label: doc.label,
            sortOrder: doc.sortOrder,
          })),
        },
      },
      include,
    });
    await writeAudit(req, 'duplicate', 'project', copy.id, `from ${source.id}`);
    return created(res, copy);
  }),
);

// Archive (soft delete) with trash workflow
adminProjectsRouter.delete(
  '/projects/:id',
  asyncHandler(async (req, res) => {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    await writeAudit(req, 'archive', 'project', project.id);
    return ok(res, project);
  }),
);

adminProjectsRouter.post(
  '/projects/:id/restore',
  asyncHandler(async (req, res) => {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { deletedAt: null },
    });
    await writeAudit(req, 'restore', 'project', project.id);
    return ok(res, project);
  }),
);

adminProjectsRouter.delete(
  '/projects/:id/permanent',
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id }, include: { images: true, docs: true } });
    if (!project) throw ApiError.notFound('Project not found');
    // Protect media that is still referenced somewhere else.
    for (const mediaId of [project.coverMediaId, project.reportMediaId, ...project.images.map((i) => i.mediaId), ...project.docs.map((d) => d.mediaId)]) {
      if (!mediaId) continue;
      const usages = await findMediaUsages(mediaId);
      if (usages.length) {
        // usages include this project; only block if referenced elsewhere.
        const others = usages.filter((u) => !u.startsWith('project.'));
        if (usages.filter((u) => u.startsWith('project.')).length > 1) {
          throw ApiError.conflict('A linked media asset is referenced by other content. Remove it from the gallery first.');
        }
        void usages;
        void others;
      }
    }
    await prisma.project.delete({ where: { id: req.params.id } });
    await writeAudit(req, 'delete', 'project', req.params.id);
    return noContent(res);
  }),
);

// Bulk actions
adminProjectsRouter.post(
  '/projects/bulk',
  asyncHandler(async (req, res) => {
    const ids: string[] = req.body?.ids ?? [];
    const action: string = req.body?.action ?? '';
    if (!Array.isArray(ids) || !ids.length) throw ApiError.badRequest('No items selected');
    let count = 0;
    switch (action) {
      case 'publish':
        ({ count } = await prisma.project.updateMany({ where: { id: { in: ids } }, data: { state: 'PUBLISHED', deletedAt: null } }));
        break;
      case 'unpublish':
        ({ count } = await prisma.project.updateMany({ where: { id: { in: ids } }, data: { state: 'DRAFT' } }));
        break;
      case 'archive':
        ({ count } = await prisma.project.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } }));
        break;
      case 'restore':
        ({ count } = await prisma.project.updateMany({ where: { id: { in: ids } }, data: { deletedAt: null } }));
        break;
      case 'feature':
        ({ count } = await prisma.project.updateMany({ where: { id: { in: ids } }, data: { featured: true } }));
        break;
      case 'unfeature':
        ({ count } = await prisma.project.updateMany({ where: { id: { in: ids } }, data: { featured: false } }));
        break;
      default:
        throw ApiError.badRequest(`Unknown bulk action "${req.body?.action}"`);
    }
    await writeAudit(req, 'bulk', 'project', undefined, req.body?.action);
    return ok(res, { updated: count });
  }),
);

mountReorder(adminProjectsRouter, '/projects', prisma.project, 'project');
