import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { 
  EnhancedDataSource, 
  ParameterFilterCondition 
} from '../types/datasource';
import i18n from '@/locales/i18n';

export interface UseEnhancedDataSourceOptions {
  dataSource: EnhancedDataSource | null;
  onDataChange?: (data: any[]) => void;
  onError?: (error: string) => void;
  onFilterChange?: (filter: string) => void;
  componentId?: string;
  pageSize?: number;
}

export interface DatasetPagination {
  total: number;
  limit: number;
  offset: number;
  current_page: number;
  total_pages: number;
  has_more: boolean;
}

export interface EnhancedDataSourceRefreshOptions {
  page?: number;
  pageSize?: number;
}

export interface UseEnhancedDataSourceReturn {
  data: any[];
  loading: boolean;
  error: string | null;
  pagination: DatasetPagination | undefined;
  refresh: (options?: EnhancedDataSourceRefreshOptions) => Promise<void>;
  currentFilter: string;
  parameterValues: Record<string, any>;
  filterConditions: string[];
  exportAllData: (onProgress: (current: number, total: number) => void) => Promise<any[]>;
}

function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout;

  const debouncedFunc = ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T & { cancel: () => void };

  debouncedFunc.cancel = () => {
    clearTimeout(timeout);
  };

  return debouncedFunc;
}

function getUrlParameters(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  const params: Record<string, string> = {};
  const urlParams = new URLSearchParams(window.location.search);

  for (const [key, value] of urlParams.entries()) {
    params[key] = value;
  }

  return params;
}

function extractDatasetRows(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const data = (payload as { data?: unknown }).data;
  if (Array.isArray(data)) return data;

  if (data && typeof data === 'object') {
    const nestedData = (data as { data?: unknown }).data;
    if (Array.isArray(nestedData)) return nestedData;

    const records = (data as { records?: unknown }).records;
    if (Array.isArray(records)) return records;

    const items = (data as { items?: unknown }).items;
    if (Array.isArray(items)) return items;
  }

  return [];
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function toPositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toNonNegativeInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

export function extractDatasetPagination(
  payload: unknown,
  fallback: { page: number; pageSize: number; rowCount: number }
): DatasetPagination {
  const root = getRecord(payload);
  const data = getRecord(root?.data);
  const nestedData = getRecord(data?.data);
  const candidate = [root, data, nestedData]
    .map((value) => getRecord(value?.pagination))
    .find(Boolean);

  const limit = toPositiveInteger(candidate?.limit, fallback.pageSize);
  const offset = toNonNegativeInteger(candidate?.offset, (fallback.page - 1) * limit);
  const minimumKnownTotal = offset + fallback.rowCount;
  const total = toNonNegativeInteger(candidate?.total, minimumKnownTotal);
  const totalPages = toPositiveInteger(candidate?.total_pages, Math.max(1, Math.ceil(total / limit)));
  const currentPage = toPositiveInteger(candidate?.current_page, Math.floor(offset / limit) + 1);

  return {
    total,
    limit,
    offset,
    current_page: currentPage,
    total_pages: totalPages,
    has_more: typeof candidate?.has_more === 'boolean'
      ? candidate.has_more
      : currentPage < totalPages,
  };
}

function buildFilterCondition(
  field: string,
  operator: string,
  value: any
): string {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  const safeValue = typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value;

  switch (operator) {
    case 'eq':
      return `${field} = ${safeValue}`;
    case 'ne':
      return `${field} != ${safeValue}`;
    case 'gt':
      return `${field} > ${safeValue}`;
    case 'lt':
      return `${field} < ${safeValue}`;
    case 'gte':
      return `${field} >= ${safeValue}`;
    case 'lte':
      return `${field} <= ${safeValue}`;
    case 'like':
      return `${field} LIKE '%${String(value).replace(/'/g, "''")}%'`;
    case 'in':
      const inValues = Array.isArray(value) ? value : [value];
      return `${field} IN (${inValues.map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v).join(', ')})`;
    case 'not_in':
      const notInValues = Array.isArray(value) ? value : [value];
      return `${field} NOT IN (${notInValues.map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v).join(', ')})`;
    default:
      return '';
  }
}

export const useEnhancedDataSource = ({
  dataSource,
  onDataChange,
  onError,
  onFilterChange,
  componentId = 'enhanced-data-source',
  pageSize: requestedPageSize,
}: UseEnhancedDataSourceOptions): UseEnhancedDataSourceReturn => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<DatasetPagination | undefined>(undefined);
  const [parameterValues, setParameterValues] = useState<Record<string, any>>({});

  const fetchDataRef = useRef<any>(null);
  const previousParametersRef = useRef<Record<string, any>>({});

  const stableDataSourceId = dataSource?.datasetId;
  const stableParameterFilters = useMemo(() => dataSource?.params?.parameterFilters, [dataSource?.params?.parameterFilters]);
  const stableDataSourceParams = useMemo(() => dataSource?.params, [dataSource?.params]);
  const defaultPageSize = toPositiveInteger(requestedPageSize, toPositiveInteger(stableDataSourceParams?.limit, 100));

  const buildDynamicFilter = useCallback((): { filter: string; conditions: string[] } => {
    if (!stableParameterFilters) {
      return { 
        filter: '', 
        conditions: []
      };
    }

    const urlParams = getUrlParameters();
    const conditions: string[] = [];

    stableParameterFilters.forEach((filterConfig: ParameterFilterCondition) => {
      if (!filterConfig.enabled) return;

      const paramValue = urlParams[filterConfig.parameterName] ?? filterConfig.fallbackValue;
      if (paramValue === undefined || paramValue === null) return;

      const condition = buildFilterCondition(
        filterConfig.field,
        filterConfig.operator,
        paramValue
      );

      if (condition) {
        conditions.push(condition);

      }
    });

    const finalFilter = conditions.length > 0 ? conditions.join(' AND ') : '';

    return { filter: finalFilter, conditions };
  }, [stableParameterFilters, componentId]);

  const fetchData = useCallback(async (options: EnhancedDataSourceRefreshOptions = {}) => {
    if (!stableDataSourceId) {
      setData([]);
      setPagination(undefined);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { filter, conditions } = buildDynamicFilter();
      const limit = toPositiveInteger(options.pageSize, defaultPageSize);
      const configuredOffset = toNonNegativeInteger(stableDataSourceParams?.offset, 0);
      const configuredPage = Math.floor(configuredOffset / limit) + 1;
      const page = toPositiveInteger(options.page, configuredPage);
      const offset = (page - 1) * limit;

      const { queryDatasetData } = await import('@/app/services/workbenchApi');

      const response = await queryDatasetData(stableDataSourceId, {
        ...stableDataSourceParams,
        filter,
        limit,
        offset,
      });

      const newData = extractDatasetRows(response);
      setData(newData);
      setPagination(extractDatasetPagination(response, {
        page,
        pageSize: limit,
        rowCount: newData.length,
      }));

      onDataChange?.(newData);
      onFilterChange?.(filter);

    } catch (err: any) {

      const msg = (err?.message ?? '').toString().toLowerCase();
      if (
        err?.name === 'AbortError' ||
        err?.code === 'ERR_CANCELED' ||
        msg.includes('canceled') ||
        msg.includes('cancelled')
      ) {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : i18n.t('common:errors.data_fetch_failed', 'Data fetch failed');
      setError(errorMessage);
      onError?.(errorMessage);

      console.error(`[EnhancedDataSource:${componentId}] Data fetch failed:`, err);
    } finally {
      setLoading(false);
    }
  }, [stableDataSourceId, stableDataSourceParams, buildDynamicFilter, onDataChange, onError, onFilterChange, componentId, defaultPageSize]);

  const dataSourceFetchKey = useMemo(
    () =>
      stableDataSourceId
        ? JSON.stringify({
            datasetId: stableDataSourceId,
            params: stableDataSourceParams ?? {},
            communicationEnabled: Boolean(dataSource?.communicationConfig?.enabled),
          })
        : '',
    [stableDataSourceId, stableDataSourceParams, dataSource?.communicationConfig?.enabled]
  );

  const lastEnhancedFetchKeyRef = useRef('');

  useEffect(() => {
    if (!dataSourceFetchKey) {
      lastEnhancedFetchKeyRef.current = '';
      return;
    }

    if (lastEnhancedFetchKeyRef.current === dataSourceFetchKey) {
      return;
    }
    lastEnhancedFetchKeyRef.current = dataSourceFetchKey;

    const urlParams = getUrlParameters();
    setParameterValues(urlParams);

    if (!dataSource?.communicationConfig?.enabled) {
      void fetchData();
      return;
    }

    if (Object.keys(previousParametersRef.current).length === 0) {
      void fetchData();
    }
    previousParametersRef.current = urlParams;

    return () => {
      if (fetchDataRef.current) {
        fetchDataRef.current.cancel();
      }
    };
  }, [dataSourceFetchKey, dataSource?.communicationConfig?.enabled, fetchData, componentId]);

  const refresh = useCallback(async (options: EnhancedDataSourceRefreshOptions = {}) => {
    if (fetchDataRef.current) {
      fetchDataRef.current.cancel();
    }
    await fetchData(options);
  }, [fetchData]);

  const { currentFilter, filterConditions } = useMemo(() => {
    const result = buildDynamicFilter();
    return {
      currentFilter: result.filter,
      filterConditions: result.conditions
    };
  }, [buildDynamicFilter]);

  const exportAllData = useCallback(async (
    onProgress: (current: number, total: number) => void
  ): Promise<any[]> => {
    if (!stableDataSourceId) {
      console.warn('[EnhancedDataSource] Missing data source id; returning empty export result');
      onProgress(0, 0);
      return [];
    }

    try {
      const exportPageSize = 1000;
      let allData: any[] = [];
      let totalCount = 0;

      const { queryDatasetData } = await import('@/app/services/workbenchApi');

      const { filter } = buildDynamicFilter();

      const firstResponse = await queryDatasetData(stableDataSourceId, {
        ...stableDataSourceParams,
        filter,
        limit: 1,
        offset: 0
      });

      totalCount = 0; 

      if (extractDatasetRows(firstResponse).length > 0) {
        let currentExportPage = 1;
        let hasMore = true;

        while (hasMore) {
          const offset = (currentExportPage - 1) * exportPageSize;

          const response = await queryDatasetData(stableDataSourceId, {
            ...stableDataSourceParams,
            filter,
            limit: exportPageSize,
            offset: offset
          });

          if (response?.data) {
            const pageData = extractDatasetRows(response);
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
      console.error('[EnhancedDataSource] Export failed:', error);
      throw error;
    }
  }, [stableDataSourceId, stableDataSourceParams, buildDynamicFilter]);

  return {
    data,
    loading,
    error,
    pagination,
    refresh,
    currentFilter,
    parameterValues,
    filterConditions,
    exportAllData
  };
};

export default useEnhancedDataSource;
