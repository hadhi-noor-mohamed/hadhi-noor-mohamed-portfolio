import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SectionTitle } from '@/components/ui/Card';
import type { PageSection } from '@/types/api';

const SPACING: Record<string, string> = {
  compact: 'py-10',
  normal: 'py-16',
  relaxed: 'py-24',
};

const BACKGROUNDS: Record<string, string> = {
  default: '',
  subtle: 'bg-[color-mix(in_srgb,var(--surface)_45%,transparent)]',
  aurora: 'relative',
};

/**
 * Renders a page section according to its page-builder configuration
 * (title, subtitle, description, background, spacing, layout).
 */
export function SectionShell({
  section,
  id,
  children,
  className,
  showTitle = true,
}: {
  section?: PageSection;
  id?: string;
  children: ReactNode;
  className?: string;
  showTitle?: boolean;
}) {
  const background = section?.background ?? 'default';
  const spacing = SPACING[section?.spacing ?? 'normal'] ?? SPACING.normal;

  return (
    <section
      id={id ?? section?.key}
      className={cn('scroll-mt-20', spacing, BACKGROUNDS[background] ?? '', className)}
      aria-labelledby={showTitle && section ? `${section.key}-title` : undefined}
    >
      {background === 'aurora' ? <div className="aurora-bg" aria-hidden="true" /> : null}
      <div className="container-page relative">
        {showTitle && section && (section.title || section.subtitle) ? (
          <div id={`${section.key}-title`}>
            <SectionTitle
              title={section.title || section.label}
              subtitle={section.subtitle}
              align={section.layout === 'centered' ? 'center' : 'left'}
            />
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}
