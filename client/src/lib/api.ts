/**
 * Small typed fetch wrapper around the portfolio API.
 *
 * - Sends cookies (`credentials: 'include'`) so the session cookie works.
 * - Echoes the non-HttpOnly CSRF cookie back in the `x-csrf-token` header for
 *   every state-changing request, satisfying the server's double-submit check.
 * - Unwraps the `{ ok, data, meta }` envelope and throws `ApiError` on failure.
 */

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }

  /** True when the request failed because the caller is not authenticated. */
  get isUnauthorized() {
    return this.status === 401;
  }
}

export const CSRF_COOKIE = 'hpf_csrf';

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/([.*+?^${}()|[\]\\])/g, '\\$1')}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function getCsrfToken(): string | undefined {
  return readCookie(CSRF_COOKIE);
}

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  /** Set to true to send a FormData body (skips JSON serialisation). */
  formData?: FormData;
  signal?: AbortSignal;
}

export interface ApiResult<T> {
  data: T;
  meta?: PageMeta;
  status: number;
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const search = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  const base = path.startsWith('/') ? path : `/${path}`;
  return qs ? `${base}?${qs}` : base;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
    // Never set Content-Type manually for FormData — the browser adds the boundary.
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  if (UNSAFE_METHODS.has(method)) {
    const csrf = getCsrfToken();
    if (csrf) headers['x-csrf-token'] = csrf;
  }

  const response = await fetch(buildUrl(path, options.params), {
    method,
    headers,
    body,
    credentials: 'include',
    signal: options.signal,
  });

  if (response.status === 204) {
    return { data: undefined as T, status: 204 };
  }

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : await response.text().catch(() => '');

  if (!response.ok) {
    const errorBody: ApiErrorBody =
      isJson && payload && typeof payload === 'object' && 'error' in payload
        ? (payload as { error: ApiErrorBody }).error
        : { code: 'ERROR', message: typeof payload === 'string' && payload ? payload : `Request failed (${response.status})` };
    throw new ApiError(response.status, errorBody);
  }

  if (isJson && payload && typeof payload === 'object' && 'ok' in payload) {
    const envelope = payload as { ok: boolean; data: T; meta?: PageMeta };
    return { data: envelope.data, meta: envelope.meta, status: response.status };
  }

  return { data: payload as T, status: response.status };
}

export interface ListResult<T> {
  items: T[];
  meta: PageMeta;
}

export const api = {
  get: <T>(path: string, params?: RequestOptions['params']) => request<T>(path, { method: 'GET', params }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string, params?: RequestOptions['params']) => request<T>(path, { method: 'DELETE', params }),
  upload: <T>(path: string, formData: FormData) => request<T>(path, { method: 'POST', formData }),

  /** Fetch a paginated endpoint and return `{ items, meta }`. */
  async getList<T>(path: string, params?: RequestOptions['params']): Promise<ListResult<T>> {
    const result = await request<T[]>(path, { method: 'GET', params });
    return {
      items: result.data ?? [],
      meta: result.meta ?? { page: 1, pageSize: (result.data ?? []).length, total: (result.data ?? []).length, totalPages: 1 },
    };
  },
};

/** Extract a human-readable message from any thrown value. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}
