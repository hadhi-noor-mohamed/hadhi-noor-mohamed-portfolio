import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { asyncHandler, validate } from '../../lib/validate.js';
import { ApiError } from '../../lib/errors.js';
import { created, noContent, ok, paginated } from '../../lib/api.js';
import { pageMeta, parsePagination } from '../../lib/pagination.js';
import { upload } from '../../middleware/upload.js';
import { findMediaUsages, storeMedia } from '../../services/media.js';
import { storage } from '../../storage/index.js';
import { writeAudit } from '../../services/audit.js';
import { toAdminMediaDTO } from '../../services/serializers.js';

export const adminMediaRouter = Router();

adminMediaRouter.get(
  '/media',
  asyncHandler(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const { page, pageSize, skip, take } = parsePagination(q, 24, 100);
    const where: Record<string, unknown> = {};
    if (q.kind) where.kind = q.kind;
    if (q.search) {
      where.OR = [
        { originalName: { contains: q.search, mode: 'insensitive' } },
        { displayLabel: { contains: q.search, mode: 'insensitive' } },
        { alt: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    if (q.tag) where.tags = { has: q.tag };
    const [total, rows] = await Promise.all([
      prisma.mediaAsset.count({ where }),
      prisma.mediaAsset.findMany({
        where,
        orderBy: { createdAt: q.dir === 'asc' ? 'asc' : 'desc' },
        skip,
        take,
      }),
    ]);
    const data = await Promise.all(rows.map((r) => toAdminMediaDTO(r)));
    return paginated(res, data, pageMeta(page, pageSize, total));
  }),
);

adminMediaRouter.get(
  '/media/:id/usage',
  asyncHandler(async (req, res) => {
    const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
    if (!asset) throw ApiError.notFound('Media asset not found');
    return ok(res, { usages: await findMediaUsages(asset.id) });
  }),
);

adminMediaRouter.post(
  '/media',
  upload.array('files', 12),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (!files.length) throw ApiError.badRequest('No files were uploaded');
    const label = (req.body?.displayLabel as string | undefined) ?? '';
    const tags = parseTags(req.body?.tags);
    const stored = [];
    for (const file of files) {
      stored.push(
        await storeMedia({
          buffer: file.buffer,
          originalName: file.originalname,
          mimeType: file.mimetype,
          displayLabel: label,
          tags,
          uploadedById: req.user?.id,
        }),
      );
    }
    await writeAudit(req, 'upload', 'mediaAsset', stored[0]?.id, `${stored.length} file(s)`);
    return created(res, await Promise.all(stored.map((s) => toAdminMediaDTO(s))));
  }),
);

const mediaUpdateSchema = z.object({
  displayLabel: z.string().max(200).optional(),
  alt: z.string().max(400).optional(),
  tags: z.array(z.string().max(60)).optional(),
  isPublic: z.boolean().optional(),
});

adminMediaRouter.patch(
  '/media/:id',
  validate(mediaUpdateSchema),
  asyncHandler(async (req, res) => {
    const asset = await prisma.mediaAsset.update({ where: { id: req.params.id }, data: req.body });
    await writeAudit(req, 'update', 'mediaAsset', asset.id);
    return ok(res, await toAdminMediaDTO(asset));
  }),
);

/** Replace the bytes of an asset while keeping its id (and all references). */
adminMediaRouter.post(
  '/media/:id/replace',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Media asset not found');
    const file = req.file;
    if (!file) throw ApiError.badRequest('No file was uploaded');

    // Validate + sniff via storeMedia on a throwaway record, then move metadata.
    const temp = await storeMedia({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      uploadedById: req.user?.id,
    });

    const oldKey = existing.storageKey;
    const updated = await prisma.mediaAsset.update({
      where: { id: existing.id },
      data: {
        storageKey: temp.storageKey,
        mimeType: temp.mimeType,
        size: temp.size,
        width: temp.width,
        height: temp.height,
        kind: temp.kind,
        originalName: temp.originalName,
      },
    });
    // Remove the temporary record and the previous file.
    await prisma.mediaAsset.delete({ where: { id: temp.id } });
    await storage().remove(oldKey).catch(() => undefined);
    await writeAudit(req, 'replace', 'mediaAsset', updated.id);
    return ok(res, await toAdminMediaDTO(updated));
  }),
);

/** Expose a short-lived signed URL for a private asset. */
adminMediaRouter.get(
  '/media/:id/signed-url',
  asyncHandler(async (req, res) => {
    const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
    if (!asset) throw ApiError.notFound('Media asset not found');
    const dto = await toAdminMediaDTO(asset);
    return ok(res, dto);
  }),
);

adminMediaRouter.delete(
  '/media/:id',
  asyncHandler(async (req, res) => {
    const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
    if (!asset) throw ApiError.notFound('Media asset not found');
    const usages = await findMediaUsages(asset.id);
    if (usages.length && req.query.force !== 'true') {
      throw ApiError.conflict(
        `This asset is still in use (${usages.join(', ')}). Remove those references first or confirm a forced delete.`,
        { usages },
      );
    }
    await prisma.mediaAsset.delete({ where: { id: asset.id } });
    await storage().remove(asset.storageKey).catch(() => undefined);
    await writeAudit(req, 'delete', 'mediaAsset', asset.id);
    return noContent(res);
  }),
);

/** Every distinct tag currently in use, for the media filter UI. */
adminMediaRouter.get(
  '/media/tags',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.mediaAsset.findMany({ select: { tags: true } });
    const tags = [...new Set(rows.flatMap((r) => r.tags))].sort();
    return ok(res, tags);
  }),
);

function parseTags(input: unknown): string[] {
  if (Array.isArray(input)) return input.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof input === 'string' && input.trim()) {
    return input.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}
