import type { ThemeConfig } from '@/types/api';
import { hexToRgba } from './utils';

/**
 * The published theme is persisted as structured JSON (never raw CSS). This
 * module projects that JSON onto CSS custom properties and a handful of
 * `data-*` attributes on <html>, which the stylesheet reacts to.
 */

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  mode: 'system',
  primary: '#7c3aed',
  secondary: '#2563eb',
  accent: '#06b6d4',
  pink: '#ec4899',
  background: '#070b16',
  surface: 'rgba(17, 25, 45, 0.72)',
  surfaceStrong: 'rgba(15, 23, 42, 0.95)',
  text: '#e6e9f2',
  muted: '#9aa4bd',
  border: 'rgba(148, 163, 184, 0.18)',
  lightBackground: '#f8fafc',
  lightSurface: 'rgba(255, 255, 255, 0.86)',
  lightText: '#0f172a',
  lightMuted: '#4b5768',
  headingFont: '"Sora", "Inter", system-ui, sans-serif',
  bodyFont: '"Inter", system-ui, sans-serif',
  monospaceFont: '"JetBrains Mono", ui-monospace, monospace',
  fontScale: 1,
  borderRadius: '1rem',
  cardStyle: 'glass',
  shadowIntensity: 0.55,
  iconStyle: 'line',
  animation: 'subtle',
  navigationStyle: 'glass',
  buttonStyle: 'gradient',
  gradients: ['aurora'],
  density: 'normal',
  sectionLayout: 'default',
};

function isHex(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

/** Light-mode borders are derived from the light text colour so they stay subtle. */
function lightBorder(config: ThemeConfig): string {
  if (isHex(config.lightText)) return hexToRgba(config.lightText, 0.12);
  return 'rgba(15, 23, 42, 0.12)';
}

export function applyThemeConfig(raw?: Partial<ThemeConfig> | null): void {
  if (typeof document === 'undefined') return;
  const config: ThemeConfig = { ...DEFAULT_THEME_CONFIG, ...(raw ?? {}) };
  const root = document.documentElement;
  const set = (name: string, value: string | number) => root.style.setProperty(name, String(value));

  // Brand palette
  set('--brand-primary', config.primary);
  set('--brand-secondary', config.secondary);
  set('--brand-accent', config.accent);
  set('--brand-pink', config.pink);

  // Dark surfaces
  set('--dark-bg', config.background);
  set('--dark-surface', config.surface);
  set('--dark-surface-strong', config.surfaceStrong);
  set('--dark-text', config.text);
  set('--dark-muted', config.muted);
  set('--dark-border', config.border);

  // Light surfaces
  set('--light-bg', config.lightBackground);
  set('--light-surface', config.lightSurface);
  set('--light-surface-strong', config.lightSurface);
  set('--light-text', config.lightText);
  set('--light-muted', config.lightMuted);
  set('--light-border', lightBorder(config));

  // Typography
  set('--font-heading', config.headingFont);
  set('--font-body', config.bodyFont);
  set('--font-mono', config.monospaceFont);
  set('--font-scale', config.fontScale);

  // Shape & motion
  set('--radius', config.borderRadius);
  set('--shadow-strength', config.shadowIntensity);

  // Behaviour switches consumed by the stylesheet
  root.dataset.animation = config.animation;
  root.dataset.cardStyle = config.cardStyle;
  root.dataset.buttonStyle = config.buttonStyle;
  root.dataset.navStyle = config.navigationStyle;
  root.dataset.density = config.density;
  root.dataset.sectionLayout = config.sectionLayout;
  root.dataset.iconStyle = config.iconStyle;
  root.dataset.gradient = config.gradients?.[0] ?? 'aurora';
}

export function resetThemeConfig(): void {
  applyThemeConfig(DEFAULT_THEME_CONFIG);
}
