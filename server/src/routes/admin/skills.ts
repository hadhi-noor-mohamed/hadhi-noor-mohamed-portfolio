import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { asyncHandler, validate } from '../../lib/validate.js';
import { ok, created, paginated } from '../../lib/api.js';
import { ApiError } from '../../lib/errors.js';
import { crudRouter, mountReorder } from './crud.js';
import { uniqueSlug } from '../../lib/slug.js';
import { writeAudit } from '../../services/audit.js';
import { pageMeta, parsePagination } from '../../lib/pagination.js';

export const adminSkillsRouter = Router();

// ---------------------------------------------------------------------------
// Skill categories
// ---------------------------------------------------------------------------

const categorySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).default(''),
  icon: z.string().max(60).default(''),
  sortOrder: z.number().int().default(0),
  visible: z.boolean().default(true),
});

adminSkillsRouter.use(
  '/skill-categories',
  crudRouter({
    model: prisma.skillCategory,
    resource: 'Skill category',
    searchFields: ['name', 'description'],
    sortable: ['sortOrder', 'name', 'createdAt'],
    defaultSort: { field: 'sortOrder', dir: 'asc' },
    createSchema: categorySchema,
    slugSource: 'name',
    slugModel: 'skillCategory',
    beforeDelete: async (id) => {
      const count = await prisma.skill.count({ where: { categoryId: id } });
      if (count > 0) {
        throw ApiError.conflict(
          `This category is used by ${count} skill(s). Move or delete them first.`,
        );
      }
    },
  }),
);
mountReorder(adminSkillsRouter, '/skills-categories', prisma.skillCategory, 'skillCategory');

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

const skillSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().max(140).optional(),
  description: z.string().max(1000).default(''),
  categoryId: z.string().cuid().nullable().optional(),
  icon: z.string().max(60).default(''),
  logoMediaId: z.string().cuid().nullable().optional(),
  proficiencyLabel: z.string().max(60).default(''),
  proficiencyPercent: z.number().int().min(0).max(100).nullable().optional(),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  published: z.boolean().default(true),
  projectIds: z.array(z.string().cuid()).optional(),
});

function skillData(body: Record<string, unknown>) {
  const b = body as Record<string, any>;
  return {
    name: b.name,
    description: b.description ?? '',
    categoryId: b.categoryId ?? null,
    icon: b.icon ?? '',
    logoMediaId: b.logoMediaId ?? null,
    proficiencyLabel: b.proficiencyLabel ?? '',
    proficiencyPercent: b.proficiencyPercent ?? null,
    featured: Boolean(b.featured),
    sortOrder: b.sortOrder ?? 0,
    published: b.published ?? true,
  };
}

adminSkillsRouter.get(
  '/skills',
  asyncHandler(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const { pageSize } = parsePagination(q, 200, 500);
    const where: Record<string, unknown> = {};
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' };
    if (q.categoryId) where.categoryId = q.categoryId;
    if (q.published === 'true') where.published = true;
    if (q.published === 'false') where.published = false;
    const rows = await prisma.skill.findMany({
      where,
      include: { category: true, logo: true, projects: { select: { id: true, title: true, slug: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return paginated(res, rows, pageMeta(1, pageSize, rows.length));
  }),
);

adminSkillsRouter.get(
  '/skills/:id',
  asyncHandler(async (req, res) => {
    const skill = await prisma.skill.findUnique({
      where: { id: req.params.id },
      include: { category: true, logo: true, projects: { select: { id: true, title: true, slug: true } } },
    });
    if (!skill) throw ApiError.notFound('Skill not found');
    return ok(res, { ...skill, projectIds: skill.projects.map((p) => p.id) });
  }),
);

adminSkillsRouter.post(
  '/skills',
  validate(skillSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof skillSchema>;
    const slug = await uniqueSlug('skill', body.slug || body.name);
    const skill = await prisma.skill.create({
      data: {
        ...skillData(body),
        slug,
        projects: { connect: (body.projectIds ?? []).map((id) => ({ id })) },
      } as any,
      include: { category: true, logo: true, projects: { select: { id: true, title: true, slug: true } } },
    });
    await writeAudit(req, 'create', 'skill', skill.id);
    return created(res, skill);
  }),
);

adminSkillsRouter.put(
  '/skills/:id',
  validate(skillSchema.partial()),
  asyncHandler(async (req, res) => {
    const b = req.body as Record<string, any>;
    const data: Record<string, unknown> = {};
    for (const key of Object.keys(skillData(b))) {
      if (key in b) data[key] = (skillData(b) as Record<string, unknown>)[key];
    }
    if (typeof b.name === 'string') {
      data.slug = await uniqueSlug('skill', b.slug || b.name, req.params.id);
    }
    if (Array.isArray(b.projectIds)) {
      data.projects = { set: b.projectIds.map((id: string) => ({ id })) };
    }
    const skill = await prisma.skill.update({
      where: { id: req.params.id },
      data,
      include: { category: true, logo: true, projects: { select: { id: true, title: true, slug: true } } },
    });
    await writeAudit(req, 'update', 'skill', skill.id);
    return ok(res, skill);
  }),
);

adminSkillsRouter.delete(
  '/skills/:id',
  asyncHandler(async (req, res) => {
    await prisma.skill.delete({ where: { id: req.params.id } });
    await writeAudit(req, 'delete', 'skill', req.params.id);
    return res.status(204).send();
  }),
);

mountReorder(adminSkillsRouter, '/skills', prisma.skill, 'skill');

// Bulk publish / unpublish
adminSkillsRouter.post(
  '/skills/bulk-status',
  asyncHandler(async (req, res) => {
    const ids: string[] = req.body?.ids ?? [];
    const published = Boolean(req.body?.published);
    if (!Array.isArray(ids) || !ids.length) throw ApiError.badRequest('No items selected');
    const result = await prisma.skill.updateMany({ where: { id: { in: ids } }, data: { published } });
    await writeAudit(req, 'bulk-status', 'skill', undefined);
    return ok(res, { updated: result.count });
  }),
);
