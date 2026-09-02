import { format, setHours, setMinutes, setSeconds, startOfToday, subDays } from 'date-fns';

export type DateRangeQuickSelectPresetKey =
  | 'today'
  | 'yesterday'
  | 'yesterdayToToday'
  | 'last7days'
  | 'last30days';

export type DateRangeQuickSelectItems = Partial<Record<DateRangeQuickSelectPresetKey, boolean>>;

export type DateRangeDefaultConfig = {
  type: string;
  defaultValue?: unknown;
  useSpecifiedTime?: boolean;

  showTimePicker?: boolean;

  specifiedStartTime?: string;

  specifiedEndTime?: string;

  quickSelectItems?: DateRangeQuickSelectItems;
};

export type TimeParts = { h: number; m: number; s: number };

export function parseTimePartsFromConfig(value: string | undefined): TimeParts | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  if (!s) return undefined;

  const timeOnly = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (timeOnly) {
    const h = Number(timeOnly[1]);
    const m = Number(timeOnly[2]);
    const sec = Number(timeOnly[3] ?? 0);
    if (h >= 0 && h < 24 && m >= 0 && m < 60 && sec >= 0 && sec < 60) {
      return { h, m, s: sec };
    }
    return undefined;
  }

  if (s.includes('T')) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return { h: d.getHours(), m: d.getMinutes(), s: d.getSeconds() };
    }
  }

  return undefined;
}

export function combineDateWithTimeParts(d: Date, parts: TimeParts): Date {
  const base = new Date(d);
  return setSeconds(setMinutes(setHours(base, parts.h), parts.m), parts.s);
}

const DEFAULT_START: TimeParts = { h: 0, m: 0, s: 0 };
const DEFAULT_END: TimeParts = { h: 23, m: 59, s: 59 };

export function applyConfiguredTimeToDateRange(
  filter: DateRangeDefaultConfig,
  range: { from: Date; to: Date }
): { from: Date; to: Date } {
  if (filter.type !== 'dateRange' || filter.useSpecifiedTime !== true) {
    return range;
  }
  return {
    from: combineDateWithTimeParts(range.from, parseTimePartsFromConfig(filter.specifiedStartTime) ?? DEFAULT_START),
    to: combineDateWithTimeParts(range.to, parseTimePartsFromConfig(filter.specifiedEndTime) ?? DEFAULT_END)
  };
}

export function formatDateRangeStartForParams(filter: DateRangeDefaultConfig, from: Date): string {
  if (filter.useSpecifiedTime === true) {
    const d = new Date(from);
    if (filter.showTimePicker !== true) {
      const merged = combineDateWithTimeParts(d, parseTimePartsFromConfig(filter.specifiedStartTime) ?? DEFAULT_START);
      return format(merged, 'yyyy-MM-dd HH:mm:ss');
    }
    return format(d, 'yyyy-MM-dd HH:mm:ss');
  }
  return format(setSeconds(setMinutes(setHours(new Date(from), 0), 0), 0), 'yyyy-MM-dd HH:mm:ss');
}

export function formatDateRangeEndForParams(filter: DateRangeDefaultConfig, to: Date): string {
  if (filter.useSpecifiedTime === true) {
    const d = new Date(to);
    if (filter.showTimePicker !== true) {
      const merged = combineDateWithTimeParts(d, parseTimePartsFromConfig(filter.specifiedEndTime) ?? DEFAULT_END);
      return format(merged, 'yyyy-MM-dd HH:mm:ss');
    }
    return format(d, 'yyyy-MM-dd HH:mm:ss');
  }
  return format(setSeconds(setMinutes(setHours(new Date(to), 23), 59), 59), 'yyyy-MM-dd HH:mm:ss');
}

export function resolveDateRangeDefault(filter: DateRangeDefaultConfig): { from: Date; to: Date } | undefined {
  if (filter.type !== 'dateRange') return undefined;

  const dv = filter.defaultValue;
  if (dv === undefined || dv === null) return undefined;

  if (dv === 'today') {
    const today = startOfToday();
    return { from: today, to: today };
  }
  if (dv === 'yesterday') {
    const yesterday = subDays(startOfToday(), 1);
    return { from: yesterday, to: yesterday };
  }

  if (dv === 'yesterdayToToday') {
    return { from: subDays(startOfToday(), 1), to: startOfToday() };
  }
  if (dv === 'last7days') {
    return { from: subDays(startOfToday(), 7), to: startOfToday() };
  }
  if (dv === 'last30days') {
    return { from: subDays(startOfToday(), 30), to: startOfToday() };
  }
  if (typeof dv === 'object' && dv !== null && 'from' in dv && 'to' in dv) {
    const o = dv as { from: unknown; to: unknown };
    const from = o.from instanceof Date ? o.from : new Date(String(o.from));
    const to = o.to instanceof Date ? o.to : new Date(String(o.to));
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      return { from, to };
    }
  }
  return undefined;
}

export function filterConfigKeyForReset(f: DateRangeDefaultConfig & { key: string }): string {
  if (f.type === 'dateRange') {
    return `${f.key}|dv|${String(f.defaultValue ?? '')}|ust|${Boolean(f.useSpecifiedTime)}|${f.specifiedStartTime ?? ''}|${f.specifiedEndTime ?? ''}|qsi|${JSON.stringify(f.quickSelectItems ?? {})}`;
  }
  return `${f.key}|dv|${String(f.defaultValue ?? '')}`;
}
