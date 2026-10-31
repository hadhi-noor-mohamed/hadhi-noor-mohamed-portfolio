import crypto from 'node:crypto';
import { env } from '../env.js';

/** Random URL-safe token (used for session ids and preview tokens). */
export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** SHA-256 hex digest — used to store session tokens and IPs without raw values. */
export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * HMAC of an IP address keyed by the session secret. This lets us rate-limit
 * and de-duplicate abuse without storing raw visitor IP addresses.
 */
export function hashIp(ip: string | undefined): string | null {
  if (!ip) return null;
  return crypto.createHmac('sha256', env.sessionSecret).update(ip).digest('hex').slice(0, 32);
}

/** Constant-time string comparison to avoid timing leaks. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Signed, expiring token: `<payload>.<signature>`. */
export function signToken(payload: string, ttlSeconds: number): string {
  const expires = Date.now() + ttlSeconds * 1000;
  const body = `${payload}:${expires}`;
  const sig = crypto.createHmac('sha256', env.sessionSecret).update(body).digest('base64url');
  return `${Buffer.from(body).toString('base64url')}.${sig}`;
}

export function verifyToken(token: string): { payload: string } | null {
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  let body: string;
  try {
    body = Buffer.from(encoded, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const expected = crypto.createHmac('sha256', env.sessionSecret).update(body).digest('base64url');
  if (!safeEqual(sig, expected)) return null;
  const idx = body.lastIndexOf(':');
  if (idx === -1) return null;
  const payload = body.slice(0, idx);
  const expires = Number(body.slice(idx + 1));
  if (!Number.isFinite(expires) || Date.now() > expires) return null;
  return { payload };
}

/** Deterministic, non-reversible visitor fingerprint for analytics grouping. */
export function visitorHash(ip: string | undefined, userAgent: string | undefined): string {
  return sha256(`${env.sessionSecret}:${ip ?? 'unknown'}:${userAgent ?? 'unknown'}`).slice(0, 24);
}
