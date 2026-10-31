import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MediaDTO } from '@/types/api';

/** Renders a media asset as an image, falling back to a labelled placeholder. */
export function MediaImage({
  media,
  alt,
  className,
  imgClassName,
  loading = 'lazy',
}: {
  media?: MediaDTO | null;
  alt?: string;
  className?: string;
  imgClassName?: string;
  loading?: 'lazy' | 'eager';
}) {
  const [failed, setFailed] = useState(false);

  if (!media || media.kind !== 'IMAGE' || failed) {
    return (
      <div
        className={cn('flex items-center justify-center', className)}
        style={{ backgroundColor: 'color-mix(in srgb, var(--muted) 12%, transparent)' }}
        aria-hidden="true"
      >
        <ImageOff className="h-6 w-6 opacity-40" />
      </div>
    );
  }

  return (
    <img
      src={media.url}
      alt={alt ?? media.alt ?? media.displayLabel ?? ''}
      loading={loading}
      onError={() => setFailed(true)}
      className={cn(className, imgClassName)}
    />
  );
}

export function Avatar({ media, name, className }: { media?: MediaDTO | null; name?: string; className?: string }) {
  if (media?.kind === 'IMAGE') {
    return <img src={media.url} alt={name ?? media.alt ?? ''} className={cn('object-cover', className)} />;
  }
  return (
    <div
      className={cn('flex items-center justify-center text-4xl font-bold', className)}
      style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 14%, transparent)' }}
      aria-hidden="true"
    >
      {name?.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')}
    </div>
  );
}
