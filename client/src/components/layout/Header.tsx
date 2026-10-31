import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Command, ExternalLink, Menu, X } from 'lucide-react';
import { useSite } from '@/context/SiteContext';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export function Header({ onOpenCommandPalette }: { onOpenCommandPalette: () => void }) {
  const { profile, navigation } = useSite();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isDesktop = useMediaQuery('(min-width: 900px)');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isDesktop) setMobileOpen(false);
  }, [isDesktop]);

  const brand = profile?.wordmark || profile?.fullName || 'Portfolio';

  return (
    <header
      className={cn(
        'site-header sticky top-0 z-50 border-b transition-colors',
        scrolled ? 'backdrop-blur-xl' : '',
      )}
      style={{
        borderColor: scrolled ? 'var(--border)' : 'transparent',
        backgroundColor: scrolled ? 'color-mix(in srgb, var(--surface) 88%, transparent)' : 'transparent',
      }}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-semibold" aria-label={`${brand} — home`}>
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ backgroundImage: 'linear-gradient(120deg, var(--brand-primary), var(--brand-accent))' }}
            aria-hidden="true"
          >
            {brand.slice(0, 1).toUpperCase()}
          </span>
          <span className="gradient-text text-base">{brand}</span>
        </Link>

        {isDesktop ? (
          <nav className="flex items-center gap-1" aria-label="Primary">
            {navigation.map((item) => {
              const active = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
              if (item.isExternal) {
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    target={item.openInNewTab ? '_blank' : undefined}
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)]"
                  >
                    {item.label}
                    <ExternalLink className="h-3 w-3 opacity-60" aria-hidden="true" />
                  </a>
                );
              }
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn('rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)]', active && 'font-semibold')}
                  style={active ? { color: 'var(--brand-primary)' } : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : null}

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="btn btn-outline btn-sm hidden sm:inline-flex"
            aria-label="Open command palette"
            title="Search (Ctrl+K)"
          >
            <Command className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-xs">Search</span>
            <kbd className="ml-1 rounded border px-1 text-[0.65rem]" style={{ borderColor: 'var(--border)' }}>
              Ctrl K
            </kbd>
          </button>
          <ThemeToggle compact />
          <Link to="/admin" className="btn btn-primary btn-sm hidden sm:inline-flex">
            Dashboard
          </Link>
          {!isDesktop ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setMobileOpen((open) => !open)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          ) : null}
        </div>
      </div>

      {mobileOpen && !isDesktop ? (
        <nav className="border-t" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-strong)' }} aria-label="Mobile">
          <div className="container-page flex flex-col py-3">
            {navigation.map((item) =>
              item.isExternal ? (
                <a key={item.id} href={item.href} target="_blank" rel="noreferrer" className="rounded-lg px-3 py-2.5 text-sm hover:bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)]">
                  {item.label}
                </a>
              ) : (
                <Link key={item.id} to={item.href} className="rounded-lg px-3 py-2.5 text-sm hover:bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)]">
                  {item.label}
                </Link>
              ),
            )}
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)]"
            >
              <Command className="h-4 w-4" aria-hidden="true" /> Search everything
            </button>
            <Link to="/admin" className="btn btn-primary mt-2">
              Open dashboard
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
