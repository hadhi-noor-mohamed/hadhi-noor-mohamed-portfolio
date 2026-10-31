import { Router } from 'express';
import { prisma } from '../../db.js';
import { env } from '../../env.js';
import { asyncHandler } from '../../lib/validate.js';
import { ok } from '../../lib/api.js';

export const adminAnalyticsRouter = Router();

/**
 * Reads only events that were actually recorded. No visitor numbers are
 * invented; if nothing has been collected yet the empty state is returned with
 * an explanation of what is measured.
 */
adminAnalyticsRouter.get(
  '/analytics',
  asyncHandler(async (req, res) => {
    const days = Math.min(365, Math.max(1, Number.parseInt(String(req.query.days ?? '30'), 10) || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [events, byType, firstEvent, lastEvent, totalMessages, resumeDownloads] = await Promise.all([
      prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: since } },
        select: { type: true, createdAt: true, projectId: true, blogPostId: true, path: true },
        orderBy: { createdAt: 'desc' },
        take: 5000,
      }),
      prisma.analyticsEvent.groupBy({
        by: ['type'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
      prisma.analyticsEvent.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
      prisma.analyticsEvent.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      prisma.contactMessage.count(),
      prisma.analyticsEvent.count({ where: { type: 'RESUME_DOWNLOAD', createdAt: { gte: since } } }),
    ]);

    // Build a complete day series so charts are honest about zero-days.
    const series: Array<{ date: string; pageViews: number; projectViews: number; blogViews: number; downloads: number; messages: number }> = [];
    const index = new Map<string, (typeof series)[number]>();
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const row = { date: key, pageViews: 0, projectViews: 0, blogViews: 0, downloads: 0, messages: 0 };
      series.push(row);
      index.set(key, row);
    }
    for (const event of events) {
      const key = event.createdAt.toISOString().slice(0, 10);
      const row = index.get(key);
      if (!row) continue;
      if (event.type === 'PAGE_VIEW') row.pageViews += 1;
      if (event.type === 'PROJECT_VIEW') row.projectViews += 1;
      if (event.type === 'BLOG_VIEW') row.blogViews += 1;
      if (event.type === 'RESUME_DOWNLOAD') row.downloads += 1;
      if (event.type === 'CONTACT_SUBMIT') row.messages += 1;
    }

    const counts: Record<string, number> = {};
    for (const row of byType) counts[row.type] = row._count._all;

    // Top content — only from real recorded events.
    const projectViews = events.filter((e) => e.type === 'PROJECT_VIEW' && e.projectId);
    const blogViews = events.filter((e) => e.type === 'BLOG_VIEW' && e.blogPostId);
    const projectIdCounts = countBy(projectViews, 'projectId');
    const blogIdCounts = countBy(blogViews, 'blogPostId');

    const [topProjects, topPosts] = await Promise.all([
      topProjectsFor(projectIdCounts),
      topPostsFor(blogIdCounts),
    ]);

    const totals = await Promise.all([
      prisma.analyticsEvent.count({ where: { createdAt: { gte: since } } }),
      prisma.analyticsEvent.count({ where: { type: 'PAGE_VIEW', createdAt: { gte: since } } }),
      prisma.analyticsEvent.count({ where: { type: 'PROJECT_VIEW', createdAt: { gte: since } } }),
      prisma.analyticsEvent.count({ where: { type: 'BLOG_VIEW', createdAt: { gte: since } } }),
      prisma.analyticsEvent.count({ where: { type: 'EXTERNAL_LINK_CLICK', createdAt: { gte: since } } }),
      prisma.analyticsEvent.count({ where: { type: 'PROJECT_LINK_CLICK', createdAt: { gte: since } } }),
      prisma.contactMessage.count({ where: { createdAt: { gte: since } } }),
    ]);

    return ok(res, {
      range: { days, since: since.toISOString() },
      collected: env.analyticsEnabled,
      firstEventAt: firstEvent?.createdAt ?? null,
      lastEventAt: lastEvent?.createdAt ?? null,
      totals: {
        events: totals[0],
        pageViews: totals[1],
        projectViews: totals[2],
        blogViews: totals[3],
        externalLinkClicks: totals[4],
        projectLinkClicks: totals[5],
        contactMessages: totals[6],
        resumeDownloads,
        contactMessagesAllTime: totalMessages,
      },
      byType: counts,
      series,
      topProjects,
      topPosts,
      measurementNote:
        'These figures are raw counts of events recorded by this application (page views, project views, blog views, resume downloads, external link clicks and contact form submissions). No third-party tracker, no fingerprinting and no cross-site analytics are used. Unique visitor counting is not performed, so unique visitors are deliberately not displayed.',
    });
  }),
);

function countBy(events: Array<{ projectId?: string | null; blogPostId?: string | null }>, field: 'projectId' | 'blogPostId') {
  const map = new Map<string, number>();
  for (const event of events) {
    const value = (event as Record<string, unknown>)[field];
    if (typeof value !== 'string') continue;
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
}

async function topProjectsFor(entries: Array<[string, number]>) {
  if (!entries.length) return [];
  const rows = await prisma.project.findMany({
    where: { id: { in: entries.map(([id]) => id) } },
    select: { id: true, title: true, slug: true, state: true },
  });
  const map = new Map(rows.map((r) => [r.id, r]));
  return entries
    .map(([id, count]) => ({ ...(map.get(id) ?? { id, title: 'Deleted project', slug: '', state: 'DRAFT' }), views: count }))
    .filter((r) => r.title !== 'Deleted project' || r.id);
}

async function topPostsFor(entries: Array<[string, number]>) {
  if (!entries.length) return [];
  const rows = await prisma.blogPost.findMany({
    where: { id: { in: entries.map(([id]) => id) } },
    select: { id: true, title: true, slug: true, state: true },
  });
  const map = new Map(rows.map((r) => [r.id, r]));
  return entries
    .map(([id, count]) => ({ ...(map.get(id) ?? { id, title: 'Deleted post', slug: '', state: 'DRAFT' }), views: count }))
    .filter((r) => r.title !== 'Deleted post' || r.id);
}

/** Admin activity log (dashboard). */
adminAnalyticsRouter.get(
  '/audit-log',
  asyncHandler(async (req, res) => {
    const take = Math.min(200, Number.parseInt(String(req.query.limit ?? '60'), 10) || 60);
    const rows = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return ok(res, rows);
  }),
);
