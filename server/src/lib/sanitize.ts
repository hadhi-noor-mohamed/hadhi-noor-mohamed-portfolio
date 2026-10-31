import sanitizeHtmlLib from 'sanitize-html';
import { marked } from 'marked';

/**
 * Rich-text (HTML) sanitisation.
 *
 * The admin "about" editor and other HTML fields are stored sanitised so that
 * every consumer can render them safely. Only a conservative allow-list of
 * formatting tags/attributes survives; scripts, event handlers, iframes and
 * javascript: URLs are removed.
 */
const RICH_TEXT_OPTIONS: sanitizeHtmlLib.IOptions = {
  allowedTags: [
    'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
    'a', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    span: ['class'],
    div: ['class'],
    code: ['class'],
    pre: ['class'],
    th: ['colspan', 'rowspan'],
    td: ['colspan', 'rowspan'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href'],
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href ?? '';
      const isExternal = /^https?:\/\//i.test(href);
      return {
        tagName,
        attribs: {
          ...attribs,
          ...(isExternal ? { target: '_blank', rel: 'noopener noreferrer nofollow' } : {}),
        },
      };
    },
  },
  disallowedTagsMode: 'discard',
};

export function sanitizeRichText(html: string): string {
  return sanitizeHtmlLib(html ?? '', RICH_TEXT_OPTIONS);
}

/** Strict sanitisation for markdown output — no attributes beyond links/code. */
export function sanitizeMarkdownHtml(html: string): string {
  return sanitizeHtmlLib(html ?? '', {
    allowedTags: [
      'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 's', 'del',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'figure', 'figcaption',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      code: ['class'],
      pre: ['class'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href ?? '';
        const isExternal = /^https?:\/\//i.test(href);
        return {
          tagName,
          attribs: {
            ...attribs,
            ...(isExternal ? { target: '_blank', rel: 'noopener noreferrer nofollow' } : {}),
          },
        };
      },
      img: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, loading: 'lazy' },
      }),
    },
  });
}

/** Convert markdown → sanitised HTML. Used for blog and journey content. */
export function renderMarkdown(markdown: string): string {
  const raw = marked.parse(markdown ?? '', { async: false, gfm: true, breaks: true }) as string;
  return sanitizeMarkdownHtml(raw);
}

/** Strip all HTML — for plain-text fields such as excerpts and meta descriptions. */
export function stripHtml(input: string): string {
  return sanitizeHtmlLib(input ?? '', { allowedTags: [], allowedAttributes: {} }).trim();
}

/** Escape a value for safe interpolation into an HTML text node. */
export function escapeHtml(input: string): string {
  return (input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Approximate reading time in minutes from a markdown string. */
export function estimateReadingMinutes(markdown: string): number {
  const words = stripHtml(markdown).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
