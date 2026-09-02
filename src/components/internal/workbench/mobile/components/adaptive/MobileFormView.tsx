import React, { useEffect, useMemo, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FormRenderer from '@/components/renderers/FormRenderer';
import { useParameterHandler } from '@/hooks/useParameterHandler';
import { useComponentCommunication } from '@/hooks/useComponentCommunication';
import { useWaitForParameters } from '@/hooks/useWaitForParameters';
import { useDatabaseDataSource } from '@/hooks/useDatabaseDataSource';
import {
  extractParameterNamesFromDatasourceParameters,
  extractFetchGateParamsFromDatasourceParameters,
  hasResolvedDatasourceParameterValues,
  processDataSourceParametersForQuery,
} from '@/utils/databaseDatasourceParams';
import type { FormConfig, FormField } from '@/types';
import type { ParameterConfig } from '@/types';
import type { DatabaseDataSourceConfig } from '@/types/databaseDataSource';
import type { ParameterRecord } from '@/types/parameters';
import {
  formatMobileFormDisplayValue,
  getVisibleMobileFormFields,
} from '@/mobile/utils/mobileFormDisplayUtils';
import {
  resolveComponentMockRecord,
  resolveUseMockData,
} from '@/utils/resolveComponentMockFields';

type MobileFormViewProps = React.ComponentProps<typeof FormRenderer>;

interface MobileFormDisplayViewProps {
  config: FormConfig;
  id?: string;
  componentId?: string;
  parameterConfig?: ParameterConfig;
  pageParams?: ParameterRecord;
  databaseDataSourceConfig?: DatabaseDataSourceConfig;
  useMockData?: boolean;
  mockData?: Record<string, unknown> | Record<string, unknown>[];
}

function MobileFormDisplayView({
  config,
  id,
  componentId,
  parameterConfig,
  pageParams = {},
  databaseDataSourceConfig,
  useMockData = false,
  mockData,
}: MobileFormDisplayViewProps) {
  const { t } = useTranslation('renderers');
  const resolvedComponentId = componentId || id || 'mobile-form';
  const mockSource = { useMockData, mockData };
  const mockEnabled = resolveUseMockData(mockSource);
  const mockRecord = resolveComponentMockRecord(mockSource);

  const { rawParams } = useParameterHandler({
    parameterConfig,
    pageParams,
    componentId: resolvedComponentId,
  });

  const datasourceBoundParams = useMemo(
    () => extractParameterNamesFromDatasourceParameters(databaseDataSourceConfig?.parameters),
    [databaseDataSourceConfig?.parameters]
  );

  // waitForValue contract (see extractFetchGateParamsFromDatasourceParameters): strict
  // (waitForValue:true) params gate on actual VALUES; legacy (no waitForValue, no default) keep
  // the readiness escapes; defaulted/opt-out params never gate. Mirrors useBoundRows.
  const fetchGateParams = useMemo(
    () => extractFetchGateParamsFromDatasourceParameters(databaseDataSourceConfig?.parameters),
    [databaseDataSourceConfig?.parameters]
  );

  const listenParams = useMemo(() => {
    const explicit = parameterConfig?.listenToParameters ?? [];
    return Array.from(new Set([...explicit, ...datasourceBoundParams]));
  }, [parameterConfig?.listenToParameters, datasourceBoundParams]);

  const refetchRef = useRef<() => Promise<void>>(async () => {});

  const { getCurrentParameter } = useComponentCommunication({
    componentId: resolvedComponentId,
    listenParameters: listenParams,
    // No direct refetch here: the notify listener fires before the context re-render, so a
    // refetch now would send the previous render's params (missing the value that just changed).
    // The broadcast re-render recomputes `additionalParams` and the gate effect below fetches
    // with a coherent body.
    onParameterChange: () => {},
    autoCleanup: true,
  });

  const { ready: parametersReady, isReady: checkParametersReady } = useWaitForParameters(
    datasourceBoundParams.length > 0 ? datasourceBoundParams : undefined
  );

  const additionalParams = useMemo(
    () =>
      processDataSourceParametersForQuery(
        databaseDataSourceConfig?.parameters,
        databaseDataSourceConfig?.parameterTypes,
        getCurrentParameter,
        rawParams
      ),
    [
      databaseDataSourceConfig?.parameters,
      databaseDataSourceConfig?.parameterTypes,
      getCurrentParameter,
      rawParams,
    ]
  );

  const additionalParamsKey = useMemo(() => JSON.stringify(additionalParams), [additionalParams]);

  const {
    data: databaseRows,
    loading,
    refetch,
  } = useDatabaseDataSource(databaseDataSourceConfig ?? null, 'Form', additionalParams, {
    autoFetch: false,
  });

  refetchRef.current = refetch;

  const lastFetchKeyRef = useRef('');

  useEffect(() => {
    if (mockEnabled || !databaseDataSourceConfig?.datasourceId) return;

    if (fetchGateParams.all.length > 0) {
      // strict (waitForValue:true): must have an actual value — readiness marks alone don't
      // count (FilterPanel marks its params ready before async-resolved values land).
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
      if (!strictOk || !legacyOk) return;
    }

    // Coherence guard (mirrors HeroCardRenderer): the gate reads the bus LIVE while the request
    // body is the render-time `additionalParams`. If a gated value landed between render and this
    // effect, skip — the broadcast re-render re-runs us with a body that includes it.
    const liveParamsKey = JSON.stringify(
      processDataSourceParametersForQuery(
        databaseDataSourceConfig.parameters,
        databaseDataSourceConfig.parameterTypes,
        getCurrentParameter,
        rawParams
      )
    );
    if (liveParamsKey !== additionalParamsKey) return;

    const fetchKey = `${databaseDataSourceConfig.datasourceId}|${additionalParamsKey}`;
    if (lastFetchKeyRef.current === fetchKey) return;
    lastFetchKeyRef.current = fetchKey;

    void refetchRef.current();
  }, [
    mockEnabled,
    databaseDataSourceConfig?.datasourceId,
    fetchGateParams,
    parametersReady,
    checkParametersReady,
    additionalParamsKey,
    getCurrentParameter,
    rawParams,
  ]);

  const row = useMemo(() => {
    if (mockEnabled) {
      return Object.keys(mockRecord).length > 0 ? mockRecord : null;
    }
    return (databaseRows?.[0] as Record<string, unknown>) ?? null;
  }, [mockEnabled, mockRecord, databaseRows]);

  const visibleFields = getVisibleMobileFormFields(config.fields);
  const showTitle = config.displayConfig?.showTitle !== false && config.title;

  return (
    <div className="mobile-form-view w-full" data-testid="mobile-form-display">
      <div className="rounded-xl border border-neutral-200 bg-white px-4 py-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        {showTitle ? (
          <h3 className="mb-1 text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {config.title}
          </h3>
        ) : null}

        {loading && !mockEnabled ? (
          <div className="flex items-center justify-center py-8 text-neutral-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span className="text-sm">{t('loading.text', 'Loading...')}</span>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {visibleFields.map((field: FormField) => {
              const rawValue = row?.[field.name];
              const displayValue = formatMobileFormDisplayValue(field, rawValue);

              return (
                <div
                  key={field.name}
                  className="flex items-center justify-between gap-4 py-3"
                  data-testid={`mobile-form-row-${field.name}`}
                >
                  <span className="shrink-0 text-sm text-neutral-800 dark:text-neutral-100">
                    {field.label}
                  </span>
                  <span className="text-right text-sm font-medium text-neutral-800 dark:text-neutral-100">
                    {displayValue}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function MobileFormView(props: MobileFormViewProps) {
  if (props.config?.mode === 'display') {
    return (
      <MobileFormDisplayView
        config={props.config}
        id={props.id}
        componentId={props.componentId}
        parameterConfig={props.parameterConfig}
        pageParams={props.pageParams}
        databaseDataSourceConfig={props.databaseDataSourceConfig}
        useMockData={props.useMockData}
        mockData={props.mockData}
      />
    );
  }

  return (
    <div className="mobile-form-view w-full px-1">
      <FormRenderer {...props} />
    </div>
  );
}
