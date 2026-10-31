import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { asyncHandler, validate } from '../../lib/validate.js';
import { created, noContent, ok } from '../../lib/api.js';
import { sanitizeRichText } from '../../lib/sanitize.js';

// Authentication, authorization and CSRF are enforced once by the parent admin
// router; every route in this file is therefore protected by construction.
export const adminProfileRouter = Router();

// ---------------------------------------------------------------------------
// Profile (singleton)
// ---------------------------------------------------------------------------

const profileSchema = z.object({
  fullName: z.string().min(1),
  headline: z.string().min(1),
  intro: z.string().min(1),
  aboutHtml: z.string().min(1),
  location: z.string().default(''),
  // Empty string is a valid "not provided" value; do not force a real address.
  email: z.union([z.string().email(), z.literal('')]).default(''),
  phone: z.string().default(''),
  wordmark: z.string().default(''),
  availabilityLabel: z.string().default(''),
  availabilityEnabled: z.boolean().default(false),
  seekingEmployment: z.boolean().default(false),
  openToFreelance: z.boolean().default(false),
  openToRelocation: z.boolean().default(false),
  openToInternship: z.boolean().default(false),
  techBadges: z.array(z.string()).default([]),
  seoTitle: z.string().default(''),
  seoDescription: z.string().default(''),
  profileImageId: z.string().cuid().nullable().optional(),
  heroImageId: z.string().cuid().nullable().optional(),
});

adminProfileRouter.get(
  '/profile',
  asyncHandler(async (_req, res) => {
    const profile = await prisma.profile.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!profile) return ok(res, { profile: null });
    return ok(res, { profile });
  }),
);

adminProfileRouter.put(
  '/profile',
  validate(profileSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.profile.findFirst({ orderBy: { createdAt: 'asc' } });
    const payload = {
      ...req.body,
      aboutHtml: sanitizeRichText(req.body.aboutHtml),
    };
    if (existing) {
      const updated = await prisma.profile.update({ where: { id: existing.id }, data: payload });
      return ok(res, { profile: updated });
    }
    const record = await prisma.profile.create({ data: payload });
    return created(res, { profile: record });
  }),
);

// ---------------------------------------------------------------------------
// Social links
// ---------------------------------------------------------------------------

const socialSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
  icon: z.string().default('link'),
  sortOrder: z.number().int().default(0),
  visible: z.boolean().default(true),
});

adminProfileRouter.get('/social-links', asyncHandler(async (_req, res) => {
  const items = await prisma.socialLink.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  return ok(res, items);
}));

adminProfileRouter.post('/social-links', validate(socialSchema), asyncHandler(async (req, res) => {
  const record = await prisma.socialLink.create({ data: req.body });
  return created(res, record);
}));

const socialUpdateSchema = socialSchema.partial().extend({ id: z.string().cuid() });
adminProfileRouter.put('/social-links/:id', asyncHandler(async (req, res) => {
  const id = req.params.id;
  const data = socialUpdateSchema.parse({ ...req.body, id });
  const updated = await prisma.socialLink.update({ where: { id }, data });
  return ok(res, updated);
}));

adminProfileRouter.delete('/social-links/:id', asyncHandler(async (req, res) => {
  await prisma.socialLink.delete({ where: { id: req.params.id } });
  return noContent(res);
}));

// ---------------------------------------------------------------------------
// Navigation items
// ---------------------------------------------------------------------------

const navSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  icon: z.string().default(''),
  sortOrder: z.number().int().default(0),
  visible: z.boolean().default(true),
  isExternal: z.boolean().default(false),
  openInNewTab: z.boolean().default(false),
});

adminProfileRouter.get('/navigation', asyncHandler(async (_req, res) => {
  const items = await prisma.navigationItem.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  return ok(res, items);
}));

adminProfileRouter.post('/navigation', validate(navSchema), asyncHandler(async (req, res) => {
  const record = await prisma.navigationItem.create({ data: req.body });
  return created(res, record);
}));

const navUpdateSchema = navSchema.partial().extend({ id: z.string().cuid() });
adminProfileRouter.put('/navigation/:id', asyncHandler(async (req, res) => {
  const id = req.params.id;
  const data = navUpdateSchema.parse({ ...req.body, id });
  const updated = await prisma.navigationItem.update({ where: { id }, data });
  return ok(res, updated);
}));

adminProfileRouter.delete('/navigation/:id', asyncHandler(async (req, res) => {
  await prisma.navigationItem.delete({ where: { id: req.params.id } });
  return noContent(res);
}));
