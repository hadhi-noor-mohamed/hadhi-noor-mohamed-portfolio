import { Link } from 'react-router-dom';
import { ArrowUp, ShieldCheck } from 'lucide-react';
import { useSite } from '@/context/SiteContext';
import { DynamicIcon } from '@/components/ui/Icon';

export function Footer() {
  const { profile, socialLinks, navigation, settings } = useSite();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t" style={{ borderColor: 'var(--border)', backgroundColor: 'color-mix(in srgb, var(--surface) 60%, transparent)' }}>
      <div className="container-page grid gap-10 py-12 md:grid-cols-3">
        <div>
          <p className="gradient-text text-lg font-semibold">{profile?.wordmark || profile?.fullName || 'Portfolio'}</p>
          <p className="mt-2 max-w-sm text-sm" style={{ color: 'var(--muted)' }}>
            {profile?.headline || settings?.siteDescription}
          </p>
          {profile?.location ? (
            <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
              {profile.location}
            </p>
          ) : null}
        </div>

        <nav aria-label="Footer">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Explore
          </p>
          <ul className="grid grid-cols-2 gap-1.5 text-sm">
            {navigation.map((item) => (
              <li key={item.id}>
                {item.isExternal ? (
                  <a href={item.href} target="_blank" rel="noreferrer" className="opacity-80 transition hover:opacity-100">
                    {item.label}
                  </a>
                ) : (
                  <Link to={item.href} className="opacity-80 transition hover:opacity-100">
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Connect
          </p>
          <ul className="flex flex-wrap gap-2">
            {socialLinks.map((link) => (
              <li key={link.id}>
                <a
                  href={link.url}
                  target={link.url.startsWith('http') ? '_blank' : undefined}
                  rel="noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  <DynamicIcon name={link.icon} className="h-4 w-4" />
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          {profile?.email ? (
            <a href={`mailto:${profile.email}`} className="mt-3 block text-sm opacity-80 hover:opacity-100">
              {profile.email}
            </a>
          ) : null}
        </div>
      </div>

      <div className="border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="container-page flex flex-col items-start justify-between gap-3 py-5 text-xs sm:flex-row sm:items-center" style={{ color: 'var(--muted)' }}>
          <p>
            © {year} {profile?.fullName || 'Hadhi Noor Mohamed H'}. {settings?.footerNote || 'Built with React, Express and PostgreSQL.'}
          </p>
          <div className="flex items-center gap-3">
            {settings?.privacyNote ? (
              <span className="inline-flex items-center gap-1" title={settings.privacyNote}>
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Privacy-respecting
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-1 hover:opacity-100"
            >
              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /> Back to top
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
