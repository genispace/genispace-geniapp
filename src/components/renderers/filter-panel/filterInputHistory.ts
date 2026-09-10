// "Recent input" history for filterSheet text inputs (opt-in via filter.inputHistory).
// The server table wb_filter_input_history is the single source of truth; this module is
// only a session-scoped acceleration layer (memory Map + sessionStorage, same double-layer
// precedent as filterOptionCache). Reads/writes go through the companion datasources
// (read = READ, write = TRANSACTION upsert + cap-10 eviction, delete = DELETE) — user
// isolation is enforced server-side via the {{__authUserId}} reserved parameter, so the
// browser never sends a user id.
//
// Cache keys carry a scope hash of the auth token so a different user logging in on the
// same browser session never sees the previous user's cached history.

import { getAuthToken } from '@genispace/shared-api';
import apiClient from '@/lib/api/apiClient';
import {
  deleteDatabaseData,
  transactionDatabaseData,
  withDatasourceVersion,
} from '@/app/services/workbenchApi';
import { resolveRuntimeDatasourceVersion } from '@/utils/datasourceVersion';

export const FILTER_INPUT_HISTORY_CAP = 10;

/** field_key -> recent values, newest first (mirrors the DB ORDER BY updated_at DESC). */
export type FilterInputHistoryMap = Record<string, string[]>;

interface FilterInputHistoryCacheEntry {
  fields: FilterInputHistoryMap;
  cachedAt: number;
}

const SESSION_PREFIX = 'wbFilterHist:';
const memoryCache = new Map<string, FilterInputHistoryCacheEntry>();

// Short non-reversible scope tag derived from the auth token (djb2). Not a user id — just
// enough to keep two users on the same browser session from sharing a cache entry.
export function currentHistoryUserScope(): string {
  try {
    const token = getAuthToken();
    if (!token) return 'anon';
    let h = 5381;
    for (let i = 0; i < token.length; i++) {
      h = ((h << 5) + h + token.charCodeAt(i)) >>> 0;
    }
    return h.toString(36);
  } catch {
    return 'anon';
  }
}

/** cacheKey: wbFilterHist:{userScope}:{workbenchId}:{componentId} */
export function buildFilterInputHistoryKey(
  workbenchId: string | undefined,
  componentId: string | undefined,
  userScope: string = currentHistoryUserScope()
): string {
  return `${SESSION_PREFIX}${userScope}:${workbenchId || 'default'}:${componentId || 'filter-panel'}`;
}

export function getFilterInputHistoryCache(key: string): FilterInputHistoryMap | null {
  const mem = memoryCache.get(key);
  if (mem) return mem.fields;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FilterInputHistoryCacheEntry;
    if (parsed && parsed.fields && typeof parsed.fields === 'object') {
      memoryCache.set(key, parsed); // promote to memory
      return parsed.fields;
    }
  } catch {
    /* sessionStorage unavailable / corrupt — ignore */
  }
  return null;
}

export function setFilterInputHistoryCache(key: string, fields: FilterInputHistoryMap): void {
  const entry: FilterInputHistoryCacheEntry = { fields, cachedAt: Date.now() };
  memoryCache.set(key, entry);
  try {
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    /* quota / unavailable — memory cache still works */
  }
}

/** Local cap-10 mirror of the SQL-layer eviction (write DS transaction deletes beyond the
 *  newest 10); keeps the session cache consistent without a re-read. */
export function trimFilterInputHistory(values: string[]): string[] {
  return values.slice(0, FILTER_INPUT_HISTORY_CAP);
}

// Move `value` to the front of the field's cached list (dedupe = re-input tops the entry,
// mirroring the PK upsert refreshing updated_at) and cap at 10.
export function upsertFilterInputHistoryCached(
  key: string,
  fieldKey: string,
  value: string
): FilterInputHistoryMap {
  const fields = { ...(getFilterInputHistoryCache(key) || {}) };
  const list = fields[fieldKey] || [];
  fields[fieldKey] = trimFilterInputHistory([value, ...list.filter(v => v !== value)]);
  setFilterInputHistoryCache(key, fields);
  return fields;
}

export function deleteFilterInputHistoryCached(
  key: string,
  fieldKey: string,
  value: string
): FilterInputHistoryMap {
  const fields = { ...(getFilterInputHistoryCache(key) || {}) };
  const list = (fields[fieldKey] || []).filter(v => v !== value);
  if (list.length) fields[fieldKey] = list;
  else delete fields[fieldKey];
  setFilterInputHistoryCache(key, fields);
  return fields;
}

async function fetchHistoryRows(
  datasourceId: string,
  params: Record<string, unknown>,
  version?: number
): Promise<Record<string, unknown>[]> {
  // Query params travel at the BODY TOP LEVEL — the /data endpoint reads {{param}}
  // substitutions from top-level keys (same convention as filterOptionCache).
  const resp = (await apiClient.post(
    withDatasourceVersion(
      `/datasources/${datasourceId}/data`,
      resolveRuntimeDatasourceVersion(datasourceId, version)
    ),
    { page: 1, limit: 1000, outputFields: ['field_key', 'input_value', 'updated_at'], ...params },
    { timeout: 30000 }
  )) as { success?: boolean; message?: string; data?: { data?: unknown[] } | unknown[] };

  if (resp?.success) {
    const d = resp.data as { data?: unknown[] } | unknown[] | undefined;
    const rows = Array.isArray(d) ? d : (d?.data ?? []);
    return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
  }
  throw new Error(resp?.message || 'datasource fetch failed');
}

/** Load recent inputs for one filter panel, grouped by field (newest first, cap 10/field).
 *  Session cache first; on miss, read the companion datasource and write the cache back. */
export async function loadFilterInputHistory(
  cacheKey: string,
  datasourceId: string,
  params: { workbenchId: string; componentId: string },
  useCache = true,
  version?: number
): Promise<FilterInputHistoryMap> {
  if (useCache) {
    const cached = getFilterInputHistoryCache(cacheKey);
    if (cached) return cached;
  }
  const rows = await fetchHistoryRows(datasourceId, params, version);
  const fields: FilterInputHistoryMap = {};
  rows.forEach(row => {
    const fieldKey = row['field_key'];
    const value = row['input_value'];
    if (fieldKey == null || value == null) return;
    const k = String(fieldKey);
    (fields[k] = fields[k] || []).push(String(value));
  });
  Object.keys(fields).forEach(k => {
    fields[k] = trimFilterInputHistory(fields[k]);
  });
  if (useCache) setFilterInputHistoryCache(cacheKey, fields);
  return fields;
}

/** Write-through upsert on "Apply Filters": optimistic cache update first, then the
 *  TRANSACTION datasource (upsert + cap-10 eviction). Caller catches failures — history
 *  must never block the apply flow. */
export async function upsertFilterInputHistory(
  cacheKey: string,
  datasourceId: string,
  params: { workbenchId: string; componentId: string; fieldKey: string; value: string },
  version?: number
): Promise<FilterInputHistoryMap> {
  const fields = upsertFilterInputHistoryCached(cacheKey, params.fieldKey, params.value);
  await transactionDatabaseData(
    datasourceId,
    {
      workbenchId: params.workbenchId,
      componentId: params.componentId,
      fieldKey: params.fieldKey,
      inputValue: params.value,
    },
    version
  );
  return fields;
}

/** Delete a single entry (the × control): optimistic cache removal + DELETE datasource. */
export async function deleteFilterInputHistory(
  cacheKey: string,
  datasourceId: string,
  params: { workbenchId: string; componentId: string; fieldKey: string; value: string },
  version?: number
): Promise<FilterInputHistoryMap> {
  const fields = deleteFilterInputHistoryCached(cacheKey, params.fieldKey, params.value);
  await deleteDatabaseData(
    datasourceId,
    {
      workbenchId: params.workbenchId,
      componentId: params.componentId,
      fieldKey: params.fieldKey,
      inputValue: params.value,
    },
    version
  );
  return fields;
}

/** Test hook: clear the in-memory layer (sessionStorage is cleared by the test env). */
export function __resetFilterInputHistoryCache(): void {
  memoryCache.clear();
}
