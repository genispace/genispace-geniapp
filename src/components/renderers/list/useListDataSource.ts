import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@genispace/shared-ui';
import { useDatabaseDataSource } from '@/hooks/useDatabaseDataSource';
import { useEnhancedDataSource } from '@/hooks/useEnhancedDataSource';
import { useComponentCommunication } from '@/hooks/useComponentCommunication';
import { useParameterHandler } from '@/hooks/useParameterHandler';
import { useWaitForParameters } from '@/hooks/useWaitForParameters';
import {
  extractParameterNamesFromDatasourceParameters,
  extractFetchGateParamsFromDatasourceParameters,
  hasResolvedDatasourceParameterValues,
  processDataSourceParametersForQuery,
} from '@/utils/databaseDatasourceParams';
import { resolveDatasourceVersion, useDatasourceVersions } from '@/utils/datasourceVersion';
import type { DatabaseDataSourceConfig } from '@/types/databaseDataSource';
import type { EnhancedDataSource } from '@/types/datasource';
import type { ComponentParameterConfig, ParameterRecord } from '@/types/parameters';
import type { ParameterConfig } from '@/types';
import { EMPTY_DEFAULT_SORT, sortStateToQuery } from './listConfig';

export interface UseListDataSourceOptions {
  id?: string;
  useMockData?: boolean;
  mockData?: Record<string, unknown>[];
  externalDataSource?: Record<string, unknown>[];
  externalLoading?: boolean;
  databaseDataSourceConfig?: DatabaseDataSourceConfig | null;
  enhancedDataSource?: EnhancedDataSource | null;
  parameterConfig?: ParameterConfig;
  componentParameterConfig?: ComponentParameterConfig;
  pageParams?: Record<string, unknown>;
  defaultSort?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  enableSort?: boolean;
  pageSize?: number;
  paginationEnabled?: boolean;
  /**
   * Extra flat query params merged into the datasource request (e.g. a quick-filter pill value).
   * Changing these re-queries the datasource (server-side filtering).
   */
  additionalParams?: Record<string, unknown>;
}

function stableConfigKey(config: DatabaseDataSourceConfig | null | undefined): string {
  if (!config?.datasourceId) return '';
  return JSON.stringify({
    datasourceId: config.datasourceId,
    sqlQuery: config.sqlQuery,
    enableSort: config.enableSort,
    parameters: config.parameters,
    defaultSort: config.defaultSort,
    outputFields: config.outputFields,
  });
}

export function useListDataSource(options: UseListDataSourceOptions) {
  const { t } = useTranslation('renderers');
  const {
    id = 'list',
    useMockData = false,
    mockData = [],
    externalDataSource = [],
    externalLoading = false,
    databaseDataSourceConfig,
    enhancedDataSource,
    parameterConfig,
    componentParameterConfig,
    pageParams,
    defaultSort: defaultSortProp,
    enableSort = false,
    pageSize: initialPageSize = 10,
    paginationEnabled = false,
    additionalParams,
  } = options;

  const defaultSort = defaultSortProp ?? EMPTY_DEFAULT_SORT;
  const defaultSortKey = useMemo(() => JSON.stringify(defaultSort), [defaultSort]);

  const configStableKey = useMemo(
    () => stableConfigKey(databaseDataSourceConfig),
    [databaseDataSourceConfig]
  );

  const resolvedDatabaseConfig = useMemo(() => {
    if (!databaseDataSourceConfig?.datasourceId) return null;
    return databaseDataSourceConfig;
  }, [configStableKey, databaseDataSourceConfig]);

  const effectiveEnableSort =
    enableSort || resolvedDatabaseConfig?.enableSort === true;

  const effectiveDefaultSort = useMemo(() => {
    const fromDb = resolvedDatabaseConfig?.defaultSort;
    if (Array.isArray(fromDb) && fromDb.length > 0) {
      return fromDb as Array<{ field: string; direction: 'asc' | 'desc' }>;
    }
    return JSON.parse(defaultSortKey) as Array<{ field: string; direction: 'asc' | 'desc' }>;
  }, [resolvedDatabaseConfig?.defaultSort, defaultSortKey]);

  const effectiveDefaultSortKey = useMemo(
    () => JSON.stringify(effectiveDefaultSort),
    [effectiveDefaultSort]
  );

  const [localData, setLocalData] = useState<Record<string, unknown>[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortState, setSortState] = useState(effectiveDefaultSort);
  const refreshDataRef = useRef<() => boolean>(() => false);
  const fetchDatabasePageRef = useRef<(pageOverride?: number) => boolean>(() => false);
  const skipParamCheckRef = useRef(false);
  const isRefetchingRef = useRef(false);
  const pendingRefreshRef = useRef(false);
  const lastDatabaseFetchKeyRef = useRef('');
  const prevEnhancedParamsKeyRef = useRef<string | null>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const TRIGGER_PARAMS = ['tableRefreshTrigger', 'chartRefreshTrigger', 'listRefreshTrigger'];

  const { rawParams } = useParameterHandler({
    parameterConfig,
    pageParams: pageParams as ParameterRecord,
    componentId: id,
    componentParameterConfig,
  });

  const listenParams = useMemo(() => {
    const explicit = componentParameterConfig?.listenToParameters;
    if (explicit?.length) return explicit;
    return extractParameterNamesFromDatasourceParameters(resolvedDatabaseConfig?.parameters);
  }, [componentParameterConfig?.listenToParameters, resolvedDatabaseConfig?.parameters]);

  const fetchWaitParams = useMemo(
    () => extractParameterNamesFromDatasourceParameters(resolvedDatabaseConfig?.parameters),
    [resolvedDatabaseConfig?.parameters]
  );

  // waitForValue contract (see extractFetchGateParamsFromDatasourceParameters): strict
  // (waitForValue:true) params gate on actual VALUES; legacy (no waitForValue, no default) keep
  // the readiness escapes; defaulted/opt-out params never gate. Mirrors useBoundRows.
  const fetchGateParams = useMemo(
    () => extractFetchGateParamsFromDatasourceParameters(resolvedDatabaseConfig?.parameters),
    [resolvedDatabaseConfig?.parameters]
  );

  const handleParameterChange = useCallback((key: string) => {
    if (TRIGGER_PARAMS.includes(key)) {
      skipParamCheckRef.current = true;
    }
    setTimeout(() => {
      refreshDataRef.current();
    }, 0);
  }, []);

  const { getCurrentParameter } = useComponentCommunication({
    componentId: id,
    listenParameters: listenParams,
    onParameterChange: (key) => handleParameterChange(key),
    autoCleanup: true,
  });

  const handleDataChange = useCallback((rows: Record<string, unknown>[]) => {
    setLocalData(Array.isArray(rows) ? rows : []);
  }, []);

  const handleError = useCallback(
    (error: string) => {
      toast({
        variant: 'destructive',
        title: t('list.data_load_failed', 'Data load failed'),
        description: error,
      });
    },
    [t]
  );

  const {
    data: enhancedRows,
    loading: enhancedLoading,
    refresh: refreshEnhanced,
  } = useEnhancedDataSource({
    dataSource: enhancedDataSource ?? null,
    onDataChange: handleDataChange,
    onError: handleError,
    componentId: id,
  });

  const extraParamsKey = useMemo(() => JSON.stringify(additionalParams ?? {}), [additionalParams]);
  const databaseAdditionalParams = useMemo(
    () => ({
      ...processDataSourceParametersForQuery(
        resolvedDatabaseConfig?.parameters,
        resolvedDatabaseConfig?.parameterTypes,
        getCurrentParameter,
        rawParams
      ),
      ...(additionalParams ?? {}),
    }),
    [
      resolvedDatabaseConfig?.parameters,
      resolvedDatabaseConfig?.parameterTypes,
      getCurrentParameter,
      rawParams,
      extraParamsKey,
    ]
  );

  const databaseAdditionalParamsKey = useMemo(
    () => JSON.stringify(databaseAdditionalParams),
    [databaseAdditionalParams]
  );

  const useServerPagination = Boolean(
    resolvedDatabaseConfig?.datasourceId && paginationEnabled
  );

  const sortStateKey = useMemo(() => JSON.stringify(sortState), [sortState]);

  const {
    data: databaseRows,
    loading: databaseLoading,
    refetch: refetchDatabase,
    pagination: dbPagination,
  } = useDatabaseDataSource(
    resolvedDatabaseConfig,
    'List',
    databaseAdditionalParams,
    { autoFetch: false }
  );

  const fetchDatabasePage = useCallback(
    (pageOverride?: number): boolean => {
      if (!resolvedDatabaseConfig?.datasourceId) return false;

      if (isRefetchingRef.current) {
        pendingRefreshRef.current = true;
        return true;
      }

      isRefetchingRef.current = true;

      const page = pageOverride ?? currentPage;
      const sortQuery =
        effectiveEnableSort && sortState.length > 0
          ? sortStateToQuery(sortState)
          : undefined;

      void refetchDatabase({
        page,
        limit: pageSize,
        offset: (page - 1) * pageSize,
        ...(sortQuery ? { sort: sortQuery } : {}),
      }).finally(() => {
        setTimeout(() => {
          isRefetchingRef.current = false;
          if (pendingRefreshRef.current) {
            pendingRefreshRef.current = false;
            setTimeout(() => {
              fetchDatabasePageRef.current();
            }, 0);
          }
        }, 100);
      });
      return true;
    },
    [
      resolvedDatabaseConfig?.datasourceId,
      refetchDatabase,
      currentPage,
      pageSize,
      effectiveEnableSort,
      sortStateKey,
    ]
  );

  fetchDatabasePageRef.current = fetchDatabasePage;

  const refresh = useCallback((): boolean => {
    if (resolvedDatabaseConfig?.datasourceId) {
      return fetchDatabasePage();
    }
    if (enhancedDataSource) {
      refreshEnhanced();
      return true;
    }
    return false;
  }, [resolvedDatabaseConfig?.datasourceId, fetchDatabasePage, enhancedDataSource, refreshEnhanced]);

  refreshDataRef.current = refresh;

  const { ready: parametersReady, isReady: checkParametersReady } = useWaitForParameters(
    fetchWaitParams.length > 0 ? fetchWaitParams : undefined
  );

  const parametersReadyForFetch = useMemo(() => {
    if (fetchGateParams.all.length === 0) return true;
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
    return strictOk && legacyOk;
  }, [
    fetchGateParams,
    parametersReady,
    checkParametersReady,
    getCurrentParameter,
    rawParams,
  ]);

  useLayoutEffect(() => {
    setSortState((prev) => {
      if (JSON.stringify(prev) === effectiveDefaultSortKey) return prev;
      return JSON.parse(effectiveDefaultSortKey) as typeof prev;
    });
  }, [effectiveDefaultSortKey]);

  // Subscribe to workbench pins and fold the resolved version into the load key:
  // when the registry sync lands after mount (or a pin changes), the key rotates
  // and the list refetches at the pinned version instead of sticking to the
  // default-version rows fetched on the first frame.
  const datasourceVersions = useDatasourceVersions();
  const resolvedVersion = resolveDatasourceVersion(
    { datasourceVersions },
    resolvedDatabaseConfig?.datasourceId,
    resolvedDatabaseConfig?.version
  );

  const databaseLoadConfigKey = useMemo(
    () =>
      resolvedDatabaseConfig?.datasourceId
        ? JSON.stringify({
            datasourceId: resolvedDatabaseConfig.datasourceId,
            version: resolvedVersion ?? null,
            parameters: resolvedDatabaseConfig.parameters ?? {},
            defaultSort: effectiveDefaultSort,
          })
        : '',
    [
      resolvedDatabaseConfig?.datasourceId,
      resolvedDatabaseConfig?.parameters,
      effectiveDefaultSortKey,
      resolvedVersion,
    ]
  );

  useEffect(() => {
    lastDatabaseFetchKeyRef.current = '';
  }, [databaseLoadConfigKey, databaseAdditionalParamsKey]);

  useEffect(() => {
    if (!resolvedDatabaseConfig?.datasourceId) return;
    if (!parametersReadyForFetch) return;

    const fetchKey = `${databaseLoadConfigKey}|${databaseAdditionalParamsKey}|${currentPage}|${pageSize}|${sortStateKey}`;
    if (lastDatabaseFetchKeyRef.current === fetchKey) return;

    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }

    loadTimeoutRef.current = setTimeout(() => {
      loadTimeoutRef.current = null;

      if (!resolvedDatabaseConfig?.datasourceId) return;
      if (!parametersReadyForFetch) return;

      const latestFetchKey = `${databaseLoadConfigKey}|${databaseAdditionalParamsKey}|${currentPage}|${pageSize}|${sortStateKey}`;
      if (lastDatabaseFetchKeyRef.current === latestFetchKey) return;

      lastDatabaseFetchKeyRef.current = latestFetchKey;
      fetchDatabasePageRef.current(currentPage);
    }, 50);

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, [
    databaseLoadConfigKey,
    databaseAdditionalParamsKey,
    parametersReadyForFetch,
    currentPage,
    pageSize,
    sortStateKey,
    resolvedDatabaseConfig?.datasourceId,
  ]);

  useEffect(() => {
    if (!enhancedDataSource || resolvedDatabaseConfig?.datasourceId) return;

    if (prevEnhancedParamsKeyRef.current === null) {
      prevEnhancedParamsKeyRef.current = databaseAdditionalParamsKey;
      return;
    }

    if (prevEnhancedParamsKeyRef.current === databaseAdditionalParamsKey) return;
    prevEnhancedParamsKeyRef.current = databaseAdditionalParamsKey;
    refreshEnhanced();
  }, [
    databaseAdditionalParamsKey,
    enhancedDataSource,
    resolvedDatabaseConfig?.datasourceId,
    refreshEnhanced,
  ]);

  useEffect(() => {
    setPageSize((prev) => (prev === initialPageSize ? prev : initialPageSize));
  }, [initialPageSize]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.componentId === id) {
        refresh();
      }
    };
    window.addEventListener('component-refresh', handler);
    return () => window.removeEventListener('component-refresh', handler);
  }, [id, refresh]);

  const resolvedRows = useMemo(() => {
    if (useMockData && mockData.length > 0) return mockData;
    if (resolvedDatabaseConfig?.datasourceId) {
      return (databaseRows as Record<string, unknown>[]) ?? [];
    }
    if (enhancedDataSource) {
      return (enhancedRows as Record<string, unknown>[]) ?? [];
    }
    if (localData.length > 0) return localData;
    return externalDataSource;
  }, [
    useMockData,
    mockData,
    resolvedDatabaseConfig?.datasourceId,
    databaseRows,
    enhancedDataSource,
    enhancedRows,
    localData,
    externalDataSource,
  ]);

  const sortedRows = useMemo(() => {
    if (useServerPagination) return resolvedRows;
    if (!effectiveEnableSort || sortState.length === 0) return resolvedRows;
    const rows = [...resolvedRows];
    rows.sort((a, b) => {
      for (const { field, direction } of sortState) {
        const av = a[field];
        const bv = b[field];
        if (av === bv) continue;
        const cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, {
          numeric: true,
        });
        return direction === 'desc' ? -cmp : cmp;
      }
      return 0;
    });
    return rows;
  }, [resolvedRows, effectiveEnableSort, sortState, useServerPagination]);

  const displayRows = useMemo(() => {
    if (useServerPagination) return sortedRows;
    if (!paginationEnabled) return sortedRows;
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize, paginationEnabled, useServerPagination]);

  const loading =
    externalLoading ||
    (Boolean(resolvedDatabaseConfig?.datasourceId) && databaseLoading) ||
    (Boolean(enhancedDataSource) && enhancedLoading);

  const total = useServerPagination
    ? (dbPagination?.total ?? sortedRows.length)
    : sortedRows.length;

  return {
    data: displayRows,
    allData: sortedRows,
    loading,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    total,
    sortState,
    setSortState,
    refresh,
    dbPagination,
    enableSort: effectiveEnableSort,
    useServerPagination,
  };
}
