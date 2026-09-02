import { AppDatePicker } from '../features/app/AppDatePicker';

export interface DatePickerProps {
  selected?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholderText?: string;
  className?: string;
  compact?: boolean;
  locale?: string;
}

function toValue(date?: Date): string {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function DatePicker({ selected, onChange, placeholderText, className, compact = false, locale }: DatePickerProps) {
  return (
    <AppDatePicker
      value={toValue(selected)}
      onChange={(value) => onChange?.(value ? new Date(`${value}T00:00:00`) : undefined)}
      placeholder={placeholderText}
      locale={locale}
      className={className}
      triggerClassName={compact ? 'h-8 px-2 text-sm' : undefined}
    />
  );
}
