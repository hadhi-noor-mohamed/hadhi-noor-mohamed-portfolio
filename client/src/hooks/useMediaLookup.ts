import { useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { useAsync } from '@/hooks/useAsync';
import type { MediaDTO } from '@/types/api';

/**
 * Loads the media library once and exposes a lookup so forms can show the
 * currently-attached asset for a stored media id (the API returns ids only).
 */
export function useMediaLookup(pageSize = 100) {
  const query = useAsync<MediaDTO[]>(
    () => api.getList<MediaDTO>('/api/admin/media', { pageSize }).then((r) => r.items),
    [pageSize],
  );

  const map = useMemo(() => {
    const result = new Map<string, MediaDTO>();
    for (const asset of query.data ?? []) result.set(asset.id, asset);
    return result;
  }, [query.data]);

  const resolve = useCallback((id?: string | null) => (id ? map.get(id) ?? null : null), [map]);

  return { assets: query.data ?? [], map, resolve, loading: query.loading, reload: query.reload };
}
