import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { prisma } from '../db.js';
import { env } from '../env.js';
import { hashIp, randomToken, sha256 } from '../lib/crypto.js';
import { ApiError } from '../lib/errors.js';

export const SESSION_COOKIE = 'hpf_session';
export const CSRF_COOKIE = 'hpf_csrf';
const BCRYPT_ROUNDS = 12;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'EDITOR';
  totpEnabled: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: SessionUser;
  sessionId?: string;
  csrfToken?: string;
}

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function assertPasswordStrength(password: string): void {
  if (password.length < 12) {
    throw ApiError.badRequest('Password must be at least 12 characters long');
  }
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (classes < 3) {
    throw ApiError.badRequest(
      'Password must contain at least three of: lowercase, uppercase, numbers, symbols',
    );
  }
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

function expiryDate(): Date {
  return new Date(Date.now() + env.sessionTtlHours * 60 * 60 * 1000);
}

export interface CreatedSession {
  rawToken: string;
  csrfToken: string;
  expiresAt: Date;
}

export async function createSession(
  userId: string,
  req: Request,
): Promise<CreatedSession> {
  const rawToken = randomToken(32);
  const csrfToken = randomToken(24);
  const expiresAt = expiryDate();
  await prisma.session.create({
    data: {
      id: sha256(rawToken),
      userId,
      csrfToken,
      expiresAt,
      ipHash: hashIp(req.ip),
      userAgent: (req.get('user-agent') ?? '').slice(0, 300),
    },
  });
  return { rawToken, csrfToken, expiresAt };
}

export function sessionCookieOptions(expiresAt?: Date) {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax' as const,
    domain: env.cookieDomain,
    path: '/',
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

/** Non-HttpOnly CSRF cookie so the SPA can read the token and echo it back. */
export function csrfCookieOptions(expiresAt?: Date) {
  return {
    httpOnly: false,
    secure: env.cookieSecure,
    sameSite: 'lax' as const,
    domain: env.cookieDomain,
    path: '/',
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

export async function setSessionCookies(
  res: Response,
  session: CreatedSession,
): Promise<void> {
  res.cookie(SESSION_COOKIE, session.rawToken, sessionCookieOptions(session.expiresAt));
  res.cookie(CSRF_COOKIE, session.csrfToken, csrfCookieOptions(session.expiresAt));
}

export async function destroySession(req: Request, res: Response): Promise<void> {
  const raw = req.cookies?.[SESSION_COOKIE];
  if (raw) {
    await prisma.session.deleteMany({ where: { id: sha256(raw) } });
  }
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
  res.clearCookie(CSRF_COOKIE, csrfCookieOptions());
}

/**
 * Loads the session for the incoming request. Returns null when there is no
 * valid, unexpired session. Expired sessions are pruned lazily.
 */
export async function loadSession(
  req: Request,
): Promise<{ user: SessionUser; sessionId: string; csrfToken: string } | null> {
  const raw = req.cookies?.[SESSION_COOKIE];
  if (!raw || typeof raw !== 'string') return null;
  const id = sha256(raw);
  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id } }).catch(() => undefined);
    return null;
  }
  // Sliding "last seen" (best-effort, throttled to once per 5 minutes).
  if (Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
    await prisma.session
      .update({ where: { id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);
  }
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      totpEnabled: session.user.totpEnabled,
    },
    sessionId: session.id,
    csrfToken: session.csrfToken,
  };
}

export async function pruneExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}
