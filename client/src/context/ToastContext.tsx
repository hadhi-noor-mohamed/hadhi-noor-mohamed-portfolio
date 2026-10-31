/* eslint-disable react-refresh/only-export-components -- context modules intentionally export a provider and its hook */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  push: (kind: ToastKind, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const ICONS: Record<ToastKind, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = makeId();
      setToasts((current) => [...current.slice(-4), { id, kind, message }]);
      window.setTimeout(() => dismiss(id), kind === 'error' ? 6500 : 4200);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      dismiss,
      success: (message: string) => push('success', message),
      error: (message: string) => push('error', message),
      info: (message: string) => push('info', message),
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[120] flex flex-col items-center gap-2 p-4 sm:items-end"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.kind];
          return (
            <div
              key={toast.id}
              role="status"
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-3 shadow-lg backdrop-blur',
                'animate-[toast-in_180ms_ease-out]',
                toast.kind === 'success' && 'border-emerald-500/40 bg-emerald-500/10',
                toast.kind === 'error' && 'border-red-500/40 bg-red-500/10',
                toast.kind === 'info' && 'border-[var(--border)] bg-[var(--surface-strong)]',
              )}
              style={{ color: 'var(--text)' }}
            >
              <Icon
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  toast.kind === 'success' && 'text-emerald-400',
                  toast.kind === 'error' && 'text-red-400',
                  toast.kind === 'info' && 'text-[var(--brand-accent)]',
                )}
                aria-hidden="true"
              />
              <p className="flex-1 text-sm">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded p-0.5 opacity-70 transition hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
