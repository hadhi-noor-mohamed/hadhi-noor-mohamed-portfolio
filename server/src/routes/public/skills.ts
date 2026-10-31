import { Router } from 'express';
import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/validate.js';
import { ok } from '../../lib/api.js';
import { loadMediaByIds } from '../../services/serializers.js';

export const publicSkillsRouter = Router();

publicSkillsRouter.get(
  '/skill-categories',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.skillCategory.findMany({
      where: { visible: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return ok(res, categories);
  }),
);

publicSkillsRouter.get(
  '/skills',
  asyncHandler(async (req, res) => {
    const { category, featured } = req.query as Record<string, string | undefined>;
    const skills = await prisma.skill.findMany({
      where: {
        published: true,
        ...(category ? { category: { slug: category } } : {}),
        ...(featured === 'true' ? { featured: true } : {}),
      },
      include: { category: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const media = await loadMediaByIds(skills.map((s) => s.logoMediaId));
    const projectLinks = await prisma.project.findMany({
      where: {
        state: 'PUBLISHED',
        deletedAt: null,
        skills: { some: { id: { in: skills.map((s) => s.id) } } },
      },
      select: { id: true, title: true, slug: true, skills: { select: { id: true } } },
    });

    const data = skills.map((skill) => ({
      ...skill,
      logo: skill.logoMediaId ? media.get(skill.logoMediaId) ?? null : null,
      relatedProjects: projectLinks
        .filter((p) => p.skills.some((s) => s.id === skill.id))
        .map((p) => ({ id: p.id, title: p.title, slug: p.slug })),
    }));

    return ok(res, data);
  }),
);
