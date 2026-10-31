import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-label={label} className={cn('inline-flex items-center justify-center', className)}>
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
    </span>
  );
}

export function LoadingBlock({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-sm', className)} style={{ color: 'var(--muted)' }}>
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-lg', className)}
      style={{ backgroundColor: 'color-mix(in srgb, var(--muted) 18%, transparent)' }}
      aria-hidden="true"
    />
  );
}
