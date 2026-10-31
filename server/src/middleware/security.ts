import helmet from 'helmet';
import type { RequestHandler } from 'express';
import { env } from '../env.js';

/**
 * Security headers.
 *
 * The API serves JSON and uploaded media; the SPA is served separately. A
 * relaxed-but-still-strict CSP is applied to the API responses, and a stricter
 * one to the built SPA in production.
 */
export function securityHeaders(): RequestHandler {
  return helmet({
    contentSecurityPolicy: env.isProduction
      ? {
          useDefaults: true,
          directives: {
            'default-src': ["'self'"],
            'script-src': ["'self'"],
            'style-src': ["'self'", "'unsafe-inline'"],
            'img-src': ["'self'", 'data:', 'blob:', 'https:'],
            'media-src': ["'self'", 'https:', 'blob:'],
            'font-src': ["'self'", 'data:'],
            'connect-src': ["'self'"],
            'object-src': ["'none'"],
            'frame-ancestors': ["'none'"],
            'base-uri': ["'self'"],
            'form-action': ["'self'"],
          },
        }
      : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: env.isProduction ? { maxAge: 15552000, includeSubDomains: true } : false,
    frameguard: { action: 'deny' },
    noSniff: true,
  });
}
