import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { asyncHandler, validate } from '../../lib/validate.js';
import { ApiError } from '../../lib/errors.js';
import { created, noContent, ok } from '../../lib/api.js';
import { writeAudit } from '../../services/audit.js';
import { activeTheme, siteSettings } from '../../services/site.js';
import { upload } from '../../middleware/upload.js';
import { storeMedia } from '../../services/media.js';
import { defaultTheme, themeConfigSchema } from '../../services/theme.js';

export const adminPagesRouter = Router();

// ===========================================================================
// Page builder (sections)
// ===========================================================================

const sectionSchema = z.object({
  key: z.string().min(1).max(60),
  label: z.string().min(1).max(80),
  title: z.string().max(200).default(''),
  subtitle: z.string().max(300).default(''),
  description: z.string().max(1000).default(''),
  layout: z.string().max(60).default('default'),
  variant: z.string().max(60).default('default'),
  cardStyle: z.string().max(60).default('elevated'),
  background: z.string().max(60).default('default'),
  accent: z.string().max(60).default('primary'),
  spacing: z.string().max(60).default('normal'),
  animation: z.string().max(60).default('subtle'),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  draftConfig: z.any().optional(),
});

const KNOWN_SECTION_KEYS = new Set([
  'hero', 'about', 'skills', 'projects', 'experience', 'education',
  'achievements', 'certifications', 'journey', 'blog', 'contact', 'resume',
]);

adminPagesRouter.get(
  '/sections',
  asyncHandler(async (_req, res) => ok(res, await prisma.pageSection.findMany({ orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }] }))),
);

adminPagesRouter.post(
  '/sections',
  validate(sectionSchema),
  asyncHandler(async (req, res) => {
    if (!KNOWN_SECTION_KEYS.has(req.body.key)) {
      throw ApiError.badRequest(`Unknown section key "${req.body.key}"`, { allowed: [...KNOWN_SECTION_KEYS] });
    }
    const section = await prisma.pageSection.create({
      data: {
        ...req.body,
        draftConfig: req.body.draftConfig ?? undefined,
      },
    });
    await writeAudit(req, 'create', 'pageSection', section.id);
    return created(res, section);
  }),
);

adminPagesRouter.put(
  '/sections/:id',
  validate(sectionSchema.partial()),
  asyncHandler(async (req, res) => {
    const section = await prisma.pageSection.update({ where: { id: req.params.id }, data: req.body });
    await writeAudit(req, 'update', 'pageSection', section.id);
    return ok(res, section);
  }),
);

adminPagesRouter.delete(
  '/sections/:id',
  asyncHandler(async (req, res) => {
    await prisma.pageSection.delete({ where: { id: req.params.id } });
    await writeAudit(req, 'delete', 'pageSection', req.params.id);
    return noContent(res);
  }),
);

adminPagesRouter.post(
  '/sections/reorder',
  asyncHandler(async (req, res) => {
    const ids: unknown = req.body?.ids;
    if (!Array.isArray(ids) || ids.some((i) => typeof i !== 'string')) {
      throw ApiError.badRequest('Expected { ids: string[] }');
    }
    await prisma.$transaction(
      (ids as string[]).map((id, index) =>
        prisma.pageSection.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
    await writeAudit(req, 'reorder', 'pageSection', undefined);
    return ok(res, { reordered: (ids as string[]).length });
  }),
);

/** Save a draft of the current section layout without publishing it. */
adminPagesRouter.post(
  '/sections/save-draft',
  asyncHandler(async (req, res) => {
    const items: unknown = req.body?.items;
    if (!Array.isArray(items)) throw ApiError.badRequest('Expected { items: [] }');
    for (const item of items as Array<{ id?: string; draftConfig?: unknown }>) {
      if (!item?.id) throw ApiError.badRequest('Each item needs an id');
      await prisma.pageSection.update({ where: { id: item.id }, data: { draftConfig: (item.draftConfig ?? Prisma.DbNull) as never } });
    }
    await writeAudit(req, 'save-draft', 'pageSection', undefined);
    return ok(res, { saved: true });
  }),
);

/** Publish: promote draft config into the live fields. */
adminPagesRouter.post(
  '/sections/publish',
  asyncHandler(async (req, res) => {
    const rows = await prisma.pageSection.findMany();
    for (const row of rows) {
      const draft = row.draftConfig as Record<string, unknown> | null;
      if (!draft) continue;
      const allowed = [
        'title', 'subtitle', 'description', 'layout', 'variant',
        'cardStyle', 'background', 'accent', 'spacing', 'animation', 'enabled', 'sortOrder',
      ];
      const data: Record<string, unknown> = { draftConfig: Prisma.DbNull };
      for (const key of allowed) {
        if (key in draft) data[key] = draft[key];
      }
      await prisma.pageSection.update({ where: { id: row.id }, data: data as never });
    }
    await writeAudit(req, 'publish', 'pageSection', undefined);
    return ok(res, { published: true });
  }),
);

adminPagesRouter.post(
  '/sections/discard-drafts',
  asyncHandler(async (req, res) => {
    const result = await prisma.pageSection.updateMany({ data: { draftConfig: Prisma.DbNull } });
    await writeAudit(req, 'discard-drafts', 'pageSection', undefined);
    return ok(res, { discarded: result.count });
  }),
);

// ===========================================================================
// Theme studio
// ===========================================================================

type ThemeConfig = import('../../services/theme.js').ThemeConfig;

adminPagesRouter.get(
  '/theme',
  asyncHandler(async (_req, res) => {
    const theme = await activeTheme();
    if (!theme) throw ApiError.notFound('No theme configured');
    return ok(res, theme);
  }),
);

adminPagesRouter.post(
  '/theme/draft',
  asyncHandler(async (req, res) => {
    const parsed = themeConfigSchema.safeParse(req.body?.config);
    if (!parsed.success) {
      throw ApiError.badRequest('Invalid theme configuration', parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
    }
    const existing = await activeTheme();
    const theme = existing
      ? await prisma.themeConfiguration.update({ where: { id: existing.id }, data: { draft: parsed.data, presetKey: String(req.body?.presetKey ?? existing.presetKey) } })
      : await prisma.themeConfiguration.create({ data: { name: 'Custom', presetKey: String(req.body?.presetKey ?? 'custom'), isActive: true, config: parsed.data, draft: parsed.data } });
    await writeAudit(req, 'theme-draft', 'theme', theme.id);
    return ok(res, theme);
  }),
);

adminPagesRouter.post(
  '/theme/publish',
  asyncHandler(async (req, res) => {
    const source = req.body?.config ?? null;
    const existing = await activeTheme();
    let config: ThemeConfig | undefined;
    if (source) {
      const parsed = themeConfigSchema.safeParse(source);
      if (!parsed.success) {
        throw ApiError.badRequest('Invalid theme configuration', parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
      }
      config = parsed.data;
    }
    const nextConfig = (config ??
      (existing ? ((existing.draft ?? existing.config) as ThemeConfig) : undefined)) as ThemeConfig | undefined;
    if (!nextConfig) throw ApiError.badRequest('No theme configuration to publish');

    const theme = existing
      ? await prisma.themeConfiguration.update({
          where: { id: existing.id },
          data: {
            config: nextConfig as unknown as Prisma.InputJsonValue,
            draft: Prisma.DbNull,
            isActive: true,
            ...(req.body?.name ? { name: String(req.body.name) } : {}),
            ...(req.body?.presetKey ? { presetKey: String(req.body.presetKey) } : {}),
          },
        })
      : await prisma.themeConfiguration.create({
          data: {
            name: String(req.body?.name ?? 'Published'),
            presetKey: String(req.body?.presetKey ?? 'custom'),
            isActive: true,
            config: nextConfig as unknown as Prisma.InputJsonValue,
          },
        });
    await writeAudit(req, 'theme-publish', 'theme', theme.id);
    return ok(res, theme);
  }),
);

adminPagesRouter.post(
  '/theme/reset',
  asyncHandler(async (req, res) => {
    const defaults = defaultTheme();
    const existing = await activeTheme();
    const theme = existing
      ? await prisma.themeConfiguration.update({
          where: { id: existing.id },
          data: {
            name: defaults.name,
            presetKey: defaults.presetKey,
            config: defaults.config as unknown as Prisma.InputJsonValue,
            draft: Prisma.DbNull,
            isActive: true,
          },
        })
      : await prisma.themeConfiguration.create({
          data: {
            name: defaults.name,
            presetKey: defaults.presetKey,
            isActive: true,
            config: defaults.config as unknown as Prisma.InputJsonValue,
          },
        });
    await writeAudit(req, 'theme-reset', 'theme', theme.id);
    return ok(res, theme);
  }),
);

// ===========================================================================
// Site settings (SEO)
// ===========================================================================

const settingsSchema = z.object({
  siteUrl: z.string().max(300).default(''),
  siteTitle: z.string().max(200).default(''),
  siteDescription: z.string().max(500).default(''),
  robots: z.string().max(100).default('index,follow'),
  analyticsEnabled: z.boolean().default(true),
  resumePrimaryMode: z.enum(['UPLOADED', 'GENERATED']).default('UPLOADED'),
  footerNote: z.string().max(500).default(''),
  privacyNote: z.string().max(1000).default(''),
  defaultOgImageId: z.string().cuid().nullable().optional(),
});

adminPagesRouter.get(
  '/settings',
  asyncHandler(async (_req, res) => ok(res, await siteSettings())),
);

adminPagesRouter.put(
  '/settings',
  validate(settingsSchema.partial()),
  asyncHandler(async (req, res) => {
    const existing = await siteSettings();
    const settings = await prisma.siteSettings.update({ where: { id: existing.id }, data: req.body });
    await writeAudit(req, 'update', 'siteSettings', settings.id);
    return ok(res, settings);
  }),
);

// ===========================================================================
// Resume versions
// ===========================================================================

const resumeSchema = z.object({
  title: z.string().min(1).max(200),
  versionLabel: z.string().max(60).default(''),
  downloadFilename: z.string().max(200).default(''),
  notes: z.string().max(600).default(''),
  publicDownload: z.boolean().default(true),
  isActive: z.boolean().default(false),
});

adminPagesRouter.get(
  '/resumes',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.resumeVersion.findMany({ orderBy: { createdAt: 'desc' }, include: { media: true } });
    return ok(res, rows);
  }),
);

adminPagesRouter.post(
  '/resumes',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) throw ApiError.badRequest('A resume PDF must be attached');
    if (file.mimetype !== 'application/pdf') throw ApiError.unsupportedMedia('Resume must be a PDF file');
    const parsed = resumeSchema.safeParse({
      title: req.body?.title ?? 'Resume',
      versionLabel: req.body?.versionLabel ?? '',
      downloadFilename: req.body?.downloadFilename ?? file.originalname,
      notes: req.body?.notes ?? '',
      publicDownload: req.body?.publicDownload !== 'false',
      isActive: req.body?.isActive === 'true' || req.body?.isActive === true,
    });
    if (!parsed.success) throw ApiError.badRequest('Validation failed', parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));

    const media = await storeMedia({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      displayLabel: parsed.data.title,
      uploadedById: req.user?.id,
    });
    if (parsed.data.isActive) {
      await prisma.resumeVersion.updateMany({ data: { isActive: false } });
    }
    const version = await prisma.resumeVersion.create({
      data: { ...parsed.data, mediaId: media.id },
      include: { media: true },
    });
    await writeAudit(req, 'create', 'resumeVersion', version.id);
    return created(res, version);
  }),
);

adminPagesRouter.put(
  '/resumes/:id',
  validate(resumeSchema.partial()),
  asyncHandler(async (req, res) => {
    const version = await prisma.resumeVersion.findUnique({ where: { id: req.params.id } });
    if (!version) throw ApiError.notFound('Resume version not found');
    if (req.body.isActive === true) {
      await prisma.resumeVersion.updateMany({ data: { isActive: false } });
    }
    const updated = await prisma.resumeVersion.update({ where: { id: req.params.id }, data: req.body, include: { media: true } });
    await writeAudit(req, 'update', 'resumeVersion', updated.id);
    return ok(res, updated);
  }),
);

adminPagesRouter.delete(
  '/resumes/:id',
  asyncHandler(async (req, res) => {
    const version = await prisma.resumeVersion.findUnique({ where: { id: req.params.id } });
    if (!version) throw ApiError.notFound('Resume version not found');
    await prisma.resumeVersion.delete({ where: { id: req.params.id } });
    // Only remove the storage object when no other reference remains.
    const remaining = await prisma.resumeVersion.count({ where: { mediaId: version.mediaId } });
    if (remaining === 0) {
      const media = await prisma.mediaAsset.findUnique({ where: { id: version.mediaId } });
      if (media) {
        const { storage } = await import('../../storage/index.js');
        await storage().remove(media.storageKey).catch(() => undefined);
        await prisma.mediaAsset.delete({ where: { id: media.id } });
      }
    }
    await writeAudit(req, 'delete', 'resumeVersion', req.params.id);
    return noContent(res);
  }),
);
