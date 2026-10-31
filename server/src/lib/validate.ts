import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { ApiError } from './errors.js';

type Source = 'body' | 'query' | 'params';

/**
 * Validates and narrows a request section against a Zod schema. On success the
 * parsed (and coerced) value is written back onto the request so downstream
 * handlers work with typed, sanitised data.
 */
export function validate(schema: ZodTypeAny, source: Source = 'body'): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(ApiError.badRequest('Validation failed', formatZodError(result.error)));
    }
    // query/params are read-only getters in Express 5; assign defensively.
    if (source === 'body') {
      req.body = result.data;
    } else {
      (req as unknown as Record<string, unknown>)[source] = result.data;
    }
    next();
  };
}

export function formatZodError(error: ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}

/** Async route wrapper so thrown errors reach the error middleware. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
