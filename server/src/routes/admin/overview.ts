import { Router } from 'express';
import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/validate.js';
import { ok } from '../../lib/api.js';
import { PUBLISHED_PROJECT_WHERE, PUBLISHED_JOURNEY_WHERE } from '../../services/site.js';

export const adminOverviewRouter = Router();

adminOverviewRouter.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const [
      projectsTotal, projectsPublished, projectsDraft, projectsTrash,
      skills, categories, posts, postsPublished, journey, education,
      media, messages, unread, certCount, achievements,
    ] = await Promise.all([
      prisma.project.count({ where: { deletedAt: null } }),
      prisma.project.count({ where: PUBLISHED_PROJECT_WHERE }),
      prisma.project.count({ where: { state: 'DRAFT', deletedAt: null } }),
      prisma.project.count({ where: { deletedAt: { not: null } } }),
      prisma.skill.count(),
      prisma.skillCategory.count(),
      prisma.blogPost.count(),
      prisma.blogPost.count({ where: { state: 'PUBLISHED' } }),
      prisma.journeyEntry.count({ where: PUBLISHED_JOURNEY_WHERE }),
      prisma.timelineEntry.count({ where: { type: 'EDUCATION', visible: true } }),
      prisma.mediaAsset.count(),
      prisma.contactMessage.count(),
      prisma.contactMessage.count({ where: { status: 'NEW' } }),
      prisma.certification.count(),
      prisma.achievement.count(),
    ]);

    const [profile, activeResume, theme, recentActivity, recentMessages] = await Promise.all([
      prisma.profile.findFirst({ orderBy: { createdAt: 'asc' } }),
      prisma.resumeVersion.findFirst({ where: { isActive: true } }),
      prisma.themeConfiguration.findFirst({ where: { isActive: true } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { user: { select: { name: true } } } }),
      prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    // Actionable setup checks for the dashboard.
    const setupChecklist = [
      { key: 'profile', label: 'Complete your public profile', done: Boolean(profile?.aboutHtml && profile?.headline) },
      { key: 'resume', label: 'Upload an active resume', done: Boolean(activeResume) },
      { key: 'projects', label: 'Publish at least one project', done: projectsPublished > 0 },
      { key: 'skills', label: 'Add skills', done: skills > 0 },
      { key: 'social', label: 'Configure a GitHub or LinkedIn link', done: (await prisma.socialLink.count({ where: { visible: true } })) > 0 },
      { key: 'seo', label: 'Set the production site URL', done: (await prisma.siteSettings.findFirst({ orderBy: { createdAt: 'asc' } }))?.siteUrl !== '' && Boolean((await prisma.siteSettings.findFirst({ orderBy: { createdAt: 'asc' } }))?.siteUrl) },
      { key: 'theme', label: 'Publish a theme', done: Boolean(theme) },
    ];

    return ok(res, {
      counts: {
        projectsTotal, projectsPublished, projectsDraft, projectsTrash,
        skills, categories, posts, postsPublished, journey, education,
        media, messages, unread, certCount, achievements,
      },
      setupChecklist,
      recentActivity,
      recentMessages,
      hasProfile: Boolean(profile),
      hasActiveResume: Boolean(activeResume),
    });
  }),
);
