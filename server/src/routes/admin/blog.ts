import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { asyncHandler, validate } from '../../lib/validate.js';
import { created, noContent, ok } from '../../lib/api.js';
import { ApiError } from '../../lib/errors.js';
import { uniqueSlug, slugify } from '../../lib/slug.js';
import { estimateReadingMinutes, renderMarkdown, stripHtml } from '../../lib/sanitize.js';
import { signToken } from '../../lib/crypto.js';
import { writeAudit } from '../../services/audit.js';

export const adminBlogRouter = Router();

const dateish = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((v) => {
    if (v === null || v === undefined || v === '') return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  });

const postSchema = z.object({
  title: z.string().min(1).max(240),
  slug: z.string().max(240).optional(),
  excerpt: z.string().max(500).default(''),
  contentMd: z.string().default(''),
  coverMediaId: z.string().cuid().nullable().optional(),
  category: z.string().max(80).default(''),
  state: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'SCHEDULED']).default('DRAFT'),
  publishedAt: dateish,
  scheduledFor: dateish,
  seoTitle: z.string().max(240).default(''),
  seoDescription: z.string().max(400).default(''),
  tags: z.array(z.string().max(60)).default([]),
  projectId: z.string().cuid().nullable().optional(),
  featured: z.boolean().default(false),
});

const include = { cover: true, tags: true, project: { select: { id: true, title: true, slug: true } } } as const;

async function syncTags(names: string[]): Promise<{ id: string }[]> {
  const clean = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  const ids: { id: string }[] = [];
  for (const name of clean) {
    const slug = slugify(name);
    const tag = await prisma.blogTag.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
    ids.push({ id: tag.id });
  }
  return ids;
}

function postData(b: z.infer<typeof postSchema>) {
  const contentHtml = renderMarkdown(b.contentMd);
  return {
    title: b.title,
    excerpt: stripHtml(b.excerpt).slice(0, 500) || stripHtml(b.contentMd).slice(0, 240),
    contentMd: b.contentMd,
    contentHtml,
    coverMediaId: b.coverMediaId ?? null,
    category: b.category,
    state: b.state,
    publishedAt: b.publishedAt ?? (b.state === 'PUBLISHED' ? new Date() : null),
    scheduledFor: b.scheduledFor ?? null,
    seoTitle: b.seoTitle,
    seoDescription: stripHtml(b.seoDescription).slice(0, 400),
    readingMinutes: estimateReadingMinutes(b.contentMd),
    projectId: b.projectId ?? null,
    featured: b.featured,
  };
}

adminBlogRouter.get(
  '/blog',
  asyncHandler(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const rows = await prisma.blogPost.findMany({
      where: {
        ...(q.search ? { title: { contains: q.search, mode: 'insensitive' } } : {}),
        ...(q.state ? { state: q.state as 'DRAFT' } : {}),
        ...(q.category ? { category: q.category } : {}),
      },
      orderBy: [{ updatedAt: 'desc' }],
      include,
      take: 300,
    });
    return ok(res, rows);
  }),
);

adminBlogRouter.get(
  '/blog/tags',
  asyncHandler(async (_req, res) => {
    const tags = await prisma.blogTag.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { posts: true } } } });
    return ok(res, tags);
  }),
);

adminBlogRouter.get(
  '/blog/:id',
  asyncHandler(async (req, res) => {
    const post = await prisma.blogPost.findUnique({ where: { id: req.params.id }, include });
    if (!post) throw ApiError.notFound('Blog post not found');
    return ok(res, post);
  }),
);

adminBlogRouter.post(
  '/blog',
  validate(postSchema),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const slug = await uniqueSlug('blogPost', b.slug || b.title);
    const post = await prisma.blogPost.create({
      data: { ...postData(b), slug, tags: { connect: await syncTags(b.tags) } },
      include,
    });
    await writeAudit(req, 'create', 'blogPost', post.id);
    return created(res, post);
  }),
);

adminBlogRouter.put(
  '/blog/:id',
  validate(postSchema.partial()),
  asyncHandler(async (req, res) => {
    const b = req.body as Partial<z.infer<typeof postSchema>>;
    const full = postData(b as z.infer<typeof postSchema>);
    const data: Record<string, unknown> = {};
    const keysToCopy = ['title', 'excerpt', 'coverMediaId', 'category', 'state', 'seoTitle', 'seoDescription', 'projectId', 'featured', 'readingMinutes'];
    for (const key of keysToCopy) {
      if (key in b) data[key] = (full as Record<string, unknown>)[key];
    }
    if ('contentMd' in b) {
      data.contentMd = full.contentMd;
      data.contentHtml = full.contentHtml;
      if (!('excerpt' in b)) data.excerpt = full.excerpt;
    }
    if ('publishedAt' in b) data.publishedAt = full.publishedAt;
    if ('scheduledFor' in b) data.scheduledFor = full.scheduledFor;
    if ('state' in b && full.publishedAt) data.publishedAt = full.publishedAt;
    if (typeof b.title === 'string') {
      data.slug = await uniqueSlug('blogPost', b.slug || b.title, req.params.id);
    }
    if (Array.isArray(b.tags)) data.tags = { set: await syncTags(b.tags) };

    const post = await prisma.blogPost.update({ where: { id: req.params.id }, data, include });
    await writeAudit(req, 'update', 'blogPost', post.id);
    return ok(res, post);
  }),
);

/** Preview a draft without publishing — returns the sanitised rendered HTML. */
adminBlogRouter.get(
  '/blog/:id/preview',
  asyncHandler(async (req, res) => {
    const post = await prisma.blogPost.findUnique({ where: { id: req.params.id }, include });
    if (!post) throw ApiError.notFound('Blog post not found');
    return ok(res, post);
  }),
);

/**
 * Create a short-lived signed link that renders a draft on the public site
 * without making it discoverable. Authorisation is enforced here; the token
 * itself is verified by the public preview endpoint.
 */
adminBlogRouter.post(
  '/blog/:id/preview-token',
  asyncHandler(async (req, res) => {
    const post = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
    if (!post) throw ApiError.notFound('Blog post not found');
    const token = signToken(post.id, 60 * 60);
    await writeAudit(req, 'preview-token', 'blogPost', post.id);
    return ok(res, { token, expiresInSeconds: 3600, slug: post.slug });
  }),
);

adminBlogRouter.post(
  '/blog/:id/publish',
  asyncHandler(async (req, res) => {
    const state = (req.body?.state ?? 'PUBLISHED') as 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'ARCHIVED';
    const post = await prisma.blogPost.update({
      where: { id: req.params.id },
      data: {
        state,
        publishedAt: state === 'PUBLISHED' ? new Date() : undefined,
      },
      include,
    });
    await writeAudit(req, 'publish', 'blogPost', post.id, `state=${state}`);
    return ok(res, post);
  }),
);

adminBlogRouter.delete(
  '/blog/:id',
  asyncHandler(async (req, res) => {
    await prisma.blogPost.delete({ where: { id: req.params.id } });
    await writeAudit(req, 'delete', 'blogPost', req.params.id);
    return noContent(res);
  }),
);
