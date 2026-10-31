import { Router } from 'express';
import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/validate.js';
import { PUBLISHED_PROJECT_WHERE, PUBLISHED_JOURNEY_WHERE } from '../../services/site.js';

export const publicSeoRouter = Router();

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

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
    const staticPaths = [
      '/',
      '/about',
      '/skills',
      '/projects',
      '/experience',
      '/achievements',
      '/journey',
      '/blog',
      '/contact',
      '/resume',
    ];
    const entries: Array<{ loc: string; lastmod?: Date }> = [
      ...staticPaths.map((p) => ({ loc: `${base}${p}` })),
      ...projects.map((p) => ({ loc: `${base}/projects/${p.slug}`, lastmod: p.updatedAt })),
      ...posts.map((b) => ({ loc: `${base}/blog/${b.slug}`, lastmod: b.updatedAt })),
      ...journey.map((j) => ({ loc: `${base}/journey/${j.slug}`, lastmod: j.updatedAt })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      entries
        .map(
          ({ loc, lastmod }) =>
            `  <url>\n    <loc>${escapeXml(loc)}</loc>\n` +
            (lastmod ? `    <lastmod>${lastmod.toISOString()}</lastmod>\n` : '') +
            `    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`,
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
