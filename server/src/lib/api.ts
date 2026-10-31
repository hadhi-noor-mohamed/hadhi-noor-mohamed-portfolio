import type { Response } from 'express';

/**
 * Consistent success envelope for every API response.
 *   { ok: true, data: ..., meta?: {...} }
 */
export function ok<T>(res: Response, data: T, status = 200, meta?: Record<string, unknown>): Response {
  return res.status(status).json({ ok: true, data, ...(meta ? { meta } : {}) });
}

export function created<T>(res: Response, data: T): Response {
  return ok(res, data, 201);
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function paginated<T>(res: Response, items: T[], meta: PageMeta): Response {
  return res.status(200).json({ ok: true, data: items, meta });
}
