import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  elevated?: boolean;
  flat?: boolean;
  as?: 'div' | 'article' | 'section' | 'li';
}

export function Card({ interactive, elevated, flat, as = 'div', className, children, ...rest }: CardProps) {
  const Tag = as as ElementType;
  return (
    <Tag
      className={cn('card p-5', interactive && 'card-hover', elevated && 'card-elevated', flat && 'card-flat', className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-3 flex items-start justify-between gap-3', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-semibold', className)} {...rest}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm', className)} style={{ color: 'var(--muted)' }} {...rest}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('text-sm', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mt-4 flex items-center gap-2', className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  align = 'left',
  children,
}: {
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  children?: ReactNode;
}) {
  return (
    <div className={cn('mb-8 max-w-3xl', align === 'center' && 'mx-auto text-center')}>
      <h2 className="text-3xl font-bold sm:text-4xl">{title}</h2>
      {subtitle ? (
        <p className="mt-3 text-base" style={{ color: 'var(--muted)' }}>
          {subtitle}
        </p>
      ) : null}
      {children}
    </div>
  );
}
