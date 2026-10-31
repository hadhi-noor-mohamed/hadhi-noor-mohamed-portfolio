import type { NavigationItem, Profile, SocialLink } from '@prisma/client';
import { prisma } from '../db.js';

/**
 * A single source of truth for the public site: profile, links, navigation,
 * theme, sections and settings. Everything the public website renders is read
 * from these helpers so admin edits appear immediately.
 */

export async function publicProfile(): Promise<Profile | null> {
  return prisma.profile.findFirst({ orderBy: { createdAt: 'asc' } });
}

export async function publicSocialLinks(): Promise<Array<Omit<SocialLink, 'createdAt' | 'updatedAt'>>> {
  const links = await prisma.socialLink.findMany({
    where: { visible: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return links.map(({ createdAt: _c, updatedAt: _u, ...rest }) => rest);
}

export async function publicNavigation(): Promise<Array<Omit<NavigationItem, 'createdAt' | 'updatedAt'>>> {
  const items = await prisma.navigationItem.findMany({
    where: { visible: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return items.map(({ createdAt: _c, updatedAt: _u, ...rest }) => rest);
}

export async function publicSections() {
  return prisma.pageSection.findMany({ orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }] });
}

export async function activeTheme() {
  const theme =
    (await prisma.themeConfiguration.findFirst({ where: { isActive: true } })) ??
    (await prisma.themeConfiguration.findFirst({ orderBy: { createdAt: 'asc' } }));
  return theme;
}

export async function siteSettings() {
  const existing = await prisma.siteSettings.findFirst({ orderBy: { createdAt: 'asc' } });
  if (existing) return existing;
  return prisma.siteSettings.create({ data: {} });
}

export const PUBLISHED_PROJECT_WHERE = { state: 'PUBLISHED' as const, deletedAt: null };
export const PUBLISHED_JOURNEY_WHERE = { state: 'PUBLISHED' as const };
