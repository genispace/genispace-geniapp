import { useSyncExternalStore, useEffect } from 'react';
import type { WorkbenchConfigData } from '@/types';

/**
 * Workbench-level datasource version pins.
 *
 * `config.datasourceVersions` is a sparse `{ [datasourceId]: version }` map:
 * a missing entry means "follow the datasource default version". Runtime
 * priority: workbench map > component/action-level version field > default.
 *
 * Renderers and hooks deep inside the tree do not receive the workbench
 * config, so the layout syncs the map into a module-level registry
 * (`setRuntimeDatasourceVersions`); call sites resolve through
 * `resolveRuntimeDatasourceVersion` (imperative) or `useDatasourceVersions`
 * (reactive).
 */

type DatasourceVersionsMap = Record<string, number>;

/** Pure resolver per the design doc: read the map, fall back to the caller's version. */
export function resolveDatasourceVersion(
  config: Pick<WorkbenchConfigData, 'datasourceVersions'> | null | undefined,
  datasourceId: string | null | undefined,
  fallback?: number
): number | undefined {
  if (!datasourceId) return fallback;
  const pinned = config?.datasourceVersions?.[datasourceId];
  if (typeof pinned === 'number' && Number.isInteger(pinned) && pinned >= 1) {
    return pinned;
  }
  return fallback;
}

let currentVersions: DatasourceVersionsMap | undefined;
const listeners = new Set<() => void>();
function mapsEqual(a: DatasourceVersionsMap | undefined, b: DatasourceVersionsMap | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

/** Called by WorkbenchLayout whenever the loaded/draft config changes. */
export function setRuntimeDatasourceVersions(versions: DatasourceVersionsMap | undefined): void {
  const next = versions && Object.keys(versions).length > 0 ? versions : undefined;
  if (mapsEqual(currentVersions, next)) return;
  currentVersions = next ? { ...next } : undefined;
  listeners.forEach((listener) => listener());
}

export function getRuntimeDatasourceVersions(): DatasourceVersionsMap | undefined {
  return currentVersions;
}

/** Imperative resolution for event-driven call sites (actions, exports, caches). */
export function resolveRuntimeDatasourceVersion(
  datasourceId: string | null | undefined,
  fallback?: number
): number | undefined {
  return resolveDatasourceVersion({ datasourceVersions: currentVersions }, datasourceId, fallback);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Reactive read: components refetch when a pin changes. */
export function useDatasourceVersions(): DatasourceVersionsMap | undefined {
  return useSyncExternalStore(subscribe, getRuntimeDatasourceVersions, () => undefined);
}

/**
 * Sync the workbench-level pins from the loaded config into the module registry,
 * clearing on unmount. Shared by every layout entry (desktop WorkbenchLayout and
 * WorkbenchMobileLayout) so no viewport-specific entry can forget to populate it.
 */
export function useSyncRuntimeDatasourceVersions(
  config: Pick<WorkbenchConfigData, 'datasourceVersions'> | null | undefined
): void {
  const versions = config?.datasourceVersions;
  useEffect(() => {
    setRuntimeDatasourceVersions(versions);
  }, [versions]);
  useEffect(() => {
    return () => setRuntimeDatasourceVersions(undefined);
  }, []);
}

/**
 * F6 fallback detection: backend `resolveDataSourceConfig(id, spaceId, version=N)`
 * throws 404 `DATASOURCE_VERSION_NOT_FOUND` when the pinned version was deleted.
 * BaseApiClient attaches the response body as `errorDetails`.
 */
export function isDatasourceVersionNotFoundError(error: unknown): boolean {
  const err = error as {
    errorDetails?: { code?: string };
    response?: { status?: number; data?: { code?: string } };
  } | null | undefined;
  const code = err?.errorDetails?.code ?? err?.response?.data?.code;
  return code === 'DATASOURCE_VERSION_NOT_FOUND';
}

const DATASOURCE_ACTION_CONFIG_KEYS = [
  'updateDatabase',
  'insertDatabase',
  'deleteDatabase',
  'transactionDatabase',
] as const;

export interface ReferencedDatasource {
  datasourceId: string;
  /** Name carried by the workbench config (databaseDataSourceConfig.datasourceName). */
  name?: string;
}

/**
 * All datasources referenced by the workbench — deduplicated, with the config-carried
 * datasourceName when present. Deep-walks `config.pages` only.
 *
 * Reference shapes collected:
 *  - component `databaseDataSourceConfig.datasourceId` (root-level or under props) — carries the name;
 *  - action `targetDatasourceId` (update/insert/delete/transaction);
 *  - ANY plain `{ datasourceId: string }` own property — catches FilterPanel-internal sources that
 *    live outside databaseDataSourceConfig: filter option `dataSource`, presetDateRange
 *    `dateRangeSource` / `customTabs[].source`, `updateTime`, filterSheet section/tab/tag sources, …;
 *  - `{ stampDatasourceId: string }` (FilterPanel option-cache stamp meta source).
 */
export function collectReferencedDatasources(
  config: Pick<WorkbenchConfigData, 'pages'> | null | undefined
): ReferencedDatasource[] {
  const found = new Map<string, string | undefined>();

  const visit = (node: unknown, depth: number): void => {
    if (!node || typeof node !== 'object' || depth > 60) return;
    if (Array.isArray(node)) {
      node.forEach((item) => visit(item, depth + 1));
      return;
    }
    const obj = node as Record<string, unknown>;

    const dbConfig = obj.databaseDataSourceConfig as
      | { datasourceId?: unknown; datasourceName?: unknown }
      | undefined;
    if (
      dbConfig &&
      typeof dbConfig === 'object' &&
      typeof dbConfig.datasourceId === 'string' &&
      dbConfig.datasourceId
    ) {
      const name =
        typeof dbConfig.datasourceName === 'string' && dbConfig.datasourceName
          ? dbConfig.datasourceName
          : undefined;
      found.set(dbConfig.datasourceId, found.get(dbConfig.datasourceId) ?? name);
    }

    // Filter-level sources (option dataSource / dateRangeSource / updateTime / customTabs source…).
    // Never overwrites a config-carried name already recorded above.
    if (typeof obj.datasourceId === 'string' && obj.datasourceId) {
      if (!found.has(obj.datasourceId)) found.set(obj.datasourceId, undefined);
    }
    if (typeof obj.stampDatasourceId === 'string' && obj.stampDatasourceId) {
      if (!found.has(obj.stampDatasourceId)) found.set(obj.stampDatasourceId, undefined);
    }

    for (const key of DATASOURCE_ACTION_CONFIG_KEYS) {
      const actionConfig = obj[key] as { targetDatasourceId?: unknown } | undefined;
      if (
        actionConfig &&
        typeof actionConfig === 'object' &&
        typeof actionConfig.targetDatasourceId === 'string' &&
        actionConfig.targetDatasourceId
      ) {
        found.set(
          actionConfig.targetDatasourceId,
          found.get(actionConfig.targetDatasourceId)
        );
      }
    }

    for (const value of Object.values(obj)) {
      visit(value, depth + 1);
    }
  };

  visit(config?.pages ?? {}, 0);
  return [...found.entries()].map(([datasourceId, name]) => ({ datasourceId, name }));
}

/**
 * All datasource ids referenced by the workbench — deduplicated.
 * Convenience wrapper over collectReferencedDatasources.
 */
export function collectReferencedDatasourceIds(
  config: Pick<WorkbenchConfigData, 'pages'> | null | undefined
): string[] {
  return collectReferencedDatasources(config).map((entry) => entry.datasourceId);
}
