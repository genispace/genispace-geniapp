









import apiClient from '@/lib/api/apiClient';
import { withDatasourceVersion } from '@/app/services/workbenchApi';
import { resolveRuntimeDatasourceVersion } from '@/utils/datasourceVersion';

export interface FilterOptionCacheEntry {
  rows: Record<string, unknown>[];
  dataStamp?: string; 
  cachedAt: number;   
}

const SESSION_PREFIX = 'filterOpts:';
const memoryCache = new Map<string, FilterOptionCacheEntry>();

/** cacheKey: filterOpts:{datasourceId}:{version}:{fields}:{scope}:{paramsHash}:{lang}
 *  datasourceId is globally unique (no workbench namespace needed).
 *  - scope is part of the entry's identity (it selects the dataStamp that validates the
 *    entry), so two fields sharing a datasourceId but different scopes must not collide.
 *  - fields (projected label/value columns) also identifies the rows: two fields can query
 *    the same datasourceId but project different columns, which must not share an entry. */
export function buildFilterOptionCacheKey(parts: {
  datasourceId: string;
  version?: number;
  fields?: string[];
  scope?: string;
  paramsHash?: string;
  lang: string;
}): string {
  const { datasourceId, version, fields, scope = '_', paramsHash = '_', lang } = parts;
  const fieldsKey = fields && fields.length ? [...fields].sort().join(',') : '_';
  const versionKey = version != null && Number.isInteger(version) && version >= 1 ? String(version) : 'default';
  return `${SESSION_PREFIX}${datasourceId}:${versionKey}:${fieldsKey}:${scope}:${paramsHash}:${lang}`;
}

export function getFilterOptionCache(key: string): FilterOptionCacheEntry | null {
  const mem = memoryCache.get(key);
  if (mem) return mem;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FilterOptionCacheEntry;
    if (parsed && Array.isArray(parsed.rows)) {
      memoryCache.set(key, parsed); // promote to memory
      return parsed;
    }
  } catch {
    /* sessionStorage unavailable / corrupt — ignore */
  }
  return null;
}

export function setFilterOptionCache(key: string, entry: FilterOptionCacheEntry): void {
  memoryCache.set(key, entry);
  try {
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    /* quota / unavailable — memory cache still works */
  }
}

/** Decide whether a cache entry is still usable. */
export function isFilterOptionCacheValid(
  entry: FilterOptionCacheEntry | null,
  opts: { dataStamp?: string; ttlMs?: number; now?: number }
): entry is FilterOptionCacheEntry {
  // A legitimately-empty result (rows: []) is a valid cache entry — freshness is governed
  // by dataStamp / ttl below, not by row count. Only a missing/corrupt entry is invalid.
  if (!entry || !Array.isArray(entry.rows)) return false;
  const { dataStamp, ttlMs, now = Date.now() } = opts;
  if (dataStamp != null && dataStamp !== '') {
    return entry.dataStamp === dataStamp;
  }
  if (ttlMs != null && ttlMs > 0) {
    return now - entry.cachedAt < ttlMs;
  }
  return true; // session-scoped: valid for the whole session
}

/** Stable hash for datasource parameters (used in cacheKey for dependsOn / param variants). */
export function hashFilterParams(params: Record<string, unknown> | undefined): string {
  if (!params || Object.keys(params).length === 0) return '_';
  const sorted = Object.keys(params)
    .sort()
    .map(k => `${k}=${String(params[k])}`)
    .join('&');
  return sorted || '_';
}



async function fetchDatasourceRows(
  datasourceId: string,
  outputFields: string[],
  params?: Record<string, unknown>,
  version?: number
): Promise<Record<string, unknown>[]> {
  // Query params (e.g. a store filter's date range) travel at the BODY TOP LEVEL — the
  // /data endpoint reads `{{param}}` substitutions from top-level keys, not a nested object.
  const resp = (await apiClient.post(
    withDatasourceVersion(
      `/datasources/${datasourceId}/data`,
      resolveRuntimeDatasourceVersion(datasourceId, version)
    ),
    { page: 1, limit: 1000, outputFields, ...(params || {}) },
    { timeout: 30000 }
  )) as { success?: boolean; message?: string; data?: { data?: unknown[] } | unknown[] };

  if (resp?.success) {
    const d = resp.data as { data?: unknown[] } | unknown[] | undefined;
    const rows = Array.isArray(d) ? d : (d?.data ?? []);
    return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
  }
  throw new Error(resp?.message || 'datasource fetch failed');
}


const inflight = new Map<string, Promise<Record<string, unknown>[]>>();



export function loadFilterOptions(
  cacheKey: string,
  datasourceId: string,
  outputFields: string[],
  opts: { dataStamp?: string; ttlMs?: number },
  useCache = true,
  params?: Record<string, unknown>,
  version?: number
): Promise<Record<string, unknown>[]> {
  if (useCache) {
    const cached = getFilterOptionCache(cacheKey);
    if (isFilterOptionCacheValid(cached, opts)) {
      return Promise.resolve(cached.rows);
    }
  }
  const existing = inflight.get(cacheKey);
  if (existing) return existing;

  const promise = fetchDatasourceRows(datasourceId, outputFields, params, version)
    .then(rows => {
      if (useCache) {
        setFilterOptionCache(cacheKey, { rows, dataStamp: opts.dataStamp, cachedAt: Date.now() });
      }
      inflight.delete(cacheKey);
      return rows;
    })
    .catch(err => {
      inflight.delete(cacheKey);
      throw err;
    });
  inflight.set(cacheKey, promise);
  return promise;
}
