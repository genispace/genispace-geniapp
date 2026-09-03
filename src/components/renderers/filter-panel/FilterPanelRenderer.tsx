import React, { useState, useCallback, useEffect, useMemo, useRef, useContext, createContext } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '@genispace/shared-ui';
import { Button } from '@genispace/shared-ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { RadioButtonGroup, DateRangeFilter, MultiSelect, type MultiSelectOption, DialogInput, Calendar } from '@genispace/shared-ui';
import { zhCN, enUS } from 'date-fns/locale';
import { Label } from '@genispace/shared-ui';
import { cn } from '@genispace/shared-utils';
import { useTranslation } from 'react-i18next';
import { useComponentCommunication } from '@/hooks/useComponentCommunication';
import { useDatabaseDataSource } from '@/hooks/useDatabaseDataSource';
import { useWorkbenchAppAccess } from '@/hooks/useWorkbenchAppAccess';
import { useParameterContext, useParameters } from '@/contexts/ParameterContext';
import type { DatabaseDataSourceConfig } from '@/types/databaseDataSource';
import type { DateRange } from 'react-day-picker';
import { DialogTagInput } from '@/ui/dialog-tag-input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@genispace/shared-ui';
import { Check, ChevronDown, ChevronUp, X as XIcon, Search, Calendar as CalendarIcon, Filter as FilterIcon, Clock as ClockIcon } from 'lucide-react';
import { renderLucideIcon } from '@/utils/iconUtils';
import {
  resolveDateRangeDefault,
  applyConfiguredTimeToDateRange,
  filterConfigKeyForReset,
  formatDateRangeStartForParams,
  formatDateRangeEndForParams,
  type DateRangeQuickSelectPresetKey
} from '@/utils/filterPanelDateRangeUtils';
import { useMobileFlowLayout } from '@/mobile/mobileFlowLayoutContext';
import {
  isWorkbenchSpaceSyncPending,
  subscribeWorkbenchSpaceSyncGate,
} from '@/mobile/utils/workbenchSpaceSyncGate';
import MobileDateRangeFilterField from '@/mobile/components/adaptive/MobileDateRangeFilterField';
import { mobileFilterFieldStyles } from '@/mobile/components/adaptive/mobileFilterFieldStyles';
import { useWorkbenchConfigLocale } from '@/contexts/WorkbenchConfigLocaleContext';
import { resolveBilingualText, type BilingualText } from '@/utils/workbenchDisplayLocale';
import {
  buildFilterOptionCacheKey,
  getFilterOptionCache,
  hashFilterParams,
  isFilterOptionCacheValid,
  loadFilterOptions,
} from './filterOptionCache';
import { useDatasourceVersions } from '@/utils/datasourceVersion';
import {
  buildFilterMemoryKey,
  isYmdDateString,
  readFilterSelectionMemory,
  writeFilterSelectionMemory,
} from './filterSelectionMemory';
import { useEscapedStickyPanel } from '../shared/useEscapedStickyPanel';

function resolveBilingualLabel(label: unknown, language: string): string {
  return resolveBilingualText(label, language);
}

function displayFilterLabel(label: unknown, language: string, localizeText: (text: string | null | undefined) => string): string {
  return localizeText(resolveBilingualText(label, language));
}

// Collect every pageParam key a filterSheet emits (across all sections/tabs/inputs).
function collectFilterSheetKeys(filter: { sections?: FilterSheetSection[] }): string[] {
  const keys: string[] = [];
  (filter.sections || []).forEach(sec => {
    if (sec.kind === 'chipMultiSelect') {
      keys.push(sec.key);
    } else if (sec.kind === 'tabbedChip' || sec.kind === 'layeredStore') {
      (sec.tabs || []).forEach(t => keys.push(t.key));
      if (sec.tags?.key) keys.push(sec.tags.key);
    } else if (sec.kind === 'textInputs') {
      (sec.inputs || []).forEach(inp => keys.push(inp.key));
    }
  });
  return keys;
}

// Pair a top-level multi `pillSelect` with a filterSheet tab that targets the SAME option
// datasource + value key (e.g. the store dropdown `storeId` and the sheet's store tab `storeIds`).
// Both pick from one list, so their selection is mirrored: choosing in one reflects in the other,
// and the shared bar shows a single merged group. Auto-detected (no config) via identical
// datasourceId + value key, so it can't accidentally link unrelated dimensions.
export function buildStoreMirrorMap(filters: FilterConfig[]): Record<string, string> {
  const map: Record<string, string> = {};
  const tabs: Array<{ key: string; dsId: string; vk: string }> = [];
  filters.forEach(f => {
    if (f.type !== 'filterSheet') return;
    (f.sections || []).forEach(sec => {
      if (sec.kind === 'layeredStore' || sec.kind === 'tabbedChip') {
        (sec.tabs || []).forEach(t => {
          const dsId = t.dataSource?.datasourceId || t.dataSource?.datasetId;
          if (dsId) tabs.push({ key: t.key, dsId, vk: t.dataSource?.valueKey || 'value' });
        });
      }
    });
  });
  filters.forEach(f => {
    if (f.type !== 'pillSelect' || !f.multiple) return;
    const dsId = f.dataSource?.datasourceId || f.dataSource?.datasetId;
    if (!dsId) return;
    const vk = f.valueKey || f.dataSource?.valueField || 'value';
    const m = tabs.find(t => t.dsId === dsId && t.vk === vk);
    if (m) { map[f.key] = m.key; map[m.key] = f.key; }
  });
  return map;
}

// Bus param name -> { filterValues key, array-ness } for every filter this panel owns.
// Used both to fold live external emits into state and to hydrate state from the bus at
// mount (panels on different pages share one componentId, so the bus — not this instance's
// config defaults — is the source of truth for committed values).
function buildBusSyncMap(
  filters: FilterConfig[],
  componentId: string
): Record<string, { key: string; isArray: boolean }> {
  const map: Record<string, { key: string; isArray: boolean }> = {};
  filters.forEach(filter => {
    if (filter.type === 'filterSheet') {
      const textKeys = filterSheetTextKeys(filter.sections || []);
      collectFilterSheetKeys(filter).forEach(k => {
        map[generateUniqueParameterName(componentId, k)] = { key: k, isArray: !textKeys.has(k) };
      });
    } else if (filter.type === 'segmented' || filter.type === 'pillSelect' || filter.type === 'select' || filter.type === 'tagInput') {
      map[generateUniqueParameterName(componentId, filter.key)] = { key: filter.key, isArray: !!filter.multiple || filter.type === 'tagInput' };
    }
  });
  return map;
}

/** Value keys owned by filters with the given effectScope (a filterSheet contributes every section key). */
export function collectEffectScopeKeys(filters: FilterConfig[], scope: 'partition' | 'page'): string[] {
  const keys: string[] = [];
  filters.forEach(f => {
    if (f.effectScope !== scope) return;
    if (f.type === 'filterSheet') keys.push(...collectFilterSheetKeys(f));
    else keys.push(f.key);
  });
  return keys;
}

export function parseBusValue(v: unknown, isArray: boolean): string[] | string | unknown {
  if (isArray) {
    return Array.isArray(v)
      ? v.map(x => String(x)).filter(Boolean)
      : String(v ?? '').split(',').map(s => s.trim()).filter(Boolean);
  }
  return v == null ? '' : v;
}

// Session-lived snapshots of partition-scoped filter values, keyed by `componentId::partitionValue`.
// Module-level so they survive per-page panel remounts; a full reload starts clean — same
// lifetime as non-persisted filter selections today.
const partitionSnapshots = new Map<string, Record<string, unknown>>();

// Cross-page committed-state sharing between panel instances configured with the SAME
// componentId (one logical filter bar rendered once per page). Each page has an isolated
// parameter bus (ParameterProvider per tab), so carrying selections across pages requires
// two pieces: new panels hydrate from this store at mount, and live sibling panels fold
// published values and re-emit them onto their own page's bus (data components only read
// their own page's bus). Dates are intentionally excluded (per-page preset memory is the
// established behavior).
const sharedPanelValues = new Map<string, Record<string, any>>();
const sharedPanelSubscribers = new Map<string, Set<(values: Record<string, any>, fromInstance: string) => void>>();
function publishSharedPanelValues(componentId: string, fromInstance: string, values: Record<string, any>) {
  sharedPanelValues.set(componentId, { ...values });
  sharedPanelSubscribers.get(componentId)?.forEach(fn => {
    try { fn(values, fromInstance); } catch { /* one broken sibling must not block the rest */ }
  });
}

/** Test-only: module-level stores otherwise leak committed state across test cases. */
export function __resetFilterPanelSharedState() {
  sharedPanelValues.clear();
  sharedPanelSubscribers.clear();
  partitionSnapshots.clear();
  updateTimeValueCache.clear();
}

// Pure partition-switch step (exported for tests): snapshot the leaving partition's scoped
// values into `store`, and return the restore patch for the entering one — its saved snapshot,
// or `defaults` (pristine config-only seeds) on first entry.
export function computePartitionRestore(
  store: Map<string, Record<string, unknown>>,
  scopeId: string,
  scopedKeys: string[],
  prevValues: Record<string, any>,
  fromValue: unknown,
  toValue: unknown,
  defaults: Record<string, any>
): Record<string, any> {
  const snapshot: Record<string, unknown> = {};
  scopedKeys.forEach(k => { snapshot[k] = prevValues[k]; });
  store.set(`${scopeId}::${String(fromValue ?? '')}`, snapshot);
  const saved = store.get(`${scopeId}::${String(toValue ?? '')}`);
  const restore: Record<string, any> = {};
  scopedKeys.forEach(k => {
    restore[k] = saved !== undefined ? saved[k] : defaults[k];
  });
  return restore;
}

// Expand a filterValues patch so any mirrored key also writes its partner (same value),
// unless the partner is already explicitly present in the patch.
export function expandStoreMirror(patch: Record<string, any>, map: Record<string, string>): Record<string, any> {
  if (Object.keys(map).length === 0) return patch;
  const out = { ...patch };
  Object.keys(patch).forEach(k => {
    const partner = map[k];
    if (partner && !(partner in patch)) out[partner] = patch[k];
  });
  return out;
}

function filterSheetTextKeys(sections: FilterSheetSection[]): Set<string> {
  const s = new Set<string>();
  sections.forEach(sec => {
    if (sec.kind === 'textInputs') (sec.inputs || []).forEach(inp => s.add(inp.key));
  });
  return s;
}

function isFilterValuePresent(v: unknown): boolean {
  if (Array.isArray(v)) return v.length > 0;
  return v != null && v !== '';
}

// Active-dimension count for the trigger badge (matches prototype ProductFilterSheet semantics).
function countActiveFilterSheetSections(
  sections: FilterSheetSection[],
  values: Record<string, any>
): number {
  let count = 0;
  sections.forEach(sec => {
    if (sec.kind === 'chipMultiSelect') {
      if (isFilterValuePresent(values[sec.key])) count++;
    } else if (sec.kind === 'tabbedChip') {
      (sec.tabs || []).forEach(t => { if (isFilterValuePresent(values[t.key])) count++; });
    } else if (sec.kind === 'layeredStore') {
      const anyTab = (sec.tabs || []).some(t => isFilterValuePresent(values[t.key]));
      const anyTag = sec.tags?.key ? isFilterValuePresent(values[sec.tags.key]) : false;
      if (anyTab || anyTag) count++;
    } else if (sec.kind === 'textInputs') {
      // Each text input counts independently (prototype counts code & name separately).
      (sec.inputs || []).forEach(inp => { if (isFilterValuePresent(values[inp.key])) count++; });
    }
  });
  return count;
}

export interface FilterOption {
  label: string;
  value: string;
}


export interface FilterSheetOptionSource {
  datasourceId?: string;
  datasetId?: string;
  /** Pin a datasource version; omit to use the default version */
  version?: number;
  labelKey?: string;
  valueKey?: string;
  scope?: string; // cache scope ('store' | 'product' | 'date' …) → maps to dataStamp
  // When true, this option datasource is fetched with the panel's committed date range
  // ({{startDate}}/{{endDate}}) so its options honor the selected period (e.g. valid-store-by-date).
  bindGlobalDateRange?: boolean;
}

export interface FilterSheetChipTab {
  key: string;                 // pageParam key this tab emits
  label: any;                  // string | { zh, en }
  dataSource?: FilterSheetOptionSource;
  options?: FilterOption[];
  searchable?: boolean;
}

export interface FilterSheetSection {
  key: string;                 // section id (accordion); also the emit key for chipMultiSelect
  title: any;                  // string | { zh, en }
  kind: 'chipMultiSelect' | 'tabbedChip' | 'layeredStore' | 'textInputs';
  // chipMultiSelect
  dataSource?: FilterSheetOptionSource;
  options?: FilterOption[];
  searchable?: boolean;        // chipMultiSelect: top search box (same as the store tab); case-insensitive label/value filter
  // tabbedChip / layeredStore
  tabs?: FilterSheetChipTab[];
  // layeredStore quick tags
  tags?: { key: string; label?: any; dataSource?: FilterSheetOptionSource; options?: FilterOption[] };
  // textInputs
  inputs?: Array<{ key: string; placeholder?: any }>;
}

// ─── presetDateRange custom sub-tab (DateRangeSheet) types ────────────────────
export interface DateCustomTabSource {
  datasourceId?: string;
  datasetId?: string;
  /** Pin a datasource version; omit to use the default version */
  version?: number;
  valueKey?: string;        // unique id column (selection state) — e.g. 'period_code'
  labelKey?: string;        // direct, language-neutral label column — e.g. 'period_code'
  labelI18nKey?: string;    // base name → reads `{base}_zh` / `{base}_en` (e.g. 'label')
  startKey?: string;        // date-start column — e.g. 'week_start'
  endKey?: string;          // date-end column — e.g. 'week_end'
  subLabelKey?: string;     // optional secondary text column (defaults to start~end range)
  groupKey?: string;        // client-side filter column — e.g. 'ui_group'
  groupValue?: string;      // ...keep only rows where row[groupKey] === groupValue
  scope?: string;           // cache scope ('date') → maps to dataStamp
}

export interface DateCustomTab {
  key: string;                          // sub-tab id (e.g. 'fiscal_week')
  label: any;                           // string | { zh, en }
  kind?: 'chips' | 'dateInput';         // default 'chips'
  cols?: number;                        // items per row (default 3)
  select?: 'multi' | 'single';          // default 'single'
  source?: DateCustomTabSource;
}

export interface FilterConfig {
  key: string;
  type: 'select' | 'radio' | 'dateRange' | 'text' | 'number' | 'tagInput'
      | 'segmented' | 'presetDateRange' | 'pillSelect' | 'filterSheet';
  label: string;
  options?: FilterOption[];
  dataSource?: {
    datasetId?: string;
    datasourceId?: string;
    /** Pin a datasource version; omit to use the default version */
    version?: number;
    valueField?: string;
    labelField?: string;
    scope?: string;
    bindGlobalDateRange?: boolean; // fetch options with the committed date range (period-aware)
  };
  labelKey?: string;
  valueKey?: string;
  multiple?: boolean;
  defaultValue?: any;
  useFirstOptionAsDefault?: boolean;
  /** pillSelect: show a search input in the popover/sheet to fuzzy-filter options. */
  searchable?: boolean;
  /** pillSelect (multiple): render a chips bar of selected items below the trigger / in the panel. Default true when multiple.
   *  filterSheet: also surface every committed dimension as removable chips in the shared bar (default ON; set false to hide). */
  showSelectedChips?: boolean;
  /** pillSelect (multiple): forbid clearing to zero — keep at least one selected (falls back to first option). */
  keepAtLeastOne?: boolean;
  /** pillSelect (multiple): publish the number of DISTINCT option-row `groupCountField` values
   *  across the selected options as a numeric page param `{componentId}_{key}GroupCount`
   *  (e.g. selected R001 + R001N, both rows main_store_code=R001 → 1). A selected value whose
   *  option row lacks the field counts as its own group. Emitted once the option list is ready
   *  and on every selection change; empty selection emits 0. */
  groupCountField?: string;
  placeholder?: BilingualText;
  style?: React.CSSProperties;
  quickSelect?: boolean; 

  quickSelectItems?: Partial<Record<DateRangeQuickSelectPresetKey, boolean>>;

  useSpecifiedTime?: boolean;

  showTimePicker?: boolean;

  specifiedStartTime?: string;

  specifiedEndTime?: string;

  displayWidth?: string;

  dropdownWidth?: string;
  buttons?: Array<{ label: string; value: string }>;
  maxTags?: number;
  
  segments?: Array<{ label: any; value: string; icon?: string }>;
  // presetDateRange type
  fiscalPresets?: Array<{ label: any; value: string }>;
  // presetDateRange: DataSource returning each preset's resolved { value, label_zh/en, sub_zh/en, start_date, end_date }
  dateRangeSource?: { datasourceId?: string; datasetId?: string; version?: number };
  // presetDateRange: enable a custom start/end date section in the sheet (legacy simplified custom)
  allowCustom?: boolean;
  // presetDateRange: preset grid column count (default 3)
  presetCols?: number;
  // presetDateRange: how many grid columns the Custom cell spans (clamped to presetCols; default 1)
  customSpan?: number;
  
  customLabel?: any;
  customSub?: any;
  
  customTabs?: DateCustomTab[];
  // presetDateRange: persist the user's committed choice (preset key / custom range) in
  // localStorage and restore it on the next visit. URL/bus params still win over memory.
  rememberSelection?: boolean;
  // presetDateRange: "show last update time" toggle (2026-07-21 requirement 2, revised) — when
  // configured, a matching slate-chip update-time label appears on the right of the headerBar
  // (value from the datasource's first-row field; the text template contains a {time} placeholder);
  // when not configured (= toggle off) the date bar spans the full row, exactly as before the feature.
  updateTime?: {
    datasourceId?: string;
    field: string;
    text?: unknown; // bilingual { zh, en }, with a {time} placeholder
    /** Client-side display format with tokens yyyy/MM/dd/HH/mm (e.g. 'HH:mm MM-dd').
     *  Parsed from the wall-clock string the datasource returns — no timezone math.
     *  Empty/undefined = render the raw value as-is. */
    timeFormat?: string;
    /** Leading icon key from the workbench icon map (e.g. 'clock', 'history',
     *  'refresh-cw'). Empty/undefined = 'clock'. */
    icon?: string;
    /** Label font size in px. Empty/undefined = the default text-xs (12px). */
    fontSize?: number;
    /** Built-in refresh interval (seconds): when >0 the label silently refetches on this period
     *  without remounting FilterPanel; unset/0 = no auto refresh. */
    refreshInterval?: number;
    /** When true, the label refetches every time the panel's committed filter values change
     *  (single-filter commit or filterSheet "Apply"); default false = mount-only fetch plus
     *  the optional refreshInterval polling, exactly as before. */
    refreshOnQuery?: boolean;
  };
  // conditional visibility: show this filter only when pageParam key matches value
  visibleWhen?: { key: string; value: string | string[] };
  /** Where this filter's committed value lives:
   *  'global' (default) — one shared value across partitions AND pages (current behavior).
   *  'partition' — isolated per partition value (snapshot on leave, restore on return);
   *                requires the panel `partition` config. Shared across pages.
   *  'page' — private to the page this panel instance lives on: never published to or
   *           hydrated from the cross-page store, and not partition-isolated. */
  effectScope?: 'global' | 'partition' | 'page';
  // filterSheet type
  sections?: FilterSheetSection[];
}

export interface FilterPanelProps {
  filters: FilterConfig[];
  presets?: Array<{
    label: string;
    value: Record<string, any>;
  }>;
  onFilterChange?: (filters: Record<string, any>) => void;
  className?: string;
  title?: string;
  useMockData?: boolean;
  componentId?: string;
  pageId?: string;
  tabId?: string;
  onParameterChange?: (key: string, value: any) => void;
  /**
   * Mobile layout strategy.
   * - 'stack' (default): each filter on its own row (legacy behavior).
   * - 'header': segmented/pillSelect/filterSheet flow inline on one wrapping row,
   *   dateRange/presetDateRange render as a full-width bar on their own row
   *   (matches the SW prototype global header).
   */
  mobileLayout?: 'stack' | 'header';
  /**
   * Config-driven filter arrangement. When set, filters are grouped into explicit rows
   * (overrides mobileLayout/Card single-row). Each row is a horizontal flex group; a
   * single-filter row spans full width; keys listed in `grow` expand to fill remaining
   * space; the rest size to content. Filters not in any row are appended in a final row.
   * Applies on both mobile and desktop.
   */
  layout?: {
    rows: Array<{ keys: string[]; grow?: string[] }>;
  };
  /**
   * Option caching (docs P0-FilterPanel-cache.md). Filter dimension data changes
   * infrequently; caching avoids re-querying the DataSource on every Sheet open / tab
   * switch / page revisit.
   * - enabled: turn caching on (memory + sessionStorage).
   * - ttlMs: fallback freshness window when no dataStamp is available.
   * - stampDatasourceId: lightweight DataSource returning { scope_code, updated_at }.
   *   When set, a field's cache is invalidated only when its scope's stamp changes.
   */
  cache?: {
    enabled?: boolean;
    ttlMs?: number;
    stampDatasourceId?: string;
  };
  /**
   * Pin the panel to the top of the scrolling page area. Normal page flows use
   * native CSS sticky; edit canvases with short/transformed wrappers fall back
   * to a fixed portal so the same setting stays reliable in Studio.
   */
  sticky?: boolean;
  /** CSS top offset for sticky mode (use to clear a fixed app header). Default '0px'. */
  stickyTop?: string;
  /**
   * Per-partition isolation for filters marked `effectScope: 'partition'`. `key` names the
   * filter whose committed value partitions the snapshots (e.g. the hq/store view switcher).
   * On a partition switch the leaving partition's values are snapshotted and the entering
   * partition's snapshot (or pristine defaults on first entry) is restored — atomically, in
   * the same emit batch as the switch itself. Filters without effectScope keep current
   * global behavior (e.g. the date range persists across views until the user changes it).
   */
  partition?: { key: string };
  /**
   * Role-driven filter rules (generic, RBAC-based). When the current user has one of the
   * configured application `roles` (from GET /applications/:id/users/me/access), the panel:
   *  - auto-selects ALL loaded options of each filter in `selectAllFilters` (the option lists
   *    are expected to be already server-filtered per user, so "all" = the user's set);
   *  - forces each `forceValues[key]` onto that filter;
   *  - restricts each `restrictOptions[key]` filter's options/segments to the listed values
   *    (keeps the control but drops the others, e.g. view switch shows only the 'store' segment);
   *  - hides each filter in `hideFilters`;
   *  - pins the selected-chips bar of each filter in `pinnedChipsFilters`: the bar shows ALL
   *    of the filter's options as fixed chips (no ×, no clear-all) and clicking a chip toggles
   *    its selection in place (unselected chips render muted). For a filterSheet the listed
   *    key is the store DIMENSION key (a section/tab key, e.g. `storeIds`); listing a mirrored
   *    pillSelect key covers its sheet partner automatically.
   * Used e.g. to pin a store manager to the store view of their own stores. No role match (or
   * not configured) ⇒ the panel behaves exactly as before. Inert unless `roles` is set.
   */
  roleFilterRules?: {
    roles?: string[];
    selectAllFilters?: string[];
    hideFilters?: string[];
    forceValues?: Record<string, string>;
    restrictOptions?: Record<string, string[]>;
    pinnedChipsFilters?: string[];
  };
}

// ─── Filter option cache context ──────────────────────────────────────────────
interface FilterCacheContextValue {
  enabled: boolean;
  ttlMs?: number;
  stamps: Record<string, string>; // scope_code -> ISO updated_at
  stampsReady: boolean;           // false while the stamp meta DataSource is still loading
  // Bus param names of this FilterPanel's committed date range (e.g. periodStart/periodEnd).
  // store-scoped option datasources fetch with these values so their option lists honor the
  // selected period (e.g. "stores valid on some day in range"). Undefined when no date filter.
  storeDateParamNames?: { start: string; end: string };
}
const FilterCacheContext = createContext<FilterCacheContextValue>({
  enabled: false,
  stamps: {},
  stampsReady: true,
});

type FilterOptionRow = Record<string, unknown>;

// High page limit so the stamp-meta DataSource isn't truncated to the default 20 scope rows.
const STAMP_FETCH_PARAMS = Object.freeze({ limit: 1000 });

// Loads DataSource rows via the module-level, datasource-level loader (loadFilterOptions):
// the fetch + cache write happen ONCE per datasource (deduped across ALL controls AND pages)
// and survive this component unmounting mid-fetch. So switching tabs / sections / pages reads
// the shared cache instead of re-querying the DataSource.
const EMPTY_PARAM_KEYS: string[] = [];

function useCachedFilterOptions(params: {
  datasourceId?: string;
  version?: number;
  outputFields: string[];
  lang: string;
  scope?: string;
  bindDateRange?: boolean;
}): { rows: FilterOptionRow[]; loading: boolean } {
  const { datasourceId, version, outputFields, lang, scope, bindDateRange } = params;
  // The workbench-level pinned version (config.datasourceVersions from DatasourceVersionPanel) must be
  // part of the cacheKey — otherwise, after switching the version in the panel, the option list would
  // still hit the shared cache written under the old version (fetchDatasourceRows already requests with
  // the pinned version; only the cache key missed it). Reactive read: pin change → cacheKey change → refetch.
  const pins = useDatasourceVersions();
  const effectiveVersion = (datasourceId ? pins?.[datasourceId] : undefined) ?? version;
  const cacheCtx = useContext(FilterCacheContext);
  const enabled = cacheCtx.enabled && !!datasourceId;
  const dataStamp = scope ? cacheCtx.stamps[scope] : undefined;
  const ttlMs = cacheCtx.ttlMs;
  const stampsReady = cacheCtx.stampsReady;

  // Opt-in (source.bindGlobalDateRange): fetch this option list with the panel's committed date
  // range {startDate,endDate}, read live from the bus (same period the page metrics use), so the
  // options honor the selected period. Off → no params (fetched once, period-independent).
  const dateNames = bindDateRange ? cacheCtx.storeDateParamNames : undefined;
  const dateKeys = useMemo(
    () => (dateNames ? [dateNames.start, dateNames.end] : EMPTY_PARAM_KEYS),
    [dateNames]
  );
  const dateVals = useParameters(dateKeys);
  // Read as primitives so queryParams keeps a stable identity across renders (useParameters
  // returns a fresh object each render); it only changes when the date VALUES actually change.
  const sdVal = dateNames ? dateVals[dateNames.start] : undefined;
  const edVal = dateNames ? dateVals[dateNames.end] : undefined;
  const queryParams = useMemo<Record<string, unknown> | undefined>(() => {
    if (!dateNames) return undefined;
    if ((sdVal == null || sdVal === '') && (edVal == null || edVal === '')) return undefined;
    return { startDate: sdVal ?? '', endDate: edVal ?? '' };
  }, [dateNames, sdVal, edVal]);
  const paramsHash = useMemo(() => hashFilterParams(queryParams), [queryParams]);

  const cacheKey = useMemo(
    () =>
      datasourceId
        ? buildFilterOptionCacheKey({ datasourceId, version: effectiveVersion, fields: outputFields, scope, paramsHash, lang })
        : '',
    [datasourceId, effectiveVersion, outputFields, scope, paramsHash, lang]
  );

  // The dataStamp only validates the cache when caching is on.
  const validOpts = useMemo(
    () => ({ dataStamp: enabled ? dataStamp : undefined, ttlMs }),
    [enabled, dataStamp, ttlMs]
  );

  const readValidCache = useCallback((): FilterOptionRow[] | null => {
    if (!enabled || !cacheKey) return null;
    const c = getFilterOptionCache(cacheKey);
    return isFilterOptionCacheValid(c, validOpts) ? c.rows : null;
  }, [enabled, cacheKey, validOpts]);

  const [rows, setRows] = useState<FilterOptionRow[]>(() => readValidCache() ?? []);
  const [loading, setLoading] = useState<boolean>(() => !!datasourceId && readValidCache() == null);

  useEffect(() => {
    if (!datasourceId || !cacheKey) {
      setRows([]);
      setLoading(false);
      return;
    }
    const cachedRows = readValidCache();
    if (cachedRows) {
      setRows(cachedRows);
      setLoading(false);
      return;
    }
    // Cache miss. When caching with stamps, wait for the stamp meta first so the entry is
    // written with the correct dataStamp (stampsReady becomes true even on meta failure/timeout).
    if (enabled && !stampsReady) {
      setLoading(true);
      return;
    }

    let cancelled = false;
    const start = (): boolean => {
      if (isWorkbenchSpaceSyncPending()) return false; // wait for the mobile space-sync gate
      setLoading(true);
      // Datasource-level: fetch once (deduped), write cache on resolve regardless of whether
      // this component is still mounted; `cancelled` only skips this instance's state update.
      loadFilterOptions(cacheKey, datasourceId, outputFields, validOpts, enabled, queryParams, effectiveVersion)
        .then(r => { if (!cancelled) { setRows(r); setLoading(false); } })
        .catch(() => { if (!cancelled) setLoading(false); }); // error: nothing cached, retry next mount
      return true;
    };
    if (start()) {
      return () => { cancelled = true; };
    }
    // Gate pending → retry once it releases.
    const unsub = subscribeWorkbenchSpaceSyncGate(() => {
      if (cancelled) return;
      if (start()) unsub();
    });
    return () => { cancelled = true; unsub(); };
  }, [datasourceId, effectiveVersion, cacheKey, enabled, stampsReady, validOpts, readValidCache, outputFields, queryParams]);

  return { rows, loading };
}

const getSelectWidthStyle = (filter: FilterConfig, isMobileLayout: boolean): React.CSSProperties | undefined => {
  const width = filter.displayWidth?.trim()
    || filter.dropdownWidth?.trim()
    || (typeof filter.style?.width === 'string' ? filter.style.width : undefined);
  if (!width) return undefined;
  // Narrow flow only: maxWidth caps config-driven widths at the containing column.
  return isMobileLayout ? { width, maxWidth: '100%' } : { width };
};

const getSelectContainerClassName = (filter: FilterConfig, isInline: boolean): string => {
  if (!isInline) return 'w-full';
  return (filter.displayWidth?.trim() || filter.dropdownWidth?.trim())
    ? 'w-full sm:w-auto'
    : 'min-w-[200px] sm:min-w-[240px] w-full sm:w-auto';
};

const SELECT_VALUE_PREFIX = '__genispace_filter_select__:';

function hasExplicitValue(value: unknown): boolean {
  return value !== undefined && value !== null;
}

function encodeSelectOptionValue(value: string): string {
  return `${SELECT_VALUE_PREFIX}${encodeURIComponent(value)}`;
}

function decodeSelectOptionValue(value: string): string {
  if (!value.startsWith(SELECT_VALUE_PREFIX)) {
    return value;
  }
  return decodeURIComponent(value.slice(SELECT_VALUE_PREFIX.length));
}

function getSelectControlValue(value: unknown): string {
  if (!hasExplicitValue(value)) {
    return '';
  }
  return encodeSelectOptionValue(String(value));
}

function normalizeOptionValue(value: unknown): string {
  return hasExplicitValue(value) ? String(value) : '';
}

function normalizeOptionLabel(label: unknown, fallbackValue: unknown): string {
  if (hasExplicitValue(label)) {
    return String(label);
  }
  if (hasExplicitValue(fallbackValue)) {
    return String(fallbackValue);
  }
  return '';
}

function generateUniqueParameterName(componentId: string, filterKey: string): string {
  return `${componentId}_${filterKey}`;
}

// Initial committed values for a presetDateRange filter. Precedence: bus/URL params (deep links
// and hot remounts keep the in-flight selection) > remembered last selection (rememberSelection)
// > config defaultValue > first fiscal preset. A restored preset seeds only its key — start/end
// re-emit from the live date-range datasource (never replayed stale); a restored custom range
// seeds all three keys so the initial broadcast stays atomic.
function resolvePresetDateRangeInitial(
  filter: FilterConfig,
  componentId: string,
  workbenchId: string | undefined,
  busParams: Record<string, any>
): Record<string, any> | null {
  const validPresets = (filter.fiscalPresets || []).map(p => p.value);
  const startKey = `${filter.key}Start`;
  const endKey = `${filter.key}End`;
  const busVal = busParams[generateUniqueParameterName(componentId, filter.key)];
  if (typeof busVal === 'string' && busVal) {
    if (validPresets.includes(busVal)) return { [filter.key]: busVal };
    const busStart = busParams[generateUniqueParameterName(componentId, startKey)];
    const busEnd = busParams[generateUniqueParameterName(componentId, endKey)];
    if (busVal === 'custom' && isYmdDateString(busStart) && isYmdDateString(busEnd)) {
      return { [filter.key]: 'custom', [startKey]: busStart, [endKey]: busEnd };
    }
  }
  if (filter.rememberSelection) {
    const mem = readFilterSelectionMemory(
      buildFilterMemoryKey(workbenchId, componentId, filter.key),
      validPresets
    );
    if (mem) {
      return mem.v === 'custom'
        ? { [filter.key]: 'custom', [startKey]: mem.start, [endKey]: mem.end }
        : { [filter.key]: mem.v };
    }
  }
  const dv = filter.defaultValue;
  const eff = dv !== undefined && dv !== null && dv !== '' ? dv : filter.fiscalPresets?.[0]?.value;
  return eff !== undefined && eff !== null && eff !== '' ? { [filter.key]: eff } : null;
}

function generateDateRangeParameterNames(
  componentId: string,
  filterKey: string
): { startTime: string; endTime: string } {
  return {
    startTime: `${componentId}_${filterKey}.startTime`,
    endTime: `${componentId}_${filterKey}.endTime`
  };
}

// Single source of truth for the pageParam names a filter emits.
// Used by BOTH the emitParameters allow-list and the markParametersReady call
// so the two can never diverge (a divergence would leave consumers waiting forever).
export function getFilterEmitParamNames(filter: FilterConfig, componentId: string): string[] {
  if (filter.type === 'dateRange') {
    const { startTime, endTime } = generateDateRangeParameterNames(componentId, filter.key);
    return [startTime, endTime];
  }
  if (filter.type === 'filterSheet') {
    return collectFilterSheetKeys(filter).map(k => generateUniqueParameterName(componentId, k));
  }
  if (filter.type === 'presetDateRange') {
    // emits the preset key + the resolved start/end dates
    return [filter.key, `${filter.key}Start`, `${filter.key}End`].map(k =>
      generateUniqueParameterName(componentId, k)
    );
  }
  const names = [generateUniqueParameterName(componentId, filter.key)];
  if (filter.type === 'pillSelect' && filter.multiple && filter.groupCountField) {
    // Derived param emitted by GroupCountParamPublisher once the option list is ready.
    names.push(generateUniqueParameterName(componentId, `${filter.key}GroupCount`));
  }
  return names;
}

function getFirstOptionValue(filter: FilterConfig, options: FilterOption[]): string | undefined {
  if (filter.type !== 'select') return undefined;

  if (options.length > 0) {
    return options[0].value;
  }

  if (filter.options && filter.options.length > 0) {
    return filter.options[0].value;
  }

  return undefined;
}

function filterNeedsInitialValue(filter: FilterConfig): boolean {
  if (filter.type === 'dateRange') {
    return resolveDateRangeDefault(filter) !== undefined;
  }
  if (filter.defaultValue !== undefined && filter.defaultValue !== null) {
    return true;
  }
  return (
    filter.type === 'select' &&
    (filter.useFirstOptionAsDefault || filter.defaultValue === '__first_option__') &&
    !!(filter.dataSource?.datasourceId || filter.dataSource?.datasetId)
  );
}

/** Empty defaultValue + useFirstOptionAsDefault means "wait for datasource first option", not a real selection. */
function shouldDeferSelectFirstOption(filter: FilterConfig, value: unknown): boolean {
  if (filter.type !== 'select') return false;
  const wantsFirstOption =
    filter.useFirstOptionAsDefault || filter.defaultValue === '__first_option__';
  if (!wantsFirstOption) return false;
  if (value === undefined || value === null) return true;
  if (value === '' && filter.defaultValue === '') return true;
  return false;
}

function resolveSelectDefaultFallback(filter: FilterConfig): string | undefined {
  if (filter.defaultValue === '__first_option__') return undefined;
  if (filter.defaultValue === undefined || filter.defaultValue === null) return undefined;
  if (filter.useFirstOptionAsDefault && filter.defaultValue === '') return undefined;
  return filter.defaultValue;
}

// Per-filter wrapper sizing inside the 'header' mobile layout (a flex-wrap row).
// date filters take a full row; the store pill expands; the rest size to content.
function headerFilterWrapClass(filter: FilterConfig): string {
  if (filter.type === 'presetDateRange' || filter.type === 'dateRange') return 'basis-full w-full';
  if (filter.type === 'pillSelect') return 'flex-1 min-w-0';
  return 'shrink-0';
}

// shared-ui's <SheetContent> defaults to BLOCKING outside-tap dismissal
// (onPointerDownOutside → preventDefault). For the mobile filter / date / store bottom
// sheets we want a tap on the backdrop to close the sheet, so we override those handlers.
// Nested radix popovers (select / date-picker / dialog) still keep the sheet open when the
// user interacts with them. Spread onto a <SheetContent> to opt a sheet into this behavior.
const SHEET_KEEP_OPEN_SELECTOR =
  '[data-app-date-picker-popover],[data-radix-dialog-content],[data-radix-select-content]';

function keepSheetOpenForNestedPopovers(e: { target: EventTarget | null; preventDefault: () => void }): void {
  const el = e.target as Element | null;
  if (el && typeof el.closest === 'function' && el.closest(SHEET_KEEP_OPEN_SELECTOR)) {
    e.preventDefault();
  }
}

const mobileFilterSheetProps = {
  onPointerDownOutside: keepSheetOpenForNestedPopovers,
  onInteractOutside: keepSheetOpenForNestedPopovers,
  // Don't auto-focus the first focusable element (the X close button) when the sheet opens —
  // Radix otherwise moves focus to the X and shows a focus ring on it. A touch sheet doesn't
  // need that initial focus, so suppress it.
  onOpenAutoFocus: (e: { preventDefault: () => void }) => e.preventDefault(),
};

// One-shot guard for role-driven auto-select: keys (`${componentId}:${filterKey}`) already
// auto-selected this session. Module scope → persists across page switches / panel remounts, so a
// manual change (e.g. deselecting a store) is not re-forced back to "all options" when the user
// navigates to another page. Cleared only on a full reload (fresh session = re-initialize).
const roleSelectAllDone = new Set<string>();

// Hidden helper for role-driven `selectAllFilters`: fetch a filter's (already server-filtered)
// option list and, once loaded, select ALL of its values exactly once. Rendered inside the
// FilterCacheContext.Provider so it shares the option cache with the visible field — no bespoke
// permission datasource, it reuses the filter's own (gated) options.
const RoleAutoSelectApplier: React.FC<{
  filter: FilterConfig;
  lang: string;
  onApply: (patch: Record<string, any>) => void;
}> = ({ filter, lang, onApply }) => {
  const labelKey = filter.labelKey || filter.dataSource?.labelField || 'label';
  const valueKey = filter.valueKey || filter.dataSource?.valueField || 'value';
  const outputFields = useMemo(() => [labelKey, valueKey], [labelKey, valueKey]);
  const { rows, loading } = useCachedFilterOptions({
    datasourceId: filter.dataSource?.datasourceId || filter.dataSource?.datasetId,
    version: filter.dataSource?.version,
    outputFields,
    lang,
    scope: filter.dataSource?.scope,
    bindDateRange: filter.dataSource?.bindGlobalDateRange,
  });
  const appliedRef = useRef(false);
  useEffect(() => {
    if (appliedRef.current || loading) return;
    const values = rows
      .map(r => String((r as Record<string, unknown>)[valueKey] ?? ''))
      .filter(Boolean);
    if (values.length === 0) return;
    appliedRef.current = true;
    onApply({ [filter.key]: values });
  }, [rows, loading, valueKey, filter.key, onApply]);
  return null;
};

// Hidden helper for filter.groupCountField (multiple pillSelect): count the DISTINCT
// option-row groupCountField values across the SELECTED options (e.g. selected R001 + R001N,
// both rows main_store_code=R001 → 1) and publish it as a numeric page param
// `{componentId}_{filterKey}GroupCount` (name passed in as `paramName`). Emitted once the
// option list is ready (initial load included) and on every selection change; an empty
// selection emits 0. While a datasource-backed list is still loading NOTHING is emitted, so
// a chart's visibleWhen never flaps on a bogus count. A selected value whose option row lacks
// the field counts as its own group (the value itself), so static options without the field
// degrade to the selection size. Rendered inside FilterCacheContext.Provider so it shares the
// option cache with the visible field (outputFields add the group field — one extra cache
// variant, only for filters that opt in).
const GroupCountParamPublisher: React.FC<{
  filter: FilterConfig;
  value: unknown;
  lang: string;
  paramName: string;
  onEmit: (paramName: string, count: number) => void;
}> = ({ filter, value, lang, paramName, onEmit }) => {
  const groupField = filter.groupCountField as string;
  const datasourceId = filter.dataSource?.datasourceId || filter.dataSource?.datasetId;
  const labelKey = filter.labelKey || filter.dataSource?.labelField || 'label';
  const valueKey = filter.valueKey || filter.dataSource?.valueField || 'value';
  const outputFields = useMemo(
    () => [...new Set([labelKey, valueKey, groupField])],
    [labelKey, valueKey, groupField]
  );
  const { rows, loading } = useCachedFilterOptions({
    datasourceId,
    version: filter.dataSource?.version,
    outputFields,
    lang,
    scope: filter.dataSource?.scope,
    bindDateRange: filter.dataSource?.bindGlobalDateRange,
  });

  const selectedValues = useMemo(
    () =>
      (Array.isArray(value) ? value : value != null && value !== '' ? [value] : []).map(v => String(v)),
    [value]
  );

  // null while a datasource-backed option list is still loading (not ready to publish).
  const count = useMemo(() => {
    if (datasourceId && loading) return null;
    const groupOf = new Map<string, string>();
    if (datasourceId) {
      rows.forEach(row => {
        const v = String(row[valueKey] ?? '');
        const g = row[groupField];
        groupOf.set(v, g != null && g !== '' ? String(g) : v);
      });
    } else {
      (filter.options || []).forEach(opt => {
        const g = (opt as unknown as Record<string, unknown>)[groupField];
        groupOf.set(opt.value, g != null && g !== '' ? String(g) : opt.value);
      });
    }
    return new Set(selectedValues.map(v => groupOf.get(v) ?? v)).size;
  }, [datasourceId, loading, rows, filter.options, groupField, valueKey, selectedValues]);

  useEffect(() => {
    if (count == null) return;
    onEmit(paramName, count);
  }, [count, paramName, onEmit]);

  return null;
};

// Format a wall-clock timestamp string ('yyyy-MM-dd HH:mm[:ss]', also accepts a 'T'
// separator) into the configured token layout (yyyy/MM/dd/HH/mm). String-only — no
// Date parsing, so the wall clock from the datasource never shifts across timezones.
// Unparseable input or an empty format falls back to the raw string.
const formatUpdateTimeValue = (raw: string, fmt?: string): string => {
  if (!fmt) return raw;
  const m = raw.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return raw;
  const [, yyyy, MM, dd, HH, mm, ss] = m;
  return fmt
    .replace('yyyy', yyyy)
    .replace('MM', MM)
    .replace('dd', dd)
    .replace('HH', HH)
    .replace('mm', mm)
    .replace('ss', ss ?? '00');
};

// Session-lived cache of the last fetched update-time value per datasource+field(+version pin).
// The sticky escaped-portal pin/unpin REMOUNTS the whole panel subtree (page switches remount the
// panel too); without this cache UpdateTimeLabel renders nothing until its fetch resolves — the
// visible "flash" of the update-time label on scroll. Stale-while-revalidate: render the cached
// value immediately on mount; the regular fetch (mount / refreshInterval / refreshOnQuery) still
// runs and overwrites both the state and this cache.
const updateTimeValueCache = new Map<string, unknown>();

// "Data/last update time" label: takes the field value from the datasource's first row (e.g.
// MAX(etl_datetime)), applies the text template ({time} placeholder), and renders as a slate chip
// matching the time-range headerBar. Fetching goes through the same useDatabaseDataSource path as stamp
// metadata (the hook resolves the workbench-level datasourceVersions pins); failures are silent (no toast,
// no retry), and nothing renders when no value. Driven by the filter.updateTime config of presetDateRange
// filters.
const UpdateTimeLabel: React.FC<{ config: NonNullable<FilterConfig['updateTime']>; refreshKey?: string }> = ({ config, refreshKey }) => {
  const { t } = useTranslation(['renderers']);
  const { language, localizeText } = useWorkbenchConfigLocale();
  const dsConfig: DatabaseDataSourceConfig | null = useMemo(
    () =>
      config.datasourceId
        ? {
            type: 'database-datasource',
            datasourceId: config.datasourceId,
            parameters: EMPTY_DATASOURCE_PARAMS,
            outputFields: [config.field],
          }
        : null,
    [config.datasourceId, config.field]
  );
  const { data, refetch } = useDatabaseDataSource(dsConfig, 'Table', { limit: 1 }, { errorConfig: { showToast: false, retryAttempts: 0 } });
  // Cache key tracks the workbench-level version pin so switching versions never shows the
  // previous pin's timestamp (the hook above already fetches with the pin).
  const pins = useDatasourceVersions();
  const valueCacheKey = config.datasourceId
    ? `${config.datasourceId}:${pins?.[config.datasourceId] ?? 'default'}:${config.field}`
    : '';
  // Built-in periodic refresh (2026-07-22): refetches only this label's data, without remounting
  // FilterPanel. The 5s floor guards against misconfiguration.
  const refreshSec = Math.max(0, Math.floor(Number(config.refreshInterval) || 0));
  useEffect(() => {
    if (refreshSec < 5) return;
    const timer = setInterval(() => {
      void refetch();
    }, refreshSec * 1000);
    return () => clearInterval(timer);
  }, [refreshSec, refetch]);
  // Refresh-on-query (2026-07-27): when configured, every committed filter-values change
  // (single-filter commit or filterSheet "Apply", surfaced as the refreshKey signature prop)
  // refetches this label. The mount fetch already ran inside useDatabaseDataSource, so the
  // initial signature is only recorded; identical signatures (plain re-renders, uncommitted
  // typing) never retrigger, which also collapses a rapid series of commits to one refetch
  // per settled signature.
  const lastRefreshKeyRef = useRef(refreshKey);
  useEffect(() => {
    if (!config.refreshOnQuery) return;
    if (refreshKey === lastRefreshKeyRef.current) return;
    lastRefreshKeyRef.current = refreshKey;
    void refetch();
  }, [config.refreshOnQuery, refreshKey, refetch]);
  // Cache write: only present values are stored — a failed/empty fetch never evicts the last
  // good timestamp (failures are silent by design, and a stale time beats a blank label).
  useEffect(() => {
    if (!valueCacheKey) return;
    const v = Array.isArray(data) && data.length > 0
      ? (data[0] as Record<string, unknown>)?.[config.field]
      : null;
    if (v !== null && v !== undefined && v !== '') updateTimeValueCache.set(valueCacheKey, v);
  }, [valueCacheKey, data, config.field]);
  const fetched = Array.isArray(data) && data.length > 0 ? (data[0] as Record<string, unknown>)?.[config.field] : null;
  // A remount (sticky portal pin/unpin, page switch) starts with empty data for one fetch
  // round-trip; the session-cached value fills that window so the label never blanks.
  const raw = fetched === null || fetched === undefined || fetched === ''
    ? (valueCacheKey ? updateTimeValueCache.get(valueCacheKey) ?? fetched : fetched)
    : fetched;
  if (raw === null || raw === undefined || raw === '') return null;
  const tpl = displayFilterLabel(config.text, language, localizeText) || t('filter_panel.data_update_time', 'Updated {time}');
  const timeText = formatUpdateTimeValue(String(raw), config.timeFormat);
  // De-emphasized visuals (adjusted 2026-07-22): no slate chip — muted small text + a small clock icon.
  const fontSize = Number(config.fontSize) > 0 ? Math.floor(Number(config.fontSize)) : undefined;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap shrink-0"
      style={fontSize ? { fontSize: `${fontSize}px` } : undefined}
    >
      {renderLucideIcon(config.icon || 'clock', 'w-3 h-3')}
      {tpl.replace('{time}', timeText)}
    </span>
  );
};

const FilterPanelRenderer: React.FC<FilterPanelProps> = ({
  filters,
  presets = [],
  onFilterChange,
  className,
  title,
  useMockData = false,
  componentId = 'filterPanel',
  pageId,
  tabId,
  onParameterChange,
  mobileLayout = 'stack',
  cache,
  layout,
  sticky = false,
  stickyTop = '0px',
  partition,
  roleFilterRules,
}) => {
  const { t } = useTranslation(['renderers', 'common']);
  const { localizeText, language } = useWorkbenchConfigLocale();
  // Narrow flow (real mobile OR studio phone frame): the whole mobile layout
  // branch — header layout, sheets, field wrapping — previews 1:1 in the frame.
  const isMobileLayout = useMobileFlowLayout();
  const isHeaderLayout = isMobileLayout && mobileLayout === 'header';
  // Visual chrome for a pinned panel (opaque so scrolled content never bleeds through).
  // useEscapedStickyPanel prefers native sticky; the fixed fallback pins the panel in place
  // (no portal, no remount — see the hook's docstring).
  const stickyClass = sticky ? 'z-30 bg-background border-b border-border' : '';
  // On mobile the page content sits in a px-2 (8px) gutter and the panel is a rounded card, so a
  // pinned panel leaves 8px gaps + rounded corners on each side where scrolled content leaks
  // through. Break out of the gutter to a full-bleed, squared, side/top-borderless bar via inline
  // style (beats the card's w-full / rounded-lg / border classes deterministically).
  const stickyStyle = sticky
    ? isMobileLayout
      ? {
          width: 'auto',
          marginLeft: '-0.5rem',
          marginRight: '-0.5rem',
          borderRadius: 0,
          borderTopWidth: 0,
          borderLeftWidth: 0,
          borderRightWidth: 0,
        }
      : undefined
    : undefined;
  const { wrapSticky, stuck } = useEscapedStickyPanel(sticky, stickyTop);
  // Config-driven rows take precedence over mobileLayout/Card single-row when present.
  const layoutRows = layout?.rows && layout.rows.length > 0 ? layout.rows : null;
  const resolvedPanelTitle = displayFilterLabel(title, language, localizeText);

  // Publish the pinned panel's height so mobile table headers can park directly below it
  // (consumed via `top: var(--wb-filter-sticky-height)` in useStickyHeaderClone). The panel
  // height is content-driven (filters wrap), so track it live with a ResizeObserver.
  // (`stuck` dep is harmless: since 2026-08-05 the sticky fallback pins in place — no portal,
  // no panel remount — this just republishes the height on pin/unpin.)
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sticky || !isMobileLayout) return;
    const el = panelRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const root = document.documentElement;
    const publish = () => {
      const offset = parseFloat(stickyTop || '0') || 0;
      root.style.setProperty('--wb-filter-sticky-height', `${el.offsetHeight + offset}px`);
    };
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty('--wb-filter-sticky-height');
    };
  }, [sticky, isMobileLayout, stickyTop, stuck]);

  const { markParametersReady, getCurrentTabParams } = useParameterContext();
  // Workbench id namespaces remembered filter selections (same precedent as TableRenderer's
  // localStorage keys), so two workbenches never cross-restore each other's choices.
  const { workbenchId } = useParams();

  // ─── Option cache: fetch scope dataStamps once, expose via context ───────────
  const cacheEnabled = cache?.enabled ?? false;
  // Only fetch stamps when caching is actually on (no useless meta request when disabled).
  const stampDatasourceId = cacheEnabled ? cache?.stampDatasourceId : undefined;
  const stampConfig: DatabaseDataSourceConfig | null = useMemo(
    () =>
      stampDatasourceId
        ? {
            type: 'database-datasource',
            datasourceId: stampDatasourceId,
            parameters: EMPTY_DATASOURCE_PARAMS,
            outputFields: ['scope_code', 'updated_at'],
          }
        : null,
    [stampDatasourceId]
  );
  // Auto-fetch (default) so the gate-aware retry applies if it mounts during the mobile
  // space-sync window. Fail fast & quiet (no toast, no long retries) so a bad/slow stamp
  // source never spams errors or holds the gate open for the full default retry budget.
  const { data: stampData, isInitialized: stampInitialized } = useDatabaseDataSource(
    stampConfig,
    'Table',
    STAMP_FETCH_PARAMS,
    { errorConfig: { showToast: false, retryAttempts: 0 } }
  );
  // Safety valve: never let a hung stamp meta block option loading for more than 3s —
  // after that, fields proceed and fall back to ttl/session caching.
  const [stampTimedOut, setStampTimedOut] = useState(false);
  useEffect(() => {
    if (!stampDatasourceId || stampInitialized) return;
    const timer = setTimeout(() => setStampTimedOut(true), 3000);
    return () => clearTimeout(timer);
  }, [stampDatasourceId, stampInitialized]);
  const cacheContextValue = useMemo<FilterCacheContextValue>(() => {
    const stamps: Record<string, string> = {};
    if (Array.isArray(stampData)) {
      (stampData as Record<string, unknown>[]).forEach(row => {
        const code = row['scope_code'];
        if (code != null) stamps[String(code)] = String(row['updated_at'] ?? '');
      });
    }
    // No stamp DataSource → nothing to wait for; otherwise gate option fetches on meta load
    // (capped at 3s so a hung meta degrades to ttl/session caching instead of stranding).
    const stampsReady = !stampDatasourceId || stampInitialized || stampTimedOut;
    // Resolve the bus param names of this panel's committed date range so store-scoped option
    // datasources can fetch by period (names generated the same way this panel emits them).
    const dateFilter = filters.find(f => f.type === 'presetDateRange' || f.type === 'dateRange');
    let storeDateParamNames: { start: string; end: string } | undefined;
    if (dateFilter?.type === 'dateRange') {
      const { startTime, endTime } = generateDateRangeParameterNames(componentId, dateFilter.key);
      storeDateParamNames = { start: startTime, end: endTime };
    } else if (dateFilter?.type === 'presetDateRange') {
      storeDateParamNames = {
        start: generateUniqueParameterName(componentId, `${dateFilter.key}Start`),
        end: generateUniqueParameterName(componentId, `${dateFilter.key}End`),
      };
    }
    return { enabled: cacheEnabled, ttlMs: cache?.ttlMs, stamps, stampsReady, storeDateParamNames };
  }, [cacheEnabled, cache?.ttlMs, stampData, stampDatasourceId, stampInitialized, stampTimedOut, filters, componentId]);

  // ─── Role-driven filter rules: current user's application roles ───────────────
  // When the user has one of roleFilterRules.roles (app roles from /me/access), the panel
  // auto-selects / forces / hides the configured filters (e.g. pin a store manager to the
  // store view of their own stores). The store DATA is already gated server-side by the
  // injected user id, so this is UX only. Inert unless roleFilterRules.roles is set.
  const { roles: appUserRoles, loading: appAccessLoading, applicationId: accessAppId } = useWorkbenchAppAccess();
  const roleRulesConfigured = !!roleFilterRules?.roles && roleFilterRules.roles.length > 0;
  // "Resolved" = we have a definitive roles answer (the app id has loaded AND the /me/access
  // fetch has settled). Until then we don't yet know whether the user matches a rule.
  const roleRulesReady = !roleRulesConfigured || (!!accessAppId && !appAccessLoading);
  const roleRulesActive =
    roleRulesConfigured && roleRulesReady &&
    appUserRoles.some(r => roleFilterRules!.roles!.includes(r));
  // "Engaged" = apply the role-driven UX now: true when a rule matches AND while the answer is
  // still pending (pessimistic — a matching user, e.g. a store manager, never even briefly sees
  // a hidden/restricted control on load). A non-matching user gets everything back once the
  // role resolves.
  const roleRulesEngaged = roleRulesConfigured && (!roleRulesReady || roleRulesActive);
  const roleHideSet = useMemo(
    () => new Set(roleRulesEngaged ? roleFilterRules?.hideFilters ?? [] : []),
    [roleRulesEngaged, roleFilterRules]
  );
  // Per-filter option/segment restriction: keep the control but limit it to a subset of values
  // for matching roles (e.g. the view switch shows only the 'store' segment, not 'hq').
  const roleRestrictMap = useMemo<Record<string, Set<string>>>(() => {
    const out: Record<string, Set<string>> = {};
    if (roleRulesEngaged && roleFilterRules?.restrictOptions) {
      Object.entries(roleFilterRules.restrictOptions).forEach(([k, vals]) => {
        if (Array.isArray(vals) && vals.length > 0) out[k] = new Set(vals);
      });
    }
    return out;
  }, [roleRulesEngaged, roleFilterRules]);
  const applyRoleRestriction = useCallback(
    (filter: FilterConfig): FilterConfig => {
      const allow = roleRestrictMap[filter.key];
      if (!allow) return filter;
      if (filter.segments) return { ...filter, segments: filter.segments.filter(s => allow.has(s.value)) };
      if (filter.options) return { ...filter, options: filter.options.filter(o => allow.has(o.value)) };
      return filter;
    },
    [roleRestrictMap]
  );
  const roleSelectAllKeys = useMemo(
    () => (roleRulesActive ? roleFilterRules?.selectAllFilters ?? [] : []),
    [roleRulesActive, roleFilterRules]
  );
  const roleRulesAppliedRef = useRef(false);

  // Pristine config-only defaults, captured before any URL/bus values are folded in — the
  // restore target when entering a partition that has no snapshot yet.
  const pristineDefaultsRef = useRef<Record<string, any>>({});
  const [filterValues, setFilterValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    filters.forEach(filter => {
      if (filter.type === 'dateRange') {
        const resolvedRange = resolveDateRangeDefault(filter);
        if (resolvedRange) {
          initial[filter.key] = applyConfiguredTimeToDateRange(filter, resolvedRange);
        }
      } else if (filter.type === 'presetDateRange') {
        // Must always have a default so periodStart/periodEnd emit on load (downstream binds
        // waitForValue). Bus/URL params win, then the remembered last selection, then the
        // configured defaultValue / first fiscal preset — panel never loads with nothing selected.
        const resolved = resolvePresetDateRangeInitial(
          filter,
          componentId,
          workbenchId,
          getCurrentTabParams()
        );
        if (resolved) Object.assign(initial, resolved);
      } else if (filter.defaultValue !== undefined && filter.defaultValue !== null) {
        if (filter.type === 'tagInput') {

          initial[filter.key] = Array.isArray(filter.defaultValue) ? filter.defaultValue : [];
        } else if (filter.type === 'select' && (filter.useFirstOptionAsDefault || filter.defaultValue === '__first_option__')) {
          const firstOptionValue = getFirstOptionValue(filter, filter.options || []);
          if (firstOptionValue !== undefined) {
            initial[filter.key] = firstOptionValue;
          } else {
            const fallbackValue = resolveSelectDefaultFallback(filter);
            if (fallbackValue !== undefined) {
              initial[filter.key] = fallbackValue;
            }
          }
        } else {

          initial[filter.key] = filter.defaultValue;
        }
      } else if (filter.multiple) {
        initial[filter.key] = [];
      } else if (filter.type === 'tagInput') {
        initial[filter.key] = [];
      } else if (filter.type === 'filterSheet') {
        // Seed each dimension empty so sendParameters emits it ('') on mount. Combined with the
        // databaseDatasourceParams fix (treat '' as resolved), consumers binding these dims via
        // {type:'parameter'} resolve immediately instead of hanging (component never fetches).
        const textKeys = filterSheetTextKeys(filter.sections || []);
        collectFilterSheetKeys(filter).forEach(k => {
          initial[k] = textKeys.has(k) ? '' : [];
        });
      }
    });
    // Capture pure config defaults BEFORE hydration — the partition restore target.
    pristineDefaultsRef.current = { ...initial };
    // Hydrate committed values, lowest to highest priority: config defaults < cross-page
    // shared store (a sibling panel's last commit) < this page's own bus (URL-seeded params
    // and anything committed on this page). Without this, the initial sendParameters below
    // would overwrite the page bus with defaults, dropping selections made on other pages.
    const syncMap = buildBusSyncMap(filters, componentId);
    const shared = sharedPanelValues.get(componentId);
    if (shared) {
      const pageKeys = new Set(collectEffectScopeKeys(filters, 'page'));
      Object.values(syncMap).forEach(target => {
        if (pageKeys.has(target.key)) return; // page-private: never hydrated from other pages
        if (shared[target.key] !== undefined) initial[target.key] = shared[target.key];
      });
    }
    const busParams = typeof getCurrentTabParams === 'function' ? getCurrentTabParams() : {};
    Object.entries(syncMap).forEach(([paramName, target]) => {
      const v = busParams[paramName];
      if (v === undefined) return;
      initial[target.key] = parseBusValue(v, target.isArray);
    });
    return initial;
  });

  const emitParamNames = useMemo(() => {
    const params: string[] = [];
    filters.forEach(filter => {
      params.push(...getFilterEmitParamNames(filter, componentId));
    });
    return params;
  }, [componentId, filters]);

  
  // filter params back onto the bus, fold it into filterValues so the trigger badge + sheet stay
  // in sync. (We emit but never auto-re-emit on filterValues change, so this can't loop.)
  const externalSyncMap = useMemo(() => buildBusSyncMap(filters, componentId), [filters, componentId]);

  // Communication identity must be unique PER PANEL INSTANCE, not per configured componentId:
  // panels on different pages intentionally share `componentId` (one param namespace), but the
  // listener registry keys subscriptions by this id (a second mount would evict the first's
  // subscription) and the self-emit guard below compares against it (a shared id made panels
  // ignore each other's emits and drift apart across pages). Param NAMES keep using the shared
  // componentId — only the subscriber/emitter identity is instance-scoped.
  const commInstanceId = useRef(`${componentId}::${Math.random().toString(36).slice(2, 9)}`).current;

  // Auto-detected mirror between the store dropdown (pillSelect) and the filterSheet store tab:
  // same option datasource + value key -> one shared store selection (see buildStoreMirrorMap).
  const storeMirrorMap = useMemo(() => buildStoreMirrorMap(filters), [filters]);

  // Role-pinned chips ("fixed store tags"): for a matching role, the listed filters' selected
  // chips bar shows EVERY option as a fixed chip (no ×, no clear-all) and clicking a chip
  // toggles its selection in place. A mirrored pillSelect key covers its sheet partner (and
  // vice versa), since the mirrored bar renders only once — by the sheet's chips group.
  // Gated on roleRulesActive (not the pessimistic roleRulesEngaged): pinned mode is an
  // ADDITIVE UX, so during the pending window everyone keeps the normal removable chips —
  // a possibly non-matching user must not briefly lose the ×, and a store manager briefly
  // seeing removable chips is harmless (the store data itself is gated server-side).
  const rolePinnedChipsSet = useMemo(() => {
    const set = new Set<string>(roleRulesActive ? roleFilterRules?.pinnedChipsFilters ?? [] : []);
    set.forEach(k => {
      const partner = storeMirrorMap[k];
      if (partner) set.add(partner);
    });
    return set;
  }, [roleRulesActive, roleFilterRules, storeMirrorMap]);

  // All value keys owned by partition-scoped filters (a filterSheet contributes every section key).
  const partitionScopedKeys = useMemo(() => {
    if (!partition?.key) return [];
    return collectEffectScopeKeys(filters.filter(f => f.key !== partition.key), 'partition');
  }, [filters, partition?.key]);

  // Page-private value keys: excluded from cross-page publish, hydration, and sibling folds.
  const pageScopedKeys = useMemo(() => new Set(collectEffectScopeKeys(filters, 'page')), [filters]);

  // Partition switch: merged into the same state update / emit batch as the switch itself,
  // so consumers never observe the new partition with the old partition's filters.
  const buildPartitionSwitchPatch = (
    prev: Record<string, any>,
    fromValue: unknown,
    toValue: unknown
  ): Record<string, any> =>
    computePartitionRestore(
      partitionSnapshots, componentId, partitionScopedKeys, prev, fromValue, toValue, pristineDefaultsRef.current
    );

  const externalSyncRef = useRef<(key: string, value: unknown, event?: { componentId?: string }) => void>(() => {});
  externalSyncRef.current = (key, value, event) => {
    if (event?.componentId === commInstanceId) return; // ignore this instance's own emits
    const target = externalSyncMap[key];
    if (!target) return;
    const parsed: string[] | string = target.isArray
      ? (Array.isArray(value)
        ? value.map(v => String(v)).filter(Boolean)
        : String(value ?? '').split(',').map(s => s.trim()).filter(Boolean))
      : (value == null ? '' : String(value));
    setFilterValues(prev => {
      const cur = prev[target.key];
      const same = target.isArray
        ? Array.isArray(cur) && cur.length === (parsed as string[]).length && cur.every((v, i) => v === (parsed as string[])[i])
        : cur === parsed;
      if (same) return prev;
      // Mirror the inbound value onto its partner key (store dropdown <-> sheet store tab) so the
      // sheet draft + shared chips stay consistent. Local-only (no re-emit) — same as before.
      return { ...prev, ...expandStoreMirror({ [target.key]: parsed }, storeMirrorMap) };
    });
  };
  const onExternalParamChange = useCallback(
    (key: string, value: unknown, event?: { componentId?: string }) => externalSyncRef.current(key, value, event),
    []
  );

  const { emit, emitBatch } = useComponentCommunication({
    componentId: commInstanceId,
    emitParameters: emitParamNames,
    listenParameters: emitParamNames,
    onParameterChange: onExternalParamChange,
    autoCleanup: true
  });

  const sendParameters = useCallback((values: Record<string, any>, opts?: { publish?: boolean }) => {
    const paramsToEmit: Record<string, any> = {};
    const processedKeys = new Set<string>();

    filters.forEach(filter => {
      // filterSheet has no single value of its own — each dimension is stored under
      // its own key and emitted by the values loop below.
      if (filter.type === 'filterSheet') {
        return;
      }
      processedKeys.add(filter.key);
      let filterValue = values[filter.key];

      if (filter.type === 'dateRange') {
        if (filterValue === undefined) {
          const resolved = resolveDateRangeDefault(filter);
          if (resolved) {
            filterValue = applyConfiguredTimeToDateRange(filter, resolved);
          }
        }
      } else if (
        !filter.multiple &&
        filterValue === undefined &&
        filter.defaultValue !== undefined &&
        filter.defaultValue !== null
      ) {

        filterValue = filter.defaultValue;
      }

      if (filter.type === 'dateRange') {

        const { startTime, endTime } = generateDateRangeParameterNames(componentId, filter.key);
        const dateRange = filterValue as DateRange | undefined;

        if (dateRange?.from) {
          paramsToEmit[startTime] = formatDateRangeStartForParams(filter, new Date(dateRange.from));
        }
        if (dateRange?.to) {
          paramsToEmit[endTime] = formatDateRangeEndForParams(filter, new Date(dateRange.to));
        }
      } else {

        const paramName = generateUniqueParameterName(componentId, filter.key);

        let valueToSend = filterValue;
        if (
          !filter.multiple &&
          (valueToSend === undefined || valueToSend === null) &&
          filter.defaultValue !== undefined &&
          filter.defaultValue !== null
        ) {
          valueToSend = filter.defaultValue;
        }

        if (filter.type === 'tagInput' || filter.multiple) {
          // Multi-select params travel as real arrays; the API expands them into the
          // SQL IN list. Legacy quoted-CSV strings remain accepted for old callers.
          paramsToEmit[paramName] = Array.isArray(valueToSend)
            ? valueToSend
            : (valueToSend === undefined || valueToSend === null || valueToSend === ''
              ? []
              : [valueToSend]);
        } else if (valueToSend !== undefined && valueToSend !== null) {

          paramsToEmit[paramName] = valueToSend;
        } else {

          paramsToEmit[paramName] = '';
        }
      }
    });

    Object.entries(values).forEach(([filterKey, filterValue]) => {
      if (processedKeys.has(filterKey)) {

        return;
      }

      const paramName = generateUniqueParameterName(componentId, filterKey);

      if (Array.isArray(filterValue)) {
        // filterSheet dimension arrays (status, categories, storeIds, …) travel as
        // first-class arrays, same as the tagInput/multiple-select paths: the API expands
        // them into the SQL IN/ANY list (applyMultiValueParameter). Consuming datasources
        // use the dual-dialect ARRAY[{{param}}] form (sales storeFilterSql / product
        // mvCsv+mvArr), so legacy plain-CSV callers keep working too. An empty array means
        // "no selection" — the API drops it and the SQL guard stays open, matching the
        // legacy '' contract.
        paramsToEmit[paramName] = filterValue;
      } else if (filterValue !== undefined && filterValue !== null) {

        paramsToEmit[paramName] = filterValue;
      }
    });

    if (Object.keys(paramsToEmit).length > 0) {
      emitBatch(paramsToEmit);
    }
    // Broadcast the committed state to sibling panel instances on other pages (they fold it
    // and re-emit on their own page bus). Page-private keys never leave this page. Folding
    // paths pass publish:false — that, plus the fromInstance check on the receiving side,
    // prevents publish ping-pong.
    if (opts?.publish !== false) {
      const toPublish = pageScopedKeys.size === 0
        ? values
        : Object.fromEntries(Object.entries(values).filter(([k]) => !pageScopedKeys.has(k)));
      publishSharedPanelValues(componentId, commInstanceId, toPublish);
    }
  }, [componentId, filters, emitBatch, commInstanceId, pageScopedKeys]);

  const handleFilterChange = useCallback((key: string, value: any) => {
    const filter = filters.find(f => f.key === key);
    let storedValue = value;
    if (
      filter?.type === 'dateRange' &&
      filter.useSpecifiedTime === true &&
      filter.showTimePicker !== true
    ) {
      const range = value as DateRange | undefined;
      if (range?.from && range?.to) {
        storedValue = applyConfiguredTimeToDateRange(filter, {
          from: new Date(range.from),
          to: new Date(range.to)
        });
      }
    }

    setFilterValues(prev => {
      let patch: Record<string, any> = { [key]: storedValue };
      if (
        partition?.key === key &&
        partitionScopedKeys.length > 0 &&
        String(prev[key] ?? '') !== String(storedValue ?? '')
      ) {
        patch = { ...patch, ...buildPartitionSwitchPatch(prev, prev[key], storedValue) };
      }
      const newValues = { ...prev, ...expandStoreMirror(patch, storeMirrorMap) };

      sendParameters(newValues);

      onFilterChange?.(newValues);

      return newValues;
    });
  }, [filters, onFilterChange, sendParameters, storeMirrorMap, partition?.key, partitionScopedKeys]);

  // Merge a patch of several dimension values at once and emit a single batch.
  // Used by filterSheet's "Apply" to commit all sections together.
  const handleMultiFilterChange = useCallback((patch: Record<string, any>) => {
    setFilterValues(prev => {
      const newValues = { ...prev, ...expandStoreMirror(patch, storeMirrorMap) };
      sendParameters(newValues);
      onFilterChange?.(newValues);
      return newValues;
    });
  }, [onFilterChange, sendParameters, storeMirrorMap]);

  // Role-driven rules: once we know the user matches, force the configured filter values in
  // ONE batch. handleMultiFilterChange bypasses the partition snapshot/restore path (that only
  // runs in handleFilterChange), so forced values can't be wiped by a view switch. Runs once;
  // non-matching users never trigger it, so their panel stays unchanged. (selectAllFilters are
  // applied separately by RoleAutoSelectApplier once their option lists load.)
  useEffect(() => {
    if (!roleRulesActive || roleRulesAppliedRef.current) return;
    roleRulesAppliedRef.current = true;
    const forced = roleFilterRules?.forceValues;
    if (forced && Object.keys(forced).length > 0) {
      handleMultiFilterChange({ ...forced });
    }
  }, [roleRulesActive, roleFilterRules, handleMultiFilterChange]);

  // Fold sibling-panel commits (same componentId on another page) into this instance and
  // re-emit them on THIS page's bus — data components only read their own page's bus, so
  // without the re-emit a cross-page selection would filter one page but not the other.
  const sendParametersRef = useRef(sendParameters);
  sendParametersRef.current = sendParameters;
  const externalSyncMapRef = useRef(externalSyncMap);
  externalSyncMapRef.current = externalSyncMap;
  const pageScopedKeysRef = useRef(pageScopedKeys);
  pageScopedKeysRef.current = pageScopedKeys;
  useEffect(() => {
    let subs = sharedPanelSubscribers.get(componentId);
    if (!subs) { subs = new Set(); sharedPanelSubscribers.set(componentId, subs); }
    const handler = (values: Record<string, any>, fromInstance: string) => {
      if (fromInstance === commInstanceId) return;
      setFilterValues(prev => {
        const patch: Record<string, any> = {};
        Object.values(externalSyncMapRef.current).forEach(target => {
          if (pageScopedKeysRef.current.has(target.key)) return; // page-private: keep this page's own value
          if (values[target.key] !== undefined) patch[target.key] = values[target.key];
        });
        if (Object.keys(patch).length === 0) return prev;
        const next = { ...prev, ...patch };
        sendParametersRef.current(next, { publish: false });
        return next;
      });
    };
    subs.add(handler);
    return () => { subs.delete(handler); };
  }, [componentId, commInstanceId]);

  const handlePresetClick = useCallback((preset: { label: string; value: Record<string, any> }) => {
    let newValues = { ...filterValues, ...preset.value };
    filters.forEach(f => {
      if (
        f.type === 'dateRange' &&
        f.useSpecifiedTime === true &&
        f.showTimePicker !== true
      ) {
        const range = newValues[f.key] as DateRange | undefined;
        if (range?.from && range?.to) {
          newValues = {
            ...newValues,
            [f.key]: applyConfiguredTimeToDateRange(f, {
              from: new Date(range.from),
              to: new Date(range.to)
            })
          };
        }
      }
    });
    setFilterValues(newValues);

    sendParameters(newValues);

    onFilterChange?.(newValues);
  }, [filterValues, filters, onFilterChange, sendParameters]);

  const getDefaultValueForFilter = useCallback((filter: FilterConfig): any => {

    if (filterValues[filter.key] !== undefined) {
      return filterValues[filter.key];
    }

    if (filter.defaultValue !== undefined && filter.defaultValue !== null) {
      return filter.defaultValue;
    }

    if (filter.multiple) {
      return [];
    }

    return undefined;
  }, [filterValues]);

  // Committed-values signature for updateTime.refreshOnQuery: filterValues only ever changes
  // on a real commit (handleFilterChange / handleMultiFilterChange or a bus fold-in), so this
  // string changes exactly when a query-triggering commit lands — uncommitted typing inside
  // sheets never touches it, and identical re-commits collapse to the same signature.
  const committedValuesSignature = useMemo(() => JSON.stringify(filterValues), [filterValues]);

  const renderSelectFilter = (filter: FilterConfig, options: FilterOption[]) => {
    const isSelectInline = !isMobileLayout;
    const selectStyle = filter.style || {};
    const currentValue = filterValues[filter.key];
    const selectWidthStyle = getSelectWidthStyle(filter, isMobileLayout);
    const localizedOptions = options.map((option) => ({
      ...option,
      label: displayFilterLabel(option.label, language, localizeText),
    }));

    if (filter.multiple) {

      const selectedValues = Array.isArray(currentValue)
        ? currentValue.map(value => String(value))
        : hasExplicitValue(currentValue)
          ? [String(currentValue)]
          : [];

      const multiSelectOptions: MultiSelectOption[] = localizedOptions
        .map(option => ({
          label: option.label,
          value: option.value
        }));

      return (
        <div 
          key={filter.key} 
          className={cn(
            "flex",
            isSelectInline ? "items-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap" : mobileFilterFieldStyles.field
          )}
          style={selectStyle.marginTop ? { marginTop: selectStyle.marginTop } : undefined}
        >
          {!isSelectInline && <Label className={mobileFilterFieldStyles.label}>{displayFilterLabel(filter.label, language, localizeText)}</Label>}
          {isSelectInline && <Label className="text-sm font-medium whitespace-nowrap">{displayFilterLabel(filter.label, language, localizeText)}:</Label>}
          <div 
            className={cn(
              getSelectContainerClassName(filter, isSelectInline),
              !isSelectInline && mobileFilterFieldStyles.control
            )}
            style={selectWidthStyle}
          >
            <MultiSelect
              options={multiSelectOptions}
              value={selectedValues}
              onChange={(newValues) => handleFilterChange(filter.key, newValues)}
              placeholder={displayFilterLabel(filter.placeholder, language, localizeText) || t('common:please_select', 'Please Select')}
              maxDisplayCount={3}
              showClearButton={true}
              triggerClassName={cn(isSelectInline ? "h-8" : "h-9 w-full", "dark:bg-card dark:border-border")}
              contentClassName="dark:bg-card dark:border-border"
            />
          </div>
        </div>
      );
    }

    return (
      <div 
        key={filter.key} 
        className={cn(
          "flex",
          isSelectInline ? "items-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap" : mobileFilterFieldStyles.field
        )}
        style={selectStyle.marginTop ? { marginTop: selectStyle.marginTop } : undefined}
      >
        {!isSelectInline && <Label className={mobileFilterFieldStyles.label}>{displayFilterLabel(filter.label, language, localizeText)}</Label>}
        {isSelectInline && <Label className="text-sm font-medium whitespace-nowrap">{displayFilterLabel(filter.label, language, localizeText)}:</Label>}
        <div className={cn(!isSelectInline && mobileFilterFieldStyles.control)}>
          <Select
            value={getSelectControlValue(currentValue)}
            onValueChange={(value) => handleFilterChange(filter.key, decodeSelectOptionValue(value))}
          >
            <SelectTrigger 
              className={cn(
                getSelectContainerClassName(filter, isSelectInline),
                !isSelectInline && mobileFilterFieldStyles.selectTrigger,
                isSelectInline && "dark:bg-card dark:border-border"
              )}
              style={selectWidthStyle}
            >
              <SelectValue placeholder={displayFilterLabel(filter.placeholder, language, localizeText) || undefined} />
            </SelectTrigger>
            <SelectContent className="dark:bg-card dark:border-border">
              {localizedOptions.map(option => (
                <SelectItem key={encodeSelectOptionValue(option.value)} value={encodeSelectOptionValue(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  const renderRadioFilter = (filter: FilterConfig) => {
    const options = filter.buttons || filter.options || [];

    const defaultValue = getDefaultValueForFilter(filter);

    let currentValue: string | string[] = filterValues[filter.key];
    if (currentValue === undefined) {
      currentValue = defaultValue;
    }
    if (currentValue === undefined) {

      currentValue = filter.multiple ? [] : '';
    }

    if (filter.multiple && !Array.isArray(currentValue)) {
      currentValue = currentValue !== undefined && currentValue !== null && currentValue !== '' 
        ? [String(currentValue)] 
        : [];
    }

    const widthStyle = getSelectWidthStyle(filter, isMobileLayout);
    return (
      <div key={filter.key} style={widthStyle}>
        <RadioButtonGroup
          options={options}
          value={currentValue}
          onChange={(value) => handleFilterChange(filter.key, value)}
          label={displayFilterLabel(filter.label, language, localizeText)}
          multiple={filter.multiple}
          defaultValue={defaultValue}
          getOptionClassName={(option, isSelected) => {
            if (isSelected) {
              return "inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border cursor-pointer transition-colors bg-primary text-primary-foreground border-primary shadow-sm";
            }
            return "inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border cursor-pointer transition-colors bg-background text-foreground border-border hover:bg-neutral-200/90 hover:border-neutral-300 hover:shadow-sm dark:bg-card dark:border-border dark:hover:bg-muted dark:hover:border-border dark:hover:shadow-md";
          }}
        />
      </div>
    );
  };

  const renderDateRangeFilter = (filter: FilterConfig) => {
    const dateRange = filterValues[filter.key] as DateRange | undefined;
    const widthStyle = getSelectWidthStyle(filter, isMobileLayout);

    if (isMobileLayout) {
      return (
        <MobileDateRangeFilterField
          key={filter.key}
          label={displayFilterLabel(filter.label, language, localizeText)}
          value={dateRange}
          onChange={(range) => handleFilterChange(filter.key, range || {})}
          quickSelect={filter.quickSelect}
          quickSelectItems={filter.quickSelectItems}
          showTimePicker={filter.showTimePicker === true}
          placeholder={displayFilterLabel(filter.placeholder, language, localizeText) || undefined}
          timeConfig={filter}
        />
      );
    }

    return (
      <DateRangeFilter
        key={filter.key}
        value={dateRange}
        onChange={(range) => handleFilterChange(filter.key, range || {})}
        label={displayFilterLabel(filter.label, language, localizeText)}
        inline={true}
        showQuickSelect={filter.quickSelect !== false}
        showTimePicker={filter.showTimePicker === true}
        quickSelectItems={filter.quickSelectItems}
        placeholder={displayFilterLabel(filter.placeholder, language, localizeText) || undefined}
        popoverContentClassName="workbench-filter-panel-daterange-popover"
        style={{ ...(filter.style || {}), ...(widthStyle || {}) }}
      />
    );
  };

  const renderTextFilter = (filter: FilterConfig) => {
    const isInline = !isMobileLayout;
    const inputStyle = filter.style || {};
    const currentValue = filterValues[filter.key] || '';
    const widthStyle = getSelectWidthStyle(filter, isMobileLayout);

    return (
      <div 
        key={filter.key} 
        className={cn(
          "flex",
          isInline ? "items-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap" : mobileFilterFieldStyles.field
        )}
        style={inputStyle.marginTop ? { marginTop: inputStyle.marginTop } : undefined}
      >
        {!isInline && <Label className={mobileFilterFieldStyles.label}>{displayFilterLabel(filter.label, language, localizeText)}</Label>}
        {isInline && <Label className="text-sm font-medium whitespace-nowrap">{displayFilterLabel(filter.label, language, localizeText)}:</Label>}
        <div className={cn(!isInline && mobileFilterFieldStyles.control)}>
          <DialogInput
            type="text"
            value={currentValue}
            onChange={(value: string | number) => handleFilterChange(filter.key, value)}
            placeholder={displayFilterLabel(filter.placeholder, language, localizeText) || undefined}
            label={isInline ? undefined : displayFilterLabel(filter.label, language, localizeText)}
            dialogTitle={displayFilterLabel(filter.label, language, localizeText)}
            className={cn(isInline ? "min-w-[200px] sm:min-w-[240px] w-full sm:w-auto h-8" : "w-full h-9")}
            style={widthStyle}
            minWidth={isInline ? "200px" : undefined}
          />
        </div>
      </div>
    );
  };

  const renderNumberFilter = (filter: FilterConfig) => {
    const isInline = !isMobileLayout;
    const inputStyle = filter.style || {};
    const currentValue = filterValues[filter.key] ?? '';
    const widthStyle = getSelectWidthStyle(filter, isMobileLayout);

    return (
      <div 
        key={filter.key} 
        className={cn(
          "flex",
          isInline ? "items-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap" : mobileFilterFieldStyles.field
        )}
        style={inputStyle.marginTop ? { marginTop: inputStyle.marginTop } : undefined}
      >
        {!isInline && <Label className={mobileFilterFieldStyles.label}>{displayFilterLabel(filter.label, language, localizeText)}</Label>}
        {isInline && <Label className="text-sm font-medium whitespace-nowrap">{displayFilterLabel(filter.label, language, localizeText)}:</Label>}
        <div className={cn(!isInline && mobileFilterFieldStyles.control)}>
          <DialogInput
            type="number"
            value={currentValue}
            onChange={(value: string | number) => handleFilterChange(filter.key, value)}
            placeholder={displayFilterLabel(filter.placeholder, language, localizeText) || undefined}
            label={isInline ? undefined : displayFilterLabel(filter.label, language, localizeText)}
            dialogTitle={displayFilterLabel(filter.label, language, localizeText)}
            className={cn(isInline ? "min-w-[200px] sm:min-w-[240px] w-full sm:w-auto h-8" : "w-full h-9")}
            style={widthStyle}
            minWidth={isInline ? "200px" : undefined}
          />
        </div>
      </div>
    );
  };

  const renderTagInputFilter = (filter: FilterConfig) => {
    const isInline = !isMobileLayout;
    const inputStyle = filter.style || {};
    const currentValue = filterValues[filter.key] || [];
    const widthStyle = getSelectWidthStyle(filter, isMobileLayout);

    const maxTags = filter.maxTags !== undefined ? filter.maxTags : 5;

    return (
      <div 
        key={filter.key} 
        className={cn(
          "flex",
          isInline ? "items-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap" : mobileFilterFieldStyles.field
        )}
        style={inputStyle.marginTop ? { marginTop: inputStyle.marginTop } : undefined}
      >
        {!isInline && <Label className={mobileFilterFieldStyles.label}>{displayFilterLabel(filter.label, language, localizeText)}</Label>}
        {isInline && <Label className="text-sm font-medium whitespace-nowrap">{displayFilterLabel(filter.label, language, localizeText)}:</Label>}
        <div className={cn(!isInline && mobileFilterFieldStyles.control)}>
          <DialogTagInput
            value={Array.isArray(currentValue) ? currentValue : []}
            onChange={(tags: string[]) => handleFilterChange(filter.key, tags)}
            placeholder={displayFilterLabel(filter.placeholder, language, localizeText) || undefined}
            label={isInline ? undefined : displayFilterLabel(filter.label, language, localizeText)}
            dialogTitle={displayFilterLabel(filter.label, language, localizeText)}
            className={cn(isInline ? "min-w-[200px] sm:min-w-[240px] w-full sm:w-auto h-8" : "w-full h-9")}
            style={widthStyle}
            minWidth={isInline ? "200px" : undefined}
            maxTags={maxTags}
          />
        </div>
      </div>
    );
  };

  const [dataSourceReadyMap, setDataSourceReadyMap] = useState<Record<string, boolean>>({});

  const handleDataSourceReady = useCallback((filterKey: string, isReady: boolean) => {
    setDataSourceReadyMap(prev => {
      if (prev[filterKey] === isReady) {
        return prev; 
      }
      return { ...prev, [filterKey]: isReady };
    });
  }, []);

  const shouldShowFilter = useCallback((filter: FilterConfig): boolean => {
    // Role-driven: hide configured filters for matching-role users (e.g. the HQ/Store switch
    // for a store manager). roleHideSet is empty when no rule matches, so defaults hold.
    if (roleHideSet.has(filter.key)) return false;
    if (!filter.visibleWhen) return true;
    const { key, value } = filter.visibleWhen;
    const currentValue = filterValues[key];
    return Array.isArray(value) ? value.includes(currentValue) : currentValue === value;
  }, [filterValues, roleHideSet]);

  // Role-driven select-all: hidden appliers that select ALL options of each selectAllFilters
  // entry once its (server-filtered) option list loads. Empty unless a role rule matches.
  const roleAutoSelectAppliers = roleSelectAllKeys.map((k) => {
    const f = filters.find((x) => x.key === k);
    if (!f || !(f.dataSource?.datasourceId || f.dataSource?.datasetId)) return null;
    const applyKey = `${componentId}:${k}`;
    // Auto-select-all ONCE per session, and only while the filter is still empty — so a manual
    // change (e.g. the user deselected a store) is respected across page switches, not re-forced
    // back to all options. hasSelection also skips it when a value was hydrated from the bus.
    const cur = filterValues[k];
    const hasSelection = Array.isArray(cur) ? cur.length > 0 : (cur !== undefined && cur !== null && cur !== '');
    if (roleSelectAllDone.has(applyKey) || hasSelection) return null;
    return (
      <RoleAutoSelectApplier
        key={`rsa-${k}`}
        filter={f}
        lang={language}
        onApply={(patch) => { roleSelectAllDone.add(applyKey); handleMultiFilterChange(patch); }}
      />
    );
  });

  // Hidden publishers for filter.groupCountField (multiple pillSelect): always mounted (not
  // tied to the chips bar's mount conditions) so the derived `{key}GroupCount` page param
  // tracks every selection change — including clearing to an empty selection (emits 0).
  const emitGroupCountParam = useCallback(
    (paramName: string, count: number) => emit(paramName, count),
    [emit]
  );
  const groupCountPublishers = filters
    .filter(f => f.type === 'pillSelect' && f.multiple && !!f.groupCountField)
    .map(f => (
      <GroupCountParamPublisher
        key={`gcp-${f.key}`}
        filter={f}
        value={filterValues[f.key]}
        lang={language}
        paramName={generateUniqueParameterName(componentId, `${f.key}GroupCount`)}
        onEmit={emitGroupCountParam}
      />
    ));

  const renderFilter = (rawFilter: FilterConfig) => {
    // Role-driven option/segment restriction (e.g. store manager sees only the 'store' segment).
    const filter = applyRoleRestriction(rawFilter);

    if (filter.type === 'select' && (filter.dataSource?.datasourceId || filter.dataSource?.datasetId)) {
      return (
        <SelectFilterWithDataSource
          key={filter.key}
          filter={filter}
          onFilterChange={handleFilterChange}
          filterValues={filterValues}
          onDataSourceReady={handleDataSourceReady}
          isMobileLayout={isMobileLayout}
        />
      );
    }

    switch (filter.type) {
      case 'select':
        return renderSelectFilter(filter, filter.options || []);
      case 'radio':
        return renderRadioFilter(filter);
      case 'dateRange':
        return renderDateRangeFilter(filter);
      case 'text':
        return renderTextFilter(filter);
      case 'number':
        return renderNumberFilter(filter);
      case 'tagInput':
        return renderTagInputFilter(filter);
      case 'segmented': {
        const segs = filter.segments || [];
        const curVal = filterValues[filter.key] ?? filter.defaultValue;
        return (
          <div key={filter.key} className={isMobileLayout ? cn(mobileFilterFieldStyles.field, 'flex-row flex-wrap gap-1') : 'flex items-center gap-2'}>
            {filter.label && !isMobileLayout && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">{displayFilterLabel(filter.label, language, localizeText)}</span>
            )}
            <div className={cn('flex bg-slate-100 dark:bg-neutral-800 rounded-full p-0.5', isMobileLayout && 'max-w-full overflow-x-auto')}>
              {segs.map(seg => (
                <button
                  key={seg.value}
                  type="button"
                  onClick={() => handleFilterChange(filter.key, seg.value)}
                  className={cn(
                    'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors',
                    // A lone segment (e.g. after a role restricts the switch to one option) is always
                    // shown selected — it is the only choice, so it should never render un-highlighted
                    // even before the value-force settles.
                    curVal === seg.value || segs.length === 1
                      ? 'bg-white text-indigo-600 shadow-sm dark:bg-neutral-700 dark:text-indigo-300'
                      : 'text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-300'
                  )}
                >
                  {seg.icon && renderLucideIcon(seg.icon, 'w-3.5 h-3.5')}
                  {resolveBilingualLabel(seg.label, language)}
                </button>
              ))}
            </div>
          </div>
        );
      }
      case 'presetDateRange':
        return (
          <PresetDateRangeFilterField
            key={filter.key}
            filter={filter}
            value={filterValues[filter.key] ?? filter.defaultValue ?? filter.fiscalPresets?.[0]?.value}
            committedStart={typeof filterValues[`${filter.key}Start`] === 'string' ? filterValues[`${filter.key}Start`] : undefined}
            committedEnd={typeof filterValues[`${filter.key}End`] === 'string' ? filterValues[`${filter.key}End`] : undefined}
            memoryKey={filter.rememberSelection ? buildFilterMemoryKey(workbenchId, componentId, filter.key) : undefined}
            onFilterChange={handleFilterChange}
            onMultiFilterChange={handleMultiFilterChange}
            isMobileLayout={isMobileLayout}
            headerMode={isHeaderLayout || !!layoutRows}
            updateTimeRefreshKey={committedValuesSignature}
          />
        );
      case 'pillSelect':
        return (
          <PillSelectFilterField
            key={filter.key}
            filter={filter}
            value={filterValues[filter.key]}
            onFilterChange={handleFilterChange}
            isMobileLayout={isMobileLayout}
            headerMode={isHeaderLayout || !!layoutRows}
          />
        );
      case 'filterSheet':
        return (
          <FilterSheetFilterField
            key={filter.key}
            filter={filter}
            committedValues={filterValues}
            onApply={handleMultiFilterChange}
            isMobileLayout={isMobileLayout}
          />
        );
      default:
        return null;
    }
  };

  const initialParamsSent = React.useRef(false);
  const prevFiltersKeyRef = React.useRef<string>('');

  useEffect(() => {

    const filtersKey = filters.map(filterConfigKeyForReset).join('|');

    if (filtersKey === prevFiltersKeyRef.current) {
      return;
    }

    const isFiltersChange = prevFiltersKeyRef.current !== '' && filtersKey !== prevFiltersKeyRef.current;
    prevFiltersKeyRef.current = filtersKey;

    if (isFiltersChange) {
      initialParamsSent.current = false;
    }

    setFilterValues(prev => {
      const updates: Record<string, any> = {};
      let hasUpdates = false;

      filters.forEach(filter => {
        if (prev[filter.key] !== undefined) {
          return;
        }
        if (filter.type === 'dateRange') {
          const resolved = resolveDateRangeDefault(filter);
          if (resolved) {
            updates[filter.key] = applyConfiguredTimeToDateRange(filter, resolved);
            hasUpdates = true;
          }
          return;
        }
        if (filter.type === 'presetDateRange') {
          const resolved = resolvePresetDateRangeInitial(
            filter,
            componentId,
            workbenchId,
            getCurrentTabParams()
          );
          if (resolved) {
            Object.assign(updates, resolved);
            hasUpdates = true;
          }
          return;
        }
        if (filter.defaultValue === undefined || filter.defaultValue === null) {
          return;
        }
        if (filter.type === 'tagInput') {
          updates[filter.key] = Array.isArray(filter.defaultValue) ? filter.defaultValue : [];
        } else if (filter.type === 'select' && (filter.useFirstOptionAsDefault || filter.defaultValue === '__first_option__')) {
          const firstOptionValue = getFirstOptionValue(filter, filter.options || []);
          if (firstOptionValue !== undefined) {
            updates[filter.key] = firstOptionValue;
          } else {
            const fallbackValue = resolveSelectDefaultFallback(filter);
            if (fallbackValue !== undefined) {
              updates[filter.key] = fallbackValue;
            }
          }
        } else {
          updates[filter.key] = filter.defaultValue;
        }
        hasUpdates = true;
      });

      if (hasUpdates) {
        const newValues = { ...prev, ...updates };
        return newValues;
      }

      return prev;
    });
  }, [filters]); 

  useEffect(() => { 

    if (initialParamsSent.current) {
      return;
    }

    if (filters.length === 0) {
      return;
    }

    const allDefaultsSet = filters.every(filter => {
      if (!filterNeedsInitialValue(filter)) {
        return true;
      }
      const value = filterValues[filter.key];
      if (shouldDeferSelectFirstOption(filter, value)) {
        return false;
      }
      return value !== undefined;
    });

    const allDataSourcesReady = filters.every(filter => {
      if (filter.type !== 'select' || !(filter.dataSource?.datasourceId || filter.dataSource?.datasetId)) {
        return true;
      }

      const needsWaitForDataSource = filter.useFirstOptionAsDefault || filter.defaultValue === '__first_option__';
      if (needsWaitForDataSource) {

        if (!(filter.key in dataSourceReadyMap)) {
          return false;
        }
        return dataSourceReadyMap[filter.key] === true;
      }
      if (!(filter.key in dataSourceReadyMap)) {
        return false;
      }
      return dataSourceReadyMap[filter.key] === true;
    });

    // For a matching-role user, hold the first broadcast until forced values are applied, so
    // data components never see a transient default emit (avoids a flash + refetch).
    const roleRulesSettled =
      !roleRulesConfigured ||
      (roleRulesReady && (!roleRulesActive || roleRulesAppliedRef.current));
    if (allDefaultsSet && allDataSourcesReady && roleRulesSettled) {
      initialParamsSent.current = true;

      // Read the LATEST state rather than this render's closure: a child effect in the same
      // commit may have pruned ghost pinned-chip values (role-pinned chips drop committed
      // values that fell out of the option list). Sending the stale closure would republish
      // the ghost values after the prune and the guard above would never correct them.
      setFilterValues(prev => {
        sendParameters(prev);
        return prev;
      });

      const parameterKeys: string[] = [];
      filters.forEach(filter => {
        parameterKeys.push(...getFilterEmitParamNames(filter, componentId));
      });
      markParametersReady(parameterKeys);
    }
  }, [filterValues, filters, sendParameters, dataSourceReadyMap, componentId, markParametersReady,
      roleRulesConfigured, roleRulesReady, roleRulesActive]);

  // Config-driven rows (layout.rows). Each row is a flex group; single-filter rows span
  // full width; `grow` keys expand; the rest size to content. Filters not in any configured
  // row are appended in a final row so nothing is dropped.
  const renderFilterRows = () => {
    const rows = layoutRows!;
    const placed = new Set(rows.flatMap(r => r.keys));
    const leftovers = filters.filter(f => !placed.has(f.key)).map(f => f.key);
    const allRows = leftovers.length ? [...rows, { keys: leftovers }] : rows;
    return (
      <div className="flex flex-col gap-3">
        {allRows.map((row, ri) => {
          const visible = row.keys
            .map(k => filters.find(f => f.key === k))
            .filter((f): f is FilterConfig => !!f && shouldShowFilter(f));
          if (visible.length === 0) return null;
          const single = visible.length === 1;
          const grow = (row as { grow?: string[] }).grow;
          return (
            <div key={ri} className="flex flex-wrap items-center gap-2">
              {visible.map(f => {
                const cls = single ? 'w-full' : grow?.includes(f.key) ? 'flex-1 min-w-0' : 'shrink-0';
                return (
                  <div key={f.key} className={cls}>
                    {renderFilter(f)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  // Selected-values chips for multiple pillSelect filters, tiled full-width at the very
  // top of the panel (keeps the current selection visible above all controls).
  const renderSelectedChipsBars = () => {
    const hasSel = (f: FilterConfig) => {
      const v = filterValues[f.key];
      return Array.isArray(v) ? v.length > 0 : (v != null && v !== '');
    };
    const pillBars = filters.filter(
      // Skip a pillSelect that mirrors a filterSheet dimension (e.g. store dropdown <-> store tab):
      // its merged selection is rendered once by the sheet's group, so we don't double-show it.
      // A role-pinned bar renders even with an empty selection (it shows ALL options as chips).
      f => f.type === 'pillSelect' && f.multiple && f.showSelectedChips !== false && !storeMirrorMap[f.key] && shouldShowFilter(f)
        && (hasSel(f) || rolePinnedChipsSet.has(f.key))
    );
    // filterSheet: active when ANY of its dimensions holds a committed value. Default ON
    // (showSelectedChips !== false), so committed sheet selections surface as chips too.
    // A sheet holding a role-pinned dimension also renders with no selection (pinned shows all).
    const sheetBars = filters.filter(
      f => f.type === 'filterSheet' && f.showSelectedChips !== false && shouldShowFilter(f)
        && collectFilterSheetKeys(f).some(k => isFilterValuePresent(filterValues[k]) || rolePinnedChipsSet.has(k))
    );
    if (pillBars.length === 0 && sheetBars.length === 0) return null;
    return (
      <div className="mb-3 flex flex-col gap-2">
        {pillBars.map(f => (
          <SelectedFilterChipsBar key={f.key} filter={f} value={filterValues[f.key]} onFilterChange={handleFilterChange} pinned={rolePinnedChipsSet.has(f.key)} />
        ))}
        {sheetBars.map(f => (
          <FilterSheetSelectedChips key={f.key} filter={f} values={filterValues} onChange={handleMultiFilterChange} pinnedKeys={rolePinnedChipsSet} />
        ))}
      </div>
    );
  };

  if (isMobileLayout) {
    return (
      <FilterCacheContext.Provider value={cacheContextValue}>
      {roleAutoSelectAppliers}
      {groupCountPublishers}
      {wrapSticky(
      <div ref={panelRef} className={cn(mobileFilterFieldStyles.panel, 'relative', stickyClass, className)} style={stickyStyle}>
        {renderSelectedChipsBars()}
        {resolvedPanelTitle && (
          <h3 className="mb-4 text-base font-semibold text-foreground">{resolvedPanelTitle}</h3>
        )}
        {presets.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {presets.map((preset, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handlePresetClick(preset)}
              >
                {resolveBilingualLabel(preset.label, language)}
              </Button>
            ))}
          </div>
        )}
        {filters.length > 0 && layoutRows && renderFilterRows()}
        {filters.length > 0 && !layoutRows && isHeaderLayout && (
          <div className="flex flex-wrap items-center gap-2">
            {filters.filter(shouldShowFilter).map((filter) => (
              <div key={filter.key} className={headerFilterWrapClass(filter)}>
                {renderFilter(filter)}
              </div>
            ))}
          </div>
        )}
        {filters.length > 0 && !layoutRows && !isHeaderLayout && (
          <div className={mobileFilterFieldStyles.fieldsStack}>
            {filters.filter(shouldShowFilter).map((filter) => renderFilter(filter))}
          </div>
        )}
      </div>
      )}
      </FilterCacheContext.Provider>
    );
  }

  return (
    <FilterCacheContext.Provider value={cacheContextValue}>
    {roleAutoSelectAppliers}
    {groupCountPublishers}
    {wrapSticky(
    <Card className={cn('workbench-filter-panel w-full relative', stickyClass, className)} style={stickyStyle}>
      {(title || presets.length > 0 || filters.length > 0) && (
        <CardHeader className="pb-6">
          {renderSelectedChipsBars()}
          {layoutRows ? (
            <div className="flex flex-col gap-4">
              {resolvedPanelTitle && <CardTitle className="text-base">{resolvedPanelTitle}</CardTitle>}
              {filters.length > 0 && renderFilterRows()}
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {resolvedPanelTitle && <CardTitle className="text-base">{resolvedPanelTitle}</CardTitle>}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
                {presets.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {presets.map((preset, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handlePresetClick(preset)}
                        className="h-8 text-xs"
                      >
                        {resolveBilingualLabel(preset.label, language)}
                      </Button>
                    ))}
                  </div>
                )}
                {filters.length > 0 && (
                  <div className="flex flex-wrap items-center gap-4 md:gap-6">
                    {filters.filter(shouldShowFilter).map(filter => renderFilter(filter))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardHeader>
      )}
    </Card>
    )}
    </FilterCacheContext.Provider>
  );
};

interface SelectFilterWithDataSourceProps {
  filter: FilterConfig;
  onFilterChange: (key: string, value: any) => void;
  filterValues: Record<string, any>;
  onDataSourceReady?: (filterKey: string, isReady: boolean) => void;
  isMobileLayout?: boolean;
}

const EMPTY_DATASOURCE_PARAMS: Record<string, never> = Object.freeze({});

// High page limit so a select's option DataSource isn't truncated to the backend default
// (20 rows). Mirrors STAMP_FETCH_PARAMS — needed once an option list grows past 20 (e.g. full store list).
const SELECT_OPTION_FETCH_PARAMS = Object.freeze({ limit: 1000 });

function buildSelectFilterDataSourceKey(filter: FilterConfig): string {
  const ds = filter.dataSource;
  const datasourceId = ds?.datasourceId || ds?.datasetId;
  if (!datasourceId || !ds) return '';

  return JSON.stringify({
    datasourceId,
    valueField: ds.valueField || 'value',
    labelField: ds.labelField || 'label',
  });
}

const SelectFilterWithDataSource: React.FC<SelectFilterWithDataSourceProps> = ({
  filter,
  onFilterChange,
  filterValues,
  onDataSourceReady,
  isMobileLayout = false,
}) => {
  const { localizeText, language } = useWorkbenchConfigLocale();
  const { t } = useTranslation(['renderers', 'common']);

  const dataSourceConfigKey = useMemo(
    () => buildSelectFilterDataSourceKey(filter),
    [
      filter.dataSource?.datasourceId,
      filter.dataSource?.datasetId,
      filter.dataSource?.valueField,
      filter.dataSource?.labelField,
    ]
  );

  const dataSourceConfig: DatabaseDataSourceConfig | null = useMemo(() => {
    if (!dataSourceConfigKey) return null;
    const parsed = JSON.parse(dataSourceConfigKey) as {
      datasourceId: string;
      valueField: string;
      labelField: string;
    };
    return {
      type: 'database-datasource',
      datasourceId: parsed.datasourceId,
      parameters: EMPTY_DATASOURCE_PARAMS,
      outputFields: [parsed.valueField, parsed.labelField],
    };
  }, [dataSourceConfigKey]);

  const {
    data: dataSourceData,
    loading: dataSourceLoading,
    isInitialized: dataSourceInitialized,
    refetch: refetchDataSource,
  } = useDatabaseDataSource(
    dataSourceConfig,
    'Table',
    SELECT_OPTION_FETCH_PARAMS,
    { autoFetch: false }
  );

  const lastFetchKeyRef = useRef('');
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!dataSourceConfigKey) return;

    if (loadTimerRef.current) {
      clearTimeout(loadTimerRef.current);
    }

    loadTimerRef.current = setTimeout(() => {
      loadTimerRef.current = null;
      if (lastFetchKeyRef.current === dataSourceConfigKey) return;
      lastFetchKeyRef.current = dataSourceConfigKey;
      void refetchDataSource();
    }, 50);

    return () => {
      if (loadTimerRef.current) {
        clearTimeout(loadTimerRef.current);
        loadTimerRef.current = null;
      }
    };
  }, [dataSourceConfigKey, refetchDataSource]);

  const options: FilterOption[] = useMemo(() => {
    if (!dataSourceData || !Array.isArray(dataSourceData)) {
      return (filter.options || []).map(opt => ({
        ...opt,
        label: displayFilterLabel(opt.label, language, localizeText),
      }));
    }

    const valueField = filter.dataSource?.valueField || 'value';
    const labelField = filter.dataSource?.labelField || 'label';

    return dataSourceData.map(item => ({
      value: normalizeOptionValue(item[valueField]),
      label: localizeText(normalizeOptionLabel(item[labelField], item[valueField]))
    }));
  }, [dataSourceData, filter.dataSource, filter.options, localizeText, language]);

  const isSelectInline = !isMobileLayout;
  const selectStyle = filter.style || {};
  const currentValue = filterValues[filter.key];
  const selectWidthStyle = getSelectWidthStyle(filter, isMobileLayout);

  useEffect(() => {
    if (!onDataSourceReady) return;

    if (!dataSourceInitialized || dataSourceLoading) {
      onDataSourceReady(filter.key, false);
      return;
    }

    const needsFirstOption = filter.useFirstOptionAsDefault || filter.defaultValue === '__first_option__';
    if (needsFirstOption) {
      onDataSourceReady(filter.key, options.length > 0);
    } else {
      onDataSourceReady(filter.key, true);
    }
  }, [
    dataSourceInitialized,
    dataSourceLoading,
    options.length,
    filter.key,
    filter.useFirstOptionAsDefault,
    filter.defaultValue,
    onDataSourceReady
  ]);

  useEffect(() => {
    const shouldUseFirstOption = filter.useFirstOptionAsDefault || filter.defaultValue === '__first_option__';
    if (!shouldUseFirstOption) return;

    if (!shouldDeferSelectFirstOption(filter, currentValue)) {
      return;
    }

    if (options.length > 0) {
      const firstOptionValue = options[0]?.value;
      if (firstOptionValue !== undefined) {
        onFilterChange(filter.key, firstOptionValue);
      }
    } else if (!dataSourceLoading) {
      const fallbackValue = resolveSelectDefaultFallback(filter);
      if (fallbackValue !== undefined) {
        onFilterChange(filter.key, fallbackValue);
      }
    }
  }, [options, filter.useFirstOptionAsDefault, filter.defaultValue, filter.key, currentValue, onFilterChange, dataSourceLoading]);

  if (filter.multiple) {
    const selectedValues = Array.isArray(currentValue)
      ? currentValue.map(value => String(value))
      : hasExplicitValue(currentValue)
        ? [String(currentValue)]
        : [];

    const multiSelectOptions: MultiSelectOption[] = options.map(option => ({
      label: displayFilterLabel(option.label, language, localizeText),
      value: option.value,
      disabled: dataSourceLoading
    }));

    return (
      <div 
        key={filter.key} 
        className={cn(
          "flex",
          isSelectInline ? "items-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap" : mobileFilterFieldStyles.field
        )}
        style={selectStyle.marginTop ? { marginTop: selectStyle.marginTop } : undefined}
      >
        {!isSelectInline && filter.label && <Label className={mobileFilterFieldStyles.label}>{displayFilterLabel(filter.label, language, localizeText)}</Label>}
        {isSelectInline && filter.label && <Label className="text-sm font-medium whitespace-nowrap">{displayFilterLabel(filter.label, language, localizeText)}:</Label>}
        <div
          className={cn(
            getSelectContainerClassName(filter, isSelectInline),
            !isSelectInline && mobileFilterFieldStyles.control
          )}
          style={selectWidthStyle}
        >
          <MultiSelect
            options={multiSelectOptions}
            value={selectedValues}
            onChange={(newValues) => onFilterChange(filter.key, newValues)}
            placeholder={dataSourceLoading ? t('common:loading', 'Loading...') : (displayFilterLabel(filter.placeholder, language, localizeText) || t('common:please_select', 'Please Select'))}
            disabled={dataSourceLoading}
            maxDisplayCount={3}
            showClearButton={true}
            triggerClassName={cn(isSelectInline ? "h-8" : "h-9 w-full", "dark:bg-card dark:border-border")}
            contentClassName="dark:bg-card dark:border-border"
            emptyText={dataSourceLoading ? t('common:loading', 'Loading...') : t('common:no_options', 'No Options')}
          />
        </div>
      </div>
    );
  }

  return (
    <div 
      key={filter.key} 
      className={cn(
        "flex",
        isSelectInline ? "items-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap" : mobileFilterFieldStyles.field
      )}
      style={selectStyle.marginTop ? { marginTop: selectStyle.marginTop } : undefined}
    >
      {!isSelectInline && filter.label && <Label className={mobileFilterFieldStyles.label}>{displayFilterLabel(filter.label, language, localizeText)}</Label>}
      {isSelectInline && filter.label && <Label className="text-sm font-medium whitespace-nowrap">{displayFilterLabel(filter.label, language, localizeText)}:</Label>}
      <div className={cn(!isSelectInline && mobileFilterFieldStyles.control)}>
        <Select
          value={getSelectControlValue(currentValue)}
          onValueChange={(value) => onFilterChange(filter.key, decodeSelectOptionValue(value))}
          disabled={dataSourceLoading}
        >
          <SelectTrigger 
            className={cn(
              getSelectContainerClassName(filter, isSelectInline),
              !isSelectInline && mobileFilterFieldStyles.selectTrigger,
              isSelectInline && "dark:bg-card dark:border-border"
            )}
            style={selectWidthStyle}
          >
            <SelectValue placeholder={dataSourceLoading ? t('common:loading', 'Loading...') : (displayFilterLabel(filter.placeholder, language, localizeText) || undefined)} />
          </SelectTrigger>
          <SelectContent className="dark:bg-card dark:border-border">
            {options.map(option => (
              <SelectItem key={encodeSelectOptionValue(option.value)} value={encodeSelectOptionValue(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

// ─── PresetDateRangeFilterField ─────────────────────────────────────────────

// 'YYYY-MM-DD...' → 'MM-DD' (or full 'YYYY-MM-DD' for date inputs).
function fmtDate(v: unknown, full = false): string {
  if (v == null) return '';
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(v);
  return full ? `${m[1]}-${m[2]}-${m[3]}` : `${m[2]}-${m[3]}`;
}

// Capsule-only (#71): Add 'YY-' prefix if the endpoint year is not the current natural year.
// Check both ends independently.
// Example: Last year → '25-02-23~25-03-01'; Cross-year → '25-12-23~01-01'.
// All preset/custom branches follow this format.
// Last year → '25-02-23~25-03-01'; Cross-year → '25-12-23~01-01'.
// All preset/custom branches follow this format.
function fmtChipDate(v: unknown): string {
  if (v == null) return '';
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(v);
  const yy = m[1] !== String(new Date().getFullYear()) ? `${m[1].slice(2)}-` : '';
  return `${yy}${m[2]}-${m[3]}`;
}

// 'YYYY-MM-DD' → local Date (avoid `new Date('YYYY-MM-DD')` which parses as UTC and can shift a day).
function parseISODate(s: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined;
}
// local Date → 'YYYY-MM-DD' (local components, no timezone shift).
function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Inline (in-flow) range calendar — replaces native `<input type="date">`, which mis-anchors its
// popup when nested inside a CSS-transformed Radix Sheet/Dialog (Chromium quirk). react-day-picker
// renders in the document flow, so it positions correctly inside the sheet. Values are ISO strings.
const InlineDateRangeCalendar: React.FC<{
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
}> = ({ start, end, onChange }) => {
  const { language } = useWorkbenchConfigLocale();
  const { t } = useTranslation('renderers');
  const dateLocale = language === 'zh' ? zhCN : enUS;
  const from = parseISODate(start);
  const to = parseISODate(end);
  return (
    <div className="flex flex-col items-center">
      <Calendar
        mode="range"
        numberOfMonths={1}
        defaultMonth={from || to}
        selected={{ from, to }}
        onSelect={range =>
          onChange(range?.from ? toISODate(range.from) : '', range?.to ? toISODate(range.to) : '')
        }
        disabled={{ after: new Date() }}
        locale={dateLocale}
        className="mx-auto"
      />
      <div className="mt-1 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-neutral-400">
        <span>{start || t('filter_panel.start_date', 'Start Date')}</span>
        <span className="text-slate-300 dark:text-neutral-600">~</span>
        <span>{end || t('filter_panel.end_date', 'End Date')}</span>
      </div>
    </div>
  );
};

// Merge multiple date ranges into one {start,end}: earliest start → latest end (ported from prototype).
function mergeRange(items: Array<{ start: string; end: string }>): { start: string; end: string } | null {
  if (items.length === 0) return null;
  const sorted = [...items].sort((a, b) => a.start.localeCompare(b.start));
  return { start: sorted[0].start, end: sorted[sorted.length - 1].end };
}

interface DateCustomTabPanelProps {
  tab: DateCustomTab;
  appliedStart: string;
  appliedEnd: string;
  onApplyRange: (start: string, end: string) => void;
  onPickDate: (start: string, end: string) => void;
  /** Multi-select tabs report the pending merged range up — committed by the sheet's big Apply button. */
  onSelectionChange?: (sel: { count: number; start: string; end: string } | null) => void;
}


const DateCustomTabPanel: React.FC<DateCustomTabPanelProps> = ({
  tab,
  appliedStart,
  appliedEnd,
  onApplyRange,
  onPickDate,
  onSelectionChange,
}) => {
  const { language } = useWorkbenchConfigLocale();
  const { t } = useTranslation('renderers');
  const src = tab.source;
  const valueKey = src?.valueKey || 'value';
  const labelKey = src?.labelKey;
  const labelI18nKey = src?.labelI18nKey;
  const startKey = src?.startKey || 'start_date';
  const endKey = src?.endKey || 'end_date';
  const subLabelKey = src?.subLabelKey;
  const groupKey = src?.groupKey;
  const groupValue = src?.groupValue;
  const cols = tab.cols && tab.cols > 0 ? tab.cols : 3;
  const multi = tab.select === 'multi';

  // Request exactly the columns this section needs (stable → shared datasource-level cache key).
  const outputFields = useMemo(() => {
    const f = new Set<string>([valueKey, startKey, endKey]);
    if (labelKey) f.add(labelKey);
    if (labelI18nKey) { f.add(`${labelI18nKey}_zh`); f.add(`${labelI18nKey}_en`); }
    if (subLabelKey) f.add(subLabelKey);
    if (groupKey) f.add(groupKey);
    return Array.from(f);
  }, [valueKey, startKey, endKey, labelKey, labelI18nKey, subLabelKey, groupKey]);

  const { rows, loading } = useCachedFilterOptions({
    datasourceId: src?.datasourceId || src?.datasetId,
    version: src?.version,
    outputFields,
    lang: language,
    scope: src?.scope,
  });

  const items = useMemo(
    () =>
      rows
        .filter(r => !groupKey || String(r[groupKey] ?? '') === String(groupValue ?? ''))
        .map(r => ({
          value: String(r[valueKey] ?? ''),
          label: labelI18nKey
            ? resolveBilingualLabel({ zh: r[`${labelI18nKey}_zh`], en: r[`${labelI18nKey}_en`] }, language)
            : String(r[labelKey || valueKey] ?? ''),
          sub: subLabelKey ? String(r[subLabelKey] ?? '') : '',
          start: fmtDate(r[startKey], true),
          end: fmtDate(r[endKey], true),
        }))
        .filter(it => it.start && it.end),
    [rows, groupKey, groupValue, valueKey, labelKey, labelI18nKey, subLabelKey, startKey, endKey, language]
  );

  const [selected, setSelected] = useState<string[]>([]);

  // Report the pending multi-selection (merged range) to the sheet footer; clear on unmount/tab switch.
  useEffect(() => {
    if (!multi || !onSelectionChange) return;
    const r = mergeRange(items.filter(it => selected.includes(it.value)));
    onSelectionChange(r ? { count: selected.length, start: r.start, end: r.end } : null);
    return () => onSelectionChange(null);
  }, [multi, selected, items, onSelectionChange]);

  if (tab.kind === 'dateInput') {
    return (
      <div className="px-1 py-2">
        <InlineDateRangeCalendar start={appliedStart} end={appliedEnd} onChange={onPickDate} />
      </div>
    );
  }

  const toggle = (v: string) =>
    setSelected(prev => (prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]));

  return (
    <div className="space-y-2">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {!loading &&
          items.map(it => {
            const active = multi
              ? selected.includes(it.value)
              : appliedStart === it.start && appliedEnd === it.end;
            return (
              <button
                key={it.value}
                type="button"
                onClick={() => (multi ? toggle(it.value) : onApplyRange(it.start, it.end))}
                className={cn(
                  'flex flex-col items-start gap-0.5 px-2.5 py-1.5 rounded-xl border text-left transition-colors min-w-0',
                  active
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800'
                )}
              >
                <span className="flex items-center gap-1 text-xs font-semibold w-full min-w-0">
                  {active && <Check className="w-3 h-3 flex-shrink-0" />}
                  <span className="truncate">{it.label}</span>
                </span>
                <span className="text-[9px] text-slate-400 dark:text-neutral-500">
                  {it.sub || `${fmtDate(it.start)}~${fmtDate(it.end)}`}
                </span>
              </button>
            );
          })}
      </div>
      {loading && (
        <span className="text-sm text-slate-400 dark:text-neutral-500">{t('filter_panel.loading', 'Loading...')}</span>
      )}
      {!loading && items.length === 0 && (
        <span className="text-sm text-slate-400 dark:text-neutral-500">{t('filter_panel.no_options', 'No options')}</span>
      )}
    </div>
  );
};

interface PresetDateRangeFilterFieldProps {
  filter: FilterConfig;
  value: string | undefined;
  // Committed start/end from filterValues — present when a custom range was restored
  // (memory/bus) before this field mounted, so the trigger chip and resolved range work
  // without the user reopening the sheet.
  committedStart?: string;
  committedEnd?: string;
  // localStorage key for remembering the committed choice; undefined = remembering disabled.
  memoryKey?: string;
  onFilterChange: (key: string, value: any) => void;
  onMultiFilterChange?: (patch: Record<string, any>) => void;
  isMobileLayout: boolean;
  headerMode?: boolean;
  // Signature of the panel's committed filterValues, forwarded to the updateTime label when
  // updateTime.refreshOnQuery is on (a signature change = one query-triggering commit).
  updateTimeRefreshKey?: string;
}

const PresetDateRangeFilterField: React.FC<PresetDateRangeFilterFieldProps> = ({
  filter,
  value,
  committedStart,
  committedEnd,
  memoryKey,
  onFilterChange,
  onMultiFilterChange,
  isMobileLayout,
  headerMode,
  updateTimeRefreshKey,
}) => {
  const { localizeText, language } = useWorkbenchConfigLocale();
  const { t } = useTranslation('renderers');
  const [open, setOpen] = useState(false);
  const presets = filter.fiscalPresets || [];
  const customTabs = filter.customTabs || [];
  const hasCustomTabs = customTabs.length > 0;
  const allowCustom = filter.allowCustom ?? false;
  const presetCols = filter.presetCols && filter.presetCols > 0 ? filter.presetCols : 3;
  // Custom cell may span multiple grid columns (e.g. a full row under a 3×2 preset grid).
  const customSpan = Math.min(Math.max(Math.floor(filter.customSpan ?? 1), 1), presetCols);
  const startKey = `${filter.key}Start`;
  const endKey = `${filter.key}End`;

  // Resolved start/end + labels per preset value, from the date-range DataSource (cached, datasource-level).
  const rangeDsId = filter.dateRangeSource?.datasourceId || filter.dateRangeSource?.datasetId;
  const rangeOutputFields = useMemo(
    () => ['value', 'label_zh', 'label_en', 'sub_zh', 'sub_en', 'start_date', 'end_date'],
    []
  );
  const { rows: rangeRows } = useCachedFilterOptions({
    datasourceId: rangeDsId,
    version: filter.dateRangeSource?.version,
    outputFields: rangeOutputFields,
    lang: language,
    scope: 'date',
  });
  const rangeMap = useMemo(() => {
    const m: Record<string, { start: string; end: string; sub: string }> = {};
    rangeRows.forEach(r => {
      const v = String(r['value'] ?? '');
      if (v) m[v] = {
        start: fmtDate(r['start_date'], true),
        end: fmtDate(r['end_date'], true),
        sub: resolveBilingualLabel({ zh: r['sub_zh'], en: r['sub_en'] }, language),
      };
    });
    return m;
  }, [rangeRows, language]);
  // fiscalPresets is the source of truth for label + order; the date-range DataSource (rangeMap, keyed
  // by value) only resolves each preset's sub/start/end. Falls back to the datasource list when no
  // fiscalPresets are configured.
  const presetItems = useMemo(() => {
    if (presets.length) {
      return presets.map(p => ({
        value: p.value,
        label: resolveBilingualLabel(p.label, language),
        sub: rangeMap[p.value]?.sub || '',
        start: rangeMap[p.value]?.start || '',
        end: rangeMap[p.value]?.end || '',
      }));
    }
    if (rangeDsId && rangeRows.length) {
      return rangeRows.map(r => ({
        value: String(r['value'] ?? ''),
        label: resolveBilingualLabel({ zh: r['label_zh'], en: r['label_en'] }, language),
        sub: resolveBilingualLabel({ zh: r['sub_zh'], en: r['sub_en'] }, language),
        start: fmtDate(r['start_date'], true),
        end: fmtDate(r['end_date'], true),
      }));
    }
    return [];
  }, [rangeDsId, rangeRows, presets, rangeMap, language]);

  // A custom range restored from memory/bus arrives via committedStart/End — seed the local
  // custom state from it so the trigger chip shows the range and `resolved` computes.
  const restoredCustom = value === 'custom' && !!committedStart && !!committedEnd;

  // Legacy simplified-custom state (used only when no customTabs).
  const [customStart, setCustomStart] = useState(restoredCustom ? committedStart! : '');
  const [customEnd, setCustomEnd] = useState(restoredCustom ? committedEnd! : '');
  const [showCustom, setShowCustom] = useState(value === 'custom');

  // Rich DateRangeSheet state (used when customTabs present): pending preset / sub-tab + applied custom range.
  const [tab, setTab] = useState<string>(value || filter.defaultValue || '');
  const [activeCustomTab, setActiveCustomTab] = useState<string>(() => {
    // Restore the last-used custom sub-tab alongside a remembered custom range.
    if (restoredCustom && memoryKey) {
      const mem = readFilterSelectionMemory(memoryKey, presets.map(p => p.value));
      if (mem?.v === 'custom' && mem.tab && customTabs.some(ct => ct.key === mem.tab)) return mem.tab;
    }
    return customTabs[0]?.key || '';
  });
  const [appliedStart, setAppliedStart] = useState(restoredCustom ? committedStart! : '');
  const [appliedEnd, setAppliedEnd] = useState(restoredCustom ? committedEnd! : '');
  // Pending fiscal-week/month multi-selection (merged range) — committed by the footer Apply button.
  const [pendingMulti, setPendingMulti] = useState<{ count: number; start: string; end: string } | null>(null);

  // Re-sync the pending selection to the committed value each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    setTab(value === 'custom' ? 'custom' : value || filter.defaultValue || '');
    setActiveCustomTab(prev => prev || customTabs[0]?.key || '');
  }, [open]);

  const customStartEff = hasCustomTabs ? appliedStart : customStart;
  const customEndEff = hasCustomTabs ? appliedEnd : customEnd;

  const resolved =
    value === 'custom'
      ? customStartEff && customEndEff
        ? { start: customStartEff, end: customEndEff }
        : null
      : value
        ? rangeMap[value] ?? null
        : null;

  // Emit the resolved start/end whenever they change (preset key itself is emitted by onFilterChange).
  // Pre-seed with a restored custom triple: those keys were already broadcast atomically by the
  // panel's initial sendParameters, so re-emitting the same values here would be a duplicate patch.
  const emittedRef = useRef(restoredCustom ? `custom|${committedStart}|${committedEnd}` : '');
  useEffect(() => {
    if (!onMultiFilterChange || !value || !resolved) return;
    const sig = `${value}|${resolved.start}|${resolved.end}`;
    if (emittedRef.current === sig) return;
    emittedRef.current = sig;
    onMultiFilterChange({ [startKey]: resolved.start, [endKey]: resolved.end });
  }, [value, resolved?.start, resolved?.end]);

  const selectedPresetLabel =
    presetItems.find(p => p.value === value)?.label ||
    resolveBilingualLabel(presets.find(p => p.value === value)?.label, language);
  const rangeText = resolved ? `${fmtChipDate(resolved.start)}~${fmtChipDate(resolved.end)}` : '';
  const triggerLabel =
    value === 'custom'
      ? rangeText || t('filter_panel.custom', 'Custom')
      : value
        ? rangeText
          ? `${selectedPresetLabel} · ${rangeText}`
          : selectedPresetLabel
        : displayFilterLabel(filter.placeholder, language, localizeText) || displayFilterLabel(filter.label, language, localizeText) || t('filter_panel.select_time', 'Select');

  // Atomically commit preset key + resolved start/end so listeners (e.g. trend chart) never
  // refetch with a new period but stale periodEnd (Yesterday 07-01 + WTD → 4 buckets, missing today).
  const commitPreset = (v: string) => {
    // Preset keys persist without dates — restore recomputes them from the live datasource.
    if (memoryKey) writeFilterSelectionMemory(memoryKey, { v });
    const r = rangeMap[v];
    if (onMultiFilterChange && r?.start && r?.end) {
      emittedRef.current = `${v}|${r.start}|${r.end}`;
      onMultiFilterChange({ [filter.key]: v, [startKey]: r.start, [endKey]: r.end });
      return;
    }
    onFilterChange(filter.key, v);
  };

  // ── legacy path (no customTabs) ──
  const selectPreset = (v: string) => {
    setShowCustom(false);
    commitPreset(v);
    setOpen(false);
  };
  const confirmCustom = () => {
    if (!customStart || !customEnd) return;
    if (memoryKey) writeFilterSelectionMemory(memoryKey, { v: 'custom', start: customStart, end: customEnd });
    onFilterChange(filter.key, 'custom');
    setOpen(false);
  };

  // ── rich path (customTabs): commit a resolved custom range / a pending preset ──
  const commitCustomRange = (s: string, e: string) => {
    if (memoryKey) writeFilterSelectionMemory(memoryKey, { v: 'custom', start: s, end: e, tab: activeCustomTab });
    setAppliedStart(s);
    setAppliedEnd(e);
    // Atomic commit (0706 acceptance #9): period + start/end in ONE patch, mirroring commitPreset.
    // Emitting them separately lets listeners (e.g. trend-chart SQL, which recomputes its window from
    // {{period}} when it reads a preset key) refetch with period='custom' but a stale range — or with
    // the old preset key ('wtd') plus the new fiscal-week dates, showing wrong buckets/labels.
    if (onMultiFilterChange) {
      emittedRef.current = `custom|${s}|${e}`;
      onMultiFilterChange({ [filter.key]: 'custom', [startKey]: s, [endKey]: e });
    } else {
      onFilterChange(filter.key, 'custom'); // effect emits periodStart/End from appliedStart/End
    }
    setOpen(false);
  };
  const confirmRich = () => {
    if (tab === 'custom') {
      // Fiscal week/month multi-selection commits via this big Apply (the in-panel mini apply was removed).
      if (pendingMulti) {
        commitCustomRange(pendingMulti.start, pendingMulti.end);
        return;
      }
      if (activeCustomTab === 'daterange' && appliedStart) {
        commitCustomRange(appliedStart, appliedEnd || appliedStart);
        return;
      }
      setOpen(false);
      return;
    }
    commitPreset(tab);
    setOpen(false);
  };

  // The header-bar copy is now driven by label: an explicitly empty label (SW sales page requirement) →
  // keep only the calendar icon; a label with a value → show the localized label; no label configured
  // (existing dashboards) → keep the original default "Date Range".
  const headerBarLabel = filter.label === ''
    ? null
    : displayFilterLabel(filter.label, language, localizeText) || t('filter_panel.date_range', 'Date Range');
  const headerBarTrigger = (
    <button
      type="button"
      onClick={() => setOpen(prev => !prev)}
      className="w-full flex items-center justify-between gap-2 px-4 py-2 text-sm bg-slate-100 dark:bg-neutral-800 rounded-full text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors"
    >
      <span className="flex items-center gap-1.5 text-slate-500 dark:text-neutral-400 flex-shrink-0">
        <CalendarIcon className="w-3.5 h-3.5" />
        {headerBarLabel}
      </span>
      <span className="flex items-center gap-1 text-slate-800 dark:text-neutral-200 font-medium min-w-0">
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400 flex-shrink-0" />
      </span>
    </button>
  );

  // filter.updateTime ("show last update time" toggle): the same update-time chip sits on the right of
  // the headerBar — the date bar uses flex-1 min-w-0 truncation to absorb width changes, and flex-nowrap
  // guarantees no wrapping at any width; when not configured (toggle off) the date bar spans the full row,
  // exactly as before the feature.
  const headerBarContent = filter.updateTime?.datasourceId ? (
    <div className="flex flex-nowrap items-center gap-2 overflow-hidden">
      <div className="flex-1 min-w-0">{headerBarTrigger}</div>
      <UpdateTimeLabel config={filter.updateTime} refreshKey={updateTimeRefreshKey} />
    </div>
  ) : headerBarTrigger;

  const presetGrid = (
    <div className="grid grid-cols-3 gap-2 p-4">
      {presets.map(preset => {
        const isActive = value === preset.value;
        const r = rangeMap[preset.value];
        return (
          <button
            key={preset.value}
            type="button"
            onClick={() => selectPreset(preset.value)}
            className={cn(
              'px-2 py-2 rounded-xl font-medium transition-colors text-center flex flex-col items-center',
              isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700'
            )}
          >
            <span className="text-sm">{resolveBilingualLabel(preset.label, language)}</span>
            {r && (
              <span className={cn('text-[10px] mt-0.5', isActive ? 'text-indigo-100' : 'text-slate-400 dark:text-neutral-500')}>
                {fmtDate(r.start)}~{fmtDate(r.end)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  const customSection = allowCustom && (
    <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-neutral-800">
      <button
        type="button"
        onClick={() => setShowCustom(s => !s)}
        className={cn(
          'px-3 py-1.5 text-sm rounded-full font-medium transition-colors',
          value === 'custom' || showCustom ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700'
        )}
      >
        {t('filter_panel.custom_date', 'Custom Date')}
      </button>
      {showCustom && (
        <div className="mt-3">
          <InlineDateRangeCalendar
            start={customStart}
            end={customEnd}
            onChange={(s, e) => {
              setCustomStart(s);
              setCustomEnd(e);
            }}
          />
          <div className="mt-2 flex justify-end">
            <Button size="sm" onClick={confirmCustom} disabled={!customStart || !customEnd}>
              {t('filter_panel.confirm', 'OK')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // ── rich path (customTabs): full DateRangeSheet — datasource-driven preset grid + custom sub-tabs ──
  const richPresetGrid = (
    <div
      className="grid gap-2 px-4 pt-3"
      style={{ gridTemplateColumns: `repeat(${presetCols}, minmax(0, 1fr))` }}
    >
      {presetItems.map(p => {
        const active = tab === p.value;
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => setTab(p.value)}
            className={cn(
              'flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl border text-center transition-colors',
              active
                ? 'border-indigo-500 bg-indigo-600 text-white'
                : 'border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800/60 text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800'
            )}
          >
            <span className="text-sm font-medium">{p.label}</span>
            <span className={cn('text-[10px]', active ? 'text-indigo-100' : 'text-slate-400 dark:text-neutral-500')}>
              {p.sub || (p.start && p.end ? `${fmtDate(p.start)}~${fmtDate(p.end)}` : '')}
            </span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => setTab('custom')}
        style={{ gridColumn: `span ${customSpan} / span ${customSpan}` }}
        className={cn(
          'flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl border text-center transition-colors',
          tab === 'custom'
            ? 'border-indigo-500 bg-indigo-600 text-white'
            : 'border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800/60 text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800'
        )}
      >
        <span className="text-sm font-medium">
          {resolveBilingualLabel(filter.customLabel ?? { zh: t('filter_panel.custom', 'Custom'), en: 'Custom' }, language)}
        </span>
        <span className={cn('text-[10px]', tab === 'custom' ? 'text-indigo-100' : 'text-slate-400 dark:text-neutral-500')}>
          {resolveBilingualLabel(filter.customSub ?? { zh: t('filter_panel.pick_range', 'Pick range'), en: 'Pick range' }, language)}
        </span>
      </button>
    </div>
  );

  const customArea = tab === 'custom' && (
    <div className="px-4 pt-3 space-y-3">
      <div className="flex overflow-x-auto gap-1 pb-0.5" style={{ scrollbarWidth: 'none' }}>
        {customTabs.map(ct => (
          <button
            key={ct.key}
            type="button"
            onClick={() => setActiveCustomTab(ct.key)}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-full text-xs border transition-colors',
              activeCustomTab === ct.key
                ? 'bg-indigo-500 text-white border-indigo-500'
                : 'border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800'
            )}
          >
            {resolveBilingualLabel(ct.label, language)}
          </button>
        ))}
      </div>
      {/* Fixed-height option area: switching fiscal week/month tabs keeps the sheet height stable;
          long lists scroll inside instead of pushing the footer Apply row out of view. */}
      <div className="h-[320px] overflow-y-auto pr-0.5">
        {customTabs
          .filter(ct => ct.key === activeCustomTab)
          .map(ct => (
            <DateCustomTabPanel
              key={ct.key}
              tab={ct}
              appliedStart={appliedStart}
              appliedEnd={appliedEnd}
              onApplyRange={commitCustomRange}
              onPickDate={(s, e) => {
                setAppliedStart(s);
                setAppliedEnd(e);
              }}
              onSelectionChange={setPendingMulti}
            />
          ))}
      </div>
    </div>
  );

  const richBody = (
    <>
      {richPresetGrid}
      {customArea}
      {/* Footer pinned to the sheet bottom (sticky survives outer max-h scrolling); shows the pending
          multi-selection count next to the big Apply button — the sole commit path for multi tabs. */}
      <div className="sticky bottom-0 flex items-center gap-2 px-4 py-3 mt-1 border-t border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-b-xl">
        {tab === 'custom' && pendingMulti && pendingMulti.count > 0 && (
          <span className="text-xs text-indigo-600 dark:text-indigo-300 whitespace-nowrap">
            {t('filter_panel.selected_count', '{{count}} selected', { count: pendingMulti.count })}
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 text-sm hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors"
        >
          {t('filter_panel.cancel', 'Cancel')}
        </button>
        <button
          type="button"
          onClick={confirmRich}
          className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          {t('filter_panel.apply', 'Apply')}
        </button>
      </div>
    </>
  );

  const sheetBody = hasCustomTabs ? (
    richBody
  ) : (
    <>
      {presetGrid}
      {customSection}
    </>
  );

  const triggerButton = (
    <button
      type="button"
      onClick={() => setOpen(prev => !prev)}
      className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-slate-100 dark:bg-neutral-800 rounded-full text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors border border-transparent"
    >
      {triggerLabel}
      <span className="ml-0.5 text-xs leading-none">▾</span>
    </button>
  );

  if (isMobileLayout) {
    return (
      // displayWidth applies in headerMode (SW sales page requirement: narrow the time-range bar to make
      // room for the data update time) — the inline width overrides w-full; without displayWidth,
      // getSelectWidthStyle returns undefined and the bar stays full-width.
      <div className={headerMode ? 'w-full' : mobileFilterFieldStyles.field} style={headerMode ? getSelectWidthStyle(filter, isMobileLayout) : undefined}>
        {!headerMode && filter.label && (
          <span className="text-sm text-muted-foreground">{displayFilterLabel(filter.label, language, localizeText)}</span>
        )}
        {headerMode ? headerBarContent : triggerButton}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent {...mobileFilterSheetProps} side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
            <SheetHeader className="text-left">
              <SheetTitle className="text-base">{displayFilterLabel(filter.label, language, localizeText) || t('filter_panel.select_time_range', 'Select time range')}</SheetTitle>
            </SheetHeader>
            {sheetBody}
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    // displayWidth applies in headerMode (same as the mobile branch); the inline width overrides w-full,
    // otherwise the bar stays full-width.
    <div className={headerMode ? 'w-full' : 'flex items-center gap-2'} style={headerMode ? getSelectWidthStyle(filter, isMobileLayout) : undefined}>
      {!headerMode && filter.label && (
        <span className="text-sm text-muted-foreground whitespace-nowrap">{displayFilterLabel(filter.label, language, localizeText)}</span>
      )}
      <div className={headerMode ? 'relative w-full' : 'relative'}>
        {headerMode ? headerBarContent : triggerButton}
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              className={cn(
                'absolute top-full left-0 mt-1 z-50 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-slate-200 dark:border-neutral-700 max-h-[70vh] overflow-y-auto',
                hasCustomTabs ? 'w-96' : 'w-72'
              )}
            >
              {sheetBody}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── PillSelectFilterField ────────────────────────────────────────────────────

interface PillSelectFilterFieldProps {
  filter: FilterConfig;
  value: string | string[] | undefined;
  onFilterChange: (key: string, value: any) => void;
  isMobileLayout: boolean;
  headerMode?: boolean;
}

const PillSelectFilterField: React.FC<PillSelectFilterFieldProps> = ({
  filter,
  value,
  onFilterChange,
  isMobileLayout,
  headerMode,
}) => {
  const { localizeText, language } = useWorkbenchConfigLocale();
  const { t } = useTranslation('renderers');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const isMultiple = filter.multiple ?? false;

  const selectedValues: string[] = Array.isArray(value)
    ? value
    : (value != null ? [value as string] : []);

  // Reset the search box whenever the popover/sheet closes.
  useEffect(() => { if (!open) setSearch(''); }, [open]);

  const datasourceId = filter.dataSource?.datasourceId || filter.dataSource?.datasetId;
  const labelKey = filter.labelKey || filter.dataSource?.labelField || 'label';
  const valueKey = filter.valueKey || filter.dataSource?.valueField || 'value';

  const outputFields = useMemo(() => [labelKey, valueKey], [labelKey, valueKey]);
  const { rows: dsRows, loading: dsLoading } = useCachedFilterOptions({
    datasourceId,
    version: filter.dataSource?.version,
    outputFields,
    lang: language,
    scope: filter.dataSource?.scope,
    bindDateRange: filter.dataSource?.bindGlobalDateRange,
  });

  const options: FilterOption[] = useMemo(() => {
    // When a DataSource is configured, its rows are authoritative — including an empty
    // result. Only fall back to static options when there is no DataSource (matches
    // SheetChipGroup).
    if (datasourceId) {
      return dsRows.map(row => ({
        label: localizeText(String(row[labelKey] ?? '')),
        value: String(row[valueKey] ?? ''),
      }));
    }
    return (filter.options || []).map(opt => ({
      ...opt,
      label: resolveBilingualText(opt.label, language),
    }));
  }, [datasourceId, dsRows, labelKey, valueKey, filter.options, localizeText, language]);

  // Options visible in the popover/sheet after applying the (optional) fuzzy search.
  const visibleOptions: FilterOption[] = useMemo(() => {
    if (!filter.searchable || !search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [options, filter.searchable, search]);

  // Commit a multi-select change, honouring keepAtLeastOne (never clear to zero → fall back to first option).
  const applyMultiChange = (next: string[]) => {
    const finalNext = (filter.keepAtLeastOne && next.length === 0 && options.length > 0)
      ? [options[0].value]
      : next;
    onFilterChange(filter.key, finalNext);
  };

  const handleSelect = (optValue: string) => {
    if (isMultiple) {
      applyMultiChange(
        selectedValues.includes(optValue)
          ? selectedValues.filter(v => v !== optValue)
          : [...selectedValues, optValue]
      );
    } else {
      onFilterChange(filter.key, optValue);
      setOpen(false);
    }
  };

  const selectAllVisible = () => {
    applyMultiChange(Array.from(new Set([...selectedValues, ...visibleOptions.map(o => o.value)])));
  };
  const clearSelection = () => applyMultiChange([]);

  // useFirstOptionAsDefault for pillSelect: when nothing has been selected yet, seed the
  // default (single → first value, multiple → [first value]). Mirrors SelectFilterWithDataSource.
  const didInitDefaultRef = useRef(false);
  useEffect(() => {
    const wantFirst = filter.useFirstOptionAsDefault || filter.defaultValue === '__first_option__';
    if (!wantFirst || dsLoading || options.length === 0) return;
    // Treat undefined / null / '' / [] all as "not selected yet" (the parent often seeds '' ).
    const hasSelection = isMultiple
      ? (Array.isArray(value) && value.length > 0)
      : (value !== undefined && value !== null && value !== '');
    if (hasSelection) return;
    if (didInitDefaultRef.current) return; // fire once per mount, so a deliberate clear isn't re-seeded
    didInitDefaultRef.current = true;
    const first = options[0]?.value;
    if (first === undefined) return;
    onFilterChange(filter.key, isMultiple ? [first] : first);
  }, [options, dsLoading, value, isMultiple, filter.useFirstOptionAsDefault, filter.defaultValue, filter.key]);

  const triggerLabel = selectedValues.length > 0
    ? (isMultiple
        ? t('filter_panel.items_selected', '{{count}} items selected', { count: selectedValues.length })
        : (options.find(o => o.value === selectedValues[0])?.label ?? selectedValues[0]))
    : (displayFilterLabel(filter.placeholder, language, localizeText) || displayFilterLabel(filter.label, language, localizeText) || t('filter_panel.please_select', 'Please select'));

  const chipButtons = (
    <>
      {dsLoading && <span className="text-sm text-slate-400 dark:text-neutral-500">{t('filter_panel.loading', 'Loading...')}</span>}
      {!dsLoading && visibleOptions.length === 0 && (
        <span className="text-sm text-slate-400 dark:text-neutral-500">{t('filter_panel.no_options', 'No options')}</span>
      )}
      {!dsLoading && visibleOptions.map(opt => {
        const isActive = selectedValues.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSelect(opt.value)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-full font-medium transition-colors',
              isActive
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </>
  );

  // Search box (optional) shown above the option list (shared by mobile sheet + desktop popover).
  const searchBox = filter.searchable ? (
    <div className="px-4 pt-3 flex-shrink-0">
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={t('filter_panel.search_stores', 'Search...')}
        // text-base (16px) on mobile: iOS WebView auto-zooms the page when a focused input is < 16px;
        // md:text-sm keeps the desktop popover at 14px.
        className="w-full h-9 px-3 text-base md:text-sm rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500"
      />
    </div>
  ) : null;

  // Note: the persistent "selected chips" bar is rendered at the TOP of the FilterPanel
  // (see SelectedFilterChipsBar), not inside this field, so it tiles full-width.

  const triggerButton = (
    <button
      type="button"
      onClick={() => setOpen(prev => !prev)}
      className={cn(
        'flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-slate-100 dark:bg-neutral-800 rounded-full text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors border border-transparent',
        headerMode && 'w-full justify-between'
      )}
    >
      <span className={cn(headerMode && 'truncate')}>{triggerLabel}</span>
      <span className="ml-0.5 text-xs leading-none flex-shrink-0">▾</span>
    </button>
  );

  const confirmLabel = `${t('filter_panel.confirm', 'Confirm')}${selectedValues.length ? ` (${selectedValues.length})` : ''}`;

  if (isMobileLayout) {
    return (
      <div className={headerMode ? 'w-full' : mobileFilterFieldStyles.field}>
        {!headerMode && filter.label && (
          <span className="text-sm text-muted-foreground">{displayFilterLabel(filter.label, language, localizeText)}</span>
        )}
        {triggerButton}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent {...mobileFilterSheetProps} side="bottom" className="rounded-t-3xl h-[70vh] flex flex-col gap-0 overflow-hidden">
            <SheetHeader className="text-left flex-shrink-0">
              <SheetTitle className="text-base">{displayFilterLabel(filter.label, language, localizeText) || t('filter_panel.please_select', 'Please select')}</SheetTitle>
            </SheetHeader>
            {searchBox}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="flex flex-wrap gap-2 p-4">
                {chipButtons}
              </div>
            </div>
            {isMultiple && (
              <div className="flex items-center gap-3 px-4 pt-3 flex-shrink-0 border-t border-slate-100 dark:border-neutral-800">
                {!dsLoading && visibleOptions.length > 0 && (
                  <>
                    <button type="button" onClick={selectAllVisible} className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap">
                      {t('filter_panel.select_all', 'Select all')}
                    </button>
                    <button type="button" onClick={clearSelection} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 hover:underline whitespace-nowrap">
                      {t('filter_panel.clear', 'Clear')}
                    </button>
                  </>
                )}
                <Button className="flex-1" onClick={() => setOpen(false)}>{confirmLabel}</Button>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {filter.label && (
        <span className="text-sm text-muted-foreground whitespace-nowrap">{displayFilterLabel(filter.label, language, localizeText)}</span>
      )}
      <div className="relative">
        {triggerButton}
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-slate-200 dark:border-neutral-700 w-[360px] max-w-[90vw] max-h-[70vh] flex flex-col overflow-hidden">
              {searchBox}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="flex flex-wrap gap-2 p-4">
                  {chipButtons}
                </div>
              </div>
              {isMultiple && (
                <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 border-t border-slate-100 dark:border-neutral-800">
                  {!dsLoading && visibleOptions.length > 0 && (
                    <>
                      <button type="button" onClick={selectAllVisible} className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap">
                        {t('filter_panel.select_all', 'Select all')}
                      </button>
                      <button type="button" onClick={clearSelection} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 hover:underline whitespace-nowrap">
                        {t('filter_panel.clear', 'Clear')}
                      </button>
                    </>
                  )}
                  <Button size="sm" className="flex-1" onClick={() => setOpen(false)}>{confirmLabel}</Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};



// ─── SelectedChipRow ──────────────────────────────────────────────────────────
// Presentational row of removable indigo pills, optionally prefixed with a muted group
// label. Shared by the pillSelect selected-chips bar and every filterSheet dimension so
// they stay pixel-identical. Owns no data — labels are resolved by the caller.
// Pinned mode (onToggle set): chips are fixed toggles — every option stays in place,
// unselected ones render muted, clicking the chip itself flips its state, and no × or
// clear-all is rendered. Normal callers pass onRemove only and are unchanged.
interface SelectedChipRowProps {
  groupLabel?: string;
  items: Array<{ value: string; label: string; muted?: boolean }>;
  onRemove?: (value: string) => void;
  onClearAll?: () => void;
  removeDisabled?: (value: string) => boolean;
  onToggle?: (value: string) => void;
}

const SelectedChipRow: React.FC<SelectedChipRowProps> = ({ groupLabel, items, onRemove, onClearAll, removeDisabled, onToggle }) => {
  const { t } = useTranslation('renderers');
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {groupLabel && (
        <span className="text-xs font-medium text-muted-foreground mr-0.5">{groupLabel}</span>
      )}
      {items.map(it => {
        if (onToggle) {
          return (
            <button
              key={it.value}
              type="button"
              onClick={() => onToggle(it.value)}
              aria-pressed={!it.muted}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                it.muted
                  ? 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-500 dark:hover:bg-neutral-700'
                  : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
              )}
            >
              {it.label}
            </button>
          );
        }
        const disabled = removeDisabled?.(it.value) ?? false;
        return (
          <span
            key={it.value}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
          >
            {it.label}
            <button
              type="button"
              onClick={() => onRemove?.(it.value)}
              disabled={disabled}
              className="opacity-60 hover:opacity-100 disabled:opacity-25 disabled:cursor-not-allowed"
              aria-label={t('filter_panel.clear', 'Clear')}
            >×</button>
          </span>
        );
      })}
      {onClearAll && items.length > 1 && (
        <button type="button" onClick={onClearAll} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 underline">
          {t('filter_panel.clear', 'Clear')}
        </button>
      )}
    </div>
  );
};

// ─── SelectedFilterChipsBar ───────────────────────────────────────────────────
// Renders the selected values of a (multiple pillSelect) filter as a full-width,
// tiled chips row. Mounted at the TOP of the FilterPanel so the current selection
// stays visible above all controls. Resolves labels via the same cached options as
// the trigger (cache hit → no extra network).
interface SelectedFilterChipsBarProps {
  filter: FilterConfig;
  value: string | string[] | undefined;
  onFilterChange: (key: string, value: any) => void;
  /** Role-pinned mode: render EVERY option as a fixed chip (click toggles selection; no ×). */
  pinned?: boolean;
}

const SelectedFilterChipsBar: React.FC<SelectedFilterChipsBarProps> = ({ filter, value, onFilterChange, pinned }) => {
  const { localizeText, language } = useWorkbenchConfigLocale();

  const selectedValues: string[] = Array.isArray(value) ? value : (value != null && value !== '' ? [value as string] : []);

  const datasourceId = filter.dataSource?.datasourceId || filter.dataSource?.datasetId;
  const labelKey = filter.labelKey || filter.dataSource?.labelField || 'label';
  const valueKey = filter.valueKey || filter.dataSource?.valueField || 'value';
  const outputFields = useMemo(() => [labelKey, valueKey], [labelKey, valueKey]);
  const { rows: dsRows } = useCachedFilterOptions({
    datasourceId,
    version: filter.dataSource?.version,
    outputFields,
    lang: language,
    scope: filter.dataSource?.scope,
    // Pinned mode renders the option list itself, so it must match the trigger's list
    // (date-bound when the datasource opts in; deduped cache → no extra network). The
    // normal bar only resolves labels and stays period-independent (see below).
    bindDateRange: pinned ? filter.dataSource?.bindGlobalDateRange : undefined,
  });

  const labelOf = useMemo(() => {
    const map = new Map<string, string>();
    if (datasourceId) {
      dsRows.forEach(row => map.set(String(row[valueKey] ?? ''), localizeText(String(row[labelKey] ?? ''))));
    } else {
      (filter.options || []).forEach(opt => map.set(opt.value, resolveBilingualText(opt.label, language)));
    }
    return (v: string) => map.get(v) ?? v;
  }, [datasourceId, dsRows, labelKey, valueKey, filter.options, localizeText, language]);

  // Pinned mode: the full option list (same source as the filter's own options).
  const pinnedOptions: FilterOption[] = useMemo(() => {
    if (!pinned) return [];
    if (datasourceId) {
      return dsRows.map(row => ({
        label: localizeText(String(row[labelKey] ?? '')),
        value: String(row[valueKey] ?? ''),
      }));
    }
    return (filter.options || []).map(opt => ({
      ...opt,
      label: resolveBilingualText(opt.label, language),
    }));
  }, [pinned, datasourceId, dsRows, labelKey, valueKey, filter.options, localizeText, language]);

  // Pinned mode: prune committed values that are no longer in the option list (e.g. store
  // authorization changed). They render as nothing yet still ride along in every datasource
  // request ("ghost selection"), which makes charts look like they ignore the visible chips.
  // Never prune while a datasource-backed list is still loading (empty = unknown, not empty).
  const pruneSigRef = useRef('');
  useEffect(() => {
    if (!pinned) return;
    if (datasourceId && dsRows.length === 0) return;
    const optionValues = new Set(pinnedOptions.map(o => o.value));
    const kept = selectedValues.filter(v => optionValues.has(v));
    if (kept.length === selectedValues.length) return;
    const sig = `${JSON.stringify([...optionValues].sort())}|${JSON.stringify([...selectedValues].sort())}`;
    if (pruneSigRef.current === sig) return;
    pruneSigRef.current = sig;
    onFilterChange(filter.key, kept);
  }, [pinned, datasourceId, dsRows.length, pinnedOptions, selectedValues, filter.key, onFilterChange]);

  if (pinned) {
    // Click toggles the value in/out of the selection; clearing ALL is allowed (empty array),
    // so keepAtLeastOne intentionally does not apply here. No × and no clear-all.
    const toggleOne = (v: string) => {
      const next = selectedValues.includes(v) ? selectedValues.filter(x => x !== v) : [...selectedValues, v];
      onFilterChange(filter.key, next);
    };
    return (
      <SelectedChipRow
        groupLabel={filter.label ? displayFilterLabel(filter.label, language, localizeText) : undefined}
        items={pinnedOptions.map(o => ({ value: o.value, label: o.label, muted: !selectedValues.includes(o.value) }))}
        onToggle={toggleOne}
      />
    );
  }

  if (selectedValues.length === 0) return null;

  const removeOne = (v: string) => {
    const next = selectedValues.filter(x => x !== v);
    if (filter.keepAtLeastOne && next.length === 0) return; // never clear the last one
    onFilterChange(filter.key, next);
  };
  const clearAll = () => onFilterChange(filter.key, filter.keepAtLeastOne && selectedValues.length > 0 ? [selectedValues[0]] : []);

  return (
    <SelectedChipRow
      groupLabel={filter.label ? displayFilterLabel(filter.label, language, localizeText) : undefined}
      items={selectedValues.map(v => ({ value: v, label: labelOf(v) }))}
      onRemove={removeOne}
      onClearAll={clearAll}
      removeDisabled={() => !!filter.keepAtLeastOne && selectedValues.length <= 1}
    />
  );
};

// ─── FilterSheet selected-chips ───────────────────────────────────────────────
// Surface a filterSheet's committed dimensions as removable chips in the same shared
// "selected tags" bar the pillSelect uses. One child component per ACTIVE dimension so
// each owns exactly one useCachedFilterOptions call — Rules of Hooks are satisfied by
// mount/unmount, never a conditional hook. Mirrors how SheetTabbedSection mounts
// SheetChipGroup per tab.
interface SheetSelectedChipDimensionProps {
  groupLabel: string;
  values: string[];
  source?: FilterSheetOptionSource;
  staticOptions?: FilterOption[];
  onRemove: (value: string) => void;
}

const SheetSelectedChipDimension: React.FC<SheetSelectedChipDimensionProps> = ({
  groupLabel,
  values,
  source,
  staticOptions,
  onRemove,
}) => {
  const { localizeText, language } = useWorkbenchConfigLocale();
  const datasourceId = source?.datasourceId || source?.datasetId;
  const labelKey = source?.labelKey || 'label';
  const valueKey = source?.valueKey || 'value';
  const outputFields = useMemo(() => [labelKey, valueKey], [labelKey, valueKey]);

  // Resolve labels against the FULL (non-date-bound) option list — a value→label map is
  // period-independent, and a selected item can legitimately fall outside the date-scoped
  // list (e.g. a store not "valid" in the period), which would otherwise show as a raw code.
  // Matches SelectedFilterChipsBar, which also omits bindDateRange for label resolution.
  const { rows } = useCachedFilterOptions({
    datasourceId,
    version: source?.version,
    outputFields,
    lang: language,
    scope: source?.scope,
  });

  const labelOf = useMemo(() => {
    const map = new Map<string, string>();
    if (datasourceId) {
      rows.forEach(row => map.set(String(row[valueKey] ?? ''), localizeText(String(row[labelKey] ?? ''))));
    } else {
      (staticOptions || []).forEach(opt => map.set(opt.value, resolveBilingualText(opt.label, language)));
    }
    return (v: string) => map.get(v) ?? v; // fall back to the raw code if out of the option list
  }, [datasourceId, rows, labelKey, valueKey, staticOptions, localizeText, language]);

  return (
    <SelectedChipRow
      groupLabel={groupLabel}
      items={values.map(v => ({ value: v, label: labelOf(v) }))}
      onRemove={onRemove}
    />
  );
};

interface SheetSelectedTextDimensionProps {
  groupLabel: string;
  value: string;
  onRemove: () => void;
}

// Free-text dims (code/name): the value IS the label — no option datasource lookup.
const SheetSelectedTextDimension: React.FC<SheetSelectedTextDimensionProps> = ({ groupLabel, value, onRemove }) => (
  <SelectedChipRow groupLabel={groupLabel} items={[{ value, label: value }]} onRemove={() => onRemove()} />
);

interface SheetPinnedChipDimensionProps {
  groupLabel: string;
  values: string[];
  source?: FilterSheetOptionSource;
  staticOptions?: FilterOption[];
  onToggleValue: (value: string) => void;
}

// Role-pinned variant of a sheet chips group: renders the dimension's FULL option list as
// fixed chips (unselected ones muted), clicking toggles the selection. Options load exactly
// like the sheet tab's own chip grid (SheetChipGroup — date-bound when the source opts in).
const SheetPinnedChipDimension: React.FC<SheetPinnedChipDimensionProps> = ({
  groupLabel,
  values,
  source,
  staticOptions,
  onToggleValue,
}) => {
  const { localizeText, language } = useWorkbenchConfigLocale();
  const datasourceId = source?.datasourceId || source?.datasetId;
  const labelKey = source?.labelKey || 'label';
  const valueKey = source?.valueKey || 'value';
  const outputFields = useMemo(() => [labelKey, valueKey], [labelKey, valueKey]);
  const { rows } = useCachedFilterOptions({
    datasourceId,
    version: source?.version,
    outputFields,
    lang: language,
    scope: source?.scope,
    bindDateRange: source?.bindGlobalDateRange,
  });

  const options: FilterOption[] = useMemo(() => {
    if (datasourceId) {
      return rows.map(row => ({
        label: localizeText(String(row[labelKey] ?? '')),
        value: String(row[valueKey] ?? ''),
      }));
    }
    return (staticOptions || []).map(opt => ({
      ...opt,
      label: resolveBilingualText(opt.label, language),
    }));
  }, [datasourceId, rows, labelKey, valueKey, staticOptions, localizeText, language]);

  return (
    <SelectedChipRow
      groupLabel={groupLabel}
      items={options.map(o => ({ value: o.value, label: o.label, muted: !values.includes(o.value) }))}
      onToggle={onToggleValue}
    />
  );
};

interface FilterSheetSelectedChipsProps {
  filter: FilterConfig;
  values: Record<string, any>;
  onChange: (patch: Record<string, any>) => void;
  /** Role-pinned dimension keys: those dims render their full option list as fixed chips. */
  pinnedKeys?: Set<string>;
}

// Walks a filterSheet's sections and mounts one chips group per dimension that has a
// committed value. Removing a chip re-commits via handleMultiFilterChange (same path
// as the sheet's Apply), so it re-emits the CSV param and re-queries immediately.
const FilterSheetSelectedChips: React.FC<FilterSheetSelectedChipsProps> = ({ filter, values, onChange, pinnedKeys }) => {
  const { localizeText, language } = useWorkbenchConfigLocale();
  const { t } = useTranslation('renderers');
  const sections = filter.sections || [];

  const removeChip = (dimKey: string, value: string) => {
    const cur: string[] = Array.isArray(values[dimKey]) ? values[dimKey] : [];
    onChange({ [dimKey]: cur.filter(x => x !== value) });
  };

  // Pinned mode: click toggles the value in/out; clearing to an empty array is allowed.
  const togglePinnedChip = (dimKey: string, value: string) => {
    const cur: string[] = Array.isArray(values[dimKey]) ? values[dimKey] : [];
    onChange({ [dimKey]: cur.includes(value) ? cur.filter(x => x !== value) : [...cur, value] });
  };

  const chipDim = (
    dimKey: string,
    groupLabel: unknown,
    source?: FilterSheetOptionSource,
    staticOptions?: FilterOption[],
  ) => {
    const v = values[dimKey];
    const arr: string[] = Array.isArray(v) ? v : (v != null && v !== '' ? [String(v)] : []);
    if (pinnedKeys?.has(dimKey)) {
      return (
        <SheetPinnedChipDimension
          key={dimKey}
          groupLabel={displayFilterLabel(groupLabel, language, localizeText)}
          values={arr}
          source={source}
          staticOptions={staticOptions}
          onToggleValue={val => togglePinnedChip(dimKey, val)}
        />
      );
    }
    if (arr.length === 0) return null;
    return (
      <SheetSelectedChipDimension
        key={dimKey}
        groupLabel={displayFilterLabel(groupLabel, language, localizeText)}
        values={arr}
        source={source}
        staticOptions={staticOptions}
        onRemove={val => removeChip(dimKey, val)}
      />
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {sections.map(sec => {
        switch (sec.kind) {
          case 'chipMultiSelect':
            return chipDim(sec.key, sec.title, sec.dataSource, sec.options);
          case 'tabbedChip':
            return (sec.tabs || []).map(tab => chipDim(tab.key, tab.label, tab.dataSource, tab.options));
          case 'layeredStore': {
            const nodes: React.ReactNode[] = [];
            if (sec.tags?.key) {
              nodes.push(
                chipDim(
                  sec.tags.key,
                  sec.tags.label ?? t('filter_panel.store_tags', 'Tags'),
                  sec.tags.dataSource,
                  sec.tags.options,
                ),
              );
            }
            (sec.tabs || []).forEach(tab => nodes.push(chipDim(tab.key, tab.label, tab.dataSource, tab.options)));
            return nodes;
          }
          case 'textInputs':
            return (sec.inputs || []).map(inp => {
              const val = values[inp.key];
              if (typeof val !== 'string' || val === '') return null;
              return (
                <SheetSelectedTextDimension
                  key={inp.key}
                  groupLabel={displayFilterLabel(inp.placeholder, language, localizeText)}
                  value={val}
                  onRemove={() => onChange({ [inp.key]: '' })}
                />
              );
            });
          default:
            return null;
        }
      })}
    </div>
  );
};

const sheetChipCls = (active: boolean) =>
  cn(
    'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors',
    active ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-700'
  );

const sheetSubTabCls = (active: boolean) =>
  cn(
    'flex-1 py-1.5 rounded-lg text-xs transition-colors',
    active ? 'bg-white text-indigo-600 shadow-sm dark:bg-neutral-700 dark:text-indigo-300' : 'text-slate-500 dark:text-neutral-400'
  );

interface SheetChipGroupProps {
  source?: FilterSheetOptionSource;
  staticOptions?: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
  searchable?: boolean;
}

// Loads options from a DataSource (or static list) and renders a multi-select chip grid.
const SheetChipGroup: React.FC<SheetChipGroupProps> = ({
  source,
  staticOptions,
  selected,
  onToggle,
  searchable,
}) => {
  const { localizeText, language } = useWorkbenchConfigLocale();
  const { t } = useTranslation('renderers');
  const [search, setSearch] = useState('');

  const datasourceId = source?.datasourceId || source?.datasetId;
  const labelKey = source?.labelKey || 'label';
  const valueKey = source?.valueKey || 'value';

  const outputFields = useMemo(() => [labelKey, valueKey], [labelKey, valueKey]);
  const { rows, loading: dsLoading } = useCachedFilterOptions({
    datasourceId,
    version: source?.version,
    outputFields,
    lang: language,
    scope: source?.scope,
    bindDateRange: source?.bindGlobalDateRange,
  });

  const options: FilterOption[] = useMemo(() => {
    // When a DataSource is configured, its rows are the source of truth — including a
    // legitimately empty result. Only fall back to staticOptions when there is no DataSource.
    if (datasourceId) {
      return rows.map(row => ({
        label: localizeText(String(row[labelKey] ?? '')),
        value: String(row[valueKey] ?? ''),
      }));
    }
    return (staticOptions || []).map(opt => ({
      ...opt,
      label: resolveBilingualText(opt.label, language),
    }));
  }, [datasourceId, rows, labelKey, valueKey, staticOptions, localizeText, language]);

  const isLoading = dsLoading;

  const visible = useMemo(() => {
    if (!searchable || !search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter(
      o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, searchable, search]);

  return (
    <div className="space-y-2">
      {searchable && (
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-neutral-800 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 dark:text-neutral-500 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('filter_panel.search_name_code', 'Search name or code')}
            // text-base (16px): iOS WebView auto-zooms the page when a focused input is < 16px.
            className="flex-1 bg-transparent text-base outline-none text-slate-700 dark:text-neutral-300 placeholder:text-slate-400 dark:placeholder:text-neutral-500"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')}>
              <XIcon className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500" />
            </button>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {isLoading && (
          <span className="text-sm text-slate-400 dark:text-neutral-500">{t('filter_panel.loading', 'Loading...')}</span>
        )}
        {!isLoading &&
          visible.map(opt => {
            const active = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onToggle(opt.value)}
                className={sheetChipCls(active)}
              >
                {active && <Check className="w-3.5 h-3.5" />}
                {opt.label}
              </button>
            );
          })}
        {!isLoading && visible.length === 0 && (
          <span className="text-sm text-slate-400 dark:text-neutral-500">{t('filter_panel.no_options', 'No options')}</span>
        )}
      </div>
    </div>
  );
};

interface SheetTabbedSectionProps {
  section: FilterSheetSection;
  draft: Record<string, any>;
  onToggle: (key: string, value: string) => void;
  showTags?: boolean;
  activeTabKey: string;
  onTabChange: (sectionKey: string, tabKey: string) => void;
}

// Renders a section with inner sub-tabs (tabbedChip categories, layeredStore four-tab + tags).
// The active sub-tab is controlled by the parent so it survives accordion collapse/expand.
const SheetTabbedSection: React.FC<SheetTabbedSectionProps> = ({
  section,
  draft,
  onToggle,
  showTags,
  activeTabKey,
  onTabChange,
}) => {
  const { language } = useWorkbenchConfigLocale();
  const { t } = useTranslation('renderers');
  const tabs = section.tabs || [];
  const tabKey = tabs.some(t => t.key === activeTabKey) ? activeTabKey : (tabs[0]?.key ?? '');
  const activeTab = tabs.find(t => t.key === tabKey) || tabs[0];
  const tagsKey = section.tags?.key;

  return (
    <div className="space-y-3">
      {showTags && section.tags && tagsKey && (
        <div>
          <div className="text-[11px] text-slate-500 dark:text-neutral-400 mb-2">
            {resolveBilingualLabel(section.tags.label, language) || t('filter_panel.store_tags', 'Tags')}
          </div>
          <SheetChipGroup
            source={section.tags.dataSource}
            staticOptions={section.tags.options}
            selected={Array.isArray(draft[tagsKey]) ? draft[tagsKey] : []}
            onToggle={v => onToggle(tagsKey, v)}
          />
        </div>
      )}
      <div className="flex bg-slate-100 dark:bg-neutral-800 rounded-xl p-1 gap-1">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => onTabChange(section.key, t.key)}
            className={sheetSubTabCls(tabKey === t.key)}
          >
            {resolveBilingualLabel(t.label, language)}
          </button>
        ))}
      </div>
      {activeTab && (
        <SheetChipGroup
          key={activeTab.key}
          source={activeTab.dataSource}
          staticOptions={activeTab.options}
          selected={Array.isArray(draft[activeTab.key]) ? draft[activeTab.key] : []}
          onToggle={v => onToggle(activeTab.key, v)}
          searchable={activeTab.searchable}
        />
      )}
    </div>
  );
};

interface FilterSheetFilterFieldProps {
  filter: FilterConfig;
  committedValues: Record<string, any>;
  onApply: (patch: Record<string, any>) => void;
  isMobileLayout: boolean;
}

const FilterSheetFilterField: React.FC<FilterSheetFilterFieldProps> = ({
  filter,
  committedValues,
  onApply,
  isMobileLayout,
}) => {
  const { language } = useWorkbenchConfigLocale();
  const { t } = useTranslation('renderers');
  const [open, setOpen] = useState(false);
  const sections = useMemo(() => filter.sections || [], [filter.sections]);

  const allKeys = useMemo(() => collectFilterSheetKeys(filter), [filter]);
  const textKeys = useMemo(() => filterSheetTextKeys(sections), [sections]);

  const buildDraft = useCallback(() => {
    const d: Record<string, any> = {};
    allKeys.forEach(k => {
      const v = committedValues[k];
      if (textKeys.has(k)) {
        d[k] = typeof v === 'string' ? v : '';
      } else {
        d[k] = Array.isArray(v) ? [...v] : v != null && v !== '' ? [String(v)] : [];
      }
    });
    return d;
  }, [allKeys, textKeys, committedValues]);

  const [draft, setDraft] = useState<Record<string, any>>(buildDraft);
  const [expanded, setExpanded] = useState<string | null>(sections[0]?.key ?? null);
  // Active sub-tab per section, lifted here so it persists across accordion collapse/expand.
  const [tabState, setTabState] = useState<Record<string, string>>({});
  const handleTabChange = useCallback((sectionKey: string, tabKey: string) => {
    setTabState(s => ({ ...s, [sectionKey]: tabKey }));
  }, []);

  // Re-sync draft to the latest committed values each time the sheet opens.
  useEffect(() => {
    if (open) setDraft(buildDraft());
  }, [open]);

  const toggleChip = useCallback((key: string, value: string) => {
    setDraft(d => {
      const arr: string[] = Array.isArray(d[key]) ? d[key] : [];
      return {
        ...d,
        [key]: arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value],
      };
    });
  }, []);

  const setText = useCallback((key: string, value: string) => {
    setDraft(d => ({ ...d, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    const cleared: Record<string, any> = {};
    allKeys.forEach(k => {
      cleared[k] = textKeys.has(k) ? '' : [];
    });
    setDraft(cleared);
  }, [allKeys, textKeys]);

  const apply = useCallback(() => {
    onApply(draft);
    setOpen(false);
  }, [draft, onApply]);

  const activeCount = useMemo(
    () => countActiveFilterSheetSections(sections, committedValues),
    [sections, committedValues]
  );

  // Desktop popup viewport positioning: the popup's right edge aligns with the trigger button's
  // right edge, clamped inside the viewport (shifts left automatically when the button is near the
  // right edge). Width is measured from the popup itself (when the root font-size is not 16px,
  // w-80 ≠ 320px, so hardcoding the width would misalign it).
  const triggerWrapRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);
  const updatePopupPos = useCallback(() => {
    const el = triggerWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const w = popupRef.current?.offsetWidth || 320;
    const maxLeft = Math.max(window.innerWidth - w - 8, 8);
    setPopupPos({
      top: rect.bottom + 4,
      left: Math.min(Math.max(rect.right - w, 8), maxLeft),
    });
  }, []);
  useEffect(() => {
    if (!open || isMobileLayout) return;
    // Wait for the popup to mount, then measure its width before positioning; the popup stays
    // visibility:hidden until positioned to avoid flicker.
    const raf = requestAnimationFrame(updatePopupPos);
    window.addEventListener('scroll', updatePopupPos, true);
    window.addEventListener('resize', updatePopupPos);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', updatePopupPos, true);
      window.removeEventListener('resize', updatePopupPos);
    };
  }, [open, isMobileLayout, updatePopupPos]);

  const renderSectionContent = (sec: FilterSheetSection) => {
    switch (sec.kind) {
      case 'chipMultiSelect':
        return (
          <SheetChipGroup
            source={sec.dataSource}
            staticOptions={sec.options}
            selected={Array.isArray(draft[sec.key]) ? draft[sec.key] : []}
            onToggle={v => toggleChip(sec.key, v)}
            searchable={sec.searchable}
          />
        );
      case 'tabbedChip':
        return (
          <SheetTabbedSection
            section={sec}
            draft={draft}
            onToggle={toggleChip}
            activeTabKey={tabState[sec.key] ?? ''}
            onTabChange={handleTabChange}
          />
        );
      case 'layeredStore':
        return (
          <SheetTabbedSection
            section={sec}
            draft={draft}
            onToggle={toggleChip}
            showTags
            activeTabKey={tabState[sec.key] ?? ''}
            onTabChange={handleTabChange}
          />
        );
      case 'textInputs':
        return (
          <div className="space-y-2">
            {(sec.inputs || []).map(inp => (
              <div
                key={inp.key}
                className="flex items-center gap-2 bg-slate-100 dark:bg-neutral-800 rounded-xl px-3 py-2.5"
              >
                <Search className="w-4 h-4 text-slate-400 dark:text-neutral-500 flex-shrink-0" />
                <input
                  value={typeof draft[inp.key] === 'string' ? draft[inp.key] : ''}
                  onChange={e => setText(inp.key, e.target.value)}
                  placeholder={resolveBilingualLabel(inp.placeholder, language)}
                  // text-base (16px): iOS WebView auto-zooms the page when a focused input is < 16px.
                  className="flex-1 bg-transparent text-base outline-none text-slate-700 dark:text-neutral-300 placeholder:text-slate-400 dark:placeholder:text-neutral-500"
                />
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  const renderBody = (showClose: boolean) => (
    <div className="flex flex-col max-h-[88vh]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-neutral-800">
        <button
          type="button"
          onClick={reset}
          className="text-slate-500 dark:text-neutral-400 text-sm hover:text-slate-700 dark:hover:text-neutral-300"
        >
          {t('filter_panel.reset', 'Reset')}
        </button>
        <div className="text-slate-800 dark:text-neutral-200 text-sm font-semibold">
          {t('filter_panel.filters', 'Filters')}
        </div>
        {showClose ? (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg text-slate-400 dark:text-neutral-500"
          >
            <XIcon className="w-5 h-5" />
          </button>
        ) : (
          <span className="w-8" />
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-1">
        {sections.map((sec, i) => (
          <div key={sec.key}>
            {i > 0 && <div className="border-t border-slate-100 dark:border-neutral-800" />}
            <button
              type="button"
              onClick={() => setExpanded(v => (v === sec.key ? null : sec.key))}
              className="w-full flex items-center justify-between py-3"
            >
              <span className="text-slate-800 dark:text-neutral-200 text-sm font-medium">
                {resolveBilingualLabel(sec.title, language)}
              </span>
              {expanded === sec.key ? (
                <ChevronUp className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
              )}
            </button>
            {expanded === sec.key && <div className="pb-3">{renderSectionContent(sec)}</div>}
          </div>
        ))}
      </div>

      <div className="px-5 py-4 border-t border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <Button className="w-full" onClick={apply}>
          {t('filter_panel.apply_filters', 'Apply Filters')}
        </Button>
      </div>
    </div>
  );

  const triggerButton = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
        activeCount > 0
          ? 'bg-indigo-500 text-white'
          : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700'
      )}
    >
      <FilterIcon className="w-3.5 h-3.5" />
      {t('filter_panel.filter', 'Filter')}
      {activeCount > 0 && (
        <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/30 text-[10px]">
          {activeCount}
        </span>
      )}
    </button>
  );

  if (isMobileLayout) {
    return (
      <div className={mobileFilterFieldStyles.field}>
        {triggerButton}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent {...mobileFilterSheetProps} side="bottom" className="rounded-t-3xl overflow-hidden p-0 max-h-[88vh]">
            <SheetHeader className="sr-only">
              <SheetTitle>{t('filter_panel.filters', 'Filters')}</SheetTitle>
            </SheetHeader>
            {renderBody(false)}
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Desktop popup is portaled to body + positioned fixed against the viewport (fix, 2026-08-07):
  // the old absolute top-full right-0 made the popup extend into the sidebar area when the trigger
  // button sits to the left, and the FilterPanel container's z-30 stacking context is below the
  // sidebar → the popup got covered by the sidebar; also, when an ancestor has a transform, the old
  // "fixed" overlay was actually positioned relative to that ancestor and could not cover the full
  // viewport. After the portal both are relative to the viewport with z above the sidebar; on
  // scroll/resize the position is recomputed from the button's new location so it keeps following.
  return (
    <div className="relative" ref={triggerWrapRef}>
      {triggerButton}
      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
          <div
            ref={popupRef}
            className="fixed z-[100] w-80 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-slate-200 dark:border-neutral-700 overflow-hidden"
            style={{ top: popupPos?.top ?? 0, left: popupPos?.left ?? 0, opacity: popupPos ? 1 : 0 }}
          >
            {renderBody(true)}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default FilterPanelRenderer;
