import { Router } from 'express';
import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/validate.js';
import { ok } from '../../lib/api.js';
import { loadMediaByIds } from '../../services/serializers.js';

export const publicResumeRouter = Router();

publicResumeRouter.get(
  '/resume',
  asyncHandler(async (_req, res) => {
    const active = await prisma.resumeVersion.findFirst({
      where: { isActive: true, publicDownload: true },
      include: { media: true },
    });
    if (!active || !active.media) return ok(res, { active: null });
    const media = await loadMediaByIds([active.mediaId]);
    const m = media.get(active.mediaId);
    return ok(res, {
      active: {
        id: active.id,
        title: active.title,
        versionLabel: active.versionLabel,
        downloadFilename: active.downloadFilename || active.media.originalName,
        isActive: active.isActive,
        createdAt: active.createdAt,
        media: m,
      },
    });
  }),
);

// Download proxy (stream PDF/document directly from storage)
publicResumeRouter.get(
  '/resume/download',
  asyncHandler(async (req, res) => {
    const active = await prisma.resumeVersion.findFirst({
      where: { isActive: true, publicDownload: true },
      include: { media: true },
    });
    if (!active || !active.media) {
      return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Resume not found' } });
    }
    try {
      const { storage } = await import('../../storage/index.js');
      const buf = await storage().get(active.media.storageKey);
      const filename = encodeURIComponent(active.downloadFilename || active.media.originalName || 'resume.pdf');
      res.setHeader('Content-Type', active.media.mimeType);
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${filename}`);
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      return res.send(buf);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to download resume';
      return res.status(500).json({ ok: false, error: { code: 'INTERNAL_ERROR', message: msg } });
    }
  }),
);
