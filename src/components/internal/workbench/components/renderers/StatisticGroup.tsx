import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@genispace/shared-ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@genispace/shared-ui';
import { cn } from '@genispace/shared-utils';
import apiClient from '@/lib/api/apiClient';
import { withDatasourceVersion } from '@/app/services/workbenchApi';
import { resolveRuntimeDatasourceVersion } from '@/utils/datasourceVersion';
import { Button, Z_INDEX_CLASSES } from '@genispace/shared-ui';
import { Skeleton } from '../skeleton';
import { getIconComponent } from '@/utils/iconUtils';
import { SEMANTIC_COLORS } from '@/utils/colors';
import { resolveStatisticColor } from '@/utils/statisticColors';
import i18n from '@/locales/i18n';
import { useComponentCommunication } from '@/hooks/useComponentCommunication';
import { useParameterHandler } from '@/hooks/useParameterHandler';
import { useWaitForParameters } from '@/hooks/useWaitForParameters';
import type { DatabaseDataSourceConfig } from '@/types/databaseDataSource';
import type { ComponentParameterConfig } from '@/types/parameters';
import {
  extractParameterNamesFromDatasourceParameters,
  extractFetchGateParamsFromDatasourceParameters,
  hasResolvedDatasourceParameterValues,
  processDataSourceParametersForQuery,
  replaceParametersInConditionString,
} from '@/utils/databaseDatasourceParams';
import { queryDatabaseColumnValue as fetchDatabaseColumnValue } from '@/utils/databaseDatasourceColumnValue';
import { useMobileFlowLayout } from '@/components/mobileFlowLayoutContext';
import { useGrid24FillCell } from '@/components/grid24CellContext';
import { formatCompactCurrency, formatCompactK } from './heroCardUtils';
import { usePageFullscreen } from '@/contexts/PageFullscreenContext';

const queryCache = new Map<string, { promise: Promise<StatisticResult>; timestamp: number }>();
const CACHE_DURATION = 5000; 

const globalDataSourceCache = new Map<string, { promise: Promise<Record<string, unknown>[]>; timestamp: number }>();
const GLOBAL_CACHE_DURATION = 10000; 

interface StatisticItemProps {
  key: string;
  title: string;
  value: number | string;
  precision?: number;
  prefix?: string;
  suffix?: string;
  icon?: string;
  iconSize?: number;

  color?: string;

  iconColor?: string;

  valueColor?: string;
  loading?: boolean;
  valueStyle?: React.CSSProperties;
  statisticType?: 'manual' | 'count' | 'sum' | 'avg' | 'max' | 'min' | 'column';
  statisticField?: string;
  statisticCondition?: string;
  datasetId?: string;

  databaseDataSourceConfig?: DatabaseDataSourceConfig | null;

  useCustomDataSource?: boolean;

  error?: string;
  
  format?: 'currency-compact' | 'compact-k' | 'percent' | 'number';
  currency?: string;
  accent?: boolean;
  warnBelow?: number;
  warnText?: string;
  /** Render an em dash instead of a fake 0 when the column value is NULL / missing (e.g. WoS pending upstream data). */
  emptyDash?: boolean;
  valueKind?: 'trend';      
  subText?: string;         
  trend?: {
    enabled?: boolean;
    trendCondition?: string;
    suffix?: string;
    description?: string;
    upStyle?: 'success' | 'warning' | 'error';
    downStyle?: 'success' | 'warning' | 'error';

    value?: number;
    type?: 'up' | 'down';
    status?: 'success' | 'warning' | 'error';

    error?: string;
  };
}

interface StatisticGroupProps {
  items?: StatisticItemProps[];
  loading?: boolean;
  className?: string;
  useMockData?: boolean;
  mockData?: StatisticItemProps[];
  grid?: {
    cols?: number;
    gutter?: number | string | [number | string, number | string];
  };
  itemStyle?: {
    padding?: string;
    height?: string | number;
    titleStyle?: React.CSSProperties;
    valueStyle?: React.CSSProperties;
  };

  databaseDataSourceConfig?: DatabaseDataSourceConfig | null;

  componentParameterConfig?: ComponentParameterConfig;
  componentId?: string;
  pageId?: string;
  tabId?: string;
  pageParams?: Record<string, any>;
  onParameterChange?: (key: string, value: any) => void;

  followPageRefresh?: boolean;

  titleFontSize?: number;
  valueFontSize?: number;
  labelFontSize?: number;
}

const DEFAULT_STATISTIC_FONT_SIZES = {
  title: 14,
  value: 30,
  label: 13,
} as const;

interface DatasetStatisticsResponse {
  success: boolean;
  data: {
    datasetId: string;
    statisticType: string;
    field?: string;
    condition?: string;
    trendCondition?: string;
    result: number;
    currentValue?: number;
    trendValue?: number;
    changeValue?: number;
    changeType?: 'up' | 'down';
    error?: string;
  };
}

interface StatisticResult {
  result: number;
  error?: string;
  trendData?: {
    value: number;
    type: 'up' | 'down';
    changeValue: number;
    error?: string;
  };
}

interface StatisticRequestBody {
  statisticType: string;
  field?: string;
  condition?: string;
  trendCondition?: string;
  suffix?: string;
}

const queryDatasetStatistics = async (
  datasetId: string,
  statisticType: string,
  field?: string,
  condition?: string,
  trendCondition?: string,
  suffix?: string
): Promise<StatisticResult> => {

  const cacheKey = `${datasetId}-${statisticType}-${field || ''}-${condition || ''}-${trendCondition || ''}-${suffix || ''}`;
  const now = Date.now();

  const cached = queryCache.get(cacheKey);
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.promise;
  }

  const queryPromise = (async (): Promise<StatisticResult> => {
    try {

      const requestBody: StatisticRequestBody = {
        statisticType,
        field,
        condition
      };

      if (trendCondition) {
        requestBody.trendCondition = trendCondition;
        requestBody.suffix = suffix;
      }

      const response = await apiClient.post(`/datasets/${datasetId}/statistics`, requestBody);

      const responseData = response.data as DatasetStatisticsResponse;

      if (responseData?.success && responseData?.data) {
        const result: StatisticResult = {
          result: responseData.data.result || 0
        };

        if (responseData.data.error) {
          console.warn(`统计警告 (${statisticType}):`, responseData.data.error);
          result.error = responseData.data.error;
        }

        if (trendCondition && responseData.data.changeValue !== undefined) {
          result.trendData = {
            value: responseData.data.changeValue || 0,
            type: responseData.data.changeType || 'up',
            changeValue: responseData.data.changeValue || 0
          };

          if (responseData.data.error && responseData.data.error.includes(i18n.t('statistic.trend_statistics', 'Trend Statistics'))) {
            result.trendData.error = responseData.data.error;
          }
        }

        return result;
      }

      return { result: 0, error: i18n.t('renderers:statistic.statistics_query_failed', 'Statistics query failed: Response data format error') };
    } catch (error) {
      console.error(`统计查询失败 (${statisticType}):`, error);
      const errorMessage = error instanceof Error ? error.message : i18n.t('renderers:statistic.unknown_error', 'Unknown error');
      return { result: 0, error: `${i18n.t('renderers:statistic.statistics_query_failed_short', 'Statistics query failed')}：${errorMessage}` };
    }
  })();

  queryCache.set(cacheKey, { promise: queryPromise, timestamp: now });

  for (const [key, value] of queryCache.entries()) {
    if (now - value.timestamp >= CACHE_DURATION) {
      queryCache.delete(key);
    }
  }

  return queryPromise;
};

function resolveStatisticIconSize(
  iconSize: number | undefined,
  isMobile: boolean,
  isPageFullscreen: boolean
): number {
  const baseSize = iconSize || 6;
  if (isPageFullscreen) {
    return Math.max(4, baseSize - 1);
  }
  if (!isMobile) {
    return baseSize;
  }
  return Math.max(4, baseSize - 2);
}

const StatisticGroup: React.FC<StatisticGroupProps> = React.memo(({
  items = [],
  loading = false,
  className = '',
  useMockData = false,
  mockData = [],
  grid,
  itemStyle,
  databaseDataSourceConfig: globalDatabaseDataSourceConfig,
  componentParameterConfig,
  componentId = 'statisticGroup',
  pageId,
  tabId,
  pageParams = {},
  onParameterChange,
  followPageRefresh = false,
  titleFontSize,
  valueFontSize,
  labelFontSize
}) => {
  // Narrow-flow flag, not raw viewport: true on real mobile AND in the studio
  // phone frame (where viewport breakpoints would wrongly resolve desktop).
  const isMobile = useMobileFlowLayout();
  const isPageFullscreen = usePageFullscreen();
  const fillCell = useGrid24FillCell();

  const titleFontSizeResolved = titleFontSize ?? DEFAULT_STATISTIC_FONT_SIZES.title;
  const valueFontSizeResolved = valueFontSize ?? DEFAULT_STATISTIC_FONT_SIZES.value;
  const labelFontSizeResolved = labelFontSize ?? DEFAULT_STATISTIC_FONT_SIZES.label;

  const hasDatabaseDataSource = !!globalDatabaseDataSourceConfig?.datasourceId;
  const finalItems = !hasDatabaseDataSource && useMockData && mockData.length > 0 ? mockData : items;

  const [statisticItems, setStatisticItems] = useState<StatisticItemProps[]>(finalItems);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshingItems, setRefreshingItems] = useState<Set<string>>(new Set());

  const prevItemsRef = useRef<string>();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const initialLoadTriggeredByParamRef = useRef(false);

  const hasCompletedInitialLoadRef = useRef(false);

  const { rawParams } = useParameterHandler({
    parameterConfig: componentParameterConfig ? {
      enableParameterReceiving: componentParameterConfig.enableParameterReceiving || false
    } : undefined,
    componentParameterConfig,
    pageParams,
    componentId
  });

  const parametersKey = JSON.stringify(globalDatabaseDataSourceConfig?.parameters || {});
  const listenToParametersKey = JSON.stringify(componentParameterConfig?.listenToParameters || []);

  const listenParams = useMemo(() => {

    if (componentParameterConfig?.listenToParameters && componentParameterConfig.listenToParameters.length > 0) {
      return componentParameterConfig.listenToParameters;
    }

    return extractParameterNamesFromDatasourceParameters(globalDatabaseDataSourceConfig?.parameters);

  }, [parametersKey, listenToParametersKey, globalDatabaseDataSourceConfig?.parameters]);

  const fetchWaitParams = useMemo(
    () => extractParameterNamesFromDatasourceParameters(globalDatabaseDataSourceConfig?.parameters),
    [parametersKey, globalDatabaseDataSourceConfig?.parameters]
  );

  // waitForValue contract (see extractFetchGateParamsFromDatasourceParameters): strict
  // (waitForValue:true) params gate on actual VALUES; legacy (no waitForValue, no default) keep
  // the readiness escapes; defaulted/opt-out params never gate. Mirrors useBoundRows.
  const fetchGateParams = useMemo(
    () => extractFetchGateParamsFromDatasourceParameters(globalDatabaseDataSourceConfig?.parameters),
    [parametersKey, globalDatabaseDataSourceConfig?.parameters]
  );

  const refreshAllStatisticsRef = useRef<() => void>(() => {});
  const fetchStatisticsRef = useRef<((items: StatisticItemProps[]) => Promise<StatisticItemProps[]>) | null>(null);

  const handleParameterChange = useCallback((key: string, _value: any) => {

    initialLoadTriggeredByParamRef.current = true;
    refreshAllStatisticsRef.current();
  }, []); 

  const { getCurrentParameter, getAllParameters } = useComponentCommunication({
    componentId,
    listenParameters: listenParams, 
    onParameterChange: handleParameterChange, 
    autoCleanup: true
  });

  const hasLoggedInitRef = useRef(false);
  useEffect(() => {
    if (!hasLoggedInitRef.current) {
      hasLoggedInitRef.current = true;
    }
  }, [componentId, listenParams]);

  const { ready: parametersReady, isReady: checkParametersReady } = useWaitForParameters(
    fetchWaitParams.length > 0 ? fetchWaitParams : undefined
  );

  const replaceParametersInCondition = useCallback(
    (condition: string | undefined): string | undefined =>
      replaceParametersInConditionString(condition, getCurrentParameter, rawParams),
    [getCurrentParameter, rawParams]
  );

  const refreshAllStatistics = useCallback(() => {

    setStatisticItems(prevItems => {
      const updatedItems = prevItems.map(item => ({
        ...item,
        loading: true
      }));

      setTimeout(async () => {
        try {
          // A page-level refresh must read current dataset statistics rather than
          // reusing the short-lived query cache from the previous page state.
          queryCache.clear();
          const fetchFn = fetchStatisticsRef.current;
          if (!fetchFn) {
            setStatisticItems(prev => prev.map(item => ({ ...item, loading: false })));
            return;
          }
          const refreshedItems = await fetchFn(updatedItems);
          setStatisticItems(refreshedItems);
        } catch (error) {
          console.error('[StatisticGroup] 刷新统计数据失败:', error);

          setStatisticItems(prev => prev.map(item => ({ ...item, loading: false })));
        }
      }, 0);

      return updatedItems;
    });
  }, []);

  refreshAllStatisticsRef.current = refreshAllStatistics;

  const getItemDataSourceConfig = useCallback((item: StatisticItemProps): DatabaseDataSourceConfig | null => {
    if (item.useCustomDataSource) {

      return item.databaseDataSourceConfig ?? null;
    }
    return globalDatabaseDataSourceConfig || null;
  }, [globalDatabaseDataSourceConfig]);

  const hasAutoRefreshableStats = useMemo(
    () =>
      finalItems.some((item) => {
        if (!item.statisticType || item.statisticType === 'manual') {
          return false;
        }
        const ds = getItemDataSourceConfig(item);
        return Boolean(item.datasetId || ds?.datasourceId);
      }),
    [finalItems, getItemDataSourceConfig]
  );

  const processDataSourceParameters = useCallback((
    parameters: Record<string, any> | undefined,
    parameterTypes?: Record<string, string>
  ): Record<string, any> => {
    return processDataSourceParametersForQuery(
      parameters,
      parameterTypes,
      getCurrentParameter,
      rawParams
    );
  }, [getCurrentParameter, rawParams]);

  const queryDatabaseColumnValue = async (
    datasourceConfig: DatabaseDataSourceConfig,
    field: string,
    condition?: string,
    opts?: { nullAsEmpty?: boolean }
  ): Promise<{ result: number | string; error?: string }> => {
    const processedParams = processDataSourceParameters(
      datasourceConfig.parameters,
      datasourceConfig.parameterTypes
    );
    return fetchDatabaseColumnValue(datasourceConfig, field, processedParams, condition, opts);
  };

  const fetchDatabaseSourceData = useCallback(async (
    datasourceConfig: DatabaseDataSourceConfig,
    condition?: string
  ): Promise<any[]> => {

    const processedParams = processDataSourceParameters(
      datasourceConfig.parameters,
      datasourceConfig.parameterTypes
    );

    const requestParams: any = {
      page: 1,
      limit: 10000, 
      ...processedParams,
      ...(condition && { filter: condition })
    };

    if (datasourceConfig.outputFields && datasourceConfig.outputFields.length > 0) {
      requestParams.outputFields = datasourceConfig.outputFields;
    }

    const resolvedVersion = resolveRuntimeDatasourceVersion(
      datasourceConfig.datasourceId,
      datasourceConfig.version
    );

    const response = await apiClient.post(
      withDatasourceVersion(`/datasources/${datasourceConfig.datasourceId}/data`, resolvedVersion),
      requestParams
    );

    const responseData = response.data as any;
    if (response.success && responseData?.data && Array.isArray(responseData.data)) {
      return responseData.data;
    }

    return [];
  }, [processDataSourceParameters]);

  const getGlobalDataSourceData = useCallback(async (
    datasourceConfig: DatabaseDataSourceConfig
  ): Promise<any[]> => {

    const processedParams = processDataSourceParameters(
      datasourceConfig.parameters,
      datasourceConfig.parameterTypes
    );

    const resolvedCacheVersion = resolveRuntimeDatasourceVersion(
      datasourceConfig.datasourceId,
      datasourceConfig.version
    );
    const cacheKey = `global-${datasourceConfig.datasourceId}-${resolvedCacheVersion ?? 'default'}-${JSON.stringify(processedParams)}`;
    const now = Date.now();

    const cached = globalDataSourceCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < GLOBAL_CACHE_DURATION) {
      return cached.promise;
    }

    const queryPromise = fetchDatabaseSourceData(datasourceConfig);

    globalDataSourceCache.set(cacheKey, { promise: queryPromise, timestamp: now });

    for (const [key, value] of globalDataSourceCache.entries()) {
      if (now - value.timestamp >= GLOBAL_CACHE_DURATION) {
        globalDataSourceCache.delete(key);
      }
    }

    return queryPromise;
  }, [processDataSourceParameters, fetchDatabaseSourceData]);

  const calculateStatisticFromData = (
    data: any[],
    statisticType: 'count' | 'sum' | 'avg' | 'max' | 'min',
    field?: string,
    condition?: string
  ): StatisticResult => {
    try {

      let filteredData = data;
      if (condition) {

        filteredData = filterDataByCondition(data, condition);
      }

      if (filteredData.length === 0) {
        return { result: 0 };
      }

      let result: number = 0;

      switch (statisticType) {
        case 'count':
          result = filteredData.length;
          break;

        case 'sum':
          if (!field) {
            return { result: 0, error: i18n.t('renderers:statistic.field_required_for_sum', 'Field is required for sum statistic') };
          }
          result = filteredData.reduce((sum: number, item: any) => {
            const value = item[field];
            const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
            return sum + numValue;
          }, 0);
          break;

        case 'avg':
          if (!field) {
            return { result: 0, error: i18n.t('renderers:statistic.field_required_for_avg', 'Field is required for average statistic') };
          }
          const sum = filteredData.reduce((s: number, item: any) => {
            const value = item[field];
            const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
            return s + numValue;
          }, 0);
          result = filteredData.length > 0 ? sum / filteredData.length : 0;
          break;

        case 'max':
          if (!field) {
            return { result: 0, error: i18n.t('renderers:statistic.field_required_for_max', 'Field is required for max statistic') };
          }
          result = filteredData.reduce((max: number | null, item: any) => {
            const value = item[field];
            const numValue = typeof value === 'number' ? value : parseFloat(value);
            if (numValue === null || numValue === undefined || isNaN(numValue)) {
              return max;
            }
            return max === null || numValue > max ? numValue : max;
          }, null as number | null) || 0;
          break;

        case 'min':
          if (!field) {
            return { result: 0, error: i18n.t('renderers:statistic.field_required_for_min', 'Field is required for min statistic') };
          }
          result = filteredData.reduce((min: number | null, item: any) => {
            const value = item[field];
            const numValue = typeof value === 'number' ? value : parseFloat(value);
            if (numValue === null || numValue === undefined || isNaN(numValue)) {
              return min;
            }
            return min === null || numValue < min ? numValue : min;
          }, null as number | null) || 0;
          break;
      }

      return { result };
    } catch (error) {
      console.error('统计计算失败:', error);
      const errorMessage = error instanceof Error ? error.message : i18n.t('renderers:statistic.unknown_error', 'Unknown error');
      return { result: 0, error: `${i18n.t('renderers:statistic.statistics_query_failed_short', 'Statistics query failed')}：${errorMessage}` };
    }
  };

  const filterDataByCondition = (data: any[], condition: string): any[] => {
    if (!condition || condition.trim() === '') {
      return data;
    }

    try {

      const conditions = condition.split(/\s+AND\s+/i).map(c => c.trim());

      return data.filter(item => {
        return conditions.every(cond => {

          const match = cond.match(/^([\w.]+)\s*(NOT LIKE|LIKE|>=|<=|!=|<>|=|>|<)\s*['"']?([^'"']*)['"']?$/i);
          if (!match) return true; 

          const [, field, operator, value] = match;
          const itemValue = item[field];
          const compareValue = value.trim();

          switch (operator.toUpperCase()) {
            case '=':
              return String(itemValue) === compareValue || itemValue == compareValue;
            case '!=':
            case '<>':
              return String(itemValue) !== compareValue && itemValue != compareValue;
            case '>':
              return Number(itemValue) > Number(compareValue);
            case '<':
              return Number(itemValue) < Number(compareValue);
            case '>=':
              return Number(itemValue) >= Number(compareValue);
            case '<=':
              return Number(itemValue) <= Number(compareValue);
            case 'LIKE':
              const likePattern = compareValue.replace(/%/g, '.*');
              return new RegExp(likePattern, 'i').test(String(itemValue));
            case 'NOT LIKE':
              const notLikePattern = compareValue.replace(/%/g, '.*');
              return !new RegExp(notLikePattern, 'i').test(String(itemValue));
            default:
              return true;
          }
        });
      });
    } catch (error) {
      console.warn('条件过滤解析失败，返回原数据:', error);
      return data;
    }
  };

  const queryDatabaseStatistics = async (
    datasourceConfig: DatabaseDataSourceConfig,
    statisticType: 'count' | 'sum' | 'avg' | 'max' | 'min',
    field?: string,
    condition?: string
  ): Promise<StatisticResult> => {
    try {
      const data = await fetchDatabaseSourceData(datasourceConfig, condition);
      return calculateStatisticFromData(data, statisticType, field);
    } catch (error) {
      console.error('数据库统计查询失败:', error);
      const errorMessage = error instanceof Error ? error.message : i18n.t('renderers:statistic.unknown_error', 'Unknown error');
      return { result: 0, error: `${i18n.t('renderers:statistic.statistics_query_failed_short', 'Statistics query failed')}：${errorMessage}` };
    }
  };

  const fetchStatistics = useCallback(async (items: StatisticItemProps[]) => {
    if (items.length === 0) {
      return items;
    }

    const statisticItemsToProcess = items.filter(item => {
      if (!item.statisticType || item.statisticType === 'manual') {
        return false;
      }

      const datasourceConfig = getItemDataSourceConfig(item);
      return item.datasetId || datasourceConfig?.datasourceId;
    });

    if (statisticItemsToProcess.length === 0) {
      return items;
    }

    setIsLoading(true);

    try {

      const itemsUsingGlobalDataSource = items.filter(item => {
        if (!item.statisticType || item.statisticType === 'manual') return false;

        return !item.useCustomDataSource && globalDatabaseDataSourceConfig?.datasourceId;
      });

      let globalData: any[] | null = null;
      if (globalDatabaseDataSourceConfig?.datasourceId && itemsUsingGlobalDataSource.length > 0) {
        try {
          globalData = await getGlobalDataSourceData(globalDatabaseDataSourceConfig);
        } catch (error: any) {

          const isBusinessLogicError = error && 
            typeof error === 'object' && 
            'success' in error && 
            error.success === false &&
            error.code === 404;

          if (!isBusinessLogicError) {
            console.error('[StatisticGroup] 全局数据源查询失败:', error);
          }
          globalData = null;
        }
      }

      const updatedItems = await Promise.all(
        items.map(async (item) => {

          const replacedStatisticCondition = replaceParametersInCondition(item.statisticCondition);
          const replacedTrendCondition = item.trend?.trendCondition 
            ? replaceParametersInCondition(item.trend.trendCondition)
            : undefined;
          if (!item.statisticType || item.statisticType === 'manual') {
            return item;
          }

          const datasourceConfig = getItemDataSourceConfig(item);

          if (datasourceConfig?.datasourceId) {
            try {

              const canUseGlobalData = globalData !== null && 
                !item.useCustomDataSource && 
                datasourceConfig.datasourceId === globalDatabaseDataSourceConfig?.datasourceId;

              if (item.statisticType === 'column') {
                if (!item.statisticField) {
                  return {
                    ...item,
                    value: 0,
                    error: i18n.t('renderers:statistic.column_field_required', 'Column field is required')
                  };
                }

                if (canUseGlobalData) {
                  const filteredData = filterDataByCondition(globalData!, replacedStatisticCondition || '');
                  const nullValue = item.emptyDash ? '' : 0;
                  const value = filteredData.length > 0 ? (filteredData[0][item.statisticField] ?? nullValue) : nullValue;
                  // Query succeeded but returned 0 rows = legitimately empty data (e.g. no sales
                  // in the selected time window): display a neutral 0. Do NOT set error --
                  // "statistic failed" is reserved for real request/format errors (visible and
                  // debuggable, never misleading). emptyDash items show '—' instead.
                  return { ...item, value };
                }

                const columnValue = await queryDatabaseColumnValue(
                  datasourceConfig,
                  item.statisticField,
                  replacedStatisticCondition,
                  { nullAsEmpty: item.emptyDash }
                );

                return {
                  ...item,
                  value: columnValue.result,
                  error: columnValue.error
                };
              }

              if (item.statisticType === 'count' || item.statisticType === 'sum' || 
                  item.statisticType === 'avg' || item.statisticType === 'max' || item.statisticType === 'min') {

                if (canUseGlobalData) {
                  const statisticValue = calculateStatisticFromData(
                    globalData!,
                    item.statisticType,
                    item.statisticField,
                    replacedStatisticCondition
                  );

                  return {
                    ...item,
                    value: statisticValue.result,
                    precision: item.statisticType === 'count' ? 0 : item.precision,
                    error: statisticValue.error
                  };
                }

                const statisticValue = await queryDatabaseStatistics(
                  datasourceConfig,
                  item.statisticType,
                  item.statisticField,
                  replacedStatisticCondition
                );

                return {
                  ...item,
                  value: statisticValue.result,
                  precision: item.statisticType === 'count' ? 0 : item.precision,
                  error: statisticValue.error
                };
              }
            } catch (error) {
              console.error(`数据库数据源统计项 ${item.key} 查询失败:`, error);
              const errorMessage = error instanceof Error ? error.message : i18n.t('renderers:statistic.statistics_query_failed_short', 'Statistics query failed');
              return {
                ...item,
                value: 0,
                error: errorMessage
              };
            }
          }

          if (item.datasetId) {
            try {

              const statisticValue = await queryDatasetStatistics(
                item.datasetId,
                item.statisticType,
                item.statisticField,
                replacedStatisticCondition,
                replacedTrendCondition,
                item.trend?.suffix
              );

            let updatedTrend = item.trend;

            if (item.trend?.enabled && replacedTrendCondition && statisticValue.trendData) {
              try {

                const status = statisticValue.trendData.type === 'up' 
                  ? item.trend.upStyle || 'success'
                  : item.trend.downStyle || 'error';

                updatedTrend = {
                  ...item.trend,
                  value: statisticValue.trendData.value,
                  type: statisticValue.trendData.type,
                  status,

                  error: statisticValue.trendData.error
                };
              } catch (trendError) {
                console.error(`趋势统计项 ${item.key} 处理失败:`, trendError);

                updatedTrend = {
                  ...item.trend,
                  value: 0,
                  type: 'up',
                  status: 'error',
                  error: trendError instanceof Error ? trendError.message : i18n.t('renderers:statistic.trend_statistics_processing_failed', 'Trend statistics processing failed')
                };
              }
            }

            return {
              ...item,
              value: statisticValue.result,
              precision: item.statisticType === 'count' ? 0 : item.precision,
              trend: updatedTrend,

              error: statisticValue.error
            };
            } catch (error) {
              console.error(`数据集统计项 ${item.key} 查询失败:`, error);
              const errorMessage = error instanceof Error ? error.message : i18n.t('renderers:statistic.statistics_query_failed_short', 'Statistics query failed');
              return {
                ...item,
                value: 0,
                error: errorMessage
              };
            }
          }

          return item;
        })
      );

      return updatedItems;
    } catch (error) {
      console.error('批量统计查询失败:', error);
      return items;
    } finally {
      setIsLoading(false);
    }
  }, [getItemDataSourceConfig, globalDatabaseDataSourceConfig, replaceParametersInCondition, getGlobalDataSourceData]);

  fetchStatisticsRef.current = fetchStatistics;

  const chartRefreshTrigger = pageParams?.chartRefreshTrigger;
  useEffect(() => {
    if (!followPageRefresh || chartRefreshTrigger == null || !hasAutoRefreshableStats) {
      return;
    }
    refreshAllStatistics();
  }, [followPageRefresh, chartRefreshTrigger, hasAutoRefreshableStats, refreshAllStatistics]);

  useEffect(() => {

    if (hasDatabaseDataSource && finalItems === items) {

      setStatisticItems(prevItems => {

        const currentIsMockData = useMockData && mockData.length > 0 && 
          JSON.stringify(prevItems.map(item => item.key)) === JSON.stringify(mockData.map(item => item.key)) &&
          JSON.stringify(prevItems.map(item => item.value)) === JSON.stringify(mockData.map(item => item.value));

        if (currentIsMockData) {

          const hasStatisticItems = finalItems.some(item => {
            if (!item.statisticType || item.statisticType === 'manual') {
              return false;
            }
            const datasourceConfig = getItemDataSourceConfig(item);
            return item.datasetId || datasourceConfig?.datasourceId;
          });

          if (!hasStatisticItems) {
            return finalItems;
          }

        }

        return prevItems;
      });
    }
  }, [hasDatabaseDataSource, finalItems, items, useMockData, mockData, getItemDataSourceConfig]);

  useEffect(() => {

    // Include the current resolved values of bound parameters in the key so a parameter change
    // (e.g. detail-page FilterPanel dates) allows a refetch. Previously the key only covered the
    // items structure, so after the first load any parameter change was blocked by the
    // early-return and the KPIs never refreshed.
    const boundParamValues: Record<string, unknown> = {};
    const collectBound = (cfg?: { parameters?: Record<string, unknown> } | null) => {
      Object.entries(cfg?.parameters || {}).forEach(([k, v]) => {
        if (v && typeof v === 'object' && (v as { type?: string }).type === 'parameter') {
          const src = (v as { source?: string }).source;
          if (src) boundParamValues[k] = getCurrentParameter?.(src) ?? rawParams?.[src];
        }
      });
    };
    collectBound(globalDatabaseDataSourceConfig);
    finalItems.forEach(item => collectBound(getItemDataSourceConfig(item)));

    const initialItemsKey = JSON.stringify({
      items: finalItems.map(item => {
        const datasourceConfig = getItemDataSourceConfig(item);
        return {
          key: item.key,
          statisticType: item.statisticType,
          statisticField: item.statisticField,
          statisticCondition: item.statisticCondition,
          datasetId: item.datasetId,
          datasourceId: datasourceConfig?.datasourceId,
          useCustomDataSource: item.useCustomDataSource
        };
      }),
      globalDatasourceId: globalDatabaseDataSourceConfig?.datasourceId,
      parametersReady: parametersReady,
      boundParamValues
    });

    const isInitialItemsChanged = prevItemsRef.current !== initialItemsKey;

    const hasStatisticItems = finalItems.some(item => {
      if (!item.statisticType || item.statisticType === 'manual') {
        return false;
      }
      const datasourceConfig = getItemDataSourceConfig(item);
      return item.datasetId || datasourceConfig?.datasourceId;
    });

    const hasFetchWaitParams = fetchGateParams.all.length > 0;
    // strict (waitForValue:true): must have an actual value — readiness marks alone don't count
    // (FilterPanel marks its params ready before async-resolved values land → unfiltered query).
    const strictOk = hasResolvedDatasourceParameterValues(
      fetchGateParams.strict,
      getCurrentParameter,
      rawParams
    );
    const legacyOk =
      fetchGateParams.legacy.length === 0 ||
      parametersReady ||
      checkParametersReady(fetchGateParams.legacy) ||
      hasResolvedDatasourceParameterValues(fetchGateParams.legacy, getCurrentParameter, rawParams);
    const isReallyReady = !hasFetchWaitParams || (strictOk && legacyOk);
    const shouldWaitForParams = hasFetchWaitParams && !isReallyReady;

    if (!isInitialItemsChanged && prevItemsRef.current !== undefined && shouldWaitForParams) {

      setIsLoading(true);
      return;
    }

    if (!isInitialItemsChanged && prevItemsRef.current !== undefined && !shouldWaitForParams && hasCompletedInitialLoadRef.current) {
      return;
    }

    prevItemsRef.current = initialItemsKey;

    if (hasStatisticItems) {

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (shouldWaitForParams) {
        setIsLoading(true);
        return;
      }

      setIsLoading(true);
      timeoutRef.current = setTimeout(() => {
        hasCompletedInitialLoadRef.current = true;
        fetchStatistics(finalItems)
          .then(updatedItems => {
            setStatisticItems(updatedItems);
          })
          .catch(error => {
            console.error('统计查询失败:', error);
            setIsLoading(false);
          });
      }, 0);

    } else {

      setStatisticItems(finalItems);
      setIsLoading(false);
    }
  }, [finalItems, fetchStatistics, getItemDataSourceConfig, fetchGateParams, parametersReady, globalDatabaseDataSourceConfig?.datasourceId, hasDatabaseDataSource, useMockData, mockData, items, checkParametersReady, getCurrentParameter, rawParams]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getTrendColor = (status?: string) => {
    switch (status) {
      case 'success':
        return SEMANTIC_COLORS.text.success;
      case 'error':
        return SEMANTIC_COLORS.text.error;
      case 'warning':
        return SEMANTIC_COLORS.text.warning;
      default:
        return SEMANTIC_COLORS.text.info;
    }
  };

  const renderTrend = (trend?: StatisticItemProps['trend']) => {
    if (!trend || !trend.enabled) return null;

    if (trend.error) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`flex items-center gap-1 mt-2 text-sm ${SEMANTIC_COLORS.text.error}`}>
                {getIconComponent('alert-circle', 4)}
                <span>{i18n.t('renderers:statistic.trend_statistics_failed', 'Trend statistics failed')}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
                              <p className={SEMANTIC_COLORS.text.error}>{trend.error}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (trend.value === undefined) return null;

    const color = getTrendColor(trend.status);
    const trendIcon = trend.type === 'up' ? 'trending-up' : 'trending-down';

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-1 mt-2 transition-colors",
                color
              )}
              style={{ fontSize: Math.max(labelFontSizeResolved, 14) }}
            >
              {getIconComponent(trendIcon, 4)}
              <span>{trend.value}{trend.suffix}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{trend.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const formatValue = (item: StatisticItemProps) => {
    const { value, precision, prefix = '', suffix = '' } = item;

    // Missing value (emptyDash extraction yields '', and null/undefined would otherwise
    // stringify as "null"/"undefined"): render an em dash, no prefix/suffix.
    if (value == null || value === '') return '—';

    const numVal = typeof value === 'number' ? value : Number(value);
    if (item.format && Number.isFinite(numVal)) {
      if (item.format === 'currency-compact') return formatCompactCurrency(numVal, item.currency || 'CNY');
      if (item.format === 'compact-k') return formatCompactK(numVal);
      if (item.format === 'percent') return `${prefix}${numVal.toFixed(precision ?? 1)}%${suffix}`;
      if (item.format === 'number') return `${prefix}${numVal.toLocaleString()}${suffix}`;
    }

    if (typeof value === 'number') {
      const formattedValue = precision !== undefined
        ? value.toFixed(precision)
        : value.toLocaleString();
      return `${prefix}${formattedValue}${suffix}`;
    }

    return `${prefix}${value}${suffix}`;
  };

  
  const renderTrendValue = (item: StatisticItemProps) => {
    // YoY/MoM with a zero denominator arrives as SQL NULL → render '—'. The null check must run
    // before Number(): Number(null) is 0, which would mislead as +0.0%.
    if (item.value === null || item.value === undefined || item.value === '') {
      return <span className="text-muted-foreground">—</span>;
    }
    const v = Number(item.value);
    const up = Number.isFinite(v) ? v >= 0 : true;
    return (
      <span className={cn('inline-flex items-center gap-1', up ? SEMANTIC_COLORS.text.success : SEMANTIC_COLORS.text.error)}>
        {getIconComponent(up ? 'trending-up' : 'trending-down', 5)}
        {up ? '+' : ''}{Number.isFinite(v) ? v.toFixed(item.precision ?? 1) : '—'}%
      </span>
    );
  };

  const currentLoading = loading || isLoading;

  const refreshSingleItem = useCallback(async (itemKey: string) => {
    const item = statisticItems.find(i => i.key === itemKey);
    if (!item || !item.statisticType || item.statisticType === 'manual') {
      return;
    }

    const datasourceConfig = getItemDataSourceConfig(item);
    if (!item.datasetId && !datasourceConfig?.datasourceId) {
      return;
    }

    setRefreshingItems(prev => new Set(prev).add(itemKey));

    try {

      const replacedStatisticCondition = replaceParametersInCondition(item.statisticCondition);

      if (datasourceConfig?.datasourceId) {

        if (item.statisticType === 'column') {
          if (!item.statisticField) {
            setStatisticItems(prevItems => 
              prevItems.map(prevItem => 
                prevItem.key === itemKey 
                  ? { ...prevItem, value: 0, error: i18n.t('renderers:statistic.column_field_required', 'Column field is required') }
                  : prevItem
              )
            );
            return;
          }

          const columnValue = await queryDatabaseColumnValue(
            datasourceConfig,
            item.statisticField,
            replacedStatisticCondition
          );

          setStatisticItems(prevItems => 
            prevItems.map(prevItem => 
              prevItem.key === itemKey 
                ? {
                    ...prevItem,
                    value: columnValue.result,
                    error: columnValue.error
                  }
                : prevItem
            )
          );
          return;
        }

        if (item.statisticType === 'count' || item.statisticType === 'sum' || 
            item.statisticType === 'avg' || item.statisticType === 'max' || item.statisticType === 'min') {
          const statisticValue = await queryDatabaseStatistics(
            datasourceConfig,
            item.statisticType,
            item.statisticField,
            replacedStatisticCondition
          );

          setStatisticItems(prevItems => 
            prevItems.map(prevItem => 
              prevItem.key === itemKey 
                ? {
                    ...prevItem,
                    value: statisticValue.result,
                    precision: item.statisticType === 'count' ? 0 : item.precision,
                    error: statisticValue.error
                  }
                : prevItem
            )
          );
          return;
        }
      }

      if (item.datasetId) {
        const replacedTrendCondition = item.trend?.trendCondition 
          ? replaceParametersInCondition(item.trend.trendCondition)
          : undefined;

        const cacheKey = `${item.datasetId}-${item.statisticType}-${item.statisticField || ''}-${replacedStatisticCondition || ''}-${replacedTrendCondition || ''}-${item.trend?.suffix || ''}`;
        queryCache.delete(cacheKey);

        const statisticValue = await queryDatasetStatistics(
          item.datasetId,
          item.statisticType,
          item.statisticField,
          replacedStatisticCondition,
          replacedTrendCondition,
          item.trend?.suffix
        );

      let updatedTrend = item.trend;

      if (item.trend?.enabled && replacedTrendCondition && statisticValue.trendData) {
        try {

          const status = statisticValue.trendData.type === 'up' 
            ? item.trend.upStyle || 'success'
            : item.trend.downStyle || 'error';

          updatedTrend = {
            ...item.trend,
            value: statisticValue.trendData.value,
            type: statisticValue.trendData.type,
            status,
            error: statisticValue.trendData.error
          };
        } catch (trendError) {
          console.error(`趋势统计项 ${item.key} 处理失败:`, trendError);
          updatedTrend = {
            ...item.trend,
            value: 0,
            type: 'up',
            status: 'error',
            error: trendError instanceof Error ? trendError.message : i18n.t('statistic.trend_statistics_processing_failed', 'Trend statistics processing failed')
          };
        }
      }

      setStatisticItems(prevItems => 
        prevItems.map(prevItem => 
          prevItem.key === itemKey 
            ? {
                ...prevItem,
                value: statisticValue.result,
                precision: item.statisticType === 'count' ? 0 : item.precision,
                trend: updatedTrend,
                error: statisticValue.error
              }
            : prevItem
        )
      );
      return;
      }
    } catch (error) {
      console.error(`统计项 ${item.key} 刷新失败:`, error);
      const errorMessage = error instanceof Error ? error.message : i18n.t('renderers:statistic.statistics_refresh_failed', 'Statistics refresh failed');

      setStatisticItems(prevItems => 
        prevItems.map(prevItem => 
          prevItem.key === itemKey 
            ? { ...prevItem, error: errorMessage }
            : prevItem
        )
      );
    } finally {

      setRefreshingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  }, [statisticItems, getItemDataSourceConfig, replaceParametersInCondition]);

  const gapToCss = (value: number | string): string =>
    typeof value === 'number' ? `${value}px` : value;

  const hasExplicitGutter = (): boolean => {
    const g = grid?.gutter;
    if (g === undefined || g === null) return false;
    if (typeof g === 'string') return g.trim().length > 0;
    if (Array.isArray(g)) {
      const [h, v] = g;
      return h !== undefined && h !== null && String(h).trim() !== ''
        ? true
        : v !== undefined && v !== null && String(v).trim() !== '';
    }
    return true;
  };

  const getGridStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {
      display: 'grid',
    };

    // Narrow flow: configured column counts are desktop intent — the mobile
    // grid is always 2-up (class-driven below), never the inline template.
    if (grid?.cols && !isMobile) {
      style.gridTemplateColumns = `repeat(${grid.cols}, minmax(0, 1fr))`;
    }

    if (hasExplicitGutter()) {
      const gutter = grid!.gutter!;
      if (Array.isArray(gutter)) {
        const [horizontal, vertical] = gutter;
        style.columnGap = gapToCss(horizontal as number | string);
        style.rowGap = gapToCss((vertical ?? horizontal) as number | string);
      } else if (typeof gutter === 'string') {
        style.gap = gutter;
      } else {
        style.gap = gapToCss(gutter);
      }
    }

    return style;
  };

  const getItemPadding = () => {
    if (!itemStyle?.padding) {
      return undefined;
    }
    return itemStyle.padding;
  };

  const getItemHeight = (): React.CSSProperties | undefined => {
    if (!itemStyle?.height) {
      return undefined;
    }

    const height = itemStyle.height;
    if (typeof height === 'number') {
      // Narrow flow: fixed heights become minimums so wrapped values can grow the card.
      return isMobile ? { minHeight: `${height}px` } : { height: `${height}px` };
    }
    if (typeof height === 'string') {
      const h = height.trim();
      if (!h) return undefined;
      // Bare number (e.g. "235") → treat as px; keep explicit units / %, / calc() as-is.
      const resolved = /^\d+(\.\d+)?$/.test(h) ? `${h}px` : h;
      return isMobile ? { minHeight: resolved } : { height: resolved };
    }

    return undefined;
  };

  const gridStyle = getGridStyle();
  const defaultGridClasses = isMobile
    ? "grid-cols-2"
    : grid?.cols
      ? ""
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

  // Stretch only when the surrounding cell imposes a fill band (fillCell).
  // Do NOT key off page-fullscreen alone: Card/Container nest children under
  // Grid24FillCellProvider(false), and stretching into an indefinite h-full
  // parent flattens cards (clipped values, empty space above).
  const stretchToCell = fillCell && !isMobile;
  const fullscreenVisual = stretchToCell && isPageFullscreen;

  // Explicit row tracks (not only grid-auto-rows): a single auto row + h-full
  // cards leaves a transparent strip under the cards inside a taller cell.
  const stretchColCount = Math.max(1, grid?.cols || (isMobile ? 2 : 4));
  const stretchRowCount = Math.max(1, Math.ceil(statisticItems.length / stretchColCount));

  const mergedGridStyle: React.CSSProperties = {
    ...gridStyle,
    ...(stretchToCell
      ? {
          height: '100%',
          minHeight: '100%',
          alignContent: 'stretch',
          alignItems: 'stretch',
          gridAutoRows: 'minmax(0, 1fr)',
          gridTemplateRows: `repeat(${stretchRowCount}, minmax(0, 1fr))`,
        }
      : {}),
  };

  return (
    <div 
      className={cn(
        "statistic-group grid w-full min-h-0",
        stretchToCell && "h-full min-h-0 flex-1",
        (isMobile || !grid?.cols) && defaultGridClasses,
        !hasExplicitGutter() && !fullscreenVisual && "gap-4",
        fullscreenVisual && "statistic-group--fullscreen",
        className
      )}
      style={mergedGridStyle}
    >
      {statisticItems.map((item) => {
        const isItemRefreshing = refreshingItems.has(item.key);
        const datasourceConfig = getItemDataSourceConfig(item);
        const showRefreshButton = item.statisticType && item.statisticType !== 'manual' && (item.datasetId || datasourceConfig?.datasourceId);

        // Fill band: ignore fixed card height so cards grow with the cell.
        // Fixed itemStyle.height only applies in natural (non-stretch) layout.
        const cardHeightStyle = stretchToCell ? undefined : getItemHeight();

        const valueColorResolved = item.error
          ? { className: SEMANTIC_COLORS.text.error, style: undefined as React.CSSProperties | undefined }
          : resolveStatisticColor(item.valueColor, { mode: 'value' });
        const iconColorResolved = resolveStatisticColor(item.iconColor, {
          mode: 'icon',
          fallbackLegacy: item.color
        });
        const resolvedIconSize = resolveStatisticIconSize(item.iconSize, isMobile, fullscreenVisual);
        const warnActive = item.warnBelow != null && Number.isFinite(Number(item.value)) && Number(item.value) < item.warnBelow;

        return (
          <Card 
            key={item.key} 
            className={cn(
              "statistic-card group/statistic-item transition-all duration-300 hover:shadow-md relative flex min-w-0 flex-col overflow-hidden",
              (stretchToCell || !cardHeightStyle) && "h-full min-h-0 self-stretch",
              "dark:bg-card dark:border-border",
              item.accent && !item.error && "bg-indigo-50 border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900",
              item.error && "border-red-200 dark:border-red-800"
            )}
            style={cardHeightStyle}
          >
            {(currentLoading || isItemRefreshing) && (
              <div className={`loading-overlay absolute inset-0 flex flex-col justify-center gap-3 rounded-lg bg-card/90 p-4 backdrop-blur-sm ${Z_INDEX_CLASSES.STICKY_HEADER}`}>
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-24" />
                <Skeleton className="h-3 w-28" />
              </div>
            )}
            <CardContent 
              className={cn(
                // Reset CardContent's default `pt-0 sm:pb-6` so padding is even.
                "statistic-content relative flex min-w-0 flex-col p-0",
                stretchToCell && "h-full min-h-0"
              )}
              style={{
                padding: getItemPadding() || (fullscreenVisual ? undefined : '1rem'),
              }}
            >
              <div className={cn(
                "statistic-layout flex min-w-0 items-center gap-3",
                stretchToCell && "h-full min-h-0 flex-1"
              )}>
                <div className={cn(
                  "statistic-main flex min-w-0 flex-1 flex-col overflow-hidden",
                  stretchToCell && "h-full min-h-0"
                )}>
                  <div className={cn(
                    "flex min-w-0 flex-col justify-center",
                    stretchToCell && "min-h-0 flex-1"
                  )}>
                    <p
                      className={cn(
                        "statistic-title truncate text-muted-foreground",
                      )}
                      style={
                        !fullscreenVisual
                          ? { fontSize: titleFontSizeResolved, ...itemStyle?.titleStyle }
                          : itemStyle?.titleStyle
                      }
                    >
                      {item.title}
                    </p>
                    <div 
                      className="statistic-value-container flex min-w-0 items-center"
                      style={{
                        marginTop: (itemStyle?.valueStyle?.marginTop as string) || 
                                   (item.valueStyle?.marginTop as string) || 
                                   '0.25rem'
                      }}
                    >
                      <h3
                        className={cn(
                          "statistic-value min-w-0 font-bold",
                          isMobile ? "break-words" : "truncate",
                          item.error
                            ? SEMANTIC_COLORS.text.error
                            : (valueColorResolved.className ??
                                (!valueColorResolved.style ? 'text-foreground' : undefined)),

                          item.accent && !item.error && !warnActive && "text-indigo-700 dark:text-indigo-300",
                          warnActive && !item.error && SEMANTIC_COLORS.text.error
                        )}
                        style={{
                          ...(!fullscreenVisual ? { fontSize: valueFontSizeResolved } : {}),
                          ...(itemStyle?.valueStyle ? Object.fromEntries(
                            Object.entries(itemStyle.valueStyle).filter(([key]) => key !== 'marginTop')
                          ) : {}),
                          ...(item.valueStyle ? Object.fromEntries(
                            Object.entries(item.valueStyle).filter(([key]) => key !== 'marginTop')
                          ) : {}),
                          ...(item.error || item.accent || warnActive ? {} : valueColorResolved.style ?? {})
                        }}
                      >
                        {item.valueKind === 'trend' ? renderTrendValue(item) : (
                          <>{formatValue(item)}{warnActive && item.warnText ? <span className="ml-1 align-middle" style={{ fontSize: labelFontSizeResolved }}>{item.warnText}</span> : null}</>
                        )}
                      </h3>
                    </div>
                    {item.subText && (
                      <p className="statistic-subtext mt-0.5 truncate text-muted-foreground" style={{ fontSize: labelFontSizeResolved }}>{item.subText}</p>
                    )}

                  {item.error && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={`statistic-error flex items-center gap-1 mt-2 text-sm ${SEMANTIC_COLORS.text.error}`}>
                            {getIconComponent('alert-circle', 4)}
                            <span>{i18n.t('renderers:statistic.statistics_failed', 'Statistics failed')}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className={SEMANTIC_COLORS.text.error}>{item.error}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  </div>

                  <div className="statistic-trend mt-auto">
                    {renderTrend(item.trend)}
                  </div>
                </div>
                {item.icon && (
                  <div className={cn(
                    "statistic-icon ml-auto shrink-0 rounded-xl transition-colors",
                    !fullscreenVisual && (isMobile ? "p-2" : "p-3"),
                    "bg-muted hover:bg-muted/80"
                  )}>
                    {iconColorResolved.style ? (
                      <span
                        className="inline-flex"
                        style={iconColorResolved.style}
                      >
                        {getIconComponent(
                          item.icon,
                          resolvedIconSize,
                          cn(iconColorResolved.className, 'transition-colors')
                        )}
                      </span>
                    ) : (
                      getIconComponent(
                        item.icon,
                        resolvedIconSize,
                        cn(iconColorResolved.className, 'transition-colors')
                      )
                    )}
                  </div>
                )}
              </div>

              {showRefreshButton && (
                <div className="statistic-actions pointer-events-none absolute top-2 right-2 z-[1] opacity-0 transition-opacity duration-200 group-hover/statistic-item:pointer-events-auto group-hover/statistic-item:opacity-100 group-focus-within/statistic-item:pointer-events-auto group-focus-within/statistic-item:opacity-100">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "refresh-button h-7 w-7 p-0 rounded-md",
                            "text-muted-foreground/45 hover:text-muted-foreground/85",
                            "hover:bg-muted/50",
                            "transition-colors duration-200",
                            isItemRefreshing && "animate-spin"
                          )}
                          onClick={() => refreshSingleItem(item.key)}
                          disabled={isItemRefreshing || currentLoading}
                        >
                          {getIconComponent('refresh-cw', 4)}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{i18n.t('renderers:statistic.refresh_data', 'Refresh Data')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {statisticItems.length === 0 && (
        <div className="empty-state col-span-full flex items-center justify-center py-12 text-muted-foreground">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-sm">{i18n.t('renderers:statistic.no_statistic_items', 'No statistic items')}</p>
            <p className="text-xs mt-1">{i18n.t('renderers:statistic.add_statistic_items_hint', 'Please add statistic items in component configuration')}</p>
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {

  if (prevProps.items?.length !== nextProps.items?.length) {
    return false;
  }

  const itemsEqual = prevProps.items?.every((prevItem, index) => {
    const nextItem = nextProps.items?.[index];
    if (!nextItem) return false;

    return (
      prevItem.key === nextItem.key &&
      prevItem.title === nextItem.title &&
      prevItem.statisticType === nextItem.statisticType &&
      prevItem.statisticField === nextItem.statisticField &&
      prevItem.statisticCondition === nextItem.statisticCondition &&
      prevItem.datasetId === nextItem.datasetId &&
      prevItem.icon === nextItem.icon &&
      prevItem.prefix === nextItem.prefix &&
      prevItem.suffix === nextItem.suffix &&
      prevItem.color === nextItem.color &&
      prevItem.iconColor === nextItem.iconColor &&
      prevItem.valueColor === nextItem.valueColor
    );
  }) ?? true;

  const loadingEqual = prevProps.loading === nextProps.loading;
  const classNameEqual = prevProps.className === nextProps.className;
  const followRefreshEqual = prevProps.followPageRefresh === nextProps.followPageRefresh;
  const chartTriggerEqual =
    prevProps.pageParams?.chartRefreshTrigger === nextProps.pageParams?.chartRefreshTrigger;

  return itemsEqual && loadingEqual && classNameEqual && followRefreshEqual && chartTriggerEqual;
});

export default StatisticGroup;
