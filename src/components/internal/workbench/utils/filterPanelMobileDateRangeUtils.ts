import { format, isSameDay, startOfToday, subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import type { TFunction } from 'i18next';
import {
  applyConfiguredTimeToDateRange,
  type DateRangeDefaultConfig,
  type DateRangeQuickSelectPresetKey,
  type DateRangeQuickSelectItems,
} from '@/utils/filterPanelDateRangeUtils';

export type DateRangeSelectionMode = DateRangeQuickSelectPresetKey | 'custom';

export const DATE_RANGE_PRESET_ORDER: DateRangeQuickSelectPresetKey[] = [
  'today',
  'yesterday',
  'yesterdayToToday',
  'last7days',
  'last30days',
];

export function isQuickPresetVisible(
  preset: DateRangeQuickSelectPresetKey,
  quickSelectItems?: DateRangeQuickSelectItems
): boolean {
  return quickSelectItems?.[preset] !== false;
}

export function getVisibleDateRangePresets(
  quickSelectItems?: DateRangeQuickSelectItems
): DateRangeQuickSelectPresetKey[] {
  return DATE_RANGE_PRESET_ORDER.filter((preset) => isQuickPresetVisible(preset, quickSelectItems));
}

export function buildDateRangeForPreset(preset: DateRangeQuickSelectPresetKey): { from: Date; to: Date } {
  const today = startOfToday();
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case 'yesterday': {
      const yesterday = subDays(today, 1);
      return { from: yesterday, to: yesterday };
    }
    case 'yesterdayToToday':
      return { from: subDays(today, 1), to: today };
    case 'last7days':
      return { from: subDays(today, 7), to: today };
    case 'last30days':
      return { from: subDays(today, 30), to: today };
    default:
      return { from: today, to: today };
  }
}

function normalizeRangeEndpoints(range?: DateRange): { from?: Date; to?: Date } {
  if (!range?.from) {
    return {};
  }
  return {
    from: range.from,
    to: range.to ?? range.from,
  };
}

export function areDateRangesEqual(a?: DateRange, b?: DateRange): boolean {
  const left = normalizeRangeEndpoints(a);
  const right = normalizeRangeEndpoints(b);
  if (!left.from || !right.from) {
    return !left.from && !right.from;
  }
  const leftTo = left.to ?? left.from;
  const rightTo = right.to ?? right.from;
  return isSameDay(left.from, right.from) && isSameDay(leftTo, rightTo);
}

export function matchDateRangeToPreset(
  range: DateRange | undefined,
  filter: DateRangeDefaultConfig,
  quickSelectItems?: DateRangeQuickSelectItems
): DateRangeSelectionMode {
  if (!range?.from) {
    return 'custom';
  }

  const presets = getVisibleDateRangePresets(quickSelectItems);
  for (const preset of presets) {
    const built = applyConfiguredTimeToDateRange(filter, buildDateRangeForPreset(preset));
    if (areDateRangesEqual(range, built)) {
      return preset;
    }
  }

  return 'custom';
}

export function getDateRangePresetLabel(
  preset: DateRangeQuickSelectPresetKey,
  t: TFunction
): string {
  const labels: Record<DateRangeQuickSelectPresetKey, string> = {
    today: t('date_range.quick_select.today', 'Today'),
    yesterday: t('date_range.quick_select.yesterday', 'Yesterday'),
    yesterdayToToday: t('date_range.quick_select.yesterday_to_today', 'Yesterday → Today'),
    last7days: t('date_range.quick_select.last7days', 'Last 7 Days'),
    last30days: t('date_range.quick_select.last30days', 'Last 30 Days'),
  };
  return labels[preset];
}

export function getCustomDateRangeLabel(t: TFunction): string {
  return t('date_range.quick_select.custom', 'Custom');
}

export function formatMobileDateRangeSummary(
  range: DateRange | undefined,
  mode: DateRangeSelectionMode,
  t: TFunction,
  dateFormatPattern = 'yyyy/MM/dd'
): string {
  if (!range?.from) {
    return t('date_range.placeholder', 'Select date range');
  }

  const modeLabel =
    mode === 'custom' ? getCustomDateRangeLabel(t) : getDateRangePresetLabel(mode, t);
  const to = range.to ?? range.from;
  const fromText = format(range.from, dateFormatPattern);
  const toText = format(to, dateFormatPattern);

  if (isSameDay(range.from, to)) {
    return `${modeLabel} · ${fromText}`;
  }

  return `${modeLabel} · ${fromText} - ${toText}`;
}
