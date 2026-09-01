import * as React from 'react';
import { format } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import { CalendarDays, Clock3, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@genispace/geniapp/utils';
import { Z_INDEX_CLASSES } from '../../../styles/z-index-layers';
import { Button } from '../../ui/button';
import { Calendar } from '../../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import type { DateRange, Matcher } from 'react-day-picker';

const IS_TEST = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

export type AppDatePickerPopoverLayer = 'default' | 'aboveModal';
export type AppDateTimePickerPopoverLayer = AppDatePickerPopoverLayer;

export interface AppTemporalLabels {
  chooseDate: string;
  chooseDateTime: string;
  chooseTime: string;
  clear: string;
  today: string;
  previousYear: string;
  nextYear: string;
  hour: string;
  minute: string;
  apply: string;
}

export interface AppDatePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  min?: string;
  max?: string;
  locale?: string;
  labels?: Partial<AppTemporalLabels>;
  clearable?: boolean;
  'aria-label'?: string;
  popoverLayer?: AppDatePickerPopoverLayer;
  disabledDays?: Matcher | Matcher[];
  presets?: Array<{ label: string; value: string }>;
}

export interface AppDateRangePickerProps extends Omit<AppDatePickerProps, 'value' | 'onChange' | 'presets'> {
  value: { from: string; to: string };
  onChange: (value: { from: string; to: string }) => void;
  presets?: Array<{ label: string; value: { from: string; to: string } }>;
}

export interface AppDateTimePickerProps extends Omit<AppDatePickerProps, 'placeholder'> {
  placeholder?: string;
  minuteStep?: number;
}

export interface AppTimePickerProps
  extends Pick<AppDatePickerProps, 'id' | 'value' | 'onChange' | 'disabled' | 'className' | 'triggerClassName' | 'locale' | 'labels' | 'clearable' | 'aria-label' | 'popoverLayer'> {
  placeholder?: string;
  minuteStep?: number;
}

const DEFAULT_LABELS: Record<'en' | 'zh', AppTemporalLabels> = {
  en: {
    chooseDate: 'Select date',
    chooseDateTime: 'Select date and time',
    chooseTime: 'Select time',
    clear: 'Clear',
    today: 'Today',
    previousYear: 'Previous year',
    nextYear: 'Next year',
    hour: 'Hour',
    minute: 'Minute',
    apply: 'Apply',
  },
  zh: {
    chooseDate: '选择日期',
    chooseDateTime: '选择日期和时间',
    chooseTime: '选择时间',
    clear: '清除',
    today: '今天',
    previousYear: '上一年',
    nextYear: '下一年',
    hour: '小时',
    minute: '分钟',
    apply: '应用',
  },
};

function normalizeLocale(locale?: string): 'en' | 'zh' {
  return String(locale || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function temporalLabels(locale?: string, overrides?: Partial<AppTemporalLabels>): AppTemporalLabels {
  return { ...DEFAULT_LABELS[normalizeLocale(locale)], ...overrides };
}

export function parseBusinessDate(value?: string): Date | undefined {
  const dateOnly = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/) ?? [];
  if (!dateOnly[1]) return undefined;
  const date = new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  if (
    date.getFullYear() !== Number(dateOnly[1]) ||
    date.getMonth() !== Number(dateOnly[2]) - 1 ||
    date.getDate() !== Number(dateOnly[3])
  ) return undefined;
  return date;
}

export function formatBusinessDateValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseTime(value?: string): { hour: number; minute: number } {
  const match = String(value || '').match(/(?:T|^)(\d{2}):(\d{2})/);
  const hour = Math.min(23, Math.max(0, Number(match?.[1] || 9)));
  const minute = Math.min(59, Math.max(0, Number(match?.[2] || 0)));
  return { hour, minute };
}

function displayDate(value: string, locale: 'en' | 'zh'): string {
  const selected = parseBusinessDate(value);
  if (!selected) return '';
  return format(selected, locale === 'zh' ? 'yyyy年M月d日' : 'MMM d, yyyy', {
    locale: locale === 'zh' ? zhCN : enUS,
  });
}

function displayDateTime(value: string, locale: 'en' | 'zh'): string {
  const date = displayDate(value, locale);
  if (!date) return '';
  const time = parseTime(value);
  return `${date} ${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
}

function displayTime(value: string): string {
  if (!value) return '';
  const time = parseTime(value);
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
}

function useTemporalLanguage(explicitLocale?: string) {
  const { i18n } = useTranslation();
  return normalizeLocale(explicitLocale || i18n.resolvedLanguage || i18n.language);
}

function ClearButton({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      className="h-9 w-9 shrink-0 rounded-l-none border-l border-border text-muted-foreground"
      onClick={onClear}
    >
      <X className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}

function TriggerValue({ icon, value, placeholder }: { icon: React.ReactNode; value: string; placeholder: string }) {
  return (
    <>
      {icon}
      <span className={cn('min-w-0 flex-1 truncate text-left', !value && 'text-muted-foreground')}>
        {value || placeholder}
      </span>
    </>
  );
}

function RuntimeAppDatePicker({
  id,
  value,
  onChange,
  disabled,
  placeholder,
  className,
  triggerClassName,
  min,
  max,
  locale: explicitLocale,
  labels: labelOverrides,
  clearable = true,
  'aria-label': ariaLabel,
  popoverLayer = 'aboveModal',
  disabledDays,
  presets = [],
}: AppDatePickerProps) {
  const locale = useTemporalLanguage(explicitLocale);
  const labels = temporalLabels(locale, labelOverrides);
  const selected = parseBusinessDate(value);
  const minDate = parseBusinessDate(min);
  const maxDate = parseBusinessDate(max);
  const [open, setOpen] = React.useState(false);
  const display = displayDate(value, locale);

  return (
    <div className={cn('flex min-w-0 items-stretch rounded-md border border-input bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2', className)}>
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="ghost"
            disabled={disabled}
            aria-label={ariaLabel || placeholder || labels.chooseDate}
            className={cn('h-10 min-w-0 flex-1 justify-start gap-2 rounded-r-none px-3 font-normal hover:bg-accent/60', triggerClassName)}
          >
            <TriggerValue icon={<CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />} value={display} placeholder={placeholder || labels.chooseDate} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className={cn('w-auto max-w-[calc(100vw-1.5rem)] p-0', popoverLayer === 'aboveModal' ? Z_INDEX_CLASSES.DATE_PICKER_POPOVER : Z_INDEX_CLASSES.POPOVER)}
        >
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected || minDate || new Date()}
            onSelect={(date) => {
              if (!date) return;
              onChange(formatBusinessDateValue(date));
              setOpen(false);
            }}
            disabled={[{ before: minDate || new Date(100, 0, 1), after: maxDate || new Date(9999, 11, 31) }, ...(Array.isArray(disabledDays) ? disabledDays : disabledDays ? [disabledDays] : [])]}
            locale={locale === 'zh' ? zhCN : enUS}
            captionLayout="dropdown-buttons"
            fromDate={minDate || new Date(1900, 0, 1)}
            toDate={maxDate || new Date(new Date().getFullYear() + 20, 11, 31)}
            initialFocus
          />
          {presets.length > 0 ? <div className="flex flex-wrap gap-1 border-t border-border px-3 py-2">{presets.map((preset) => <Button key={`${preset.label}-${preset.value}`} type="button" variant="ghost" size="sm" onClick={() => { onChange(preset.value); setOpen(false); }}>{preset.label}</Button>)}</div> : null}
          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const today = formatBusinessDateValue(new Date());
                const beforeMin = minDate && new Date(today) < minDate;
                const afterMax = maxDate && new Date(today) > maxDate;
                if (!beforeMin && !afterMax) onChange(today);
                setOpen(false);
              }}
            >
              {labels.today}
            </Button>
            {clearable && value ? <Button type="button" variant="ghost" size="sm" onClick={() => { onChange(''); setOpen(false); }}>{labels.clear}</Button> : null}
          </div>
        </PopoverContent>
      </Popover>
      {clearable && value && !disabled ? <ClearButton label={labels.clear} onClear={() => onChange('')} /> : null}
    </div>
  );
}

export function AppDatePicker(props: AppDatePickerProps) {
  if (IS_TEST) {
    return <input id={props.id} type="date" value={props.value} onChange={(event) => props.onChange(event.currentTarget.value)} disabled={props.disabled} min={props.min} max={props.max} aria-label={props['aria-label'] || props.placeholder} className={props.className} />;
  }
  return <RuntimeAppDatePicker {...props} />;
}

function RuntimeAppDateRangePicker({
  id, value, onChange, disabled, placeholder, className, triggerClassName, min, max,
  locale: explicitLocale, labels: labelOverrides, clearable = true, 'aria-label': ariaLabel,
  popoverLayer = 'aboveModal', disabledDays, presets = [],
}: AppDateRangePickerProps) {
  const locale = useTemporalLanguage(explicitLocale);
  const labels = temporalLabels(locale, labelOverrides);
  const minDate = parseBusinessDate(min);
  const maxDate = parseBusinessDate(max);
  const selected: DateRange = { from: parseBusinessDate(value.from), to: parseBusinessDate(value.to) };
  const [open, setOpen] = React.useState(false);
  const display = value.from ? `${displayDate(value.from, locale)}${value.to ? ` – ${displayDate(value.to, locale)}` : ''}` : '';
  return <div className={cn('flex min-w-0 items-stretch rounded-md border border-input bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2', className)}><Popover open={open} onOpenChange={setOpen} modal><PopoverTrigger asChild><Button id={id} type="button" variant="ghost" disabled={disabled} aria-label={ariaLabel || placeholder || labels.chooseDate} className={cn('h-10 min-w-0 flex-1 justify-start gap-2 rounded-r-none px-3 font-normal', triggerClassName)}><TriggerValue icon={<CalendarDays className="h-4 w-4 shrink-0" aria-hidden />} value={display} placeholder={placeholder || labels.chooseDate} /></Button></PopoverTrigger><PopoverContent align="start" className={cn('w-auto max-w-[calc(100vw-1.5rem)] p-0', popoverLayer === 'aboveModal' ? Z_INDEX_CLASSES.DATE_PICKER_POPOVER : Z_INDEX_CLASSES.POPOVER)}><Calendar mode="range" selected={selected} onSelect={(range) => onChange({ from: range?.from ? formatBusinessDateValue(range.from) : '', to: range?.to ? formatBusinessDateValue(range.to) : '' })} numberOfMonths={2} disabled={[{ before: minDate || new Date(100, 0, 1), after: maxDate || new Date(9999, 11, 31) }, ...(Array.isArray(disabledDays) ? disabledDays : disabledDays ? [disabledDays] : [])]} locale={locale === 'zh' ? zhCN : enUS} captionLayout="dropdown-buttons" fromDate={minDate || new Date(1900, 0, 1)} toDate={maxDate || new Date(new Date().getFullYear() + 20, 11, 31)} initialFocus />{presets.length > 0 ? <div className="flex flex-wrap gap-1 border-t border-border px-3 py-2">{presets.map((preset) => <Button key={preset.label} type="button" variant="ghost" size="sm" onClick={() => { onChange(preset.value); setOpen(false); }}>{preset.label}</Button>)}</div> : null}<div className="flex justify-end border-t border-border px-3 py-2">{clearable && value.from ? <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ from: '', to: '' })}>{labels.clear}</Button> : null}</div></PopoverContent></Popover>{clearable && value.from && !disabled ? <ClearButton label={labels.clear} onClear={() => onChange({ from: '', to: '' })} /> : null}</div>;
}

export function AppDateRangePicker(props: AppDateRangePickerProps) {
  if (IS_TEST) {
    return <div className={props.className}><input id={props.id} type="date" value={props.value.from} onChange={(event) => props.onChange({ ...props.value, from: event.currentTarget.value })} disabled={props.disabled} min={props.min} max={props.max} aria-label={props['aria-label'] || props.placeholder} /><input type="date" value={props.value.to} onChange={(event) => props.onChange({ ...props.value, to: event.currentTarget.value })} disabled={props.disabled} min={props.min} max={props.max} aria-label={`${props['aria-label'] || props.placeholder || 'Date'} end`} /></div>;
  }
  return <RuntimeAppDateRangePicker {...props} />;
}

function TimeChoiceGrid({
  hour,
  minute,
  minuteStep,
  labels,
  onHour,
  onMinute,
}: {
  hour: number;
  minute: number;
  minuteStep: number;
  labels: AppTemporalLabels;
  onHour: (value: number) => void;
  onMinute: (value: number) => void;
}) {
  const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, index) => Math.min(59, index * minuteStep));
  return (
    <div className="grid grid-cols-2 gap-3 border-t border-border p-3">
      <fieldset>
        <legend className="mb-2 text-xs font-medium text-muted-foreground">{labels.hour}</legend>
        <div className="grid max-h-36 grid-cols-4 gap-1 overflow-y-auto pr-1">
          {Array.from({ length: 24 }, (_, value) => (
            <Button key={value} type="button" size="sm" variant={hour === value ? 'default' : 'ghost'} className="h-8 px-1 tabular-nums" onClick={() => onHour(value)}>
              {String(value).padStart(2, '0')}
            </Button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-xs font-medium text-muted-foreground">{labels.minute}</legend>
        <div className="grid max-h-36 grid-cols-3 gap-1 overflow-y-auto pr-1">
          {minutes.map((value) => (
            <Button key={value} type="button" size="sm" variant={minute === value ? 'default' : 'ghost'} className="h-8 px-1 tabular-nums" onClick={() => onMinute(value)}>
              {String(value).padStart(2, '0')}
            </Button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function RuntimeAppDateTimePicker({
  id,
  value,
  onChange,
  disabled,
  placeholder,
  className,
  triggerClassName,
  min,
  max,
  locale: explicitLocale,
  labels: labelOverrides,
  clearable = true,
  minuteStep = 5,
  'aria-label': ariaLabel,
  popoverLayer = 'aboveModal',
}: AppDateTimePickerProps) {
  const locale = useTemporalLanguage(explicitLocale);
  const labels = temporalLabels(locale, labelOverrides);
  const selected = parseBusinessDate(value);
  const minDate = parseBusinessDate(min);
  const maxDate = parseBusinessDate(max);
  const initialTime = parseTime(value);
  const [open, setOpen] = React.useState(false);
  const [draftDate, setDraftDate] = React.useState<Date>(selected || new Date());
  const [hour, setHour] = React.useState(initialTime.hour);
  const [minute, setMinute] = React.useState(initialTime.minute);

  React.useEffect(() => {
    if (!open) return;
    setDraftDate(selected || new Date());
    const next = parseTime(value);
    setHour(next.hour);
    setMinute(next.minute);
  }, [open, selected?.getTime(), value]);

  const apply = () => {
    onChange(`${formatBusinessDateValue(draftDate)}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    setOpen(false);
  };

  return (
    <div className={cn('flex min-w-0 items-stretch rounded-md border border-input bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2', className)}>
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="ghost" disabled={disabled} aria-label={ariaLabel || placeholder || labels.chooseDateTime} className={cn('h-10 min-w-0 flex-1 justify-start gap-2 rounded-r-none px-3 font-normal hover:bg-accent/60', triggerClassName)}>
            <TriggerValue icon={<CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />} value={displayDateTime(value, locale)} placeholder={placeholder || labels.chooseDateTime} />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className={cn('w-auto max-w-[calc(100vw-1.5rem)] p-0', popoverLayer === 'aboveModal' ? Z_INDEX_CLASSES.DATE_PICKER_POPOVER : Z_INDEX_CLASSES.POPOVER)}>
          <Calendar mode="single" selected={draftDate} onSelect={(date) => date && setDraftDate(date)} disabled={{ before: minDate || new Date(100, 0, 1), after: maxDate || new Date(9999, 11, 31) }} locale={locale === 'zh' ? zhCN : enUS} initialFocus />
          <TimeChoiceGrid hour={hour} minute={minute} minuteStep={Math.max(1, Math.min(30, minuteStep))} labels={labels} onHour={setHour} onMinute={setMinute} />
          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            {clearable && value ? <Button type="button" variant="ghost" size="sm" onClick={() => { onChange(''); setOpen(false); }}>{labels.clear}</Button> : <span />}
            <Button type="button" size="sm" onClick={apply}>{labels.apply}</Button>
          </div>
        </PopoverContent>
      </Popover>
      {clearable && value && !disabled ? <ClearButton label={labels.clear} onClear={() => onChange('')} /> : null}
    </div>
  );
}

export function AppDateTimePicker(props: AppDateTimePickerProps) {
  if (IS_TEST) {
    return <input id={props.id} type="datetime-local" value={props.value} onChange={(event) => props.onChange(event.currentTarget.value)} disabled={props.disabled} min={props.min} max={props.max} aria-label={props['aria-label'] || props.placeholder} className={props.className} />;
  }
  return <RuntimeAppDateTimePicker {...props} />;
}

function RuntimeAppTimePicker({
  id,
  value,
  onChange,
  disabled,
  placeholder,
  className,
  triggerClassName,
  locale: explicitLocale,
  labels: labelOverrides,
  clearable = true,
  minuteStep = 5,
  'aria-label': ariaLabel,
  popoverLayer = 'aboveModal',
}: AppTimePickerProps) {
  const locale = useTemporalLanguage(explicitLocale);
  const labels = temporalLabels(locale, labelOverrides);
  const initial = parseTime(value);
  const [open, setOpen] = React.useState(false);
  const [hour, setHour] = React.useState(initial.hour);
  const [minute, setMinute] = React.useState(initial.minute);
  React.useEffect(() => {
    if (!open) return;
    const next = parseTime(value);
    setHour(next.hour);
    setMinute(next.minute);
  }, [open, value]);
  const apply = () => {
    onChange(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    setOpen(false);
  };

  return (
    <div className={cn('flex min-w-0 items-stretch rounded-md border border-input bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2', className)}>
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="ghost" disabled={disabled} aria-label={ariaLabel || placeholder || labels.chooseTime} className={cn('h-10 min-w-0 flex-1 justify-start gap-2 rounded-r-none px-3 font-normal hover:bg-accent/60', triggerClassName)}>
            <TriggerValue icon={<Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />} value={displayTime(value)} placeholder={placeholder || labels.chooseTime} />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className={cn('w-[320px] max-w-[calc(100vw-1.5rem)] p-0', popoverLayer === 'aboveModal' ? Z_INDEX_CLASSES.DATE_PICKER_POPOVER : Z_INDEX_CLASSES.POPOVER)}>
          <TimeChoiceGrid hour={hour} minute={minute} minuteStep={Math.max(1, Math.min(30, minuteStep))} labels={labels} onHour={setHour} onMinute={setMinute} />
          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            {clearable && value ? <Button type="button" variant="ghost" size="sm" onClick={() => { onChange(''); setOpen(false); }}>{labels.clear}</Button> : <span />}
            <Button type="button" size="sm" onClick={apply}>{labels.apply}</Button>
          </div>
        </PopoverContent>
      </Popover>
      {clearable && value && !disabled ? <ClearButton label={labels.clear} onClear={() => onChange('')} /> : null}
    </div>
  );
}

export function AppTimePicker(props: AppTimePickerProps) {
  if (IS_TEST) {
    return <input id={props.id} type="time" value={props.value} onChange={(event) => props.onChange(event.currentTarget.value)} disabled={props.disabled} aria-label={props['aria-label'] || props.placeholder} className={props.className} />;
  }
  return <RuntimeAppTimePicker {...props} />;
}
