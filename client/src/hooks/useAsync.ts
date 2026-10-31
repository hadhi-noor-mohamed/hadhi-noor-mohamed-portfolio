import { useCallback, useEffect, useRef, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Runs an async function whenever `deps` change, exposing loading/error state
 * and a manual `reload`. Safe against out-of-order resolutions and unmounts.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
  options: { immediate?: boolean; initialData?: T | null } = {},
) {
  const { immediate = true, initialData = null } = options;
  const [state, setState] = useState<AsyncState<T>>({ data: initialData, loading: immediate, error: null });
  const requestId = useRef(0);
  const mounted = useRef(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    const id = ++requestId.current;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const result = await fnRef.current();
      if (id === requestId.current && mounted.current) {
        setState({ data: result, loading: false, error: null });
      }
      return result;
    } catch (error) {
      if (id === requestId.current && mounted.current) {
        setState((current) => ({ ...current, loading: false, error: error as Error }));
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    if (immediate) void run().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    ...state,
    reload: run,
    setData: (data: T | null) => setState((current) => ({ ...current, data })),
  };
}
