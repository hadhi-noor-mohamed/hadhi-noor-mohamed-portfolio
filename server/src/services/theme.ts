import { z } from 'zod';

/**
 * Theme configuration is validated and stored as JSON, then projected onto CSS
 * custom properties by the frontend. No arbitrary CSS or JavaScript is accepted.
 */
export const themeConfigSchema = z.object({
  mode: z.enum(['light', 'dark', 'system']).default('system'),
  primary: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).default('#7c3aed'),
  secondary: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).default('#2563eb'),
  accent: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).default('#06b6d4'),
  pink: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).default('#ec4899'),
  background: z.string().max(80).default('#070b16'),
  surface: z.string().max(80).default('rgba(17, 25, 45, 0.72)'),
  surfaceStrong: z.string().max(80).default('rgba(15, 23, 42, 0.95)'),
  text: z.string().max(80).default('#e6e9f2'),
  muted: z.string().max(80).default('#9aa4bd'),
  border: z.string().max(80).default('rgba(148, 163, 184, 0.18)'),
  lightBackground: z.string().max(80).default('#f8fafc'),
  lightSurface: z.string().max(80).default('#ffffff'),
  lightText: z.string().max(80).default('#0f172a'),
  lightMuted: z.string().max(80).default('#475569'),
  headingFont: z.string().max(200).default('"Sora", "Inter", system-ui, sans-serif'),
  bodyFont: z.string().max(200).default('"Inter", system-ui, sans-serif'),
  monospaceFont: z.string().max(200).default('"JetBrains Mono", ui-monospace, monospace'),
  fontScale: z.number().min(0.85).max(1.3).default(1),
  borderRadius: z.string().max(40).default('1rem'),
  cardStyle: z.enum(['elevated', 'glass', 'bordered', 'flat']).default('glass'),
  shadowIntensity: z.number().min(0).max(1).default(0.55),
  iconStyle: z.enum(['line', 'filled', 'duotone']).default('line'),
  animation: z.enum(['none', 'subtle', 'moderate', 'expressive']).default('subtle'),
  navigationStyle: z.enum(['glass', 'solid', 'floating', 'bordered']).default('glass'),
  buttonStyle: z.enum(['gradient', 'solid', 'outlined', 'soft']).default('gradient'),
  gradients: z.array(z.string().max(40)).default(['aurora']),
  density: z.enum(['compact', 'normal', 'relaxed']).default('normal'),
  sectionLayout: z.enum(['default', 'compact', 'centered', 'bento']).default('default'),
});

export type ThemeConfig = z.infer<typeof themeConfigSchema>;

export interface ThemePreset {
  key: string;
  name: string;
  description: string;
  config: Partial<ThemeConfig>;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    key: 'aurora',
    name: 'Aurora',
    description: 'Violet → blue → cyan aurora gradients on deep navy. The default.',
    config: {},
  },
  {
    key: 'midnight',
    name: 'Midnight',
    description: 'Near-black charcoal with cool slate accents and restrained colour.',
    config: {
      primary: '#6366f1',
      secondary: '#334155',
      accent: '#22d3ee',
      pink: '#f472b6',
      background: '#05070d',
      surface: 'rgba(20, 24, 38, 0.7)',
      surfaceStrong: 'rgba(12, 15, 26, 0.95)',
      text: '#e2e8f0',
      muted: '#8b97ad',
      cardStyle: 'bordered',
      gradients: ['slate'],
    },
  },
  {
    key: 'electric-violet',
    name: 'Electric Violet',
    description: 'High-energy violet and magenta designed for bold personal brands.',
    config: {
      primary: '#8b5cf6',
      secondary: '#d946ef',
      accent: '#22d3ee',
      pink: '#f43f5e',
      background: '#0c0716',
      surface: 'rgba(38, 21, 66, 0.6)',
      surfaceStrong: 'rgba(26, 14, 46, 0.95)',
      gradients: ['ember'],
      animation: 'moderate',
    },
  },
  {
    key: 'clean-professional',
    name: 'Clean Professional',
    description: 'Light-first, recruiter-friendly, minimal colour and strong typography.',
    config: {
      mode: 'light',
      primary: '#2563eb',
      secondary: '#0f172a',
      accent: '#0891b2',
      pink: '#db2777',
      background: '#f8fafc',
      surface: 'rgba(255, 255, 255, 0.9)',
      surfaceStrong: '#ffffff',
      text: '#0f172a',
      muted: '#475569',
      lightBackground: '#f8fafc',
      lightSurface: '#ffffff',
      lightText: '#0f172a',
      lightMuted: '#475569',
      cardStyle: 'elevated',
      shadowIntensity: 0.25,
      animation: 'subtle',
      buttonStyle: 'solid',
      gradients: ['slate'],
    },
  },
  {
    key: 'cyber-studio',
    name: 'Cyber Studio',
    description: 'Terminal-inspired: monospace headings, neon cyan and matrix green.',
    config: {
      primary: '#22d3ee',
      secondary: '#a3e635',
      accent: '#2dd4bf',
      pink: '#f0abfc',
      background: '#020617',
      surface: 'rgba(8, 22, 33, 0.72)',
      surfaceStrong: 'rgba(4, 14, 24, 0.96)',
      text: '#d1fae5',
      muted: '#7d95a8',
      headingFont: '"JetBrains Mono", ui-monospace, monospace',
      monospaceFont: '"JetBrains Mono", ui-monospace, monospace',
      cardStyle: 'bordered',
      borderRadius: '0.5rem',
      iconStyle: 'line',
      gradients: ['cyber'],
      animation: 'moderate',
    },
  },
];

export function defaultTheme() {
  return {
    name: 'Aurora',
    presetKey: 'aurora',
    config: themeConfigSchema.parse({}),
  };
}

/** Default page sections for the public website. */
export const DEFAULT_SECTIONS = [
  { key: 'hero', label: 'Hero', title: 'Hero', subtitle: '', layout: 'split', variant: 'gradient', background: 'aurora', accent: 'primary', enabled: true },
  { key: 'about', label: 'About', title: 'About me', subtitle: 'Who I am and what I care about', layout: 'split', variant: 'default', background: 'default', accent: 'secondary', enabled: true },
  { key: 'skills', label: 'Skills', title: 'Skills & tools', subtitle: 'What I work with — and how confident I am with each', layout: 'grid', variant: 'filterable', background: 'subtle', accent: 'accent', enabled: true },
  { key: 'projects', label: 'Projects', title: 'Selected projects', subtitle: 'Practical things I have designed and built', layout: 'grid', variant: 'filterable', background: 'default', accent: 'primary', enabled: true },
  { key: 'experience', label: 'Experience', title: 'Experience', subtitle: 'Internships, training and work', layout: 'timeline', variant: 'compact', background: 'subtle', accent: 'secondary', enabled: true },
  { key: 'education', label: 'Education', title: 'Education', subtitle: 'Academic background', layout: 'timeline', variant: 'cards', background: 'default', accent: 'accent', enabled: true },
  { key: 'achievements', label: 'Achievements', title: 'Achievements', subtitle: 'Competitions, awards and recognition', layout: 'grid', variant: 'masonry', background: 'subtle', accent: 'pink', enabled: true },
  { key: 'certifications', label: 'Certifications', title: 'Certifications', subtitle: 'Courses and credentials', layout: 'grid', variant: 'compact', background: 'default', accent: 'primary', enabled: true },
  { key: 'journey', label: 'Learning Journey', title: 'Learning journey', subtitle: 'Notes on what I am learning, building and attending', layout: 'timeline', variant: 'feed', background: 'subtle', accent: 'accent', enabled: true },
  { key: 'blog', label: 'Blog', title: 'Technical writing', subtitle: 'Explanations, notes and reflections', layout: 'grid', variant: 'featured', background: 'default', accent: 'secondary', enabled: true },
  { key: 'contact', label: 'Contact', title: 'Get in touch', subtitle: 'Recruiters, collaborators and fellow learners are welcome', layout: 'split', variant: 'form', background: 'aurora', accent: 'primary', enabled: true },
  { key: 'resume', label: 'Resume', title: 'Resume', subtitle: 'Download the latest version', layout: 'compact', variant: 'cta', background: 'subtle', accent: 'pink', enabled: true },
];

export const DEFAULT_NAVIGATION = [
  { label: 'Home', href: '/', sortOrder: 0 },
  { label: 'About', href: '/about', sortOrder: 1 },
  { label: 'Skills', href: '/skills', sortOrder: 2 },
  { label: 'Projects', href: '/projects', sortOrder: 3 },
  { label: 'Experience', href: '/experience', sortOrder: 4 },
  { label: 'Journey', href: '/journey', sortOrder: 5 },
  { label: 'Blog', href: '/blog', sortOrder: 6 },
  { label: 'Contact', href: '/contact', sortOrder: 7 },
];
