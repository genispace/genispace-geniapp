import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Resolves opaque entity ids (e.g. `cust_123`) to human-readable names in batch,
 * with an internal cache so a given id is fetched at most once. Pair it with
 * {@link EntityRef} to render references as "name" instead of raw ids.
 *
 * The `resolver` receives the de-duplicated set of ids that aren't cached yet and
 * returns a `{ id: name }` map; ids missing from the map are remembered as
 * "resolved to nothing" so they aren't retried on every render.
 */
export interface UseEntityNamesResult {
  /** Cached display name for `id`, or `undefined` until resolved (or if unknown). */
  resolve: (id: string) => string | undefined;
  /** Queue ids for resolution; already-cached/in-flight ids are skipped. */
  ensure: (ids: ReadonlyArray<string>) => void;
  /** True while at least one batch is in flight. */
  loading: boolean;
}

export function useEntityNames(
  resolver: (ids: string[]) => Promise<Record<string, string>>
): UseEntityNamesResult {
  // `version` bumps to force a re-render when the cache mutates; the cache and the
  // in-flight set live in refs so they survive renders without being deps.
  const cache = useRef<Map<string, string | undefined>>(new Map());
  const inFlight = useRef<Set<string>>(new Set());
  const pending = useRef<Set<string>>(new Set());
  const flushHandle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setVersion] = useState(0);
  const [loadingCount, setLoadingCount] = useState(0);

  // Keep the latest resolver without making `ensure` change identity each render.
  const resolverRef = useRef(resolver);
  resolverRef.current = resolver;

  const flush = useCallback(async () => {
    flushHandle.current = null;
    const batch = Array.from(pending.current);
    pending.current.clear();
    if (batch.length === 0) return;

    batch.forEach((id) => inFlight.current.add(id));
    setLoadingCount((c) => c + 1);
    try {
      const map = await resolverRef.current(batch);
      // Record every requested id — even ones absent from the result — so unknown
      // ids resolve to `undefined` permanently instead of refetching forever.
      batch.forEach((id) => cache.current.set(id, map[id]));
    } catch {
      // On failure, drop the ids from the cache so a later ensure() can retry.
      batch.forEach((id) => cache.current.delete(id));
    } finally {
      batch.forEach((id) => inFlight.current.delete(id));
      setLoadingCount((c) => Math.max(0, c - 1));
      setVersion((v) => v + 1);
    }
  }, []);

  const ensure = useCallback(
    (ids: ReadonlyArray<string>) => {
      let added = false;
      for (const id of ids) {
        if (!id) continue;
        if (cache.current.has(id) || inFlight.current.has(id) || pending.current.has(id)) continue;
        pending.current.add(id);
        added = true;
      }
      if (!added) return;
      // Batch synchronous bursts of ensure() into one resolver call.
      if (flushHandle.current === null) {
        flushHandle.current = setTimeout(() => void flush(), 0);
      }
    },
    [flush]
  );

  useEffect(() => {
    return () => {
      if (flushHandle.current !== null) clearTimeout(flushHandle.current);
    };
  }, []);

  const resolve = useCallback((id: string): string | undefined => cache.current.get(id), []);

  return { resolve, ensure, loading: loadingCount > 0 };
}

export interface EntityRefProps {
  /** The raw entity id being referenced. */
  value: string;
  /** Resolved display name; when undefined the ref renders a muted `value`. */
  name?: string;
  /** Render as a link to this href (takes precedence over `onClick`). */
  href?: string;
  /** Render as a button invoking this handler when there is no `href`. */
  onClick?: () => void;
  /** Shown when `name` is undefined, before falling back to `value`. */
  fallback?: ReactNode;
  className?: string;
}

/**
 * Renders an entity reference as its display name (with an optional link/button),
 * falling back to a muted raw id while the name is unresolved. i18n-agnostic:
 * the caller supplies `name`/`fallback`; only layout symbols are hardcoded.
 */
export function EntityRef({ value, name, href, onClick, fallback, className }: EntityRefProps) {
  const resolved = name !== undefined;
  const content: ReactNode = resolved ? name : (fallback ?? value);
  const baseClass = resolved ? '' : 'text-muted-foreground';
  const merged = className ? `${baseClass} ${className}`.trim() : baseClass || undefined;

  if (href) {
    return (
      <a
        href={href}
        onClick={onClick}
        className={
          merged ? `${merged} underline-offset-2 hover:underline` : 'underline-offset-2 hover:underline'
        }
      >
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={
          merged
            ? `${merged} underline-offset-2 hover:underline`
            : 'underline-offset-2 hover:underline'
        }
      >
        {content}
      </button>
    );
  }

  return <span className={merged}>{content}</span>;
}
