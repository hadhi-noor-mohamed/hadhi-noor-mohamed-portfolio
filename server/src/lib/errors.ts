/**
 * Application error type. Thrown from routes/services and converted to a
 * consistent JSON error envelope by the central error handler.
 */
export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code ?? defaultCode(status);
    this.details = details;
  }

  static badRequest(message = 'Invalid request', details?: unknown) {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }
  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }
  static forbidden(message = 'You do not have access to this resource') {
    return new ApiError(403, message, 'FORBIDDEN');
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message, 'NOT_FOUND');
  }
  static conflict(message = 'Resource already exists', details?: unknown) {
    return new ApiError(409, message, 'CONFLICT', details);
  }
  static payloadTooLarge(message = 'Uploaded file is too large') {
    return new ApiError(413, message, 'PAYLOAD_TOO_LARGE');
  }
  static unsupportedMedia(message = 'Unsupported file type') {
    return new ApiError(415, message, 'UNSUPPORTED_MEDIA_TYPE');
  }
  static tooManyRequests(message = 'Too many requests, please try again later') {
    return new ApiError(429, message, 'TOO_MANY_REQUESTS');
  }
  static internal(message = 'Something went wrong') {
    return new ApiError(500, message, 'INTERNAL_ERROR');
  }
}

function defaultCode(status: number): string {
  const map: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    413: 'PAYLOAD_TOO_LARGE',
    415: 'UNSUPPORTED_MEDIA_TYPE',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_ERROR',
  };
  return map[status] ?? 'ERROR';
}
