import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center',
        className,
      )}
      style={{ borderColor: 'var(--border)' }}
    >
      {icon ? (
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 16%, transparent)', color: 'var(--brand-primary)' }}
          aria-hidden="true"
        >
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-md text-sm" style={{ color: 'var(--muted)' }}>
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
