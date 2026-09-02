import React, { useState, useEffect, useMemo, useRef } from 'react';
import { format, setHours, setMinutes, setSeconds, startOfToday, subDays } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@genispace/shared-utils';
import { Button } from './button';
import { Label } from './label';
import { Input } from './input';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { useTranslation } from 'react-i18next';
import type { DateRange } from 'react-day-picker';

function dateToTimeInputValue(d: Date | undefined): string {
  if (!d || Number.isNaN(d.getTime())) return '00:00:00';
  return format(d, 'HH:mm:ss');
}

function applyTimeStringToDate(d: Date, timeStr: string): Date {
  const trimmed = timeStr.trim();
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  const h = m ? Math.min(23, Math.max(0, Number(m[1]))) : 0;
  const min = m ? Math.min(59, Math.max(0, Number(m[2]))) : 0;
  const s = m && m[3] !== undefined ? Math.min(59, Math.max(0, Number(m[3]))) : 0;
  const base = new Date(d);
  return setSeconds(setMinutes(setHours(base, h), min), s);
}

export type { DateRange };

export type DateRangeQuickSelectPresetKey =
  | 'today'
  | 'yesterday'
  | 'yesterdayToToday'
  | 'last7days'
  | 'last30days';

export interface DateRangeFilterProps {

  value?: DateRange;

  onChange?: (dateRange: DateRange | undefined) => void;

  label?: string;

  inline?: boolean;

  showQuickSelect?: boolean;

  placeholder?: string;

  style?: React.CSSProperties;

  className?: string;

  triggerClassName?: string;

  quickSelectLabels?: {
    today?: string;
    yesterday?: string;
    yesterdayToToday?: string;
    last7days?: string;
    last30days?: string;
  };

  actionLabels?: {
    confirm?: string;
    cancel?: string;
  };

  showTimePicker?: boolean;

  quickSelectItems?: Partial<Record<DateRangeQuickSelectPresetKey, boolean>>;

  /** Merged into `PopoverContent` (e.g. theme-scoped styles for portaled calendar/actions). */
  popoverContentClassName?: string;
}

const DATE_RANGE_PRESETS: Record<DateRangeQuickSelectPresetKey, () => DateRange> = {
  today: () => {
    const today = startOfToday();
    return { from: today, to: today };
  },
  yesterday: () => {
    const yesterday = subDays(startOfToday(), 1);
    return { from: yesterday, to: yesterday };
  },
  last7days: () => {
    return { from: subDays(startOfToday(), 7), to: startOfToday() };
  },
  last30days: () => {
    return { from: subDays(startOfToday(), 30), to: startOfToday() };
  },

  yesterdayToToday: () => {
    return { from: subDays(startOfToday(), 1), to: startOfToday() };
  }
};

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  label,
  inline = false,
  showQuickSelect = true,
  placeholder,
  style,
  className,
  triggerClassName,
  quickSelectLabels,
  actionLabels,
  showTimePicker = false,
  quickSelectItems,
  popoverContentClassName,
}) => {
  const { t, i18n } = useTranslation('common');

  const dateLocale = useMemo(() => {
    const language = i18n.language || 'en';

    if (language.startsWith('zh')) {
      return zhCN;
    }

    return enUS;
  }, [i18n.language]);

  const defaultQuickSelectLabels = {
    today: quickSelectLabels?.today ?? t('date_range.quick_select.today', 'Today'),
    yesterday: quickSelectLabels?.yesterday ?? t('date_range.quick_select.yesterday', 'Yesterday'),
    yesterdayToToday:
      quickSelectLabels?.yesterdayToToday ??
      t('date_range.quick_select.yesterday_to_today', 'Yesterday → Today'),
    last7days: quickSelectLabels?.last7days ?? t('date_range.quick_select.last7days', 'Last 7 Days'),
    last30days: quickSelectLabels?.last30days ?? t('date_range.quick_select.last30days', 'Last 30 Days')
  };

  const defaultActionLabels = {
    confirm: actionLabels?.confirm ?? t('date_range.action.confirm', 'Confirm'),
    cancel: actionLabels?.cancel ?? t('date_range.action.cancel', 'Cancel')
  };

  const [open, setOpen] = useState(false);

  const [tempValue, setTempValue] = useState<DateRange | undefined>(value);
  const [timeFrom, setTimeFrom] = useState('00:00:00');
  const [timeTo, setTimeTo] = useState('23:59:59');
  const timeFromRef = useRef(timeFrom);
  const timeToRef = useRef(timeTo);
  timeFromRef.current = timeFrom;
  timeToRef.current = timeTo;

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (open) {
      setTempValue(value);
    }
  }, [open, value]);

  useEffect(() => {
    if (!showTimePicker) return;
    const tf = value?.from ? dateToTimeInputValue(value.from) : '00:00:00';
    const tt = value?.to ? dateToTimeInputValue(value.to) : value?.from ? dateToTimeInputValue(value.from) : '23:59:59';
    setTimeFrom(tf);
    setTimeTo(tt);
    timeFromRef.current = tf;
    timeToRef.current = tt;
  }, [showTimePicker, value]);

  const isQuickPresetVisible = (preset: DateRangeQuickSelectPresetKey) =>
    quickSelectItems?.[preset] !== false;

  const hasAnyQuickPresetVisible =
    isQuickPresetVisible('today') ||
    isQuickPresetVisible('yesterday') ||
    isQuickPresetVisible('yesterdayToToday') ||
    isQuickPresetVisible('last7days') ||
    isQuickPresetVisible('last30days');

  const handleQuickSelect = (preset: DateRangeQuickSelectPresetKey) => {
    let dateRange = DATE_RANGE_PRESETS[preset]();
    if (showTimePicker && dateRange.from) {
      const tf = timeFromRef.current;
      const tt = timeToRef.current;
      dateRange = {
        from: applyTimeStringToDate(dateRange.from, tf),
        to: dateRange.to ? applyTimeStringToDate(dateRange.to, tt) : undefined
      };
    }
    onChange?.(dateRange);
  };

  const handleConfirm = () => {
    if (showTimePicker && tempValue?.from) {
      const merged: DateRange = {
        from: applyTimeStringToDate(tempValue.from, timeFrom),
        to: tempValue.to ? applyTimeStringToDate(tempValue.to, timeTo) : undefined
      };
      onChange?.(merged);
    } else {
      onChange?.(tempValue);
    }
    setOpen(false);
  };

  const handleCancel = () => {
    setTempValue(value);
    setOpen(false);
  };

  return (
    <div
      className={cn("flex", inline ? "items-center gap-4" : "flex-col gap-4", className)}
      style={style?.marginTop ? { marginTop: style.marginTop } : undefined}
    >
      {!inline && label && <Label className="text-sm font-medium">{label}:</Label>}

      <div className="flex flex-row items-center gap-2 flex-wrap">
        {showQuickSelect && hasAnyQuickPresetVisible && (
          <div className="flex gap-2 flex-wrap">
            {isQuickPresetVisible('today') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('today')}
                className="h-7 text-xs"
              >
                {defaultQuickSelectLabels.today}
              </Button>
            )}
            {isQuickPresetVisible('yesterday') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('yesterday')}
                className="h-7 text-xs"
              >
                {defaultQuickSelectLabels.yesterday}
              </Button>
            )}
            {isQuickPresetVisible('yesterdayToToday') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('yesterdayToToday')}
                className="h-7 text-xs"
              >
                {defaultQuickSelectLabels.yesterdayToToday}
              </Button>
            )}
            {isQuickPresetVisible('last7days') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('last7days')}
                className="h-7 text-xs"
              >
                {defaultQuickSelectLabels.last7days}
              </Button>
            )}
            {isQuickPresetVisible('last30days') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('last30days')}
                className="h-7 text-xs"
              >
                {defaultQuickSelectLabels.last30days}
              </Button>
            )}
          </div>
        )}

        {inline && label && (
          <Label className="text-sm font-medium whitespace-nowrap flex-1 text-center">
            {label}:
          </Label>
        )}

        <div className={inline && label ? "" : "ml-auto"}>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size={inline ? "sm" : "default"}
                className={cn(
                  !triggerClassName && (inline ? "h-8" : "h-7"),
                  triggerClassName,
                  "justify-start text-left font-normal",
                  !style?.width && "min-w-[240px]",
                  !value && "text-muted-foreground"
                )}
                style={style?.width ? { width: style.width } : undefined}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value?.from ? (
                  value.to ? (
                    <>
                      {showTimePicker
                        ? `${format(value.from, "yyyy-MM-dd HH:mm:ss", { locale: dateLocale })} - ${format(value.to, "yyyy-MM-dd HH:mm:ss", { locale: dateLocale })}`
                        : `${format(value.from, "yyyy-MM-dd", { locale: dateLocale })} - ${format(value.to, "yyyy-MM-dd", { locale: dateLocale })}`}
                    </>
                  ) : (
                    showTimePicker
                      ? format(value.from, "yyyy-MM-dd HH:mm:ss", { locale: dateLocale })
                      : format(value.from, "yyyy-MM-dd", { locale: dateLocale })
                  )
                ) : (
                  placeholder ? <span>{placeholder}</span> : null
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className={cn('w-auto p-0', popoverContentClassName)}
              align="start"
            >
              <div className="flex flex-col">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={tempValue?.from || value?.from}
                  selected={tempValue}
                  onSelect={(range: DateRange | undefined) => {
                    if (!showTimePicker) {
                      setTempValue(range);
                      return;
                    }
                    if (!range?.from) {
                      setTempValue(range);
                      return;
                    }
                    const from = applyTimeStringToDate(range.from, timeFromRef.current);
                    const to = range.to ? applyTimeStringToDate(range.to, timeToRef.current) : undefined;
                    setTempValue({ from, to });
                  }}
                  numberOfMonths={2}
                  locale={dateLocale}
                />
                {showTimePicker && (
                  <div className="flex flex-row items-end gap-4 border-t px-3 py-2 sm:gap-6">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <Label className="text-xs text-muted-foreground">
                        {t('date_range.time.start', 'Start time')}
                      </Label>
                      <Input
                        type="time"
                        step={1}
                        value={timeFrom}
                        onChange={(e) => {
                          const v = e.target.value;
                          setTimeFrom(v);
                          timeFromRef.current = v;
                          setTempValue((prev) => {
                            if (!prev?.from) return prev;
                            return { ...prev, from: applyTimeStringToDate(prev.from, v) };
                          });
                        }}
                        className="h-8 w-full min-w-0 text-sm"
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <Label className="text-xs text-muted-foreground">
                        {t('date_range.time.end', 'End time')}
                      </Label>
                      <Input
                        type="time"
                        step={1}
                        value={timeTo}
                        onChange={(e) => {
                          const v = e.target.value;
                          setTimeTo(v);
                          timeToRef.current = v;
                          setTempValue((prev) => {
                            if (!prev?.to) return prev;
                            return { ...prev, to: applyTimeStringToDate(prev.to, v) };
                          });
                        }}
                        className="h-8 w-full min-w-0 text-sm"
                      />
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2 p-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    className="h-8"
                  >
                    {defaultActionLabels.cancel}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirm}
                    className="h-8"
                  >
                    {defaultActionLabels.confirm}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

