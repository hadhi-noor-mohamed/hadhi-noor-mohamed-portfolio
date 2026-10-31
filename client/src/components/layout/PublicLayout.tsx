import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { CommandPalette } from './CommandPalette';
import { usePageView } from '@/hooks/useAnalytics';
import { useSite } from '@/context/SiteContext';
import { Button } from '@/components/ui/Button';

export function PublicLayout() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  const { settings, error, loading, reload } = useSite();

  usePageView(location.pathname, settings?.analyticsEnabled ?? true);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
      if (event.key === '/' && !isTypingTarget(event.target)) {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="relative">
        <div className="aurora-bg" aria-hidden="true" />
        <Header onOpenCommandPalette={() => setPaletteOpen(true)} />
      </div>
      <main id="main" className="flex-1">
        {error && !loading ? (
          <div className="mx-auto mt-8 w-full max-w-3xl px-4" role="alert">
            <div
              className="rounded-2xl border p-5"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
              <p className="font-semibold">We couldn&apos;t load the site content.</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
                The content service is temporarily unavailable. No placeholder content is shown.
              </p>
              <Button size="sm" className="mt-4" onClick={() => void reload()}>
                Try again
              </Button>
            </div>
          </div>
        ) : null}
        <Outlet />
      </main>
      <Footer />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}
