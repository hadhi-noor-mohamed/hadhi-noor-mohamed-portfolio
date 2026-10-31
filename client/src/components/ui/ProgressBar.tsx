import { cn } from '@/lib/utils';

export function ProgressBar({
  value,
  label,
  className,
  showValue = false,
}: {
  value: number;
  label?: string;
  className?: string;
  showValue?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('space-y-1', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs">
          {label ? <span style={{ color: 'var(--muted)' }}>{label}</span> : <span />}
          {showValue ? <span className="font-semibold">{clamped}%</span> : null}
        </div>
      )}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: 'color-mix(in srgb, var(--muted) 22%, transparent)' }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${clamped}%`, backgroundImage: 'linear-gradient(90deg, var(--brand-primary), var(--brand-accent))' }}
        />
      </div>
    </div>
  );
}
