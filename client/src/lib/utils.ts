import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional Tailwind class names, resolving conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const MONTH_FORMAT = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' });

/** "12 Mar 2025" — returns '' for null/invalid values. */
export function formatDate(value?: string | Date | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return DATE_FORMAT.format(date);
}

/** "Mar 2025" — compact month/year label. */
export function formatMonth(value?: string | Date | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return MONTH_FORMAT.format(date);
}

/** "Mar 2025 — Present" / "Mar 2025 — Apr 2026" / "Mar 2025". */
export function formatDateRange(
  start?: string | Date | null,
  end?: string | Date | null,
  current?: boolean,
): string {
  const from = formatMonth(start);
  const to = current ? 'Present' : formatMonth(end);
  if (from && to) return `${from} — ${to}`;
  return from || to || '';
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

/** Client-side slug helper (mirrors the server's slugify). */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

/** Convert a #rgb/#rrggbb colour to rgba() with the given alpha. */
export function hexToRgba(hex: string, alpha: number): string {
  const value = hex.trim();
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (!match) return value;
  let raw = match[1];
  if (raw.length === 3) raw = raw.split('').map((c) => c + c).join('');
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Initials for avatars / placeholders. */
export function initials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Read a query string parameter from the current location. */
export function readQueryParam(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(key);
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

/** Human-readable relative time such as "3 days ago". */
export function timeAgo(value?: string | Date | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  const table: Array<[number, string]> = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.345, 'week'],
    [12, 'month'],
  ];
  let unit = 'second';
  let count = seconds;
  for (const [size, name] of table) {
    if (Math.abs(count) < size) {
      unit = name;
      break;
    }
    count /= size;
    unit = name;
  }
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  return formatter.format(Math.round(count), unit as Intl.RelativeTimeFormatUnit);
}
