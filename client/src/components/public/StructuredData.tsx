import { useEffect } from 'react';

/**
 * Injects a JSON-LD <script> into <head> for the lifetime of the component.
 * The payload is serialised so the effect only re-runs when the data changes.
 */
export function StructuredData({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data);

  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo', 'json-ld');
    script.text = json;
    document.head.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [json]);

  return null;
}
