import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import type { PageMeta } from '@/lib/api';

export function Pagination({ meta, onChange }: { meta: PageMeta; onChange: (page: number) => void }) {
  if (!meta || meta.totalPages <= 1) {
    return meta && meta.total > 0 ? (
      <p className="text-xs" style={{ color: 'var(--muted)' }}>
        {meta.total} item{meta.total === 1 ? '' : 's'}
      </p>
    ) : null;
  }

  const { page, totalPages, total } = meta;

  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
      <p className="text-xs" style={{ color: 'var(--muted)' }}>
        Page {page} of {totalPages} · {total} item{total === 1 ? '' : 's'}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          iconLeft={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          iconRight={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
