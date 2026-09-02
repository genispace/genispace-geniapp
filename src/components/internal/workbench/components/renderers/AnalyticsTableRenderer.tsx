import React, { useMemo, useRef, useState } from 'react';
import { cn } from '@genispace/shared-utils';
import { Skeleton } from '../skeleton';
import { Search, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DatabaseDataSourceConfig } from '@/types/databaseDataSource';
import type { ComponentParameterConfig } from '@/types/parameters';
import { useWorkbenchConfigLocale } from '@/contexts/WorkbenchConfigLocaleContext';
import { useGrid24FillCell } from '@/components/grid24CellContext';
import { useComponentCommunication } from '@/hooks/useComponentCommunication';
import { useMobileFlowLayout } from '@/components/mobileFlowLayoutContext';
import { useStickyHeaderClone } from './shared/useStickyHeaderClone';
import { TableEmptyStateWithChromeInsets } from './shared/TableEmptyStateWithChromeInsets';
import { useBoundRows } from './data/useBoundRows';
import {
  renderSwCell,
  formatSwValue,
  matchColorRule,
  type ColorRule,
  type SwCellProps,
  type SwCellType,
  type SwCellFormat,
} from './cells/swCells';

const n = (v: unknown): number => { const x = Number(v); return Number.isFinite(x) ? x : NaN; };

// The frozen index (#) column needs a known width so the sticky label column can be offset by
// exactly that amount (keeping both frozen on the left when the table scrolls horizontally). The
// width is computed from the largest row number's digit count — see `indexColWidth` below.
// `pad` = the index cell's horizontal padding (px). The floor (2*pad + 12) and the per-digit growth
// both account for it so a smaller pad genuinely lets the column get narrower. pad=8 reproduces the
// historical Math.max(28, 16 + digits*8).
const indexWidthForDigits = (digits: number, pad: number): number =>
  Math.max(2 * pad + 12, 2 * pad + digits * 8);

/** Value shown in the `#` index column when `indexField` is set: integers stay as-is, one decimal
 *  for fractional numbers, NULL/empty/non-numeric → '—'. */
const formatIndexValue = (v: unknown): string | number => {
  if (v === null || v === undefined || v === '') return '—';
  const x = Number(v);
  if (!Number.isFinite(x)) return '—';
  return Number.isInteger(x) ? x : x.toFixed(1);
};

const DOT_HEX: Record<string, string> = {
  'indigo-500': '#6366f1', 'emerald-500': '#10b981', 'violet-500': '#8b5cf6',
  'amber-500': '#f59e0b', 'rose-500': '#f43f5e', 'sky-500': '#0ea5e9',
};
const dotHex = (c?: string): string => (c ? DOT_HEX[c] || c : '#6366f1');

interface PillItem { value: string; label: unknown; color?: string; filter?: { field: string; eq: unknown } }


export type DerivedField =
  | { as: string; kind: 'shareOfTotal'; field: string; ifMissing?: boolean } // = field / SUM(field) * 100
  | { as: string; kind: 'subtract'; a: string; b: string };                  // = a - b


export interface AnalyticsColumn {
  key: string;
  label?: unknown;            
  align?: 'left' | 'right' | 'center';
  sticky?: boolean;           
  sortField?: string;         
  headerColor?: string;       
  kind: 'label' | 'text' | SwCellType;
  field?: string;
  format?: SwCellFormat;
  muted?: boolean;
  /** Fixed column width — a px number or any CSS width string. Applied as width/min/max so the
   *  default `table-layout:auto` honors it (browsers treat a bare `width` as a hint and may grow it). */
  width?: number | string;
  cellProps?: SwCellProps;
  rowMarker?: boolean;
  /** Threshold -> text color for `text` cells (e.g. SMI% >= 100 -> emerald). */
  colorRules?: ColorRule[];
  /** Render this column only while one of these quick-filter pills is active
   *  (e.g. the live-share column exists only under the 'live' pill). Unset = always shown. */
  showForPills?: string[];
}

export interface AnalyticsTableRendererProps {
  id?: string;
  dimLabel?: unknown; 
  databaseDataSourceConfig?: DatabaseDataSourceConfig | null;
  summaryDataSourceConfig?: DatabaseDataSourceConfig | null;
  componentParameterConfig?: ComponentParameterConfig;
  pageParams?: Record<string, unknown>;
  /**
   * Row search + quick-filter pills. When `pillParam` is set, selecting a pill re-queries the
   * datasource with `{ [pillParam]: activePill.value }` (server-side filtering) instead of filtering
   * the already-loaded page rows; the pill's `filter` is then used only for row markers.
   */
  toolbar?: { search?: boolean; pills?: PillItem[]; pillParam?: string };
  rowMarkers?: boolean;
  maxHeight?: number;
  bare?: boolean; 
  
  mockData?: Record<string, unknown>[];
  useMockData?: boolean;
  
  columns?: AnalyticsColumn[];
  derivedFields?: DerivedField[];
  summaryLabel?: unknown;
  /** Show sub-values (LY line / diff-vs-baseline) in the summary (total) row. The summary datasource
   *  usually lacks the *_ly fields, leaving a dangling "LY —" under the total — turn this off to
   *  render main values only in the summary row. Body rows are unaffected. Default true. */
  summaryShowSub?: boolean;

  showIndex?: boolean;
  /** Hard width (px) of the leading `#` index column. Omit to auto-size by the largest row number's
   *  digit count (snug for a handful of rows, wider once indices reach 3+ digits). */
  indexWidth?: number;
  /** Horizontal padding (px) of the `#` index column cells (header/body/summary). Default 8 (px-2).
   *  Lower it to shrink the index column and pull the first data column left, reclaiming space. */
  indexPadX?: number;
  /** Row field displayed in the `#` index column instead of the positional row number (e.g. a
   *  datasource-computed `national_rank` — task #15 SA ranking: rank moves into the # slot and the
   *  separate sequence number is dropped). NULL/empty renders '—'; the column width auto-sizes to the
   *  field's largest digit count (a filtered view can show ranks higher than the row count). */
  indexField?: string;
  /** Label of the `#` index column header (localized via bi()). Default '#'. Task #15 SA ranking
   *  renames it to "Rank"; combined with indexField the header also becomes a sort toggle (asc/desc
   *  by the indexField value, same client-side sort as data columns). */
  indexLabel?: unknown;
  /** Override the width (px) of the first frozen label/dimension column. Lets tables on the shared
   *  default columns set just this width without redefining the whole column set. */
  labelWidth?: number;
  headerClassName?: string;
  indexHeaderClass?: string;
  headerColors?: Record<string, string>;
  zebra?: boolean;
  zebraClassName?: string;
  /** Highlight the row whose `field` equals a static `value` or a live bus param `valueParam`. */
  highlightRow?: { field: string; value?: string; valueParam?: string; badge?: unknown };
  /** Per-role content font sizes (px). Raise these for low-vision users; empty = readable defaults. */
  headerFontSize?: number; // header cells (default 13)
  cellFontSize?: number;   // body cells main text + search box (default 13)
  badgeFontSize?: number;  // filter pills / highlight badges (default 12)
  /** Mobile only: freeze the first column (sticky-left) AND pin the header below the FilterPanel
   *  on page scroll. Off by default — turn on only for wide/long tables (e.g. sales-detail by store). */
  freezeFirstColumn?: boolean;
  /** Row-fetch page size. These tables load the FULL result set and do search/sort/pagination
   *  client-side, so the runtime data endpoint's default Table page size (20) would silently
   *  truncate wide dims (e.g. 116 stores / 29 cities). Defaults to 1000 to load every row. */
  fetchLimit?: number;
  /** Wrap the first (label/dimension) column's text onto multiple lines instead of truncating with an
   *  ellipsis. Row height grows to fit; other columns stay aligned via the shared table row. Off by
   *  default (keeps the ellipsis behavior). Turn on for long store/city names (dashboard acceptance 0709 #8). */
  wrapLabel?: boolean;
}



// DEFAULT_DETAIL_COLUMNS removed (2026-06-30): the SW sales-detail column schema now lives in the
// workbench config (setup-workbench.js `DETAIL_COLUMNS`, passed per-table). This generic renderer no
// longer carries SW-specific columns — a table with no `columns` simply renders none.



const AnalyticsTableRenderer: React.FC<AnalyticsTableRendererProps> = ({
  id = 'detail-table',
  dimLabel,
  databaseDataSourceConfig,
  summaryDataSourceConfig,
  componentParameterConfig,
  pageParams = {},
  toolbar,
  rowMarkers = false,
  maxHeight = 420,
  bare = false,
  mockData,
  useMockData = false,
  columns,
  derivedFields,
  summaryLabel,
  summaryShowSub = true,
  showIndex = true,
  indexWidth,
  indexPadX,
  indexField,
  indexLabel,
  labelWidth,
  headerClassName = 'bg-slate-50 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400',
  indexHeaderClass = 'text-slate-400 dark:text-neutral-500',
  headerColors,
  zebra = true,
  // Opaque (not translucent) so frozen sticky cells — which must be opaque to occlude scrolled
  // columns — can use the exact same color and the frozen column blends seamlessly into the row.
  zebraClassName = 'bg-slate-50 dark:bg-neutral-900',
  highlightRow,
  headerFontSize,
  cellFontSize,
  badgeFontSize,
  freezeFirstColumn = false,
  fetchLimit = 1000,
  wrapLabel = false,
}) => {
  // Content font sizes (px) — 13px floor for header/body, 12px for badges; raise via props for
  // low-vision users. Applied inline so they override the table's Tailwind `text-xs` per element.
  const headerFs = headerFontSize ?? 13;
  const cellFs = cellFontSize ?? 13;
  const badgeFs = badgeFontSize ?? 12;
  const { resolveBilingualText: bi, language } = useWorkbenchConfigLocale();
  const { t } = useTranslation('renderers');
  // On mobile, drop the inner vertical scroll so the page scrolls vertically (avoids a nested 2-axis
  // scroll box that iOS lets you free-pan); only horizontal scroll is kept for the wide table.
  const isMobile = useMobileFlowLayout();
  const fillCell = useGrid24FillCell();
  const rowLabel = (r: Record<string, unknown>): string =>
    bi({ zh: r.label_zh, en: r.label_en }) || String(r.label ?? '');

  // Resolve the "current" value for row highlighting (static or from a live bus param).
  const { getCurrentParameter } = useComponentCommunication({
    componentId: `${id}-hl`,
    listenParameters: highlightRow?.valueParam ? [highlightRow.valueParam] : [],
    autoCleanup: true,
  });
  const highlightValue = highlightRow
    ? (highlightRow.value ?? (highlightRow.valueParam ? String(getCurrentParameter(highlightRow.valueParam) ?? '') : ''))
    : '';
  const isHighlightRow = (r: Record<string, unknown>): boolean =>
    !!highlightRow && highlightValue !== '' && highlightValue !== '__none__' && String(r[highlightRow.field] ?? '') === highlightValue;

  const baseColumns = columns && columns.length > 0 ? columns : [];
  // `labelWidth` overrides only the first frozen label/dimension column's width, so a table can size
  // it per-dimension while still inheriting the shared default columns.
  let effectiveColumns = labelWidth == null
    ? baseColumns
    : baseColumns.map(c => (c.kind === 'label' ? { ...c, width: labelWidth } : c));
  // freezeFirstColumn: guarantee the leading dimension/label column is sticky-left even if
  // the config didn't mark it sticky (e.g. sales-detail by store).
  if (freezeFirstColumn) {
    const idx = Math.max(0, effectiveColumns.findIndex(c => c.kind === 'label'));
    if (effectiveColumns[idx] && !effectiveColumns[idx].sticky) {
      effectiveColumns = effectiveColumns.map((c, i) => (i === idx ? { ...c, sticky: true } : c));
    }
  }

  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(toolbar?.pills?.[0]?.value ?? 'all');
  const [sortField, setSortField] = useState<string>('');
  const [sortAsc, setSortAsc] = useState(false);

  // Pill-gated columns: a column listing `showForPills` exists only while one of those pills is
  // active (e.g. the live-share column appears only under the 'live' pill, on no other table state).
  effectiveColumns = effectiveColumns.filter(c => !c.showForPills || c.showForPills.includes(pill));

  const pills = toolbar?.pills ?? [];
  const activePill = pills.find(p => p.value === pill);
  // When `pillParam` is configured, the selected pill filters SERVER-SIDE: its value is injected as a
  // query parameter so the datasource is re-queried (complete filtered set), instead of filtering the
  // already-loaded page rows. The pill's `filter` then only drives row markers.
  const serverPillFilter = !!toolbar?.pillParam;
  // Always request the full result set (client-side pagination). Without an explicit limit the data
  // endpoint caps Table fetches at 20 rows, dropping stores/cities beyond the first page.
  const rowsExtraParams: Record<string, unknown> = { limit: fetchLimit };
  if (serverPillFilter && toolbar?.pillParam && activePill) {
    rowsExtraParams[toolbar.pillParam] = activePill.value;
  }

  const { rows: fetchedRows, loading: fetchLoading } = useBoundRows(databaseDataSourceConfig, componentParameterConfig, pageParams, id, 'detail-rows', rowsExtraParams);
  const usingMock = useMockData && Array.isArray(mockData) && mockData.length > 0;
  const rows = usingMock ? (mockData as Record<string, unknown>[]) : fetchedRows;
  const loading = usingMock ? false : fetchLoading;
  // Summary shares rowsExtraParams (incl. the active server-side pill) so footer total = sum of the
  // filtered detail rows; without it, pill-filtered tables would show an all-rows total.
  const { rows: summaryRows } = useBoundRows(summaryDataSourceConfig, componentParameterConfig, pageParams, `${id}-sum`, 'detail-summary', rowsExtraParams);
  const summary = summaryRows[0];

  
  const derivedRows = useMemo(() => {
    if (!derivedFields || derivedFields.length === 0) return rows;
    const sums: Record<string, number> = {};
    for (const d of derivedFields) {
      if (d.kind === 'shareOfTotal') {
        sums[d.field] = rows.reduce((s, r) => s + (Number.isFinite(n(r[d.field])) ? n(r[d.field]) : 0), 0);
      }
    }
    return rows.map(r => {
      const out: Record<string, unknown> = { ...r };
      for (const d of derivedFields) {
        if (d.kind === 'shareOfTotal') {
          if (d.ifMissing && Number.isFinite(n(out[d.as]))) continue;
          const tot = sums[d.field] || 0;
          out[d.as] = tot > 0 ? Math.round((n(out[d.field]) / tot) * 1000) / 10 : 0;
        } else {
          out[d.as] = Math.round((n(out[d.a]) - n(out[d.b])) * 10) / 10;
        }
      }
      return out;
    });
  }, [rows, derivedFields]);

  const view = useMemo(() => {
    let r = derivedRows.slice();
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter(x => `${x.label_zh ?? ''} ${x.label_en ?? ''} ${x.label ?? ''}`.toLowerCase().includes(q));
    }
    if (!serverPillFilter && activePill?.filter) {
      const { field, eq } = activePill.filter;
      r = r.filter(x => x.is_subtotal || String(x[field] ?? '') === String(eq));
    }
    if (sortField) {
      r.sort((a, b) => {
        const av = n(a[sortField]); const bv = n(b[sortField]);
        const d = (Number.isFinite(av) ? av : -Infinity) - (Number.isFinite(bv) ? bv : -Infinity);
        return sortAsc ? d : -d;
      });
    }
    return r;
  }, [derivedRows, search, activePill, sortField, sortAsc, serverPillFilter]);

  const toggleSort = (f: string) => {
    if (sortField === f) setSortAsc(s => !s);
    else { setSortField(f); setSortAsc(false); }
  };

  const pillColorDot = (r: Record<string, unknown>): string | null => {
    if (!rowMarkers) return null;
    for (const p of pills) {
      if (p.color && p.filter && String(r[p.filter.field] ?? '') === String(p.filter.eq)) return p.color;
    }
    return null;
  };

  // Snug by default, widening only as the largest visible index gains digits. Computed (not left to
  // table-layout:auto) so `labelStickyLeft` below can offset the sticky label by the exact width.
  const indexPad = indexPadX ?? 8;
  // indexField: rank-like values can exceed the row count (e.g. national rank under a store filter),
  // so size the column from the field's largest digit count instead of view.length.
  const indexDigits = indexField
    ? Math.max(1, ...view.map(r => { const x = Number(r[indexField]); return Number.isFinite(x) ? String(Math.trunc(Math.abs(x))).length : 1; }))
    : String(Math.max(view.length, 1)).length;
  // A text header label (e.g. "Rank") plus the sort chevron needs more room than the rank digits.
  const indexLabelWidth = indexLabel != null ? 2 * indexPad + String(bi(indexLabel)).length * headerFs + 16 : 0;
  const indexColWidth = indexWidth ?? Math.max(indexWidthForDigits(indexDigits, indexPad), indexLabelWidth);
  // Bake the horizontal padding into indexColStyle so all three index cells (header/body/summary)
  // pick it up via their `...indexColStyle` spread; inline padding overrides the `px-2` class.
  const indexColStyle: React.CSSProperties = {
    width: indexColWidth,
    minWidth: indexColWidth,
    maxWidth: indexColWidth,
    paddingLeft: indexPad,
    paddingRight: indexPad,
  };
  // When the index column is shown it is frozen at left:0, so the sticky label column must
  // start after it (left: indexColWidth); otherwise the label freezes at the very left edge.
  const labelStickyLeft = showIndex ? indexColWidth : 0;
  // Per-column fixed width (width+min+max so `table-layout:auto` honors it) merged with the
  // sticky-left offset for frozen columns.
  const colStyle = (col: AnalyticsColumn): React.CSSProperties | undefined => {
    const s: React.CSSProperties = {};
    if (col.width != null) { s.width = col.width; s.minWidth = col.width; s.maxWidth = col.width; }
    if (col.sticky) s.left = labelStickyLeft;
    return Object.keys(s).length > 0 ? s : undefined;
  };

  const cellAlignClass = (col: AnalyticsColumn) =>
    cn(
      col.sticky && 'sticky z-10',
      col.align === 'center' ? 'whitespace-nowrap text-center'
        : col.align === 'left' || col.sticky ? 'text-left'
        : 'whitespace-nowrap text-right'
    );

  const renderCell = (col: AnalyticsColumn, r: Record<string, unknown>, hl = false): React.ReactNode => {
    if (col.kind === 'label') {
      const dot = col.rowMarker ? pillColorDot(r) : null;
      // Cap the content to the column width (minus the cell's px-2 padding) so a long label truncates
      // rather than stretching the column past its fixed `width` — under table-layout:auto a <td>
      // max-width is ignored for unbreakable text, so the cap has to live on the inner content.
      const contentMax = typeof col.width === 'number' ? Math.max(0, col.width - 16) : undefined;
      return (
        <span className={cn('flex items-center gap-1.5', col.align === 'center' && 'justify-center')} style={contentMax != null ? { maxWidth: contentMax } : undefined}>
          {dot && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: dotHex(dot) }} />}
          <span className={cn('min-w-0', wrapLabel ? 'whitespace-normal break-words leading-tight' : 'truncate', hl ? 'font-semibold text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-neutral-300')}>{rowLabel(r)}</span>
          {hl && highlightRow?.badge != null && (
            <span className="flex-shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-950/40 px-1.5 py-0.5 text-indigo-600 dark:text-indigo-300" style={{ fontSize: badgeFs }}>{bi(highlightRow.badge)}</span>
          )}
        </span>
      );
    }
    if (col.kind === 'text') {
      const raw = r[col.field ?? col.key];
      const txt = formatSwValue(raw, col.format ?? 'plain', 'CNY');
      const ruleColor = matchColorRule(raw, col.colorRules);
      return <span className={cn('tabular-nums', ruleColor ?? (col.muted ? 'text-slate-500 dark:text-neutral-400' : 'text-slate-700 dark:text-neutral-300'))}>{txt}</span>;
    }
    return renderSwCell(col.kind as SwCellType, col.cellProps ?? {}, r, col.field ?? col.key);
  };

  const stickyOverlayRef = useRef<HTMLDivElement>(null);
  const stickyCloneKey = `${language}|${headerFs}|${sortField}|${sortAsc}|${effectiveColumns.map(c => c.key).join(',')}`;
  // Mobile + freezeFirstColumn on: clone the header so it pins below the FilterPanel on scroll.
  useStickyHeaderClone({ enabled: isMobile && freezeFirstColumn, overlayRef: stickyOverlayRef, cloneKey: stickyCloneKey });

  // Guarantee a dark-mode header background/text even when a config-supplied `headerClassName` is
  // light-only (e.g. 'bg-slate-50 text-slate-500'). twMerge lets the config's own dark: variants
  // still win since headerClassName comes last — otherwise this opaque dark fallback applies.
  const headerCellClass = cn('dark:bg-neutral-800 dark:text-neutral-400', headerClassName);

  // Mobile: the empty-state "No data" badge floats (position:fixed) at the table's visible center;
  // without insets it can land over the sticky FilterPanel (top) or the fixed bottom tab nav. Feed it
  // the chrome insets so it stays inside the content area.
  const showEmptyState = !loading && view.length === 0;

  return (
    <div className={cn(fillCell && !isMobile && 'h-full flex flex-col min-h-0', bare ? '' : 'rounded-2xl border border-border bg-card p-3')}>
      {toolbar && (toolbar.search || pills.length > 0) && (
        <div className={cn('mb-2 space-y-2', fillCell && !isMobile && 'shrink-0')}>
          {toolbar.search && (
            <div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-neutral-800 px-3 py-1.5">
              <Search className="h-4 w-4 flex-shrink-0 text-slate-400 dark:text-neutral-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('analytics_table.search_store', 'Search store')}
                className="flex-1 bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-neutral-500"
                style={{ fontSize: cellFs }}
              />
            </div>
          )}
          {pills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {pills.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPill(p.value)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 transition-colors',
                    pill === p.value
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800'
                  )}
                  style={{ fontSize: badgeFs }}
                >
                  {p.color && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dotHex(p.color) }} />}
                  {bi(p.label)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isMobile && freezeFirstColumn && <div ref={stickyOverlayRef} aria-hidden />}
      <div
        className={cn('overflow-auto', isMobile && 'overscroll-x-contain', fillCell && !isMobile && 'flex-1 min-h-0')}
        style={isMobile ? undefined : fillCell ? undefined : { maxHeight }}
      >
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-20">
            <tr className={headerCellClass}>
              {showIndex && (
                <th
                  className={cn(
                    headerCellClass,
                    'sticky left-0 z-20 px-2 py-1.5 text-center font-medium',
                    indexHeaderClass,
                    indexField && 'cursor-pointer select-none',
                    indexField && sortField === indexField && 'text-indigo-600 dark:text-indigo-300'
                  )}
                  style={{ ...indexColStyle, fontSize: headerFs }}
                  onClick={indexField ? () => toggleSort(indexField) : undefined}
                >
                  <span className="inline-flex items-center justify-center gap-0.5">
                    {indexLabel != null ? bi(indexLabel) : '#'}
                    {indexField && (
                      sortField === indexField
                        ? (sortAsc
                            ? <ChevronUp className="h-3 w-3 shrink-0 text-indigo-500 dark:text-indigo-300" />
                            : <ChevronDown className="h-3 w-3 shrink-0 text-indigo-500 dark:text-indigo-300" />)
                        : <ChevronsUpDown className="h-3 w-3 shrink-0 text-slate-300 dark:text-neutral-600" />
                    )}
                  </span>
                </th>
              )}
              {effectiveColumns.map(col => {
                const isLabel = col.kind === 'label';
                const headerText = isLabel
                  ? (bi(col.label ?? dimLabel) || t('analytics_table.item', 'Item'))
                  : bi(col.label);
                const sortable = !!col.sortField;
                return (
                  <th
                    key={col.key}
                    className={cn(
                      headerCellClass,
                      'px-2 py-1.5 font-medium',
                      col.sticky && 'sticky z-20',
                      col.align === 'center' ? 'whitespace-nowrap text-center'
                        : col.align === 'left' || col.sticky ? 'text-left'
                        : 'whitespace-nowrap text-right',
                      sortable && 'cursor-pointer select-none',
                      sortable && sortField === col.sortField && 'text-indigo-600 dark:text-indigo-300',
                      col.headerColor ?? headerColors?.[col.key]
                    )}
                    style={{ ...colStyle(col), fontSize: headerFs }}
                    onClick={sortable ? () => toggleSort(col.sortField!) : undefined}
                  >
                    <span className={cn('inline-flex items-center gap-0.5', col.align === 'center' ? 'justify-center' : col.sticky || col.align === 'left' ? 'justify-start' : 'justify-end')}>
                      {headerText}
                      {sortable && (
                        sortField === col.sortField
                          ? (sortAsc
                              ? <ChevronUp className="h-3 w-3 shrink-0 text-indigo-500 dark:text-indigo-300" />
                              : <ChevronDown className="h-3 w-3 shrink-0 text-indigo-500 dark:text-indigo-300" />)
                          : <ChevronsUpDown className="h-3 w-3 shrink-0 text-slate-300 dark:text-neutral-600" />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-t border-slate-100 dark:border-neutral-800">
                  {showIndex && (
                    <td className="sticky left-0 z-10 bg-card px-2 py-1.5 text-center" style={indexColStyle}><Skeleton className="mx-auto h-3 w-3" /></td>
                  )}
                  {effectiveColumns.map((col, c) => (
                    <td key={col.key} className={cn('px-2 py-1.5', col.sticky && 'sticky z-10 bg-card')} style={colStyle(col)}>
                      {col.kind === 'label' || col.align === 'left' ? (
                        <Skeleton className="h-3.5" style={{ width: `${50 + ((i * 13 + c * 7) % 35)}%` }} />
                      ) : col.align === 'center' ? (
                        <Skeleton className="mx-auto h-3.5 w-12" />
                      ) : (
                        <Skeleton className="ml-auto h-3.5 w-12" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            {view.map((r, i) => {
              const isZebra = zebra && i % 2 === 1;
              const hl = isHighlightRow(r);
              // Frozen cells need an OPAQUE bg (to occlude scrolled columns) that matches the row's
              // backdrop. A `bare` table sits on the mobile component card (bg-white dark:bg-neutral-800,
              // NOT bg-card which is darker in dark mode), so an opaque non-zebra frozen cell must use
              // that same color or the frozen column reads darker than the rest of the row.
              const baseBg = bare ? 'bg-white dark:bg-neutral-800' : 'bg-card';
              const stickyBg = hl ? 'bg-indigo-50 dark:bg-indigo-950/30' : isZebra ? 'bg-slate-50 dark:bg-neutral-900' : baseBg;
              return (
                <tr key={String(r.row_key ?? i)} className={cn('border-t border-slate-100 dark:border-neutral-800', hl ? 'bg-indigo-50 dark:bg-indigo-950/30' : isZebra && zebraClassName)}>
                  {showIndex && (
                    <td
                      className={cn('sticky left-0 z-10 px-2 py-1.5 text-center tabular-nums', stickyBg, hl ? 'text-indigo-400 dark:text-indigo-300' : 'text-slate-300 dark:text-neutral-600', hl && 'border-l-2 border-indigo-400')}
                      style={{ ...indexColStyle, fontSize: cellFs }}
                    >{indexField ? formatIndexValue(r[indexField]) : i + 1}</td>
                  )}
                  {effectiveColumns.map(col => (
                    <td
                      key={col.key}
                      className={cn('px-2 py-1.5', cellAlignClass(col), col.sticky && stickyBg, hl && col.sticky && !showIndex && 'border-l-2 border-indigo-400')}
                      style={{ ...colStyle(col), fontSize: cellFs }}
                    >
                      {renderCell(col, r, hl)}
                    </td>
                  ))}
                </tr>
              );
            })}
            {!loading && view.length === 0 && (
              <tr>
                <td colSpan={effectiveColumns.length + (showIndex ? 1 : 0)} className="p-0">
                  <TableEmptyStateWithChromeInsets
                    floatBadge
                    avoidMobileChrome={isMobile}
                    chromeRemeasureKey={showEmptyState}
                    showHeader={false}
                    columns={effectiveColumns.length + (showIndex ? 1 : 0)}
                    rows={4}
                    minHeight={180}
                    title={t('analytics_table.no_data', 'No data')}
                    description={t('analytics_table.no_data_hint', 'No data for the current selection')}
                  />
                </td>
              </tr>
            )}
          </tbody>
          {summary && (
            <tfoot className="sticky bottom-0 z-20">
              <tr className="border-t-2 border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 font-semibold">
                {showIndex && <td className="sticky left-0 z-20 bg-slate-50 dark:bg-neutral-800 px-2 py-1.5 text-center text-slate-400 dark:text-neutral-500" style={{ ...indexColStyle, fontSize: cellFs }}>—</td>}
                {effectiveColumns.map(col => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-2 py-1.5',
                      col.sticky && 'sticky z-20 bg-slate-50 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300',
                      col.align === 'center' ? 'text-center'
                        : col.align === 'left' || col.sticky ? 'text-left'
                        : 'text-right'
                    )}
                    style={{ ...colStyle(col), fontSize: cellFs }}
                  >
                    {col.kind === 'label'
                      ? (bi(summaryLabel) || rowLabel(summary) || t('analytics_table.total', 'Total'))
                      : renderCell(
                          // summaryShowSub off → strip sub-value config so the total shows main values only
                          summaryShowSub || !col.cellProps
                            ? col
                            : { ...col, cellProps: { ...col.cellProps, subField: undefined, subKind: undefined, baselineField: undefined } },
                          summary,
                        )}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default AnalyticsTableRenderer;
