import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { mode, setMode, cycleMode } = useTheme();

  if (compact) {
    const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor;
    return (
      <button
        type="button"
        onClick={cycleMode}
        className={cn('btn btn-ghost btn-sm', className)}
        aria-label={`Theme: ${mode}. Click to change.`}
        title={`Theme: ${mode}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>
    );
  }

  const options: Array<{ id: 'light' | 'dark' | 'system'; label: string; Icon: typeof Sun }> = [
    { id: 'light', label: 'Light', Icon: Sun },
    { id: 'dark', label: 'Dark', Icon: Moon },
    { id: 'system', label: 'System', Icon: Monitor },
  ];

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className={cn('inline-flex items-center gap-0.5 rounded-full border p-0.5', className)}
      style={{ borderColor: 'var(--border)' }}
    >
      {options.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setMode(id)}
          aria-pressed={mode === id}
          title={label}
          className={cn('flex h-8 w-8 items-center justify-center rounded-full transition-colors', mode === id ? 'text-[var(--text)]' : 'opacity-60 hover:opacity-100')}
          style={mode === id ? { backgroundColor: 'color-mix(in srgb, var(--brand-primary) 22%, transparent)' } : undefined}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}
