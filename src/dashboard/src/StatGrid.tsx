import type { ReactNode } from 'react';

/** Desktop (lg+) column target. Mobile is always 2, tablet (sm) is `md ?? 3`. */
export type StatGridColumns = 2 | 3 | 4 | 5;

export interface StatGridProps {
  children: ReactNode;
  /**
   * Column count at the widest (`lg`) breakpoint. The grid is mobile-first:
   * 2 columns on phones (never 1 — see H5 design plan D1), an intermediate step
   * at `sm`, then `columns` at `lg`. Defaults to 4.
   */
  columns?: StatGridColumns;
  className?: string;
}

/**
 * Responsive KPI/stat card grid. Standardizes the "start at 2 columns on mobile,
 * scale up on wider screens" rule so no dashboard falls back to one-card-per-row
 * on phones. Gaps tighten on mobile (`gap-3`) and relax on desktop (`gap-4`).
 *
 * Pair with {@link KpiStatCard}. Example: `<StatGrid columns={4}>…5 cards…</StatGrid>`.
 */
const COLUMN_CLASS: Record<StatGridColumns, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
};

export function StatGrid({ children, columns = 4, className }: StatGridProps) {
  return (
    <div className={`grid gap-3 sm:gap-4 ${COLUMN_CLASS[columns]}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
