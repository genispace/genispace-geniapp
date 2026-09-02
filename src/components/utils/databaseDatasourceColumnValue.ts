import apiClient from '@/lib/api/apiClient';
import { withDatasourceVersion } from '@/app/services/workbenchApi';
import { resolveRuntimeDatasourceVersion } from '@/utils/datasourceVersion';
import i18n from '@/locales/i18n';
import type { DatabaseDataSourceConfig } from '@/types/databaseDataSource';

// In-flight dedup: concurrent identical column queries share one HTTP request.
// Initial page mount fires many effect rounds with identical params in the same tick;
// without dedup each round issues its own POST (observed: 27 requests for 2 distinct
// param sets on the product-detail page). No TTL caching -- once the request settles
// the entry is dropped, so refresh semantics are unchanged.
const inflightQueries = new Map<string, Promise<{ result: number | string; error?: string }>>();

export function queryDatabaseColumnValue(
  datasourceConfig: DatabaseDataSourceConfig,
  field: string,
  processedParams: Record<string, unknown>,
  condition?: string,
  // nullAsEmpty: return '' instead of a fake 0 when the value is missing (NULL field / zero rows),
  // so opted-in consumers (StatisticGroup emptyDash) can render an em dash.
  opts?: { nullAsEmpty?: boolean }
): Promise<{ result: number | string; error?: string }> {
  const requestParams: Record<string, unknown> = {
    page: 1,
    limit: 1,
    ...processedParams,
    ...(condition ? { filter: condition } : {}),
  };

  if (datasourceConfig.outputFields && datasourceConfig.outputFields.length > 0) {
    requestParams.outputFields = datasourceConfig.outputFields;
  }

  const version = resolveRuntimeDatasourceVersion(datasourceConfig.datasourceId, datasourceConfig.version);
  const dedupKey = JSON.stringify([
    datasourceConfig.datasourceId,
    version,
    field,
    requestParams,
    opts?.nullAsEmpty === true,
  ]);

  const inflight = inflightQueries.get(dedupKey);
  if (inflight) {
    return inflight;
  }

  const promise = doQueryDatabaseColumnValue(datasourceConfig, field, requestParams, version, opts)
    .finally(() => {
      inflightQueries.delete(dedupKey);
    });
  inflightQueries.set(dedupKey, promise);
  return promise;
}

async function doQueryDatabaseColumnValue(
  datasourceConfig: DatabaseDataSourceConfig,
  field: string,
  requestParams: Record<string, unknown>,
  version: ReturnType<typeof resolveRuntimeDatasourceVersion>,
  opts?: { nullAsEmpty?: boolean }
): Promise<{ result: number | string; error?: string }> {
  try {
    const response = await apiClient.post(
      withDatasourceVersion(
        `/datasources/${datasourceConfig.datasourceId}/data`,
        version
      ),
      requestParams
    );

    const responseData = response.data as {
      data?: unknown[];
    };
    if (response.success && responseData?.data && Array.isArray(responseData.data)) {
      const data = responseData.data;
      if (data.length > 0) {
        const row = data[0] as Record<string, unknown>;
        const value = row[field];
        return { result: value !== undefined && value !== null ? (value as number | string) : (opts?.nullAsEmpty ? '' : 0) };
      }
      // Query succeeded but returned 0 rows = legitimately empty data (e.g. no sales in the
      // selected time window): display a neutral 0. Do NOT set error -- "statistic failed" is
      // reserved for real request failures (so an empty window is never misreported as an outage).
      return { result: opts?.nullAsEmpty ? '' : 0 };
    }

    return {
      result: 0,
      error: i18n.t('renderers:statistic.no_data_found', 'No data found'),
    };
  } catch (error) {
    console.error('[queryDatabaseColumnValue]', error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : i18n.t('renderers:statistic.unknown_error', 'Unknown error');
    return {
      result: 0,
      error: `${i18n.t('renderers:statistic.column_query_failed', 'Column query failed')}：${errorMessage}`,
    };
  }
}
