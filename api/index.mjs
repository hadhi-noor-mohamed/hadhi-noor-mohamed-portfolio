/**
 * Vercel serverless entry point for the existing Express API.
 *
 * Vercel cannot run a permanently listening Express server, so the app is
 * exported as a request handler instead. `server/src/index.ts` (which calls
 * `app.listen`) is intentionally NOT used here.
 *
 * Routing contract (see `vercel.json`):
 *   /api/public/bootstrap?x=1  ->  /api?__path=public/bootstrap&x=1
 *
 * A serverless function only has one destination URL, so the rewrite keeps the
 * original sub-path in the `__path` query parameter. This module restores the
 * URL before handing the request to Express, so every existing `/api/...`
 * route keeps working unchanged.
 *
 * This file must never call `process.exit()`. If it did, Vercel would report
 * "Application exited with code 1" for every request, including `/favicon.ico`.
 */

/** Cached per function instance (reused across Fluid compute invocations). */
let appPromise = null;

/** Restore the original `/api/...` URL from the rewrite's `__path` parameter. */
function restoreUrl(req) {
  const raw = typeof req.url === 'string' && req.url ? req.url : '/api';
  const queryIndex = raw.indexOf('?');
  const search = queryIndex >= 0 ? raw.slice(queryIndex + 1) : '';
  const params = new URLSearchParams(search);
  const subPath = params.get('__path') ?? '';
  // Remove our internal parameter and keep any real query parameters.
  params.delete('__path');
  const rest = params.toString();
  const clean = subPath.replace(/^\/+/, '').replace(/\/+$/, '');
  req.url = `/api${clean ? `/${clean}` : ''}${rest ? `?${rest}` : ''}`;
}

async function getApp() {
  if (!appPromise) {
    // Dynamic import lets us catch configuration errors (missing DATABASE_URL
    // or SESSION_SECRET) and return a clean 503 instead of crashing.
    appPromise = import('../server/dist/app.js').then((mod) => mod.createApp());
  }
  return appPromise;
}

export default async function handler(req, res) {
  let app;
  try {
    app = await getApp();
  } catch (error) {
    appPromise = null;
    // Log the underlying error (which never contains the env *values*).
    console.error('[vercel] API failed to initialise:', error);
    res.statusCode = 503;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    res.end(
      JSON.stringify({
        ok: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message:
            'The API is not configured correctly. Check the deployment logs and environment variables.',
        },
      }),
    );
    return;
  }

  try {
    restoreUrl(req);
    return app(req, res);
  } catch (error) {
    console.error('[vercel] Unhandled API error:', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          ok: false,
          error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
        }),
      );
    }
  }
}
