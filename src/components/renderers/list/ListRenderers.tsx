import React, { useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@genispace/shared-ui';
import { Button } from '@genispace/shared-ui';
import { Checkbox } from '@genispace/shared-ui';
import { toast } from '@genispace/shared-ui';
import { cn } from '@genispace/shared-utils';
import { RefreshCw, Download, ArrowUpDown, Search } from 'lucide-react';
import { applyCustomStyles } from '@/utils/styleUtils';
import { useTranslation } from 'react-i18next';
import { ActionFormDialog } from '@/ui/ActionFormDialog';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import type { ListColumn, ListPill, ListRendererProps } from '@/types/renderers';
import { useComponentCommunication } from '@/hooks/useComponentCommunication';
import type { TableAction } from '@/types';
import { renderListCellValue } from './listCellRender';
import { useListDataSource } from './useListDataSource';
import { useListActions } from './useListActions';
import {
  buildListColumnSlots,
  EMPTY_DEFAULT_SORT,
  isListActionVisible,
  resolveListActions,
  resolveRowClickAction,
} from './listConfig';
import { downloadListCsv, generateListCsv } from './listCsvExport';
import { useListSelectionEmit } from './useListSelectionEmit';
import { ListActionButton } from './ListActionButton';
import { ListTaskExecuteDialog } from './ListTaskExecuteDialog';
import {
  renderProductCardListItem,
  renderProgressTaskListItem,
  renderRankingListItem,
} from './listItemTemplates';
import { ViewToggleButton, type ViewType } from '../shared/ViewToggleButton';
import { isDataViewType, normalizeViewType } from './listViewToggleUtils';
import { ListDataTable } from './ListDataTable';
import { ParameterContext } from '@/contexts/ParameterContext';
import { useWorkbenchConfigLocale } from '@/contexts/WorkbenchConfigLocaleContext';
import { useMobileFlowLayout } from '@/mobile/mobileFlowLayoutContext';
import EChartsChartRenderer, {
  type EChartsChartRendererProps,
} from '../echarts/EChartsChartRenderer';
import { ListSkeleton, type ListSkeletonTemplate, skeletonItemCount } from '../../skeleton';
import { useGrid24FillCell } from '@/layout/grid24CellContext';

function getRowId(
  item: Record<string, unknown>,
  index: number,
  rowKey: string
): string | number {
  const id = item[rowKey];
  if (id !== undefined && id !== null) return id as string | number;
  return index;
}

const LIST_DOT_HEX: Record<string, string> = {
  'indigo-500': '#6366f1', 'emerald-500': '#10b981', 'violet-500': '#8b5cf6',
  'amber-500': '#f59e0b', 'rose-500': '#f43f5e', 'sky-500': '#0ea5e9',
};
const listDotHex = (c?: string): string => (c ? LIST_DOT_HEX[c] || c : '#6366f1');

/**
 * Per-role content font sizes (px). Raised from the old tiny Tailwind sizes for low-vision users;
 * each can be overridden via the PropertyEditor (FontSizeFieldsCard). Floor: 13px labels/captions.
 */
export interface ListFontSizes {
  /** list/section title */
  title: number;
  /** item value / number */
  value: number;
  /** subtitle / description / meta / secondary text */
  label: number;
  /** highlight/status badges, pills */
  badge: number;
}
export const DEFAULT_LIST_FONT_SIZES: ListFontSizes = { title: 16, value: 14, label: 13, badge: 12 };

/** Client-side search + quick-filter pill filtering (no-op when toolbar is absent). */
function filterListRows(
  rows: Record<string, unknown>[],
  toolbar: ListRendererProps['toolbar'],
  search: string,
  activePill?: ListPill
): Record<string, unknown>[] {
  if (!toolbar) return rows;
  let r = rows;
  // Skip client-side search when `searchParam` is set — the datasource already ILIKE-filtered server-side.
  if (!toolbar.searchParam && toolbar.search && search.trim()) {
    const q = search.trim().toLowerCase();
    const fields = toolbar.searchFields ?? ['label', 'label_zh', 'label_en', 'name', 'title'];
    r = r.filter((x) => fields.some((f) => String(x[f] ?? '').toLowerCase().includes(q)));
  }
  // Skip client-side pill filtering when `pillParam` is set — the datasource already filtered server-side.
  if (!toolbar.pillParam && activePill?.filter) {
    const { field, eq } = activePill.filter;
    r = r.filter((x) => String(x[field] ?? '') === String(eq));
  }
  return r;
}

export const ListRenderer: React.FC<ListRendererProps> = (props) => {
  const { t } = useTranslation(['renderers', 'common']);
  const fillCell = useGrid24FillCell();
  // Narrow-container flag (real mobile + studio phone frame); threaded into plain render helpers.
  const narrow = useMobileFlowLayout();
  const { localizeRows, resolveBilingualText } = useWorkbenchConfigLocale();
  const {
    dataSource = [],
    loading: externalLoading = false,
    itemLayout = 'horizontal',
    size = 'default',
    bordered = false,
    split = true,
    header,
    footer,
    title,
    pagination,
    pageSize: propsPageSize = 10,
    renderItem,
    className,
    useMockData = false,
    mockData = [],
    id,
    customStyles,
    columns = [],
    actions,
    rowActions: rowActionsProp = [],
    showRowActions = 'always',
    toolbarActions: toolbarActionsProp = [],
    showToolbar = false,
    showRefresh = true,
    selectionType = 'none',
    rowKey = 'id',
    selectedRowIds: controlledSelectedIds,
    onSelectionChange,
    databaseDataSourceConfig,
    enhancedDataSource: enhancedDataSourceProp,
    datasetConfig,
    parameterConfig,
    componentParameterConfig,
    pageParams,
    enableSort = false,
    defaultSort: defaultSortProp,
    enableExport = false,
    itemLayoutConfig,
    navigationItems,
    showDataView: showDataViewProp = false,
    chartViewProps: chartViewPropsProp,
    headerExtra,
    onParameterChange,
    componentId,
    toolbar,
    highlightRow,
    statusDots,
  } = props;

  // Per-role content font sizes (px). Not in the shared ListRendererProps type, so read off props
  // with readable defaults; each is applied via inline style on the matching content element.
  const fsProps = props as unknown as {
    titleFontSize?: number;
    valueFontSize?: number;
    labelFontSize?: number;
    badgeFontSize?: number;
  };
  const fs: ListFontSizes = {
    title: fsProps.titleFontSize ?? DEFAULT_LIST_FONT_SIZES.title,
    value: fsProps.valueFontSize ?? DEFAULT_LIST_FONT_SIZES.value,
    label: fsProps.labelFontSize ?? DEFAULT_LIST_FONT_SIZES.label,
    badge: fsProps.badgeFontSize ?? DEFAULT_LIST_FONT_SIZES.badge,
  };

  const legacyViewToggle = headerExtra?.viewToggle;
  const showDataViewEnabled = showDataViewProp === true || Boolean(legacyViewToggle);
  const chartViewProps = chartViewPropsProp ?? legacyViewToggle?.chartProps;
  const viewToggleBroadcastKey = legacyViewToggle?.broadcastParameter;

  const parameterContext = useContext(ParameterContext);
  const [viewType, setViewType] = useState<ViewType>(() => {
    if (!viewToggleBroadcastKey) return 'chart';
    const raw = parameterContext?.currentTabParams?.[viewToggleBroadcastKey];
    return normalizeViewType(raw ?? legacyViewToggle?.defaultValue ?? 'chart');
  });

  const isDataView = showDataViewEnabled && isDataViewType(viewType);
  const showEmbeddedChart =
    showDataViewEnabled && !isDataView && Boolean(chartViewProps);
  const initializedViewFromParams = useRef(false);

  useEffect(() => {
    if (!viewToggleBroadcastKey || initializedViewFromParams.current) return;
    const raw = parameterContext?.currentTabParams?.[viewToggleBroadcastKey];
    if (raw !== undefined && raw !== null && raw !== '') {
      setViewType(normalizeViewType(raw));
    }
    initializedViewFromParams.current = true;
  }, [viewToggleBroadcastKey, parameterContext?.currentTabParams]);

  const handleViewToggle = useCallback(() => {
    setViewType((prev) => {
      const next: ViewType = prev === 'chart' ? 'data' : 'chart';
      if (viewToggleBroadcastKey && onParameterChange) {
        onParameterChange(viewToggleBroadcastKey, next);
      }
      return next;
    });
  }, [viewToggleBroadcastKey, onParameterChange]);

  const enhancedDataSource = useMemo(() => {
    if (enhancedDataSourceProp) return enhancedDataSourceProp;
    if (datasetConfig?.datasetId) {
      return {
        type: 'dataset' as const,
        datasetId: datasetConfig.datasetId,
        params: datasetConfig.params ?? {},
      };
    }
    return null;
  }, [enhancedDataSourceProp, datasetConfig]);

  const { rowActions, toolbarActions, rowClickActions } = useMemo(
    () => resolveListActions(actions, rowActionsProp, toolbarActionsProp),
    [actions, rowActionsProp, toolbarActionsProp]
  );

  const rowClickAction = useMemo(
    () => resolveRowClickAction(itemLayoutConfig, rowClickActions),
    [itemLayoutConfig, rowClickActions]
  );

  const itemTemplate = itemLayoutConfig?.template ?? 'default';

  const [internalSelectedIds, setInternalSelectedIds] = useState<(string | number)[]>([]);
  const selectedRowIds = controlledSelectedIds ?? internalSelectedIds;

  const setSelectedRowIds = useCallback(
    (ids: (string | number)[]) => {
      if (controlledSelectedIds === undefined) {
        setInternalSelectedIds(ids);
      }
    },
    [controlledSelectedIds]
  );

  const defaultSort = defaultSortProp ?? EMPTY_DEFAULT_SORT;

  const paginationEnabled = Boolean(pagination);
  const pageSize =
    typeof pagination === 'object' && pagination.pageSize
      ? pagination.pageSize
      : propsPageSize;

  // Toolbar search / quick-filter pills (no-op unless `toolbar` configured).
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(toolbar?.pills?.[0]?.value ?? 'all');
  const activePill = toolbar?.pills?.find((p) => p.value === pill);
  // When `searchParam` is set, the search text filters server-side too — debounce keystrokes so the
  // datasource re-queries at most ~3×/s instead of per character.
  // IME guard: while the user is composing CJK text (pinyin → candidate picking), onChange fires with
  // intermediate values; compositionstart/end mark the exact "still typing" window, so the debounce
  // only starts counting after the text is committed. Enter skips the debounce and queries at once.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchComposing, setSearchComposing] = useState(false);
  useEffect(() => {
    if (!toolbar?.searchParam || searchComposing) return;
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search, searchComposing, toolbar?.searchParam]);
  // When `pillParam` is set, the selected pill filters server-side: its value is injected as a query
  // param so the datasource is re-queried, instead of filtering the loaded rows client-side.
  const pillAdditionalParams = useMemo(() => {
    const params: Record<string, unknown> = {};
    if (toolbar?.pillParam && activePill) params[toolbar.pillParam] = activePill.value;
    if (toolbar?.searchParam) params[toolbar.searchParam] = debouncedSearch;
    return Object.keys(params).length ? params : undefined;
  }, [toolbar?.pillParam, toolbar?.searchParam, activePill, debouncedSearch]);

  const {
    data: finalData,
    allData,
    loading: dataLoading,
    currentPage,
    setCurrentPage,
    pageSize: activePageSize,
    total,
    sortState,
    setSortState,
    refresh,
  } = useListDataSource({
    id,
    useMockData,
    mockData,
    externalDataSource: dataSource,
    externalLoading,
    databaseDataSourceConfig: databaseDataSourceConfig ?? null,
    enhancedDataSource: enhancedDataSource ?? null,
    parameterConfig,
    componentParameterConfig,
    pageParams,
    enableSort,
    defaultSort,
    pageSize,
    paginationEnabled,
    additionalParams: pillAdditionalParams,
  });

  const displayData = useMemo(
    () => filterListRows(localizeRows(finalData), toolbar, search, activePill),
    [finalData, localizeRows, toolbar, search, activePill]
  );
  const displayAllData = useMemo(
    () => filterListRows(localizeRows(allData), toolbar, search, activePill),
    [allData, localizeRows, toolbar, search, activePill]
  );

  // Row highlight: resolve the "current" value (static or live bus param).
  // forceTick re-renders when the param arrives/changes (the row datasource may ignore it,
  // so no refetch would otherwise re-render to pick up the new highlight value).
  const [, forceHighlightTick] = useReducer((x: number) => x + 1, 0);
  const { getCurrentParameter: getHighlightParam } = useComponentCommunication({
    componentId: `${id ?? 'list'}-hl`,
    listenParameters: highlightRow?.valueParam ? [highlightRow.valueParam] : [],
    onParameterChange: () => forceHighlightTick(),
    autoCleanup: true,
  });
  // Multi-value aware: multi-select filters emit an array of values; a static value or a
  // CSV string are also accepted. Empty / '__none__' entries are dropped.
  const rawHighlight = highlightRow
    ? (highlightRow.value ?? (highlightRow.valueParam ? getHighlightParam(highlightRow.valueParam) : ''))
    : '';
  const highlightValues = useMemo(
    () =>
      (Array.isArray(rawHighlight) ? rawHighlight.map(String) : String(rawHighlight ?? '').split(','))
        .map((v) => v.trim())
        .filter((v) => v !== '' && v !== '__none__'),
    [rawHighlight]
  );
  const isHighlightRow = useCallback(
    (row: Record<string, unknown>): boolean => {
      if (!highlightRow || highlightValues.length === 0) return false;
      if (highlightValues.includes(String(row[highlightRow.field] ?? ''))) return true;
      // memberField: CSV of group-member ids — a selected sub-store also lights up its rollup row.
      if (highlightRow.memberField) {
        const members = String(row[highlightRow.memberField] ?? '').split(',').map((m) => m.trim());
        return members.some((m) => highlightValues.includes(m));
      }
      return false;
    },
    [highlightRow, highlightValues]
  );

  const {
    executeAction,
    actionFormDialog,
    closeActionForm,
    confirmDialog,
    closeConfirm,
    submitActionForm,
    taskExecuteDialog,
    closeTaskExecute,
  } = useListActions({
    onRefresh: refresh,
    pageParams: (pageParams ?? {}) as Record<string, unknown>,
    navigationItems,
  });

  useListSelectionEmit({
    componentId: id,
    rowKey,
    selectionType,
    selectedRowIds,
    allData: displayAllData,
    parameterConfig,
    componentParameterConfig,
  });

  const loading = externalLoading || dataLoading;

  const customStyleProps = id
    ? applyCustomStyles(id, customStyles, className)
    : { className, style: {} };

  const visibleColumns = useMemo(
    () => (Array.isArray(columns) ? columns.filter((c) => !c.hidden && c.dataIndex) : []),
    [columns]
  );

  const slots = useMemo(() => buildListColumnSlots(visibleColumns), [visibleColumns]);

  const sortableFields = useMemo(
    () => visibleColumns.map((c) => c.dataIndex).filter(Boolean),
    [visibleColumns]
  );

  const getVisibleRowActions = useCallback(
    (record: Record<string, unknown>) =>
      rowActions.filter((action) => isListActionVisible(action, record)),
    [rowActions]
  );

  const applySelection = useCallback(
    (next: (string | number)[]) => {
      setSelectedRowIds(next);
      const selectedRows = displayAllData.filter((row, idx) =>
        next.some((id) => String(id) === String(getRowId(row, idx, rowKey)))
      );
      onSelectionChange?.(next, selectedRows);
    },
    [setSelectedRowIds, displayAllData, rowKey, onSelectionChange]
  );

  const toggleSelection = useCallback(
    (rowId: string | number) => {
      if (selectionType === 'none') return;
      const sid = String(rowId);
      const exists = selectedRowIds.some((x) => String(x) === sid);
      let next: (string | number)[];
      if (selectionType === 'single') {
        next = exists ? [] : [rowId];
      } else {
        next = exists
          ? selectedRowIds.filter((x) => String(x) !== sid)
          : [...selectedRowIds, rowId];
      }
      applySelection(next);
    },
    [selectionType, selectedRowIds, applySelection]
  );

  const handleItemRowClick = useCallback(
    (item: Record<string, unknown>, index: number) => {
      if (rowClickAction && isListActionVisible(rowClickAction, item)) {
        void executeAction(rowClickAction, item);
        return;
      }
      if (selectionType !== 'none') {
        toggleSelection(getRowId(item, index, rowKey));
      }
    },
    [rowClickAction, selectionType, executeAction, toggleSelection, rowKey]
  );

  const toggleSelectAll = useCallback(() => {
    if (selectionType !== 'multiple') return;
    const allIds = displayAllData.map((row, idx) => getRowId(row, idx, rowKey));
    const allSelected =
      allIds.length > 0 &&
      allIds.every((id) => selectedRowIds.some((x) => String(x) === String(id)));
    applySelection(allSelected ? [] : allIds);
  }, [selectionType, displayAllData, rowKey, selectedRowIds, applySelection]);

  const toggleSortField = useCallback(
    (field: string) => {
      if (!enableSort) return;
      setSortState((prev) => {
        const existing = prev.find((s) => s.field === field);
        if (!existing) return [{ field, direction: 'asc' }];
        if (existing.direction === 'asc') {
          return prev.map((s) => (s.field === field ? { ...s, direction: 'desc' as const } : s));
        }
        return prev.filter((s) => s.field !== field);
      });
      setCurrentPage(1);
    },
    [enableSort, setSortState, setCurrentPage]
  );

  const handleExport = useCallback(() => {
    if (!enableExport) {
      toast({
        variant: 'destructive',
        title: t('list.export_not_enabled', 'Export is not enabled'),
      });
      return;
    }
    if (displayAllData.length === 0) {
      toast({
        variant: 'destructive',
        title: t('list.cannot_export', 'Cannot export'),
        description: t('list.no_data', 'No data'),
      });
      return;
    }
    const csv = generateListCsv(displayAllData, visibleColumns);
    const stamp = new Date().toISOString().split('T')[0];
    downloadListCsv(csv, `list_export_${id ?? 'list'}_${stamp}.csv`);
    toast({ title: t('list.export_success', 'Export successful') });
  }, [enableExport, displayAllData, visibleColumns, id, t]);

  const getSizeClass = () => {
    switch (size) {
      case 'large':
        return 'p-6';
      case 'small':
        return 'p-2';
      default:
        return 'p-4';
    }
  };

  const cellContextFor = useCallback(
    (item: Record<string, unknown>, index: number) => ({
      index: paginationEnabled ? (currentPage - 1) * activePageSize + index : index,
      record: item,
      pageData: displayData,
      allData: displayAllData,
      highlighted: isHighlightRow(item),
    }),
    [displayData, displayAllData, paginationEnabled, currentPage, activePageSize, isHighlightRow]
  );

  const isDashboardTemplate =
    itemTemplate === 'ranking' ||
    itemTemplate === 'progress-task' ||
    itemTemplate === 'product-card';
  const effectiveShowRefresh =
    isDashboardTemplate && !showToolbar ? showRefresh === true : showRefresh !== false;
  const showToolbarButtons =
    showToolbar ||
    effectiveShowRefresh ||
    enableExport ||
    toolbarActions.length > 0 ||
    enableSort ||
    selectionType === 'multiple';
  const showViewToggle = showDataViewEnabled;
  const showHeader = Boolean(header || title || showToolbarButtons || showViewToggle);

  const renderRowActions = (item: Record<string, unknown>, placement: 'inline' | 'slot') => {
    const visible = getVisibleRowActions(item);
    if (visible.length === 0) return null;
    const showOnHover = showRowActions === 'hover' && placement === 'inline';
    return (
      <div
        className={cn(
          'flex shrink-0 gap-1',
          showOnHover && 'opacity-0 group-hover:opacity-100 transition-opacity'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {visible.map((action) => (
          <ListActionButton
            key={action.id}
            action={action}
            placement="row"
            onClick={(e) => {
              e.stopPropagation();
              void executeAction(action, item);
            }}
          />
        ))}
      </div>
    );
  };

  const renderConfiguredItem = (item: Record<string, unknown>, index: number) => {
    const rowId = getRowId(item, index, rowKey);
    const isSelected = selectedRowIds.some((x) => String(x) === String(rowId));
    const hasRowActions = rowActions.length > 0;
    const showActionsInline = hasRowActions && !slots.hasActionsSlot;
    const ctxCell = cellContextFor(item, index);

    const selectionCheckbox =
      selectionType !== 'none' ? (
        <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleSelection(rowId)}
          />
        </div>
      ) : null;

    const inlineActions =
      showActionsInline ? renderRowActions(item, 'inline') : null;

    const onRowClick =
      rowClickAction || selectionType !== 'none'
        ? () => handleItemRowClick(item, index)
        : undefined;

    const highlighted = isHighlightRow(item);
    const dotEls = (statusDots ?? [])
      .filter((d) => {
        // A dot whose field backs a quick-filter pill is that pill category's legend extension:
        // when the pill has no color dot configured there is no legend on screen, so an
        // unexplained row dot is just noise — hide it. Dots without a matching pill (standalone
        // semantics) keep their own behavior.
        const pill = toolbar?.pills?.find((p) => p.filter?.field === d.field);
        if (pill && !pill.color) return false;
        return d.eq === undefined ? Boolean(item[d.field]) : String(item[d.field] ?? '') === String(d.eq);
      })
      .map((d, i) => {
        const pill = toolbar?.pills?.find((p) => p.filter?.field === d.field);
        return (
          <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: listDotHex(d.color ?? pill?.color) }} />
        );
      });
    const statusDotsNode = dotEls.length ? <span className="flex shrink-0 items-center gap-1">{dotEls}</span> : null;
    const highlightBadgeNode =
      highlighted && highlightRow?.badge != null ? (
        <span
          className="flex-shrink-0 rounded-full bg-indigo-100 px-1.5 py-0.5 text-indigo-600"
          style={{ fontSize: fs.badge }}
        >
          {resolveBilingualText(highlightRow.badge)}
        </span>
      ) : null;

    if (itemTemplate === 'ranking') {
      return renderRankingListItem({
        item,
        index,
        rowId,
        slots,
        itemLayoutConfig,
        split,
        isSelected,
        pageData: displayData,
        allData: displayAllData,
        selectionCheckbox,
        rowActions: inlineActions,
        onRowClick,
        highlighted,
        statusDots: statusDotsNode,
        highlightBadge: highlightBadgeNode,
        fontSizes: fs,
        narrow,
      });
    }

    if (itemTemplate === 'progress-task') {
      return renderProgressTaskListItem({
        item,
        index,
        rowId,
        slots,
        itemLayoutConfig,
        split,
        isSelected,
        pageData: displayData,
        allData: displayAllData,
        rowActions: inlineActions,
        onRowClick,
        fontSizes: fs,
        narrow,
      });
    }

    if (itemTemplate === 'product-card') {
      return renderProductCardListItem({
        item,
        index,
        rowId,
        slots,
        itemLayoutConfig,
        split,
        isSelected,
        pageData: displayData,
        allData: displayAllData,
        selectionCheckbox,
        rowActions: inlineActions,
        onRowClick,
        fontSizes: fs,
        narrow,
      });
    }

    return (
      <div
        key={String(rowId)}
        className={cn(
          'list-renderer-item flex gap-3',
          itemLayout === 'horizontal' ? 'flex-row items-start' : 'flex-col',
          split && 'border-b border-border last:border-b-0',
          showActionsInline && showRowActions === 'hover' && 'group',
          isSelected && 'bg-muted/40',
          onRowClick && 'cursor-pointer',
          getSizeClass()
        )}
        onClick={onRowClick}
        role={onRowClick ? 'button' : undefined}
      >
        {selectionCheckbox}
        {(slots.avatar || slots.icon) && (
          <div className="shrink-0">
            {slots.avatar && renderListCellValue(slots.avatar, item, ctxCell)}
            {!slots.avatar && slots.icon && renderListCellValue(slots.icon, item, ctxCell)}
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-1">
          {slots.title && (
            <div className="font-medium text-foreground" style={{ fontSize: fs.title }}>
              {renderListCellValue(slots.title, item, ctxCell)}
            </div>
          )}
          {slots.subtitle && (
            <div className="text-muted-foreground" style={{ fontSize: fs.label }}>
              {renderListCellValue(slots.subtitle, item, ctxCell)}
            </div>
          )}
          {slots.description && (
            <div className="text-muted-foreground" style={{ fontSize: fs.label }}>
              {renderListCellValue(slots.description, item, ctxCell)}
            </div>
          )}
          {slots.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {slots.tags.map((col) => (
                <span key={col.dataIndex}>{renderListCellValue(col, item, ctxCell)}</span>
              ))}
            </div>
          )}
          {slots.custom.map((col: ListColumn) => (
            <div key={col.dataIndex} style={{ fontSize: fs.label }}>
              {col.title && col.showLabel !== false && (
                <span className="text-muted-foreground mr-1">{col.title}:</span>
              )}
              {renderListCellValue(col, item, ctxCell)}
            </div>
          ))}
          {!slots.title &&
            !slots.subtitle &&
            !slots.description &&
            visibleColumns.length === 0 && (
              <div className="text-foreground" style={{ fontSize: fs.title }}>
                {String(item.title ?? item.name ?? JSON.stringify(item))}
              </div>
            )}
          {/* Narrow: actions get their own line below the content instead of squeezing the flex row. */}
          {narrow && inlineActions && (
            <div className="flex justify-end mt-2" onClick={(e) => e.stopPropagation()}>
              {inlineActions}
            </div>
          )}
        </div>
        {!narrow && inlineActions}
        {slots.hasActionsSlot && renderRowActions(item, 'slot')}
      </div>
    );
  };

  const renderListItem = (item: Record<string, unknown>, index: number) => {
    if (renderItem) {
      return (
        <div key={index} className="list-renderer-item">
          <div className="item-content">{renderItem(item, index)}</div>
        </div>
      );
    }
    if (visibleColumns.length > 0) {
      return renderConfiguredItem(item, index);
    }
    return (
      <div
        key={index}
        className={cn(
          'list-renderer-item flex items-center',
          itemLayout === 'horizontal' ? 'flex-row' : 'flex-col',
          split && 'border-b last:border-b-0',
          getSizeClass()
        )}
      >
        <div className="item-content">
          <div className="item-title font-medium" style={{ fontSize: fs.title }}>
            {String(item.title ?? item.name ?? JSON.stringify(item))}
          </div>
          {item.description != null && (
            <div className="item-description text-muted-foreground mt-1" style={{ fontSize: fs.label }}>
              {String(item.description)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const headerNode =
    header ??
    (title ? (
      <CardTitle
        className={cn('list-title', isDashboardTemplate && 'font-semibold')}
        style={{ fontSize: fs.title }}
      >
        {title}
      </CardTitle>
    ) : null);

  const totalPages = Math.max(1, Math.ceil(total / activePageSize));

  if (loading) {
    return (
      <ListSkeleton
        template={itemTemplate as ListSkeletonTemplate}
        count={skeletonItemCount(activePageSize)}
        showHeader={showHeader}
        title={title}
        split={split}
        bordered={bordered || isDashboardTemplate}
        rounded={isDashboardTemplate}
        sizeClassName={getSizeClass()}
        className={customStyleProps.className}
        style={customStyleProps.style}
      />
    );
  }

  return (
    <>
      <Card
        className={cn(
          'list-renderer',
          fillCell && 'h-full flex flex-col min-h-0',
          bordered || isDashboardTemplate ? 'border shadow-sm' : 'border-0',
          isDashboardTemplate && 'rounded-xl',
          customStyleProps.className
        )}
        style={customStyleProps.style}
      >
        {showHeader && (
          <CardHeader
            className={cn(
              'list-header flex flex-col gap-2',
              fillCell && 'shrink-0',
              isDashboardTemplate ? 'px-4 py-3' : 'py-3'
            )}
          >
            <div className="flex flex-row items-center justify-between w-full gap-2 flex-wrap">
              {headerNode && (
                <div className="min-w-0">
                  {headerNode}
                </div>
              )}
              {(showToolbarButtons || showViewToggle) && (
                <div className="chart-toolbar flex items-center gap-2 min-h-[32px] shrink-0 ml-auto flex-wrap justify-end">
                  {selectionType === 'multiple' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={toggleSelectAll}
                    >
                      {t('list.select_all', 'Select all')}
                    </Button>
                  )}
                  {toolbarActions.map((action) => (
                    <ListActionButton
                      key={action.id}
                      action={action}
                      placement="toolbar"
                      onClick={(e) => {
                        e.stopPropagation();
                        void executeAction(action, {});
                      }}
                    />
                  ))}
                  {enableExport && (
                    <Button type="button" size="sm" variant="outline" onClick={handleExport}>
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                  {effectiveShowRefresh && (
                    <Button type="button" size="sm" variant="outline" onClick={() => refresh()}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  )}
                  {showViewToggle && (
                    <ViewToggleButton viewType={viewType} onToggle={handleViewToggle} />
                  )}
                </div>
              )}
            </div>
            {enableSort && sortableFields.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center">
                <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground mr-1" />
                {sortableFields.map((field) => {
                  const active = sortState.find((s) => s.field === field);
                  return (
                    <Button
                      key={field}
                      type="button"
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      className="h-7 text-xs"
                      onClick={() => toggleSortField(field)}
                    >
                      {field}
                      {active ? (active.direction === 'asc' ? ' ↑' : ' ↓') : ''}
                    </Button>
                  );
                })}
              </div>
            )}
          </CardHeader>
        )}
        <CardContent className={cn('list-content p-0', fillCell && 'flex-1 min-h-0 overflow-y-auto')}>
          {toolbar && (toolbar.search || (toolbar.pills?.length ?? 0) > 0) && (
            <div className="space-y-2 px-3 pb-2 pt-3">
              {toolbar.search && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-neutral-800 px-3 py-1.5">
                  <Search className="h-4 w-4 flex-shrink-0 text-slate-400 dark:text-neutral-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onCompositionStart={() => setSearchComposing(true)}
                    onCompositionEnd={(e) => {
                      // Chrome fires compositionend after the final input event, Safari before it —
                      // syncing search here covers both orders.
                      setSearchComposing(false);
                      setSearch(e.currentTarget.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && toolbar?.searchParam && !searchComposing) {
                        setDebouncedSearch(search.trim());
                      }
                    }}
                    placeholder={t('list.search', 'Search')}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-neutral-500"
                  />
                </div>
              )}
              {(toolbar.pills?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {toolbar.pills!.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPill(p.value)}
                      style={{ fontSize: fs.badge }}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 transition-colors',
                        pill === p.value
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800'
                      )}
                    >
                      {p.color && <span className="h-1.5 w-1.5 rounded-full" style={{ background: listDotHex(p.color) }} />}
                      {resolveBilingualText(p.label)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {isDataView ? (
            displayData.length === 0 ? (
              <div className="empty-state text-center py-12 text-muted-foreground">
                <div className="text-4xl mb-2">📝</div>
                <p className="text-sm">{t('list.no_data', 'No data')}</p>
              </div>
            ) : (
              <ListDataTable
                columns={visibleColumns}
                data={displayData}
                allData={displayAllData}
              />
            )
          ) : showEmbeddedChart ? (
            <div className="px-2 pb-3 pt-1">
              <EChartsChartRenderer
                {...(chartViewProps as Partial<EChartsChartRendererProps>)}
                chartType={
                  (chartViewProps?.chartType as EChartsChartRendererProps['chartType']) ||
                  'line'
                }
                data={displayAllData}
                useMockData={useMockData}
                mockData={mockData}
                embedded
                componentId={componentId ?? id}
              />
            </div>
          ) : displayData.length === 0 ? (
            <div className="empty-state text-center py-12 text-muted-foreground">
              <div className="text-4xl mb-2">📝</div>
              <p className="text-sm">{t('list.no_data', 'No data')}</p>
              <p className="text-xs mt-1">{t('list.no_items', 'No items in the list')}</p>
            </div>
          ) : (
            displayData.map((item, index) => renderListItem(item, index))
          )}
        </CardContent>
        {paginationEnabled && total > activePageSize && (
          <CardFooter className={cn('flex justify-between items-center py-2 px-4 border-t', fillCell && 'shrink-0')}>
            <span className="text-xs text-muted-foreground">
              {t('list.pagination_total', '{{total}} items', { total })}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                {t('common:prev', 'Prev')}
              </Button>
              <span className="text-xs self-center">
                {currentPage} / {totalPages}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                {t('common:next', 'Next')}
              </Button>
            </div>
          </CardFooter>
        )}
        {footer && <CardFooter className="list-footer">{footer}</CardFooter>}
      </Card>

      <ActionFormDialog
        isOpen={actionFormDialog.isOpen}
        action={actionFormDialog.action}
        record={actionFormDialog.record}
        onClose={closeActionForm}
        onSubmit={(formValues) => submitActionForm(formValues)}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={t('list.confirm_title', 'Confirm')}
        message={confirmDialog.message}
        onConfirm={() => confirmDialog.onConfirm?.()}
        onClose={closeConfirm}
      />

      <ListTaskExecuteDialog
        dialog={taskExecuteDialog}
        pageParams={(pageParams ?? {}) as Record<string, unknown>}
        onClose={closeTaskExecute}
        onRefresh={refresh}
      />
    </>
  );
};
