import { prisma } from '../db.js';
import { env } from '../env.js';
import { DEFAULT_NAVIGATION, DEFAULT_SECTIONS, defaultTheme } from './theme.js';

/**
 * Idempotently creates the singleton rows the application needs (theme,
 * settings, page sections, navigation). Safe to run repeatedly — it only
 * creates what is missing and never overwrites existing content.
 */
export async function ensureBootstrap(): Promise<{ created: string[] }> {
  const created: string[] = [];

  const theme = await prisma.themeConfiguration.findFirst();
  if (!theme) {
    const defaults = defaultTheme();
    await prisma.themeConfiguration.create({
      data: {
        name: defaults.name,
        presetKey: defaults.presetKey,
        isActive: true,
        config: defaults.config,
      },
    });
    created.push('themeConfiguration');
  } else if (!(await prisma.themeConfiguration.findFirst({ where: { isActive: true } }))) {
    await prisma.themeConfiguration.update({ where: { id: theme.id }, data: { isActive: true } });
    created.push('themeConfiguration:activated');
  }

  const settings = await prisma.siteSettings.findFirst();
  if (!settings) {
    await prisma.siteSettings.create({
      data: {
        siteUrl: env.siteUrl,
        siteTitle: 'Hadhi Noor Mohamed H — Portfolio',
        siteDescription:
          'Portfolio, projects and learning journey of Hadhi Noor Mohamed H — aspiring software developer, cybersecurity enthusiast and data analytics explorer.',
        privacyNote:
          'This site stores contact form submissions so they can be answered, and records anonymous page-view counts. No third-party trackers, advertising or cross-site profiling are used.',
      },
    });
    created.push('siteSettings');
  }

  for (const section of DEFAULT_SECTIONS) {
    const existing = await prisma.pageSection.findUnique({ where: { key: section.key } });
    if (!existing) {
      await prisma.pageSection.create({ data: { ...section, sortOrder: DEFAULT_SECTIONS.indexOf(section) } });
      created.push(`section:${section.key}`);
    }
  }

  const navCount = await prisma.navigationItem.count();
  if (navCount === 0) {
    await prisma.navigationItem.createMany({ data: DEFAULT_NAVIGATION });
    created.push('navigationItems');
  }

  return { created };
}
