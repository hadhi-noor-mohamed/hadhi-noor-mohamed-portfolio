import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../../db.js';
import { asyncHandler, validate } from '../../lib/validate.js';
import { ApiError } from '../../lib/errors.js';
import { noContent, ok } from '../../lib/api.js';
import { loginLimiter } from '../../middleware/rateLimit.js';
import {
  createSession,
  destroySession,
  revokeAllSessions,
  setSessionCookies,
  verifyPassword,
  assertPasswordStrength,
  type AuthenticatedRequest,
} from '../../services/auth.js';
import { attachSession, requireAuth, requireCsrf } from '../../middleware/session.js';
import { authenticator } from '../../lib/totp.js';

export const adminAuthRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  code: z.string().max(32).optional(),
});

adminAuthRouter.post(
  '/auth/login',
  loginLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password, code } = req.body;
    const user = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) throw ApiError.unauthorized('Invalid credentials');

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw ApiError.forbidden('Account temporarily locked due to failed login attempts');
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await prisma.adminUser.update({
        where: { id: user.id },
        data: { failedLogins: { increment: 1 }, lockedUntil: computeLockout(user.failedLogins) },
      });
      throw ApiError.unauthorized('Invalid credentials');
    }

    // 2FA check
    if (user.totpEnabled && user.totpSecret) {
      if (!code || !code.trim()) throw ApiError.badRequest('Two-factor authentication code is required', { mfaRequired: true });
      const token = code.trim();
      const validMfa = authenticator.verify({ token, secret: user.totpSecret });
      if (!validMfa) throw ApiError.unauthorized('Invalid two-factor code');
    }

    await prisma.adminUser.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const session = await createSession(user.id, req);
    await setSessionCookies(res, session);
    return ok(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        totpEnabled: user.totpEnabled,
      },
    });
  }),
);

function computeLockout(failedLogins: number): Date | null {
  // Progressive lockout: after 5, 10, 20 failures
  if (failedLogins >= 20) return new Date(Date.now() + 30 * 60 * 1000);
  if (failedLogins >= 10) return new Date(Date.now() + 10 * 60 * 1000);
  if (failedLogins >= 5) return new Date(Date.now() + 5 * 60 * 1000);
  return null;
}

adminAuthRouter.get(
  '/auth/me',
  attachSession,
  asyncHandler(async (req, res) => {
    const authed = req as AuthenticatedRequest;
    if (!authed.user) return ok(res, { user: null });
    const full = await prisma.adminUser.findUnique({ where: { id: authed.user.id } });
    return ok(res, { user: full ? { id: full.id, email: full.email, name: full.name, role: full.role, totpEnabled: full.totpEnabled } : authed.user });
  }),
);

adminAuthRouter.post(
  '/auth/logout',
  attachSession,
  requireCsrf,
  asyncHandler(async (req, res) => {
    await destroySession(req, res);
    return noContent(res);
  }),
);

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12),
});

adminAuthRouter.post(
  '/auth/change-password',
  attachSession,
  requireAuth,
  requireCsrf,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const authed = req as AuthenticatedRequest;
    const user = await prisma.adminUser.findUnique({ where: { id: authed.user!.id } });
    if (!user) throw ApiError.notFound();
    const valid = await verifyPassword(req.body.currentPassword, user.passwordHash);
    if (!valid) throw ApiError.unauthorized('Current password is incorrect');
    assertPasswordStrength(req.body.newPassword);
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(req.body.newPassword, 12), failedLogins: 0, lockedUntil: null },
    });
    await revokeAllSessions(user.id);
    await destroySession(req, res);
    return noContent(res);
  }),
);
