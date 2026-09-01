import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
  Checkbox,
  useIsMobile,
} from '@genispace/geniapp/kit';

export type SortDir = 'asc' | 'desc';

/**
 * One column of a {@link ServerDataTable}. User-facing text is passed in by the
 * caller (i18n-agnostic). A column is sortable when `sortKey` is set; the table
 * then emits the server sort token `${sortKey}_${dir}` (e.g. `last_purchase_desc`),
 * which the datasource maps to a whitelisted `ORDER BY` via CASE.
 */
export interface ServerColumn<Row> {
  /** Stable column id (used for React keys). */
  key: string;
  /** Header content (already localized by the caller). */
  header: ReactNode;
  /** Server sort token base; presence makes the column sortable. */
  sortKey?: string;
  /** Cell renderer; defaults to the row's value at `key` stringified. */
  cell?: (row: Row) => ReactNode;
  className?: string;
  headClassName?: string;
}

export interface ServerDataTableLabels {
  empty: string;
  error: string;
  retry: string;
  previous: string;
  next: string;
  /** Localized "Page N" label; receives the 1-based page number. */
  page: (page: number) => string;
  /** Accessible label for ascending sort toggle. */
  sortAscLabel?: string;
  /** Accessible label for descending sort toggle. */
  sortDescLabel?: string;
  /** Accessible label for the header "select all on this page" checkbox. */
  selectAllLabel?: string;
  /** Accessible label for a per-row select checkbox. */
  selectRowLabel?: string;
}

export interface ServerDataTableProps<Row> {
  columns: ServerColumn<Row>[];
  /**
   * Fetch one page. Return up to `limit` rows; the table internally requests
   * `pageSize + 1` to detect "has more" without a COUNT query.
   */
  fetchRows: (args: { limit: number; offset: number; sort?: string }) => Promise<Row[]>;
  rowKey: (row: Row) => string;
  labels: ServerDataTableLabels;
  pageSize?: number;
  /**
   * When this value changes (e.g. the caller's search/filter state), pagination
   * resets to the first page. `fetchRows` should be memoized over the same deps.
   */
  resetKey?: unknown;
  initialSort?: { sortKey: string; dir: SortDir };
  onRowClick?: (row: Row) => void;
  emptyContent?: ReactNode;
  className?: string;
  /**
   * Enable a leading checkbox column for row selection. Off by default so every
   * existing usage is unchanged. When on, `selectedIds`/`onSelectionChange` make
   * the selection controlled by the caller (keyed by `rowKey`).
   */
  selectable?: boolean;
  /** Controlled set of selected row keys (only used when `selectable`). */
  selectedIds?: Set<string>;
  /** Called with the next selection whenever the user toggles a checkbox. */
  onSelectionChange?: (next: Set<string>) => void;
  /**
   * Mobile (H5) row renderer. When provided, the table falls back to a stacked
   * card list below the `sm` breakpoint instead of a horizontally-scrolling
   * `<table>` — the H5 pattern for entity lists (see 12-h5-mobile-design.md §2.3).
   * Receives the row; return the card body (the frame, tap target, selection
   * checkbox and pagination are supplied by the table). Desktop is unaffected.
   */
  mobileCard?: (row: Row) => ReactNode;
}

/** Stable empty selection so an uncontrolled (`selectable` off) table never reallocates. */
const EMPTY_SELECTION: Set<string> = new Set();

function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span aria-hidden className="ml-1 inline-flex text-[0.7em] leading-none text-muted-foreground">
      {active ? (dir === 'asc' ? '▲' : '▼') : '↕'}
    </span>
  );
}

/**
 * Server-paginated, server-sorted data table for managed datasources. Renders one
 * bounded page at a time (default 50 rows) — no client-side load-all, no COUNT.
 * Generic over the row shape; all labels are injected for i18n.
 */
export function ServerDataTable<Row>({
  columns,
  fetchRows,
  rowKey,
  labels,
  pageSize = 50,
  resetKey,
  initialSort,
  onRowClick,
  emptyContent,
  className,
  selectable = false,
  selectedIds,
  onSelectionChange,
  mobileCard,
}: ServerDataTableProps<Row>) {
  const isMobile = useIsMobile();
  const [pageIndex, setPageIndex] = useState(0);
  const [sort, setSort] = useState<{ sortKey: string; dir: SortDir } | null>(initialSort ?? null);
  const [rows, setRows] = useState<Row[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reqId = useRef(0);
  const sortToken = sort ? `${sort.sortKey}_${sort.dir}` : undefined;

  const runFetch = useCallback(async () => {
    const myId = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const fetched = await fetchRows({ limit: pageSize + 1, offset: pageIndex * pageSize, sort: sortToken });
      if (myId !== reqId.current) return;
      setHasMore(fetched.length > pageSize);
      setRows(fetched.slice(0, pageSize));
    } catch (e) {
      if (myId !== reqId.current) return;
      setError(e instanceof Error ? e.message : String(e));
      setRows([]);
      setHasMore(false);
    } finally {
      if (myId === reqId.current) setLoading(false);
    }
  }, [fetchRows, pageSize, pageIndex, sortToken]);

  useEffect(() => {
    void runFetch();
  }, [runFetch]);

  // Reset to the first page whenever the caller's filter/search state changes.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setPageIndex(0);
  }, [resetKey]);

  const toggleSort = useCallback((colSortKey: string) => {
    setPageIndex(0);
    setSort((prev) => {
      if (!prev || prev.sortKey !== colSortKey) return { sortKey: colSortKey, dir: 'asc' };
      if (prev.dir === 'asc') return { sortKey: colSortKey, dir: 'desc' };
      return null;
    });
  }, []);

  // Row selection (only active when `selectable`). Selection is controlled by the
  // caller; we derive page-level header state from the visible rows + rowKey.
  const selection = selectedIds ?? EMPTY_SELECTION;
  const pageKeys = rows.map((r) => rowKey(r));
  const selectedOnPage = pageKeys.filter((k) => selection.has(k)).length;
  const allPageSelected = pageKeys.length > 0 && selectedOnPage === pageKeys.length;
  const somePageSelected = selectedOnPage > 0 && !allPageSelected;

  const toggleRow = useCallback(
    (key: string) => {
      if (!onSelectionChange) return;
      const next = new Set(selection);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      onSelectionChange(next);
    },
    [onSelectionChange, selection]
  );

  const togglePage = useCallback(() => {
    if (!onSelectionChange) return;
    const next = new Set(selection);
    if (allPageSelected) {
      for (const k of pageKeys) next.delete(k);
    } else {
      for (const k of pageKeys) next.add(k);
    }
    onSelectionChange(next);
  }, [onSelectionChange, selection, allPageSelected, pageKeys]);

  // Shared inline states (identical in both table and card layouts).
  const loadingState =
    loading && rows.length === 0 ? (
      <div className="space-y-2 p-4" aria-busy>
        <div className="h-8 animate-pulse rounded bg-muted" />
        <div className="h-8 animate-pulse rounded bg-muted" />
        <div className="h-8 animate-pulse rounded bg-muted" />
      </div>
    ) : null;

  const errorState = error ? (
    <div className="flex flex-col items-center gap-2 p-8 text-center">
      <p className="text-sm text-destructive">{error}</p>
      <Button variant="outline" size="sm" onClick={() => void runFetch()}>
        {labels.retry}
      </Button>
    </div>
  ) : null;

  const emptyState =
    !loading && !error && rows.length === 0 ? (
      <div className="p-12 text-center text-sm text-muted-foreground">{emptyContent ?? labels.empty}</div>
    ) : null;

  const pagination =
    (pageIndex > 0 || hasMore) && !error ? (
      <div className="mt-3 flex items-center justify-end gap-2">
        <span className="text-sm text-muted-foreground">{labels.page(pageIndex + 1)}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={pageIndex === 0 || loading}
          onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
        >
          {labels.previous}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasMore || loading}
          onClick={() => setPageIndex((p) => p + 1)}
        >
          {labels.next}
        </Button>
      </div>
    ) : null;

  // H5 card-list layout: one tappable card per row instead of a scrolling table.
  if (isMobile && mobileCard) {
    return (
      <div className={className}>
        {selectable && rows.length > 0 ? (
          <label className="mb-2 flex min-h-[44px] items-center gap-2 px-1 text-sm text-muted-foreground">
            <Checkbox
              checked={allPageSelected ? true : somePageSelected ? 'indeterminate' : false}
              onCheckedChange={togglePage}
              aria-label={labels.selectAllLabel}
            />
            {labels.selectAllLabel}
          </label>
        ) : null}

        <div className="space-y-2">
          {rows.map((row) => {
            const key = rowKey(row);
            const interactive = Boolean(onRowClick);
            return (
              <div
                key={key}
                className={`flex items-start gap-3 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-sm${
                  interactive ? ' cursor-pointer transition-colors active:bg-accent/40' : ''
                }`}
                onClick={interactive ? () => onRowClick?.(row) : undefined}
              >
                {selectable ? (
                  <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selection.has(key)}
                      onCheckedChange={() => toggleRow(key)}
                      aria-label={labels.selectRowLabel}
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">{mobileCard(row)}</div>
              </div>
            );
          })}
        </div>

        {loadingState}
        {errorState}
        {emptyState}
        {pagination}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable ? (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allPageSelected ? true : somePageSelected ? 'indeterminate' : false}
                    onCheckedChange={togglePage}
                    disabled={rows.length === 0}
                    aria-label={labels.selectAllLabel}
                  />
                </TableHead>
              ) : null}
              {columns.map((c) => {
                const sortable = Boolean(c.sortKey);
                const active = sortable && sort?.sortKey === c.sortKey;
                return (
                  <TableHead key={c.key} className={c.headClassName}>
                    {sortable ? (
                      <button
                        type="button"
                        className="inline-flex items-center font-medium hover:text-foreground"
                        onClick={() => toggleSort(c.sortKey as string)}
                        aria-label={
                          active && sort?.dir === 'asc' ? labels.sortDescLabel : labels.sortAscLabel
                        }
                      >
                        {c.header}
                        <SortIndicator active={Boolean(active)} dir={active ? (sort as { dir: SortDir }).dir : 'asc'} />
                      </button>
                    ) : (
                      c.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const key = rowKey(row);
              return (
                <TableRow
                  key={key}
                  className={onRowClick ? 'cursor-pointer' : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {selectable ? (
                    <TableCell
                      className="w-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selection.has(key)}
                        onCheckedChange={() => toggleRow(key)}
                        aria-label={labels.selectRowLabel}
                      />
                    </TableCell>
                  ) : null}
                  {columns.map((c) => (
                    <TableCell key={c.key} className={c.className}>
                      {c.cell ? c.cell(row) : String((row as Record<string, unknown>)[c.key] ?? '—')}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Inline states keep the header/pagination chrome stable. */}
        {loadingState}
        {errorState}
        {emptyState}
      </div>

      {pagination}
    </div>
  );
}
