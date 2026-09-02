import { cn } from '@genispace/shared-utils';
import type { FilterPanelGridColumnCount, FilterPanelGridColumns } from '../../types/renderers';

const BASE: Record<FilterPanelGridColumnCount, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

const SM: Record<FilterPanelGridColumnCount, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  5: 'sm:grid-cols-5',
  6: 'sm:grid-cols-6',
};

const MD: Record<FilterPanelGridColumnCount, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-6',
};

const LG: Record<FilterPanelGridColumnCount, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
};

const XL: Record<FilterPanelGridColumnCount, string> = {
  1: 'xl:grid-cols-1',
  2: 'xl:grid-cols-2',
  3: 'xl:grid-cols-3',
  4: 'xl:grid-cols-4',
  5: 'xl:grid-cols-5',
  6: 'xl:grid-cols-6',
};

function clampCol(n: unknown, fallback: FilterPanelGridColumnCount): FilterPanelGridColumnCount {
  if (typeof n === 'number' && Number.isFinite(n)) {
    const v = Math.min(6, Math.max(1, Math.floor(n)));
    return v as FilterPanelGridColumnCount;
  }
  return fallback;
}

/**
 * Merges saved props with layout defaults: base=1, md=3 (legacy TableRenderer behavior).
 * Optional `sm` / `lg` / `xl` are only applied when set.
 */
export function mergeFilterPanelGridColumns(cols?: FilterPanelGridColumns) {
  return {
    base: clampCol(cols?.base, 1),
    sm: cols?.sm != null ? clampCol(cols?.sm, 1) : undefined,
    md: cols?.md != null ? clampCol(cols?.md, 3) : 3,
    lg: cols?.lg != null ? clampCol(cols?.lg, 1) : undefined,
    xl: cols?.xl != null ? clampCol(cols?.xl, 1) : undefined,
  };
}

/** Full Tailwind class list for the filter field grid. */
export function getFilterPanelGridClassName(cols?: FilterPanelGridColumns, narrowFlow?: boolean) {
  if (narrowFlow) {
    // Narrow flow (real mobile or studio phone frame): configured breakpoint values
    // express desktop intent, so skip sm/md/lg/xl variants and stack in one column.
    return cn('grid gap-4', 'grid-cols-1');
  }
  const m = mergeFilterPanelGridColumns(cols);
  return cn(
    'grid gap-4',
    BASE[m.base],
    m.sm != null ? SM[m.sm] : null,
    MD[m.md],
    m.lg != null ? LG[m.lg] : null,
    m.xl != null ? XL[m.xl] : null
  );
}
