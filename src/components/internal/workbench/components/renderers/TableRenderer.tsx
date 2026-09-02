import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMobileViewport } from '@/hooks/useMobileViewport';
import { useGrid24FillCell } from '@/components/grid24CellContext';
import { useMobileFlowLayout } from '@/components/mobileFlowLayoutContext';
import { useStickyHeaderClone } from './shared/useStickyHeaderClone';
import { TableEmptyStateWithChromeInsets } from './shared/TableEmptyStateWithChromeInsets';
import i18n from 'i18next';
import { processInsertDataWithAutoId } from '@/utils/autoIdUtils';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableFooter, 
  TableHead, 
  TableRow, 
  TableCell 
} from '@/components/ui/table';
import { Button, MODAL_DIMENSIONS, ScrollArea, Checkbox } from '@genispace/shared-ui';
import { Input } from '@genispace/shared-ui';
import { Textarea } from '@genispace/shared-ui';
import { TagInput } from '@/components/ui/tag-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  RefreshCw, 
  Settings, 
  Filter,
  Edit,
  Trash2,
  Download,
  ArrowUp,
  ArrowDown,
  Loader2
} from 'lucide-react';
import { queryDatasetData, insertDatasetData, updateDatasetData, deleteDatasetData, updateDatabaseData, insertDatabaseData, deleteDatabaseData, transactionDatabaseData, withDatasourceVersion } from '@/app/services/workbenchApi';
import { resolveRuntimeDatasourceVersion } from '@/utils/datasourceVersion';
import { buildDatabaseUpdateData, buildDatabaseUpdateConditions } from '@/utils/dataConfigUtils';
import {
  ON_GLOBAL_ACTION_SUCCESS_BASE,
  ON_ROW_ACTION_SUCCESS_BASE,
  globalActionSuccessTriggerKey,
  rowActionSuccessTriggerKey,
} from '@/config/componentTriggers';
import { renderLucideIcon } from '@/utils/iconUtils';
import type { TableColumnType } from '@/types/renderers';
import { getFilterPanelGridClassName } from './tableFilterPanelGridClass';
import type { TableAction } from '../../types';
import apiClient from '@/lib/api/apiClient';
import { getDictionaryCellPresentation } from './editableTableDictionary';
import {
  getTableActionButtonExtraClassName,
  getTableActionButtonLayoutClassName,
  getTableActionButtonSize,
  getTableActionButtonVariant,
} from '@/utils/tableActionButtonRender';

const renderIcon = (iconName?: string) => {
  return renderLucideIcon(iconName || '', "w-4 h-4");
};

const getSkeletonBarWidthPercent = (rowIndex: number, colIndex: number): number =>
  62 + ((rowIndex * 31 + colIndex * 17) % 28);

// Text color map used by Custom render (key = color name / CSS color, value = tailwind class)
const customColorMap: Record<string, string> = {
  green: 'text-green-600 dark:text-green-400',
  blue:  'text-primary dark:text-primary',
  red:   'text-red-600 dark:text-red-400',
  gold:  'text-amber-600 dark:text-amber-400',
  orange:'text-orange-600 dark:text-orange-400',
  gray:  'text-neutral-500 dark:text-neutral-400',
};

const estimateRowActionButtonWidth = (action: TableAction): number => {
  const hasActionIcon = Boolean(action.icon && action.icon.trim() !== '');
  const hasLabel = Boolean(action.label && action.label.trim() !== '');
  if (!hasLabel && !hasActionIcon) return 0;
  const label = hasLabel ? action.label.trim() : '';
  const labelW = label
    ? [...label].reduce((sum, ch) => sum + (ch.codePointAt(0)! > 0x7f ? 12 : 7), 0)
    : 0;
  const ICON_BTN = 36;
  if (hasActionIcon && hasLabel) {
    return Math.max(16 + 6 + labelW + 24, ICON_BTN);
  }
  if (hasActionIcon && !hasLabel) {
    return ICON_BTN;
  }
  return Math.max(labelW + 28, 52);
};

const ACTIONS_COLUMN_GAP_PX = 8;

const estimateActionsColumnMinWidthPx = (
  rowActions: TableAction[],
  editable: boolean,
  deletable: boolean,
  actionsHeaderLabel: string
): number => {
  let total = 0;
  let count = 0;
  const add = (w: number) => {
    if (w <= 0) return;
    if (count > 0) total += ACTIONS_COLUMN_GAP_PX;
    total += w;
    count += 1;
  };
  for (const action of rowActions) {
    add(estimateRowActionButtonWidth(action));
  }
  if (editable) add(36);
  if (deletable) add(36);
  const headerW =
    (actionsHeaderLabel
      ? [...actionsHeaderLabel].reduce(
          (sum, ch) => sum + (ch.codePointAt(0)! > 0x7f ? 12 : 8),
          0
        )
      : 0) + 16;
  return Math.ceil(Math.max(total, headerW, 48));
};

import { toast } from '@genispace/shared-ui';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious, 
  PaginationEllipsis 
} from '@/components/ui/pagination';
import { Card, CardHeader, CardTitle, CardContent } from '@genispace/shared-ui';
import { cn } from '@genispace/shared-utils';
import Loading from '../Loading';
import { Skeleton } from '../skeleton';
import { renderSwCell, type SwCellProps, type SwCellType } from './cells/swCells';
import { useBoundRows } from './data/useBoundRows';
import { Label } from '@genispace/shared-ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect, type MultiSelectOption } from '@genispace/shared-ui';

import { useParameterHandler, buildDataSourceFilters, buildFilterString as buildParameterFilterString } from '../../hooks/useParameterHandler';
import { useEnhancedDataSource } from '../../hooks/useEnhancedDataSource';
import { useDatabaseDataSource } from '../../hooks/useDatabaseDataSource';
import { useWaitForParameters } from '../../hooks/useWaitForParameters';
import { useComponentCommunication } from '../../hooks/useComponentCommunication';
import { useParameterContext } from '../../contexts/ParameterContext';
import { TableRendererProps, TableDataType } from '../../types/renderers';
import { ParameterRecord, ParameterValue } from '../../types/parameters';
import { ParameterUtils } from '@/utils/parameterUtils';
import { buildWorkbenchPagePath } from '@/utils/workbenchPathUtils';
import { mobilePushNavigate } from '@/mobile/utils/mobileNavigationStore';
import { applyCustomStyles } from '@/utils/styleUtils';
import { evaluateFormActionVisibility } from '@/utils/formActionVisibility';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ActionFormDialog } from '@/components/ui/ActionFormDialog';
import { RecordDetailDialog } from '@/components/ui/RecordDetailDialog';
import TaskInputRenderer, { type TaskInputRendererHandle } from '@/components/renderers/TaskInputRenderer';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { getSystemParameterValue } from '@/utils/systemParameters';
import { evaluateComputedExpression } from '@/utils/expressionUtils';

const formatDateValue = (value: unknown, format: 'yyyy-MM-dd' | 'yyyy-MM-dd HH:mm:ss' = 'yyyy-MM-dd HH:mm:ss'): string => {

  if (value === null || value === undefined || value === '') return '';

  try {
    let date: Date;

    if (typeof value === 'string') {

      if (/^\d+$/.test(value)) {
        const timestamp = parseInt(value, 10);

        date = new Date(timestamp < 1e10 ? timestamp * 1000 : timestamp);
      } else {
        date = new Date(value);
      }
    } else if (typeof value === 'number') {

      date = new Date(value < 1e10 ? value * 1000 : value);
    } else if (value instanceof Date) {
      date = value;
    } else {

      date = new Date(String(value));
    }

    if (isNaN(date.getTime())) {
      return String(value);
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    if (format === 'yyyy-MM-dd') {
      return `${year}-${month}-${day}`;
    } else {

      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
  } catch (error) {
    console.warn('Date formatting error:', error);
    return String(value);
  }
};

const getSwitchState = (value: unknown): boolean => {

  if (value === 1 || value === '1') {
    return true;
  }

  return false;
};

const formatCellValue = (value: any): string => {

  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return String(value);
  }

  if (typeof value === 'string') {
    return value;
  }

  return String(value);
};

class CSVFormatter {

  static formatValue(value: unknown, column: TableColumnType): string {
    if (value === null || value === undefined) {
      return '';
    }

    const isIdField = column.dataIndex.toLowerCase() === 'id' || 
                     column.dataIndex.toLowerCase().endsWith('_id') ||
                     column.dataIndex.toLowerCase().endsWith('id');

    if (isIdField) {

      return CSVFormatter.escapeCSVValue(String(value));
    }

    switch (column.fieldType) {
      case 'DATE':

        let dateFormat: 'yyyy-MM-dd' | 'yyyy-MM-dd HH:mm:ss' = 'yyyy-MM-dd HH:mm:ss';
        if (column.render?.type === 'yyyy-MM-dd') {
          dateFormat = 'yyyy-MM-dd';
        } else if (column.render?.type === 'yyyy-MM-dd HH:mm:ss') {
          dateFormat = 'yyyy-MM-dd HH:mm:ss';
        }
        return CSVFormatter.formatDate(value, dateFormat);

      case 'INT8':
      case 'INT16':
      case 'INT32':
      case 'INT64':
      case 'FLOAT':
      case 'DOUBLE':
        return CSVFormatter.formatNumber(value);

      case 'BOOL':
      case 'SWITCH':
        return CSVFormatter.formatBoolean(value);

      case 'JSON':
      case 'ARRAY':
        return CSVFormatter.formatJSON(value);

      default:
        return CSVFormatter.escapeCSVValue(String(value));
    }
  }

  private static formatDate(value: unknown, format?: 'yyyy-MM-dd' | 'yyyy-MM-dd HH:mm:ss'): string {

    return CSVFormatter.escapeCSVValue(formatDateValue(value, format || 'yyyy-MM-dd HH:mm:ss'));
  }

  private static formatNumber(value: unknown): string {
    const num = Number(value);
    if (isNaN(num)) {
      return String(value);
    }

    return num.toString();
  }

  private static formatBoolean(value: unknown): string {
    const boolValue = Boolean(value);
    return boolValue ? i18n.t('table.yes', 'Yes') : i18n.t('table.no', 'No');
  }

  private static formatJSON(value: unknown): string {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private static escapeCSVValue(value: string): string {

    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  static generateCSV(data: TableDataType[], columns: TableColumnType[], includeHeaders: boolean = true): string {

    const lines: string[] = [];

    if (data.length === 0) {
      console.warn('[CSVFormatter] No data, but still generating headers');
      if (includeHeaders) {
        const visibleColumns = columns.filter(col => !col.hidden);
        const headers = visibleColumns.map(col => 
          CSVFormatter.escapeCSVValue(col.title || col.dataIndex)
        );
        lines.push(headers.join(','));
      }
      return lines.join('\n');
    }

    const dataFields = Object.keys(data[0]);

    const exportColumns = columns.filter(col => !col.hidden);

    exportColumns.forEach(col => {
      const hasField = dataFields.includes(col.dataIndex);
      if (!hasField) {
        console.warn(`[CSVFormatter] Warning: Column "${col.title || col.dataIndex}" with dataIndex "${col.dataIndex}" does not exist in data, will export empty value`);
      }
    });

    if (includeHeaders) {
      const headers = exportColumns.map(col => 
        CSVFormatter.escapeCSVValue(col.title || col.dataIndex)
      );
      lines.push(headers.join(','));
    }

    data.forEach((row, index) => {
      const values = exportColumns.map(col => {
        const value = row[col.dataIndex]; 
        const formattedValue = CSVFormatter.formatValue(value, col);

        if (index < 3) {
          const isIdField = col.dataIndex.toLowerCase() === 'id' || 
                           col.dataIndex.toLowerCase().endsWith('_id') ||
                           col.dataIndex.toLowerCase().endsWith('id');
        }

        return formattedValue;
      });
      lines.push(values.join(','));
    });

    const csvContent = lines.join('\n');

    return csvContent;
  }

  static downloadCSV(csvContent: string, filename: string) {
    const BOM = '\uFEFF'; // Add BOM to support Chinese characters
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }
}

// Define pagination type for reuse
type PaginationType = {
  total: number;
  limit: number;
  offset: number;
  current_page: number;
  total_pages: number;
  has_more: boolean;
};

// Update the DataSourceParams interface to include outputFields
interface DataSourceParams {
  limit?: number;
  offset?: number;
  outputFields?: string[];
  [key: string]: unknown;
}

// Define a type for JSON preview data
type JsonPreviewDataType = {
  open: boolean;
  data: unknown;
};

const TableRenderer: React.FC<TableRendererProps> = ({
  columns,
  dataSource,
  loading = false,
  rowKey = 'id',
  showTotal = false,
  className,
  title,
  showRefresh = false,
  showSettings = false,
  showToolbar = false,
  addable = false,
  editable = false,
  deletable = false,
  enableExport = false,
  onDataSourceChange,
  pagination,
  datasetConfig,
  enhancedDataSource,
  databaseDataSourceConfig,
  summaryDataSourceConfig,
  summaryLabel,
  useMockData = false,
  mockData = [],
  parameterConfig,
  componentParameterConfig,
  actions,
  recordInteraction,
  pageParams = {} as ParameterRecord,
  availableParameters: _availableParameters = [], 
  id,
  customStyles,
  onRowClick,
  skipDefaultRowSelection = false,
  onRowFocusOut,
  editingRowId,
  onCellClick,
  rowDisplayPatches,
  filterPanelGridColumns,
  applyFilterButtonPlacement = 'filter_panel_footer',
  rowStriped = false,
  tableStyle,
  ...restProps
}) => {
  const fillCell = useGrid24FillCell();
  const isNarrowFlow = useMobileFlowLayout();
  const headerMuted = tableStyle?.headerVariant === 'muted';
  // recordInteraction owns editing when configured. Keep the legacy inline
  // edit path for old tables, but do not render two competing edit controls.
  const showLegacyEdit = editable && !recordInteraction?.edit?.enabled;

  // Per-role content font sizes (poor-eyesight support). Configured in TablePropertyEditor.
  // These props are passed through component.props and are not part of the shared
  // TableRendererProps type, so read them off the rest object. 13px floor everywhere.
  const __fontSizeProps = restProps as {
    titleFontSize?: number;
    headerFontSize?: number;
    cellFontSize?: number;
  };
  const FONT_FLOOR = 13;
  const titleFontSize = Math.max(__fontSizeProps.titleFontSize ?? 20, FONT_FLOOR);
  const headerFontSize = Math.max(__fontSizeProps.headerFontSize ?? 13, FONT_FLOOR);
  const cellFontSize = Math.max(__fontSizeProps.cellFontSize ?? 13, FONT_FLOOR);

  const navigate = useNavigate();
  const location = useLocation();
  const { workbenchId } = useParams();

  // Forward reference for fetchDataFromApi function
  const fetchDataFromApiRef = useRef<() => Promise<void>>();
  const { currentUser } = useCurrentUser();
  const { t, i18n } = useTranslation(['renderers', 'common']);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const initialLoadTriggeredByParamRef = useRef(false);

  const hasCompletedInitialLoadRef = useRef(false);

  const loadFailureCountRef = useRef(0);
  const MAX_LOAD_FAILURES = 5;
  const isLoadDisabledRef = useRef(false);

  const lastLoadConfigKeyRef = useRef<string>('');
  const selectedRowRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [sqlQueryState, setSqlQueryState] = useState<'pending' | 'ready' | 'not-needed'>('pending');
  const [fetchedSqlQuery, setFetchedSqlQuery] = useState<string | null>(null);

  useEffect(() => {
    const fetchSqlQuery = async () => {

      if (databaseDataSourceConfig?.datasourceId) {
        setSqlQueryState('pending');
        try {

          const timestamp = Date.now();
          const response = await apiClient.get<{
            id: string;
            sqlStatement?: string;
            sqlQuery?: string;
            [key: string]: any;
          }>(withDatasourceVersion(
            `/datasources/${databaseDataSourceConfig.datasourceId}`,
            resolveRuntimeDatasourceVersion(databaseDataSourceConfig.datasourceId, databaseDataSourceConfig.version)
          ), {
            params: { _t: timestamp }
          });

          if (response.success && response.data) {
            const sqlStatement = response.data.sqlStatement || response.data.sqlQuery;
            if (sqlStatement) {
              const configSql = databaseDataSourceConfig?.sqlQuery;
              const isDifferent = configSql && configSql !== sqlStatement;

              if (isDifferent) {
                console.warn('[TableRenderer]  配置中的 SQL 与后端不一致，使用后端最新版本:', {
                  configSqlLength: configSql.length,
                  backendSqlLength: sqlStatement.length,
                  configSqlPreview: configSql.substring(0, 100),
                  backendSqlPreview: sqlStatement.substring(0, 100)
                });
              }

              setFetchedSqlQuery(sqlStatement);
              setSqlQueryState('ready');
            } else {

              if (databaseDataSourceConfig?.sqlQuery) {
                setFetchedSqlQuery(null);
                setSqlQueryState('ready');
              } else {
                setSqlQueryState('not-needed');
              }
            }
          } else {

            if (databaseDataSourceConfig?.sqlQuery) {
              console.warn('[TableRenderer] 后端获取 SQL 失败，使用配置中的 SQL');
              setFetchedSqlQuery(null);
              setSqlQueryState('ready');
            } else {
              setSqlQueryState('not-needed');
            }
          }
        } catch (error) {
          console.error('[TableRenderer] 获取 SQL 失败:', error);

          if (databaseDataSourceConfig?.sqlQuery) {
            console.warn('[TableRenderer] 后端获取 SQL 异常，使用配置中的 SQL');
            setFetchedSqlQuery(null);
            setSqlQueryState('ready');
          } else {
            setFetchedSqlQuery(null);
            setSqlQueryState('not-needed'); 
          }
        }
      } else {
        setFetchedSqlQuery(null);
        setSqlQueryState('not-needed');
      }
    };

    fetchSqlQuery();
  }, [databaseDataSourceConfig?.datasourceId, databaseDataSourceConfig?.sqlQuery]);

  const [filterValues, setFilterValues] = useState<Record<string, string[]>>({});
  const [databaseFilterExpression, setDatabaseFilterExpression] = useState<string>('');

  const [sortState, setSortState] = useState<Map<string, 'asc' | 'desc'>>(new Map());
  const [data, setData] = useState<TableDataType[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<TableDataType | null>(null);

  // Narrow flow + freezeFirstColumn on: clone the header so it pins below the FilterPanel on scroll.
  const { isMobile: isMobileViewport } = useMobileViewport();
  const freezeFirstColumn = !!(restProps as { freezeFirstColumn?: boolean }).freezeFirstColumn;
  const stickyHeaderOn = isNarrowFlow && freezeFirstColumn;
  const stickyOverlayRef = useRef<HTMLDivElement>(null);
  const stickyCloneKey = `${i18n.language}|${headerFontSize}|${[...sortState.entries()].map(([k, v]) => `${k}:${v}`).join(',')}|${columns.length}`;
  useStickyHeaderClone({ enabled: stickyHeaderOn, overlayRef: stickyOverlayRef, cloneKey: stickyCloneKey });
  const [selectedRowIds, setSelectedRowIds] = useState<(string | number)[]>([]);

  const previousSelectedRowDataRef = useRef<any>(null);

  const isPageChangeRef = useRef(false);

  const shouldResetToFirstPageRef = useRef(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  // Dataset tables need the same default pager as SQL datasources; otherwise only the
  // first pageSize rows are fetched and the pager UI never renders.
  const effectivePagination = pagination || (
    databaseDataSourceConfig?.datasourceId || datasetConfig?.datasetId || enhancedDataSource?.datasetId
      ? {
          pageSize: 10,
          current: 1,
          showSizeChanger: true,
          showTotal: true
        }
      : undefined
  );

  // Narrow flow: the numbered pager + size changer never fits in a phone-width column.
  const paginationStyle = isNarrowFlow ? 'simple' : effectivePagination?.style;

  const getStorageKey = (key: string) => {

    const tableId = id || 'default-table';
    const workbenchPath = workbenchId || 'default';
    return `table-${workbenchPath}-${tableId}-${key}`;
  };

  const getInitialPageSize = (): number => {
    try {
      const storageKey = getStorageKey('pageSize');
      const savedPageSize = localStorage.getItem(storageKey);
      if (savedPageSize) {
        const parsedSize = parseInt(savedPageSize, 10);

        if ([10, 20, 50, 100, 500, 1000].includes(parsedSize)) {
          return parsedSize;
        }
      }
    } catch (error) {
      console.warn('Failed to load pageSize from localStorage:', error);
    }
    return effectivePagination?.pageSize || 10;
  };

  const [currentPage, setCurrentPage] = useState<number>(effectivePagination?.current || 1);
  const [pageSize, setPageSize] = useState<number>(getInitialPageSize());
  const [isApiLoading, setIsApiLoading] = useState<boolean>(false);
  const [apiPaginationData, setApiPaginationData] = useState<PaginationType | undefined>(undefined);
  const [jsonPreviewData, setJsonPreviewData] = useState<JsonPreviewDataType>({
    open: false,
    data: null
  });

  const [exportState, setExportState] = useState({
    isExporting: false,
    progress: 0,
    currentCount: 0,
    totalCount: 0,
    showProgress: false
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: any;
    record: TableDataType | null;
    onConfirm: (() => void) | null;
  }>({
    isOpen: false,
    action: null,
    record: null,
    onConfirm: null
  });

  const [actionFormDialog, setActionFormDialog] = useState<{
    isOpen: boolean;
    action: any;
    record: TableDataType | null;
  }>({
    isOpen: false,
    action: null,
    record: null
  });
  const [detailRecord, setDetailRecord] = useState<TableDataType | null>(null);

  const [taskExecuteDialog, setTaskExecuteDialog] = useState<{
    isOpen: boolean;
    action: TableAction | null;
    record: TableDataType | null;
  }>({
    isOpen: false,
    action: null,
    record: null
  });

  const [isTaskExecuting, setIsTaskExecuting] = useState(false);
  const taskExecuteInputRef = useRef<TaskInputRendererHandle>(null);

  const [dictionaryDataMap, setDictionaryDataMap] = useState<Map<string, any[]>>(new Map());
  const [dictionaryLoading, setDictionaryLoading] = useState<boolean>(false);

  useEffect(() => {
    if (selectedRowIds.length === 0) return;

    if (data.length === 0) {
      setSelectedRowIds([]);
      return;
    }

    const existingIdSet = new Set(
      data
        .map((row) => {
          const id = row[rowKey];
          return id !== undefined && id !== null ? String(id) : null;
        })
        .filter((id): id is string => id !== null)
    );

    const hasInvalidSelection = selectedRowIds.some(
      (id) => !existingIdSet.has(String(id))
    );
    if (hasInvalidSelection) {
      setSelectedRowIds([]);
    }
  }, [data, rowKey, selectedRowIds.length]);

  const {
    rawParams 
  } = useParameterHandler({
    parameterConfig,
    pageParams: pageParams as ParameterRecord,
    componentId: id || 'table'

  });

  const parametersKey = JSON.stringify(databaseDataSourceConfig?.parameters || {});
  const listenToParametersKey = JSON.stringify(
    componentParameterConfig?.listenToParameters || (parameterConfig as { listenToParameters?: string[] })?.listenToParameters || []
  );

  const listenParams = useMemo(() => {

    const explicitListen = componentParameterConfig?.listenToParameters || (parameterConfig as { listenToParameters?: string[] })?.listenToParameters;
    if (explicitListen && explicitListen.length > 0) {
      return explicitListen;
    }

    const extractedParams: string[] = [];
    if (databaseDataSourceConfig?.parameters) {
      Object.values(databaseDataSourceConfig.parameters).forEach((value: any) => {

        if (value && typeof value === 'object' && value.type === 'parameter' && value.source) {
          extractedParams.push(value.source);
        }
      });
    }
    return extractedParams;

  }, [parametersKey, listenToParametersKey]); 

  useEffect(() => {
  }, [listenParams, id]);

  const refreshDataRef = useRef<() => boolean>(() => false);

  const TRIGGER_PARAMS = ['tableRefreshTrigger', 'chartRefreshTrigger'];
  const skipParamCheckRef = useRef(false);

  const paramsUsedInDataSourceConfig = useMemo(() => {
    const used = new Set<string>();
    if (databaseDataSourceConfig?.parameters) {
      Object.values(databaseDataSourceConfig.parameters).forEach((v: any) => {
        if (v?.type === 'parameter' && v?.source) used.add(v.source);
      });
    }
    return used;
  }, [databaseDataSourceConfig?.parameters]);

  const paramWaitForValueMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (databaseDataSourceConfig?.parameters) {
      Object.values(databaseDataSourceConfig.parameters).forEach((v: any) => {
        if (v?.type === 'parameter' && v?.source) {
          map.set(v.source, v.waitForValue !== false);
        }
      });
    }
    return map;
  }, [databaseDataSourceConfig?.parameters]);

  const dataSourceFiltersKeyForWait = useMemo(
    () => JSON.stringify(parameterConfig?.dataSourceFilters ?? []),
    [parameterConfig?.dataSourceFilters]
  );

  const parameterKeysFromDataSourceFilters = useMemo((): string[] => {
    if (!parameterConfig?.enableParameterReceiving || !parameterConfig.dataSourceFilters?.length) {
      return [];
    }
    const names = new Set<string>();
    parameterConfig.dataSourceFilters.forEach((filter) => {
      if (typeof filter.value === 'string') {
        const paramMatch = filter.value.match(/^\{([^}]+)\}$/);
        if (paramMatch) {
          names.add(paramMatch[1]);
        }
      } else if (
        filter.value &&
        typeof filter.value === 'object' &&
        (filter.value as { type?: string }).type === 'parameter' &&
        typeof (filter.value as { value?: string }).value === 'string'
      ) {
        names.add((filter.value as { value: string }).value);
      }
    });
    return Array.from(names);
  }, [parameterConfig?.enableParameterReceiving, dataSourceFiltersKeyForWait]);

  const handleParameterChange = useCallback((key: string, value: any, event?: any) => {

    const isSelectedRowDataChange = key === 'selectedRowData' || 
      /_selectedRowData_/.test(key);

    if (isSelectedRowDataChange) {

      setCurrentPage(1);
      setData([]);

      setIsApiLoading(true);

      shouldResetToFirstPageRef.current = true;
    }

    if (TRIGGER_PARAMS.includes(key)) {
      skipParamCheckRef.current = true;
    }

    setTimeout(() => {
      // Initial load is handled by the datasource effect; skip filter emits during bootstrap
      // to avoid duplicate requests (e.g. FilterPanel batch emit + first fetch).
      if (!hasCompletedInitialLoadRef.current && !isSelectedRowDataChange) {
        return;
      }

      const runRefresh = () => {
        const didFetch = refreshDataRef.current();
        if (!didFetch && isSelectedRowDataChange) {
          setIsApiLoading(false);
        }
      };

      if (isSelectedRowDataChange) {
        if (selectedRowRefreshTimerRef.current) {
          clearTimeout(selectedRowRefreshTimerRef.current);
        }
        // Row select emits one event per field; debounce into a single refresh.
        selectedRowRefreshTimerRef.current = setTimeout(() => {
          selectedRowRefreshTimerRef.current = null;
          runRefresh();
        }, 0);
        return;
      }

      runRefresh();
    }, 0);
  }, [id]); 

  const { getCurrentParameter, emit, emitBatch } = useComponentCommunication({
    componentId: id || 'table',
    listenParameters: listenParams, 
    onParameterChange: (key: string, value: any, event?: any) => {
      handleParameterChange(key, value, event);
    }, 
    autoCleanup: true,

    emitParameters: undefined
  });

  const { markParametersReady, currentTabParams } = useParameterContext();

  const listenParamsForInitialLoad = useMemo(() => {
    const fromDatabase = listenParams.filter(p => {
      if (TRIGGER_PARAMS.includes(p)) return false;
      if (p === 'dataChangeNotification') return false;
      if (paramsUsedInDataSourceConfig.size > 0 && paramsUsedInDataSourceConfig.has(p)) {
        return paramWaitForValueMap.get(p) !== false;
      }
      return false;
    });

    const fromFilters = parameterKeysFromDataSourceFilters.filter(
      p => !TRIGGER_PARAMS.includes(p) && p !== 'dataChangeNotification'
    );

    return Array.from(new Set([...fromDatabase, ...fromFilters]));
  }, [listenParams, paramsUsedInDataSourceConfig, paramWaitForValueMap, parameterKeysFromDataSourceFilters]);
  const { ready: parametersReady, isReady: checkParametersReady } = useWaitForParameters(
    listenParamsForInitialLoad.length > 0 ? listenParamsForInitialLoad : undefined
  );

  useEffect(() => {
    if (listenParams.length > 0) {
      const paramStatus = listenParams.map(param => {
        const isReady = checkParametersReady([param]);
        return `${param}:${isReady ? 'ready' : 'waiting'}`;
      }).join(', ');
    }
  }, [listenParams, parametersReady, checkParametersReady, databaseDataSourceConfig?.datasourceId, id]);

  const handleDataChange = useCallback((newData: any[]) => {
    setData(newData);
    onDataSourceChange?.(newData);
  }, [onDataSourceChange]);

  const handleError = useCallback((error: string) => {
    toast({
      variant: "destructive",
      title: t('table.data_load_failed', 'Data Load Failed'),
      description: error,
    });
  }, []);

  const {
    data: enhancedData,
    loading: enhancedLoading,
    error: enhancedError,
    refresh: enhancedRefresh,
    pagination: enhancedPagination,

  } = useEnhancedDataSource({
    dataSource: enhancedDataSource || null,
    onDataChange: handleDataChange,
    onError: handleError,
    componentId: id || 'table-renderer',
    pageSize,
  });

  useEffect(() => {
    if (enhancedDataSource?.datasetId) {
      setApiPaginationData(enhancedPagination);
    }
  }, [enhancedDataSource?.datasetId, enhancedPagination]);

  const resolvedDatabaseDataSourceConfig = useMemo(() => {
    if (!databaseDataSourceConfig) return null;

    if (!databaseDataSourceConfig.parameters || Object.keys(databaseDataSourceConfig.parameters).length === 0) {
      return databaseDataSourceConfig;
    }

    const resolvedParameters: Record<string, any> = {};

    Object.entries(databaseDataSourceConfig.parameters).forEach(([key, value]) => {

      if (value && typeof value === 'object' && (value as any).type === 'parameter') {
        const paramConfig = value as { type: 'parameter'; source: string; value?: any };
        const paramName = paramConfig.source;

        let actualValue = currentTabParams?.[paramName] ?? getCurrentParameter?.(paramName) ?? pageParams[paramName];

        // Multi-select params are real arrays — keep them as-is; the API expands
        // them into the SQL IN list (JSON.stringify would send the string '[]').
        if (Array.isArray(actualValue)) {
          // pass through
        } else if (actualValue && typeof actualValue === 'object') {

          if ('id' in actualValue) {
            actualValue = actualValue.id;
          } else if ('value' in actualValue) {
            actualValue = actualValue.value;
          } else {

            console.warn(`[TableRenderer] 参数 "${paramName}" 是对象类型，但没有 id 或 value 字段:`, actualValue);
            actualValue = JSON.stringify(actualValue);
          }
        }

        resolvedParameters[key] = actualValue !== undefined && actualValue !== null ? actualValue : paramConfig.value;

      } else if (value && typeof value === 'object' && (value as any).type === 'system') {

        const systemParamConfig = value as { type: 'system'; systemParam: string; value?: any };
        const systemValue = getSystemParameterValue(
          systemParamConfig.systemParam as any
        );

        resolvedParameters[key] = systemValue || systemParamConfig.value || '';

      } else {

        resolvedParameters[key] = value;
      }
    });

    return {
      ...databaseDataSourceConfig,
      parameters: resolvedParameters
    };
  }, [databaseDataSourceConfig, pageParams, getCurrentParameter, currentTabParams]);

  const getMissingRequiredParamKeys = useCallback((
    resolvedParams: Record<string, any> | undefined
  ): string[] => {
    if (!resolvedParams || !databaseDataSourceConfig?.parameters) return [];
    const missing: string[] = [];
    Object.entries(databaseDataSourceConfig.parameters).forEach(([key, value]) => {
      const original = value && typeof value === 'object' ? value as { type?: string; value?: any; waitForValue?: boolean } : null;
      if (!original) return;
      const isParamOrSystem = original.type === 'parameter' || original.type === 'system';
      const hasDefault = original.value !== undefined && original.value !== null && original.value !== '';

      const isOptionalParam = original.waitForValue === false;
      if (!isParamOrSystem || hasDefault || isOptionalParam) return;
      const resolved = resolvedParams[key];
      const isEmpty = resolved === undefined || resolved === null;
      if (isEmpty) missing.push(key);
    });
    return missing;
  }, [databaseDataSourceConfig?.parameters]);

  const buildFilterParametersForQuery = useCallback(() => {
    const filterParams: Record<string, any> = {};

    Object.entries(filterValues).forEach(([columnKey, values]) => {
      const column = columns.find(col => col.dataIndex === columnKey);
      if (!column) return;

      const passMode = column.filterPassMode || 'filter';

      if (passMode !== 'parameter' || !column.filterParameterName) {
        return;
      }

      const valueArray = Array.isArray(values) ? values : [values];

      const validValues = valueArray
        .filter(v => v && v.trim() !== '' && v !== 'all')
        .map(v => v.trim());

      if (validValues.length === 0) return;

      if (column.filterMultiSelect && validValues.length > 1) {

        filterParams[column.filterParameterName] = validValues;
      } else {

        filterParams[column.filterParameterName] = validValues[0];
      }
    });

    return filterParams;
  }, [filterValues, columns]);

  const buildSortString = useCallback(() => {
    if (databaseDataSourceConfig?.enableSort !== true || useMockData || enhancedDataSource?.datasetId) {
      return undefined;
    }

    if (sortState.size > 0) {
      const sortParts: string[] = [];
      sortState.forEach((direction, dataIndex) => {

        const escapedColumn = `"${dataIndex.replace(/"/g, '""')}"`;
        sortParts.push(`${escapedColumn} ${direction.toUpperCase()}`);
      });
      return sortParts.join(', ');
    }

    if (databaseDataSourceConfig?.defaultSort && databaseDataSourceConfig.defaultSort.length > 0) {
      const sortParts: string[] = [];
      databaseDataSourceConfig.defaultSort.forEach((sortItem) => {

        const escapedColumn = `"${sortItem.field.replace(/"/g, '""')}"`;
        sortParts.push(`${escapedColumn} ${sortItem.direction.toUpperCase()}`);
      });
      return sortParts.join(', ');
    }

    return undefined;
  }, [sortState, databaseDataSourceConfig?.defaultSort, databaseDataSourceConfig?.enableSort, useMockData, enhancedDataSource?.datasetId]);

  const parseDefaultSortString = useCallback<(sortString: string) => Map<string, 'asc' | 'desc'>>((sortString: string) => {
    const result = new Map<string, 'asc' | 'desc'>();

    const cleaned = sortString.trim().replace(/^['"]|['"]$/g, '');

    const parts = cleaned.split(',').map(part => part.trim()).filter(part => part);

    parts.forEach(part => {

      const match = part.match(/^(["']?)([^"'\s]+)\1(?:\s+(asc|desc))?$/i);
      if (match) {
        const columnName = match[2]; 
        const direction = (match[3]?.toLowerCase() || 'asc') as 'asc' | 'desc';
        result.set(columnName, direction);
      } else {

        const words = part.trim().split(/\s+/);
        if (words.length > 0) {
          const columnName = words[0].replace(/^["']|["']$/g, '');
          const direction = words[1]?.toLowerCase() === 'desc' ? 'desc' : 'asc';
          result.set(columnName, direction);
        }
      }
    });

    return result;
  }, []);

  const hasSortPlaceholder = useMemo(() => {

    const sqlQuery = fetchedSqlQuery || databaseDataSourceConfig?.sqlQuery;

    if (!sqlQuery) {
      return false;
    }

    const hasSort = /\{\{[\s\S]*?sort[\s\S]*?\}\}/i.test(sqlQuery);

    if (databaseDataSourceConfig?.datasourceId) {

      const sortMatches = sqlQuery.match(/\{\{[\s\S]*?sort[\s\S]*?\}\}/gi);

      const sortIndex = sqlQuery.toLowerCase().indexOf('sort');
      const contextBefore = sortIndex > 0 ? sqlQuery.substring(Math.max(0, sortIndex - 100), sortIndex) : '';
      const contextAfter = sortIndex >= 0 ? sqlQuery.substring(sortIndex, Math.min(sqlQuery.length, sortIndex + 100)) : '';

      let sqlPreviewWithSort = '';
      if (sortIndex >= 0) {
        const startIndex = Math.max(0, sortIndex - 200);
        const endIndex = Math.min(sqlQuery.length, sortIndex + 200);
        sqlPreviewWithSort = sqlQuery.substring(startIndex, endIndex);
      }

      const coalescePattern = /COALESCE\s*\(\s*NULLIF\s*\(\s*\{\{[\s\S]*?sort[\s\S]*?\}\}\s*,\s*['"]?([^'"]+)['"]?\s*\)\s*,\s*['"]([^'"]+)['"]\s*\)/i;
      const defaultSortMatch = sqlQuery.match(coalescePattern);
      const extractedDefaultSort = defaultSortMatch ? defaultSortMatch[2] : null;
    }

    return hasSort;
  }, [databaseDataSourceConfig?.sqlQuery, fetchedSqlQuery, databaseDataSourceConfig?.datasourceId]);

  const defaultSortString = useMemo(() => {
    const sqlQuery = fetchedSqlQuery || databaseDataSourceConfig?.sqlQuery;

    if (!sqlQuery) {
      return null;
    }

    const coalescePattern = /COALESCE\s*\(\s*NULLIF\s*\(\s*\{\{[\s\S]*?sort[\s\S]*?\}\}\s*,\s*['"]?([^'"]+)['"]?\s*\)\s*,\s*['"]([^'"]+)['"]\s*\)/i;
    const match = sqlQuery.match(coalescePattern);

    if (match && match[2]) {

      return match[2].trim();
    }

    return null;
  }, [fetchedSqlQuery, databaseDataSourceConfig?.sqlQuery]);

  const buildDatabaseRequestParams = useCallback((page: number, limit: number, includeResolvedParams: boolean = false) => {

    let parameterDataSourceFilterString = '';
    if (parameterConfig?.enableParameterReceiving && parameterConfig?.dataSourceFilters) {
      const dataSourceFilters = buildDataSourceFilters(
        parameterConfig.dataSourceFilters,
        rawParams 
      );
      if (Object.keys(dataSourceFilters).length > 0) {
        parameterDataSourceFilterString = buildParameterFilterString(dataSourceFilters);
      }
    }

    const allFilterParts = [
      parameterDataSourceFilterString,  
      databaseFilterExpression          
    ].filter(Boolean);
    const mergedFilterExpression = allFilterParts.length > 0 ? allFilterParts.join(' AND ') : '';

    const params: {
      page: number;
      limit: number;
      filter?: string;
      sort?: string;
      [key: string]: any; 
    } = {
      page,
      limit,

      ...(mergedFilterExpression && { filter: mergedFilterExpression })
    };

    const sortString = buildSortString();
    if (sortString) {

      params.sort = sortString;
    }

    const filterParams = buildFilterParametersForQuery();
    Object.assign(params, filterParams);

    if (includeResolvedParams && resolvedDatabaseDataSourceConfig?.parameters) {

      const convertParameterValue = (value: any, type: string): any => {
        if (value === null || value === undefined || value === '') {
          return value;
        }

        // Arrays pass through regardless of the declared type ('string' is the
        // default): the API expands them into the SQL IN list.
        if (Array.isArray(value)) {
          return value;
        }

        switch (type?.toLowerCase()) {
          case 'number':
          case 'integer':
          case 'int':
            const numValue = Number(value);
            return isNaN(numValue) ? value : numValue;
          case 'boolean':
          case 'bool':
            if (typeof value === 'boolean') return value;
            if (typeof value === 'string') {
              const lowerValue = value.toLowerCase();
              if (lowerValue === 'true' || lowerValue === '1') return true;
              if (lowerValue === 'false' || lowerValue === '0') return false;
            }
            return Boolean(value);
          case 'array':
          case 'list':
            if (Array.isArray(value)) return value;
            if (typeof value === 'string') {
              try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : [value];
              } catch {
                return value.split(',').map((item: string) => item.trim());
              }
            }
            return [value];
          case 'object':
          case 'json':
            if (typeof value === 'object') return value;
            if (typeof value === 'string') {
              try {
                return JSON.parse(value);
              } catch {
                return value;
              }
            }
            return value;
          case 'string':
          case 'text':
          default:
            return String(value);
        }
      };

      Object.entries(resolvedDatabaseDataSourceConfig.parameters).forEach(([key, value]) => {

        if (['page', 'limit', 'offset'].includes(key)) {
          return;
        }
        const paramType = databaseDataSourceConfig?.parameterTypes?.[key] || 'string';
        params[key] = convertParameterValue(value, paramType);
      });

      const EXCLUDED_KEYS = ['page', 'limit', 'offset', 'filter', 'sort', 'outputFields', 'selectedRowIds', ...Object.keys(resolvedDatabaseDataSourceConfig.parameters)];
      Object.entries(rawParams).forEach(([key, value]) => {

        if (key.startsWith('component_')) {
          return;
        }

        if (!EXCLUDED_KEYS.includes(key) && value !== undefined && value !== null && value !== '') {

          const isUsedInFilters = parameterConfig?.dataSourceFilters?.some(
            (filter: any) => {
              const filterValue = filter.value;
              if (typeof filterValue === 'string') {
                const paramMatch = filterValue.match(/^\{([^}]+)\}$/);
                return paramMatch && paramMatch[1] === key;
              } else if (typeof filterValue === 'object' && filterValue.type === 'parameter') {
                return filterValue.value === key;
              }
              return false;
            }
          );

          if (!isUsedInFilters) {

            const paramType = databaseDataSourceConfig?.parameterTypes?.[key] || 'string';
            params[key] = convertParameterValue(value, paramType);
          }
        }
      });
    }

    params.page = Number(page);
    params.limit = Number(limit);

    return params;
  }, [databaseFilterExpression, buildFilterParametersForQuery, buildSortString, parameterConfig?.enableParameterReceiving, parameterConfig?.dataSourceFilters, rawParams, resolvedDatabaseDataSourceConfig, databaseDataSourceConfig?.parameterTypes]);

  const databaseAdditionalParams = useMemo(() => {
    return buildDatabaseRequestParams(currentPage, pageSize, false);
  }, [buildDatabaseRequestParams, currentPage, pageSize]);

  const matchColumnName = useCallback((sqlFieldName: string, columns: TableColumnType[]): string | null => {

    const exactMatch = columns.find(col => col.dataIndex === sqlFieldName);
    if (exactMatch) {
      return exactMatch.dataIndex;
    }

    const caseInsensitiveMatch = columns.find(col => 
      col.dataIndex.toLowerCase() === sqlFieldName.toLowerCase()
    );
    if (caseInsensitiveMatch) {
      return caseInsensitiveMatch.dataIndex;
    }

    const toCamelCase = (str: string) => {
      return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    };
    const camelCaseField = toCamelCase(sqlFieldName);
    const camelCaseMatch = columns.find(col => col.dataIndex === camelCaseField);
    if (camelCaseMatch) {
      return camelCaseMatch.dataIndex;
    }

    const toSnakeCase = (str: string) => {
      return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    };
    const snakeCaseField = toSnakeCase(sqlFieldName);
    const snakeCaseMatch = columns.find(col => col.dataIndex === snakeCaseField);
    if (snakeCaseMatch) {
      return snakeCaseMatch.dataIndex;
    }

    const camelCaseMatchIgnoreCase = columns.find(col => 
      col.dataIndex.toLowerCase() === camelCaseField.toLowerCase()
    );
    if (camelCaseMatchIgnoreCase) {
      return camelCaseMatchIgnoreCase.dataIndex;
    }

    const snakeCaseMatchIgnoreCase = columns.find(col => 
      col.dataIndex.toLowerCase() === snakeCaseField.toLowerCase()
    );
    if (snakeCaseMatchIgnoreCase) {
      return snakeCaseMatchIgnoreCase.dataIndex;
    }

    return null;
  }, []);

  useEffect(() => {
    if (!databaseDataSourceConfig?.datasourceId || databaseDataSourceConfig?.enableSort !== true || useMockData || enhancedDataSource?.datasetId || sortState.size > 0) {
      return; 
    }

    const defaultSorts = new Map<string, 'asc' | 'desc'>();

    if (databaseDataSourceConfig.defaultSort && databaseDataSourceConfig.defaultSort.length > 0) {
      databaseDataSourceConfig.defaultSort.forEach((sortItem) => {

        const matchedDataIndex = matchColumnName(sortItem.field, columns);
        if (matchedDataIndex) {
          defaultSorts.set(matchedDataIndex, sortItem.direction);
        } else {
          console.warn(`[TableRenderer] 配置中的字段名未匹配: ${sortItem.field}，可用的列:`, 
            columns.map(col => col.dataIndex).join(', ')
          );
        }
      });
    }

    if (defaultSorts.size === 0 && hasSortPlaceholder && defaultSortString) {
      const parsed = parseDefaultSortString(defaultSortString);
      if (parsed.size > 0) {
        parsed.forEach((direction, sqlFieldName) => {

          const matchedDataIndex = matchColumnName(sqlFieldName, columns);
          if (matchedDataIndex) {
            defaultSorts.set(matchedDataIndex, direction);
          } else {
            console.warn(`[TableRenderer] SQL中的字段名未匹配: ${sqlFieldName}，可用的列:`, 
              columns.map(col => col.dataIndex).join(', ')
            );
          }
        });
      }
    }

    if (defaultSorts.size === 0) {
      columns.forEach(column => {

        const defaultSort = (column as any).defaultSort;
        if (defaultSort === 'asc' || defaultSort === 'desc') {
          defaultSorts.set(column.dataIndex, defaultSort);
        }
      });
    }

    if (defaultSorts.size > 0) {
      setSortState(defaultSorts);
    }
  }, [columns, databaseDataSourceConfig?.datasourceId, databaseDataSourceConfig?.defaultSort, databaseDataSourceConfig?.enableSort, useMockData, enhancedDataSource?.datasetId, hasSortPlaceholder, defaultSortString, parseDefaultSortString, matchColumnName, sortState.size]);

  const {
    data: databaseData,
    loading: databaseLoading,
    error: databaseError,
    pagination: databasePagination,
    isInitialized: databaseInitialized,
    refetch: refetchDatabaseData
  } = useDatabaseDataSource(
    resolvedDatabaseDataSourceConfig || null,
    'Table',
    databaseAdditionalParams,
    {
      autoFetch: false, 
      errorConfig: {
        showToast: true,
        retryAttempts: 2,
        retryDelay: 1000
      }
    }
  );

  
  const { rows: summaryRows } = useBoundRows(
    summaryDataSourceConfig ?? null,
    componentParameterConfig as never,
    pageParams as Record<string, unknown>,
    `${id ?? 'table'}-summary`,
    'table-summary'
  );
  const summaryRow = summaryRows[0];

  const isRefetchingRef = useRef(false);

  const pendingRefreshRef = useRef(false);

  const refreshDatabaseData = useCallback((): boolean => {

    if (isRefetchingRef.current) {

      pendingRefreshRef.current = true;
      return true;
    }

    if (!resolvedDatabaseDataSourceConfig) {
      console.warn(`[TableRenderer ${id || 'table'}] refreshDatabaseData: 配置未准备好`);
      return false;
    }

    if (typeof refetchDatabaseData !== 'function') {
      console.warn(`[TableRenderer ${id || 'table'}] refreshDatabaseData: refetchDatabaseData 不存在`);
      return false;
    }

    const hasListenParamsToWait = listenParamsForInitialLoad.length > 0;
    const isTriggerRefresh = skipParamCheckRef.current;
    if (isTriggerRefresh) {
      skipParamCheckRef.current = false;
    }
    if (hasListenParamsToWait && !isTriggerRefresh) {
      const isReallyReady = checkParametersReady(listenParamsForInitialLoad);
      if (!isReallyReady) {
        console.warn(`[TableRenderer ${id || 'table'}] refreshDatabaseData: 参数未就绪，取消请求`, listenParamsForInitialLoad);
        return false;
      }
    }

    const missingRequired = getMissingRequiredParamKeys(resolvedDatabaseDataSourceConfig.parameters);
    if (missingRequired.length > 0) {
      console.warn(`[TableRenderer ${id || 'table'}] refreshDatabaseData: 必需参数未就绪，取消请求`, missingRequired);
      return false;
    }

    isRefetchingRef.current = true;

    const shouldResetToFirstPage = shouldResetToFirstPageRef.current;
    if (shouldResetToFirstPage) {

      shouldResetToFirstPageRef.current = false;
    }

    const requestPage = shouldResetToFirstPage ? 1 : currentPage;
    const requestOffset = (requestPage - 1) * pageSize;
    const requestParams = {
      page: requestPage,
      limit: pageSize,
      offset: requestOffset
    };

    refetchDatabaseData(requestParams).finally(() => {

      setTimeout(() => {
        isRefetchingRef.current = false;

        if (pendingRefreshRef.current) {
          pendingRefreshRef.current = false;
          setTimeout(() => {
            refreshDataRef.current();
          }, 0);
        }
      }, 100);
    });
    return true;
  }, [resolvedDatabaseDataSourceConfig, refetchDatabaseData, id, listenParamsForInitialLoad, checkParametersReady, getMissingRequiredParamKeys, databaseDataSourceConfig, currentPage, pageSize]);

  refreshDataRef.current = refreshDatabaseData;

  const handleSort = useCallback((column: TableColumnType, direction: 'asc' | 'desc' | null) => {

    if (!databaseDataSourceConfig?.datasourceId || databaseDataSourceConfig?.enableSort !== true || useMockData || enhancedDataSource?.datasetId || !hasSortPlaceholder) {
      return;
    }

    const newSortState = new Map(sortState);

    if (direction === null) {

      newSortState.delete(column.dataIndex);
    } else {

      newSortState.set(column.dataIndex, direction);
    }

    const sortParts: string[] = [];
    newSortState.forEach((dir, dataIndex) => {
      const escapedColumn = `"${dataIndex.replace(/"/g, '""')}"`;
      sortParts.push(`${escapedColumn} ${dir.toUpperCase()}`);
    });
    const sortString = sortParts.length > 0 ? sortParts.join(', ') : undefined;

    setSortState(newSortState);

    setCurrentPage(1);

    if (refetchDatabaseData) {

      refetchDatabaseData({
        page: 1,
        limit: pageSize,
        ...(databaseFilterExpression && { filter: databaseFilterExpression }),
        ...(sortString && { sort: sortString })
      });
    }
  }, [databaseDataSourceConfig, useMockData, enhancedDataSource?.datasetId, hasSortPlaceholder, refetchDatabaseData, databaseFilterExpression, pageSize, sortState]);

  useEffect(() => {

    if (!databaseDataSourceConfig?.datasourceId) {
      return;
    }

    if (isLoadDisabledRef.current) {
      console.warn('[TableRenderer] 数据库数据源加载已禁用，失败次数超过限制');
      return;
    }

    if (sqlQueryState === 'pending') {

      return;
    }

    const hasListenParamsToWait = listenParamsForInitialLoad.length > 0;
    const isReallyReady = parametersReady || (!hasListenParamsToWait || checkParametersReady(listenParamsForInitialLoad));
    if (hasListenParamsToWait && !isReallyReady) {

      return;
    }

    if (!resolvedDatabaseDataSourceConfig) {
      return;
    }

    const missingRequired = getMissingRequiredParamKeys(resolvedDatabaseDataSourceConfig.parameters);
    if (missingRequired.length > 0) {
      console.warn(`[TableRenderer ${id || 'table'}] 等待必需参数就绪后再加载:`, missingRequired);
      return;
    }

    const currentConfigKey = JSON.stringify({
      datasourceId: databaseDataSourceConfig?.datasourceId,
      parameters: resolvedDatabaseDataSourceConfig?.parameters,
      sqlQuery: databaseDataSourceConfig?.sqlQuery || fetchedSqlQuery
    });

    if (hasCompletedInitialLoadRef.current && lastLoadConfigKeyRef.current === currentConfigKey) {
      return;
    }

    if (timeoutRef.current) {

      if (lastLoadConfigKeyRef.current !== currentConfigKey) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      } else {

        return;
      }
    }

    lastLoadConfigKeyRef.current = currentConfigKey;

    timeoutRef.current = setTimeout(() => {

      if (!resolvedDatabaseDataSourceConfig) {
        console.warn(`[TableRenderer ${id || 'table'}] setTimeout 回调中配置仍未准备好，延迟重试`);

        setTimeout(() => {
          if (resolvedDatabaseDataSourceConfig && typeof refetchDatabaseData === 'function' && !isLoadDisabledRef.current) {

            if (shouldResetToFirstPageRef.current) {
              shouldResetToFirstPageRef.current = false;
              refetchDatabaseData({
                page: 1,
                limit: pageSize,
                offset: 0
              });
            } else {
              refreshDatabaseData();
            }
          }
        }, 100);
        timeoutRef.current = null;
        return;
      }

      const hasListenParamsInTimeout = listenParamsForInitialLoad.length > 0;
      if (hasListenParamsInTimeout) {
        const isReallyReadyInTimeout = checkParametersReady(listenParamsForInitialLoad);
        if (!isReallyReadyInTimeout) {
          timeoutRef.current = null;
          return;
        }
      }

      const missingInTimeout = getMissingRequiredParamKeys(resolvedDatabaseDataSourceConfig.parameters);
      if (missingInTimeout.length > 0) {
        timeoutRef.current = null;
        return;
      }

      hasCompletedInitialLoadRef.current = true;
      if (typeof refetchDatabaseData === 'function' && !isLoadDisabledRef.current) {

        if (shouldResetToFirstPageRef.current) {
          shouldResetToFirstPageRef.current = false;
          refetchDatabaseData({
            page: 1,
            limit: pageSize,
            offset: 0
          });
        } else {
          refreshDatabaseData();
        }
      } else {
        console.warn(`[TableRenderer ${id || 'table'}] 跳过数据加载`, {
          reason: typeof refetchDatabaseData !== 'function' ? 'refetchDatabaseData 不存在' : '加载已禁用'
        });
      }
      timeoutRef.current = null;
    }, 0);
  }, [
    databaseDataSourceConfig?.datasourceId,
    databaseDataSourceConfig?.sqlQuery, 
    sqlQueryState, 
    fetchedSqlQuery, 
    listenParams,
    listenParamsForInitialLoad,
    parametersReady,
    refetchDatabaseData,
    checkParametersReady,
    getMissingRequiredParamKeys,
    resolvedDatabaseDataSourceConfig, 
    pageSize 
  ]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (selectedRowRefreshTimerRef.current) {
        clearTimeout(selectedRowRefreshTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadFailureCountRef.current = 0;
    isLoadDisabledRef.current = false;
  }, [databaseDataSourceConfig?.datasourceId, datasetConfig?.datasetId]);

  useEffect(() => {
    if (!databaseDataSourceConfig?.datasourceId) {
      return;
    }

    if (isLoadDisabledRef.current) {
      return;
    }

    if (databaseInitialized && !databaseLoading && !databaseError && Array.isArray(databaseData)) {
      loadFailureCountRef.current = 0;
      isLoadDisabledRef.current = false;
      return;
    }

    if (databaseError && databaseInitialized && !databaseLoading) {
      loadFailureCountRef.current += 1;

      if (loadFailureCountRef.current >= MAX_LOAD_FAILURES) {
        isLoadDisabledRef.current = true;
        toast({
          variant: "destructive",
          title: t('table.load_disabled', 'Load Disabled'),
          description: t('table.load_failed_too_many_times', `Data loading has been disabled after ${MAX_LOAD_FAILURES} consecutive failures. Please check your data source configuration.`),
        });
      }
    }
  }, [databaseError, databaseInitialized, databaseLoading, databaseData, databaseDataSourceConfig?.datasourceId, t]);

  const loadDictionaryData = useCallback(async (
    config: import('../../types/renderers').DictionaryDataSourceConfig
  ): Promise<any[]> => {
    if (config.type !== 'database' || !config.datasourceId) return [];
    try {
      const response = await apiClient.post(
        withDatasourceVersion(
          `/datasources/${config.datasourceId}/data`,
          resolveRuntimeDatasourceVersion(config.datasourceId, config.version)
        ),
        {
        limit: 10000,
        offset: 0
      });
      const dictionaryData = Array.isArray((response.data as any)?.data)
        ? (response.data as any).data
        : (Array.isArray(response.data) ? response.data : []);
      return Array.isArray(dictionaryData) ? dictionaryData : [];
    } catch (error) {
      console.error('加载字典数据失败:', error);
      return [];
    }
  }, []);

  const columnsForDictionaryRef = useRef(columns);
  columnsForDictionaryRef.current = columns;

  const tableDictionaryFetchKey = useMemo(
    () =>
      columns
        .filter((col) => col.dictionaryDataSource)
        .map((col) => {
          const ds = col.dictionaryDataSource!;
          return `${String(col.dataIndex)}:${String(ds.type ?? '')}:${String(ds.datasourceId ?? '')}:${ds.version ?? 'default'}`;
        })
        .sort()
        .join('|'),
    [columns]
  );

  useEffect(() => {
    const loadAllDictionaries = async () => {

      const dictionaryColumns = columnsForDictionaryRef.current.filter(col => col.dictionaryDataSource);

      if (dictionaryColumns.length === 0) {
        return;
      }

      setDictionaryLoading(true);

      try {

        const loadPromises = dictionaryColumns.map(async (column) => {
          if (!column.dictionaryDataSource) return null;

          const dictionaryData = await loadDictionaryData(column.dictionaryDataSource);
          return {
            columnIndex: column.dataIndex,
            data: dictionaryData
          };
        });

        const results = await Promise.all(loadPromises);

        const newDictionaryMap = new Map<string, any[]>();
        results.forEach(result => {
          if (result) {
            newDictionaryMap.set(result.columnIndex, result.data);
          }
        });

        setDictionaryDataMap(newDictionaryMap);
      } catch (error) {
        console.error('加载字典数据失败:', error);
      } finally {
        setDictionaryLoading(false);
      }
    };

    loadAllDictionaries();
  }, [tableDictionaryFetchKey, loadDictionaryData]);

  const getDictionaryFilterOptions = useCallback((column: TableColumnType): MultiSelectOption[] => {
    if (!column.dictionaryDataSource) return [];
    const dictionaryData = dictionaryDataMap.get(column.dataIndex);
    if (!dictionaryData || dictionaryData.length === 0) return [];
    const { matchConditions, displayField } = column.dictionaryDataSource;
    const matchForThisColumn = matchConditions.find(c => c.tableField === column.dataIndex);
    const dictionaryField = matchForThisColumn?.dictionaryField ?? matchConditions[0]?.dictionaryField;
    if (!dictionaryField) return [];
    const seen = new Set<string>();
    return dictionaryData
      .map((item: Record<string, unknown>) => {
        const val = item[dictionaryField];
        const displayVal = item[displayField];
        const valueStr = val != null ? String(val) : '';
        if (!valueStr || seen.has(valueStr)) return null;
        seen.add(valueStr);
        return {
          value: valueStr,
          label: displayVal != null ? String(displayVal) : valueStr
        };
      })
      .filter((o): o is MultiSelectOption => o !== null);
  }, [dictionaryDataMap]);

  const stableEnhancedDataSourceId = useMemo(() => enhancedDataSource?.datasetId, [enhancedDataSource?.datasetId]);

  const mockDataStr = useMemo(() => JSON.stringify(mockData), [mockData]);
  const enhancedDataStr = useMemo(() => JSON.stringify(enhancedData), [enhancedData]);
  const dataSourceStr = useMemo(() => JSON.stringify(dataSource), [dataSource]);

  const stableMockData = useMemo(() => mockData, [mockDataStr]);
  const stableEnhancedData = useMemo(() => enhancedData, [enhancedDataStr]);
  const stableDataSource = useMemo(() => dataSource, [dataSourceStr]);

  useEffect(() => {

    if (useMockData) {
      const finalMockData = Array.isArray(stableMockData) && stableMockData.length > 0 ? stableMockData : [];
      setData(finalMockData);
      return;
    }

    if (stableEnhancedDataSourceId && stableEnhancedData && stableEnhancedData.length > 0) {
      setData(stableEnhancedData);
      return;
    }

    if (databaseDataSourceConfig?.datasourceId) {

      if (databaseError) {
        setData([]);
        setIsApiLoading(false);
        return;
      }

      if (databaseLoading) {
        return;
      }

      if (Array.isArray(databaseData) && databaseData.length > 0) {
        setData(databaseData);
        setIsApiLoading(false);
        return;
      }

      if (databaseInitialized && !isPageChangeRef.current) {
        setData([]);
        setIsApiLoading(false);
        isPageChangeRef.current = false;
        return;
      }

      if (isPageChangeRef.current) {
        return;
      }

      return;
    }

    // Dataset-backed tables own their data through fetchDataFromApi. Do not
    // overwrite a freshly fetched page with the static local dataSource while
    // its loading state changes.
    if (datasetConfig?.datasetId) {
      return;
    }

    if (Array.isArray(stableDataSource) && stableDataSource.length > 0) {
      setData(stableDataSource);
      return;
    }

    setData([]);

  }, [

    useMockData,
    stableMockData, 
    stableEnhancedDataSourceId,
    stableEnhancedData, 
    databaseDataSourceConfig?.datasourceId,
    datasetConfig?.datasetId,
    databaseData, 
    databaseError, 
    databaseInitialized, 
    isApiLoading, 

    stableDataSource 
  ]);

  useEffect(() => {

    if (databaseDataSourceConfig?.datasourceId && databasePagination) {

      setApiPaginationData({
        total: databasePagination.total,
        current_page: databasePagination.current_page,
        total_pages: databasePagination.total_pages,
        limit: databasePagination.limit,
        offset: databasePagination.offset,
        has_more: databasePagination.has_more
      });

      const newTotalPages = databasePagination.total_pages || 1;
      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages);
      }
    } else if (databaseDataSourceConfig?.datasourceId && !databasePagination && databaseLoading) {
      void 0;
    }
  }, [databaseDataSourceConfig?.datasourceId, databasePagination, databaseLoading, databaseInitialized, currentPage]);

  useEffect(() => {
    if (databaseDataSourceConfig?.datasourceId) {

      if (!databaseLoading && databaseInitialized && !isApiLoading) {
        setIsApiLoading(false);
      }
    }
  }, [databaseDataSourceConfig?.datasourceId, databaseLoading, databaseInitialized, isApiLoading]);

  const visibleColumns = columns.filter(column => !column.hidden);

  const getColumnWidthStyle = useCallback((column: TableColumnType): React.CSSProperties | undefined => {
    const toCss = (v: number | string) => (typeof v === 'number' ? `${v}px` : v);
    const hasWidth = column.width != null || column.minWidth != null || column.maxWidth != null;
    if (!hasWidth) return undefined;
    const style: React.CSSProperties = {};
    if (column.width != null) {
      const w = toCss(column.width);
      style.width = w;
      // Lock min/max to the configured width too — under table-layout:auto a bare `width` is only a
      // hint the browser grows to fill the table, so the column width otherwise "doesn't work".
      // An explicit minWidth/maxWidth still overrides below.
      style.minWidth = w;
      style.maxWidth = w;
    }
    if (column.minWidth != null) style.minWidth = toCss(column.minWidth);
    if (column.maxWidth != null) style.maxWidth = toCss(column.maxWidth);
    return Object.keys(style).length > 0 ? style : undefined;
  }, []);

  const getColgroupColStyle = useCallback(
    (column: TableColumnType, fixed = false): React.CSSProperties => {
      const toCss = (v: number | string) => (typeof v === 'number' ? `${v}px` : v);
      const s = getColumnWidthStyle(column);
      if (column.width != null) {
        return {
          minWidth: s?.minWidth != null ? toCss(s.minWidth) : 0,
          width: toCss(column.width),
          ...(s?.maxWidth != null ? { maxWidth: toCss(s.maxWidth) } : {}),
        };
      }
      // table-fixed: columns without an explicit width flex (width:auto) to absorb the remaining
      // space, so width-configured columns keep their exact width instead of being scaled up.
      if (fixed) {
        return s?.minWidth != null ? { minWidth: toCss(s.minWidth) } : {};
      }
      if (!s) {
        return { minWidth: '7.5rem', width: '7.5rem' };
      }
      const minW = s.minWidth != null ? toCss(s.minWidth) : '7.5rem';
      return {
        minWidth: minW,
        width: minW,
        maxWidth: s.maxWidth != null ? toCss(s.maxWidth) : undefined,
      };
    },
    [getColumnWidthStyle]
  );

  const filterableColumns = visibleColumns.filter(column => column.filterable);

  const hasFilterableColumns = filterableColumns.length > 0;

  const filterPanelGridClassName = useMemo(
    () => getFilterPanelGridClassName(filterPanelGridColumns, isNarrowFlow),
    [filterPanelGridColumns, isNarrowFlow]
  );

  const isInitialRender = useRef(true);
  const prevDatasetId = useRef<string | undefined>(datasetConfig?.datasetId);

  const resetAllFilters = () => {
    setFilterValues({});
    setDatabaseFilterExpression('');
  };

  const generateSingleCondition = (
    columnKey: string,
    value: string,
    column: TableColumnType
  ): string | null => {
    const trimmedValue = value.trim();
    if (!trimmedValue || trimmedValue === 'all') return null;

    // Check if the column is a numeric type
    const isNumeric = column.fieldType === 'INT8' || 
                      column.fieldType === 'INT16' || 
                      column.fieldType === 'INT32' || 
                      column.fieldType === 'INT64' || 
                      column.fieldType === 'FLOAT' || 
                      column.fieldType === 'DOUBLE';

    // Check if the column is a date type
    const isDateType = column.fieldType === 'DATE';

    // Check if the column is a switch type
    const isSwitchType = column.fieldType === 'SWITCH';

    switch (column.filterType) {
      case 'like':
        return `${columnKey} LIKE '%${trimmedValue}%'`;
      case 'in': {
        const valuesList = trimmedValue.split(',').map(v => v.trim()).filter(v => v);
        if (valuesList.length === 0) return null;
        if (isNumeric) {
          return `${columnKey} IN (${valuesList.join(', ')})`;
        } else {
          return `${columnKey} IN (${valuesList.map(v => `'${v}'`).join(', ')})`;
        }
      }
      case 'equals':
      default:
        if (isNumeric) {
          return `${columnKey} = ${trimmedValue}`;
        } else if (isDateType) {
          return `${columnKey} = '${trimmedValue}'`;
        } else if (isSwitchType) {
          const switchOnText = column.switchConfig?.showText && column.switchConfig?.onText 
            ? column.switchConfig.onText 
            : t('table.switch_on', 'On');
          const switchOffText = column.switchConfig?.showText && column.switchConfig?.offText 
            ? column.switchConfig.offText 
            : t('table.switch_off', 'Off');

          const isDatabaseNumericField = column.databaseFieldType === 'number';

          if (trimmedValue === switchOnText || trimmedValue === t('table.switch_on', 'On') || trimmedValue === '1') {
            return isDatabaseNumericField ? `${columnKey} = 1` : `${columnKey} = '1'`;
          } else if (trimmedValue === switchOffText || trimmedValue === t('table.switch_off', 'Off') || trimmedValue === '0') {
            return isDatabaseNumericField ? `${columnKey} = 0` : `${columnKey} = '0'`;
          } else {
            return isDatabaseNumericField ? `${columnKey} = ${trimmedValue}` : `${columnKey} = '${trimmedValue}'`;
          }
        } else {
          return `${columnKey} = '${trimmedValue}'`;
        }
    }
  };

  const buildFilterString = () => {
    const filterConditions = Object.entries(filterValues)
      .filter(([, values]) => {

        if (!values || !Array.isArray(values)) return false;
        return values.length > 0 && values.some(v => v && v.trim() !== '' && v !== 'all');
      })
      .map(([columnKey, values]) => {
        const column = columns.find(col => col.dataIndex === columnKey);
        if (!column) return null;

        const passMode = column.filterPassMode || 'filter';

        if (passMode !== 'filter') {
          return null; 
        }

        const valueArray = Array.isArray(values) ? values : [values];

        const validValues = valueArray
          .filter(v => v && v.trim() !== '' && v !== 'all')
          .map(v => v.trim());

        if (validValues.length === 0) return null;

        if (column.filterMultiSelect && validValues.length > 1) {
          const conditions = validValues
            .map(value => generateSingleCondition(columnKey, value, column))
            .filter(Boolean) as string[];

          return conditions.length > 0 
            ? `(${conditions.join(' OR ')})` 
            : null;
        } else {

          return generateSingleCondition(columnKey, validValues[0], column);
        }
      })
      .filter(Boolean) as string[];

    return filterConditions.length > 0 
      ? filterConditions.join(' AND ') 
      : '';
  };

  const buildFilterParameters = () => {
    const filterParams: Record<string, any> = {};

    Object.entries(filterValues).forEach(([columnKey, values]) => {
      const column = columns.find(col => col.dataIndex === columnKey);
      if (!column) return;

      const passMode = column.filterPassMode || 'filter';

      if (passMode !== 'parameter' || !column.filterParameterName) {
        return;
      }

      const valueArray = Array.isArray(values) ? values : [values];

      const validValues = valueArray
        .filter(v => v && v.trim() !== '' && v !== 'all')
        .map(v => v.trim());

      if (validValues.length === 0) return;

      if (column.filterMultiSelect && validValues.length > 1) {

        filterParams[column.filterParameterName] = validValues;
      } else {

        filterParams[column.filterParameterName] = validValues[0];
      }
    });

    return filterParams;
  };

  const applyFilters = () => {
    // Reset to first page when applying filters
    setCurrentPage(1);

    if (databaseDataSourceConfig?.datasourceId) {

      const filterExpression = buildFilterString();

      const filterParams = buildFilterParametersForQuery();

      setDatabaseFilterExpression(filterExpression);

      const paramsToFetch = {
        page: 1,  
        limit: pageSize,
        ...(filterExpression && { filter: filterExpression }),
        ...filterParams 
      };

      if (refetchDatabaseData) {
        refetchDatabaseData(paramsToFetch);
      }

      return;
    }

    if (datasetConfig?.datasetId) {
      fetchDataFromApi(true);
      return;
    }

    let filteredData = Array.isArray(dataSource) ? [...dataSource] : [];

    Object.entries(filterValues).forEach(([columnKey, values]) => {
      const column = columns.find(col => col.dataIndex === columnKey);
      if (!column) return;

      const valueArray = Array.isArray(values) ? values : [values];

      const validValues = valueArray
        .filter(v => v && v.trim() !== '' && v !== 'all')
        .map(v => v.trim());

      if (validValues.length === 0) return;

      if (column.filterMultiSelect && validValues.length > 1) {
        filteredData = filteredData.filter(record => {
          const recordValue = record[columnKey];

          return validValues.some(value => {
            switch (column.filterType) {
              case 'like':
                return typeof recordValue === 'string' && 
                  recordValue.toLowerCase().includes(value.toLowerCase());
              case 'in': {
                const valuesList = value.split(',').map(v => v.trim().toLowerCase());
                return typeof recordValue === 'string' && 
                  valuesList.includes(recordValue.toLowerCase());
              }
              case 'equals':
              default:
                return String(recordValue).toLowerCase() === value.toLowerCase();
            }
          });
        });
      } else {

        const value = validValues[0];
        filteredData = filteredData.filter(record => {
          const recordValue = record[columnKey];

          switch (column.filterType) {
            case 'like':
              return typeof recordValue === 'string' && 
                recordValue.toLowerCase().includes(value.toLowerCase());
            case 'in': {
              const valuesList = value.split(',').map(v => v.trim().toLowerCase());
              return typeof recordValue === 'string' && 
                valuesList.includes(recordValue.toLowerCase());
            }
            case 'equals':
            default:
              return String(recordValue).toLowerCase() === value.toLowerCase();
          }
        });
      }
    });

    setData(filteredData);
  };

  const stablePageParamsString = useMemo(() => JSON.stringify(pageParams), [pageParams]);
  const stableRawParamsString = useMemo(() => JSON.stringify(rawParams), [rawParams]);
  const stableDataSourceFiltersString = useMemo(() => JSON.stringify(parameterConfig?.dataSourceFilters), [parameterConfig?.dataSourceFilters]);

  useEffect(() => {

    if (databaseDataSourceConfig?.datasourceId) {
      return;
    }

    if (enhancedDataSource?.datasetId) {

      setIsApiLoading(enhancedLoading);

      if (enhancedError) {
        setData([]);
      }

      return;
    }

    if (datasetConfig?.datasetId) {

      const hasListenParamsToWait = listenParamsForInitialLoad.length > 0;
      const isReallyReady = parametersReady || (!hasListenParamsToWait || checkParametersReady(listenParamsForInitialLoad));

      if (hasListenParamsToWait && !isReallyReady) {
        return;
      }

      if (isInitialRender.current) {
        isInitialRender.current = false;
        fetchDataFromApi();
      } else if (prevDatasetId.current !== datasetConfig.datasetId) {
        fetchDataFromApi();
      }
      prevDatasetId.current = datasetConfig.datasetId;
      return;
    }

    if (useMockData && mockData.length > 0) {
      setData(mockData);
      setIsApiLoading(false);
      return;
    }

    if (Array.isArray(dataSource) && dataSource.length > 0) {
      setData(dataSource);
    } else {

      setData([]);
    }
    setIsApiLoading(false);

  }, [

    databaseDataSourceConfig?.datasourceId, 
    dataSource, 
    datasetConfig?.datasetId, 
    enhancedDataSource?.datasetId,
    useMockData, 
    stablePageParamsString, 
    parameterConfig?.enableParameterReceiving,
    stableRawParamsString,
    stableDataSourceFiltersString,

    listenParamsForInitialLoad,
    parametersReady,
    checkParametersReady

  ]);

  const handleFilterValueChange = (columnKey: string, value: string | string[]) => {
    setFilterValues(prev => ({
      ...prev,
      [columnKey]: Array.isArray(value) ? value : [value]
    }));
  };

  const queryDataFromApi = async (params: {
    page?: number;
    size?: number;
    includeFilter?: boolean;
  } = {}) => {
    const { page = currentPage, size = pageSize, includeFilter = true } = params;

    let parameterDataSourceFilterString = '';
    if (parameterConfig?.enableParameterReceiving && parameterConfig?.dataSourceFilters) {
      const dataSourceFilters = buildDataSourceFilters(
        parameterConfig.dataSourceFilters,
        rawParams 
      );

      if (Object.keys(dataSourceFilters).length > 0) {
        parameterDataSourceFilterString = buildParameterFilterString(dataSourceFilters);

      }
    }

    const columnFilterString = includeFilter ? buildFilterString() : '';

    const allFilters = [
      parameterDataSourceFilterString,   
      columnFilterString                 
    ].filter(Boolean);

    const mergedFilter = allFilters.length > 0 ? allFilters.join(' AND ') : '';

    const queryParams: DataSourceParams = {
      limit: size,
      offset: (page - 1) * size,
      outputFields: datasetConfig?.params?.outputFields || ['*']
    };

    const result = await queryDatasetData(datasetConfig!.datasetId, {
      ...queryParams,
      filter: mergedFilter
    });

    return result;
  };

  const fetchDataFromApi = async (forceFirstPage = false, targetPage?: number, targetPageSize?: number) => {
    // Assign to ref for forward reference
    fetchDataFromApiRef.current = fetchDataFromApi;

    if (isLoadDisabledRef.current) {
      console.warn('[TableRenderer] 数据加载已禁用，失败次数超过限制');
      return;
    }

    if (!datasetConfig?.datasetId) {
      toast({
        variant: "destructive",
        title: t('table.error', 'Error'),
        description: t('table.dataset_id_missing', 'Dataset ID not provided, unable to refresh data'),
      });
      return;
    }

    const pageToUse = forceFirstPage ? 1 : (targetPage ?? currentPage);
    const sizeToUse = targetPageSize ?? pageSize;

    setIsApiLoading(true);
    try {

      const result = await queryDataFromApi({
        page: pageToUse,
        size: sizeToUse,
        includeFilter: true
      });

      if (result?.success && result?.data) {

        loadFailureCountRef.current = 0;
        isLoadDisabledRef.current = false;

        if (Array.isArray(result.data)) {
          setData(result.data);

          // Prefer server pagination when present (same shape as DatasetPreview).
          const topLevelPagination = (result as { pagination?: PaginationType }).pagination;
          if (topLevelPagination) {
            setApiPaginationData(topLevelPagination);
          } else {
            setApiPaginationData({
              total: result.data.length,
              limit: sizeToUse,
              offset: (pageToUse - 1) * sizeToUse,
              current_page: pageToUse,
              total_pages: Math.ceil(result.data.length / sizeToUse) || 1,
              has_more: false
            });
          }
        } 

        else if (result.data && typeof result.data === 'object') {
          const responseData = result.data as any;

          if (responseData.data && Array.isArray(responseData.data.data)) {
            setData(responseData.data.data);

            if (responseData.data.pagination) {
              setApiPaginationData(responseData.data.pagination);
            }
          } else if (Array.isArray(responseData.data)) {
            // Standard dataset query payload: { ids, data: [...], pagination }
            setData(responseData.data);
            if (responseData.pagination) {
              setApiPaginationData(responseData.pagination);
            }
          } else if (Array.isArray(responseData)) {

            setData(responseData);
          } else {
            setData([]);
          }
        } else {
          setData([]);
        }

        if (onDataSourceChange) {
          const rd = result.data as unknown;
          let dataToPass: unknown[] = [];
          if (Array.isArray(rd)) {
            dataToPass = rd;
          } else if (rd && typeof rd === 'object') {
            const o = rd as { data?: unknown };
            const inner = o.data;
            if (inner && typeof inner === 'object' && 'data' in (inner as object)) {
              const nested = (inner as { data?: unknown[] }).data;
              if (Array.isArray(nested)) dataToPass = nested;
            } else if (Array.isArray(inner)) {
              dataToPass = inner;
            }
          }
          onDataSourceChange(dataToPass as TableDataType[]);
        }
      } else {

        loadFailureCountRef.current += 1;
        setData([]);

        if (loadFailureCountRef.current >= MAX_LOAD_FAILURES) {
          isLoadDisabledRef.current = true;
          toast({
            variant: "destructive",
            title: t('table.load_disabled', 'Load Disabled'),
            description: t('table.load_failed_too_many_times', `Data loading has been disabled after ${MAX_LOAD_FAILURES} consecutive failures. Please check your data source configuration.`),
          });
        } else {
          toast({
            variant: "destructive",
            title: t('table.load_failed', 'Load Failed'),
            description: result?.message || t('table.data_load_failed', 'Failed to load data'),
          });
        }
      }
    } catch (error: unknown) {
      console.error('加载数据失败:', error);

      loadFailureCountRef.current += 1;
      const errorMessage = error instanceof Error ? error.message : t('table.data_load_failed', 'Failed to load data');

      if (loadFailureCountRef.current >= MAX_LOAD_FAILURES) {
        isLoadDisabledRef.current = true;
        toast({
          variant: "destructive",
          title: t('table.load_disabled', 'Load Disabled'),
          description: t('table.load_failed_too_many_times', `Data loading has been disabled after ${MAX_LOAD_FAILURES} consecutive failures. Please check your data source configuration.`),
        });
      } else {
        toast({
          variant: "destructive",
          title: t('table.load_failed', 'Load Failed'),
          description: errorMessage,
        });
      }
      setData([]);
    } finally {
      setIsApiLoading(false);
    }
  };

  const handleRefresh = async () => {    
    resetAllFilters();

    loadFailureCountRef.current = 0;
    isLoadDisabledRef.current = false;

    try {

      if (enhancedDataSource?.datasetId) {
        void enhancedRefresh({ page: currentPage, pageSize });
        toast({
          title: t('table.refresh_success', 'Refresh Success'),
          description: t('table.data_reloaded', 'Data has been reloaded'),
        });
        return;
      }

      if (databaseDataSourceConfig?.datasourceId) {
        setIsApiLoading(true);
        try {

          const offset = (currentPage - 1) * pageSize;
          await refetchDatabaseData({
            page: currentPage,
            limit: pageSize,
            offset
          });

          loadFailureCountRef.current = 0;
          isLoadDisabledRef.current = false;
          toast({
            title: t('table.refresh_success', 'Refresh Success'),
            description: t('table.database_data_reloaded', 'Database data source has been reloaded'),
          });
        } catch (error) {
          console.error('[TableRenderer] 数据库数据源刷新失败:', error);

          loadFailureCountRef.current += 1;
          if (loadFailureCountRef.current >= MAX_LOAD_FAILURES) {
            isLoadDisabledRef.current = true;
            toast({
              variant: "destructive",
              title: t('table.load_disabled', 'Load Disabled'),
              description: t('table.load_failed_too_many_times', `Data loading has been disabled after ${MAX_LOAD_FAILURES} consecutive failures. Please check your data source configuration.`),
            });
          }
          throw error;
        } finally {
          setIsApiLoading(false);
        }
        return;
      }

      if (datasetConfig?.datasetId) {

        await fetchDataFromApi(false, currentPage, pageSize);
      } 

      else if (useMockData && mockData.length > 0) {
        setIsApiLoading(true);
        setData(mockData);
          toast({
            title: t('table.refresh_success', 'Refresh Success'),
            description: t('table.mock_data_reloaded', 'Mock data has been reloaded'),
          });
        setIsApiLoading(false);
      } 

      else {
        setIsApiLoading(true);

        if (dataSource && dataSource.length > 0) {
          setData(dataSource);
          toast({
            title: t('table.refresh_success', 'Refresh Success'),
            description: t('table.data_reloaded', 'Data has been reloaded'),
          });
        } else {

          setData([]);
          toast({
            title: t('table.refresh_completed', 'Refresh Completed'),
            description: t('table.no_data_to_display', 'No data to display'),
          });
        }
        setIsApiLoading(false);
      }
    } catch (error) {
      console.error('刷新数据失败:', error);
        toast({
          variant: "destructive",
          title: t('table.refresh_failed', 'Refresh Failed'),
          description: error instanceof Error ? error.message : t('table.refresh_data_failed', 'Failed to refresh data'),
        });
      setIsApiLoading(false);
    }
  };

  const fetchAllDataForExport = async (
    onProgress: (current: number, total: number) => void
  ): Promise<TableDataType[]> => {

    if (enhancedDataSource?.datasetId) {
      try {        

        const exportPageSize = 1000;
        let allData: TableDataType[] = [];
        let totalCount = 0;

        const { queryDatasetData } = await import('@/app/services/workbenchApi');

        const queryParams = {
          limit: 1,
          offset: 0,
          outputFields: enhancedDataSource.params?.outputFields || ['*']
        };

        let parameterDataSourceFilterString = '';
        if (parameterConfig?.enableParameterReceiving && parameterConfig?.dataSourceFilters) {
          const dataSourceFilters = buildDataSourceFilters(
            parameterConfig.dataSourceFilters,
            rawParams
          );
          if (Object.keys(dataSourceFilters).length > 0) {
            parameterDataSourceFilterString = buildParameterFilterString(dataSourceFilters);
          }
        }

        const columnFilterString = buildFilterString();

        const configFilter = (enhancedDataSource.params?.filter as string) || '';

        const allFilters = [
          parameterDataSourceFilterString,   
          columnFilterString,                
          configFilter                       
        ].filter(Boolean);

        const filter = allFilters.length > 0 ? allFilters.join(' AND ') : '';

        const firstResponse = await queryDatasetData(enhancedDataSource.datasetId, {
          ...queryParams,
          filter
        });

        if (firstResponse?.data && Array.isArray(firstResponse.data) && firstResponse.data.length > 0) {

          let currentExportPage = 1;
          let hasMore = true;

          while (hasMore) {
            const offset = (currentExportPage - 1) * exportPageSize;

            const exportQueryParams = {
              limit: Number(exportPageSize),  
              offset: Number(offset),  
              outputFields: enhancedDataSource.params?.outputFields || ['*']
            };

            const response = await queryDatasetData(enhancedDataSource.datasetId, {
              ...exportQueryParams,
              filter  
            });

            if (response?.data) {
              const pageData = Array.isArray(response.data) ? response.data : [];
              allData = [...allData, ...pageData];

              if (totalCount === 0 && currentExportPage === 1) {

                totalCount = pageData.length < exportPageSize ? allData.length : allData.length * 2;
              }

              if (pageData.length < exportPageSize && totalCount < allData.length) {
                totalCount = allData.length;
              }

              onProgress(allData.length, totalCount || allData.length);
              hasMore = pageData.length === exportPageSize;
              currentExportPage++;

              await new Promise(resolve => setTimeout(resolve, 100));
            } else {
              hasMore = false;
            }
          }
        }

        return allData;
      } catch (error) {
        console.warn('增强数据源导出失败，使用当前页面数据:', error);
        const currentData = Array.isArray(data) ? data : [];
        onProgress(currentData.length, currentData.length);
        return currentData;
      }
    }

    if (databaseDataSourceConfig?.datasourceId) {
      try {

        const exportPageSize = 1000;
        let allData: TableDataType[] = [];
        let totalCount = 0;

        const apiClient = (await import('@/lib/api/apiClient')).default;

        const buildExportRequestParams = (page: number, limit: number) => {
          return buildDatabaseRequestParams(page, limit, true);
        };

        const firstRequestParams = buildExportRequestParams(1, 1);

        const firstResponse = await apiClient.post(
          withDatasourceVersion(
            `/datasources/${databaseDataSourceConfig.datasourceId}/data`,
            resolveRuntimeDatasourceVersion(databaseDataSourceConfig.datasourceId, databaseDataSourceConfig.version)
          ),
          firstRequestParams
        );

        if (firstResponse.success && firstResponse.data) {
          const responseData = firstResponse.data as any;

          if (responseData.pagination && responseData.pagination.total !== undefined) {
            totalCount = responseData.pagination.total;
          } else if (responseData.metadata && responseData.metadata.rowCount) {
            totalCount = responseData.metadata.rowCount;
          } else {
            console.warn('[Export] 数据库数据源第一次请求未获取到总数，将在后续请求中尝试获取');
          }
        } else {
          console.warn('[Export] 数据库数据源第一次请求失败，将在后续请求中尝试获取总数');
        }

        if (totalCount > 0 || firstResponse.success) {

          let currentExportPage = 1;
          let hasMore = true;
          const totalPages = totalCount > 0 ? Math.ceil(totalCount / exportPageSize) : 0;

          while (hasMore) {

            const requestParams = buildExportRequestParams(currentExportPage, exportPageSize);

            const response = await apiClient.post(
              withDatasourceVersion(
                `/datasources/${databaseDataSourceConfig.datasourceId}/data`,
                resolveRuntimeDatasourceVersion(databaseDataSourceConfig.datasourceId, databaseDataSourceConfig.version)
              ),
              requestParams
            );

            if (response.success && response.data) {
              const responseData = response.data as any;

              if (totalCount === 0) {
                if (responseData.pagination && responseData.pagination.total !== undefined) {
                  totalCount = responseData.pagination.total;
                } else if (responseData.metadata && responseData.metadata.rowCount) {
                  totalCount = responseData.metadata.rowCount;
                }
              }

              if (responseData.data && Array.isArray(responseData.data)) {
                const pageData = responseData.data;
                allData = [...allData, ...pageData];

                if (totalCount === 0 && currentExportPage === 1) {
                  totalCount = pageData.length < exportPageSize ? allData.length : allData.length * 2;
                }

                if (pageData.length < exportPageSize && totalCount < allData.length) {
                  totalCount = allData.length;
                }

                onProgress(allData.length, totalCount || allData.length);

                if (pageData.length < exportPageSize) {

                  hasMore = false;
                } else if (totalCount > 0 && allData.length >= totalCount) {

                  hasMore = false;
                } else {

                  hasMore = true;
                  currentExportPage++;
                  await new Promise(resolve => setTimeout(resolve, 100)); 
                }
              } else if (responseData.data?.rows && Array.isArray(responseData.data.rows)) {

                const pageData = responseData.data.rows;
                allData = [...allData, ...pageData];

                if (totalCount === 0 && currentExportPage === 1) {
                  totalCount = pageData.length < exportPageSize ? allData.length : allData.length * 2;
                }

                if (pageData.length < exportPageSize && totalCount < allData.length) {
                  totalCount = allData.length;
                }

                onProgress(allData.length, totalCount || allData.length);

                if (pageData.length < exportPageSize) {
                  hasMore = false;
                } else if (totalCount > 0 && allData.length >= totalCount) {
                  hasMore = false;
                } else {
                  hasMore = pageData.length === exportPageSize;
                  if (hasMore) {
                    currentExportPage++;
                    await new Promise(resolve => setTimeout(resolve, 100));
                  }
                }
              } else {
                console.warn('[Export] 数据库数据源响应格式不正确，结束获取');
                hasMore = false;
              }
            } else {
              console.warn(`[Export] 数据库数据源第 ${currentExportPage} 页请求失败，结束获取`);
              hasMore = false;
            }
          }
        } else {
          console.warn('[Export] 数据库数据源第一次请求失败且无法继续，使用当前页面数据');
          const currentData = Array.isArray(data) ? data : [];
          onProgress(currentData.length, currentData.length);
          return currentData;
        }

        return allData;
      } catch (error) {
        console.warn('数据库数据源导出失败，使用当前页面数据:', error);
        const currentData = Array.isArray(data) ? data : [];
        onProgress(currentData.length, currentData.length);
        return currentData;
      }
    }

    if (datasetConfig?.datasetId) {
      try {
        const exportPageSize = 1000;
        let allData: TableDataType[] = [];
        let totalCount = 0;

        const firstResult = await queryDataFromApi({
          page: 1,
          size: 1,
          includeFilter: true 
        });

        let hasDataToExport = false;

        if (firstResult?.success && firstResult?.data) {

          if (Array.isArray(firstResult.data) && firstResult.data.length > 0) {
            hasDataToExport = true;
          } 

          else if (firstResult.data && typeof firstResult.data === 'object') {
            const responseData = firstResult.data as any;

            if (responseData.pagination?.total) {
              totalCount = responseData.pagination.total;
              hasDataToExport = true;
            } else if (Array.isArray(responseData.data) && responseData.data.length > 0) {
              hasDataToExport = true;
            }
          }
        }

        if (totalCount === 0 && apiPaginationData?.total) {
          totalCount = apiPaginationData.total;
          hasDataToExport = true;
        }

        if (totalCount === 0) {
          console.warn('[Export] 数据集未获取到分页信息，将逐步获取数据');
        }

        if (hasDataToExport) {

          let currentExportPage = 1;
          let hasMore = true;

          while (hasMore) {

            const result = await queryDataFromApi({
              page: currentExportPage,
              size: exportPageSize,
              includeFilter: true 
            });

            let pageData: TableDataType[] = [];

            if (result?.success && result?.data) {

              if (Array.isArray(result.data)) {
                pageData = result.data;
              } 

              else if (result.data && typeof result.data === 'object') {
                const responseData = result.data as any;

                if (responseData.pagination && responseData.pagination.total !== undefined && totalCount === 0) {
                  totalCount = responseData.pagination.total;
                }

                if (Array.isArray(responseData.data)) {
                  pageData = responseData.data;

                  if (responseData.pagination && responseData.pagination.total !== undefined) {
                    if (totalCount === 0) {
                      totalCount = responseData.pagination.total;
                    }
                  }
                } else if (Array.isArray(responseData)) {

                  pageData = responseData;
                }
              }

              if (pageData.length > 0) {
                allData = [...allData, ...pageData];

                if (totalCount === 0 && currentExportPage === 1) {

                  if (result.data && typeof result.data === 'object') {
                    const responseData = result.data as any;
                    if (responseData.pagination && responseData.pagination.total !== undefined) {
                      totalCount = responseData.pagination.total;
                    } else {

                      totalCount = pageData.length < exportPageSize ? allData.length : allData.length * 2;
                    }
                  } else {

                    totalCount = pageData.length < exportPageSize ? allData.length : allData.length * 2;
                  }
                }

                if (pageData.length < exportPageSize && totalCount < allData.length) {
                  totalCount = allData.length;
                }

                onProgress(allData.length, totalCount || allData.length);

                hasMore = pageData.length === exportPageSize;
                currentExportPage++;

                await new Promise(resolve => setTimeout(resolve, 100));
              } else {
                hasMore = false;
              }
            } else {
              hasMore = false;
            }
          }
        }

        return allData;
      } catch (error) {
        console.error('Export data fetch error:', error);
        throw new Error(t('table.data_fetch_failed', 'Data fetch failed'));
      }
    }

    if (useMockData && mockData.length > 0) {
      const mockDataArray = Array.isArray(mockData) ? mockData : [];
      onProgress(mockDataArray.length, mockDataArray.length);
      return mockDataArray;
    }

    if (dataSource && dataSource.length > 0) {
      const dataSourceArray = Array.isArray(dataSource) ? dataSource : [];
      onProgress(dataSourceArray.length, dataSourceArray.length);
      return dataSourceArray;
    }

    const currentData = Array.isArray(data) ? data : [];
    onProgress(currentData.length, currentData.length);
    return currentData;
  };

  const handleExport = async () => {
    if (!enableExport) {
      toast({
        title: t('table.export_not_enabled', 'Export feature not enabled'),
        description: t('table.enable_export_in_config', 'Please enable export feature in component configuration'),
        variant: "destructive"
      });
      return;
    }

    const hasDataSource = !!(
      enhancedDataSource?.datasetId ||
      databaseDataSourceConfig?.datasourceId ||
      datasetConfig?.datasetId ||
      (useMockData && mockData.length > 0) ||
      (dataSource && dataSource.length > 0) ||
      (data && data.length > 0)
    );

    if (!hasDataSource) {
      toast({
        title: t('table.cannot_export', 'Cannot export'),
        description: t('table.no_data_source_or_data', 'Table has no data source configured or no available data, cannot perform export operation'),
        variant: "destructive"
      });
      return;
    }

    setExportState(prev => ({
      ...prev,
      isExporting: true,
      showProgress: true,
      progress: 0,
      currentCount: 0,
      totalCount: 0
    }));

    try {
      const allData = await fetchAllDataForExport((current, total) => {
        const progress = total > 0 ? (current / total) * 100 : 0;
        setExportState(prev => ({
          ...prev,
          progress,
          currentCount: current,
          totalCount: total
        }));
      });

      // Check data field and column configuration matching
      if (allData.length > 0) {
        const dataFields = Object.keys(allData[0]);
        const columnDataIndexes = columns.map(col => col.dataIndex);
        const unmatchedColumns = columnDataIndexes.filter(dataIndex => !dataFields.includes(dataIndex));
        const unmatchedDataFields = dataFields.filter(field => !columnDataIndexes.includes(field));

        if (unmatchedColumns.length > 0) {
          console.warn('[Export] Warning: The following column configurations have dataIndex that cannot be found in data:', unmatchedColumns);
        }
      }

      const csvContent = CSVFormatter.generateCSV(allData, columns, true);

      const timestamp = new Date().toISOString().split('T')[0];
      let filename = '';

      if (enhancedDataSource?.datasetId) {
        filename = `enhanced_${enhancedDataSource.datasetId.slice(-8)}_${timestamp}.csv`;
      } else if (databaseDataSourceConfig?.datasourceId) {
        filename = `database_${databaseDataSourceConfig.datasourceId.slice(-8)}_${timestamp}.csv`;
      } else if (datasetConfig?.datasetId) {
        filename = `dataset_${datasetConfig.datasetId.slice(-8)}_${timestamp}.csv`;
      } else if (useMockData) {
        filename = `mock_data_${timestamp}.csv`;
      } else {
        filename = `table_export_${timestamp}.csv`;
      }

      CSVFormatter.downloadCSV(csvContent, filename);

      let dataSourceType = '';
      if (enhancedDataSource?.datasetId) {
        dataSourceType = t('table.enhanced_data_source', 'Enhanced Data Source');
      } else if (databaseDataSourceConfig?.datasourceId) {
        dataSourceType = t('table.database_data_source', 'Database Data Source');
      } else if (datasetConfig?.datasetId) {
        dataSourceType = t('table.dataset', 'Dataset');
      } else if (useMockData) {
        dataSourceType = t('table.mock_data', 'Mock Data');
      } else {
        dataSourceType = t('table.table_data', 'Table Data');
      }

      toast({
        title: t('table.export_success', 'Export successful'),
        description: t('table.export_success_description', 'Successfully exported {{type}} {{count}} records', { type: dataSourceType, count: allData.length }),
      });

    } catch (error) {
      console.error('导出失败:', error);
      toast({
        variant: "destructive",
        title: t('table.export_failed', 'Export failed'),
        description: error instanceof Error ? error.message : t('table.export_error_occurred', 'An error occurred during export'),
      });
    } finally {
      setExportState(prev => ({
        ...prev,
        isExporting: false,
        showProgress: false
      }));
    }
  };

  const handleAdd = () => {
    const initialFormData: Record<string, unknown> = {};
    columns.forEach(column => {
      if (column.editable) {
        initialFormData[column.dataIndex] = '';
      }
    });

    setFormData(initialFormData);
    setIsAddDialogOpen(true);
  };

  const handleAddSubmit = async () => {

    if (datasetConfig?.datasetId) {
      setIsApiLoading(true);
      try {

        const useAutoId = datasetConfig.useAutoId !== undefined ? datasetConfig.useAutoId : true;

        const dataToInsert = processInsertDataWithAutoId(
          formData, 
          rowKey, 
          useAutoId
        );

        const responseData = await insertDatasetData(datasetConfig.datasetId, [dataToInsert]);

        if (responseData?.success) {
          toast({
            title: t('table.add_success', 'Add successful'),
            description: t('table.record_added', 'New record has been added'),
          });
          await fetchDataFromApi();
        } else {
          toast({
            variant: "destructive",
            title: t('table.add_failed', 'Add failed'),
            description: responseData?.message || t('table.add_data_failed', 'Failed to add data'),
          });
        }
      } catch (error: unknown) {
        console.error('添加数据失败:', error);
        const errorMessage = error instanceof Error ? error.message : t('table.add_data_failed', 'Failed to add data');
        toast({
          variant: "destructive",
          title: t('table.add_failed', 'Add failed'),
          description: errorMessage,
        });
      } finally {
        setIsApiLoading(false);
      }
    } 

    else {

      const newId = formData[rowKey] || Date.now();

      const newRecord = {
        ...formData,
        [rowKey]: newId,
      };

      const newData = [...data, newRecord];
      setData(newData);

      if (onDataSourceChange) {
        onDataSourceChange(newData);
      }

      toast({
        title: t('table.add_success', 'Add successful'),
        description: t('table.record_added_to_local', 'New record has been added to local data'),
      });
    }

    setIsAddDialogOpen(false);
    setFormData({});
  };

  const handleRowSelect = useCallback((record: TableDataType) => {

    let recordId: string | number;
    if (record[rowKey] !== undefined && record[rowKey] !== null) {
      recordId = record[rowKey] as string | number;
    } else {

      const possibleIdKeys = ['id', '_id', 'ID', 'Id', 'key', 'Key'];
      const foundIdKey = possibleIdKeys.find(key => record[key] !== undefined && record[key] !== null);
      if (foundIdKey) {
        recordId = record[foundIdKey] as string | number;
      } else {
        return;
      }
    }

    const normalizedId = typeof recordId === 'number' ? String(recordId) : recordId;

    setSelectedRowIds(prevIds => {
      const isSelected = prevIds.some(id =>
        String(id) === normalizedId || id === recordId
      );

      if (isSelected) {

        return prevIds;
      } else {

        return [recordId];
      }
    });
  }, [rowKey, id]);

  // Multi-select toggles for the checkbox selection column. handleRowSelect above
  // is single-select (row-click); checkboxes add/remove ids so a user can select
  // several rows for a batch action.
  const toggleRowSelection = useCallback((record: TableDataType) => {
    const rid = record[rowKey];
    if (rid === undefined || rid === null) return;
    setSelectedRowIds(prev =>
      prev.some(id => String(id) === String(rid))
        ? prev.filter(id => String(id) !== String(rid))
        : [...prev, rid as string | number]
    );
  }, [rowKey]);

  const toggleSelectAllOnPage = useCallback(() => {
    const ids = data.map(r => r[rowKey]).filter(v => v !== undefined && v !== null) as (string | number)[];
    setSelectedRowIds(prev => {
      const allSelected = ids.length > 0 && ids.every(rid => prev.some(id => String(id) === String(rid)));
      if (allSelected) {
        const s = new Set(ids.map(String));
        return prev.filter(id => !s.has(String(id)));
      }
      const merged = [...prev];
      for (const rid of ids) if (!merged.some(id => String(id) === String(rid))) merged.push(rid);
      return merged;
    });
  }, [data, rowKey]);

  const selectedIdSet = useMemo(() => new Set(selectedRowIds.map(String)), [selectedRowIds]);
  const pageSelectableIds = data.map(r => r[rowKey]).filter(v => v !== undefined && v !== null).map(String);
  const allPageSelected = pageSelectableIds.length > 0 && pageSelectableIds.every(x => selectedIdSet.has(x));
  const somePageSelected = !allPageSelected && pageSelectableIds.some(x => selectedIdSet.has(x));

  useEffect(() => {

    const commConfig = componentParameterConfig || (parameterConfig as any);
    if (!commConfig?.enableCommunication || !commConfig?.enableEmit) {
      return;
    }

    const triggers = commConfig?.triggers || {};

    if (!triggers['onRowSelect']?.enabled) {
      return;
    }

    const selectedRows = data.filter(row => {
      const rowId = row[rowKey] as string | number;
      if (rowId === undefined || rowId === null) return false;

      return selectedRowIds.some(id =>
        String(id) === String(rowId) || id === rowId
      );
    });

    const selectedRowData = selectedRows.length === 0
      ? null
      : selectedRows.length === 1
        ? selectedRows[0]
        : selectedRows;

    const triggerParams = triggers['onRowSelect']?.parameters || ['selectedRowData', 'selectedRowIds'];

    setTimeout(() => {
      const tableId = id || 'table';
      const paramsToEmit: Record<string, any> = {};

      if (triggerParams.includes('selectedRowData')) {
        emit('selectedRowData', selectedRowData);

        if (selectedRowData && typeof selectedRowData === 'object' && !Array.isArray(selectedRowData)) {
          Object.entries(selectedRowData).forEach(([fieldName, fieldValue]) => {
            const paramName = `table_${tableId}_selectedRowData_${fieldName}`;
            paramsToEmit[paramName] = fieldValue;
          });

          previousSelectedRowDataRef.current = selectedRowData;

        } else if (selectedRowData === null) {

          if (previousSelectedRowDataRef.current && typeof previousSelectedRowDataRef.current === 'object') {
            Object.keys(previousSelectedRowDataRef.current).forEach((fieldName) => {
              const paramName = `table_${tableId}_selectedRowData_${fieldName}`;
              paramsToEmit[paramName] = null;
            });
          }
          previousSelectedRowDataRef.current = null;
        }
      }

      if (triggerParams.includes('selectedRowIds')) {
        emit('selectedRowIds', selectedRowIds);
      }

      if (Object.keys(paramsToEmit).length > 0) {
        emitBatch(paramsToEmit);

        const parameterKeys = Object.keys(paramsToEmit);
        markParametersReady(parameterKeys);
      }
    }, 0);
  }, [selectedRowIds, data, rowKey, componentParameterConfig, parameterConfig, emit, emitBatch, markParametersReady, id]);

  const handleEdit = (record: TableDataType) => {
    setSelectedRecord(record);
    const editFormData: Record<string, unknown> = {};
    columns.forEach(column => {
      if (column.editable) {
        editFormData[column.dataIndex] = record[column.dataIndex];
      }
    });

    setFormData(editFormData);
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedRecord) return;

    if (datasetConfig?.datasetId) {
      setIsApiLoading(true);
      try {
        const recordId = selectedRecord[rowKey];

        const updateData = { ...formData };
        delete updateData[rowKey];

        const responseData = await updateDatasetData(
          datasetConfig.datasetId,
          `${rowKey}=${recordId}`,
          updateData
        );

        if (responseData?.success) {
          toast({
            title: t('table.edit_success', 'Edit successful'),
            description: t('table.record_updated', 'Record has been updated'),
          });
          await fetchDataFromApi();
        } else {
          toast({
            variant: "destructive",
            title: t('table.edit_failed', 'Edit failed'),
            description: responseData?.message || t('table.update_data_failed', 'Failed to update data'),
          });
        }
      } catch (error: unknown) {
        console.error('更新数据失败:', error);
        const errorMessage = error instanceof Error ? error.message : t('table.update_data_failed', 'Failed to update data');
        toast({
          variant: "destructive",
          title: t('table.edit_failed', 'Edit failed'),
          description: errorMessage,
        });
      } finally {
        setIsApiLoading(false);
      }
    } else {
      const newData = data.map(item => 
        item[rowKey] === selectedRecord[rowKey] ? { ...item, ...formData } : item
      );

      setData(newData);
      if (onDataSourceChange) {
        onDataSourceChange(newData);
      }

      toast({
        title: t('table.edit_success', 'Edit successful'),
        description: t('table.record_updated_locally', 'Record has been updated locally'),
      });
    }

    setIsEditDialogOpen(false);
    setSelectedRecord(null);
    setFormData({});
  };

  const handleDelete = (record: TableDataType) => {
    setSelectedRecord(record);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRecord) return;

    if (datasetConfig?.datasetId) {
      setIsApiLoading(true);
      try {
        const recordId = selectedRecord[rowKey];
        const responseData = await deleteDatasetData(
          datasetConfig.datasetId,
          `${rowKey}==${recordId}`
        );

        if (responseData?.success) {
          // Optimistically drop the row (a re-fetch may briefly still return it
          // due to vector-store eventual consistency).
          const next = data.filter(item => String(item[rowKey]) !== String(recordId));
          setData(next);
          if (onDataSourceChange) onDataSourceChange(next);
          toast({
            title: t('table.delete_success', 'Delete successful'),
            description: t('table.record_deleted', 'Record has been deleted'),
          });
        } else {
          toast({
            variant: "destructive",
            title: t('table.delete_failed', 'Delete failed'),
            description: responseData?.message || t('table.delete_data_failed', 'Failed to delete data'),
          });
        }
      } catch (error: unknown) {
        console.error('删除数据失败:', error);
        const errorMessage = error instanceof Error ? error.message : t('table.delete_data_failed', 'Failed to delete data');
        toast({
          variant: "destructive",
          title: t('table.delete_failed', 'Delete failed'),
          description: errorMessage,
        });
      } finally {
        setIsApiLoading(false);
      }
    } else {
      const newData = data.filter(item => item[rowKey] !== selectedRecord[rowKey]);
      setData(newData);
      if (onDataSourceChange) {
        onDataSourceChange(newData);
      }

      toast({
        title: t('table.delete_success', 'Delete successful'),
        description: t('table.record_deleted_from_local', 'Record has been deleted from local data'),
      });
    }

    setIsDeleteDialogOpen(false);
    setSelectedRecord(null);
  };

  // Delete all currently-selected rows. For dataset-bound tables each row is
  // removed by its `rowKey` (mirrors the single-row delete filter); local tables
  // just drop the rows from state. Reports partial failures rather than hiding them.
  const handleBatchDeleteConfirm = async () => {
    const ids = [...selectedRowIds];
    if (ids.length === 0) {
      setIsBatchDeleteDialogOpen(false);
      return;
    }

    if (datasetConfig?.datasetId) {
      setIsApiLoading(true);
      let ok = 0;
      let failed = 0;
      const deletedIds = new Set<string>();
      try {
        for (const id of ids) {
          try {
            const res = await deleteDatasetData(datasetConfig.datasetId, `${rowKey}==${id}`);
            if (res?.success) {
              ok++;
              deletedIds.add(String(id));
            } else {
              failed++;
            }
          } catch {
            failed++;
          }
        }
        // Optimistically drop the deleted rows so they disappear immediately — a
        // re-fetch can still briefly return them due to vector-store eventual
        // consistency, which is why a manual refresh was needed before.
        if (deletedIds.size > 0) {
          const next = data.filter(row => !deletedIds.has(String(row[rowKey])));
          setData(next);
          if (onDataSourceChange) onDataSourceChange(next);
        }
        if (failed === 0) {
          toast({
            title: t('table.delete_success', 'Delete successful'),
            description: t('table.records_deleted_n', '{{count}} record(s) deleted', { count: ok }),
          });
        } else {
          toast({
            variant: 'destructive',
            title: t('table.delete_partial', 'Some deletions failed'),
            description: t('table.records_deleted_partial', '{{ok}} deleted, {{failed}} failed', { ok, failed }),
          });
        }
        setSelectedRowIds([]);
      } finally {
        setIsApiLoading(false);
      }
    } else {
      const idSet = new Set(ids.map(String));
      const newData = data.filter(item => !idSet.has(String(item[rowKey])));
      setData(newData);
      if (onDataSourceChange) onDataSourceChange(newData);
      setSelectedRowIds([]);
      toast({
        title: t('table.delete_success', 'Delete successful'),
        description: t('table.records_deleted_from_local', '{{count}} record(s) deleted from local data', { count: ids.length }),
      });
    }

    setIsBatchDeleteDialogOpen(false);
  };

  const handleFormChange = (field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleJsonFormChange = (field: string, value: string) => {
    try {
      // Try to parse the value as JSON to validate it
      const parsedJson = JSON.parse(value);
      setFormData(prev => ({
        ...prev,
        [field]: parsedJson
      }));
    } catch {
      // If the JSON is invalid, just store the raw string value
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const formatJsonForEditing = (jsonData: unknown): string => {
    try {
      if (typeof jsonData === 'string') {
        // Try to parse if it's a string
        try {
          const parsed = JSON.parse(jsonData);
          return JSON.stringify(parsed, null, 2);
        } catch {
          // If not valid JSON string, return as is
          return jsonData;
        }
      } else {
        // If it's already an object, stringify it with formatting
        return JSON.stringify(jsonData, null, 2);
      }
    } catch {
      return '';
    }
  };

  const dataWithPatches = useMemo((): TableDataType[] => {
    if (!rowDisplayPatches || Object.keys(rowDisplayPatches).length === 0) {
      return data;
    }
    return data.map((row, index) => {
      const rec = row as Record<string, unknown>;
      const rid = rec[rowKey] != null && rec[rowKey] !== undefined
        ? String(rec[rowKey])
        : `__row_${index}`;
      const p = rowDisplayPatches[rid];
      return p ? ({ ...rec, ...p } as TableDataType) : row;
    });
  }, [data, rowKey, rowDisplayPatches]);

  const visibleColumnsWithDynamicHeaders = useMemo(() => {
    const base = columns.filter((column) => !column.hidden);
    const rawFirst =
      Array.isArray(dataWithPatches) && dataWithPatches.length > 0 ? dataWithPatches[0] : undefined;
    const firstRow =
      rawFirst !== null && typeof rawFirst === 'object' && !Array.isArray(rawFirst)
        ? (rawFirst as Record<string, unknown>)
        : undefined;
    if (!firstRow) return base;
    return base.map((col) => {
      const hf = col.headerLabelField?.trim();
      if (!hf) return col;
      const raw = firstRow[hf];
      if (raw === null || raw === undefined || raw === '') return col;
      return { ...col, title: String(raw) };
    });
  }, [columns, dataWithPatches]);

  /** Frozen columns first (left); remaining columns scroll horizontally */
  const visibleColumnsForTable = useMemo(() => {
    let cols = visibleColumnsWithDynamicHeaders;
    // Mobile 'freeze first column' toggle: if the config didn't mark any column frozen, freeze the
    // leading column so it stays put under horizontal scroll (matches the sticky header). If the
    // first column is a narrow rank/index gutter (#, No, Rank...), also freeze the next column so
    // the actual identifier (e.g. store name) stays visible too.
    if (stickyHeaderOn && cols.length > 0 && !cols.some((c) => c.frozen)) {
      const titleText = (c: typeof cols[number]): string => {
        const tt = (c as { title?: unknown }).title;
        const s = typeof tt === 'string' ? tt : ((tt as { zh?: string; en?: string })?.zh || (tt as { en?: string })?.en || '');
        return String(s).trim().toLowerCase();
      };
      // A leading rank/index gutter column (e.g. '#') — detected by header text or dataIndex.
      const RANK_HEADERS = ['#', 'no', 'no.', 'rank'];
      const RANK_KEYS = ['index', 'rank', 'no', 'seq', 'rownum', 'row_num', 'rank_no'];
      const firstIsRank =
        cols.length > 1 &&
        (RANK_HEADERS.includes(titleText(cols[0])) ||
          RANK_KEYS.includes(String((cols[0] as { dataIndex?: unknown }).dataIndex ?? '').toLowerCase()));
      const freezeUpTo = firstIsRank ? 2 : 1;
      cols = cols.map((c, i) => (i < freezeUpTo ? { ...c, frozen: true } : c));
    }
    const frozen = cols.filter((c) => Boolean(c.frozen));
    const rest = cols.filter((c) => !c.frozen);
    return [...frozen, ...rest];
  }, [visibleColumnsWithDynamicHeaders, stickyHeaderOn]);

  const frozenColumnCount = useMemo(
    () => visibleColumnsForTable.filter((c) => c.frozen).length,
    [visibleColumnsForTable]
  );

  // When any column declares an explicit width, switch the table to `table-fixed` so those widths
  // are honored exactly (table-auto only treats width as a hint it grows to fill the table).
  const hasExplicitColumnWidths = useMemo(
    () => visibleColumnsForTable.some((c) => c.width != null),
    [visibleColumnsForTable]
  );

  const frozenStickyLeftFallbackPx = useMemo(() => {
    if (frozenColumnCount === 0) return [] as number[];
    const lefts: number[] = [];
    let acc = 0;
    for (let i = 0; i < frozenColumnCount; i++) {
      lefts.push(acc);
      const col = visibleColumnsForTable[i];
      let w = 120;
      if (typeof col.width === 'number') w = col.width;
      else if (typeof col.minWidth === 'number') w = col.minWidth;
      acc += w;
    }
    return lefts;
  }, [frozenColumnCount, visibleColumnsForTable]);

  const frozenHeaderRowRef = useRef<HTMLTableRowElement>(null);
  const [frozenStickyLeftPx, setFrozenStickyLeftPx] = useState<number[]>([]);

  const measureFrozenStickyLefts = useCallback(() => {
    const row = frozenHeaderRowRef.current;
    if (!row || frozenColumnCount === 0) {
      setFrozenStickyLeftPx([]);
      return;
    }
    const cells = row.querySelectorAll('th');
    const lefts: number[] = [];
    let acc = 0;
    for (let i = 0; i < frozenColumnCount; i++) {
      lefts.push(acc);
      const el = cells[i] as HTMLElement | undefined;
      acc += el?.getBoundingClientRect().width ?? 0;
    }
    setFrozenStickyLeftPx(lefts);
  }, [frozenColumnCount]);

  const getFrozenStickyLeftPx = useCallback(
    (colIndex: number) => {
      if (colIndex >= frozenColumnCount) return undefined;
      const m = frozenStickyLeftPx[colIndex];
      if (typeof m === 'number') return m;
      return frozenStickyLeftFallbackPx[colIndex] ?? 0;
    },
    [frozenColumnCount, frozenStickyLeftPx, frozenStickyLeftFallbackPx]
  );

  useLayoutEffect(() => {
    measureFrozenStickyLefts();
  }, [
    measureFrozenStickyLefts,
    visibleColumnsForTable,
    dataWithPatches,
    loading,
    isApiLoading,
    databaseLoading,
  ]);

  useEffect(() => {
    window.addEventListener('resize', measureFrozenStickyLefts);
    return () => window.removeEventListener('resize', measureFrozenStickyLefts);
  }, [measureFrozenStickyLefts]);

  const getCurrentPageData = () => {

    if (datasetConfig?.datasetId || databaseDataSourceConfig?.datasourceId || enhancedDataSource?.datasetId) {
      return dataWithPatches;
    }

    if (!pagination) {
      return dataWithPatches;
    }

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const slicedData = Array.isArray(dataWithPatches) ? dataWithPatches.slice(startIndex, endIndex) : [];

    return slicedData;
  };

  const totalPages = apiPaginationData?.total_pages || 

    (apiPaginationData?.total ? Math.ceil(apiPaginationData.total / pageSize) : 
      (effectivePagination ? Math.ceil((effectivePagination.total || (data?.length || 0)) / pageSize) : 1));

  const totalRecords = apiPaginationData?.total || 
    (effectivePagination?.total || (data?.length || 0));

  useEffect(() => {
    const newTotalPages = apiPaginationData?.total_pages || 
      (apiPaginationData?.total
        ? Math.ceil(apiPaginationData.total / pageSize)
        : effectivePagination
          ? Math.ceil((effectivePagination.total || (data?.length || 0)) / pageSize) || 1
          : 1);

    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    }
  }, [apiPaginationData?.total, apiPaginationData?.total_pages, effectivePagination?.total, data?.length, pageSize, currentPage]);

  const getPaginationItems = () => {
    const items: (number | 'ellipsis')[] = [];
    const maxItems = 7;

    if (totalPages <= maxItems) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
    } else {
      const leftSide = Math.floor(maxItems / 2);
      const rightSide = maxItems - leftSide - 1;

      if (currentPage - leftSide <= 1) {
        for (let i = 1; i <= leftSide + rightSide + 1; i++) {
          items.push(i);
        }
        items.push('ellipsis');
        items.push(totalPages);
      } 
      else if (currentPage + rightSide >= totalPages) {
        items.push(1);
        items.push('ellipsis');
        for (let i = totalPages - (leftSide + rightSide); i <= totalPages; i++) {
          items.push(i);
        }
      } 
      else {
        items.push(1);
        items.push('ellipsis');
        for (let i = currentPage - leftSide; i <= currentPage + rightSide; i++) {
          items.push(i);
        }
        items.push('ellipsis');
        items.push(totalPages);
      }
    }

    return items;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);

    isPageChangeRef.current = true;

    if (databaseDataSourceConfig?.datasourceId && refetchDatabaseData) {

      const offset = (page - 1) * pageSize;
      const requestParams = { page, limit: pageSize, offset };
      refetchDatabaseData(requestParams);
      return;
    }

    if (enhancedDataSource?.datasetId) {

      void enhancedRefresh({ page, pageSize });
      return;
    }

    if (datasetConfig?.datasetId) {
      fetchDataFromApi(false, page);
    }

  };

  const handlePageSizeChange = (size: number) => {
    if (size === pageSize) return;

    try {
      const storageKey = getStorageKey('pageSize');
      localStorage.setItem(storageKey, size.toString());
    } catch (error) {
      console.warn('Failed to save pageSize to localStorage:', error);
    }

    setPageSize(size);
    setCurrentPage(1);

    if (databaseDataSourceConfig?.datasourceId && refetchDatabaseData) {

      refetchDatabaseData({
        page: 1,
        limit: size,
        offset: 0
      });
      return;
    }

    if (enhancedDataSource?.datasetId) {

      void enhancedRefresh({ page: 1, pageSize: size });
      return;
    }

    if (datasetConfig?.datasetId) {
      fetchDataFromApi(true, 1, size);
    }

  };

  // Function to format JSON for display
  const formatJsonPreview = (jsonData: unknown): string => {
    try {
      if (typeof jsonData === 'string') {
        // Try to parse if it's a string
        try {
          const parsed = JSON.parse(jsonData);
          const stringified = JSON.stringify(parsed, null, 2);
          return stringified.length > 50 ? stringified.substring(0, 50) + '...' : stringified;
        } catch {
          // If not valid JSON string, just truncate
          return jsonData.length > 50 ? jsonData.substring(0, 50) + '...' : jsonData;
        }
      } else {
        // If it's already an object, stringify it
        const stringified = JSON.stringify(jsonData, null, 2);
        return stringified.length > 50 ? stringified.substring(0, 50) + '...' : stringified;
      }
    } catch {
      return 'Invalid JSON';
    }
  };

  const openJsonPreview = (data: unknown) => {
    setJsonPreviewData({
      open: true,
      data
    });
  };

  const handleCopyJsonContent = () => {
    if (!jsonPreviewData.data) return;

    const contentToCopy = typeof jsonPreviewData.data === 'string' 
      ? (() => {
          try {
            return JSON.stringify(JSON.parse(jsonPreviewData.data), null, 2);
          } catch {
            return jsonPreviewData.data;
          }
        })()
      : JSON.stringify(jsonPreviewData.data, null, 2);

    navigator.clipboard.writeText(contentToCopy)
      .then(() => {
        toast({
          title: t('table.copy_success', 'Copy successful'),
          description: t('table.json_copied_to_clipboard', 'JSON content copied to clipboard'),
        });
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: t('table.copy_failed', 'Copy failed'),
          description: t('table.cannot_copy_to_clipboard', 'Unable to copy content to clipboard'),
        });
      });
  };

  const isActionVisible = useCallback((action: NonNullable<typeof actions>[0], record: TableDataType): boolean => {
    return evaluateFormActionVisibility(action, {
      formValues: record,
      parameters: pageParams || {},
    });
  }, [pageParams]);

  const buildActionParameters = useCallback((action: NonNullable<typeof actions>[0], record: TableDataType): ParameterRecord => {
    const parameters: ParameterRecord = {};

    if (!action.config.parameterMapping) {
      return { ...pageParams } as ParameterRecord;
    }

    Object.entries(action.config.parameterMapping).forEach(([paramKey, mapping]) => {

      if (!paramKey || paramKey.trim() === '') {
        return;
      }

      let paramValue: unknown;

      switch (mapping.source) {
        case 'column':
          const originalValue = record[mapping.value];
          paramValue = originalValue;

          if (typeof paramValue === 'string') {
            paramValue = ParameterUtils.inferParameterType(paramValue);
          }
          break;
        case 'static':
          paramValue = mapping.value;

          if (typeof paramValue === 'string') {
            paramValue = ParameterUtils.inferParameterType(paramValue);
          }
          break;
        case 'parameter':
          paramValue = pageParams[mapping.value];
          break;
                  case 'computed':

            try {

              if (mapping.value && mapping.value.includes('{{')) {
                const userInfo = currentUser ? {
                  id: currentUser.id,
                  name: currentUser.name,
                  email: currentUser.email
                } : undefined;
                paramValue = evaluateComputedExpression(mapping.value, userInfo);
              }

              else if (mapping.value && mapping.value.includes('${')) {
                paramValue = mapping.value.replace(/\$\{(\w+)\}/g, (_match: string, columnName: string) => {
                  return String(record[columnName] || '');
                });
              } else {
                paramValue = mapping.value;
              }

              if (typeof paramValue === 'string') {
                paramValue = ParameterUtils.inferParameterType(paramValue);
              }
            } catch (error) {
              console.warn(`Computed value error for parameter ${paramKey}:`, error);
              paramValue = mapping.value;
            }
            break;
        default:
          paramValue = mapping.value;

          if (typeof paramValue === 'string') {
            paramValue = ParameterUtils.inferParameterType(paramValue);
          }
      }

      if (mapping.transform) {
        try {

          if (mapping.transform === 'string') {
            paramValue = String(paramValue || '');
          } else if (mapping.transform === 'number') {
            paramValue = Number(paramValue) || 0;
          } else if (mapping.transform === 'boolean') {
            paramValue = Boolean(paramValue);
          } else if (mapping.transform === 'json') {
            paramValue = typeof paramValue === 'string' ? paramValue : JSON.stringify(paramValue);
          }
        } catch (error) {
          console.warn(`Transform error for parameter ${paramKey}:`, error);
        }
      }

      if (mapping.required && (paramValue === undefined || paramValue === null || paramValue === '')) {
        console.warn(`Required parameter '${paramKey}' is missing or empty for action '${action.label}'`);
      }

      parameters[paramKey] = paramValue as ParameterValue;
    });

    return { ...pageParams, ...parameters } as ParameterRecord;
  }, [pageParams, currentUser]);

  const handleDatabaseUpdateOperation = async (
    config: any,
    record: TableDataType,
    parameters: ParameterRecord
  ) => {
    try {

      const datasourceId = config.targetDatasourceId;

      if (!datasourceId) {
        console.error('数据源ID未配置:', {
          configTargetDatasourceId: config.targetDatasourceId
        });
        toast({
          variant: "destructive",
          title: t('table.operation_failed', 'Operation failed'),
          description: t('table.target_datasource_id_not_specified', 'Target datasource ID not specified'),
        });
        return;
      }

      const updateData = buildDatabaseUpdateData(
        config.updateFields || {},
        record,
        parameters
      );

      const whereConditions = buildDatabaseUpdateConditions(
        config.updateConditions || {},
        record,
        parameters
      );

      if (whereConditions === null) {
        toast({
          variant: "destructive",
          title: t('table.operation_failed', 'Operation failed'),
          description: t(
            'table.update_conditions_unresolved',
            'Could not resolve update conditions (missing row value, parameter, or static value). Check configuration.'
          ),
        });
        return;
      }

      const missingRequiredFields: string[] = [];
      Object.entries(config.updateFields || {}).forEach(([fieldName, fieldConfig]: [string, any]) => {
        if (fieldConfig.required && (updateData[fieldName] === undefined || updateData[fieldName] === null || updateData[fieldName] === '')) {
          missingRequiredFields.push(fieldName);
        }
      });

      if (missingRequiredFields.length > 0) {
        toast({
          variant: "destructive",
          title: t('table.data_validation_failed', 'Data validation failed'),
          description: t('table.missing_required_fields', 'Missing required fields: {{fields}}', { fields: missingRequiredFields.join(', ') }),
        });
        return;
      }

      const response = await updateDatabaseData(datasourceId, updateData, whereConditions, config.targetDatasourceVersion);

      if (response?.success === true) {

        const opData = (response as { data?: { executionTime?: number; affectedRows?: number } }).data;
        const executionTime = opData?.executionTime;
        const executionTimeText =
          executionTime !== undefined
            ? t('table.execution_time_suffix', ' (execution time: {{ms}} ms)', { ms: String(executionTime) })
            : '';
        const affectedRows = opData?.affectedRows ?? 1;

        toast({
          title: t('table.update_success', 'Update successful'),
          description: t('table.records_updated', 'Successfully updated {{count}} records{{time}}', { 
            count: affectedRows,
            time: executionTimeText 
          }),
        });

        if (datasetConfig?.datasetId) {
          await fetchDataFromApi(false, currentPage, pageSize);
        } else if (databaseDataSourceConfig?.datasourceId) {

          const offset = (currentPage - 1) * pageSize;
          refetchDatabaseData({
            page: currentPage,
            limit: pageSize,
            offset
          });
        }

      } else {
        throw new Error(response?.message || t('table.database_update_failed', 'Database update failed'));
      }

    } catch (error) {
      console.error('[handleDatabaseUpdateOperation] 数据库更新失败:', error);

      const errorMessage = error instanceof Error ? error.message : t('table.database_update_failed', 'Database update failed');
      toast({
        variant: "destructive",
        title: t('table.update_failed', 'Update failed'),
        description: errorMessage,
      });
    }
  };

  const handleDatabaseInsertOperation = async (
    config: any,
    record: TableDataType,
    parameters: ParameterRecord
  ) => {
    try {
      const datasourceId = config.targetDatasourceId;

      if (!datasourceId) {
        console.error('数据源ID未配置:', {
          configTargetDatasourceId: config.targetDatasourceId
        });
        toast({
          variant: "destructive",
          title: t('table.operation_failed', 'Operation failed'),
          description: t('table.target_datasource_id_not_specified', 'Target datasource ID not specified'),
        });
        return;
      }

      const insertData = buildDatabaseUpdateData(
        config.insertFields as Record<string, {
          source: 'static' | 'parameter' | 'input_field' | 'column' | 'computed' | 'user';
          value: string;
          required?: boolean;
          fieldType?: 'VARCHAR' | 'INT32' | 'FLOAT' | 'BOOL' | 'JSON' | 'DATETIME';
          defaultValue?: any;
          transform?: string;
        }>,
        record,
        parameters
      );

      const missingRequiredFields: string[] = [];
      Object.entries(config.insertFields || {}).forEach(([fieldName, fieldConfig]: [string, any]) => {
        if (fieldConfig.required && (insertData[fieldName] === undefined || insertData[fieldName] === null || insertData[fieldName] === '')) {
          missingRequiredFields.push(fieldName);
        }
      });

      if (missingRequiredFields.length > 0) {
        toast({
          variant: "destructive",
          title: t('table.data_validation_failed', 'Data validation failed'),
          description: t('table.missing_required_fields', 'Missing required fields: {{fields}}', { fields: missingRequiredFields.join(', ') }),
        });
        return;
      }

      const response = await insertDatabaseData(datasourceId, insertData, config.targetDatasourceVersion);

      if (response?.success === true) {
        const opData = (response as { data?: { executionTime?: number; affectedRows?: number; insertId?: number } }).data;
        const executionTime = opData?.executionTime;
        const executionTimeText =
          executionTime !== undefined
            ? t('table.execution_time_suffix', ' (execution time: {{ms}} ms)', { ms: String(executionTime) })
            : '';

        toast({
          title: t('table.insert_success', 'Insert successful'),
          description: t('table.records_inserted', 'Successfully inserted {{count}} records{{time}}', {
            count: opData?.affectedRows ?? 1,
            time: executionTimeText
          }),
        });

        if (datasetConfig?.datasetId) {
          await fetchDataFromApi(false, currentPage, pageSize);
        } else if (databaseDataSourceConfig?.datasourceId) {
          const offset = (currentPage - 1) * pageSize;
          refetchDatabaseData({
            page: currentPage,
            limit: pageSize,
            offset
          });
        }
      } else {
        throw new Error(response?.message || t('table.database_insert_failed', 'Database insert failed'));
      }
    } catch (error) {
      console.error('[handleDatabaseInsertOperation] 数据库新增失败:', error);
      const errorMessage = error instanceof Error ? error.message : t('table.database_insert_failed', 'Database insert failed');
      toast({
        variant: "destructive",
        title: t('table.insert_failed', 'Insert failed'),
        description: errorMessage,
      });
    }
  };

  const handleDatabaseDeleteOperation = async (
    config: any,
    record: TableDataType,
    parameters: ParameterRecord
  ) => {
    try {

      const datasourceId = config.targetDatasourceId;

      if (!datasourceId) {
        console.error('数据源ID未配置:', {
          configTargetDatasourceId: config.targetDatasourceId
        });
        toast({
          variant: "destructive",
          title: t('table.operation_failed', 'Operation failed'),
          description: t('table.target_datasource_id_not_specified', 'Target datasource ID not specified'),
        });
        return;
      }

      const whereConditions = buildDatabaseUpdateConditions(
        config.deleteConditions || {},
        record,
        parameters
      );

      if (whereConditions === null) {
        toast({
          variant: "destructive",
          title: t('table.operation_failed', 'Operation failed'),
          description: t('table.delete_conditions_required', 'Delete conditions are required'),
        });
        return;
      }

      const response = await deleteDatabaseData(datasourceId, whereConditions, config.targetDatasourceVersion);

      if (response?.success === true) {

        const executionTime = response.data?.executionTime;
        const executionTimeText =
          executionTime !== undefined
            ? t('table.execution_time_suffix', ' (execution time: {{ms}} ms)', { ms: String(executionTime) })
            : '';
        const deletedCount = response.data?.deletedCount || response.data?.affectedRows || 1;

        toast({
          title: t('table.delete_success', 'Delete successful'),
          description: t('table.records_deleted', 'Successfully deleted {{count}} records{{time}}', { 
            count: deletedCount,
            time: executionTimeText 
          }),
        });

        if (datasetConfig?.datasetId) {
          await fetchDataFromApi(false, currentPage, pageSize);
        } else if (databaseDataSourceConfig?.datasourceId) {

          const offset = (currentPage - 1) * pageSize;
          refetchDatabaseData({
            page: currentPage,
            limit: pageSize,
            offset
          });
        }

      } else {
        throw new Error(response?.message || t('table.database_delete_failed', 'Database delete failed'));
      }

    } catch (error) {
      console.error('[handleDatabaseDeleteOperation] 数据库删除失败:', error);

      const errorMessage = error instanceof Error ? error.message : t('table.database_delete_failed', 'Database delete failed');
      toast({
        variant: "destructive",
        title: t('table.delete_failed', 'Delete failed'),
        description: errorMessage,
      });
    }
  };

  const handleTransactionDatabaseOperation = async (
    config: any,
    record: TableDataType,
    parameters: ParameterRecord
  ) => {
    try {
      const datasourceId = config.targetDatasourceId;

      if (!datasourceId) {
        toast({
          variant: "destructive",
          title: t('table.operation_failed', 'Operation failed'),
          description: t('table.target_datasource_id_not_specified', 'Target datasource ID not specified'),
        });
        return;
      }

      const updateData = buildDatabaseUpdateData(
        config.updateFields || {},
        record,
        parameters
      );

      const updateConditionsConfig = config.updateConditions || {};
      let whereConditions: Record<string, unknown> = {};

      if (Object.keys(updateConditionsConfig).length > 0) {
        const builtWhere = buildDatabaseUpdateConditions(
          updateConditionsConfig,
          record,
          parameters
        );
        if (builtWhere === null) {
          toast({
            variant: "destructive",
            title: t('table.operation_failed', 'Operation failed'),
            description: t(
              'table.update_conditions_unresolved',
              'Could not resolve update conditions (missing row value, parameter, or static value). Check configuration.'
            ),
          });
          return;
        }
        whereConditions = builtWhere;
      }

      const missingRequiredFields: string[] = [];
      Object.entries(config.updateFields || {}).forEach(([fieldName, fieldConfig]: [string, any]) => {
        if (fieldConfig.required && (updateData[fieldName] === undefined || updateData[fieldName] === null || updateData[fieldName] === '')) {
          missingRequiredFields.push(fieldName);
        }
      });

      if (missingRequiredFields.length > 0) {
        toast({
          variant: "destructive",
          title: t('table.data_validation_failed', 'Data validation failed'),
          description: t('table.missing_required_fields', 'Missing required fields: {{fields}}', { fields: missingRequiredFields.join(', ') }),
        });
        return;
      }

      const response = await transactionDatabaseData(
        datasourceId,
        { ...whereConditions, ...updateData },
        config.targetDatasourceVersion
      );

      if (response?.success === true) {
        const opData = (response as { data?: { executionTime?: number; affectedRows?: number } }).data;
        const executionTime = opData?.executionTime;
        const executionTimeText =
          executionTime !== undefined
            ? t('table.execution_time_suffix', ' (execution time: {{ms}} ms)', { ms: String(executionTime) })
            : '';
        const affectedRows = opData?.affectedRows ?? 1;

        toast({
          title: t('table.transaction_database_success', 'Transaction executed successfully'),
          description: t('table.transaction_database_records_affected', 'Affected {{count}} rows{{time}}', {
            count: affectedRows,
            time: executionTimeText
          }),
        });

        if (datasetConfig?.datasetId) {
          await fetchDataFromApi(false, currentPage, pageSize);
        } else if (databaseDataSourceConfig?.datasourceId) {
          const offset = (currentPage - 1) * pageSize;
          refetchDatabaseData({
            page: currentPage,
            limit: pageSize,
            offset
          });
        }
      } else {
        throw new Error(response?.message || t('table.transaction_database_failed', 'Transaction execution failed'));
      }
    } catch (error) {
      console.error('[handleTransactionDatabaseOperation] 事务数据执行失败:', error);
      const errorMessage = error instanceof Error ? error.message : t('table.transaction_database_failed', 'Transaction execution failed');
      toast({
        variant: "destructive",
        title: t('table.transaction_database_failed', 'Transaction execution failed'),
        description: errorMessage,
      });
    }
  };

  const handleGlobalActionClick = async (action: NonNullable<typeof actions>[0]) => {

    const emptyRecord: TableDataType = {}; 

    if (action.inputMode === 'form' && ['updateDataset', 'insertDataset', 'updateDatabase', 'insertDatabase', 'deleteDatabase', 'transactionDatabase'].includes(action.type)) {

      let updateFields: Record<string, any> = {};

      if (action.type === 'updateDataset' && action.config.updateDataset) {
        updateFields = action.config.updateDataset.updateFields || {};
      } else if (action.type === 'insertDataset' && action.config.insertDataset) {
        updateFields = action.config.insertDataset.insertFields || {};
      } else if (action.type === 'updateDatabase' && action.config.updateDatabase) {
        updateFields = action.config.updateDatabase.updateFields || {};
      } else if (action.type === 'insertDatabase' && action.config.insertDatabase) {
        updateFields = action.config.insertDatabase.insertFields || {};
      } else if (action.type === 'transactionDatabase' && action.config.transactionDatabase) {
        updateFields = action.config.transactionDatabase.updateFields || {};
      } else if (action.type === 'deleteDatabase' && action.config.deleteDatabase) {

        updateFields = action.config.deleteDatabase.deleteConditions || {};
      }

      const formFields = Object.entries(updateFields).filter(([_, fieldConfig]: [string, any]) => fieldConfig.source === 'input_field');

      if (formFields.length === 0) {
        console.warn(t('table.no_form_input_fields_configured', 'No form input fields configured. Please set the value source to "Form Input Field" in the field mapping'));
      }

      setActionFormDialog({
        isOpen: true,
        action,
        record: emptyRecord
      });
      return;
    }

    const requiresConfirmation = Boolean(
      (action.config as any).requireConfirmation ||
      (action.type === 'deleteDatabase' && action.config.deleteDatabase?.requireConfirmation) ||
      (action.type === 'deleteDataset' && action.config.deleteDataset?.requireConfirmation)
    );

    if (requiresConfirmation) {
      setConfirmDialog({
        isOpen: true,
        action,
        record: null,
        onConfirm: async () => {
          setConfirmDialog({ isOpen: false, action: null, record: null, onConfirm: null });
          await executeGlobalAction(action);
        }
      });
      return;
    }

    await executeGlobalAction(action);
  };

  /**
   * Emit the per-action success trigger after a global or row button completes
   * successfully. Reads `triggers[<key>].parameters` (per-action key first,
   * then bare base key as fallback) to discover which parameters to broadcast,
   * then emits each one with the appropriate value.
   */
  const fireActionSuccessTrigger = useCallback(
    (action: NonNullable<typeof actions>[0], result?: unknown, record?: TableDataType) => {
      const isGlobal = action.position === 'global';
      const perActionKey = action.id
        ? (isGlobal
            ? globalActionSuccessTriggerKey(action.id)
            : rowActionSuccessTriggerKey(action.id))
        : (isGlobal ? ON_GLOBAL_ACTION_SUCCESS_BASE : ON_ROW_ACTION_SUCCESS_BASE);
      const baseKey = isGlobal ? ON_GLOBAL_ACTION_SUCCESS_BASE : ON_ROW_ACTION_SUCCESS_BASE;
      const commConfig = componentParameterConfig || (parameterConfig as any);
      const triggersCfg = commConfig?.triggers || {};
      const configuredParams: string[] =
        triggersCfg[perActionKey]?.parameters ||
        triggersCfg[baseKey]?.parameters ||
        [];

      if (configuredParams.length === 0) {
        return;
      }

      const paramValueMap: Record<string, unknown> = {
        tableRefreshTrigger: Date.now(),
        globalActionId: action.id,
        globalActionLabel: action.label,
        globalActionResult: result ?? null,
        rowActionId: action.id,
        rowActionLabel: action.label,
        rowActionResult: result ?? null,
        rowActionData: record ?? null,
        selectedRowData: record ?? null,
      };

      for (const paramKey of configuredParams) {
        const value = paramKey in paramValueMap ? paramValueMap[paramKey] : Date.now();
        emit(paramKey, value as never);
      }
    },
    [componentParameterConfig, parameterConfig, emit]
  );

  const executeGlobalAction = async (action: NonNullable<typeof actions>[0]) => {
    const emptyRecord: TableDataType = {};
    const parameters = buildActionParameters(action, emptyRecord);

    // Per-action communication trigger bookkeeping. Each successful case
    // flips `triggered = true` (and optionally sets `triggerResult`) right
    // before its `break;`. After the switch, if `triggered` is true we
    // broadcast the configured parameters via fireActionSuccessTrigger.
    let triggered = false;
    let triggerResult: unknown = undefined;

    switch (action.type) {
      case 'navigate': {
        const { targetPage, openInNewTab } = action.config;
        if (targetPage) {
          if (openInNewTab) {
            let url: string;
            if (targetPage.startsWith('/')) {
              url = targetPage;
            } else if (workbenchId) {
              url = `/${workbenchId}/${targetPage}`;
            } else {
              url = targetPage;
            }
            window.open(url, '_blank');
          } else {
            if (workbenchId && !targetPage.startsWith('/')) {
              const openTabEvent = new CustomEvent('workbench-open-tab', {
                detail: {
                  pageId: targetPage,
                  navigationTitle: action.label,
                  icon: action.icon
                }
              });
              window.dispatchEvent(openTabEvent);
            } else {
              mobilePushNavigate(navigate, location, targetPage);
            }
          }
        }
        break;
      }

      case 'insertDataset': {
        const { insertDataset: config } = action.config;
        if (config) {
          await handleDatasetOperation('insert', config, emptyRecord, parameters);
          triggered = true;
        }
        break;
      }

      case 'updateDatabase': {
        const { updateDatabase: config } = action.config;

        if (config) {
          await handleDatabaseUpdateOperation(config, emptyRecord, parameters);
          triggered = true;
        }
        break;
      }

      case 'insertDatabase': {
        const { insertDatabase: config } = action.config;

        if (config) {
          await handleDatabaseInsertOperation(config, emptyRecord, parameters);
          triggered = true;
        }
        break;
      }

      case 'deleteDatabase': {
        const { deleteDatabase: config } = action.config;

        if (config) {
          await handleDatabaseDeleteOperation(config, emptyRecord, parameters);
          triggered = true;
        }
        break;
      }

      case 'transactionDatabase': {
        const { transactionDatabase: config } = action.config;

        if (config) {
          await handleTransactionDatabaseOperation(config, emptyRecord, parameters);
          triggered = true;
        }
        break;
      }

      case 'updateDataset': {
        const { updateDataset: config } = action.config;

        if (config) {
          await handleDatasetOperation('update', config, emptyRecord, parameters);
          triggered = true;
        }
        break;
      }

      case 'deleteDataset': {
        const { deleteDataset: config } = action.config;

        if (config) {
          await handleDatasetOperation('delete', config, emptyRecord, parameters);
          triggered = true;
        }
        break;
      }

      case 'taskCall': {
        const { taskCall: config } = action.config;
        if (config?.taskId) {
          try {

            const taskParams = { ...parameters };

            if (config.parameterMapping) {
              Object.entries(config.parameterMapping).forEach(([taskParam, mapping]) => {
                if (!mapping || typeof mapping !== 'object') return;
                const m = mapping as { source: string; value: string };
                if (m.source === 'parameter' && m.value in pageParams) {
                  taskParams[taskParam] = pageParams[m.value];
                } else if (m.source === 'static') {
                  taskParams[taskParam] = m.value;
                }
              });
            }

            const response = await apiClient.post(`/tasks/${config.taskId}/execute`, taskParams);

            if (response.success) {
              toast({
                title: t('table.task_execution_success', 'Task execution successful'),
                description: config.successMessage || t('table.task_executed_successfully', 'Task executed successfully'),
              });
              triggered = true;
              triggerResult = response;
            } else {
              toast({
                variant: "destructive",
                title: t('table.task_execution_failed', 'Task execution failed'),
                description: config.errorMessage || t('table.task_execution_failed_message', 'Task execution failed'),
              });
            }
          } catch (error) {
            console.error('Task call failed:', error);
            toast({
              variant: "destructive",
              title: t('table.task_execution_failed', 'Task execution failed'),
              description: config.errorMessage || t('table.network_error_retry', 'Network error, please retry'),
            });
          }
        }
        break;
      }

      case 'taskExecute': {
        const { taskExecute: config } = action.config;
        if (!config?.taskId) {
          toast({
            variant: "destructive",
            title: t('table.task_execution_failed', 'Task execution failed'),
            description: t('table.task_id_required', 'Task ID is required'),
          });
          break;
        }

        let resolvedTaskId: string;
        if (typeof config.taskId === 'string') {
          resolvedTaskId = config.taskId;
        } else if (config.taskId.source === 'parameter') {
          resolvedTaskId = String(pageParams[config.taskId.paramName || ''] || '');
        } else {
          resolvedTaskId = config.taskId.value || '';
        }

        if (!resolvedTaskId) {
          toast({
            variant: "destructive",
            title: t('table.task_execution_failed', 'Task execution failed'),
            description: t('table.task_id_required', 'Task ID is required'),
          });
          break;
        }

        setTaskExecuteDialog({
          isOpen: true,
          action,
          record: emptyRecord
        });
        break;
      }

      default:
        console.warn(`全局按钮不支持的操作类型: ${action.type}`);
        toast({
          variant: "destructive",
          title: t('table.operation_failed', 'Operation failed'),
          description: t('table.global_action_not_supported', 'This action type is not supported for global buttons'),
        });
    }

    // After the switch — if any case flagged a successful completion,
    // fire the per-action communication trigger. This is intentionally
    // placed outside the switch so a future action type only needs to
    // set `triggered = true` before its `break;` and the broadcast is
    // automatic.
    if (triggered) {
      fireActionSuccessTrigger(action, triggerResult);
    }
  };

  const handleDatasetOperation = async (
    operationType: 'update' | 'insert' | 'delete',
    config: any,
    record: TableDataType,
    parameters: ParameterRecord
  ) => {
    try {

      let targetDatasetId: string;
      if (typeof config.targetDatasetId === 'string') {
        targetDatasetId = config.targetDatasetId;
      } else {
        if (config.targetDatasetId.source === 'parameter') {
          targetDatasetId = String(parameters[config.targetDatasetId.paramName] || pageParams[config.targetDatasetId.paramName] || '');
        } else {
          targetDatasetId = config.targetDatasetId.value || '';
        }
      }

      if (!targetDatasetId) {
        console.error('Target dataset ID is missing:', {
          configTargetDatasetId: config.targetDatasetId,
          parameters,
          pageParams
        });
        toast({
          variant: "destructive",
          title: t('table.operation_failed', 'Operation failed'),
          description: t('table.target_dataset_id_not_specified', 'Target dataset ID not specified'),
        });
        return;
      }

      const operationData: Record<string, unknown> = {};

      if (operationType === 'update' || operationType === 'insert') {
        const fields = operationType === 'update' ? config.updateFields : config.insertFields;
        for (const [fieldName, fieldConfig] of Object.entries(fields)) {
          let value: unknown;

          const typedFieldConfig = fieldConfig as {
            source: 'column' | 'static' | 'parameter' | 'computed' | 'input_field';
            value: string;
            fieldType?: string;
            required?: boolean;
          };

          switch (typedFieldConfig.source) {
            case 'input_field':

              value = parameters[fieldName];
              break;
            case 'column':
              value = record[typedFieldConfig.value];
              break;
            case 'static':
              value = typedFieldConfig.value;
              break;
            case 'parameter':
              value = parameters[typedFieldConfig.value] || pageParams[typedFieldConfig.value];
              break;
            case 'computed':

              try {
                if (typedFieldConfig.value.includes('{{') && typedFieldConfig.value.includes('}}')) {
                  const expression = typedFieldConfig.value.replace(/\{\{(.+?)\}\}/g, (_: string, expr: string) => {
                    const trimmedExpr = expr.trim();

                    if (trimmedExpr === 'new Date().toISOString()') {
                      return new Date().toISOString();
                    } else if (trimmedExpr === 'Date.now()') {
                      return Date.now().toString();
                    } else if (trimmedExpr === 'Math.floor(Date.now() / 1000)') {
                      return Math.floor(Date.now() / 1000).toString();
                    } else if (trimmedExpr === 'new Date().toLocaleString("zh-CN")') {
                      return new Date().toLocaleString('zh-CN');
                    } else if (trimmedExpr === 'new Date().toISOString().split("T")[0]') {
                      return new Date().toISOString().split('T')[0];
                    } else if (trimmedExpr === 'new Date().toTimeString().split(" ")[0]') {
                      return new Date().toTimeString().split(' ')[0];
                    } else if (trimmedExpr.startsWith('new Date()')) {

                      return new Date().toISOString();
                    }

                    return expr;
                  });
                  value = expression;
                } else {
                  value = typedFieldConfig.value;
                }
              } catch (error) {
                console.warn('Computed expression error:', error);
                value = typedFieldConfig.value;
              }
              break;
            default:
              value = typedFieldConfig.value;
          }

          if (typedFieldConfig.fieldType === 'INT32' || typedFieldConfig.fieldType === 'INT64') {
            value = parseInt(String(value), 10);
          } else if (typedFieldConfig.fieldType === 'FLOAT' || typedFieldConfig.fieldType === 'DOUBLE') {
            value = parseFloat(String(value));
          } else if (typedFieldConfig.fieldType === 'BOOL') {
            value = Boolean(value);
          } else if (typedFieldConfig.fieldType === 'DATE') {

            if (value instanceof Date) {
              value = value.toISOString();
            } else if (typeof value === 'string' || typeof value === 'number') {
              try {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                  value = date.toISOString();
                }
              } catch {
                void 0;
              }
            }
          } else if (typedFieldConfig.fieldType === 'SWITCH') {

            const switchOnText = i18n.t('table.switch_on', 'On');
            const switchOffText = i18n.t('table.switch_off', 'Off');
            const switchOnTextZh = i18n.t('table.switch_on_zh', 'On');
            const switchOffTextZh = i18n.t('table.switch_off_zh', 'Off');
            if (value === true || value === '1' || value === 1 || value === switchOnText || value === switchOnTextZh) {
              value = 1;
            } else if (value === false || value === '0' || value === 0 || value === switchOffText || value === switchOffTextZh) {
              value = 0;
            } else {

              value = 0;
            }
          } else if (typedFieldConfig.fieldType === 'JSON' || typedFieldConfig.fieldType === 'ARRAY') {
            try {
              value = typeof value === 'string' ? JSON.parse(value) : value;
            } catch {
              void 0;
            }
          }

          operationData[fieldName] = value;
        }
      }

      const conditions: Record<string, unknown> = {};
      if (operationType === 'update' || operationType === 'delete') {
        const conditionConfig = operationType === 'update' ? config.updateConditions : config.deleteConditions;
        for (const [fieldName, conditionFieldConfig] of Object.entries(conditionConfig)) {
          let value: unknown;

          const typedConditionConfig = conditionFieldConfig as {
            source: 'column' | 'static' | 'parameter';
            value: string;
          };

          switch (typedConditionConfig.source) {
            case 'column':
              value = record[typedConditionConfig.value];
              break;
            case 'static':
              value = typedConditionConfig.value;
              break;
            case 'parameter':
              value = parameters[typedConditionConfig.value] || pageParams[typedConditionConfig.value];
              break;
            default:
              value = typedConditionConfig.value;
          }

          conditions[fieldName] = value;
        }
      }

      let response: any;

      switch (operationType) {
        case 'update':

          const updateFilterConditions = Object.entries(conditions)
            .map(([field, value]) => `${field}=${value}`)
            .join(' AND ');
          response = await updateDatasetData(targetDatasetId, updateFilterConditions, operationData);
          break;
        case 'insert':
          response = await insertDatasetData(targetDatasetId, [operationData]);
          break;
        case 'delete':

          const deleteFilterConditions = Object.entries(conditions)
            .map(([field, value]) => `${field}==${value}`)
            .join(' AND ');
          response = await deleteDatasetData(targetDatasetId, deleteFilterConditions);
          break;
        default:
          throw new Error(`Unsupported operation type: ${operationType}`);
      }

      if (response.success) {

        const successAction = config.onSuccess?.type || 'refresh';
        const successMessage = config.onSuccess?.message || (operationType === 'update' ? t('table.update_success', 'Update successful') : operationType === 'insert' ? t('table.insert_success', 'Insert successful') : t('table.delete_success', 'Delete successful'));

        toast({
          title: t('table.operation_success', 'Operation successful'), 
          description: successMessage,
        });

        switch (successAction) {
          case 'message':

            if (datasetConfig?.datasetId) {
              fetchDataFromApi(false, currentPage, pageSize);
            } else if (databaseDataSourceConfig?.datasourceId) {

              const offset = (currentPage - 1) * pageSize;
              refetchDatabaseData({
                page: currentPage,
                limit: pageSize,
                offset
              });
            }
            break;
          case 'refresh':

            if (datasetConfig?.datasetId) {
              fetchDataFromApi(false, currentPage, pageSize);
            } else if (databaseDataSourceConfig?.datasourceId) {

              const offset = (currentPage - 1) * pageSize;
              refetchDatabaseData({
                page: currentPage,
                limit: pageSize,
                offset
              });
            } else {

              window.location.reload();
            }
            break;
          case 'navigate':

            if (datasetConfig?.datasetId) {
              fetchDataFromApi(false, currentPage, pageSize);
            } else if (databaseDataSourceConfig?.datasourceId) {

              const offset = (currentPage - 1) * pageSize;
              refetchDatabaseData({
                page: currentPage,
                limit: pageSize,
                offset
              });
            }
            if (config.onSuccess?.targetPage) {

              setTimeout(() => {
                if (workbenchId) {
                  mobilePushNavigate(
                    navigate,
                    location,
                    buildWorkbenchPagePath(
                      workbenchId,
                      config.onSuccess.targetPage,
                      '',
                      location.pathname
                    )
                  );
                } else {
                  mobilePushNavigate(navigate, location, config.onSuccess.targetPage);
                }
              }, 100);
            }
            break;
          default:

            if (datasetConfig?.datasetId) {
              fetchDataFromApi();
            } else if (databaseDataSourceConfig?.datasourceId) {
              refetchDatabaseData();
            }
            break;
        }
      } else {
        throw new Error(response.message || t('table.operation_failed', 'Operation failed'));
      }

    } catch (error) {
      console.error(`Dataset ${operationType} operation failed:`, error);

      const errorAction = config.onError?.type || 'message';
      const errorMessage = config.onError?.message || (operationType === 'update' ? t('table.update_failed', 'Update failed') : operationType === 'insert' ? t('table.insert_failed', 'Insert failed') : t('table.delete_failed', 'Delete failed'));

      switch (errorAction) {
        case 'message':
          toast({
            variant: "destructive",
            title: t('table.operation_failed', 'Operation failed'),
            description: errorMessage,
          });
          break;
        case 'console':
          console.error(errorMessage, error);
          break;
      }
    }
  };

  const handleFormSubmit = async (formData: ParameterRecord) => {
    const { action, record } = actionFormDialog;
    if (!action || !record) return;

    // Keep the same shape as the switch in executeGlobalAction: each branch sets
    // `triggered = true` on success, and we broadcast the onGlobalActionSuccess
    // trigger at the end so inputMode=form global buttons can also fire the
    // refresh signals used by lock / submit / unlock flows (refresh-11, ffffff, etc.).
    let triggered = false;
    const triggerResult: unknown = undefined;

    try {

      let config: any;
      let updateFields: Record<string, any> = {};

      if (action.type === 'updateDataset' && action.config.updateDataset) {
        config = action.config.updateDataset;
        updateFields = config.updateFields || {};
      } else if (action.type === 'insertDataset' && action.config.insertDataset) {
        config = action.config.insertDataset;
        updateFields = config.insertFields || {};
      } else if (action.type === 'updateDatabase' && action.config.updateDatabase) {
        config = action.config.updateDatabase;
        updateFields = config.updateFields || {};
      } else if (action.type === 'insertDatabase' && action.config.insertDatabase) {
        config = action.config.insertDatabase;
        updateFields = config.insertFields || {};
      } else if (action.type === 'transactionDatabase' && action.config.transactionDatabase) {
        config = action.config.transactionDatabase;
        updateFields = config.updateFields || {};
      } else if (action.type === 'deleteDatabase' && action.config.deleteDatabase) {

        config = action.config.deleteDatabase;
        updateFields = config.deleteConditions || {};
      }

      const finalFieldValues: Record<string, any> = {};

      Object.entries(updateFields).forEach(([fieldName, fieldConfig]: [string, any]) => {

        if (fieldConfig.source === 'display_only') {
          return;
        }

        switch (fieldConfig.source) {
          case 'input_field':

            finalFieldValues[fieldName] = formData[fieldName];
            break;
          case 'column':

            finalFieldValues[fieldName] = record[fieldConfig.value];
            break;
          case 'static':

            finalFieldValues[fieldName] = fieldConfig.value;
            break;
          case 'parameter':

            finalFieldValues[fieldName] = (pageParams as any)[fieldConfig.value];
            break;
          case 'computed':

            try {
              finalFieldValues[fieldName] = evaluateComputedExpression(fieldConfig.value, { ...record, ...pageParams });
            } catch (error) {
              console.warn(t('table.computed_field_evaluation_failed', 'Failed to evaluate computed field {{fieldName}}', { fieldName }), error);
              finalFieldValues[fieldName] = '';
            }
            break;
          default:
            finalFieldValues[fieldName] = '';
        }
      });

      const enhancedRecord = { ...record, ...finalFieldValues };

      const baseParameters = buildActionParameters(action, enhancedRecord);

      const parameters = { ...baseParameters, ...formData };

      switch (action.type) {
        case 'updateDataset': {
          const config = action.config.updateDataset;
          if (config) {
            await handleDatasetOperation('update', config, enhancedRecord, parameters);
            triggered = true;
          }
          break;
        }
        case 'insertDataset': {
          const config = action.config.insertDataset;
          if (config) {
            await handleDatasetOperation('insert', config, enhancedRecord, parameters);
            triggered = true;
          }
          break;
        }
        case 'updateDatabase': {
          const config = action.config.updateDatabase;
          if (config) {
            await handleDatabaseUpdateOperation(config, enhancedRecord, parameters);
            triggered = true;
          }
          break;
        }
        case 'insertDatabase': {
          const config = action.config.insertDatabase;
          if (config) {
            await handleDatabaseInsertOperation(config, enhancedRecord, parameters);
            triggered = true;
          }
          break;
        }
        case 'deleteDatabase': {

          const config = action.config.deleteDatabase;
          if (config) {
            await handleDatabaseDeleteOperation(config, enhancedRecord, parameters);
            triggered = true;
          }
          break;
        }
        case 'transactionDatabase': {
          const config = action.config.transactionDatabase;
          if (config) {
            await handleTransactionDatabaseOperation(config, enhancedRecord, parameters);
            triggered = true;
          }
          break;
        }
        default:
          console.warn(t('table.unsupported_form_action_type', 'Unsupported form action type: {{type}}', { type: action.type }));
      }

      if (triggered) {
        fireActionSuccessTrigger(action, triggerResult, record);
      }

      setActionFormDialog({
        isOpen: false,
        action: null,
        record: null
      });

    } catch (error) {
      console.error(t('table.form_action_execution_failed', 'Form action execution failed'), error);

    }
  };

  const handleActionClick = async (action: NonNullable<typeof actions>[0], record: TableDataType) => {

    if (action.inputMode === 'form' && ['updateDataset', 'insertDataset', 'updateDatabase', 'insertDatabase', 'deleteDatabase', 'transactionDatabase'].includes(action.type)) {

      let updateFields: Record<string, any> = {};

      if (action.type === 'updateDataset' && action.config.updateDataset) {
        updateFields = action.config.updateDataset.updateFields || {};
      } else if (action.type === 'insertDataset' && action.config.insertDataset) {
        updateFields = action.config.insertDataset.insertFields || {};
      } else if (action.type === 'updateDatabase' && action.config.updateDatabase) {
        updateFields = action.config.updateDatabase.updateFields || {};
      } else if (action.type === 'insertDatabase' && action.config.insertDatabase) {
        updateFields = action.config.insertDatabase.insertFields || {};
      } else if (action.type === 'transactionDatabase' && action.config.transactionDatabase) {
        updateFields = action.config.transactionDatabase.updateFields || {};
      } else if (action.type === 'deleteDatabase' && action.config.deleteDatabase) {

        updateFields = action.config.deleteDatabase.deleteConditions || {};
      }

      const formFields = Object.entries(updateFields).filter(([_, fieldConfig]: [string, any]) => fieldConfig.source === 'input_field');

      if (formFields.length === 0) {
        console.warn(t('table.no_form_input_fields_configured', 'No form input fields configured. Please set the value source to "Form Input Field" in the field mapping'));
      }

      setActionFormDialog({
        isOpen: true,
        action,
        record
      });
      return;
    }

    const parameters = buildActionParameters(action, record);

    let triggered = false;
    let triggerResult: unknown = undefined;

    switch (action.type) {
      case 'navigate': {
        const { targetPage, openInNewTab } = action.config;
        if (targetPage) {

          const urlParams: Record<string, unknown> = {};
          Object.entries(parameters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && !key.startsWith('_')) {
              urlParams[key] = value;
            }
          });

          if (openInNewTab) {

            const urlParamsObj = new URLSearchParams();
            Object.entries(urlParams).forEach(([key, value]) => {

              if (typeof value === 'string') {
                urlParamsObj.append(key, value);
              } else {
                urlParamsObj.append(key, JSON.stringify(value));
              }
            });
            const queryString = urlParamsObj.toString();

            let url: string;
            if (targetPage.startsWith('/')) {
              url = queryString ? `${targetPage}?${queryString}` : targetPage;
            } else if (workbenchId) {
              url = queryString 
                ? `/${workbenchId}/${targetPage}?${queryString}`
                : `/${workbenchId}/${targetPage}`;
            } else {
              url = queryString ? `${targetPage}?${queryString}` : targetPage;
            }
            window.open(url, '_blank');
          } else {

             if (workbenchId && !targetPage.startsWith('/')) {

               const openTabEvent = new CustomEvent('workbench-open-tab', {
                 detail: {
                   pageId: targetPage,
                   navigationTitle: action.label, 
                   icon: action.icon,
                   urlParams: Object.keys(urlParams).length > 0 ? urlParams : undefined
                 }
               });
               window.dispatchEvent(openTabEvent);
            } else {

              const urlParamsObj = new URLSearchParams();
              Object.entries(urlParams).forEach(([key, value]) => {

                if (typeof value === 'string') {
                  urlParamsObj.append(key, value);
                } else {
                  urlParamsObj.append(key, JSON.stringify(value));
                }
              });
              const queryString = urlParamsObj.toString();
              const url = queryString ? `${targetPage}?${queryString}` : targetPage;
              mobilePushNavigate(navigate, location, url);
            }
          }
        }
        break;
      }

      case 'api': {
        const { endpoint, method = 'POST' } = action.config;
        if (endpoint) {
          try {
            const response = await fetch(endpoint, {
              method,
              headers: {
                'Content-Type': 'application/json',
              },
              body: method !== 'GET' ? JSON.stringify(parameters) : undefined,
            });

            if (response.ok) {
              toast({
                title: t('table.operation_success', 'Operation successful'),
                description: action.config.successMessage || t('table.operation_executed_successfully', 'Operation executed successfully'),
              });
              triggered = true;
              triggerResult = response;

              if (datasetConfig?.datasetId) {
                fetchDataFromApi(false, currentPage, pageSize);
              } else if (databaseDataSourceConfig?.datasourceId) {

                const offset = (currentPage - 1) * pageSize;
                refetchDatabaseData({
                  page: currentPage,
                  limit: pageSize,
                  offset
                });
              }
            } else {
              toast({
                variant: "destructive",
                title: t('table.operation_failed', 'Operation failed'),
                description: action.config.errorMessage || t('table.operation_execution_failed', 'Operation execution failed'),
              });
            }
          } catch (error) {
            console.error('Action API call failed:', error);
            toast({
              variant: "destructive",
              title: t('table.operation_failed', 'Operation failed'),
              description: action.config.errorMessage || t('table.network_error_retry', 'Network error, please retry'),
            });
          }
        }
        break;
      }

      case 'confirm': {
        const confirmed = window.confirm(action.config.confirmMessage || t('table.confirm_operation', 'Confirm to execute this operation?'));
        if (confirmed) {

          await handleActionClick({ ...action, type: 'api' }, record);
        }
        break;
      }

      case 'updateDataset': {
        const { updateDataset: config } = action.config;

        if ((action.config as any).requireConfirmation) {
          setConfirmDialog({
            isOpen: true,
            action,
            record,
            onConfirm: async () => {
              setConfirmDialog({ isOpen: false, action: null, record: null, onConfirm: null });
              if (config) {
                await handleDatasetOperation('update', config, record, parameters);
                fireActionSuccessTrigger(action, undefined, record);
              }
            }
          });
          return;
        }

        if (config) {
          await handleDatasetOperation('update', config, record, parameters);
          triggered = true;
        }
        break;
      }

      case 'insertDataset': {
        const { insertDataset: config } = action.config;

        if ((action.config as any).requireConfirmation) {
          setConfirmDialog({
            isOpen: true,
            action,
            record,
            onConfirm: async () => {
              setConfirmDialog({ isOpen: false, action: null, record: null, onConfirm: null });
              if (config) {
                await handleDatasetOperation('insert', config, record, parameters);
                fireActionSuccessTrigger(action, undefined, record);
              }
            }
          });
          return;
        }

        if (config) {
          await handleDatasetOperation('insert', config, record, parameters);
          triggered = true;
        }
        break;
      }

      case 'deleteDataset': {
        const { deleteDataset: config } = action.config;

        if ((action.config as any).requireConfirmation || config?.requireConfirmation) {
          setConfirmDialog({
            isOpen: true,
            action,
            record,
            onConfirm: async () => {
              setConfirmDialog({ isOpen: false, action: null, record: null, onConfirm: null });
              if (config) {
                await handleDatasetOperation('delete', config, record, parameters);
                fireActionSuccessTrigger(action, undefined, record);
              }
            }
          });
          return;
        }

        if (config) {
          await handleDatasetOperation('delete', config, record, parameters);
          triggered = true;
        }
        break;
      }

      case 'updateDatabase': {
        const { updateDatabase: config } = action.config;

        if ((action.config as any).requireConfirmation) {
          setConfirmDialog({
            isOpen: true,
            action,
            record,
            onConfirm: async () => {
              setConfirmDialog({ isOpen: false, action: null, record: null, onConfirm: null });
              if (config) {
                await handleDatabaseUpdateOperation(config, record, parameters);
                fireActionSuccessTrigger(action, undefined, record);
              }
            }
          });
          return;
        }

        if (config) {
          await handleDatabaseUpdateOperation(config, record, parameters);
          triggered = true;
        }
        break;
      }

      case 'deleteDatabase': {
        const { deleteDatabase: config } = action.config;

        if ((action.config as any).requireConfirmation || config?.requireConfirmation) {
          setConfirmDialog({
            isOpen: true,
            action,
            record,
            onConfirm: async () => {
              setConfirmDialog({ isOpen: false, action: null, record: null, onConfirm: null });
              if (config) {
                await handleDatabaseDeleteOperation(config, record, parameters);
                fireActionSuccessTrigger(action, undefined, record);
              }
            }
          });
          return;
        }

        if (config) {
          await handleDatabaseDeleteOperation(config, record, parameters);
          triggered = true;
        }
        break;
      }

      case 'insertDatabase': {
        const { insertDatabase: config } = action.config;

        if ((action.config as any).requireConfirmation) {
          setConfirmDialog({
            isOpen: true,
            action,
            record,
            onConfirm: async () => {
              setConfirmDialog({ isOpen: false, action: null, record: null, onConfirm: null });
              if (config) {
                await handleDatabaseInsertOperation(config, record, parameters);
                fireActionSuccessTrigger(action, undefined, record);
              }
            }
          });
          return;
        }

        if (config) {
          await handleDatabaseInsertOperation(config, record, parameters);
          triggered = true;
        }
        break;
      }

      case 'transactionDatabase': {
        const { transactionDatabase: config } = action.config;

        if ((action.config as any).requireConfirmation) {
          setConfirmDialog({
            isOpen: true,
            action,
            record,
            onConfirm: async () => {
              setConfirmDialog({ isOpen: false, action: null, record: null, onConfirm: null });
              if (config) {
                await handleTransactionDatabaseOperation(config, record, parameters);
                fireActionSuccessTrigger(action, undefined, record);
              }
            }
          });
          return;
        }

        if (config) {
          await handleTransactionDatabaseOperation(config, record, parameters);
          triggered = true;
        }
        break;
      }

      case 'taskCall': {
        const { taskCall: config } = action.config;
        if (config?.taskId) {
          try {

            const taskParams = { ...parameters };

            if (config.parameterMapping) {
              Object.entries(config.parameterMapping).forEach(([taskParam, mapping]) => {
                if (!mapping || typeof mapping !== 'object') return;
                const m = mapping as { source: string; value: string };
                if ((m.source === 'formField' || m.source === 'column') && m.value in record) {
                  taskParams[taskParam] = record[m.value];
                } else if (m.source === 'parameter' && m.value in parameters) {
                  taskParams[taskParam] = parameters[m.value];
                } else if (m.source === 'static') {
                  taskParams[taskParam] = m.value;
                }
              });
            }

            const response = await apiClient.post(`/tasks/${config.taskId}/execute`, taskParams);

            if (response.success) {
              toast({
                title: t('table.task_execution_success', 'Task execution successful'),
                description: config.successMessage || t('table.task_executed_successfully', 'Task executed successfully'),
              });
              triggered = true;
              triggerResult = response;

              if (datasetConfig?.datasetId) {
                fetchDataFromApi(false, currentPage, pageSize);
              } else if (databaseDataSourceConfig?.datasourceId) {
                const offset = (currentPage - 1) * pageSize;
                refetchDatabaseData({
                  page: currentPage,
                  limit: pageSize,
                  offset
                });
              }
            } else {
              toast({
                variant: "destructive",
                title: t('table.task_execution_failed', 'Task execution failed'),
                description: config.errorMessage || t('table.task_execution_failed_message', 'Task execution failed'),
              });
            }
          } catch (error) {
            console.error('Task call failed:', error);
            toast({
              variant: "destructive",
              title: t('table.task_execution_failed', 'Task execution failed'),
              description: config.errorMessage || t('table.network_error_retry', 'Network error, please retry'),
            });
          }
        }
        break;
      }

      case 'taskExecute': {
        const { taskExecute: config } = action.config;
        if (!config?.taskId) {
          toast({
            variant: "destructive",
            title: t('table.task_execution_failed', 'Task execution failed'),
            description: t('table.task_id_required', 'Task ID is required'),
          });
          break;
        }

        let resolvedTaskId: string;
        if (typeof config.taskId === 'string') {
          resolvedTaskId = config.taskId;
        } else if (config.taskId.source === 'parameter') {
          resolvedTaskId = String(record[config.taskId.paramName || ''] || pageParams[config.taskId.paramName || ''] || '');
        } else {
          resolvedTaskId = config.taskId.value || '';
        }

        if (!resolvedTaskId) {
          toast({
            variant: "destructive",
            title: t('table.task_execution_failed', 'Task execution failed'),
            description: t('table.task_id_required', 'Task ID is required'),
          });
          break;
        }

        setTaskExecuteDialog({
          isOpen: true,
          action,
          record
        });
        break;
      }

      default:
        console.warn(`Unsupported action type: ${action.type}`);
    }

    if (triggered) {
      fireActionSuccessTrigger(action, triggerResult, record);
    }
  };

  const getVisibleActions = useCallback((record: TableDataType) => {
    if (!actions) return [];
    return actions.filter(action => {
      if (action.triggerMode === 'rowClick') return false;
      const isRowButton = action.position !== 'global';
      return isRowButton && isActionVisible(action, record);
    });
  }, [actions, isActionVisible]);

  const globalActions = useMemo(() => {
    if (!actions) return [];
    return actions.filter(action => action.position === 'global');
  }, [actions]);

  const anyRowHasActions = useMemo(() => {
    if (showLegacyEdit || deletable) return true;
    if (!actions) return false;
    const hasConfig = actions.some(a => a.triggerMode !== 'rowClick' && a.position !== 'global');
    if (!hasConfig) return false;
    const rows = Array.isArray(dataWithPatches) ? dataWithPatches : [];
    return rows.some((record) => getVisibleActions(record).length > 0);
  }, [actions, dataWithPatches, showLegacyEdit, deletable, getVisibleActions]);

  const showActionsColumn = Boolean(
    showLegacyEdit || deletable || (actions && actions.filter(a => a.triggerMode !== 'rowClick').length > 0 && anyRowHasActions)
  );

  const actionsColumnStyle = useMemo<React.CSSProperties>(() => {
    const allRowActions = actions?.filter((a) => a.position !== 'global') ?? [];
    const rowActions = (() => {
      if (!actions) return allRowActions;
      const rows = Array.isArray(dataWithPatches) ? dataWithPatches : [];
      if (rows.length === 0) return allRowActions;
      const maxRowActions = rows.reduce((maxSet, record) => {
        const visible = getVisibleActions(record);
        if (visible.length > maxSet.length) {
          return visible;
        }
        return maxSet;
      }, [] as typeof allRowActions);
      return maxRowActions.length > 0 ? maxRowActions : allRowActions;
    })();
    const w = estimateActionsColumnMinWidthPx(
      rowActions,
      Boolean(showLegacyEdit),
      Boolean(deletable),
      t('table.actions', 'Actions')
    );
    return {
      width: w,
      minWidth: w,
    };
  }, [actions, dataWithPatches, showLegacyEdit, deletable, getVisibleActions, t, i18n.language]);

  const customStyleProps = useMemo(() => {
    return id ? applyCustomStyles(id, customStyles, className) : { className, style: {} };
  }, [id, customStyles, className]);

  const showTableCardHeader =
    Boolean(title) ||
    showToolbar ||
    globalActions.length > 0 ||
    (hasFilterableColumns && applyFilterButtonPlacement === 'toolbar_leading');

  const applyFiltersButtonEl = (
    <Button type="button" size="sm" onClick={applyFilters} disabled={isApiLoading}>
      {isApiLoading ? (
        <Loading size="sm" className="mr-2" />
      ) : (
        <Filter className="h-4 w-4 mr-1" />
      )}
      {isApiLoading ? t('table.processing', 'Processing...') : t('table.apply_filters', 'Apply Filters')}
    </Button>
  );

  return (
    <Card className={cn("w-full table-renderer dark:bg-card dark:border-border", stickyHeaderOn ? "overflow-visible" : cn("overflow-hidden", fillCell && "h-full flex flex-col min-h-0"), customStyleProps.className)} style={customStyleProps.style}>
      {/* Filter Panel - Always visible */}
      {hasFilterableColumns && (
        <div className={cn("filter-panel p-4 border-b border-neutral-200 dark:border-neutral-700", fillCell && !stickyHeaderOn && "shrink-0")}>
          <div className="flex justify-between items-center mb-3">
            <h3 className="filter-title text-sm font-medium">{t('table.filter_conditions', 'Filter Conditions')}</h3>
            <Button variant="ghost" size="sm" onClick={resetAllFilters}>
              <RefreshCw className="h-3 w-3 mr-1" />
              {t('table.reset', 'Reset')}
            </Button>
          </div>
          <div className={filterPanelGridClassName}>
            {filterableColumns.map(column => {

              const currentFilterValue = filterValues[column.dataIndex];
              const filterValueArray = Array.isArray(currentFilterValue) 
                ? currentFilterValue 
                : currentFilterValue 
                  ? [currentFilterValue] 
                  : [];
              const filterValueString = Array.isArray(currentFilterValue)
                ? currentFilterValue[0] || ''
                : currentFilterValue || '';

              return (
                <div key={column.dataIndex} className="space-y-1.5">
                  <Label className="text-sm">{column.title}</Label>
                  <div className="flex items-center space-x-2">
                    {column.fieldType === 'SWITCH' ? (
                      <Select
                        value={filterValueString}
                        onValueChange={(value) => handleFilterValueChange(column.dataIndex, value)}
                      >
                        <SelectTrigger className={cn("text-sm", "dark:bg-card dark:border-border")}>
                          <SelectValue placeholder={t('table.select_status', 'Select status')} />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-card dark:border-border">
                          <SelectItem value="all">{t('table.all', 'All')}</SelectItem>
                          <SelectItem value="1">
                            {column.switchConfig?.showText && column.switchConfig?.onText 
                              ? column.switchConfig.onText 
                              : t('table.switch_on', 'On')}
                          </SelectItem>
                          <SelectItem value="0">
                            {column.switchConfig?.showText && column.switchConfig?.offText 
                              ? column.switchConfig.offText 
                              : t('table.switch_off', 'Off')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : column.dictionaryDataSource ? (

                      (() => {
                        const dictOptions = getDictionaryFilterOptions(column);
                        if (column.filterMultiSelect) {
                          return (
                            <MultiSelect
                              options={dictOptions}
                              value={filterValueArray}
                              onChange={(vals) => handleFilterValueChange(column.dataIndex, vals)}
                              placeholder={dictionaryLoading ? t('table.loading', 'Loading...') : t('table.select_from_dictionary', 'Select from options')}
                              disabled={isApiLoading || dictionaryLoading}
                              triggerClassName={cn("text-sm w-full", "dark:bg-card dark:border-border")}
                              contentClassName="dark:bg-card dark:border-border"
                              maxDisplayCount={3}
                              showClearButton={true}
                              emptyText={t('table.no_dictionary_options', 'No options')}
                            />
                          );
                        }
                        return (
                          <Select
                            value={filterValueString || 'all'}
                            onValueChange={(value) => handleFilterValueChange(column.dataIndex, value === 'all' ? '' : value)}
                          >
                            <SelectTrigger className={cn("text-sm w-full", "dark:bg-card dark:border-border")}>
                              <SelectValue placeholder={dictionaryLoading ? t('table.loading', 'Loading...') : t('table.select_from_dictionary', 'Select from options')} />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-card dark:border-border">
                              <SelectItem value="all">{t('table.all', 'All')}</SelectItem>
                              {dictOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      })()
                    ) : column.filterMultiSelect ? (

                      <TagInput
                        value={filterValueArray}
                        onChange={(tags) => handleFilterValueChange(column.dataIndex, tags)}
                        placeholder={
                          column.filterType === 'like' 
                            ? t('table.enter_keywords', 'Enter keywords, press Enter to add...') 
                            : column.filterType === 'in' 
                              ? t('table.enter_values', 'Enter values, press Enter to add...') 
                              : t('table.enter_values', 'Enter values, press Enter to add...')
                        }
                        badgeVariant="secondary"
                        allowDuplicates={false}
                        disabled={isApiLoading}
                        className="w-full dark:bg-card dark:border-border"
                        onBlurBehavior="ignore"
                        maxTags={column.filterMaxTags !== undefined ? column.filterMaxTags : 5}
                      />
                    ) : (

                      <Input 
                        value={filterValueString}
                        onChange={(e) => handleFilterValueChange(column.dataIndex, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            applyFilters();
                          }
                        }}
                        placeholder={column.filterType === 'like' 
                          ? t('table.contains', 'Contains...') 
                          : column.filterType === 'in' 
                            ? t('table.multiple_values_comma', 'Multiple values separated by comma') 
                            : t('table.equals', 'Equals...')}
                        className="text-sm dark:bg-card dark:border-border"
                        disabled={isApiLoading}
                      />
                    )}
                  </div>
                </div>
              );
            })}
            {applyFilterButtonPlacement === 'filter_grid_trailing' && (
              <div className="space-y-1.5">
                <div className="h-5" aria-hidden />
                <div className="flex w-full items-center justify-end">
                  {applyFiltersButtonEl}
                </div>
              </div>
            )}
          </div>
          {applyFilterButtonPlacement === 'filter_panel_footer' && (
            <div className="mt-4 flex justify-end">
              {applyFiltersButtonEl}
            </div>
          )}
        </div>
      )}

      {showTableCardHeader && (
        <CardHeader className={cn("table-header flex flex-row items-center justify-between space-y-0 pb-2", isNarrowFlow && "flex-wrap gap-y-2", fillCell && !stickyHeaderOn && "shrink-0")}>
          <div className={cn("flex items-center gap-4 flex-1", isNarrowFlow && "flex-wrap min-w-0")}>
            {title && <CardTitle className="table-title font-semibold" style={{ fontSize: titleFontSize }}>{title}</CardTitle>}
            {!!databaseDataSourceConfig?.datasourceId && !useMockData && !enhancedDataSource?.datasetId && (databaseDataSourceConfig?.enableSort === true) && hasSortPlaceholder && sortState.size > 0 && (() => {
              const visibleCols = columns.filter(col => !col.hidden);
              return (
                <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                  <span className="font-medium">{t('table.current_sort', 'Current Sort')}:</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {Array.from(sortState.entries()).map(([dataIndex, direction], index) => {
                      const column = visibleCols.find(col => col.dataIndex === dataIndex);
                      const columnTitle = column?.title || dataIndex;
                      return (
                        <span key={dataIndex} className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded text-xs">
                          <span>{columnTitle}</span>
                          <span className="text-muted-foreground">
                            {direction === 'asc' ? (
                              t('table.sort_ascending', 'Asc')
                            ) : (
                              t('table.sort_descending', 'Desc')
                            )}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className={cn("table-toolbar flex items-center", isNarrowFlow ? "flex-wrap gap-2" : "space-x-2")}>
            {hasFilterableColumns && applyFilterButtonPlacement === 'toolbar_leading' && applyFiltersButtonEl}
            {globalActions.map((action) => {
              const hasActionIcon = action.icon && action.icon.trim() !== '';
              const hasLabel = action.label && action.label.trim() !== '';

              if (!hasLabel && !hasActionIcon) return null;

              return (
                <Button
                  key={action.id}
                  variant={getTableActionButtonVariant('toolbar', action.variant)}
                  size="sm"
                  onClick={() => handleGlobalActionClick(action)}
                  disabled={isApiLoading}
                  title={action.label}
                  className={`${getTableActionButtonLayoutClassName('toolbar', hasActionIcon, hasLabel)} ${getTableActionButtonExtraClassName('toolbar', action.variant, hasActionIcon, hasLabel)}`}
                >
                  {isApiLoading ? (
                    <Loading size="sm" />
                  ) : (
                    <>
                      {hasActionIcon && renderIcon(action.icon)}
                      {hasLabel && <span className="text-sm">{action.label}</span>}
                    </>
                  )}
                </Button>
              );
            })}

            {addable && (
              <Button className="add-button" size="sm" onClick={handleAdd} disabled={isApiLoading}>
                {isApiLoading ? (
                  <Loading size="sm" className="mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                {isApiLoading ? t('table.processing', 'Processing...') : t('table.add', 'Add')}
              </Button>
            )}

            {deletable && datasetConfig?.datasetId && selectedRowIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsBatchDeleteDialogOpen(true)}
                disabled={isApiLoading}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {t('table.delete_selected', 'Delete selected')} ({selectedRowIds.length})
              </Button>
            )}

            {showRefresh && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isApiLoading}
                aria-label={t('table.refresh_data', 'Refresh data')}
                title={t('table.refresh_data', 'Refresh data')}
              >
                {isApiLoading ? (
                  <Loading size="sm" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            )}

            {enableExport && (
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleExport} 
                disabled={isApiLoading || exportState.isExporting}
                title={exportState.isExporting ? t('table.exporting', 'Exporting...') : t('table.export_data', 'Export data')}
              >
                {exportState.isExporting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            )}

            {showSettings && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={t('table.table_settings', 'Table settings')}
                    title={t('table.table_settings', 'Table settings')}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={resetAllFilters}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t('table.reset_filter_conditions', 'Reset Filter Conditions')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
      )}

      <CardContent className={cn("table-content", stickyHeaderOn ? "overflow-visible" : cn("overflow-auto custom-scrollbar", fillCell && "flex-1 min-h-0"))}>
        {stickyHeaderOn && <div ref={stickyOverlayRef} aria-hidden />}
        <Table
          className={cn(
            'data-table border-collapse',
            // table-fixed + w-full when columns set widths (honor them exactly); otherwise the original
            // min-w-full + w-max (fill viewport with few columns, grow past container with many → scroll).
            hasExplicitColumnWidths ? 'w-full table-fixed' : 'min-w-full w-max table-auto'
          )}
        >
          <colgroup>
            {visibleColumnsForTable.map((column) => (
              <col
                key={String(column.key ?? column.dataIndex)}
                style={getColgroupColStyle(column, hasExplicitColumnWidths)}
              />
            ))}
            {showActionsColumn ? (
              <col
                key="__table-actions"
                style={actionsColumnStyle}
                data-show-actions="true"
              />
            ) : null}
          </colgroup>
          <TableHeader className="table-head">
            <TableRow ref={frozenHeaderRowRef} className={cn('head-row dark:border-border', headerMuted && 'bg-slate-50 dark:bg-neutral-800/60')}>
              {deletable && (
                <TableHead className="w-10 px-3">
                  <Checkbox
                    checked={allPageSelected ? true : somePageSelected ? 'indeterminate' : false}
                    onCheckedChange={toggleSelectAllOnPage}
                    aria-label={t('table.select_all', 'Select all')}
                  />
                </TableHead>
              )}
              {visibleColumnsForTable.map((column, colIndex) => {

                const isSortable = !!databaseDataSourceConfig?.datasourceId
                  && !useMockData
                  && !enhancedDataSource?.datasetId
                  && (databaseDataSourceConfig?.enableSort === true)
                  && hasSortPlaceholder;
                const sortDirection = isSortable ? sortState.get(column.dataIndex) : null;

                const columnWidthStyle = getColumnWidthStyle(column);
                const frozenSticky =
                  frozenColumnCount > 0 && colIndex < frozenColumnCount;
                const isLastFrozenColumn =
                  frozenColumnCount > 0 && colIndex === frozenColumnCount - 1;
                const stickyHeaderStyle: React.CSSProperties = frozenSticky
                  ? {
                      position: 'sticky',
                      left: getFrozenStickyLeftPx(colIndex),
                      zIndex: 30,
                    }
                  : {};
                return (
                  <TableHead 
                    key={column.key || column.dataIndex}
                    className={cn(
                      'column-header overflow-hidden',
                      // Default min/max only when the column has no explicit width — otherwise the
                      // hard-coded min-w-[7.5rem] floors every column to ~120px and the configured
                      // width is ignored (esp. for narrow columns like a rank/index column).
                      !columnWidthStyle && 'min-w-[7.5rem] max-w-[min(18rem,80vw)]',
                      // Frozen header cell must paint the SAME bg as the header row, else the
                      // sticky column shows a lighter/darker island (esp. in dark mode).
                      frozenSticky && (headerMuted ? 'bg-slate-50 dark:bg-neutral-800' : 'bg-card'),
                      headerMuted && 'text-slate-500 dark:text-neutral-400 font-normal',
                      isLastFrozenColumn &&
                        'border-r-2 border-neutral-300 dark:border-neutral-600'
                    )}
                    style={{ ...(columnWidthStyle ?? {}), ...stickyHeaderStyle, fontSize: headerFontSize }}
                  >
                    {isSortable ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <div
                            className="column-title flex min-w-0 max-w-full cursor-pointer select-none break-words items-center rounded px-1 -mx-1 hover:bg-neutral-100 hover:text-primary dark:hover:bg-neutral-800"
                            role="button"
                            tabIndex={0}
                            title={t('table.sort_options', 'Sort options')}
                            aria-sort={sortDirection ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                          >
                            <span className="min-w-0 break-words">
                              {column.title}
                              {sortDirection === 'asc' ? ' ↑' : sortDirection === 'desc' ? ' ↓' : ''}
                            </span>
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem
                            onClick={() => handleSort(column, 'asc')}
                            className={sortDirection === 'asc' ? 'bg-primary/10' : ''}
                          >
                            <ArrowUp className="h-4 w-4 mr-2" />
                            {t('table.sort_ascending', 'Ascending')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleSort(column, 'desc')}
                            className={sortDirection === 'desc' ? 'bg-primary/10' : ''}
                          >
                            <ArrowDown className="h-4 w-4 mr-2" />
                            {t('table.sort_descending', 'Descending')}
                          </DropdownMenuItem>
                          {sortDirection && (
                            <DropdownMenuItem onClick={() => handleSort(column, null)}>
                              {t('table.clear_sort', 'Clear sort')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <div className="column-title flex min-w-0 max-w-full items-center gap-1 break-words">
                        <span className="min-w-0 break-words">{column.title}</span>
                      </div>
                    )}
                  </TableHead>
                );
              })}
              {showActionsColumn && (
                <TableHead
                  className="actions-header min-w-0 shrink-0 text-right align-middle whitespace-nowrap"
                  style={actionsColumnStyle}
                >
                  <div className="flex min-w-0 max-w-full items-center justify-end">
                    {t('table.actions', 'Actions')}
                  </div>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="table-body">
            {loading || isApiLoading || databaseLoading ? (

              <>
                {Array.from({ length: pageSize }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`} className="data-row dark:border-border">
                    {visibleColumnsForTable.map((column, colIndex) => {
                        const colWidthStyle = getColumnWidthStyle(column);
                        const frozenSticky =
                          frozenColumnCount > 0 && colIndex < frozenColumnCount;
                        const isLastFrozenColumn =
                          frozenColumnCount > 0 && colIndex === frozenColumnCount - 1;
                        const stickySkeletonStyle: React.CSSProperties = frozenSticky
                          ? {
                              position: 'sticky',
                              left: getFrozenStickyLeftPx(colIndex),
                              zIndex: 20,
                            }
                          : {};
                        return (
                      <TableCell 
                        key={`skeleton-${index}-${column.key || column.dataIndex}`}
                        className={cn(
                          'data-cell min-w-0 align-top overflow-hidden',
                          !colWidthStyle && 'max-w-[300px]',
                          frozenSticky && 'bg-card',
                          isLastFrozenColumn &&
                            'border-r-2 border-neutral-300 dark:border-neutral-600'
                        )}
                        style={{ ...(colWidthStyle ?? {}), ...stickySkeletonStyle }}
                      >
                        <div className="break-words whitespace-pre-line">
                          <Skeleton
                            className="h-5"
                            style={{ width: `${getSkeletonBarWidthPercent(index, colIndex)}%` }}
                          />
                        </div>
                      </TableCell>
                        );
                    })}
                    {showActionsColumn && (
                      <TableCell
                        className="actions-cell text-right whitespace-nowrap align-top"
                        style={actionsColumnStyle}
                      >
                        <div className="action-buttons flex items-center justify-end space-x-1">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </>
            ) : (data?.length === 0) ? (
              <TableRow className="dark:border-border hover:bg-transparent">
                <TableCell colSpan={visibleColumnsForTable.length + (showActionsColumn ? 1 : 0) + (deletable ? 1 : 0)} className="p-0">
                  <TableEmptyStateWithChromeInsets
                    floatBadge
                    avoidMobileChrome={isMobileViewport}
                    chromeRemeasureKey={data.length === 0}
                    showHeader={false}
                    columns={visibleColumnsForTable.length + (showActionsColumn ? 1 : 0)}
                    rows={4}
                    minHeight={200}
                    title={t('table.no_data', 'No data available')}
                    description={t('table.no_data_hint', 'No data for the current selection')}
                  />
                </TableCell>
              </TableRow>
            ) : (
              (Array.isArray(getCurrentPageData()) ? getCurrentPageData() : []).map((record, index) => {

                let recordId: string | number;
                if (record[rowKey] !== undefined && record[rowKey] !== null) {
                  recordId = record[rowKey] as string | number;
                } else {

                  const possibleIdKeys = ['id', '_id', 'ID', 'Id', 'key', 'Key'];
                  const foundIdKey = possibleIdKeys.find(key => record[key] !== undefined && record[key] !== null);
                  recordId = foundIdKey ? (record[foundIdKey] as string | number) : `row-${index}`;
                }

                const uniqueKey = `${String(recordId)}-${index}`;

                const isRowSelected = selectedRowIds.some(id =>
                  String(id) === String(recordId) || id === recordId
                );

                return (
                <TableRow
                  key={uniqueKey}
                  data-selected={isRowSelected ? 'true' : undefined}
                  className={cn(
                    'data-row transition-colors dark:border-border',
                    (onRowClick || recordInteraction?.enabled || !skipDefaultRowSelection) && 'cursor-pointer',
                    rowStriped && index % 2 === 1 && !isRowSelected && 'bg-slate-50/40 dark:bg-neutral-800/30',
                    isRowSelected && "bg-primary/10 dark:bg-primary/20 hover:bg-primary/15 dark:hover:bg-primary/25",
                    editingRowId === String(recordId) && "bg-primary/5 ring-2 ring-primary/30 ring-inset"
                  )}
                  data-editing={editingRowId === String(recordId) ? 'true' : undefined}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('button') || target.closest('a') || target.closest('[role="button"]')) {
                      return;
                    }
                    if (onRowClick) {
                      onRowClick(record);
                    } else if (recordInteraction?.enabled && recordInteraction.trigger !== 'actionOnly') {
                      setDetailRecord(record);
                    } else if (!skipDefaultRowSelection) {
                      handleRowSelect(record);
                    }
                  }}
                  onBlur={(e) => {
                    if (onRowFocusOut) {
                      onRowFocusOut(e as React.FocusEvent<HTMLTableRowElement>, String(recordId));
                    }
                  }}
                >
                  {deletable && (
                    <TableCell className="w-10 px-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIdSet.has(String(recordId))}
                        onCheckedChange={() => toggleRowSelection(record)}
                        aria-label={t('table.select_row', 'Select row')}
                      />
                    </TableCell>
                  )}
                  {visibleColumnsForTable.map((column, colIndex) => {
                        const colWidthStyle = getColumnWidthStyle(column);
                        const frozenSticky =
                          frozenColumnCount > 0 && colIndex < frozenColumnCount;
                        const isLastFrozenColumn =
                          frozenColumnCount > 0 && colIndex === frozenColumnCount - 1;
                        const stickyBodyStyle: React.CSSProperties = frozenSticky
                          ? {
                              position: 'sticky',
                              left: getFrozenStickyLeftPx(colIndex),
                              zIndex: 20,
                            }
                          : {};
                        return (
                    <TableCell 
                      key={`${record[rowKey] as string || index}-${column.key || column.dataIndex}`} 
                      className={cn(
                        'data-cell min-w-0 align-top overflow-hidden',
                        !colWidthStyle && 'max-w-[300px]',
                        // Frozen cell is painted opaque so non-frozen cells don't bleed through on
                        // horizontal scroll — but it must mirror the row's striped/selected state,
                        // otherwise the sticky column is a flat bg-card island (jarring in dark mode).
                        frozenSticky &&
                          (isRowSelected
                            ? 'bg-primary/10 dark:bg-primary/20'
                            : rowStriped && index % 2 === 1
                              ? 'bg-slate-50 dark:bg-neutral-900'
                              : 'bg-card'),
                        isLastFrozenColumn &&
                          'border-r-2 border-neutral-300 dark:border-neutral-600'
                      )}
                      style={{ ...(colWidthStyle ?? {}), ...stickyBodyStyle, fontSize: cellFontSize }}
                      onClick={(e) => {
                        if (onCellClick) {
                          e.stopPropagation();
                          onCellClick(record, column.dataIndex);
                        }
                      }}
                    >
                      {column.render && typeof column.render === 'function' ? (
                        (
                          column.render as (
                            value: unknown,
                            row: Record<string, unknown>,
                            rowIndex: number
                          ) => React.ReactNode
                        )(record[column.dataIndex], record, index)
                      ) : column.dictionaryDataSource ? (
                        <div className="break-words whitespace-pre-line">
                          {dictionaryLoading ? (
                            <span className="text-xs text-neutral-400">{t('table.loading', 'Loading...')}</span>
                          ) : (
                            (() => {
                              const rows = dictionaryDataMap.get(column.dataIndex);
                              const { text, style } = getDictionaryCellPresentation(
                                record,
                                column,
                                rows
                              );
                              const hasColor =
                                Boolean(style.backgroundColor) || Boolean(style.color);
                              return (
                                <span
                                  className={cn(
                                    'inline-block max-w-full',
                                    hasColor && 'rounded px-1.5 py-0.5'
                                  )}
                                  style={Object.keys(style).length ? style : undefined}
                                >
                                  {text}
                                </span>
                              );
                            })()
                          )}
                        </div>
                      ) : column.fieldType === 'DATE' ? (
                        <div className="break-words whitespace-pre-line">
                          {column.render?.type === 'yyyy-MM-dd' 
                            ? formatDateValue(record[column.dataIndex], 'yyyy-MM-dd')
                            : column.render?.type === 'yyyy-MM-dd HH:mm:ss'
                            ? formatDateValue(record[column.dataIndex], 'yyyy-MM-dd HH:mm:ss')
                            : formatDateValue(record[column.dataIndex], 'yyyy-MM-dd HH:mm:ss')
                          }
                        </div>
                      ) : column.fieldType === 'SWITCH' ? (
                        <div className="flex items-center">
                          <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            getSwitchState(record[column.dataIndex]) 
                              ? 'bg-blue-500' 
                              : 'bg-neutral-300 dark:bg-neutral-600'
                          }`}>
                            <div className={`inline-block h-3 w-3 transform rounded-full bg-white dark:bg-neutral-200 transition-transform shadow-sm ${
                              getSwitchState(record[column.dataIndex]) 
                                ? 'translate-x-5' 
                                : 'translate-x-1'
                            }`} />
                          </div>
                        </div>
                      ) : column.fieldType === 'JSON' ? (
                        <div className="flex items-start justify-between">
                          <div className="break-words max-w-full cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 p-1 rounded"
                            onClick={() => openJsonPreview(record[column.dataIndex])}
                            title={t('table.click_to_view_full_json', 'Click to view full JSON content')}
                          >
                            {formatJsonPreview(record[column.dataIndex])}
                          </div>
                        </div>
                      ) : column.render && typeof column.render === 'object' ? (
                        (column.render.type === 'Stacked' || column.render.type === 'Delta' || column.render.type === 'PctBar' || column.render.type === 'RankBadge' || column.render.type === 'Currency' || column.render.type === 'Number') ? (
                          renderSwCell(column.render.type as SwCellType, column.render.props as SwCellProps, record, column.dataIndex)
                        ) : column.render.type === 'Progress' ? (
                          <div className="flex items-center">
                            <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  (Number(record[column.dataIndex]) || 0) >= 90 ? 'bg-green-500' :
                                  (Number(record[column.dataIndex]) || 0) >= 70 ? 'bg-blue-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${Number(record[column.dataIndex]) || 0}%` }}
                              />
                            </div>
                            <span className="ml-2 text-sm">{Number(record[column.dataIndex]) || 0}%</span>
                          </div>
                        ) : column.render.type === 'Image' ? (
                          record[column.dataIndex] ? (
                            <div className="w-full flex items-center justify-start">
                              <img 
                                src={record[column.dataIndex] as string}
                                alt={column.title}
                                className="object-cover rounded-md border border-neutral-200 dark:border-neutral-700"
                                style={{
                                  width: column.render.props?.width ? `${column.render.props.width}px` : '60px',
                                  height: column.render.props?.height ? `${column.render.props.height}px` : '60px',
                                  maxWidth: '120px',
                                  maxHeight: '120px',
                                  cursor: column.render.props?.preview ? 'pointer' : 'default'
                                }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  if (column.render?.props?.fallback) {
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = `<span class="text-xs text-neutral-500 dark:text-neutral-400 px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded">${column.render.props.fallback}</span>`;
                                    }
                                  } else {
                                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNiAxNkwyNCAxNkwyNCAyNEwxNiAyNFoiIGZpbGw9IiNEMUQ1REIiLz4KPHA+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5Q0EzQUYiIGZvbnQtc2l6ZT0iMTAiPu+/ve+/vTwvdGV4dD48L3A+Cjwvc3ZnPgo=';
                                    target.alt = t('table.image_load_failed', 'Image load failed');
                                  }
                                }}
                                onClick={column.render.props?.preview ? () => {

                                  window.open(record[column.dataIndex] as string, '_blank');
                                } : undefined}
                              />
                            </div>
                          ) : (
                            <div className="w-full flex items-center justify-start">
                              <span className="text-xs text-neutral-400 dark:text-neutral-600">{t('table.no_image', 'No Image')}</span>
                            </div>
                          )
                        ) : column.render.type === 'Tag' ? (
                          (() => {
                            const cellValue = record[column.dataIndex] as string;
                            const bgColor = column.render.props?.color?.[cellValue] || '';
                            const textColor = column.render.props?.textColor?.[cellValue] || '';

                            const bgClass = bgColor === 'green' ? 'bg-green-100 dark:bg-green-900' :
                              bgColor === 'blue' ? 'bg-primary/15 dark:bg-primary/20' :
                              bgColor === 'orange' ? 'bg-orange-100 dark:bg-orange-900' :
                              bgColor === 'red' ? 'bg-red-100 dark:bg-red-900' :
                              bgColor === 'gold' ? 'bg-yellow-100 dark:bg-yellow-900' :
                              'bg-neutral-100 dark:bg-neutral-800';

                            const textClass = textColor ? (
                              textColor === 'green' ? 'text-green-800 dark:text-green-200' :
                              textColor === 'blue' ? 'text-primary dark:text-primary' :
                              textColor === 'orange' ? 'text-orange-800 dark:text-orange-200' :
                              textColor === 'red' ? 'text-red-800 dark:text-red-200' :
                              textColor === 'gold' ? 'text-yellow-800 dark:text-yellow-200' :
                              'text-neutral-800 dark:text-neutral-200'
                            ) : (

                              bgColor === 'green' ? 'text-green-800 dark:text-green-200' :
                              bgColor === 'blue' ? 'text-primary dark:text-primary' :
                              bgColor === 'orange' ? 'text-orange-800 dark:text-orange-200' :
                              bgColor === 'red' ? 'text-red-800 dark:text-red-200' :
                              bgColor === 'gold' ? 'text-yellow-800 dark:text-yellow-200' :
                              'text-neutral-800 dark:text-neutral-200'
                            );

                            return (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium break-words ${bgClass} ${textClass}`}>
                                <span className="break-words">
                                  {column.render.props?.text?.[cellValue] || formatCellValue(cellValue)}
                                </span>
                              </span>
                            );
                          })()
                        ) : column.render.type === 'Custom' ? (
                          (() => {
                            // Look up data via column.dataIndex (consistent with other render branches);
                            // column.key is the React key, used only for list rendering, not for data lookup.
                            const fieldKey = column.dataIndex;
                            const fieldValue = record[fieldKey];
                            const customProps = (column.render?.props ?? {}) as {
                              customColor?: string;
                              fontWeight?: string;
                              fontFamily?: string;
                              fontStyle?: string;
                              textDecoration?: string;
                            };
                            const colorClass = customProps.customColor
                              ? (
                                  customColorMap[customProps.customColor] ||
                                  customColorMap[String(fieldValue)] ||
                                  ''
                                )
                              : '';
                            const customStyle: React.CSSProperties = {
                              fontWeight: customProps.fontWeight,
                              fontFamily: customProps.fontFamily,
                              fontStyle: customProps.fontStyle,
                              textDecoration:
                                customProps.textDecoration && customProps.textDecoration !== 'none'
                                  ? customProps.textDecoration
                                  : undefined,
                            };
                            const wrapClass = `break-words whitespace-pre-line ${colorClass}`.trim();

                            let inner: React.ReactNode;
                            if (fieldValue === null || fieldValue === undefined) {
                              inner = <span className="text-neutral-400">-</span>;
                            } else if (typeof fieldValue === 'object' && fieldValue !== null) {
                              const obj = fieldValue as Record<string, any>;
                              if (obj.date && obj.amount !== undefined) {
                                inner = <>{obj.date} | {typeof obj.amount === 'number' ? obj.amount.toFixed(2) : obj.amount} | {obj.counterparty || '-'}</>;
                              } else {
                                inner = <>{JSON.stringify(obj, null, 2)}</>;
                              }
                            } else {
                              inner = <>{formatCellValue(fieldValue)}</>;
                            }

                            return <div className={wrapClass} style={customStyle}>{inner}</div>;
                          })()
                        ) : Array.isArray(record[column.dataIndex]) ? (
                          <div className="break-words whitespace-pre-line">
                            {(record[column.dataIndex] as string[]).join(', ')}
                          </div>
                        ) : (
                          <div className="break-words whitespace-pre-line">
                            {formatCellValue(record[column.dataIndex])}
                          </div>
                        )
                      ) : Array.isArray(record[column.dataIndex]) ? (
                        <div className="break-words whitespace-pre-line">
                          {(record[column.dataIndex] as string[]).join(', ')}
                        </div>
                      ) : (
                        <div className="break-words whitespace-pre-line">
                          {formatCellValue(record[column.dataIndex])}
                        </div>
                      )}
                    </TableCell>
                        );
                  })}
                  {showActionsColumn && (() => {
                    const rowActions = getVisibleActions(record);
                    const showRowActionsCell = rowActions.length > 0 || showLegacyEdit || deletable;
                    if (!showRowActionsCell) return null;
                    return (
                    <TableCell
                      className="shrink-0 min-w-0 pl-1 text-right align-top whitespace-nowrap"
                      style={actionsColumnStyle}
                    >
                      <div className="flex justify-end gap-1 flex-nowrap">
                        {rowActions.map((action) => {
                          const hasActionIcon = action.icon && action.icon.trim() !== '';
                          const hasLabel = action.label && action.label.trim() !== '';

                          if (!hasLabel && !hasActionIcon) return null;

                          return (
                            <Button
                              key={action.id}
                              variant={getTableActionButtonVariant('row', action.variant)}
                              size={getTableActionButtonSize('row', hasActionIcon, hasLabel)}
                              onClick={() => handleActionClick(action, record)}
                              disabled={isApiLoading}
                              title={action.label}
                              className={`${getTableActionButtonLayoutClassName('row', hasActionIcon, hasLabel)} ${getTableActionButtonExtraClassName('row', action.variant, hasActionIcon, hasLabel)}`}
                            >
                              {isApiLoading ? (
                                <Loading size="sm" />
                              ) : (
                                <>
                                  {hasActionIcon && renderIcon(action.icon)}
                                  {hasLabel && <span className="text-xs whitespace-nowrap">{action.label}</span>}
                                </>
                              )}
                            </Button>
                          );
                        })}

                        {showLegacyEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(record)}
                            disabled={isApiLoading}
                            aria-label={t('table.edit_record', 'Edit record')}
                            title={t('table.edit_record', 'Edit record')}
                          >
                            {isApiLoading ? (
                              <Loading size="sm" />
                            ) : (
                              <Edit className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {deletable && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(record)}
                            disabled={isApiLoading}
                            aria-label={t('table.delete_record', 'Delete record')}
                            title={t('table.delete_record', 'Delete record')}
                          >
                            {isApiLoading ? (
                              <Loading size="sm" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    );
                  })()}
                </TableRow>
                );
              })
            )}
          </TableBody>
          {(summaryRow || showTotal) && (
            <TableFooter>
              {summaryRow && (
                <TableRow className="bg-slate-50 font-semibold dark:border-border dark:bg-neutral-800/60">
                  {visibleColumnsForTable.map((column, colIndex) => {
                    const swType =
                      column.render &&
                      typeof column.render === 'object' &&
                      (column.render.type === 'Stacked' ||
                        column.render.type === 'Delta' ||
                        column.render.type === 'PctBar')
                        ? (column.render.type as SwCellType)
                        : null;
                    return (
                      <TableCell
                        key={`summary-${column.key || column.dataIndex}`}
                        className={colIndex === 0 ? 'text-left' : ''}
                      >
                        {colIndex === 0
                          ? summaryLabel || t('table.summary_total', 'Total')
                          : swType
                          ? renderSwCell(
                              swType,
                              column.render!.props as SwCellProps,
                              summaryRow,
                              column.dataIndex
                            )
                          : formatCellValue(summaryRow[column.dataIndex])}
                      </TableCell>
                    );
                  })}
                  {showActionsColumn && <TableCell />}
                </TableRow>
              )}
              {showTotal && (
                <TableRow className="dark:border-border">
                  <TableCell colSpan={visibleColumnsForTable.length + (showActionsColumn ? 1 : 0) + (deletable ? 1 : 0)} className="text-right">
                    {t('common:pagination.total_items', 'Total: {{count}} items', { count: data?.length || 0 })}
                  </TableCell>
                </TableRow>
              )}
            </TableFooter>
          )}
        </Table>

        {effectivePagination && (datasetConfig?.datasetId || databaseDataSourceConfig?.datasourceId || (data?.length || 0) > 0) && (() => {
          return true;
        })() && (
          <div className={cn("mt-4", fillCell && !stickyHeaderOn && "shrink-0")}>
            {paginationStyle === 'simple' ? (
              <div className="flex items-center justify-between flex-wrap gap-2">
                {(effectivePagination.showTotal !== false) && (
                  <div className="text-sm text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                    {totalRecords} {t('common:pagination.items', 'items')}
                  </div>
                )}

                {(() => {
                  const shouldShowPagination = totalPages > 1;
                  return shouldShowPagination;
                })() && (
                  <div className="flex items-center gap-2">
                    <Pagination className="justify-center">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage > 1) handlePageChange(currentPage - 1);
                            }}
                            className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                            href="#"
                          />
                        </PaginationItem>

                        <PaginationItem>
                          <span className="px-3 py-1 text-sm text-neutral-700 dark:text-neutral-300">
                            {currentPage} / {totalPages}
                          </span>
                        </PaginationItem>

                        <PaginationItem>
                          <PaginationNext
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage < totalPages) handlePageChange(currentPage + 1);
                            }}
                            className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                            href="#"
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}

                {(effectivePagination.showSizeChanger !== false) && (
                  <div className="flex items-center space-x-2">
                    <select
                      className="h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    >
                      {[10, 20, 50, 100, 500, 1000].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (

              <div className="flex items-center justify-between">
                {(effectivePagination.showTotal !== false) && (
                  <div className="text-sm text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                    {loading || isApiLoading || databaseLoading ? (

                      <div className="flex items-center space-x-2">
                        <Skeleton className="h-4 w-24" />
                      </div>
                    ) : (
                      t('common:pagination.showing_range_total', 'Showing {{start}}-{{end}} of {{total}} items', {
                        start: ((currentPage - 1) * pageSize) + 1,
                        end: Math.min(currentPage * pageSize, totalRecords),
                        total: totalRecords
                      })
                    )}
                  </div>
                )}

                {(() => {
                  const shouldShowPagination = totalPages > 1;
                  return shouldShowPagination;
                })() && (
                  <Pagination className="justify-center">
                    <PaginationContent>
                      {loading || isApiLoading || databaseLoading ? (

                        <>
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="mx-1 h-8 w-20" />
                          <Skeleton className="h-8 w-8" />
                        </>
                      ) : (
                        <>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={(e) => {
                                e.preventDefault();
                                if (currentPage > 1) handlePageChange(currentPage - 1);
                              }}
                              className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                              href="#"
                            />
                          </PaginationItem>

                          {getPaginationItems().map((item, i) => (
                            item === 'ellipsis' ? (
                              <PaginationItem key={`ellipsis-${i}`}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            ) : (
                              <PaginationItem key={item}>
                                <PaginationLink
                                  href="#"
                                  isActive={currentPage === item}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handlePageChange(item as number);
                                  }}
                                >
                                  {item}
                                </PaginationLink>
                              </PaginationItem>
                            )
                          ))}

                          <PaginationItem>
                            <PaginationNext
                              onClick={(e) => {
                                e.preventDefault();
                                if (currentPage < totalPages) handlePageChange(currentPage + 1);
                              }}
                              className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                              href="#"
                            />
                          </PaginationItem>
                        </>
                      )}
                    </PaginationContent>
                  </Pagination>
                )}

                {(effectivePagination.showSizeChanger !== false) && (
                  <div className="flex items-center space-x-2 ml-4">
                    {loading || isApiLoading || databaseLoading ? (

                      <>
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-4 w-12" />
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                          {t('common:pagination.items_per_page', 'Items per page')}
                        </span>
                        <select
                          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          value={pageSize}
                          onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                        >
                          {[10, 20, 50, 100, 500, 1000].map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                        <span className="text-sm text-neutral-500 dark:text-neutral-400">
                          {t('common:pagination.items', 'items')}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent style={{ maxWidth: MODAL_DIMENSIONS.lg.width, maxHeight: MODAL_DIMENSIONS.lg.maxHeight }} className="overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('table.add_record', 'Add Record')}</DialogTitle>
            <DialogDescription>
              {t('table.fill_info_to_create', 'Please fill in the following information to create a new record')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {visibleColumns
              .filter(column => column.editable)
              .map(column => (
                <div key={column.dataIndex} className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">
                    {column.title}
                    {column.editRequired && <span className="text-red-500 ml-1">*</span>}
                    {column.dataIndex === rowKey && (
                      <div className="text-xs text-neutral-500 mt-1">
                        {t('table.leave_empty_auto_generate', 'Leave empty to auto-generate')}
                      </div>
                    )}
                  </label>
                  {column.fieldType === 'JSON' ? (
                    <Textarea
                      className="col-span-3 font-mono text-sm  w-[80%]"
                      value={typeof formData[column.dataIndex] === 'object' 
                        ? JSON.stringify(formData[column.dataIndex], null, 2) 
                        : formData[column.dataIndex] as string || ''}
                      onChange={(e) => handleJsonFormChange(column.dataIndex, e.target.value)}
                      required={column.editRequired}
                      rows={8}
                    />
                  ) : (
                    <Input
                      className="col-span-3  w-[80%]"
                      type={column.dataIndex === rowKey ? "number" : "text"}
                      value={formData[column.dataIndex] as string || ''}
                      onChange={(e) => handleFormChange(column.dataIndex, e.target.value)}
                      required={column.editRequired && column.dataIndex !== rowKey}
                      placeholder={column.dataIndex === rowKey ? t('table.auto_generate_id', 'Leave empty to auto-generate 13-digit timestamp ID') : ""}
                    />
                  )}
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isApiLoading}>{t('table.cancel', 'Cancel')}</Button>
            <Button 
              onClick={handleAddSubmit} 
              disabled={isApiLoading || visibleColumns
                .filter(column => column.editable && column.editRequired)
                .some(column => !formData[column.dataIndex])}
            >
              {isApiLoading ? (
                <>
                  <Loading size="sm" className="mr-2" />
                  {t('table.processing', 'Processing...')}
                </>
              ) : t('table.add', 'Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent style={{ maxWidth: MODAL_DIMENSIONS.lg.width, maxHeight: MODAL_DIMENSIONS.lg.maxHeight }} className="overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('table.edit_record', 'Edit Record')}</DialogTitle>
            <DialogDescription>
              {t('table.modify_info_to_update', 'Modify the following information to update the record')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {visibleColumns
              .filter(column => column.editable)
              .map(column => (
                <div key={column.dataIndex} className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm">
                    {column.title}
                    {column.editRequired && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {column.fieldType === 'JSON' ? (
                    <Textarea
                      className="col-span-3 font-mono text-sm  w-[80%]"
                      value={formatJsonForEditing(formData[column.dataIndex])}
                      onChange={(e) => handleJsonFormChange(column.dataIndex, e.target.value)}
                      required={column.editRequired}
                      rows={8}
                    />
                  ) : (
                    <Input
                      className="col-span-3 w-[80%]"
                      value={formData[column.dataIndex] as string || ''}
                      onChange={(e) => handleFormChange(column.dataIndex, e.target.value)}
                      required={column.editRequired}
                    />
                  )}
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isApiLoading}>{t('table.cancel', 'Cancel')}</Button>
            <Button 
              onClick={handleEditSubmit} 
              disabled={isApiLoading || visibleColumns
                .filter(column => column.editable && column.editRequired)
                .some(column => !formData[column.dataIndex])}
            >
              {isApiLoading ? (
                <>
                  <Loading size="sm" className="mr-2" />
                  {t('table.processing', 'Processing...')}
                </>
              ) : t('table.save', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent style={{ maxWidth: MODAL_DIMENSIONS.sm.width, maxHeight: MODAL_DIMENSIONS.sm.maxHeight }} className="overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('table.confirm_delete', 'Confirm Delete')}</DialogTitle>
            <DialogDescription>
              {t('table.confirm_delete_description', 'Are you sure you want to delete this record? This operation cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isApiLoading}>{t('table.cancel', 'Cancel')}</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isApiLoading}>
              {isApiLoading ? (
                <>
                  <Loading size="sm" className="mr-2" />
                  {t('table.processing', 'Processing...')}
                </>
              ) : t('table.delete', 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Delete Confirmation Dialog */}
      <Dialog open={isBatchDeleteDialogOpen} onOpenChange={setIsBatchDeleteDialogOpen}>
        <DialogContent style={{ maxWidth: MODAL_DIMENSIONS.sm.width, maxHeight: MODAL_DIMENSIONS.sm.maxHeight }} className="overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('table.confirm_batch_delete', 'Delete selected records')}</DialogTitle>
            <DialogDescription>
              {t('table.confirm_batch_delete_description', 'Are you sure you want to delete the {{count}} selected record(s)? This operation cannot be undone.', { count: selectedRowIds.length })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchDeleteDialogOpen(false)} disabled={isApiLoading}>{t('table.cancel', 'Cancel')}</Button>
            <Button variant="destructive" onClick={handleBatchDeleteConfirm} disabled={isApiLoading}>
              {isApiLoading ? (
                <>
                  <Loading size="sm" className="mr-2" />
                  {t('table.processing', 'Processing...')}
                </>
              ) : t('table.delete', 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Progress Dialog */}
      <Dialog open={exportState.showProgress} onOpenChange={() => {}}>
        <DialogContent style={{ maxWidth: MODAL_DIMENSIONS.md.width, maxHeight: MODAL_DIMENSIONS.md.maxHeight }} className="overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('table.exporting_data', 'Exporting data')}</DialogTitle>
            <DialogDescription>
              {t('table.please_wait_processing', 'Please wait, fetching and processing data...')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${exportState.progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-neutral-400 text-center">
              {t('table.processed_records', 'Processed {{current}} / {{total}} records ({{progress}}%)', { 
                current: exportState.currentCount.toLocaleString(), 
                total: exportState.totalCount.toLocaleString(), 
                progress: exportState.progress.toFixed(1) 
              })}
            </p>
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                onClick={() => {
                  setExportState(prev => ({
                    ...prev,
                    isExporting: false,
                    showProgress: false
                  }));
                }}
                disabled={!exportState.isExporting}
              >
                {t('table.cancel_export', 'Cancel Export')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* JSON Preview Dialog */}
      <Dialog open={jsonPreviewData.open} onOpenChange={(open) => setJsonPreviewData(prev => ({...prev, open}))}>
        <DialogContent style={{ maxWidth: MODAL_DIMENSIONS.lg.width, maxHeight: MODAL_DIMENSIONS.lg.maxHeight }} className="overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between relative">
            <DialogTitle>{t('table.json_content', 'JSON Content')}</DialogTitle>
            <DialogDescription className="sr-only">
              {t('table.json_content_preview_a11y', 'Preview of JSON content for the current record')}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh] custom-scrollbar">
            <pre className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-md whitespace-pre-wrap break-all text-sm">
              {jsonPreviewData.data ? 
                (typeof jsonPreviewData.data === 'string' 
                  ? ((() => {
                      try {
                        return JSON.stringify(JSON.parse(jsonPreviewData.data), null, 2);
                      } catch {
                        return jsonPreviewData.data;
                      }
                    })())
                  : JSON.stringify(jsonPreviewData.data, null, 2)
                ) 
                : 'No data available'
              }
            </pre>
          </div>
          <DialogFooter>
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={handleCopyJsonContent}>
                {t('table.copy_content', 'Copy Content')}
              </Button>
              <Button variant="outline" onClick={() => setJsonPreviewData({open: false, data: null})}>
                {t('table.close', 'Close')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, action: null, record: null, onConfirm: null })}
        onConfirm={() => confirmDialog.onConfirm?.()}
        title={confirmDialog.action?.config.confirmMessage ? undefined : undefined}
        message={confirmDialog.action?.config.confirmMessage}
        buttonType={confirmDialog.action?.variant}
        buttonLabel={confirmDialog.action?.label}
        actionType={
          confirmDialog.action?.type === 'deleteDataset' ? 'delete' :
          confirmDialog.action?.type === 'insertDataset' ? 'insert' :
          confirmDialog.action?.type === 'updateDataset' ? 'update' :
          'custom'
        }
        loading={isApiLoading}
      />

      <ActionFormDialog
        isOpen={actionFormDialog.isOpen}
        action={actionFormDialog.action}
        record={actionFormDialog.record}
        pageParams={pageParams as ParameterRecord}
        tableColumns={columns}
        onSubmit={handleFormSubmit}
        onClose={() => setActionFormDialog({
          isOpen: false,
          action: null,
          record: null
        })}
        loading={isApiLoading}
      />

      {recordInteraction?.enabled ? (
        <RecordDetailDialog
          open={Boolean(detailRecord)}
          record={detailRecord}
          config={recordInteraction}
          onClose={() => setDetailRecord(null)}
          onEdit={
            recordInteraction.edit?.enabled && recordInteraction.edit.action && detailRecord
              ? () => {
                  const record = detailRecord;
                  setDetailRecord(null);
                  void handleActionClick(recordInteraction.edit!.action!, record);
                }
              : undefined
          }
        />
      ) : null}

      <Dialog open={taskExecuteDialog.isOpen} onOpenChange={(open) => {
        if (!open) {
          setTaskExecuteDialog({ isOpen: false, action: null, record: null });
          setIsTaskExecuting(false);
        }
      }}>
        <DialogContent
          style={{ maxWidth: MODAL_DIMENSIONS.lg.width, maxHeight: MODAL_DIMENSIONS.lg.maxHeight }}
          className="px-8 overflow-y-auto"
        >
          {taskExecuteDialog.action && (() => {
            const config = taskExecuteDialog.action.config.taskExecute;
            if (!config) {
              return (
                <>
                  <DialogHeader className="pb-6">
                    <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                      {taskExecuteDialog.action?.icon ? (
                        <span
                          className="inline-flex shrink-0 items-center text-neutral-600 dark:text-neutral-400"
                          aria-hidden
                        >
                          {renderIcon(taskExecuteDialog.action.icon)}
                        </span>
                      ) : null}
                      <span className="min-w-0 break-words">
                        {taskExecuteDialog.action?.label?.trim() ||
                          t('table.execute_task', 'Execute Task')}
                      </span>
                    </DialogTitle>
                    <DialogDescription>
                      {t('table.task_execute_config_missing', 'Task execution is not configured')}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="flex justify-end space-x-3 border-t border-neutral-200 px-2 pt-6 dark:border-neutral-700">
                    <Button
                      variant="outline"
                      className="px-6"
                      onClick={() => {
                        setTaskExecuteDialog({ isOpen: false, action: null, record: null });
                        setIsTaskExecuting(false);
                      }}
                    >
                      {t('table.cancel', 'Cancel')}
                    </Button>
                  </DialogFooter>
                </>
              );
            }

            const isNormalMode = (config.interactiveMode || 'professional') === 'normal';

            let resolvedTaskId: string = '';
            if (typeof config.taskId === 'string') {
              resolvedTaskId = config.taskId;
            } else if (config.taskId.source === 'parameter') {
              const paramName = config.taskId.paramName || '';
              resolvedTaskId = String(
                (taskExecuteDialog.record?.[paramName] as string) ||
                (pageParams as Record<string, unknown>)[paramName] ||
                ''
              );
            } else {
              resolvedTaskId = config.taskId.value || '';
            }

            const parameterMapping: Record<string, {
              source?: string;
              value?: string;
              labelText?: string;
              requiredInTaskInput?: boolean;
              sortOrder?: number;
            }> = {};

            if (config.parameterMapping) {
              Object.entries(config.parameterMapping).forEach(([paramKey, mapping]) => {
                parameterMapping[paramKey] = {
                  source: mapping.source,
                  value: mapping.value,
                  labelText: mapping.labelText,
                  requiredInTaskInput: mapping.requiredInTaskInput,
                  sortOrder: mapping.sortOrder
                };
              });
            }

            const actionButtonLabel = taskExecuteDialog.action?.label?.trim();

            return (
              <>
                <DialogHeader className="pb-6">
                  <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                    {taskExecuteDialog.action?.icon ? (
                      <span
                        className="inline-flex shrink-0 items-center text-neutral-600 dark:text-neutral-400"
                        aria-hidden
                      >
                        {renderIcon(taskExecuteDialog.action.icon)}
                      </span>
                    ) : null}
                    <span className="min-w-0 break-words">
                      {actionButtonLabel || t('table.execute_task', 'Execute Task')}
                    </span>
                    {isTaskExecuting && (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
                    )}
                  </DialogTitle>
                  <DialogDescription className={isNormalMode ? 'sr-only' : undefined}>
                    {isNormalMode
                      ? t('table.task_execute_dialog_a11y', 'Fill in task parameters, then click execute')
                      : t(
                          'common:action_form_dialog.description',
                          'Please fill in the following information to complete the operation'
                        )}
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                  <div className="space-y-6 py-2 px-2">
                    {!resolvedTaskId ? (
                      <div className="text-center text-sm text-red-500">
                        {t('table.task_id_required', 'Task ID is required')}
                      </div>
                    ) : (
                    <TaskInputRenderer
                      ref={taskExecuteInputRef}
                      taskId={resolvedTaskId}
                      embedded
                      embeddedFieldLayout="plain"
                      interactiveMode={config.interactiveMode || 'professional'}
                      submitButtonPlacement={isNormalMode ? 'dialogFooter' : 'default'}
                      isDialogExecuting={isTaskExecuting}
                      onDialogExecutingChange={setIsTaskExecuting}
                      mappingContext={{
                        formFieldValues: (taskExecuteDialog.record ?? {}) as Record<string, unknown>,
                        pageParams: pageParams as Record<string, unknown>
                      }}
                      parameterConfig={{ parameterMapping }}
                      onSuccess={() => {
                        const completedAction = taskExecuteDialog.action;
                        const completedRecord = taskExecuteDialog.record;
                        setTaskExecuteDialog({ isOpen: false, action: null, record: null });
                        setIsTaskExecuting(false);

                        toast({
                          title: t('table.task_execution_success', 'Task execution successful'),
                          description: config.successMessage || t('table.task_executed_successfully', 'Task executed successfully'),
                        });

                        if (completedAction) {
                          fireActionSuccessTrigger(
                            completedAction,
                            undefined,
                            completedRecord ?? undefined
                          );
                        }

                        if (config.refreshAfterSuccess !== false) {
                          if (datasetConfig?.datasetId) {
                            fetchDataFromApi(false, currentPage, pageSize);
                          } else if (databaseDataSourceConfig?.datasourceId) {
                            const offset = (currentPage - 1) * pageSize;
                            refetchDatabaseData({
                              page: currentPage,
                              limit: pageSize,
                              offset
                            });
                          }
                        }
                      }}
                      onError={(error) => {
                        setIsTaskExecuting(false);
                        toast({
                          variant: 'destructive',
                          title: t('table.task_execution_failed', 'Task execution failed'),
                          description: error.message || config.errorMessage || t('table.network_error_retry', 'Network error, please retry'),
                        });
                      }}
                    />
                    )}
                  </div>
                </ScrollArea>
                <DialogFooter className="flex justify-end space-x-3 border-t border-neutral-200 px-2 pt-6 dark:border-neutral-700">
                  <Button
                    variant="outline"
                    type="button"
                    className="px-6"
                    onClick={() => {
                      setTaskExecuteDialog({ isOpen: false, action: null, record: null });
                      setIsTaskExecuting(false);
                    }}
                    disabled={isTaskExecuting}
                  >
                    {t('table.cancel', 'Cancel')}
                  </Button>
                  {isNormalMode && resolvedTaskId && (
                    <Button
                      type="button"
                      className="min-w-[100px] px-6"
                      onClick={() => void taskExecuteInputRef.current?.submitTask()}
                      disabled={isTaskExecuting}
                    >
                      {isTaskExecuting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {t('renderers:task_input.execute_task', 'Execute Task')}
                    </Button>
                  )}
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TableRenderer;
