import { useMemo, useState, useCallback } from 'react';

/** Preset windows for the dashboard time-range selector. */
export type RangePreset = 'today' | '7d' | '30d' | 'mtd' | 'qtd' | 'ytd' | '12m' | 'custom';

export const RANGE_PRESETS: RangePreset[] = ['today', '7d', '30d', 'mtd', 'qtd', 'ytd', '12m'];

/** Inclusive `from`, EXCLUSIVE `to` (YYYY-MM-DD). Query with `>= from AND < to`. */
export interface DateRange {
  from: string;
  to: string;
  preset: RangePreset;
}

function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map((n) => parseInt(n, 10));
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
function addMonths(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setUTCMonth(x.getUTCMonth() + n);
  return x;
}
function addYears(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setUTCFullYear(x.getUTCFullYear() + n);
  return x;
}
/** Today at UTC midnight (range math is day-granular and tz-stable). */
function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Resolve a preset into a concrete [from, to) window (to = exclusive, day after today). */
export function resolvePreset(preset: RangePreset): DateRange {
  const today = todayUTC();
  const to = ymd(addDays(today, 1)); // exclusive end = tomorrow
  let from: Date;
  switch (preset) {
    case 'today':
      from = today;
      break;
    case '7d':
      from = addDays(today, -6);
      break;
    case '30d':
      from = addDays(today, -29);
      break;
    case 'mtd':
      from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      break;
    case 'qtd': {
      const q = Math.floor(today.getUTCMonth() / 3) * 3;
      from = new Date(Date.UTC(today.getUTCFullYear(), q, 1));
      break;
    }
    case 'ytd':
      from = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
      break;
    case '12m':
      from = addMonths(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)), -11);
      break;
    default:
      from = addDays(today, -29);
  }
  return { from: ymd(from), to, preset };
}

/** Immediately-preceding window of equal length (环比 / period-over-period). */
export function previousRange(r: DateRange): DateRange {
  const from = parseYmd(r.from);
  const to = parseYmd(r.to);
  const lenDays = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  return { from: ymd(addDays(from, -lenDays)), to: r.from, preset: r.preset };
}

/** Same window shifted back one year (同比 / year-over-year). */
export function yearOverYearRange(r: DateRange): DateRange {
  return { from: ymd(addYears(parseYmd(r.from), -1)), to: ymd(addYears(parseYmd(r.to), -1)), preset: r.preset };
}

export interface UseDashboardRangeResult {
  range: DateRange;
  prevRange: DateRange;
  yoyRange: DateRange;
  setPreset: (p: RangePreset) => void;
  setCustom: (from: string, to: string) => void;
}

/**
 * Dashboard time-range state with derived 环比 (previous) and 同比 (year-over-year)
 * comparison windows. `to` is exclusive; pass `from`/`to` to date-range datasources.
 */
export function useDashboardRange(initial: RangePreset = '30d'): UseDashboardRangeResult {
  const [range, setRange] = useState<DateRange>(() => resolvePreset(initial));

  const setPreset = useCallback((p: RangePreset) => setRange(resolvePreset(p)), []);
  const setCustom = useCallback((from: string, to: string) => {
    // Custom `to` is inclusive in the picker UI; store exclusive (+1 day).
    setRange({ from, to: ymd(addDays(parseYmd(to), 1)), preset: 'custom' });
  }, []);

  const prevRange = useMemo(() => previousRange(range), [range]);
  const yoyRange = useMemo(() => yearOverYearRange(range), [range]);

  return { range, prevRange, yoyRange, setPreset, setCustom };
}
