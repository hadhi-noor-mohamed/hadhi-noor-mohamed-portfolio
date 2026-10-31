import { useEffect } from 'react';

export interface SeoOptions {
  title?: string;
  description?: string;
  image?: string | null;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  robots?: string;
  /** When true, the title is used verbatim instead of being suffixed. */
  exact?: boolean;
}

const SITE_SUFFIX = 'Hadhi Noor Mohamed H';

function upsertMeta(selector: string, attr: 'name' | 'property', key: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertCanonical(href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}

/**
 * Imperative SEO helper usable outside of React (e.g. route loaders).
 * Every field is optional; only the supplied values are written.
 */
export function applySeo(options: SeoOptions): void {
  if (typeof document === 'undefined') return;
  const title = options.title ? (options.exact ? options.title : `${options.title} · ${SITE_SUFFIX}`) : SITE_SUFFIX;
  document.title = title;

  upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
  upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);

  if (options.description) {
    upsertMeta('meta[name="description"]', 'name', 'description', options.description);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', options.description);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', options.description);
  }
  if (options.image) {
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', options.image);
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', options.image);
    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  }
  upsertMeta('meta[property="og:type"]', 'property', 'og:type', options.type ?? 'website');
  const canonical = options.url ?? (typeof window !== 'undefined' ? window.location.href : '');
  if (canonical) {
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonical);
    upsertCanonical(canonical);
  }
  if (options.robots) {
    upsertMeta('meta[name="robots"]', 'name', 'robots', options.robots);
  }
}

/** React hook wrapper around {@link applySeo}. */
export function useSeo(options: SeoOptions, deps: unknown[] = []): void {
  useEffect(() => {
    applySeo(options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
