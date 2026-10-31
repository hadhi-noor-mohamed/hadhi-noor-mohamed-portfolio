import type { Request } from 'express';
import { prisma } from '../db.js';

/**
 * Append-only activity log of administrative changes. Written for every create,
 * update, delete, reorder, login and publish action; surfaced in the admin
 * "Activity" view.
 */
export async function writeAudit(
  req: Request,
  action: string,
  entity: string,
  entityId?: string,
  summary?: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  const authed = req as Request & { user?: { id: string } };
  try {
    await prisma.auditLog.create({
      data: {
        userId: authed.user?.id ?? null,
        action,
        entity,
        entityId: entityId ?? null,
        summary: summary ?? null,
        meta: meta ? (meta as object) : undefined,
        ipHash: null,
      },
    });
  } catch {
    // Audit logging must never break the primary operation.
  }
}
