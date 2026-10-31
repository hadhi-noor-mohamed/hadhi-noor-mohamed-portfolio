import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: ReactNode;
}

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn('flex flex-wrap gap-1 rounded-xl border p-1', className)} style={{ borderColor: 'var(--border)' }}>
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn('flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors', !active && 'opacity-75 hover:opacity-100')}
            style={active ? { backgroundColor: 'color-mix(in srgb, var(--brand-primary) 18%, transparent)', color: 'var(--text)' } : { color: 'var(--muted)' }}
          >
            {item.icon}
            {item.label}
            {item.badge}
          </button>
        );
      })}
    </div>
  );
}
