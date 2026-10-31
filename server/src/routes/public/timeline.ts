import { Router } from 'express';
import type { TimelineType } from '@prisma/client';
import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/validate.js';
import { ok } from '../../lib/api.js';
import { loadMediaByIds } from '../../services/serializers.js';

export const publicTimelineRouter = Router();

publicTimelineRouter.get(
  '/timeline',
  asyncHandler(async (req, res) => {
    const { type } = req.query as { type?: string };
    const entries = await prisma.timelineEntry.findMany({
      where: {
        visible: true,
        ...(type ? { type: type as TimelineType } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { startDate: 'desc' }],
    });
    const media = await loadMediaByIds(entries.flatMap((e) => [e.logoMediaId, e.documentMediaId]));
    return ok(
      res,
      entries.map((e) => ({
        ...e,
        logo: e.logoMediaId ? media.get(e.logoMediaId) ?? null : null,
        document: e.documentMediaId ? media.get(e.documentMediaId) ?? null : null,
      })),
    );
  }),
);

export const publicShowcaseRouter = Router();

publicShowcaseRouter.get(
  '/certifications',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.certification.findMany({
      where: { visible: true },
      orderBy: [{ sortOrder: 'asc' }, { issueDate: 'desc' }],
    });
    const media = await loadMediaByIds(rows.flatMap((r) => [r.imageMediaId, r.pdfMediaId]));
    return ok(
      res,
      rows.map((r) => ({
        ...r,
        image: r.imageMediaId ? media.get(r.imageMediaId) ?? null : null,
        pdf: r.pdfMediaId ? media.get(r.pdfMediaId) ?? null : null,
      })),
    );
  }),
);

publicShowcaseRouter.get(
  '/achievements',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.achievement.findMany({
      where: { visible: true },
      orderBy: [{ sortOrder: 'asc' }, { date: 'desc' }],
    });
    const media = await loadMediaByIds(rows.flatMap((r) => [r.imageMediaId, r.pdfMediaId]));
    return ok(
      res,
      rows.map((r) => ({
        ...r,
        image: r.imageMediaId ? media.get(r.imageMediaId) ?? null : null,
        pdf: r.pdfMediaId ? media.get(r.pdfMediaId) ?? null : null,
      })),
    );
  }),
);
