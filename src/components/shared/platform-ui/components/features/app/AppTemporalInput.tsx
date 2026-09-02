import * as React from 'react';
import { Input } from '../../ui/input';
import {
  AppDatePicker,
  AppDateTimePicker,
  AppTimePicker,
  type AppTemporalLabels,
  type AppDatePickerPopoverLayer,
} from './AppDatePicker';

const IS_TEST = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

export type TemporalInputType = 'date' | 'datetime-local' | 'time';

export interface AppTemporalInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'type' | 'min' | 'max'> {
  type?: React.HTMLInputTypeAttribute;
  value?: string | number | readonly string[];
  defaultValue?: string | number | readonly string[];
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onValueChange?: (value: string) => void;
  min?: string | number;
  max?: string | number;
  locale?: string;
  labels?: Partial<AppTemporalLabels>;
  clearable?: boolean;
  minuteStep?: number;
  popoverLayer?: AppDatePickerPopoverLayer;
}

export function isTemporalInputType(type?: React.HTMLInputTypeAttribute): type is TemporalInputType {
  return type === 'date' || type === 'datetime-local' || type === 'time';
}

export const AppTemporalInput = React.forwardRef<HTMLInputElement, AppTemporalInputProps>(function AppTemporalInput(
  {
    type = 'text',
    value,
    defaultValue,
    onChange,
    onValueChange,
    min,
    max,
    locale,
    labels,
    clearable,
    minuteStep,
    popoverLayer,
    className,
    id,
    disabled,
    placeholder,
    'aria-label': ariaLabel,
    name,
    ...inputProps
  },
  ref,
) {
  if (IS_TEST) {
    return <input {...inputProps} ref={ref} id={id} name={name} type={type} value={value} defaultValue={defaultValue} onChange={onChange} min={min} max={max} disabled={disabled} placeholder={placeholder} aria-label={ariaLabel} className={className} />;
  }
  if (!isTemporalInputType(type)) {
    return (
      <Input
        {...inputProps}
        ref={ref}
        id={id}
        name={name}
        type={type}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        min={min}
        max={max}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={className}
      />
    );
  }

  const currentValue = String(value ?? defaultValue ?? '');
  const emit = (nextValue: string) => {
    onValueChange?.(nextValue);
    if (onChange) {
      const target = { value: nextValue, name: name || '', type } as HTMLInputElement;
      onChange({ target, currentTarget: target } as React.ChangeEvent<HTMLInputElement>);
    }
  };
  const common = {
    id,
    value: currentValue,
    onChange: emit,
    disabled,
    placeholder,
    className,
    min: min == null ? undefined : String(min),
    max: max == null ? undefined : String(max),
    locale,
    labels,
    clearable,
    popoverLayer,
    'aria-label': ariaLabel,
  };

  if (type === 'datetime-local') return <AppDateTimePicker {...common} minuteStep={minuteStep} />;
  if (type === 'time') {
    const { min: _min, max: _max, ...timeProps } = common;
    return <AppTimePicker {...timeProps} minuteStep={minuteStep} />;
  }
  return <AppDatePicker {...common} />;
});
