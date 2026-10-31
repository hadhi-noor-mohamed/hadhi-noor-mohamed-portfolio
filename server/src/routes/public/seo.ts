import { Router } from 'express';
import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/validate.js';
import { PUBLISHED_PROJECT_WHERE, PUBLISHED_JOURNEY_WHERE } from '../../services/site.js';

export const publicSeoRouter = Router();

publicSeoRouter.get(
  '/sitemap.xml',
  asyncHandler(async (_req, res) => {
    const [projects, posts, journey] = await Promise.all([
      prisma.project.findMany({
        where: PUBLISHED_PROJECT_WHERE,
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.blogPost.findMany({
        where: {
          OR: [
            { state: 'PUBLISHED', publishedAt: null },
            { state: 'PUBLISHED', publishedAt: { lte: new Date() } },
            { state: 'SCHEDULED', scheduledFor: { lte: new Date() } },
          ],
        },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.journeyEntry.findMany({
        where: PUBLISHED_JOURNEY_WHERE,
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const base = process.env.SITE_URL || process.env.APP_ORIGIN || 'http://localhost:5173';
    const urls = [
      `${base}/`,
      `${base}/about`,
      `${base}/skills`,
      `${base}/projects`,
      `${base}/experience`,
      `${base}/journey`,
      `${base}/blog`,
      `${base}/contact`,
      `${base}/resume`,
      ...projects.map((p) => `${base}/projects/${p.slug}`),
      ...posts.map((b) => `${base}/blog/${b.slug}`),
      ...journey.map((j) => `${base}/journey/${j.slug}`),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls
        .map(
          (u) =>
            `  <url>\n    <loc>${u.replace(/&/g, '&amp;')}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`,
        )
        .join('\n') +
      '\n</urlset>';
    res.setHeader('Content-Type', 'application/xml');
    return res.send(xml);
  }),
);

publicSeoRouter.get(
  '/robots.txt',
  asyncHandler(async (_req, res) => {
    const base = process.env.SITE_URL || process.env.APP_ORIGIN || 'http://localhost:5173';
    const txt = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/admin\nSitemap: ${base}/sitemap.xml\n`;
    res.setHeader('Content-Type', 'text/plain');
    return res.send(txt);
  }),
);
