import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';

/** Standard header used at the top of every admin page. */
export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** A titled card block. */
export function AdminSection({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn('p-5', className)}>
      {title || actions ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <h2 className="text-lg font-semibold">{title}</h2> : null}
            {description ? (
              <p className="mt-0.5 text-sm" style={{ color: 'var(--muted)' }}>
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={contentClassName}>{children}</div>
    </Card>
  );
}

/** Compact metric tile for dashboards. */
export function StatCard({
  label,
  value,
  icon,
  hint,
  href,
}: {
  label: string;
  value: number | string;
  icon?: ReactNode;
  hint?: string;
  href?: string;
}) {
  const body = (
    <Card interactive={Boolean(href)} className="flex h-full flex-col gap-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          {label}
        </span>
        {icon ? (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 14%, transparent)', color: 'var(--brand-primary)' }}
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
      </div>
      <span className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</span>
      {hint ? (
        <span className="text-xs" style={{ color: 'var(--muted)' }}>
          {hint}
        </span>
      ) : null}
    </Card>
  );
  if (href) {
    return (
      <a href={href} className="block focus-visible:outline-none">
        {body}
      </a>
    );
  }
  return body;
}

/** Horizontal toolbar for filters. */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mb-5 flex flex-wrap items-center gap-2', className)}>{children}</div>;
}

/** Responsive wrapper for tables. */
export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto rounded-xl border', className)} style={{ borderColor: 'var(--border)' }}>
      {children}
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn('whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide', className)}
      style={{ color: 'var(--muted)' }}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn('px-3 py-3 align-middle text-sm', className)}>{children}</td>;
}

/** Row action cluster. */
export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-1.5">{children}</div>;
}

/** A small labelled value used in detail panes. */
export function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-sm">{children}</dd>
    </div>
  );
}
