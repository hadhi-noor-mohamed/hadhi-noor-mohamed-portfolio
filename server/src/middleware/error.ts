import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../lib/errors.js';
import { env } from '../env.js';

interface HttpishError {
  status?: unknown;
  statusCode?: unknown;
  type?: unknown;
  message?: unknown;
}

function asHttpish(err: unknown): HttpishError | null {
  return typeof err === 'object' && err !== null ? (err as HttpishError) : null;
}

/** Central error handler producing a consistent JSON envelope. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const isApiError = err instanceof ApiError;
  const info = asHttpish(err);

  // body-parser (and similar middleware) attaches a numeric 4xx status.
  // Honour it so malformed or oversized request bodies are not reported as
  // server crashes.
  const rawStatus = info?.status ?? info?.statusCode;
  const middlewareStatus =
    typeof rawStatus === 'number' && rawStatus >= 400 && rawStatus < 500 ? rawStatus : null;
  const status = isApiError ? err.status : (middlewareStatus ?? 500);
  const isParseError = info?.type === 'entity.parse.failed';

  if (!isApiError) {
    if (isParseError) {
      // Never log the raw request body: it may contain passwords or secrets.
      // eslint-disable-next-line no-console
      console.error('[bad-request] Malformed JSON body');
    } else if (status >= 500) {
      // Log unexpected errors with the full stack server-side.
      // eslint-disable-next-line no-console
      console.error('[unhandled-error]', err);
    } else {
      // eslint-disable-next-line no-console
      console.error(
        '[request-error]',
        typeof info?.message === 'string' ? info.message : 'Request rejected',
      );
    }
  }

  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';

  if (isApiError) {
    code = err.code;
    message = err.message;
  } else if (status === 400) {
    code = 'BAD_REQUEST';
    message = 'Invalid request body';
  } else if (status === 413) {
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request body too large';
  } else if (status >= 400 && status < 500) {
    code = 'REQUEST_REJECTED';
    message = 'The request could not be processed';
  }

  const body: Record<string, unknown> = {
    ok: false,
    error: {
      code,
      message,
      ...(isApiError && err.details ? { details: err.details } : {}),
    },
  };

  // Never leak internal details or stack traces in production.
  if (!env.isProduction && !isApiError && err instanceof Error) {
    (body.error as Record<string, unknown>).debug = err.message;
    (body.error as Record<string, unknown>).stack = err.stack?.split('\n').slice(0, 6);
  }

  res.status(status).json(body);
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    ok: false,
    error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
  });
}
