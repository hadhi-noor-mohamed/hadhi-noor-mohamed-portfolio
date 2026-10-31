import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  accent: 'btn-accent',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  link: 'bg-transparent underline-offset-4 hover:underline p-0',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'px-6 py-3 text-base',
  icon: 'h-9 w-9 !px-0',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, iconLeft, iconRight, fullWidth, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn('btn', VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  );
});
