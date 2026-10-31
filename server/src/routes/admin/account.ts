import { Router } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import { prisma } from '../../db.js';
import { asyncHandler, validate } from '../../lib/validate.js';
import { ApiError } from '../../lib/errors.js';
import { noContent, ok } from '../../lib/api.js';
import { assertPasswordStrength, destroySession, hashPassword, revokeAllSessions, verifyPassword } from '../../services/auth.js';
import { writeAudit } from '../../services/audit.js';
import { randomToken } from '../../lib/crypto.js';
import { authenticator } from '../../lib/totp.js';

export const adminAccountRouter = Router();

/** Build an in-memory secret for TOTP enrolment (the secret is stored as-is). */
function generateSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = Buffer.from(randomToken(20), 'base64url');
  let out = '';
  for (let i = 0; i < 30; i += 1) out += chars[bytes[i % bytes.length] % chars.length];
  return out;
}

// --- Account profile -------------------------------------------------------

adminAccountRouter.get(
  '/account',
  asyncHandler(async (req, res) => {
    const user = await prisma.adminUser.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, role: true, totpEnabled: true, lastLoginAt: true },
    });
    const sessions = await prisma.session.count({ where: { userId: req.user!.id, expiresAt: { gt: new Date() } } });
    return ok(res, { user, activeSessions: sessions });
  }),
);

const accountSchema = z.object({
  name: z.string().min(1).max(160),
  email: z.string().email(),
});

adminAccountRouter.patch(
  '/account',
  validate(accountSchema),
  asyncHandler(async (req, res) => {
    const email = req.body.email.toLowerCase();
    if (email !== req.user!.email) {
      const clash = await prisma.adminUser.findUnique({ where: { email } });
      if (clash) throw ApiError.conflict('That email address is already in use');
    }
    const user = await prisma.adminUser.update({
      where: { id: req.user!.id },
      data: { name: req.body.name, email },
      select: { id: true, email: true, name: true, role: true, totpEnabled: true },
    });
    await writeAudit(req, 'update', 'account', user.id);
    return ok(res, { user });
  }),
);

adminAccountRouter.post(
  '/account/revoke-sessions',
  asyncHandler(async (req, res) => {
    await revokeAllSessions(req.user!.id);
    await writeAudit(req, 'revoke-sessions', 'account', req.user!.id);
    return noContent(res);
  }),
);

// --- Optional TOTP second factor ------------------------------------------

adminAccountRouter.post(
  '/account/totp/setup',
  asyncHandler(async (req, res) => {
    const secret = generateSecret();
    // Store pending secret without enabling until a code is confirmed.
    await prisma.adminUser.update({ where: { id: req.user!.id }, data: { totpSecret: secret, totpEnabled: false } });
    const otpauth = `otpauth://totp/${encodeURIComponent(process.env.SITE_URL || 'portfolio')}:${encodeURIComponent(req.user!.email)}?secret=${secret}&issuer=${encodeURIComponent('Hadhi Portfolio')}&algorithm=SHA1&digits=6&period=30`;
    const qr = await QRCode.toDataURL(otpauth, { margin: 1, width: 240 });
    await writeAudit(req, 'totp-setup', 'account', req.user!.id);
    return ok(res, { secret, otpauth, qr });
  }),
);

const totpCodeSchema = z.object({ code: z.string().min(6).max(10) });

adminAccountRouter.post(
  '/account/totp/enable',
  validate(totpCodeSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.adminUser.findUnique({ where: { id: req.user!.id } });
    if (!user?.totpSecret) throw ApiError.badRequest('Run TOTP setup first');
    if (!authenticator.verify({ token: req.body.code.trim(), secret: user.totpSecret })) {
      throw ApiError.badRequest('That code is not valid. Check your authenticator app.');
    }
    await prisma.adminUser.update({ where: { id: user.id }, data: { totpEnabled: true } });
    await writeAudit(req, 'totp-enable', 'account', user.id);
    return ok(res, { totpEnabled: true });
  }),
);

adminAccountRouter.post(
  '/account/totp/disable',
  validate(totpCodeSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.adminUser.findUnique({ where: { id: req.user!.id } });
    if (!user?.totpSecret) throw ApiError.badRequest('Two-factor authentication is not enabled');
    const okCode = authenticator.verify({ token: req.body.code.trim(), secret: user.totpSecret });
    if (!okCode) throw ApiError.badRequest('That code is not valid.');
    await prisma.adminUser.update({ where: { id: user.id }, data: { totpEnabled: false, totpSecret: null } });
    await writeAudit(req, 'totp-disable', 'account', user.id);
    return ok(res, { totpEnabled: false });
  }),
);

// --- Password change (separate route so it can require the old password) ---

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12),
});

adminAccountRouter.post(
  '/account/change-password',
  validate(passwordSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.adminUser.findUnique({ where: { id: req.user!.id } });
    if (!user) throw ApiError.notFound();
    if (!(await verifyPassword(req.body.currentPassword, user.passwordHash))) {
      throw ApiError.unauthorized('Current password is incorrect');
    }
    assertPasswordStrength(req.body.newPassword);
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(req.body.newPassword), failedLogins: 0, lockedUntil: null },
    });
    await revokeAllSessions(user.id);
    await destroySession(req, res);
    await writeAudit(req, 'change-password', 'account', user.id);
    return ok(res, { passwordChanged: true, sessionsRevoked: true });
  }),
);
