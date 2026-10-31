import { Router, type Request } from 'express';
import type { ZodTypeAny } from 'zod';
import { prisma } from '../../db.js';
import { asyncHandler, validate } from '../../lib/validate.js';
import { ApiError } from '../../lib/errors.js';
import { created, noContent, ok, paginated } from '../../lib/api.js';
import { pageMeta, parsePagination, safeOrderBy } from '../../lib/pagination.js';
import { uniqueSlug } from '../../lib/slug.js';
import { writeAudit } from '../../services/audit.js';

export type SlugModel = 'project' | 'blogPost' | 'journeyEntry' | 'skill' | 'skillCategory' | 'blogTag';

export interface CrudOptions {
  /** Prisma delegate, e.g. prisma.skill */
  model: any;
  /** Human readable resource name used in errors and audit logs */
  resource: string;
  /** Fields searched by the `search` query parameter */
  searchFields?: string[];
  /** Fields that may be used with ?sort= */
  sortable?: string[];
  defaultSort?: { field: string; dir: 'asc' | 'desc' };
  /** Whitelisted include object for list + detail queries */
  include?: Record<string, unknown>;
  /** Zod schema for create; update derives `.partial()` from it */
  createSchema: ZodTypeAny;
  updateSchema?: ZodTypeAny;
  /** Automatically generate a slug from this field */
  slugSource?: string;
  slugModel?: SlugModel;
  /** Extra filtering applied to the list endpoint */
  listWhere?: (req: Request) => Record<string, unknown>;
  /** Transform data before writing */
  transform?: (
    data: Record<string, any>,
    req: Request,
    mode: 'create' | 'update',
  ) => Promise<Record<string, any>> | Record<string, any>;
  /** Called before a record is deleted (e.g. to protect referenced media) */
  beforeDelete?: (id: string) => Promise<void>;
  /** Soft-delete (sets deletedAt) instead of removing the row */
  softDelete?: boolean;
}

/**
 * Builds a standard CRUD router. Mount it beneath an already-authenticated
 * admin router so authorization is enforced centrally.
 */
export function crudRouter(options: CrudOptions): Router {
  const router = Router();
  const {
    model,
    resource,
    searchFields = [],
    sortable = ['createdAt', 'updatedAt'],
    defaultSort = { field: 'createdAt', dir: 'desc' },
    include,
    createSchema,
    updateSchema,
    slugSource,
    slugModel,
    listWhere,
    transform,
    beforeDelete,
    softDelete = false,
  } = options;

  const updateSchemaFinal: ZodTypeAny =
    updateSchema ?? (typeof (createSchema as any).partial === 'function' ? (createSchema as any).partial() : createSchema);

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const q = req.query as Record<string, string | undefined>;
      const { page, pageSize, skip, take } = parsePagination(q, 20, 100);
      const where: Record<string, unknown> = { ...(listWhere ? listWhere(req) : {}) };

      if (q.search && searchFields.length) {
        where.OR = searchFields.map((field) => ({
          [field]: { contains: q.search, mode: 'insensitive' },
        }));
      }
      const orderBy = q.sort
        ? safeOrderBy(q.sort, q.dir, sortable, defaultSort.field)
        : { [defaultSort.field]: defaultSort.dir };
      const finalOrder: unknown =
        defaultSort.field === 'sortOrder' && !q.sort
          ? [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
          : orderBy;

      const [total, rows] = await Promise.all([
        model.count({ where }),
        model.findMany({ where, orderBy: finalOrder, skip, take, ...(include ? { include } : {}) }),
      ]);
      return paginated(res, rows, pageMeta(page, pageSize, total));
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const record = await model.findUnique({
        where: { id: req.params.id },
        ...(include ? { include } : {}),
      });
      if (!record) throw ApiError.notFound(`${resource} not found`);
      return ok(res, record);
    }),
  );

  router.post(
    '/',
    validate(createSchema),
    asyncHandler(async (req, res) => {
      const data: Record<string, any> = { ...req.body };
      if (transform) Object.assign(data, await transform(data, req, 'create'));
      if (slugSource && slugModel) {
        data.slug = await uniqueSlug(slugModel, data.slug || data[slugSource] || '');
      }
      const record = await model.create({ data, ...(include ? { include } : {}) });
      await writeAudit(req, 'create', resource, record.id);
      return created(res, record);
    }),
  );

  const updateHandler = [
    validate(updateSchemaFinal),
    asyncHandler(async (req, res) => {
      const data: Record<string, any> = { ...req.body };
      if (transform) Object.assign(data, await transform(data, req, 'update'));
      if (slugSource && slugModel) {
        const source = data[slugSource];
        if (typeof source === 'string' && source.length) {
          data.slug = await uniqueSlug(slugModel, data.slug || source, req.params.id);
        }
      }
      try {
        const record = await model.update({
          where: { id: req.params.id },
          data,
          ...(include ? { include } : {}),
        });
        await writeAudit(req, 'update', resource, record.id);
        return ok(res, record);
      } catch (error) {
        if (isNotFoundError(error)) throw ApiError.notFound(`${resource} not found`);
        throw error;
      }
    }),
  ] as const;

  router.put('/:id', ...updateHandler);
  router.patch('/:id', ...updateHandler);

  router.delete(
    softDelete ? '/:id/permanent' : '/:id',
    asyncHandler(async (req, res) => {
      if (beforeDelete) await beforeDelete(req.params.id);
      await model.delete({ where: { id: req.params.id } });
      await writeAudit(req, 'delete', resource, req.params.id);
      return noContent(res);
    }),
  );

  if (softDelete) {
    router.delete(
      '/:id',
      asyncHandler(async (req, res) => {
        const record = await model.update({
          where: { id: req.params.id },
          data: { deletedAt: new Date() },
        });
        await writeAudit(req, 'archive', resource, record.id);
        return ok(res, record);
      }),
    );
    router.post(
      '/:id/restore',
      asyncHandler(async (req, res) => {
        const record = await model.update({
          where: { id: req.params.id },
          data: { deletedAt: null },
        });
        await writeAudit(req, 'restore', resource, record.id);
        return ok(res, record);
      }),
    );
  }

  return router;
}

/** Sets the sortOrder of a list of ids inside one transaction. */
export function mountReorder(
  router: Router,
  basePath: string,
  model: any,
  resource: string,
): void {
  router.post(
    `${basePath}/reorder`,
    asyncHandler(async (req, res) => {
      const ids: unknown = req.body?.ids;
      if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
        throw ApiError.badRequest('Expected payload of the form { ids: string[] }');
      }
      await prisma.$transaction(
        (ids as string[]).map((id, index) => model.update({ where: { id }, data: { sortOrder: index } })),
      );
      await writeAudit(req, 'reorder', resource, undefined);
      return ok(res, { reordered: ids.length });
    }),
  );
}

export function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'P2025'
  );
}
