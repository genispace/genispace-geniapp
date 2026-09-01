import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseInfiniteRowsResult<Row> {
  rows: Row[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  /** Manually request the next page. */
  loadMore: () => void;
  /** Clear + reload from offset 0. */
  reset: () => void;
  /** Attach to a sentinel element at the list tail; auto-loads on intersect. */
  sentinelRef: (el: HTMLElement | null) => void;
}

/**
 * Accumulating infinite-scroll over a paginated fetcher. `fetchPage` returns up
 * to `limit` rows; when fewer than `limit` come back, there is no more data.
 * Pass a `resetKey` that changes when the query identity changes (e.g. a new
 * entity id or filter) to clear and reload from the top.
 */
export function useInfiniteRows<Row>(
  fetchPage: (args: { limit: number; offset: number }) => Promise<Row[]>,
  opts?: { pageSize?: number; resetKey?: unknown }
): UseInfiniteRowsResult<Row> {
  const pageSize = opts?.pageSize ?? 20;
  const resetKey = opts?.resetKey;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    const offset = offsetRef.current;
    try {
      const batch = await fetchRef.current({ limit: pageSize, offset });
      const got = Array.isArray(batch) ? batch : [];
      setRows((prev) => (offset === 0 ? got : [...prev, ...got]));
      offsetRef.current = offset + got.length;
      const more = got.length === pageSize;
      hasMoreRef.current = more;
      setHasMore(more);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      hasMoreRef.current = false;
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [pageSize]);

  const reset = useCallback(() => {
    offsetRef.current = 0;
    hasMoreRef.current = true;
    loadingRef.current = false;
    setRows([]);
    setHasMore(true);
    setError(null);
    void loadMore();
  }, [loadMore]);

  // Reload whenever the query identity changes.
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const sentinelRef = useCallback(
    (el: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (!el) return;
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries.some((en) => en.isIntersecting) && hasMoreRef.current && !loadingRef.current) {
            void loadMore();
          }
        },
        { rootMargin: '200px' }
      );
      observerRef.current.observe(el);
    },
    [loadMore]
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return { rows, loading, hasMore, error, loadMore, reset, sentinelRef };
}
