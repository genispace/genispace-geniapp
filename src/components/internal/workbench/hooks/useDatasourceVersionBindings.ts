import { useCallback, useEffect, useState } from 'react';
import { batchListDatasourceVersions } from '@/app/services/workbenchApi';
import type { WorkbenchConfigData } from '@/types';

/**
 * Non-default datasource version bindings of a workbench config — shared by the
 * EditModeToolbar badge (count) and the PublishDialog binding list.
 *
 * A pin counts as non-default when the pinned version differs from the
 * datasource's current default, or when the pinned version no longer exists.
 * Single POST /datasources/versions/batch call — it returns name/identifier
 * per datasource, so no per-datasource detail fetches are needed.
 */
export interface DatasourceVersionBindingInfo {
  datasourceId: string;
  name?: string;
  identifier?: string;
  pinnedVersion: number;
  defaultVersion: number | null;
  /** False when the pinned version was deleted upstream. */
  pinnedExists: boolean;
}

export function useNonDefaultDatasourceBindings(
  config: Pick<WorkbenchConfigData, 'datasourceVersions'> | null | undefined
): { bindings: DatasourceVersionBindingInfo[]; loading: boolean } {
  const [bindings, setBindings] = useState<DatasourceVersionBindingInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const pinsKey = JSON.stringify(config?.datasourceVersions ?? {});

  const load = useCallback(async () => {
    const pins = (JSON.parse(pinsKey) || {}) as Record<string, number>;
    const entries = Object.entries(pins).filter(
      ([, version]) => typeof version === 'number' && Number.isInteger(version) && version >= 1
    );
    if (entries.length === 0) {
      setBindings([]);
      return;
    }

    setLoading(true);
    try {
      const ids = entries.map(([id]) => id);
      const batchResponse = await batchListDatasourceVersions(ids);
      const items = (batchResponse.data as { items?: Array<{
        datasourceId: string;
        name?: string | null;
        identifier?: string | null;
        versions: Array<{ version: number; isDefault: boolean }>;
        error?: { code: string };
      }> })?.items ?? [];
      const itemById = new Map(items.map((item) => [item.datasourceId, item]));

      const result: DatasourceVersionBindingInfo[] = [];
      for (const [datasourceId, pinnedVersion] of entries) {
        const item = itemById.get(datasourceId);
        const versions = item?.versions ?? [];
        const defaultVersion = versions.find((v) => v.isDefault)?.version ?? null;
        const pinnedExists = versions.some((v) => v.version === pinnedVersion);
        if (pinnedExists && pinnedVersion === defaultVersion) continue;
        result.push({
          datasourceId,
          name: item?.name ?? undefined,
          identifier: item?.identifier ?? undefined,
          pinnedVersion,
          defaultVersion,
          pinnedExists,
        });
      }
      setBindings(result);
    } catch (error) {
      console.error('加载数据源版本绑定信息失败:', error);
      setBindings([]);
    } finally {
      setLoading(false);
    }
  }, [pinsKey]);

  useEffect(() => {
    void load();
  }, [load]);

  return { bindings, loading };
}
