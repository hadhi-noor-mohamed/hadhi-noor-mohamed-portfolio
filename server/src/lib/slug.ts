import slugifyLib from 'slugify';
import { prisma } from '../db.js';

export function slugify(input: string): string {
  return slugifyLib(input ?? '', { lower: true, strict: true, trim: true }) || 'item';
}

/**
 * Produce a unique slug for a model, appending -2, -3 ... when a collision
 * occurs. `excludeId` allows a record to keep its own slug while editing.
 */
export async function uniqueSlug(
  model: 'project' | 'blogPost' | 'journeyEntry' | 'skill' | 'skillCategory' | 'blogTag',
  input: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(input);
  let candidate = base;
  let counter = 2;

  // Bounded loop — collisions beyond a few hundred are practically impossible.
  for (let i = 0; i < 500; i += 1) {
    const existing = await findBySlug(model, candidate);
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  return `${base}-${Date.now()}`;
}

async function findBySlug(
  model: 'project' | 'blogPost' | 'journeyEntry' | 'skill' | 'skillCategory' | 'blogTag',
  slug: string,
): Promise<{ id: string } | null> {
  switch (model) {
    case 'project':
      return prisma.project.findUnique({ where: { slug }, select: { id: true } });
    case 'blogPost':
      return prisma.blogPost.findUnique({ where: { slug }, select: { id: true } });
    case 'journeyEntry':
      return prisma.journeyEntry.findUnique({ where: { slug }, select: { id: true } });
    case 'skill':
      return prisma.skill.findUnique({ where: { slug }, select: { id: true } });
    case 'skillCategory':
      return prisma.skillCategory.findUnique({ where: { slug }, select: { id: true } });
    case 'blogTag':
      return prisma.blogTag.findUnique({ where: { slug }, select: { id: true } });
    default:
      return null;
  }
}
