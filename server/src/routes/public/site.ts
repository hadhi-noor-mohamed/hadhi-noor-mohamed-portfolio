import { Router } from 'express';
import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/validate.js';
import { ok } from '../../lib/api.js';
import { activeTheme, publicNavigation, publicSections, siteSettings } from '../../services/site.js';
import { loadMediaByIds } from '../../services/serializers.js';
import { defaultTheme } from '../../services/theme.js';

export const publicSiteRouter = Router();

publicSiteRouter.get(
  '/sections',
  asyncHandler(async (_req, res) => ok(res, await publicSections())),
);

publicSiteRouter.get(
  '/theme',
  asyncHandler(async (_req, res) => {
    const theme = await activeTheme();
    if (!theme) {
      // Bootstrap with the default theme so the site never renders unstyled.
      const defaults = defaultTheme();
      const created = await prisma.themeConfiguration.create({
        data: {
          name: defaults.name,
          presetKey: defaults.presetKey,
          isActive: true,
          config: defaults.config,
        },
      });
      return ok(res, created);
    }
    return ok(res, theme);
  }),
);

publicSiteRouter.get(
  '/settings',
  asyncHandler(async (_req, res) => {
    const settings = await siteSettings();
    const media = await loadMediaByIds([settings.defaultOgImageId]);
    return ok(res, {
      ...settings,
      defaultOgImage: settings.defaultOgImageId ? media.get(settings.defaultOgImageId) ?? null : null,
    });
  }),
);

publicSiteRouter.get(
  '/bootstrap-full',
  asyncHandler(async (_req, res) => {
    const [navigation, sections, theme, settings] = await Promise.all([
      publicNavigation(),
      publicSections(),
      activeTheme(),
      siteSettings(),
    ]);
    const media = await loadMediaByIds([settings.defaultOgImageId]);
    return ok(res, {
      navigation,
      sections,
      theme,
      settings: {
        ...settings,
        defaultOgImage: settings.defaultOgImageId ? media.get(settings.defaultOgImageId) ?? null : null,
      },
    });
  }),
);
