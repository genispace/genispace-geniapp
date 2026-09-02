import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { CalendarIcon, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DateRange } from 'react-day-picker';
import {
  Button,
  Calendar,
  Label,
  Sheet,
  SheetContent,
  SheetTitle,
  useLockBodyScroll,
} from '@genispace/shared-ui';
import { cn } from '@genispace/shared-utils';
import {
  applyConfiguredTimeToDateRange,
  type DateRangeDefaultConfig,
  type DateRangeQuickSelectItems,
} from '@/utils/filterPanelDateRangeUtils';
import {
  buildDateRangeForPreset,
  formatMobileDateRangeSummary,
  getCustomDateRangeLabel,
  getDateRangePresetLabel,
  getVisibleDateRangePresets,
  matchDateRangeToPreset,
  type DateRangeSelectionMode,
} from '@/utils/filterPanelMobileDateRangeUtils';
import { mobileFilterFieldStyles as styles } from './mobileFilterFieldStyles';

export interface MobileDateRangeFilterFieldProps {
  label: string;
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  quickSelect?: boolean;
  quickSelectItems?: DateRangeQuickSelectItems;
  showTimePicker?: boolean;
  placeholder?: string;
  timeConfig?: DateRangeDefaultConfig;
}

type DateEndpoint = 'from' | 'to';

function MobileDateRangeFilterField({
  label,
  value,
  onChange,
  quickSelect = true,
  quickSelectItems,
  showTimePicker = false,
  placeholder,
  timeConfig,
}: MobileDateRangeFilterFieldProps) {
  const { t, i18n } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [tempValue, setTempValue] = useState<DateRange | undefined>(value);
  const [selectionMode, setSelectionMode] = useState<DateRangeSelectionMode>('custom');
  const [activeEndpoint, setActiveEndpoint] = useState<DateEndpoint | null>(null);

  useLockBodyScroll(open);

  const filterConfig = useMemo<DateRangeDefaultConfig>(
    () => ({
      type: 'dateRange',
      useSpecifiedTime: timeConfig?.useSpecifiedTime,
      showTimePicker: timeConfig?.showTimePicker ?? showTimePicker,
      specifiedStartTime: timeConfig?.specifiedStartTime,
      specifiedEndTime: timeConfig?.specifiedEndTime,
      quickSelectItems,
    }),
    [timeConfig, showTimePicker, quickSelectItems]
  );

  const dateLocale = useMemo(() => {
    const language = i18n.language || 'en';
    return language.startsWith('zh') ? zhCN : enUS;
  }, [i18n.language]);

  const visiblePresets = useMemo(
    () => (quickSelect !== false ? getVisibleDateRangePresets(quickSelectItems) : []),
    [quickSelect, quickSelectItems]
  );

  const showPresetChips = quickSelect !== false && visiblePresets.length > 0;
  const showCustomChip = quickSelect !== false;

  const syncFromValue = useCallback(() => {
    setTempValue(value);
    setSelectionMode(matchDateRangeToPreset(value, filterConfig, quickSelectItems));
  }, [value, filterConfig, quickSelectItems]);

  useEffect(() => {
    if (!open) {
      return;
    }
    syncFromValue();
  }, [open, syncFromValue]);

  const appliedMode = useMemo(
    () => matchDateRangeToPreset(value, filterConfig, quickSelectItems),
    [value, filterConfig, quickSelectItems]
  );

  const summaryText = useMemo(
    () =>
      value?.from
        ? formatMobileDateRangeSummary(value, appliedMode, t)
        : placeholder ?? t('date_range.placeholder', 'Select date range'),
    [value, appliedMode, placeholder, t]
  );

  const applyPreset = (preset: DateRangeSelectionMode) => {
    if (preset === 'custom') {
      setSelectionMode('custom');
      if (!tempValue?.from) {
        const todayRange = applyConfiguredTimeToDateRange(
          filterConfig,
          buildDateRangeForPreset('today')
        );
        setTempValue(todayRange);
      }
      return;
    }

    setSelectionMode(preset);
    setTempValue(applyConfiguredTimeToDateRange(filterConfig, buildDateRangeForPreset(preset)));
  };

  const handleConfirm = () => {
    if (!tempValue?.from) {
      setOpen(false);
      return;
    }
    const normalized: DateRange = {
      from: tempValue.from,
      to: tempValue.to ?? tempValue.from,
    };
    onChange(applyConfiguredTimeToDateRange(filterConfig, normalized as { from: Date; to: Date }));
    setOpen(false);
  };

  const handleCancel = () => {
    syncFromValue();
    setOpen(false);
  };

  const updateEndpoint = (endpoint: DateEndpoint, date: Date | undefined) => {
    if (!date) {
      return;
    }
    setSelectionMode('custom');
    setTempValue((prev) => {
      const from = endpoint === 'from' ? date : prev?.from ?? date;
      let to = endpoint === 'to' ? date : prev?.to ?? date;
      if (from && to && to.getTime() < from.getTime()) {
        to = from;
      }
      return { from, to };
    });
    setActiveEndpoint(null);
  };

  const renderPresetChip = (preset: DateRangeSelectionMode, chipLabel: string) => {
    const isActive =
      preset === 'custom' ? selectionMode === 'custom' || !showPresetChips : selectionMode === preset;

    return (
      <Button
        key={preset}
        type="button"
        size="sm"
        variant={isActive ? 'default' : 'secondary'}
        className={styles.chip}
        onClick={() => applyPreset(preset)}
      >
        {chipLabel}
      </Button>
    );
  };

  const renderDateEndpointField = (endpoint: DateEndpoint, fieldLabel: string) => {
    const dateValue = endpoint === 'from' ? tempValue?.from : tempValue?.to ?? tempValue?.from;
    const isActive = activeEndpoint === endpoint;
    const displayValue = dateValue
      ? format(dateValue, showTimePicker ? 'yyyy/MM/dd HH:mm' : 'yyyy/MM/dd', { locale: dateLocale })
      : t('date_range.pick_date', 'Pick a date');

    return (
      <div className={styles.sheetField}>
        <Label className={styles.label}>{fieldLabel}</Label>
        <Button
          type="button"
          variant="outline"
          aria-expanded={isActive}
          className={cn(
            styles.controlTrigger,
            isActive && 'border-primary ring-2 ring-ring ring-offset-2 ring-offset-background'
          )}
          onClick={() => setActiveEndpoint(isActive ? null : endpoint)}
        >
          <span className="truncate">{displayValue}</span>
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </Button>
        {isActive && (
          <div
            className="overflow-hidden rounded-lg border border-border bg-card p-2 shadow-sm"
            data-app-date-picker-popover
          >
            <Calendar
              mode="single"
              selected={dateValue}
              onSelect={(date) => updateEndpoint(endpoint, date)}
              locale={dateLocale}
              initialFocus
              className="mx-auto"
            />
          </div>
        )}
      </div>
    );
  };

  const isCustomActive = selectionMode === 'custom' || !showPresetChips;

  return (
    <>
      <div className={styles.field}>
        <Label className={styles.label}>{label}</Label>
        <div className={styles.control}>
          <button
            type="button"
            aria-label={label}
            className={cn(
              'flex h-9 w-full items-center justify-between px-3 text-left',
              styles.fieldControl,
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
            )}
            onClick={() => setOpen(true)}
          >
            <span className="truncate">{summaryText}</span>
            <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[90vh] overflow-y-auto rounded-t-3xl px-4 pb-0 pt-5 [&>button]:top-4 [&>button]:right-4"
        >
          <SheetTitle className="px-8 text-center text-base font-semibold text-foreground">
            {t('date_range.title', 'Date Range')}
          </SheetTitle>

          {(showPresetChips || showCustomChip) && (
            <div className={cn(styles.chipRow, 'mt-4')}>
              {visiblePresets.map((preset) =>
                renderPresetChip(preset, getDateRangePresetLabel(preset, t))
              )}
              {showCustomChip &&
                renderPresetChip('custom', getCustomDateRangeLabel(t))}
            </div>
          )}

          {isCustomActive && (
            <div className="mt-4 space-y-4">
              {renderDateEndpointField('from', t('date_range.start', 'Start'))}
              {renderDateEndpointField('to', t('date_range.end', 'End'))}
            </div>
          )}

          <div className={styles.sheetFooter}>
            <Button
              type="button"
              variant="secondary"
              className={styles.sheetAction}
              onClick={handleCancel}
            >
              {t('date_range.action.cancel', 'Cancel')}
            </Button>
            <Button type="button" className={styles.sheetAction} onClick={handleConfirm}>
              {t('date_range.action.confirm', 'Confirm')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default MobileDateRangeFilterField;
