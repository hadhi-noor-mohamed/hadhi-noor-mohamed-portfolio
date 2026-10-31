import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cn('input', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, rows = 5, ...rest },
  ref,
) {
  return <textarea ref={ref} rows={rows} className={cn('textarea', className)} {...rest} />;
});

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, placeholder, className, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={cn('select', className)} {...rest}>
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
});

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-center gap-3', disabled && 'cursor-not-allowed opacity-60')}>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors',
          checked ? 'border-transparent' : 'border-[var(--border)]',
        )}
        style={{ backgroundColor: checked ? 'var(--brand-primary)' : 'color-mix(in srgb, var(--muted) 25%, transparent)' }}
      >
        <span
          className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', checked ? 'translate-x-6' : 'translate-x-1')}
        />
      </button>
      {(label || description) && (
        <span className="leading-tight">
          {label ? <span className="block text-sm font-medium">{label}</span> : null}
          {description ? (
            <span className="block text-xs" style={{ color: 'var(--muted)' }}>
              {description}
            </span>
          ) : null}
        </span>
      )}
    </label>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1', className)}>
      {label ? (
        <label className="label" htmlFor={htmlFor}>
          {label}
          {required ? <span className="ml-0.5 text-red-400">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? <p className="error-text">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}
