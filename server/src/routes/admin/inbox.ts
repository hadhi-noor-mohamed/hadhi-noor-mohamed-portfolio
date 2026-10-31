import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { asyncHandler, validate } from '../../lib/validate.js';
import { ApiError } from '../../lib/errors.js';
import { noContent, ok, paginated } from '../../lib/api.js';
import { pageMeta, parsePagination } from '../../lib/pagination.js';
import { writeAudit } from '../../services/audit.js';

export const adminInboxRouter = Router();

adminInboxRouter.get(
  '/messages',
  asyncHandler(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const { page, pageSize, skip, take } = parsePagination(q, 20, 100);
    const where: Record<string, unknown> = {};
    if (q.status) where.status = q.status;
    if (q.category) where.category = q.category;
    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { subject: { contains: q.search, mode: 'insensitive' } },
        { message: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    const [total, rows] = await Promise.all([
      prisma.contactMessage.count({ where }),
      prisma.contactMessage.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    ]);
    return paginated(res, rows, pageMeta(page, pageSize, total));
  }),
);

adminInboxRouter.get(
  '/messages/unread-count',
  asyncHandler(async (_req, res) => {
    const count = await prisma.contactMessage.count({ where: { status: 'NEW' } });
    return ok(res, { count });
  }),
);

adminInboxRouter.get(
  '/messages/:id',
  asyncHandler(async (req, res) => {
    const message = await prisma.contactMessage.findUnique({ where: { id: req.params.id } });
    if (!message) throw ApiError.notFound('Message not found');
    return ok(res, message);
  }),
);

adminInboxRouter.post(
  '/messages/:id/read',
  asyncHandler(async (req, res) => {
    const message = await prisma.contactMessage.update({
      where: { id: req.params.id },
      data: { status: messageStatus(req.body?.status, 'READ') },
    });
    await writeAudit(req, 'update', 'contactMessage', message.id);
    return ok(res, message);
  }),
);

const noteSchema = z.object({
  status: z.enum(['NEW', 'READ', 'REPLIED', 'ARCHIVED']).optional(),
  notes: z.string().max(4000).optional(),
});

adminInboxRouter.patch(
  '/messages/:id',
  validate(noteSchema),
  asyncHandler(async (req, res) => {
    const message = await prisma.contactMessage.update({ where: { id: req.params.id }, data: req.body });
    await writeAudit(req, 'update', 'contactMessage', message.id);
    return ok(res, message);
  }),
);

adminInboxRouter.delete(
  '/messages/:id',
  asyncHandler(async (req, res) => {
    await prisma.contactMessage.delete({ where: { id: req.params.id } });
    await writeAudit(req, 'delete', 'contactMessage', req.params.id);
    return noContent(res);
  }),
);

adminInboxRouter.post(
  '/messages/bulk',
  asyncHandler(async (req, res) => {
    const ids: string[] = req.body?.ids ?? [];
    const action: string = req.body?.action ?? '';
    if (!Array.isArray(ids) || !ids.length) throw ApiError.badRequest('No messages selected');
    let count = 0;
    if (action === 'read') {
      ({ count } = await prisma.contactMessage.updateMany({ where: { id: { in: ids } }, data: { status: 'READ' } }));
    } else if (action === 'archive') {
      ({ count } = await prisma.contactMessage.updateMany({ where: { id: { in: ids } }, data: { status: 'ARCHIVED' } }));
    } else if (action === 'delete') {
      ({ count } = await prisma.contactMessage.deleteMany({ where: { id: { in: ids } } }));
    } else {
      throw ApiError.badRequest(`Unknown action "${action}"`);
    }
    await writeAudit(req, 'bulk', 'contactMessage', undefined, action);
    return ok(res, { updated: count });
  }),
);

function messageStatus(value: unknown, fallback: 'READ' | 'NEW' | 'REPLIED' | 'ARCHIVED') {
  const allowed = ['NEW', 'READ', 'REPLIED', 'ARCHIVED'];
  return typeof value === 'string' && allowed.includes(value) ? (value as never) : fallback;
}
