import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import apiClient from '@/lib/api/apiClient';
import { withDatasourceVersion } from '@/app/services/workbenchApi';
import { resolveRuntimeDatasourceVersion } from '@/utils/datasourceVersion';

export interface DataSourceConfig {
  datasourceId: string;
  version?: number;
  valueField: string;
  labelField: string;
}

export interface DataSourceOption {
  value: string;
  label: string;
}

export function parseDataSourceConfigFromMapping(
  mapping: { source?: string; value?: string } | undefined
): DataSourceConfig | null {
  if (mapping?.source !== 'database' || !mapping?.value) return null;
  try {
    const parsed = JSON.parse(mapping.value);
    if (parsed.datasourceId) {
      return {
        datasourceId: parsed.datasourceId,
        version: typeof parsed.version === 'number' ? parsed.version : undefined,
        valueField: parsed.valueField || 'value',
        labelField: parsed.labelField || 'label'
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function extractDataArray(response: unknown): Record<string, unknown>[] {
  if (!response || typeof response !== 'object') return [];
  const r = response as Record<string, unknown>;
  if (!r.success || !r.data) return [];
  try {
    const payload = r.data as Record<string, unknown>;

    const data = payload?.data;
    if (Array.isArray(data)) return data as Record<string, unknown>[];

    if (Array.isArray(payload)) return payload as Record<string, unknown>[];
    const rows = payload?.rows;
    if (Array.isArray(rows)) return rows as Record<string, unknown>[];
    return [];
  } catch {
    return [];
  }
}

function collectUniqueDataSourceConfigs(
  parameterMapping: Record<string, { source?: string; value?: string }> | undefined | null
): Map<string, DataSourceConfig> {
  const configMap = new Map<string, DataSourceConfig>();
  if (!parameterMapping || typeof parameterMapping !== 'object') return configMap;
  Object.values(parameterMapping).forEach((mapping) => {
    const config = parseDataSourceConfigFromMapping(mapping);
    if (config) {
      const resolvedVersion = resolveRuntimeDatasourceVersion(config.datasourceId, config.version);
      const versionKey = resolvedVersion ?? 'default';
      const key = `${config.datasourceId}:${versionKey}:${config.valueField}:${config.labelField}`;
      if (!configMap.has(key)) {
        configMap.set(key, config);
      }
    }
  });
  return configMap;
}

async function fetchDataSourceOptions(config: DataSourceConfig): Promise<DataSourceOption[]> {
  const response = await apiClient.post(
    withDatasourceVersion(
      `/datasources/${config.datasourceId}/data`,
      resolveRuntimeDatasourceVersion(config.datasourceId, config.version)
    ),
    {
      page: 1,
      limit: 1000,
      outputFields: [config.valueField, config.labelField]
    },
    { timeout: 30000 }
  );
  const dataArray = extractDataArray(response);
  const valueField = config.valueField || 'value';
  const labelField = config.labelField || 'label';
  return dataArray
    .map((item) => ({
      value: String(item[valueField] ?? ''),
      label: String(item[labelField] ?? item[valueField] ?? '')
    }))
    .filter((opt) => opt.value !== '');
}

export function useTaskInputDataSourceCache(
  parameterMapping: Record<string, { source?: string; value?: string }> | undefined,
  schemaLoaded: boolean
): {
  getOptionsForConfig: (config: DataSourceConfig | null) => DataSourceOption[];
  parseDataSourceConfig: (mapping: { source?: string; value?: string } | undefined) => DataSourceConfig | null;
} {
  const [cache, setCache] = useState<Record<string, DataSourceOption[]>>({});
  const fetchedKeysRef = useRef<Set<string>>(new Set());

  const uniqueConfigs = useMemo(
    () => collectUniqueDataSourceConfigs(parameterMapping),
    [parameterMapping]
  );

  const parseDataSourceConfig = useCallback(parseDataSourceConfigFromMapping, []);

  const getOptionsForConfig = useCallback(
    (config: DataSourceConfig | null): DataSourceOption[] => {
      if (!config) return [];
      const versionKey = config.version ?? 'default';
      const key = `${config.datasourceId}:${versionKey}:${config.valueField}:${config.labelField}`;
      return cache[key] ?? [];
    },
    [cache]
  );

  useEffect(() => {
    if (!schemaLoaded || uniqueConfigs.size === 0) return;

    const toFetch: Array<[string, DataSourceConfig]> = [];
    uniqueConfigs.forEach((config, key) => {
      if (!fetchedKeysRef.current.has(key)) {
        toFetch.push([key, config]);
        fetchedKeysRef.current.add(key);
      }
    });

    if (toFetch.length === 0) return;

    Promise.all(
      toFetch.map(async ([key, config]) => {
        try {
          const options = await fetchDataSourceOptions(config);
          return [key, options] as const;
        } catch (err) {
          console.error(`[useTaskInputDataSourceCache] 数据源获取失败:`, config.datasourceId, err);
          return [key, []] as const;
        }
      })
    ).then((results) => {
      setCache((prev) => {
        const next = { ...prev };
        results.forEach(([key, options]) => {
          next[key] = [...options];
        });
        return next;
      });
    });
  }, [schemaLoaded, uniqueConfigs]);

  return { getOptionsForConfig, parseDataSourceConfig };
}
