import express, { type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import cors, { type CorsOptions } from 'cors';
import morgan from 'morgan';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';
import { prisma } from './db.js';
import { publicRouter } from './routes/public/index.js';
import { adminRouter } from './routes/admin/index.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { securityHeaders } from './middleware/security.js';
import { attachSession } from './middleware/session.js';
import { SESSION_COOKIE } from './services/auth.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { ApiError } from './lib/errors.js';
import { storage } from './storage/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  if (env.trustProxy) app.set('trust proxy', 1);

  app.use(securityHeaders());
  app.use(compression());
  // CORS is created per request so the request's own origin can be trusted.
  // This keeps same-origin calls working on Vercel preview URLs and custom
  // domains even when APP_ORIGIN only lists the canonical production URL.
  app.use((req, res, next) => {
    const options: CorsOptions = {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true); // same-origin / curl
        const allowed = [env.appOrigin, env.siteUrl, ...env.corsExtraOrigins].filter(Boolean);
        if (allowed.includes(origin)) return callback(null, true);

        // Accept the origin of this request itself. A browser cannot forge the
        // Host header the server sees, so cross-site origins are still denied.
        try {
          const parsed = new URL(origin);
          const host = (req.get('x-forwarded-host') ?? req.get('host') ?? '')
            .split(',')[0]
            .trim();
          const proto = (req.get('x-forwarded-proto') ?? req.protocol ?? 'https')
            .split(',')[0]
            .trim();
          if (host && parsed.host === host && parsed.protocol === `${proto}:`) {
            return callback(null, true);
          }
        } catch {
          // Ignore malformed Origin headers and fall through to the deny path.
        }

        if (!env.isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
        return callback(ApiError.forbidden('Origin not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
      maxAge: 600,
    };
    cors(options)(req, res, next);
  });
  app.use(cookieParser());
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: false, limit: '2mb' }));
  if (!env.isTest) {
    app.use(morgan(env.isProduction ? 'combined' : 'dev'));
  }

  // --- Local media serving (development / single-server deployments) --------
  app.get('/uploads/*', serveLocalUpload);

  // --- Health check --------------------------------------------------------
  // Liveness by default. Pass `?deep=1` to also verify database connectivity
  // (used to diagnose deployments where the server is up but PostgreSQL is
  // unreachable). A failed deep check returns 503 instead of a fake "healthy".
  app.get('/api/health', async (req, res) => {
    const deep = req.query.deep === '1';
    let database: 'up' | 'down' | 'not-checked' = 'not-checked';

    if (deep) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        database = 'up';
      } catch {
        database = 'down';
      }
    }

    if (database === 'down') {
      res.status(503).json({
        ok: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'The database is unreachable',
          details: { database },
        },
      });
      return;
    }

    res.json({
      ok: true,
      data: {
        status: 'healthy',
        uptime: process.uptime(),
        environment: env.nodeEnv,
        storage: env.storageDriver,
        database,
        time: new Date().toISOString(),
      },
    });
  });

  // --- API -----------------------------------------------------------------
  // The general limiter is disabled under test so the suite is not throttled;
  // the login limiter still exercises the brute-force protection.
  if (!env.isTest) {
    app.use('/api', apiLimiter);
  }
  app.use('/api', attachSession);
  app.use('/api/public', publicRouter);
  app.use('/api/admin', adminRouter);

  app.use('/api', notFoundHandler);

  // --- Built SPA (production) ---------------------------------------------
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}

/** Serves objects from the local storage driver with safe response headers. */
async function serveLocalUpload(req: Request, res: Response, next: NextFunction) {
  if (env.storageDriver !== 'local') return next();
  const key = req.path.replace(/^\/uploads\//, '');
  if (!key || key.includes('..')) return res.status(400).end();
  try {
    const adapter = storage();
    const buffer = await adapter.get(key);
    const lower = key.toLowerCase();
    const type = lower.endsWith('.png')
      ? 'image/png'
      : lower.endsWith('.jpg') || lower.endsWith('.jpeg')
        ? 'image/jpeg'
        : lower.endsWith('.webp')
          ? 'image/webp'
          : lower.endsWith('.gif')
            ? 'image/gif'
            : lower.endsWith('.avif')
              ? 'image/avif'
              : lower.endsWith('.svg')
                ? 'image/svg+xml'
                : lower.endsWith('.pdf')
                  ? 'application/pdf'
                  : lower.endsWith('.mp4')
                    ? 'video/mp4'
                    : lower.endsWith('.webm')
                      ? 'video/webm'
                      : 'application/octet-stream';
    res.setHeader('Content-Type', type);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (type === 'image/svg+xml') {
      // Uploaded SVG is untrusted markup: sandbox it.
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    }
    if (type === 'application/pdf') {
      res.setHeader('Content-Disposition', 'inline');
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(buffer);
  } catch {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'File not found' } });
  }
}

export { SESSION_COOKIE };
