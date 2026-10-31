import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { PublishState } from '@/types/api';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
  icon?: ReactNode;
}

const VARIANTS: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: '',
  primary: 'badge-primary',
  success: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400',
  warning: 'border-amber-500/40 bg-amber-500/15 text-amber-400',
  danger: 'border-red-500/40 bg-red-500/15 text-red-400',
  info: 'border-sky-500/40 bg-sky-500/15 text-sky-400',
  muted: 'opacity-75',
};

export function Badge({ variant = 'default', icon, className, children, ...rest }: BadgeProps) {
  return (
    <span className={cn('badge', VARIANTS[variant], className)} {...rest}>
      {icon}
      {children}
    </span>
  );
}

const STATE_LABELS: Record<PublishState, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
  SCHEDULED: 'Scheduled',
};

const STATE_VARIANTS: Record<PublishState, NonNullable<BadgeProps['variant']>> = {
  DRAFT: 'muted',
  PUBLISHED: 'success',
  ARCHIVED: 'warning',
  SCHEDULED: 'info',
};

export function StateBadge({ state }: { state: PublishState }) {
  return <Badge variant={STATE_VARIANTS[state]}>{STATE_LABELS[state]}</Badge>;
}
