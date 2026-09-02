import type { TableAction, TableActionConfig } from '@/types';
import type { BilingualText } from '@/utils/workbenchDisplayLocale';

export type NavTileVariant = 'default' | 'compact' | 'outline';

/** Plain-string form of a bilingual value (zh preferred, then en) — for contexts that require a string. */
function navTilePlainText(v: BilingualText | undefined): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') return String(v.zh ?? v.en ?? '');
  return '';
}

/**
 * Inclusive range for the "columns per row" property. The minimum of 1 keeps
 * the layout single-column; the maximum of 24 matches the parent
 * `grid-24` container used by the workbench so a tile can never exceed
 * the surrounding grid's track count.
 */
export const MIN_NAV_TILE_COLUMNS = 1;
export const MAX_NAV_TILE_COLUMNS = 24;
/** Default column count when none is provided or the value is invalid. */
export const DEFAULT_NAV_TILE_COLUMNS = 2;

/** Allowed column count for a NavTile row, expressed as a numeric range. */
export type NavTileColumns = number;

export interface NavTileItem {
  id?: string;
  /** Plain string OR bilingual { zh, en } — resolved via resolveBilingualText at render time. */
  title: BilingualText;
  subtitle?: BilingualText;
  icon?: string;
  badge?: string;
  disabled?: boolean;
  targetPage?: string;
  parameterMapping?: TableActionConfig['parameterMapping'];
}

export interface NavTileProps {
  items?: NavTileItem[];
  columns?: NavTileColumns;
  gap?: number;
  /** Uniform height (px) for each nav tile; default 110 */
  itemHeight?: number;
  variant?: NavTileVariant;
  showArrow?: boolean;
  arrowIcon?: string;
  className?: string;
}

export const DEFAULT_NAV_TILE_ITEM_HEIGHT = 110;

/**
 * Maps a normalized column count to the matching Tailwind `grid-cols-*`
 * utility class. For 1–12 we use the standard utilities that ship with
 * Tailwind by default; for 13–24 we fall back to the arbitrary-value
 * form `grid-cols-[repeat(N,minmax(0,1fr))]` so the JIT scanner can still
 * detect the full class name. Every value in the supported range (1–24)
 * is listed as a complete string literal so it appears in the content
 * scan and is included in the final CSS bundle.
 */
const NAV_TILE_GRID_CLASS_BY_COLUMNS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  7: 'grid-cols-7',
  8: 'grid-cols-8',
  9: 'grid-cols-9',
  10: 'grid-cols-10',
  11: 'grid-cols-11',
  12: 'grid-cols-12',
  13: 'grid-cols-[repeat(13,minmax(0,1fr))]',
  14: 'grid-cols-[repeat(14,minmax(0,1fr))]',
  15: 'grid-cols-[repeat(15,minmax(0,1fr))]',
  16: 'grid-cols-[repeat(16,minmax(0,1fr))]',
  17: 'grid-cols-[repeat(17,minmax(0,1fr))]',
  18: 'grid-cols-[repeat(18,minmax(0,1fr))]',
  19: 'grid-cols-[repeat(19,minmax(0,1fr))]',
  20: 'grid-cols-[repeat(20,minmax(0,1fr))]',
  21: 'grid-cols-[repeat(21,minmax(0,1fr))]',
  22: 'grid-cols-[repeat(22,minmax(0,1fr))]',
  23: 'grid-cols-[repeat(23,minmax(0,1fr))]',
  24: 'grid-cols-[repeat(24,minmax(0,1fr))]',
};

export function normalizeNavTileItemHeight(height?: number): number {
  if (typeof height !== 'number' || !Number.isFinite(height) || height <= 0) {
    return DEFAULT_NAV_TILE_ITEM_HEIGHT;
  }
  return Math.round(height);
}

export function normalizeNavTileColumns(columns?: number): number {
  if (typeof columns !== 'number' || !Number.isFinite(columns)) {
    return DEFAULT_NAV_TILE_COLUMNS;
  }
  const rounded = Math.round(columns);
  if (rounded < MIN_NAV_TILE_COLUMNS) return MIN_NAV_TILE_COLUMNS;
  if (rounded > MAX_NAV_TILE_COLUMNS) return MAX_NAV_TILE_COLUMNS;
  return rounded;
}

export function resolveNavTileGridClass(columns: number): string {
  return NAV_TILE_GRID_CLASS_BY_COLUMNS[columns] ?? 'grid-cols-1';
}

export function resolveNavTileVariantClass(variant: NavTileVariant = 'default'): string {
  switch (variant) {
    case 'compact':
      return 'rounded-lg px-3 py-2.5 border border-border bg-card shadow-sm';
    case 'outline':
      return 'rounded-xl px-4 py-3 border border-border bg-card shadow-none';
    default:
      return 'rounded-xl px-4 py-3 border border-border bg-card shadow-sm';
  }
}

export function navTileItemToRecord(item: NavTileItem): Record<string, unknown> {
  return {
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    icon: item.icon,
    badge: item.badge,
    targetPage: item.targetPage,
  };
}

export function navTileItemToAction(item: NavTileItem, index: number): TableAction | null {
  if (!item.targetPage?.trim()) return null;
  return {
    id: item.id ?? `nav-tile-${index}`,
    label: navTilePlainText(item.title),
    type: 'navigate',
    icon: item.icon,
    config: {
      targetPage: item.targetPage,
      parameterMapping: item.parameterMapping,
    },
  };
}

export function getVisibleNavTileItems(items: NavTileItem[] = []): NavTileItem[] {
  return items.filter((item) => navTilePlainText(item.title).trim());
}
