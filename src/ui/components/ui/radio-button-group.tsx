import React, { useMemo } from 'react';
import { cn } from '@genispace/geniapp/utils';
import { Label } from './label';
import { RadioGroup, RadioGroupItem } from './radio-group';

export interface RadioButtonOption {
  label: string;
  value: string;
}

export interface RadioButtonGroupProps {

  options: RadioButtonOption[];

  value?: string | string[];

  onChange?: (value: string | string[]) => void;

  label?: string;

  multiple?: boolean;

  defaultValue?: string | string[];

  className?: string;

  optionsClassName?: string;

  getOptionClassName?: (option: RadioButtonOption, isSelected: boolean) => string;
}

export const RadioButtonGroup: React.FC<RadioButtonGroupProps> = ({
  options,
  value,
  onChange,
  label,
  multiple = false,
  defaultValue,
  className,
  optionsClassName,
  getOptionClassName
}) => {

  const currentValue = useMemo(() => {
    return value !== undefined ? value : defaultValue;
  }, [value, defaultValue]);

  const selectedValues = useMemo(() => {
    if (!multiple) return [] as string[];
    if (Array.isArray(currentValue)) {
      return currentValue.filter((v) => v !== '' && v != null);
    }
    if (currentValue && currentValue !== '') {
      return [String(currentValue)];
    }
    return [];
  }, [multiple, currentValue]);

  if (multiple) {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        {label && <Label className="text-sm font-medium">{label}</Label>}
        <div className={cn("flex flex-wrap gap-2", optionsClassName)}>
          {options.map(option => {
            const isSelected = selectedValues.includes(option.value);
            const optionClassName = getOptionClassName
              ? getOptionClassName(option, isSelected)
              : cn(
                  "inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border cursor-pointer transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
                );

            const handleToggle = (e: React.MouseEvent | React.ChangeEvent) => {
              e.preventDefault();
              e.stopPropagation();
              const newValues = isSelected
                ? selectedValues.filter(v => v !== option.value)
                : [...selectedValues, option.value];
              onChange?.(newValues);
            };

            return (
              <label
                key={option.value}
                htmlFor={`radio-btn-${option.value}`}
                className={optionClassName}
                onClick={handleToggle}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={handleToggle}
                  className="sr-only"
                  id={`radio-btn-${option.value}`}
                  readOnly
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  const singleValue = Array.isArray(currentValue) ? currentValue[0] : String(currentValue || '');

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <RadioGroup
        value={singleValue}
        onValueChange={(newValue) => onChange?.(newValue)}
      >
        <div className={cn("flex flex-wrap gap-2", optionsClassName)}>
          {options.map(option => {
            const isSelected = singleValue === option.value;
            const optionClassName = getOptionClassName
              ? getOptionClassName(option, isSelected)
              : cn(
                  "inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border cursor-pointer transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
                );

            return (
              <label
                key={option.value}
                htmlFor={`radio-btn-${option.value}`}
                className={optionClassName}
              >
                <RadioGroupItem 
                  value={option.value} 
                  id={`radio-btn-${option.value}`}
                  className="sr-only"
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      </RadioGroup>
    </div>
  );
};

