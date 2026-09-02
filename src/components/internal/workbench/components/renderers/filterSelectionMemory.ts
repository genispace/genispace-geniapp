// Persisted "last selection" for FilterPanel filters (opt-in via filter.rememberSelection).
// Unlike filterOptionCache (session-scoped OPTION lists), this stores the user's committed
// CHOICE in localStorage so it survives reloads. Precedence at init time is
// URL/bus params > this memory > config defaultValue — see resolvePresetDateRangeInitial.
//
// Presets store only the key ({ v: 'mtd' }): dates are recomputed from the live
// date-range datasource on restore, never replayed from a stale session.
// Custom ranges store explicit dates ({ v: 'custom', start, end, tab? }).

export interface FilterSelectionMemory {
  v: string;
  start?: string; // YYYY-MM-DD, only when v === 'custom'
  end?: string;
  tab?: string; // last-used custom sub-tab, to restore the sheet UI
  savedAt: number;
}

const PREFIX = 'wbFilterSel:';
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export const isYmdDateString = (s: unknown): s is string => typeof s === 'string' && YMD.test(s);

export function buildFilterMemoryKey(
  workbenchId: string | undefined,
  componentId: string | undefined,
  filterKey: string
): string {
  return `${PREFIX}${workbenchId || 'default'}:${componentId || 'filter-panel'}:${filterKey}`;
}

// Returns null (caller falls back to defaultValue) on: missing/corrupt entry, localStorage
// unavailable, a remembered preset key no longer configured, or invalid/inverted custom dates.
export function readFilterSelectionMemory(
  key: string,
  validPresets: string[]
): FilterSelectionMemory | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const m = JSON.parse(raw) as FilterSelectionMemory;
    if (!m || typeof m.v !== 'string' || !m.v) return null;
    if (m.v === 'custom') {
      return isYmdDateString(m.start) && isYmdDateString(m.end) && m.start <= m.end ? m : null;
    }
    return validPresets.includes(m.v) ? m : null;
  } catch {
    return null;
  }
}

export function writeFilterSelectionMemory(
  key: string,
  m: Omit<FilterSelectionMemory, 'savedAt'>
): void {
  try {
    localStorage.setItem(key, JSON.stringify({ ...m, savedAt: Date.now() }));
  } catch {
    // localStorage unavailable / quota exceeded — remembering is best-effort
  }
}
