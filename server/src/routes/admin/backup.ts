import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { asyncHandler, validate } from '../../lib/validate.js';
import { ApiError } from '../../lib/errors.js';
import { ok } from '../../lib/api.js';
import { writeAudit } from '../../services/audit.js';

export const adminBackupRouter = Router();

/** Models included in a backup. Secrets and credentials are never exported. */
const BACKUP_MODELS = [
  'profile', 'socialLink', 'navigationItem', 'skillCategory', 'skill',
  'project', 'projectImage', 'projectDocument', 'timelineEntry',
  'certification', 'achievement', 'journeyEntry', 'blogPost', 'blogTag',
  'pageSection', 'themeConfiguration', 'siteSettings', 'resumeVersion',
  'mediaAsset',
] as const;

const OMIT_MEDIA = { checksum: true, uploadedById: true } as const;

adminBackupRouter.get(
  '/backup',
  asyncHandler(async (_req, res) => {
    const data = await snapshot();
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      application: 'hadhi-portfolio-cms',
      counts: countAll(data),
      data,
      notice:
        'Media files are stored separately from these records. Database records reference storage keys; back up your object-storage bucket (or the local storage directory) in addition to this JSON file.',
    };
    writeAudit(res.req, 'export', 'backup', undefined, 'Content backup exported');
    return ok(res, payload);
  }),
);

async function snapshot() {
  const [
    profile, socialLink, navigationItem, skillCategory, skill,
    project, projectImage, projectDocument, timelineEntry,
    certification, achievement, journeyEntry, blogPost, blogTag,
    pageSection, themeConfiguration, siteSettings, resumeVersion, mediaAsset,
  ] = await Promise.all([
    prisma.profile.findMany(),
    prisma.socialLink.findMany(),
    prisma.navigationItem.findMany(),
    prisma.skillCategory.findMany(),
    prisma.skill.findMany(),
    prisma.project.findMany(),
    prisma.projectImage.findMany(),
    prisma.projectDocument.findMany(),
    prisma.timelineEntry.findMany(),
    prisma.certification.findMany(),
    prisma.achievement.findMany(),
    prisma.journeyEntry.findMany(),
    prisma.blogPost.findMany(),
    prisma.blogTag.findMany(),
    prisma.pageSection.findMany(),
    prisma.themeConfiguration.findMany(),
    prisma.siteSettings.findMany(),
    prisma.resumeVersion.findMany(),
    prisma.mediaAsset.findMany({ omit: { checksum: true, uploadedById: true } }),
  ]);
  void OMIT_MEDIA;
  return {
    profile, socialLink, navigationItem, skillCategory, skill,
    project, projectImage, projectDocument, timelineEntry,
    certification, achievement, journeyEntry, blogPost, blogTag,
    pageSection, themeConfiguration, siteSettings, resumeVersion, mediaAsset,
  };
}

function countAll(data: Record<string, unknown[]>) {
  const counts: Record<string, number> = {};
  for (const key of BACKUP_MODELS) {
    counts[key] = Array.isArray(data[key]) ? (data[key] as unknown[]).length : 0;
  }
  return counts;
}

// --- Restore ---------------------------------------------------------------

const restoreSchema = z.object({
  payload: z.object({
    version: z.number(),
    data: z.record(z.any()),
  }),
  confirm: z.literal(true),
  mode: z.enum(['replace', 'merge']).default('replace'),
});

adminBackupRouter.post(
  '/backup/preview',
  asyncHandler(async (req, res) => {
    const parsed = parseBackup(req.body?.payload);
    return ok(res, {
      valid: true,
      version: parsed.version,
      exportedAt: parsed.exportedAt ?? null,
      counts: parsed.counts,
      currentCounts: countAll(await snapshot()),
      summary: describe(parsed.data),
    });
  }),
);

adminBackupRouter.post(
  '/backup/restore',
  validate(restoreSchema),
  asyncHandler(async (req, res) => {
    const payload = parseBackup(req.body.payload);
    if (req.body.mode !== 'replace' && req.body.mode !== 'merge') {
      throw ApiError.badRequest('mode must be "replace" or "merge"');
    }
    const current = countAll(await snapshot());
    const result = await restoreAll(payload.data, req.body.mode);
    await writeAudit(req, 'restore', 'backup', undefined, `mode=${req.body.mode}`);
    return ok(res, {
      restored: result,
      previousCounts: current,
      mode: req.body.mode,
      notice: 'Uploaded media files are not part of this JSON backup. Keep your storage bucket backed up separately.',
    });
  }),
);

function parseBackup(payload: unknown): { version: number; exportedAt?: string | null; data: Record<string, any>; counts: Record<string, number> } {
  if (!payload || typeof payload !== 'object') throw ApiError.badRequest('Backup payload is missing');
  const anyPayload = payload as any;
  const data = anyPayload.data;
  if (!data || typeof data !== 'object') throw ApiError.badRequest('Backup payload has no data section');
  if (typeof anyPayload.version !== 'number' || anyPayload.version !== 1) {
    throw ApiError.badRequest('Unsupported backup version');
  }
  const counts: Record<string, number> = {};
  for (const key of BACKUP_MODELS) {
    const value = data[key];
    if (value !== undefined && !Array.isArray(value)) {
      throw ApiError.badRequest(`Backup field "${key}" must be an array`);
    }
    counts[key] = Array.isArray(value) ? value.length : 0;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (!item || typeof item !== 'object' || typeof item.id !== 'string') {
          throw ApiError.badRequest(`Backup field "${key}" contains a malformed record`);
        }
      }
    }
  }
  return { version: anyPayload.version, exportedAt: anyPayload.exportedAt ?? null, data, counts };
}

function describe(data: Record<string, any>) {
  return {
    projects: (data.project ?? []).slice(0, 8).map((p: any) => ({ title: p.title, state: p.state })),
    skills: (data.skill ?? []).slice(0, 8).map((s: any) => s.name),
    posts: (data.blogPost ?? []).slice(0, 8).map((b: any) => ({ title: b.title, state: b.state })),
    resumes: (data.resumeVersion ?? []).length,
  };
}

async function restoreAll(data: Record<string, any>, mode: 'replace' | 'merge') {
  const counts: Record<string, number> = {};
  await prisma.$transaction(async (tx) => {
    if (mode === 'replace') {
      // Order matters for FK constraints: children first.
      await tx.projectImage.deleteMany();
      await tx.projectDocument.deleteMany();
      await tx.blogPost.deleteMany();
      await tx.blogTag.deleteMany();
      await tx.journeyEntry.deleteMany();
      await tx.skill.deleteMany();
      await tx.skillCategory.deleteMany();
      await tx.project.deleteMany();
      await tx.timelineEntry.deleteMany();
      await tx.certification.deleteMany();
      await tx.achievement.deleteMany();
      await tx.resumeVersion.deleteMany();
      await tx.pageSection.deleteMany();
      await tx.socialLink.deleteMany();
      await tx.navigationItem.deleteMany();
      await tx.mediaAsset.deleteMany();
      await tx.profile.deleteMany();
      await tx.siteSettings.deleteMany();
      await tx.themeConfiguration.deleteMany();
    }

    counts.mediaAsset = await insert(tx, 'mediaAsset', data.mediaAsset, mode);
    counts.profile = await insert(tx, 'profile', data.profile, mode);
    counts.siteSettings = await insert(tx, 'siteSettings', data.siteSettings, mode);
    counts.themeConfiguration = await insert(tx, 'themeConfiguration', data.themeConfiguration, mode);
    counts.pageSection = await insert(tx, 'pageSection', data.pageSection, mode);
    counts.socialLink = await insert(tx, 'socialLink', data.socialLink, mode);
    counts.navigationItem = await insert(tx, 'navigationItem', data.navigationItem, mode);
    counts.skillCategory = await insert(tx, 'skillCategory', data.skillCategory, mode);
    counts.project = await insert(tx, 'project', data.project, mode);
    counts.skill = await insert(tx, 'skill', data.skill, mode);
    counts.projectImage = await insert(tx, 'projectImage', data.projectImage, mode);
    counts.projectDocument = await insert(tx, 'projectDocument', data.projectDocument, mode);
    counts.timelineEntry = await insert(tx, 'timelineEntry', data.timelineEntry, mode);
    counts.certification = await insert(tx, 'certification', data.certification, mode);
    counts.achievement = await insert(tx, 'achievement', data.achievement, mode);
    counts.journeyEntry = await insert(tx, 'journeyEntry', data.journeyEntry, mode);
    counts.blogTag = await insert(tx, 'blogTag', data.blogTag, mode);
    counts.blogPost = await insert(tx, 'blogPost', data.blogPost, mode);
    counts.resumeVersion = await insert(tx, 'resumeVersion', data.resumeVersion, mode);
  });
  return counts;
}

/** Insert rows, upserting by id in replace mode and skipping ids in merge mode. */
async function insert(tx: any, model: string, rows: any[] | undefined, mode: 'replace' | 'merge') {
  if (!Array.isArray(rows) || rows.length === 0) return 0;
  let inserted = 0;
  for (const raw of rows) {
    try {
      await tx[model].create({ data: sanitizeRow(raw) });
      inserted += 1;
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (mode === 'replace' && code === 'P2002') {
        // Duplicate natural key (e.g. slug): try an update instead.
        try {
          await tx[model].update({ where: { id: raw.id }, data: sanitizeRow(raw) });
          inserted += 1;
        } catch {
          // skip malformed/duplicate row rather than abort the whole restore
        }
      }
      void code;
    }
  }
  return inserted;
}

function sanitizeRow(row: Record<string, unknown>): Record<string, unknown> {
  // Never restore system-managed or secret columns.
  const { createdAt: _c, updatedAt: _u, checksum: _s, uploadedById: _u2, ...rest } = row as any;
  return rest;
}
