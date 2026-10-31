export interface Pagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function parsePagination(query: Record<string, unknown>, defaultSize = 20, maxSize = 100): Pagination {
  const page = Math.max(1, toInt(query.page, 1));
  const pageSize = Math.min(maxSize, Math.max(1, toInt(query.pageSize, defaultSize)));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function toInt(value: unknown, fallback: number): number {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

export function pageMeta(page: number, pageSize: number, total: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Build a Prisma orderBy from a field allow-list to prevent injection. */
export function safeOrderBy<T extends string>(
  sort: unknown,
  direction: unknown,
  allowed: readonly T[],
  fallback: T,
): Record<string, 'asc' | 'desc'> {
  const field = (allowed as readonly string[]).includes(String(sort)) ? (sort as T) : fallback;
  const dir: 'asc' | 'desc' = String(direction).toLowerCase() === 'asc' ? 'asc' : 'desc';
  return { [field]: dir };
}
