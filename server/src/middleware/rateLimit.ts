import rateLimit, { type Options } from 'express-rate-limit';
import type { Request } from 'express';

function keyGenerator(req: Request): string {
  // Prefer the authenticated user id, fall back to IP.
  const authed = req as Request & { user?: { id: string } };
  return authed.user?.id ?? req.ip ?? 'unknown';
}

const shared: Partial<Options> = {
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  message: {
    ok: false,
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later.' },
  },
};

/** Strict limiter for the admin login endpoint (brute-force protection). */
export const loginLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
});

/** General limiter applied to the whole /api surface. */
export const apiLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 1000,
  limit: 300,
});

/** Contact form limiter — configurable per hour. */
export function contactLimiter(maxPerHour: number) {
  return rateLimit({
    ...shared,
    windowMs: 60 * 60 * 1000,
    limit: maxPerHour,
  });
}

/** Analytics beacon limiter — generous but bounded. */
export const analyticsLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 1000,
  limit: 120,
});
