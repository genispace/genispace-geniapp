import { useEffect, useMemo, useReducer, useRef } from 'react';
import type { DatabaseDataSourceConfig } from '@/types/databaseDataSource';
import type { ComponentParameterConfig } from '@/types/parameters';
import { useDatabaseDataSource } from '@/hooks/useDatabaseDataSource';
import { useParameterHandler } from '@/hooks/useParameterHandler';
import { useComponentCommunication } from '@/hooks/useComponentCommunication';
import { useWaitForParameters } from '@/hooks/useWaitForParameters';
import { resolveDatasourceVersion, useDatasourceVersions } from '@/utils/datasourceVersion';
import {
  extractFetchGateParamsFromDatasourceParameters,
  extractParameterNamesFromDatasourceParameters,
  hasResolvedDatasourceParameterValues,
  processDataSourceParametersForQuery,
} from '@/utils/databaseDatasourceParams';




export function useBoundRows(
  config: DatabaseDataSourceConfig | null | undefined,
  cpc: ComponentParameterConfig | undefined,
  pageParams: Record<string, unknown>,
  id: string,
  label: string,

  extraParams?: Record<string, unknown>
): { rows: Record<string, unknown>[]; loading: boolean; total: number; totalPages: number } {
  const { rawParams } = useParameterHandler({ componentParameterConfig: cpc, pageParams, componentId: id });
  const bound = useMemo(() => extractParameterNamesFromDatasourceParameters(config?.parameters), [config?.parameters]);
  // waitForValue contract (see extractFetchGateParamsFromDatasourceParameters):
  // strict (waitForValue:true) params gate on actual VALUES; legacy (no waitForValue, no default)
  // keep the readiness escapes; defaulted/opt-out params never gate.
  const gate = useMemo(() => extractFetchGateParamsFromDatasourceParameters(config?.parameters), [config?.parameters]);
  const boundSet = useMemo(() => new Set(bound), [bound]);
  const listen = useMemo(
    () => Array.from(new Set([...(cpc?.listenToParameters ?? []), ...bound])),
    [cpc?.listenToParameters, bound]
  );
  const refetchRef = useRef<() => Promise<void>>(async () => {});
  const [paramTick, bumpParamTick] = useReducer((x: number) => x + 1, 0);
  const { getCurrentParameter } = useComponentCommunication({
    componentId: id || label,
    listenParameters: listen,
    onParameterChange: (changedKey: string) => {
      // Body-bound param changed: recompute + let the gate effect fetch with a COHERENT body.
      // A direct refetch here would send the hook's previous-render params (the notify listener
      // fires before the context re-render), i.e. a query missing the value that just changed.
      bumpParamTick();
      // Non-body listen params (explicit triggers like tableRefreshTrigger) don't change the
      // fetch key, so the effect would dedupe them — keep the direct refetch for those.
      if (!boundSet.has(changedKey) && config?.datasourceId) void refetchRef.current();
    },
    autoCleanup: true,
  });
  const { ready, isReady } = useWaitForParameters(bound.length ? bound : undefined);
  const extraKey = JSON.stringify(extraParams ?? {});
  const additionalParams = useMemo(
    () => ({
      ...processDataSourceParametersForQuery(config?.parameters, config?.parameterTypes, getCurrentParameter, rawParams),
      ...(extraParams ?? {}),
    }),
    [config?.parameters, config?.parameterTypes, getCurrentParameter, rawParams, extraKey, paramTick]
  );
  const key = useMemo(() => JSON.stringify(additionalParams), [additionalParams]);
  const { data, loading, refetch, pagination } = useDatabaseDataSource(config ?? null, 'Table', additionalParams, { autoFetch: false });
  refetchRef.current = refetch;
  // Subscribe to workbench pins and fold the resolved version into the fetch
  // key: when the registry sync lands after mount (or a pin changes), the key
  // rotates and we refetch at the pinned version instead of sticking to the
  // default-version rows fetched on the first frame.
  const datasourceVersions = useDatasourceVersions();
  const resolvedVersion = resolveDatasourceVersion({ datasourceVersions }, config?.datasourceId, config?.version);
  const lastKey = useRef('');
  useEffect(() => {
    if (!config?.datasourceId) return;
    if (gate.all.length > 0) {
      // strict: must have a real value on the bus (no readiness bypass — FilterPanel marks its
      // params ready before async-resolved values land; fetching then means an unfiltered query).
      const strictOk = hasResolvedDatasourceParameterValues(gate.strict, getCurrentParameter, rawParams);
      const legacyOk =
        gate.legacy.length === 0 ||
        ready ||
        isReady(gate.legacy) ||
        hasResolvedDatasourceParameterValues(gate.legacy, getCurrentParameter, rawParams);
      if (!strictOk || !legacyOk) return;
    }
    // Coherence guard (mirrors HeroCardRenderer): the gate reads the bus LIVE while the request
    // body is the render-time `additionalParams`. If a gated value landed between render and this
    // effect, skip — the broadcast re-render re-runs us with a body that includes it.
    const liveKey = JSON.stringify({
      ...processDataSourceParametersForQuery(config?.parameters, config?.parameterTypes, getCurrentParameter, rawParams),
      ...(extraParams ?? {}),
    });
    if (liveKey !== key) return;
    const fk = `${config.datasourceId}|${resolvedVersion ?? ''}|${key}`;
    if (lastKey.current === fk) return;
    lastKey.current = fk;
    void refetchRef.current();
  }, [config?.datasourceId, gate, ready, isReady, key, getCurrentParameter, rawParams, extraKey, paramTick, resolvedVersion]);
  // pagination.total = true COUNT(*) from the /data endpoint (enablePagination datasources); total_pages
  // is derived server-side. Both are 0/absent for non-paginated sources — callers treat that as "no paging".
  const total = Number((pagination as { total?: number } | null)?.total ?? 0);
  const totalPages = Number((pagination as { total_pages?: number } | null)?.total_pages ?? 0);
  return { rows: (data as Record<string, unknown>[]) ?? [], loading, total, totalPages };
}
