import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../lib/errors.js';
import { CSRF_COOKIE, loadSession, type AuthenticatedRequest } from '../services/auth.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Attaches `req.user` when a valid session cookie is present. Never throws —
 * protected routes call `requireAuth` afterwards. Also rejects cross-site
 * state-changing requests that do not carry a matching CSRF token.
 */
export async function attachSession(req: Request, _res: Response, next: NextFunction) {
  try {
    const session = await loadSession(req);
    if (session) {
      const authed = req as AuthenticatedRequest;
      authed.user = session.user;
      authed.sessionId = session.sessionId;
      authed.csrfToken = session.csrfToken;
    }
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Double-submit CSRF protection for authenticated, state-changing requests.
 * The token must come from a header (not a form field) so a cross-site HTML
 * form cannot supply it.
 */
export function requireCsrf(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  const authed = req as AuthenticatedRequest;
  // Only enforce when authenticated — public endpoints (e.g. contact form,
  // analytics beacons) are protected by rate limiting instead.
  if (!authed.user) return next();
  const headerToken = req.get('x-csrf-token') ?? '';
  const cookieToken = req.cookies?.[CSRF_COOKIE] ?? '';
  if (!headerToken || !cookieToken || headerToken !== authed.csrfToken || headerToken !== cookieToken) {
    return next(ApiError.forbidden('Invalid or missing CSRF token'));
  }
  next();
}

/** Server-side authorization gate. Every admin route must use this. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authed = req as AuthenticatedRequest;
  if (!authed.user) {
    return next(ApiError.unauthorized());
  }
  next();
}

export function requireOwner(req: Request, _res: Response, next: NextFunction) {
  const authed = req as AuthenticatedRequest;
  if (!authed.user) return next(ApiError.unauthorized());
  if (authed.user.role !== 'OWNER') return next(ApiError.forbidden('Owner role required'));
  next();
}
