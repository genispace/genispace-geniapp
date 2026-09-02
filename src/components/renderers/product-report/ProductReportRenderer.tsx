import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@genispace/shared-utils';
import { Skeleton } from '../../skeleton';
import { ChevronUp, ChevronDown, BarChart3, Table as TableIcon } from 'lucide-react';
import type { DatabaseDataSourceConfig } from '@/types/databaseDataSource';
import type { ComponentParameterConfig } from '@/types/parameters';
import { useComponentCommunication } from '@/hooks/useComponentCommunication';
import { useWorkbenchConfigLocale } from '@/contexts/WorkbenchConfigLocaleContext';
import { resolveBilingualText, type BilingualText } from '@/utils/workbenchDisplayLocale';
import { useBoundRows } from '../data/useBoundRows';
import type {
  ProductReportConfig,
  ProductReportViewMode,
  ReportColumn,
  DimensionConfig,
  SummaryCardConfig,
} from '@/types/productReport';
import { renderReportCell, resolveFieldByLang, formatReportValue, ReportCard } from '../product-detail/productCellRender';
import { useMobileViewport } from '@/hooks/useMobileViewport';
import { useMobileFlowLayout } from '@/mobile/mobileFlowLayoutContext';
import { useStickyHeaderClone } from '../shared/useStickyHeaderClone';
import { evaluateVisibleWhen } from '@/utils/visibleWhen';
import { useVisibleWhenContext } from '@/hooks/useVisibleWhenContext';

export interface ProductReportRendererProps extends ProductReportConfig {
  id?: string;
  databaseDataSourceConfig?: DatabaseDataSourceConfig | null; // primary (e.g. PLU) source
  dimDataSourceConfig?: DatabaseDataSourceConfig | null; // dimension source
  summaryDataSourceConfig?: DatabaseDataSourceConfig | null; // summary cards
  totalRowDataSourceConfig?: DatabaseDataSourceConfig | null; // dimension-tab pinned footer total row (dims flagged showTotalRow)
  componentParameterConfig?: ComponentParameterConfig;
  pageParams?: Record<string, unknown>;
  // Per-role content font sizes (px). Empty → readable defaults; raises tiny text for low-vision users.
  titleFontSize?: number; // page/section title
  valueFontSize?: number; // summary card value
  labelFontSize?: number; // summary card labels, item-count caption, sort/reset buttons, chips
  cellFontSize?: number; // table header + cell text
  badgeFontSize?: number; // dimension tab / sub-tab badges
}

const ProductReportRenderer: React.FC<ProductReportRendererProps> = (props) => {
  const {
    id = 'product-report',
    databaseDataSourceConfig,
    dimDataSourceConfig,
    summaryDataSourceConfig,
    totalRowDataSourceConfig,
    componentParameterConfig,
    pageParams = {},
    titleFontSize,
    valueFontSize,
    labelFontSize,
    cellFontSize,
    badgeFontSize,
  } = props;
  const titleFs = titleFontSize ?? 16;
  const valueFs = valueFontSize ?? 15;
  const labelFs = labelFontSize ?? 13;
  const cellFs = cellFontSize ?? 13;
  const badgeFs = badgeFontSize ?? 12;
  const { t } = useTranslation('renderers');
  const { language } = useWorkbenchConfigLocale();
  const { isMobile } = useMobileViewport(); // real viewport only — NOT true inside the studio phone frame
  const isMobileFlow = useMobileFlowLayout(); // true on real mobile AND inside the studio phone frame

  // Audit decision 2026-07-07: the SW_DEFAULTS fallback shim was removed — business config must come
  // explicitly from the page JSON (the setup-workbench.js product-page props are already a full config);
  // with config missing, each section renders an empty state that is visible and debuggable.
  const cfg: ProductReportConfig = props;

  const dims = useMemo(() => cfg.dimensions ?? [], [cfg]);
  const summaryCards = cfg.summaryCards ?? [];
  // Per-card visibility (role/user/pageParam rules, same engine as Tabs items) — e.g. the SW
  // discount card hides for store_manager; the remaining cards re-tile since the grid column
  // count below derives from the filtered length.
  const visibleWhenCtx = useVisibleWhenContext(pageParams);
  const visibleSummaryCards = useMemo(
    () => summaryCards.filter((c) => evaluateVisibleWhen(c.visibleWhen, visibleWhenCtx)),
    [summaryCards, visibleWhenCtx]
  );
  const sortOptions = cfg.sortOptions ?? [];
  // Quick-scope pills row (store/national/retail/outlet/city…) — the selected value is injected into
  // the data sources via pillParam (storeScope SQL branches), see scopeExtra below.
  const quickScope = cfg.quickScope;
  const showItemCount = cfg.showItemCount !== false;
  const quickScopePills = quickScope?.pills ?? [];
  const showQuickScope =
    quickScopePills.length > 0 && evaluateVisibleWhen(quickScope?.visibleWhen, visibleWhenCtx);
  const filterKeys = useMemo(() => cfg.filterKeys ?? [], [cfg]);
  const enabledViews = cfg.enabledViews ?? ['list', 'table'];
  const filterComponentId = cfg.filterComponentId ?? '';
  const primaryKeyField = cfg.primaryKeyField ?? 'plu';
  const dimKeyField = cfg.dimKeyField ?? 'dim_key';
  const title = cfg.title ? resolveBilingualText(cfg.title, language) : '';

  const [primaryKey, setPrimaryKey] = useState(dims[0]?.key ?? '');
  const activeDim: DimensionConfig | undefined = dims.find(d => d.key === primaryKey) ?? dims[0];
  // Per-sub-tab visibility (same engine as summaryCards above) — e.g. the SW e-commerce sub-tab
  // hides for store_manager via a role rule; every consumer below reads the filtered list.
  const visibleSubTabs = useMemo(
    () => (activeDim?.subTabs ?? []).filter(s => evaluateVisibleWhen(s.visibleWhen, visibleWhenCtx)),
    [activeDim, visibleWhenCtx]
  );
  const [subTabKey, setSubTabKey] = useState<string | undefined>(() => {
    const def = visibleSubTabs.find(s => s.key === activeDim?.defaultSubTab);
    return (def ?? visibleSubTabs[0])?.key;
  });
  // When the active subTab is hidden by visibleWhen, fall back to the first visible subTab
  // synchronously during render (same precedent as pageResetSig: React's official
  // "adjusting state during render" pattern), avoiding a one-frame stale request from a useEffect fallback.
  if (visibleSubTabs.length > 0 && !visibleSubTabs.some(s => s.key === subTabKey)) {
    setSubTabKey(visibleSubTabs[0].key);
  }
  const [sortKey, setSortKey] = useState(sortOptions[0]?.key ?? '');
  const [sortAsc, setSortAsc] = useState((sortOptions[0]?.defaultDir ?? 'desc') === 'asc');
  const [viewMode, setViewMode] = useState<ProductReportViewMode>(cfg.defaultViewMode ?? enabledViews[0] ?? 'table');
  // Server-side pagination: rows/limit/offset go to the /data endpoint, which returns the true COUNT(*)
  // total. pageSize is configurable (page JSON); 20 is a readable default for both mobile and desktop.
  const pageSize = cfg.pageSize && cfg.pageSize > 0 ? cfg.pageSize : 20;
  const [page, setPage] = useState(1);

  const isPrimary = activeDim?.source === 'primary';
  // Quick-scope pills render as the primary dimension's sub-tab row — same SubTabs look as the
  // store/category second-level tabs. Other dims keep their own subTabs; when this row isn't
  // visible the sort buttons fall back to the count row below.
  const showScopeSubTab = showQuickScope && isPrimary;

  const [, forceTick] = useReducer((x: number) => x + 1, 0);
  const pname = (k: string) => `${filterComponentId}_${k}`;
  const emitNames = useMemo(() => filterKeys.map(f => `${filterComponentId}_${f.key}`), [filterComponentId, filterKeys]);
  const detailEmit = cfg.detailNav?.emitParam;
  // Quick-scope pill selection rides the cross-page parameter bus (requirement E, 2026-08-05): the pill is
  // emitted as `<componentId>_<pillParam>` (e.g. sw-product-report_storeScope) so navigating to
  // the product detail page and back restores the list exactly as left. ⚠️ The key must NOT use the
  // filterComponentId namespace (sw-filter-global_*): ParameterContext's revisit init treats every
  // param whose first segment contains "filter" as FilterPanel-owned and STRIPS it before the panel
  // remounts (isFilterPanelParameter) — FilterPanel's own params survive via the panel's re-emit, a
  // pill has no such re-emitter, so it must live under this component's own id instead. Stale/
  // unknown values (config changed) fall back to the first pill. HQ (pills hidden) never touches
  // the bus — requests stay byte-identical to before.
  const scopeParam = quickScope?.pillParam ?? '';
  const scopeBusKey = scopeParam ? `${id}_${scopeParam}` : '';
  // Date/period keys the page bus drives (e.g. sw-filter-global_periodStart/End). Listening here lets a
  // date change re-render this orchestrator so paging resets to page 1 (see resetSig below).
  const dateKeys = useMemo(() => componentParameterConfig?.listenToParameters ?? [], [componentParameterConfig?.listenToParameters]);
  const comm = useComponentCommunication({
    componentId: `${id}-filters`,
    emitParameters: [...emitNames, ...(showQuickScope && scopeBusKey ? [scopeBusKey] : []), ...(detailEmit ? [detailEmit] : [])],
    listenParameters: useMemo(() => [...emitNames, ...dateKeys], [emitNames, dateKeys]),
    onParameterChange: () => forceTick(),
    autoCleanup: true,
  });
  const [scopeKey, setScopeKeyState] = useState(() => {
    const fallback = quickScopePills[0]?.value ?? '';
    if (!showQuickScope || !scopeBusKey) return fallback;
    const v = comm.getCurrentParameter(scopeBusKey);
    const s = typeof v === 'string' ? v : '';
    return quickScopePills.some(p => p.value === s) ? s : fallback;
  });
  const setScopeKey = (v: string) => {
    setScopeKeyState(v);
    if (showQuickScope && scopeBusKey) comm.emit(scopeBusKey, v);
  };
  const getStr = (k: string): string => {
    const v = comm.getCurrentParameter(pname(k));
    // Multi-select params travel as first-class arrays (2026-07-03 array-params migration); the
    // ProductReport consumes them as CSV, so fold arrays back to a comma string. Without this, a
    // multi-select value (storeIds / categories / …) reads as '' → filterKeyHash never changes →
    // list & summary cards never refetch on filter change.
    if (Array.isArray(v)) return v.map(x => String(x)).filter(Boolean).join(',');
    return typeof v === 'string' ? v : (v == null ? '' : String(v));
  };
  const getCsv = (k: string): string[] => getStr(k).split(',').map(s => s.trim()).filter(Boolean);

  const filterVals: Record<string, string> = {};
  for (const fk of filterKeys) filterVals[fk.key] = getStr(fk.key);
  const filterKeyHash = filterKeys.map(fk => filterVals[fk.key]).join('|');

  // Reset to page 1 whenever the result-set identity changes (filters / date / sort / active dimension).
  // Adjusting state during render (React's documented pattern) resets page BEFORE the row fetch fires, so
  // we never fetch page N of a freshly-changed dataset and then bounce back to page 1.
  const dateKey = dateKeys.map(k => String(comm.getCurrentParameter(k) ?? '')).join('|');
  const resetSig = `${filterKeyHash}|${primaryKey}|${subTabKey ?? ''}|${sortKey}|${sortAsc}|${scopeKey}|${dateKey}`;
  const [pageResetSig, setPageResetSig] = useState(resetSig);
  if (resetSig !== pageResetSig) {
    setPageResetSig(resetSig);
    setPage(1);
  }
  // Display identity EXCLUDES sort: a column-header sort click keeps the current rows on
  // screen while the re-sorted page 1 loads, then swaps them in on completion — no skeleton
  // flash. Filter/dimension/scope/date changes still blank to the skeleton immediately.
  const displaySig = `${filterKeyHash}|${primaryKey}|${subTabKey ?? ''}|${scopeKey}|${dateKey}`;
  const sortSig = `${sortKey}|${sortAsc}`;

  const { dimension, groupBy } = useMemo((): { dimension: string; groupBy: string } => {
    if (!activeDim || activeDim.source === 'primary') return { dimension: '', groupBy: '' };
    const sub = visibleSubTabs.find(s => s.key === subTabKey);
    return {
      dimension: sub?.dimension ?? activeDim.dimension ?? '',
      groupBy: sub?.groupBy ?? activeDim.groupBy ?? '',
    };
  }, [activeDim, subTabKey, visibleSubTabs]);

  const sortField = sortOptions.find(o => o.key === sortKey)?.field ?? '';
  const sortDir = sortAsc ? 'asc' : 'desc';
  // Server-side pagination + sorting: page/limit drive the endpoint's LIMIT/OFFSET (auto-wrapped for
  // enablePagination datasources), sortField/sortDir feed the SQL's dynamic ORDER BY. All params sit at
  // the top level of the request body (the /data endpoint reads params flat).
  // Quick-scope pills: inject the selected store scope into every data source (only when the
  // pills are visible — HQ requests stay byte-identical to before). scopeKey sits in resetSig/
  // displaySig above, so switching a pill resets to page 1 and refetches like a filter change.
  const scopeExtra = showQuickScope && scopeParam ? { [scopeParam]: scopeKey } : {};
  const rowsExtra = useMemo(
    () => ({
      ...filterVals,
      ...scopeExtra,
      ...(isPrimary ? {} : { dimension, groupBy }),
      sortField,
      sortDir,
      page,
      limit: pageSize,
    }),
    [filterKeyHash, isPrimary, dimension, groupBy, sortField, sortDir, page, pageSize, scopeKey, scopeParam, showQuickScope],
  );
  const summaryExtra = useMemo(
    () => ({ ...filterVals, ...scopeExtra }),
    [filterKeyHash, scopeKey, scopeParam, showQuickScope],
  );

  // total = true COUNT(*) across all pages (endpoint pagination.total); rawRows is the current page only.
  const { rows: rawRows, loading, total } = useBoundRows(
    isPrimary ? databaseDataSourceConfig : dimDataSourceConfig,
    componentParameterConfig, pageParams, `${id}-rows`, 'product-rows', rowsExtra,
  );
  const { rows: sumRows } = useBoundRows(summaryDataSourceConfig, componentParameterConfig, pageParams, `${id}-sum`, 'product-summary', summaryExtra);
  const summary = sumRows[0];

  // Pinned footer total row (2026-08-28 task#44 req 3): only on dimension tabs flagged showTotalRow
  // (SW: category/season/series). Bound to a separate single-row total datasource fed with the same
  // filters + dimension/groupBy, so the total equals the sum of the table's rows regardless of
  // pagination/sorting (server-side paging means the client never sees the full row set).
  const showTotalRow = !isPrimary && activeDim?.showTotalRow === true;
  const totalExtra = useMemo(
    () => ({ ...filterVals, ...scopeExtra, dimension, groupBy }),
    [filterKeyHash, dimension, groupBy, scopeKey, scopeParam, showQuickScope],
  );
  const { rows: totalRows, loading: totalLoading } = useBoundRows(
    showTotalRow ? totalRowDataSourceConfig : undefined,
    componentParameterConfig, pageParams, `${id}-total`, 'product-dim-total', totalExtra,
  );
  // Stale-data guard (2026-09-01 task#44 follow-up): mirrors the main rows' acc pattern above.
  // The footer must never show a previous result set's totals — e.g. a store-scope switch whose
  // new rows are all '—' (LY NULL) while the footer still shows the old scope's 105.0%.
  // A displaySig flip blanks the footer DURING RENDER (loading only flips in the post-paint
  // effect, too late); the completion effect then commits the fresh row only if the result set
  // is still current (a superseded completion is dropped, same as the rows acc).
  const [totalAcc, setTotalAcc] = useState<{ sig: string; row: Record<string, unknown> | undefined }>(
    { sig: displaySig, row: undefined },
  );
  if (totalAcc.sig !== displaySig) setTotalAcc({ sig: displaySig, row: undefined });
  useEffect(() => {
    if (totalLoading) return; // refetch in flight — keep the blank from the render-time reset
    const row = showTotalRow ? totalRows[0] : undefined;
    // Identity bail-out: committing an unchanged row would re-render with a fresh totalRows
    // reference (rows arrays are re-created per render in some feeds), firing this effect again
    // forever — an unbounded render↔effect loop.
    setTotalAcc(prev => (prev.sig !== displaySig || prev.row === row ? prev : { sig: displaySig, row }));
  }, [totalLoading, totalRows, displaySig, showTotalRow]);
  const totalRow = totalAcc.sig === displaySig ? totalAcc.row : undefined;

  // Dynamic city pill label: union of the authorized stores' home cities (single-row `cities`
  // field). Only fetched while the pills are visible (HQ never requests it); unconfigured / query
  // failure / empty result → fall back to the pill's static label.
  const citiesCfg = showQuickScope ? quickScope?.citiesDataSourceConfig : undefined;
  const { rows: cityRows } = useBoundRows(citiesCfg, componentParameterConfig, pageParams, `${id}-cities`, 'product-scope-cities');
  const cityPillValue = quickScope?.cityPillValue ?? 'city';
  const citiesText = String(cityRows[0]?.cities ?? '').trim();
  const cityPillLabel =
    citiesText && quickScope?.cityLabelTemplate
      ? quickScope.cityLabelTemplate.replace('{{cities}}', citiesText)
      : null;

  const keyField = isPrimary ? primaryKeyField : dimKeyField;
  // Guard against rendering rows from the other source mid-switch (key absent).
  const stale = rawRows.length > 0 && !(keyField in rawRows[0]);

  const addToken = (k: string, key: string) => comm.emit(pname(k), [...new Set([...getCsv(k), key])].join(','));

  // Server-side "load more": each page fetch REPLACES rawRows with just that page, so accumulate pages
  // here. The accumulator blanks (during render, mirroring the page reset) only when displaySig flips
  // (filters/date/dimension); a pure re-sort keeps the old rows visible until the completion edge below
  // swaps in the re-sorted page 1 (sortSig change ⇒ replace, never append).
  const [acc, setAcc] = useState<{ sig: string; sortSig: string; rows: Record<string, unknown>[]; loadedPage: number }>(
    { sig: displaySig, sortSig, rows: [], loadedPage: 0 },
  );
  if (acc.sig !== displaySig) setAcc({ sig: displaySig, sortSig, rows: [], loadedPage: 0 });
  // Append only on a load COMPLETION (loading true→false edge). Otherwise the effect could fire right
  // after displaySig flips — while rawRows still holds the PREVIOUS result set and loading hasn't turned
  // true yet — and append stale rows as "page 1" of the new set.
  const prevLoadingRef = useRef(loading);
  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = loading;
    if (loading || !wasLoading) return;          // act only on the true→false completion edge
    if (stale || rawRows.length === 0) return;
    setAcc(prev => {
      if (prev.sig !== displaySig) return prev;  // completion for a superseded result set
      const resort = prev.sortSig !== sortSig;
      if (!resort && prev.loadedPage >= page) return prev;  // this page already accumulated
      return { sig: displaySig, sortSig, rows: page <= 1 || resort ? rawRows : [...prev.rows, ...rawRows], loadedPage: page };
    });
  }, [loading, rawRows, stale, page, displaySig, sortSig]);
  const view = acc.sig === displaySig ? acc.rows : [];

  const handleSortBtn = (key: string) => {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); const o = sortOptions.find(s => s.key === key); setSortAsc((o?.defaultDir ?? 'desc') === 'asc'); }
  };
  // Column-header sorting: headers map to sortOptions via field === column.dataIndex.
  const handleSortField = (field: string) => {
    const o = sortOptions.find(s => s.field === field);
    if (o) handleSortBtn(o.key);
  };

  const changePrimaryTab = (k: string) => {
    setPrimaryKey(k);
    const d = dims.find(x => x.key === k);
    // Land on the filtered visible subTabs: a hidden defaultSubTab also falls back to the first visible item.
    const vis = (d?.subTabs ?? []).filter(s => evaluateVisibleWhen(s.visibleWhen, visibleWhenCtx));
    setSubTabKey((vis.find(s => s.key === d?.defaultSubTab) ?? vis[0])?.key);
  };

  const handleDimClick = (row: Record<string, unknown>) => {
    const key = String(row[dimKeyField] ?? '');
    if (!key || !activeDim) return;
    const sub = visibleSubTabs.find(s => s.key === subTabKey);
    const drill = sub?.drill ?? activeDim.drill;
    if (!drill) return;
    if (drill.mode === 'set') comm.emit(pname(drill.emitParam), key);
    else addToken(drill.emitParam, key);
    const then = drill.then ?? { type: 'none' };
    if (then.type === 'primaryTab') changePrimaryTab(then.key);
    else if (then.type === 'subTab') setSubTabKey(then.key);
  };

  const resolveDetailTitle = (row: Record<string, unknown>, titleField: BilingualText | string | undefined): string => {
    if (!titleField) return '';
    if (typeof titleField === 'string') return resolveFieldByLang(row, titleField, language);
    const fieldName = (language.startsWith('zh') ? titleField.zh : titleField.en) ?? titleField.zh ?? titleField.en;
    return fieldName ? String(row[fieldName] ?? '') : '';
  };

  const handlePrimaryClick = (row: Record<string, unknown>) => {
    const dn = cfg.detailNav;
    const idVal = dn ? String(row[dn.idField] ?? '') : '';
    if (!dn || !idVal) return;
    if (dn.emitParam) comm.emit(dn.emitParam, idVal);
    if (dn.pageId) {
      // Requirement E (2026-08-05): when quickScope pills are visible, carry the current pill
      // (storeScope) along with the navigation into the detail page. The detail page's data-source
      // SQL all has a {{storeScope}} branch, and config parameters handle the page-param → SQL mapping.
      // The current-store pill needs no extra storeIds — the detail page's FilterPanel shares the
      // same sw-filter-global as the list page (cross-page shared), so the store manager's store
      // selection naturally carries over via the sw-filter-global_storeIds parameter.
      const urlParams: Record<string, string> = { [dn.urlParam]: idVal };
      if (showQuickScope && scopeParam && scopeKey) urlParams[scopeParam] = scopeKey;
      window.dispatchEvent(new CustomEvent('workbench-open-tab', {
        detail: { pageId: dn.pageId, navigationTitle: resolveDetailTitle(row, dn.titleField) || idVal, icon: dn.icon, urlParams },
      }));
    }
  };

  const onRowClick = isPrimary ? handlePrimaryClick : handleDimClick;
  const count = total; // total items across all pages (COUNT(*) from the endpoint)
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Load-more: more rows exist while the accumulated count is below the true total. loadMore only advances
  // once the current page has landed (loadedPage === page), so a burst of scroll events (or taps) can't
  // queue several heavy queries at once.
  const hasMore = total > 0 && view.length < total;
  const loadMore = useCallback(() => {
    if (loading || acc.loadedPage !== page || view.length >= total) return;
    setPage(p => p + 1);
  }, [loading, acc.loadedPage, page, view.length, total]);
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    // Fire ~200px before the sentinel is visible so the next page is fetching before the user hits bottom.
    const io = new IntersectionObserver(
      entries => { if (entries.some(e => e.isIntersecting)) loadMoreRef.current(); },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, view.length]);

  const cardLayout = isPrimary ? cfg.listCard?.primary : cfg.listCard?.dimension;
  const freezeFirstColumn = !!cfg.freezeFirstColumn;
  // Flow flag (not viewport) so the studio phone frame previews the real-mobile pinned header.
  const stickyHeader = isMobileFlow && freezeFirstColumn;
  // Fields hidden for the active dimension (e.g. store dims have no store-level stock → hide stock cols).
  const hiddenFields = useMemo(
    () => new Set<string>(isPrimary ? [] : activeDim?.hiddenFields ?? []),
    [isPrimary, activeDim],
  );
  const allColumns = (isPrimary ? cfg.tableColumns?.primary : cfg.tableColumns?.dimension) ?? [];
  const rawColumns = hiddenFields.size ? allColumns.filter(c => !hiddenFields.has(c.dataIndex)) : allColumns;
  // Per-sub-tab / per-dimension frozen name-column width: dimension tabs share one column config,
  // but name lengths differ per tab (channel vs store), so the width is overridable from the page JSON.
  const activeSub = visibleSubTabs.find(s => s.key === subTabKey);
  const labelColWidth = isPrimary ? undefined : activeSub?.labelWidth ?? activeDim?.labelWidth;
  const widthedColumns = labelColWidth != null && rawColumns.length > 0
    ? [{ ...rawColumns[0], minWidth: labelColWidth, maxWidth: labelColWidth }, ...rawColumns.slice(1)]
    : rawColumns;
  // When freezeFirstColumn is on, guarantee the first column is sticky-left even if the
  // per-column config didn't set it.
  const columns = freezeFirstColumn && widthedColumns.length > 0 && !widthedColumns[0].frozen
    ? [{ ...widthedColumns[0], frozen: true }, ...widthedColumns.slice(1)]
    : widthedColumns;
  const showViewToggle = enabledViews.length > 1;

  return (
    <div className="space-y-3">
      {title && <h2 className="font-semibold text-slate-900 dark:text-neutral-100" style={{ fontSize: titleFs }}>{title}</h2>}

      {visibleSummaryCards.length > 0 && (
        // Narrow flow (real mobile or phone frame): 3 columns — inline template beats any class.
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${isMobileFlow ? Math.min(visibleSummaryCards.length, 3) : visibleSummaryCards.length}, minmax(0, 1fr))` }}>
          {visibleSummaryCards.map((c, i) => (
            <SummaryCard
              key={c.key ?? c.field ?? i}
              label={resolveBilingualText(c.label, language)}
              value={formatSummary(summary, c)}
              color={c.color}
              labelFontSize={labelFs}
              valueFontSize={valueFs}
            />
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
            {dims.map(d => (
              <button
                key={d.key} type="button" onClick={() => changePrimaryTab(d.key)}
                style={{ fontSize: badgeFs }}
                className={cn('flex-shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 transition-colors',
                  primaryKey === d.key ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400')}
              >
                {resolveBilingualText(d.label, language)}
              </button>
            ))}
          </div>
          {showViewToggle && (
            <div className="flex flex-shrink-0 rounded-full bg-slate-100 dark:bg-neutral-800 p-0.5">
              {enabledViews.includes('list') && (
                <button type="button" onClick={() => setViewMode('list')}
                  className={cn('rounded-full p-1.5 transition-colors', viewMode === 'list' ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-400 dark:text-neutral-500')}>
                  <BarChart3 className="h-3.5 w-3.5" />
                </button>
              )}
              {enabledViews.includes('table') && (
                <button type="button" onClick={() => setViewMode('table')}
                  className={cn('rounded-full p-1.5 transition-colors', viewMode === 'table' ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-400 dark:text-neutral-500')}>
                  <TableIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {showScopeSubTab && (
          <SubTabs
            value={scopeKey || quickScopePills[0].value}
            onChange={setScopeKey}
            items={quickScopePills.map(p => ({
              key: p.value,
              label: p.value === cityPillValue && cityPillLabel ? cityPillLabel : resolveBilingualText(p.label, language),
            }))}
            fontSize={badgeFs}
            isMobileFlow={isMobileFlow}
          />
        )}

        {visibleSubTabs.length > 0 && (
          <SubTabs
            value={subTabKey ?? visibleSubTabs[0].key}
            onChange={setSubTabKey}
            items={visibleSubTabs.map(s => ({ key: s.key, label: resolveBilingualText(s.label, language) }))}
            fontSize={badgeFs}
            isMobileFlow={isMobileFlow}
          />
        )}
      </div>

      {showItemCount && (
        <div className="flex items-center justify-between">
          <span className={isMobileFlow ? 'flex-shrink-0 whitespace-nowrap text-slate-400 dark:text-neutral-500' : 'text-slate-400 dark:text-neutral-500'} style={{ fontSize: labelFs }}>{t('product_report.item_count', '{{count}} items', { count })}</span>
        </div>
      )}

      {(loading || stale) && view.length === 0 ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm">
              <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4" style={{ width: `${50 + ((i * 13) % 35)}%` }} />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-5 w-14 shrink-0" />
            </div>
          ))}
        </div>
      ) : view.length === 0 ? (
        <EmptyState />
      ) : viewMode === 'list' && cardLayout ? (
        <div ref={scrollRef} className="space-y-2 pr-0.5">
          {view.map((row, i) => (
            <ReportCard key={String(row[keyField] ?? i)} layout={cardLayout} row={row} language={language} hiddenFields={hiddenFields} onClick={() => onRowClick(row)} />
          ))}
        </div>
      ) : columns.length > 0 ? (
        <ReportTable columns={columns} rows={view} language={language} keyField={keyField} onRowClick={onRowClick} rowClickColumn={isPrimary ? undefined : 'label'} scrollRef={scrollRef} cellFontSize={cellFs} stickyHeader={stickyHeader}
          footerRow={totalRow} footerLabel={resolveBilingualText(cfg.totalRowLabel, language) || t('product_report.total', 'Total')}
          sort={sortOptions.length > 0 ? { fields: sortOptions.map(o => o.field).filter(Boolean), field: sortField, asc: sortAsc, onToggle: handleSortField } : undefined} />
      ) : (
        <EmptyState />
      )}

      {hasMore && (
        <div ref={sentinelRef} className="pt-0.5">
          <button
            type="button"
            onClick={() => loadMoreRef.current()}
            disabled={loading}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-2.5 text-slate-500 dark:text-neutral-400 shadow-sm transition-colors disabled:opacity-60"
            style={{ fontSize: labelFs }}
          >
            {loading ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-transparent dark:border-neutral-600 dark:border-t-transparent" />
                {t('product_report.loading_more', 'Loading…')}
              </>
            ) : (
              <>
                {t('product_report.load_more', 'Load more')}
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

function formatSummary(summary: Record<string, unknown> | undefined, c: SummaryCardConfig): string {
  if (!summary) return '—';
  return formatReportValue(summary[c.field], c.format, summary[c.currencyField ?? 'currency']);
}

const DOT_CLASS: Record<string, string> = {
  indigo: 'bg-indigo-400', emerald: 'bg-emerald-400', amber: 'bg-amber-400', rose: 'bg-rose-400', slate: 'bg-slate-400',
};

function SummaryCard({ label, value, color, labelFontSize, valueFontSize }: { label: string; value: string; color?: string; labelFontSize: number; valueFontSize: number }) {
  const dot = DOT_CLASS[color ?? 'indigo'] ?? DOT_CLASS.indigo;
  return (
    <div className="rounded-xl border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 shadow-sm">
      <div className="flex items-center gap-1 text-slate-500 dark:text-neutral-400" style={{ fontSize: labelFontSize }}>
        <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />{label}
      </div>
      <div className="mt-1.5 text-slate-900 dark:text-neutral-100" style={{ fontSize: valueFontSize, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function SubTabs({ value, onChange, items, fontSize, isMobileFlow }: { value: string; onChange: (v: string) => void; items: { key: string; label: string }[]; fontSize: number; isMobileFlow: boolean }) {
  // Narrow flow with >3 tabs: an equal flex-1 split squeezes labels unreadably narrow — scroll natural-width tabs instead.
  const scrollTabs = isMobileFlow && items.length > 3;
  return (
    <div
      className={cn('mt-2 flex gap-1 rounded-xl bg-slate-50 dark:bg-neutral-800/60 p-1', scrollTabs && 'overflow-x-auto')}
      style={scrollTabs ? { scrollbarWidth: 'none' } : undefined}
    >
      {items.map(s => (
        <button key={s.key} type="button" onClick={() => onChange(s.key)}
          style={{ fontSize }}
          className={cn(scrollTabs ? 'flex-none whitespace-nowrap px-3' : 'flex-1', 'rounded-lg py-1.5 transition-colors', value === s.key ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-neutral-400')}>
          {s.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation('renderers');
  return (
    <div className="rounded-2xl border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center shadow-sm">
      <div className="mb-2 text-3xl">🔍</div>
      <div className="text-sm text-slate-500 dark:text-neutral-400">{t('product_report.no_data', 'No data available')}</div>
    </div>
  );
}

/** Width constraints apply to any column (frozen or not); frozen only adds sticky positioning.
 *  Equal min/max (labelWidth override) also sets `width`: max-width alone is ignored by
 *  auto table layout on cells, so a fixed column needs the explicit width to actually pin. */
const colWidthStyle = (c: ReportColumn): React.CSSProperties | undefined =>
  c.minWidth != null || c.maxWidth != null
    ? {
        minWidth: c.minWidth,
        maxWidth: c.maxWidth,
        ...(c.minWidth != null && c.minWidth === c.maxWidth ? { width: c.minWidth } : {}),
      }
    : undefined;

function ReportTable({ columns, rows, language, keyField, onRowClick, rowClickColumn, scrollRef, cellFontSize, stickyHeader, sort, footerRow, footerLabel }: {
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  language: string;
  keyField: string;
  onRowClick: (row: Record<string, unknown>) => void;
  /** When set, only the cell of this dataIndex triggers onRowClick (dimension tabs: name column only). */
  rowClickColumn?: string;
  scrollRef?: React.Ref<HTMLDivElement>;
  cellFontSize: number;
  stickyHeader?: boolean;
  /** Column-header sorting: `fields` = sortable dataIndexes, `field`/`asc` = current sort. */
  sort?: { fields: string[]; field: string; asc: boolean; onToggle: (field: string) => void };
  /** Pinned footer total row (from a separate single-row datasource); label goes in the name column. */
  footerRow?: Record<string, unknown>;
  footerLabel?: string;
}) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  // Re-clone when the header content (columns/language/font/sort indicator) changes; row-width
  // drift is handled by the hook's ResizeObserver.
  const cloneKey = `${language}|${cellFontSize}|${columns.map(c => c.dataIndex).join(',')}|${sort?.field ?? ''}|${sort?.asc ?? ''}`;
  useStickyHeaderClone({ enabled: !!stickyHeader, overlayRef, cloneKey });
  return (
    <div className={cn('rounded-2xl border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm', stickyHeader ? 'overflow-visible' : 'overflow-hidden')}>
      {stickyHeader && <div ref={overlayRef} aria-hidden className="rounded-t-2xl" />}
      <div className="overflow-hidden rounded-2xl">
      <div ref={scrollRef} className="overflow-x-auto">
        <table className="w-full" style={{ fontSize: cellFontSize }}>
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-neutral-800">
            <tr>
              {columns.map((c, i) => {
                const sortable = !!sort && sort.fields.includes(c.dataIndex);
                const sortActive = sortable && sort!.field === c.dataIndex;
                return (
                  <th
                    key={i}
                    onClick={sortable ? () => sort!.onToggle(c.dataIndex) : undefined}
                    className={cn('whitespace-nowrap px-3 py-2.5 font-normal text-slate-500 dark:text-neutral-400', c.align === 'center' ? 'text-center' : c.align === 'left' ? 'text-left' : 'text-right', c.frozen && 'sticky left-0 z-20 bg-slate-50 dark:bg-neutral-800',
                      sortable && 'cursor-pointer select-none hover:text-slate-700 dark:hover:text-neutral-200', sortActive && 'text-indigo-600 dark:text-indigo-300')}
                    style={colWidthStyle(c)}
                  >
                    <span className="inline-flex items-center gap-0.5">
                      {resolveBilingualText(c.title, language)}
                      {sortActive ? (sort!.asc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={String(row[keyField] ?? ri)}
                onClick={rowClickColumn ? undefined : () => onRowClick(row)}
                className={cn('border-t border-slate-100 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800/60', !rowClickColumn && 'cursor-pointer')}
              >
                {columns.map((c, ci) => {
                  const cellClickable = rowClickColumn != null && c.dataIndex === rowClickColumn;
                  return (
                    <td
                      key={ci}
                      onClick={cellClickable ? () => onRowClick(row) : undefined}
                      className={cn('px-3 py-2.5', c.align === 'center' ? 'text-center' : c.align === 'left' ? 'text-left' : 'whitespace-nowrap text-right', c.frozen && 'sticky left-0 bg-white dark:bg-neutral-900', cellClickable && 'cursor-pointer')}
                      style={colWidthStyle(c)}
                    >
                      {renderReportCell(c, row, language)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {footerRow && (
            <tfoot className="sticky bottom-0 z-10">
              <tr className="border-t-2 border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 font-semibold">
                {columns.map((c, ci) => {
                  // The footer label sits in the name column (rowClickColumn on dimension tabs, else col 0).
                  const isLabelCell = rowClickColumn != null ? c.dataIndex === rowClickColumn : ci === 0;
                  return (
                    <td
                      key={ci}
                      className={cn('px-3 py-2.5', c.align === 'center' ? 'text-center' : c.align === 'left' ? 'text-left' : 'whitespace-nowrap text-right', c.frozen && 'sticky left-0 z-20 bg-slate-50 dark:bg-neutral-800')}
                      style={colWidthStyle(c)}
                    >
                      {isLabelCell ? (footerLabel ?? '') : renderReportCell(c, footerRow, language)}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      </div>
    </div>
  );
}

export default ProductReportRenderer;
