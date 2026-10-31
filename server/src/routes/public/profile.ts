import { Router } from 'express';
import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/validate.js';
import { ok } from '../../lib/api.js';
import { loadMediaByIds } from '../../services/serializers.js';
import { publicNavigation, publicProfile, publicSocialLinks } from '../../services/site.js';

export const publicProfileRouter = Router();

publicProfileRouter.get(
  '/profile',
  asyncHandler(async (_req, res) => {
    const profile = await publicProfile();
    if (!profile) {
      return ok(res, { profile: null, socialLinks: [], navigation: [] });
    }
    const media = await loadMediaByIds([profile.profileImageId, profile.heroImageId]);
    const socialLinks = await publicSocialLinks();
    const navigation = await publicNavigation();
    return ok(res, {
      profile: {
        ...profile,
        profileImage: profile.profileImageId ? media.get(profile.profileImageId) ?? null : null,
        heroImage: profile.heroImageId ? media.get(profile.heroImageId) ?? null : null,
      },
      socialLinks,
      navigation,
    });
  }),
);

publicProfileRouter.get(
  '/navigation',
  asyncHandler(async (_req, res) => ok(res, await publicNavigation())),
);

publicProfileRouter.get(
  '/social-links',
  asyncHandler(async (_req, res) => ok(res, await publicSocialLinks())),
);

/** Aggregated payload the SPA loads once on boot for nav, theme and settings. */
publicProfileRouter.get(
  '/bootstrap',
  asyncHandler(async (_req, res) => {
    const [profile, socialLinks, navigation] = await Promise.all([
      publicProfile(),
      publicSocialLinks(),
      publicNavigation(),
    ]);
    const media = await loadMediaByIds([profile?.profileImageId, profile?.heroImageId]);
    return ok(res, {
      profile: profile
        ? {
            ...profile,
            profileImage: profile.profileImageId ? media.get(profile.profileImageId) ?? null : null,
            heroImage: profile.heroImageId ? media.get(profile.heroImageId) ?? null : null,
          }
        : null,
      socialLinks,
      navigation,
    });
  }),
);

export async function countPublishedContent() {
  const [projects, posts, journey] = await Promise.all([
    prisma.project.count({ where: { state: 'PUBLISHED', deletedAt: null } }),
    prisma.blogPost.count({ where: { state: 'PUBLISHED' } }),
    prisma.journeyEntry.count({ where: { state: 'PUBLISHED' } }),
  ]);
  return { projects, posts, journey };
}
