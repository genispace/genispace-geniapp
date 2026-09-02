/**
 * Config schema for the generic, config-driven ProductReport component.
 *
 * Everything that used to be hardcoded for the Stuart Weitzman product dashboard
 * (dimension tabs, sub-tabs, summary cards, sort options, filter keys, table
 * columns, list-card layout, thumbnail color/emoji maps, detail navigation) is
 * expressed here so the same renderer can power any multi-dimensional, drillable
 * product / dimension report on the low-code platform.
 *
 * Card layout reuses {@link HeroRow}/{@link HeroBanner} from heroCardUtils; cell
 * value formatting reuses the heroCard / list formatters (see productCellRender).
 */
import type { BilingualText } from '@/utils/workbenchDisplayLocale';
import type { HeroBanner } from '@/renderers/hero-card/heroCardUtils';
import type { VisibleWhen } from '@/utils/visibleWhen';
import type { DatabaseDataSourceConfig } from '@/types/databaseDataSource';

export type { BilingualText, HeroBanner };

export type ProductReportViewMode = 'list' | 'table';
export type DimensionSource = 'primary' | 'dimension';

/** Number format vocabulary shared by summary cards and table cells. */
export type ReportValueFormat =
  | 'currency-compact' // ¥1.2M / HK$1.2K (per-row currency)
  | 'compact-k' // 1.2K / 1.2M (no currency symbol)
  | 'number' // 1,234 (integer, rounded)
  | 'percent1' // 12.3%
  | 'plain'; // raw value passthrough

/** One summary KPI card; reads a single field off the summary row. */
export interface SummaryCardConfig {
  key?: string;
  label: BilingualText;
  field: string;
  format?: ReportValueFormat;
  /** Row field holding the currency code (e.g. 'currency'); used by currency-compact. */
  currencyField?: string;
  /** Accent dot color. */
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';
  /** Per-card visibility rule (e.g. hide the discount card for store managers via role/app rules). */
  visibleWhen?: VisibleWhen;
}

/**
 * What happens when a dimension row is clicked: push `row[dimKeyField]` into a
 * filter-bus param, then optionally navigate to another tab / sub-tab.
 */
export interface DrillConfig {
  /** Filter-bus key (relative to filterComponentId) to receive row[dimKeyField]. */
  emitParam: string;
  /** 'csv' dedupe-appends a token; 'set' overwrites the single value. Default 'csv'. */
  mode?: 'csv' | 'set';
  then?:
    | { type: 'primaryTab'; key: string }
    | { type: 'subTab'; key: string }
    | { type: 'none' };
}

/** A sub-tab inside a dimension; selecting it drives `dimension`/`groupBy`. */
export interface SubTabConfig {
  key: string;
  label: BilingualText;
  /** Injected as the `{{dimension}}` query param. */
  dimension: string;
  /** Injected as the `{{groupBy}}` query param. */
  groupBy: string;
  /** Overrides the parent dimension drill for this sub-tab. */
  drill?: DrillConfig;
  /** Per-sub-tab visibility rule (e.g. hide the e-commerce tab for store managers via role/app rules). */
  visibleWhen?: VisibleWhen;
  /** Fixed width (px) for the frozen name column in table view; overrides the shared column config. */
  labelWidth?: number;
}

/** A primary tab. `source` selects which datasource feeds it. */
export interface DimensionConfig {
  key: string;
  label: BilingualText;
  /** 'primary' → databaseDataSourceConfig (PLU-like); 'dimension' → dimDataSourceConfig. */
  source: DimensionSource;
  /** Used when source==='dimension' and there are no sub-tabs. */
  dimension?: string;
  groupBy?: string;
  subTabs?: SubTabConfig[];
  /** Default drill for rows of this dimension; a sub-tab may override. */
  drill?: DrillConfig;
  /** Which sub-tab is active when entering this dimension. */
  defaultSubTab?: string;
  /** Field names to hide (table dataIndex + list-card item field) for this dimension across all its
   * sub-tabs — e.g. store dims have no store-level stock, so hide 'stock'/'stock_share_pct'. */
  hiddenFields?: string[];
  /** Fixed width (px) for the frozen name column in table view; a sub-tab's labelWidth takes precedence. */
  labelWidth?: number;
  /** Show a pinned footer total row (bound to totalRowDataSourceConfig) on this dimension's table —
   *  e.g. SW category/season/series tabs; the store dimension stays sales-only (no total). */
  showTotalRow?: boolean;
}

export interface SortOptionConfig {
  key: string;
  label: BilingualText;
  field: string;
  defaultDir?: 'asc' | 'desc';
}

/** Per filter-bus key: how chips are labelled and how text keys clear together. */
export interface FilterKeyConfig {
  key: string;
  kind: 'csv' | 'text';
  /** Per-value chip label map (e.g. status normal→Regular, channel fp→Full Price). */
  valueLabels?: Record<string, BilingualText>;
  /** Text keys sharing a group clear together (e.g. code + name). */
  textGroup?: string;
  /** csv tokens are not shown as chips when true (still counted as active). */
  excludeFromChips?: boolean;
}

/** Cell render vocabulary for report tables. */
export type ReportCellType =
  | 'text' // localized text (resolves dataIndex _zh/_en)
  | 'currency' // compact currency, per-row currencyField
  | 'number' // integer with thousands separators
  | 'percent' // n.d%
  | 'trend' // signed % with up/down arrow + color (MoM/YoY)
  | 'tag' // pill with value→label + value→tone maps
  | 'thumbnail' // composite: image|color+emoji + title + sub
  | 'colorDot' // swatch + localized label
  | 'discBadge'; // discount pill (×100) OR warn-below text + ⚠

export interface ReportCellProps {
  format?: ReportValueFormat;
  /** Per-row currency field (default 'currency'). */
  currencyField?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;

  // tag / colorDot
  /** value → hex (colorDot swatch) or tone token (tag). */
  colorMap?: Record<string, string>;
  /** value → display label. */
  textMap?: Record<string, BilingualText>;
  /** value → text tone token for tag. */
  toneMap?: Record<string, string>;

  // thumbnail (image + product-color swatch; failure falls back to a neutral
  // placeholder icon — no category-emoji rendering, so no emoji/category props).
  imageField?: string;
  colorField?: string;
  /** Colors that need a light border (e.g. white/beige). */
  lightColors?: string[];
  fallbackColor?: string;
  /** Composite title (locale base, resolves _zh/_en). */
  titleField?: string;
  /** Composite sub line (e.g. plu). */
  subField?: string;

  // discBadge
  /** Below this ratio (0..1) the pill turns rose; value shown as ×100 %. */
  discountThreshold?: number;
  /** Below this number the text turns rose and a ⚠ is appended. */
  warnBelow?: number;
}

export interface ReportColumn {
  dataIndex: string;
  title: BilingualText;
  align?: 'left' | 'right' | 'center';
  /** Sticky-left frozen column. */
  frozen?: boolean;
  minWidth?: number;
  maxWidth?: number;
  render?: { type: ReportCellType; props?: ReportCellProps };
}

/** One metric inside a list-card metric grid. */
export interface ReportMetricItem {
  label: BilingualText;
  field: string;
  format?: ReportValueFormat;
  currencyField?: string;
  decimals?: number;
  suffix?: string;
  /** 'value' plain; 'trend' signed arrow; 'warnPercent' n% reddened + ⚠ below warnBelow. */
  render?: 'value' | 'trend' | 'warnPercent';
  warnBelow?: number;
}

/** A row inside a list-card. Header rows (title/text/price) render beside the
 *  banner; body rows (metric-grid/trend-badges) render full-width below. */
export type ReportCardRow =
  | {
      type: 'title';
      titleField: string;
      statusField?: string;
      statusMap?: Record<string, { label?: BilingualText; tone?: string }>;
    }
  | {
      /** Join multiple localized fields on one line (e.g. color · season). */
      type: 'text';
      fields: string[];
      separator?: string;
      size?: 'xs' | 'sm' | 'base';
      muted?: boolean;
    }
  | {
      type: 'price-row';
      retailLabel?: BilingualText;
      retailField: string;
      sellingLabel?: BilingualText;
      sellingField: string;
      currencyField?: string;
      discountField?: string;
      discountThreshold?: number;
      /** Discount "off" mode: show (1 − ratio) × 100 as `X%off` instead of the ratio. */
      discountOff?: boolean;
      /** Optional discount title; when set the discount renders as a labeled block instead of a bare badge. */
      discountLabel?: BilingualText;
      /** Pre-formatted discount string field from the datasource (e.g. "37.0% off"). When present it is shown verbatim — the front-end does no computation. */
      discountTextField?: string;
    }
  | { type: 'metric-grid'; columns?: number; items: ReportMetricItem[] }
  | {
      type: 'trend-badges';
      /** Each badge shows an up/down arrow unless `trend:false` (then plain value). */
      items: Array<{ label: BilingualText; field: string; suffix?: string; trend?: boolean }>;
    };

/** A list-card layout: optional banner thumbnail + ordered rows. */
export interface CardLayoutConfig {
  banner?: HeroBanner;
  rows: ReportCardRow[];
}

export interface DetailNavConfig {
  /** Detail page key opened on primary-row click. */
  pageId?: string;
  /** Row field holding the id (e.g. 'plu'). */
  idField: string;
  /** urlParams key passed to the opened tab (e.g. 'pluId'). */
  urlParam: string;
  /** Bus param also emitted with the id (e.g. 'pluId'). */
  emitParam?: string;
  /** Tab title; a {zh,en} pair of FIELD NAMES (e.g. {zh:'product_name_zh'}). */
  titleField?: BilingualText | string;
  icon?: string;
}

export interface ProductReportConfig {
  title?: BilingualText;
  filterComponentId?: string;
  enabledViews?: ProductReportViewMode[];
  defaultViewMode?: ProductReportViewMode;

  /** Row-key + stale-guard field for the primary source. Default 'plu'. */
  primaryKeyField?: string;
  /** Row-key + stale-guard field for the dimension source. Default 'dim_key'. */
  dimKeyField?: string;

  summaryCards?: SummaryCardConfig[];
  dimensions?: DimensionConfig[];
  sortOptions?: SortOptionConfig[];
  filterKeys?: FilterKeyConfig[];

  tableColumns?: { primary?: ReportColumn[]; dimension?: ReportColumn[] };
  listCard?: { primary?: CardLayoutConfig; dimension?: CardLayoutConfig };

  detailNav?: DetailNavConfig;

  /** Rows per page for server-side pagination (sent as `limit`; the /data endpoint auto-wraps LIMIT/OFFSET and returns the true COUNT(*) total). Defaults to 20 when unset. */
  pageSize?: number;

  /** @deprecated Legacy per-fetch row cap from the client-side infinite-scroll era. No longer read — pagination is server-side via pageSize. */
  fetchLimit?: number;

  /** Mobile only: freeze the first column (sticky-left) AND pin the table header below the
   *  FilterPanel as the page scrolls. Off by default — turn on only for wide/long tables. */
  freezeFirstColumn?: boolean;

  /** Quick-scope pills row (store/national/retail/outlet/city…) shown under the dimension tabs.
   *  The selected value is injected into the data-source params via pillParam (storeScope SQL
   *  branches); visibleWhen typically gates it to store_manager so the HQ view stays unchanged. */
  quickScope?: QuickScopeConfig;

  /** Default true; false hides the "N items" counter (hidden on the SW product board per design). */
  showItemCount?: boolean;

  /** Footer total-row label (first column); used together with the dimension-level showTotalRow flag
   *  and the injected totalRowDataSourceConfig prop. Defaults to the zh/en Total label. */
  totalRowLabel?: BilingualText;
}

export interface QuickScopePill {
  value: string;
  label: BilingualText;
}

export interface QuickScopeConfig {
  /** Param name the selected scope is injected into (storeScope SQL branches). */
  pillParam?: string;
  /** e.g. only render for store_manager — HQ view stays unchanged. */
  visibleWhen?: VisibleWhen;
  pills: QuickScopePill[];
  /** Pill value the dynamic city label applies to. Default 'city'. */
  cityPillValue?: string;
  /** Dynamic city label template, e.g. 'City ({{cities}})' — rendered statically when
   *  citiesDataSourceConfig is unset / the query fails / cities comes back empty. */
  cityLabelTemplate?: string;
  /** Optional tiny data source (first row's `cities` field fills the template). */
  citiesDataSourceConfig?: DatabaseDataSourceConfig;
}
