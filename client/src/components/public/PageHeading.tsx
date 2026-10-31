import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface Breadcrumb {
  label: string;
  href?: string;
}

/**
 * Consistent page intro used by the standalone (non-home) public pages:
 * optional breadcrumbs, an eyebrow label, the page title and a description.
 */
export function PageHeading({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
}) {
  return (
    <header className="relative pt-12 pb-8 sm:pt-16">
      <div className="container-page">
        {breadcrumbs?.length ? (
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
              {breadcrumbs.map((crumb, index) => (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                  {index > 0 ? <ChevronRight className="h-3.5 w-3.5 opacity-50" aria-hidden="true" /> : null}
                  {crumb.href ? (
                    <Link to={crumb.href} className="hover:underline">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current="page">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--brand-primary)' }}>
            {eyebrow}
          </p>
        ) : null}

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
            {description ? (
              <p className="mt-3 text-base" style={{ color: 'var(--muted)' }}>
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
    </header>
  );
}
