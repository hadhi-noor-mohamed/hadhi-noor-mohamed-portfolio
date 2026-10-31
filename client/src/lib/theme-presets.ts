import type { ThemeConfig } from '@/types/api';

/**
 * Mirrors the server-side preset list (server/src/services/theme.ts). Kept as a
 * small client constant so the Theme Studio can offer one-click presets without
 * an extra round trip. Each preset is a *partial* override of the full config.
 */
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
