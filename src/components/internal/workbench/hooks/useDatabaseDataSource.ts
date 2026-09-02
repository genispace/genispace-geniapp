import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import apiClient from '@/lib/api/apiClient';
import { withDatasourceVersion } from '@/app/services/workbenchApi';
import {
  isDatasourceVersionNotFoundError,
  resolveDatasourceVersion,
  resolveRuntimeDatasourceVersion,
  useDatasourceVersions,
} from '@/utils/datasourceVersion';
import { toast } from '@genispace/shared-ui';
import i18n from '@/locales/i18n';
import {
  isWorkbenchSpaceSyncPending,
  subscribeWorkbenchSpaceSyncGate,
} from '@/mobile/utils/workbenchSpaceSyncGate';
import type {
  DatabaseDataSourceConfig,
  DatabaseDataSourceResponse,
  DatabaseDataSourceParams,
  UseDatabaseDataSourceReturn,
  SupportedComponentType,
  DataExtractionStrategy,
  ErrorHandlingConfig,
  PerformanceConfig
} from '../types/databaseDataSource';

const DEFAULT_ERROR_CONFIG: ErrorHandlingConfig = {
  showToast: true,
  retryAttempts: 3,
  retryDelay: 1000,
  fallbackData: []
};

const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  debounceTime: 300,
  throttleTime: 1000,
  batchSize: 100,
  lazyLoad: false
};

const DATA_EXTRACTION_STRATEGIES: Record<SupportedComponentType, DataExtractionStrategy> = {
  Table: {
    componentType: 'Table',
    dataPath: 'data.data',  
    transformFn: (data) => Array.isArray(data) ? data : []
  },
  Tree: {
    componentType: 'Tree',
    dataPath: 'data.data',  
    transformFn: (data) => Array.isArray(data) ? data : []
  },
  Form: {
    componentType: 'Form',
    dataPath: 'data.data',  
    transformFn: (data) => Array.isArray(data) ? data : []
  },
  Chart: {
    componentType: 'Chart',
    dataPath: 'data.data',  
    transformFn: (data) => Array.isArray(data) ? data : []
  },
  StatisticGroup: {
    componentType: 'StatisticGroup',
    dataPath: 'data.data',
    transformFn: (data) => Array.isArray(data) ? data : []
  },
  Typography: {
    componentType: 'Typography',
    dataPath: 'data.data',
    transformFn: (data) => Array.isArray(data) ? data : []
  },
  HeroCard: {
    componentType: 'HeroCard',
    dataPath: 'data.data',
    transformFn: (data) => Array.isArray(data) ? data : []
  },
  List: {
    componentType: 'List',
    dataPath: 'data.data',
    transformFn: (data) => Array.isArray(data) ? data : []
  },
  EditableTable: {
    componentType: 'EditableTable',
    dataPath: 'data.data',
    transformFn: (data) => Array.isArray(data) ? data : []
  },
  CollapsePanel: {
    componentType: 'CollapsePanel',
    dataPath: 'data.data',
    transformFn: (data) => Array.isArray(data) ? data : []
  },
  ProductReport: {
    componentType: 'ProductReport',
    dataPath: 'data.data',
    transformFn: (data) => Array.isArray(data) ? data : []
  },
  ProductDetail: {
    componentType: 'ProductDetail',
    dataPath: 'data.data',
    transformFn: (data) => Array.isArray(data) ? data : []
  },
  TileGrid: {
    componentType: 'TileGrid',
    dataPath: 'data.data',
    transformFn: (data) => Array.isArray(data) ? data : []
  },
  RingStat: {
    componentType: 'RingStat',
    dataPath: 'data.data',
    transformFn: (data) => Array.isArray(data) ? data : []
  },
  RadarChart: {
    componentType: 'RadarChart',
    dataPath: 'data.data',
    transformFn: (data) => Array.isArray(data) ? data : []
  }
};

function extractPaginationInfo(responseData: any, pageSize: number = 20): any {

  if (responseData.pagination) {
    const paginationData = responseData.pagination;

    return {
      total: paginationData.total,
      per_page: paginationData.limit,
      total_pages: paginationData.totalPages || paginationData.total_pages,
      current_page: paginationData.page || paginationData.current_page,
      limit: paginationData.limit,
      offset: paginationData.offset || ((paginationData.page || 1) - 1) * (paginationData.limit || 20),
      has_more: (paginationData.page || 1) < (paginationData.totalPages || paginationData.total_pages || 1)
    };
  }

  const actualDataArray = responseData.data?.data || (Array.isArray(responseData.data) ? responseData.data : []);
  const currentPageSize = Array.isArray(actualDataArray) ? actualDataArray.length : 0;

  const totalRows = responseData.data?.metadata?.rowCount || responseData.data?.totalRows || responseData.totalRows || responseData.rowCount || responseData.rows || currentPageSize;

  const totalPages = totalRows > 0 && pageSize > 0 ? Math.ceil(totalRows / pageSize) : 1;

  return {
    total: totalRows,
    per_page: pageSize, 

    total_pages: totalPages,
    current_page: 1, 

    from: currentPageSize > 0 ? 1 : 0,
    to: currentPageSize,
    has_more: totalRows > pageSize 
  };
}

function extractDataFromResponse(
  response: DatabaseDataSourceResponse,
  componentType: SupportedComponentType,
  pageSize: number = 20
): { data: any[], pagination?: any } {
  const strategy = DATA_EXTRACTION_STRATEGIES[componentType];

  if (!response.success || !response.data) {
    return { data: [] };
  }

  try {
    let data: any = response.data;

    if (strategy.dataPath) {
      const paths = strategy.dataPath.split('.');

      for (let i = 0; i < paths.length; i++) {
        const path = paths[i];

        if (Array.isArray(data)) {
          break;
        }

        if (data && typeof data === 'object' && path in data) {
          data = (data as any)[path];
        } else {
          return { data: [] };
        }
      }
    }

    if (data && typeof data === 'object' && !Array.isArray(data) && 'data' in data && Array.isArray(data.data)) {
      data = data.data;
    }

    if (strategy.transformFn) {
      const transformedData = strategy.transformFn(data as any[]);

      const pagination = extractPaginationInfo(response.data, pageSize);
      return { data: transformedData, pagination };
    }

    const finalData = Array.isArray(data) ? data : [];

    const pagination = extractPaginationInfo(response.data, pageSize);
    return { data: finalData, pagination };
  } catch (error) {
    console.error(`[useDatabaseDataSource] ${componentType} 数据提取失败:`, error);
    return { data: [] };
  }
}

function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout;
  let isExecuting = false;

  const debouncedFunc = (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(async () => {
      if (isExecuting) {
        return;
      }

      isExecuting = true;
      try {
        await func(...args);
      } catch (error) {
        console.error(`[debounce] API请求执行失败:`, error);
      } finally {
        isExecuting = false;
      }
    }, delay);
  };

  debouncedFunc.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };

  return debouncedFunc as ((...args: Parameters<T>) => void) & { cancel: () => void };
}

export const useDatabaseDataSource = (
  config: DatabaseDataSourceConfig | null,
  componentType: SupportedComponentType,
  additionalParams?: Record<string, any>,
  options?: {
    errorConfig?: Partial<ErrorHandlingConfig>;
    performanceConfig?: Partial<PerformanceConfig>;
    autoFetch?: boolean;
  }
): UseDatabaseDataSourceReturn => {

  const [data, setData] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [spaceSyncGateVersion, setSpaceSyncGateVersion] = useState(0);

  useEffect(() => subscribeWorkbenchSpaceSyncGate(() => {
    setSpaceSyncGateVersion((value) => value + 1);
  }), []);

  const retryCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchParamsRef = useRef<string>('');
  const isManualFetchingRef = useRef(false);  
  const lastRequestKeyRef = useRef<string>('');
  const lastDedupeRequestKeyRef = useRef<string>(''); 

  const errorConfig = { ...DEFAULT_ERROR_CONFIG, ...options?.errorConfig };
  const performanceConfig = { ...DEFAULT_PERFORMANCE_CONFIG, ...options?.performanceConfig };

  const clearCache = useCallback(() => {

  }, []);

  const fetchDataInternal = useCallback(async (
    params?: Record<string, any>
  ): Promise<void> => {

    if (!config?.datasourceId) {
      console.warn(`[useDatabaseDataSource] 数据源ID不存在，跳过请求`, { config });
      setData([]);
      setError(null);
      setPagination(null);
      setIsInitialized(true); 
      return;
    }

    if (isWorkbenchSpaceSyncPending()) {
      return;
    }

    const extractCoreParams = (p: Record<string, any>) => {
      if (!p) return {};

      const coreKeys = ['page', 'limit', 'offset', 'filter', 'sort', 'outputFields'];
      const coreParams: Record<string, any> = {};

      coreKeys.forEach(key => {
        if (p[key] !== undefined) {
          coreParams[key] = p[key];
        }
      });

      if (p.parameters && typeof p.parameters === 'object') {
        const configuredParameterKeys = Object.keys(config.parameters || {});
        const filteredParameters: Record<string, any> = {};

        configuredParameterKeys.forEach(key => {
          if (p.parameters[key] !== undefined) {
            filteredParameters[key] = p.parameters[key];
          }
        });

        if (Object.keys(filteredParameters).length > 0) {
          coreParams.parameters = filteredParameters;
        }
      }

      const paramSourceKeys = new Set([
        ...Object.keys(config.parameters || {}),
        ...Object.keys(config.parameterTypes || {}),
        ...(additionalParams ? Object.keys(additionalParams) : [])
      ]);
      paramSourceKeys.forEach(key => {
        if (!coreKeys.includes(key) && p[key] !== undefined) {
          coreParams[key] = p[key];
        }
      });

      return coreParams;
    };

    const coreParams = extractCoreParams(params);
    const coreAdditionalParams = extractCoreParams(additionalParams);

    const requestKey = JSON.stringify({
      datasourceId: config.datasourceId,
      params: coreParams,
      additionalParams: coreAdditionalParams
    });

    const dedupeRequestKey = JSON.stringify({
      datasourceId: config.datasourceId,
      params: { ...coreParams, outputFields: undefined },
      additionalParams: coreAdditionalParams,
    });

    if (abortControllerRef.current && lastRequestKeyRef.current === requestKey) {
      return;
    }

    if (
      abortControllerRef.current &&
      lastDedupeRequestKeyRef.current === dedupeRequestKey &&
      lastRequestKeyRef.current !== requestKey
    ) {
      return;
    }

    if (abortControllerRef.current && lastRequestKeyRef.current !== requestKey) {
      abortControllerRef.current.abort();
    }

    lastRequestKeyRef.current = requestKey;
    lastDedupeRequestKeyRef.current = dedupeRequestKey;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setLoading(true);
      setError(null);

      const pageValue = params?.page || additionalParams?.page || 1;
      const limitValue = params?.limit || additionalParams?.limit ||
        
        (componentType === 'Table' ? 20 : (componentType === 'Tree' ? 1000 : (componentType === 'List' ? 20 : (componentType === 'Chart' ? 2000 : 1))));

      const sqlQuery = config.sqlQuery || '';
      const hasLimitPlaceholder = /\{\{\s*limit\s*\}\}/i.test(sqlQuery);
      const hasOffsetPlaceholder = /\{\{\s*offset\s*\}\}/i.test(sqlQuery);
      const hasPaginationParams = hasLimitPlaceholder || hasOffsetPlaceholder;

      const needsLimitInParams = config.parameters && Object.prototype.hasOwnProperty.call(config.parameters, 'limit');
      const needsOffsetInParams = config.parameters && Object.prototype.hasOwnProperty.call(config.parameters, 'offset');

      const offsetValue = params?.offset ?? additionalParams?.offset ?? (pageValue - 1) * limitValue;
      const limitValueForParams = params?.limit ?? additionalParams?.limit ?? limitValue;

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
                return value.split(',').map(item => item.trim());
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

      const requestParams: DatabaseDataSourceParams = {

        page: pageValue,
        limit: limitValue
      };

      if (additionalParams?.parameters && Object.keys(additionalParams.parameters).length > 0) {

        Object.entries(additionalParams.parameters).forEach(([key, value]) => {
          requestParams[key] = value;
        });
      } else if (config.parameters && Object.keys(config.parameters).length > 0) {

        Object.entries(config.parameters).forEach(([key, value]) => {
          const paramType = config.parameterTypes?.[key] || 'string';
          requestParams[key] = convertParameterValue(value, paramType);
        });

        if (hasPaginationParams || needsLimitInParams) {
          requestParams.limit = convertParameterValue(limitValueForParams, config.parameterTypes?.limit || 'number');
        }
      }

      // `offset` is a transport-level pagination value, not only a SQL template
      // parameter. Preserve an explicitly supplied offset even when this source
      // does not declare it in `parameters`, otherwise offset-based pagination
      // silently repeats the first page.
      if (hasPaginationParams || needsOffsetInParams || params?.offset !== undefined || additionalParams?.offset !== undefined) {
        requestParams.offset = convertParameterValue(offsetValue, config.parameterTypes?.offset || 'number');
      }

      const filterValue = params?.filter || additionalParams?.filter;
      if (filterValue && typeof filterValue === 'string' && filterValue.trim()) {
        requestParams.filter = filterValue.trim();
      }

      const sortValue = params?.sort || additionalParams?.sort;
      if (sortValue && typeof sortValue === 'string' && sortValue.trim()) {
        requestParams.sort = sortValue.trim();
      }

      const EXCLUDED_PARAM_KEYS = [
        'page', 'limit', 'offset', 'filter', 'sort', 'outputFields',
        'formData', 'config', 'taskCall', 'lastFormResult', 'dataChangeNotification',
        'tableRefreshTrigger', 'number', 'id'
      ];

      const isExcludedParamKey = (key: string) =>
        EXCLUDED_PARAM_KEYS.includes(key) ||
        (key.startsWith('form_') && key.endsWith('_submitted'));

      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (!isExcludedParamKey(key)) {

            const isValidDataSourceParam = config.parameterTypes?.[key];
            const isConfigParam = config.parameters && Object.prototype.hasOwnProperty.call(config.parameters, key);
            const isFromAdditionalParams = additionalParams && Object.prototype.hasOwnProperty.call(additionalParams, key);
            const isCoreParam = ['parameters'].includes(key);

            if (isValidDataSourceParam || isConfigParam || isFromAdditionalParams || isCoreParam) {
              const paramType = config.parameterTypes?.[key] || 'string';
              requestParams[key] = paramType ? convertParameterValue(value, paramType) : value;
            } else {

              console.warn(`[useDatabaseDataSource] 拒绝业务参数: ${key}`, {
                value: typeof value === 'object' ? '[Object]' : value,
                componentType,
                datasourceId: config.datasourceId
              });
            }
          }
        });
      }

      if (config.outputFields && config.outputFields.length > 0) {
        requestParams.outputFields = config.outputFields;
      }

      const businessParamKeys = ['formData', 'config', 'taskCall', 'lastFormResult', 'dataChangeNotification', 'form_', 'submitted', 'tableRefreshTrigger'];
      const suspiciousParams = Object.keys(requestParams).filter(key => 
        businessParamKeys.some(businessKey => key.includes(businessKey))
      );

      if (suspiciousParams.length > 0) {
        console.error(`[useDatabaseDataSource]  检测到可能的业务参数被错误传递:`, suspiciousParams);

        suspiciousParams.forEach(key => {
          delete requestParams[key];
          console.warn(`[useDatabaseDataSource]  已移除业务参数: ${key}`);
        });
      }

      const resolvedVersion = resolveRuntimeDatasourceVersion(config.datasourceId, config.version);

      let response;
      try {
        response = await apiClient.post(
          withDatasourceVersion(`/datasources/${config.datasourceId}/data`, resolvedVersion),
          requestParams,
          {
            signal: abortController.signal,
            timeout: 30000 
          }
        );
      } catch (pinnedError) {
        // F6 fallback: the workbench-pinned version was deleted upstream — warn
        // and retry once against the default version instead of hard-failing.
        if (resolvedVersion != null && isDatasourceVersionNotFoundError(pinnedError)) {
          toast({
            variant: "destructive",
            title: i18n.t('common:errors.datasource_version_missing', 'Pinned datasource version unavailable'),
            description: i18n.t(
              'common:errors.datasource_version_missing_description',
              'Version v{{version}} no longer exists; fell back to the default version.',
              { version: resolvedVersion }
            ),
          });
          response = await apiClient.post(
            `/datasources/${config.datasourceId}/data`,
            requestParams,
            {
              signal: abortController.signal,
              timeout: 30000 
            }
          );
        } else {
          throw pinnedError;
        }
      }

      const responseData = response as DatabaseDataSourceResponse;

      if (responseData.success) {
        const extractResult = extractDataFromResponse(responseData, componentType, limitValue);
        const extractedData = extractResult.data;

        // Table keeps pagination in sync. Any explicit refetch() (e.g. page auto-refresh,
        // chartRefreshTrigger) must always apply the latest rows — the heuristic below only
        // compares first/last row and would skip updates when middle rows change or values
        // differ in ways not reflected there.
        const shouldForceUpdate =
          (componentType === 'Table' && extractResult.pagination) ||
          componentType === 'List' ||
          isManualFetchingRef.current;

        if (shouldForceUpdate) {

          setData(extractedData);
        } else {

          setData(prevData => {
            const hasLengthChange = prevData.length !== extractedData.length;
            // The previous first/last-row heuristic missed updates to rows in
            // the middle of a result set (notably chart series), leaving stale
            // data on screen. A response is already materialized here, so make
            // the equality check reflect the complete result.
            const hasContentChange = JSON.stringify(prevData) !== JSON.stringify(extractedData);

            if (hasLengthChange || hasContentChange) {
              return extractedData;
            } else {
              return prevData;
            }
          });
        }

        if (componentType === 'Table' && extractResult.pagination) {

          const rawPagination = extractResult.pagination as any;

          const totalRecords = rawPagination.total || 0;

          const standardizedPagination = {
            total: totalRecords,
            current_page: rawPagination.page || rawPagination.current_page || 1,
            total_pages: rawPagination.pages || rawPagination.total_pages ||
                        (totalRecords > 0 ? Math.ceil(totalRecords / (rawPagination.limit || 20)) : 1),
            limit: rawPagination.limit || rawPagination.pageSize || 20,
            offset: ((rawPagination.page || rawPagination.current_page || 1) - 1) * (rawPagination.limit || 20),
            has_more: rawPagination.has_more || ((rawPagination.page || rawPagination.current_page || 1) <
                     (rawPagination.pages || rawPagination.total_pages || Math.ceil(totalRecords / (rawPagination.limit || 20))))
          };

          setPagination(standardizedPagination);
        } else {
          setPagination(null);
        }

        retryCountRef.current = 0;
        setIsInitialized(true);

      } else {
        console.error(`[useDatabaseDataSource] ${componentType} API返回失败:`, {
          success: responseData.success,
          message: responseData.message,
          error: responseData.error,
          responseData: responseData
        });
        throw new Error(responseData.message || responseData.error || i18n.t('common:errors.data_fetch_failed', 'Data fetch failed'));
      }

    } catch (err: any) {

      const msg = (err?.response?.data?.message ?? err?.message ?? '').toString().toLowerCase();
      if (
        err?.name === 'AbortError' ||
        err?.code === 'ERR_CANCELED' ||
        msg.includes('canceled') ||
        msg.includes('cancelled')
      ) {
        return;
      }

      const errorMessage = err.response?.data?.message || err.message || i18n.t('common:errors.data_fetch_failed', 'Data fetch failed');
      setError(errorMessage);

      if (errorConfig.showToast) {
        toast({
          variant: "destructive",
          title: i18n.t('common:errors.component_data_fetch_failed', '{{componentType}} component data fetch failed', { componentType }),
          description: errorMessage,
        });
      }

      if (retryCountRef.current < (errorConfig.retryAttempts || 0)) {
        retryCountRef.current++;
        setTimeout(() => {
          fetchDataInternal(params);
        }, errorConfig.retryDelay || 1000);
      } else {

        if (errorConfig.fallbackData) {
          setData(errorConfig.fallbackData);
        }
        setIsInitialized(true);
      }

    } finally {
      setLoading(false);
      // A cancelled earlier request can finish after a newer one has installed
      // its controller. Only clear the controller that belongs to this request;
      // clearing the newer controller breaks cancellation and request de-duping.
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [
    config,
    componentType,
    additionalParams,
    errorConfig.showToast,
    errorConfig.retryAttempts,
    errorConfig.retryDelay,
    errorConfig.fallbackData
  ]);

  const fetchDataRef = useRef<any>(null);
  const autoFetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchDataInternalRef = useRef(fetchDataInternal);
  fetchDataInternalRef.current = fetchDataInternal;

  const stableDatasourceId = config?.datasourceId;
  // Reactive workbench-level pin: changing config.datasourceVersions re-signs
  // the auto-fetch signature below, so components refetch on the new version.
  const datasourceVersions = useDatasourceVersions();
  const stableDatasourceVersion = resolveDatasourceVersion(
    { datasourceVersions },
    stableDatasourceId,
    config?.version
  );

  const configParametersKey = JSON.stringify(config?.parameters ?? {});
  const configOutputFieldsKey = JSON.stringify(config?.outputFields ?? []);
  const additionalParamsKey = JSON.stringify(additionalParams ?? {});

  const autoFetchSignature = useMemo(() => {
    if (!stableDatasourceId) return '';

    const limitValue =
      additionalParams?.limit ||
      (componentType === 'Table'
        ? 20
        : componentType === 'Tree'
          ? 1000
          : componentType === 'List'
            ? 20
            : 1);

    return JSON.stringify({
      datasourceId: stableDatasourceId,
      version: stableDatasourceVersion ?? null,
      parameters: JSON.parse(configParametersKey) as Record<string, unknown>,
      outputFields: JSON.parse(configOutputFieldsKey) as string[],
      additionalParams: JSON.parse(additionalParamsKey) as Record<string, unknown>,
      page: additionalParams?.page || 1,
      limit: limitValue,
      offset: additionalParams?.offset,
    });
  }, [
    stableDatasourceId,
    stableDatasourceVersion,
    configParametersKey,
    configOutputFieldsKey,
    additionalParamsKey,
    componentType,
    additionalParams?.page,
    additionalParams?.limit,
    additionalParams?.offset,
  ]);

  const refetch = useCallback(async (params?: Record<string, any>) => {

    isManualFetchingRef.current = true;

    const mergedParams = {
      ...additionalParams,
      ...params
    };

    try {
      await fetchDataInternal(mergedParams);
    } catch (error) {
      console.error(`[useDatabaseDataSource] fetchDataInternal 执行失败:`, error);
      throw error;
    } finally {

      setTimeout(() => {
        isManualFetchingRef.current = false;
      }, 200);
    }
  }, [componentType, config, additionalParams, fetchDataInternal]);

  useEffect(() => {
    if (options?.autoFetch === false || !autoFetchSignature) {
      if (options?.autoFetch === false || !stableDatasourceId) {
        lastFetchParamsRef.current = '';
      }
      return;
    }

    if (isWorkbenchSpaceSyncPending()) {
      return;
    }

    if (isManualFetchingRef.current) {
      return;
    }

    if (autoFetchTimerRef.current) {
      clearTimeout(autoFetchTimerRef.current);
    }

    autoFetchTimerRef.current = setTimeout(() => {
      autoFetchTimerRef.current = null;

      if (lastFetchParamsRef.current === autoFetchSignature) {
        return;
      }

      lastFetchParamsRef.current = autoFetchSignature;

      const limitValue =
        additionalParams?.limit ||
        (componentType === 'Table'
          ? 20
          : componentType === 'Tree'
            ? 1000
            : componentType === 'List'
              ? 20
              : 1);

      const currentRequestParams = {
        ...(additionalParams ?? {}),
        page: additionalParams?.page || 1,
        limit: limitValue,
        ...(additionalParams?.offset !== undefined ? { offset: additionalParams.offset } : {}),
      };

      void fetchDataInternalRef.current(currentRequestParams);
    }, 50);

    return () => {
      if (autoFetchTimerRef.current) {
        clearTimeout(autoFetchTimerRef.current);
        autoFetchTimerRef.current = null;
      }
    };
  }, [
    autoFetchSignature,
    options?.autoFetch,
    stableDatasourceId,
    componentType,
    spaceSyncGateVersion,
  ]);

  useEffect(() => {
    return () => {

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      if (fetchDataRef.current) {
        fetchDataRef.current.cancel();
      }
    };
  }, [componentType]);

  const exportAllData = useCallback(async (
    onProgress: (current: number, total: number) => void
  ): Promise<Record<string, any>[]> => {
    if (!config?.datasourceId) {
      onProgress(0, 0);
      return [];
    }

    try {
      const exportPageSize = 1000; 
      let allData: Record<string, any>[] = [];
      let totalCount = 0;

      await refetch({
        page: 1,
        limit: 1,
        offset: 0
      });

      if (pagination?.total) {
        totalCount = pagination.total;
      } else {
        totalCount = 0; 
      }

      if (totalCount > 0 || pagination?.has_more !== false) {
        let currentExportPage = 1;
        let hasMore = true;

        while (hasMore) {
          const offset = (currentExportPage - 1) * exportPageSize;

          await refetch({
            page: currentExportPage,
            limit: exportPageSize,
            offset: offset
          });

          const pageData = Array.isArray(data) ? data : [];
          allData = [...allData, ...pageData];

          if (totalCount === 0 && currentExportPage === 1) {
            if (pagination?.total) {
              totalCount = pagination.total;
            } else {

              totalCount = pageData.length < exportPageSize ? allData.length : allData.length * 2;
            }
          }

          if (pageData.length < exportPageSize && totalCount < allData.length) {
            totalCount = allData.length;
          }

          onProgress(allData.length, totalCount || allData.length);

          hasMore = pageData.length === exportPageSize && (
            pagination?.has_more !== false || 
            allData.length < totalCount
          );

          currentExportPage++;

          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return allData;
    } catch (error) {
      console.error('[DatabaseDataSource Export] 导出失败:', error);
      throw error;
    }
  }, [config?.datasourceId, refetch, data, pagination, additionalParams]);

  return {
    data,
    loading,
    error,
    pagination,
    isInitialized,
    refetch,
    clearCache,
    exportAllData
  };
};

export default useDatabaseDataSource;
