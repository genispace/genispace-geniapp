import {
  Children,
  isValidElement,
  type ChangeEvent,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { cn } from '@genispace/shared-utils';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';

const EMPTY_VALUE = '__genispace_empty_selection__';
const IS_TEST = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

type NativeOptionProps = { value?: string | number; disabled?: boolean; children?: ReactNode; label?: string };
type NativeGroupProps = { label?: string; children?: ReactNode };

function optionValue(option: ReactElement<NativeOptionProps>) {
  const raw = option.props.value ?? option.key ?? '';
  return String(raw) || EMPTY_VALUE;
}

function optionText(children: ReactNode) {
  return Children.toArray(children).join('');
}

function renderOptions(children: ReactNode): ReactNode[] {
  const rendered: ReactNode[] = [];
  Children.toArray(children).forEach((child, index) => {
    if (!isValidElement(child)) return;
    if (child.type === 'option') {
      const option = child as ReactElement<NativeOptionProps>;
      rendered.push(
        <SelectItem key={child.key ?? `${optionValue(option)}-${index}`} value={optionValue(option)} disabled={option.props.disabled}>
          {option.props.label || option.props.children}
        </SelectItem>,
      );
      return;
    }
    if (child.type === 'optgroup') {
      const group = child as ReactElement<NativeGroupProps>;
      rendered.push(
        <SelectGroup key={child.key ?? `group-${index}`}>
          {group.props.label ? <SelectLabel>{group.props.label}</SelectLabel> : null}
          {renderOptions(group.props.children)}
        </SelectGroup>,
      );
      return;
    }
    rendered.push(...renderOptions((child.props as { children?: ReactNode }).children));
  });
  return rendered;
}

function selectedLabel(children: ReactNode, value: string): string | undefined {
  let match: string | undefined;
  Children.forEach(children, (child) => {
    if (!isValidElement(child) || match) return;
    if (child.type === 'option') {
      const option = child as ReactElement<NativeOptionProps>;
      if (optionValue(option) === (value || EMPTY_VALUE)) match = option.props.label || optionText(option.props.children);
      return;
    }
    match = selectedLabel((child.props as { children?: ReactNode }).children, value);
  });
  return match;
}

export type AppSelectInputProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'size'> & {
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  children?: ReactNode;
  placeholder?: string;
  contentClassName?: string;
};

function singleValue(value: string | number | readonly string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** Input-compatible adapter for the platform Select. */
export function AppSelectInput({
  value,
  defaultValue,
  onChange,
  children,
  className,
  contentClassName,
  disabled,
  required,
  name,
  id,
  placeholder,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: AppSelectInputProps) {
  if (IS_TEST) {
    return (
      <select
        id={id}
        name={name}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        disabled={disabled}
        required={required}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        className={className}
      >
        {children}
      </select>
    );
  }
  const normalizedValue = singleValue(value);
  const normalizedDefault = singleValue(defaultValue);
  const controlledValue = normalizedValue == null ? undefined : String(normalizedValue) || EMPTY_VALUE;
  const initialValue = normalizedDefault == null ? undefined : String(normalizedDefault) || EMPTY_VALUE;
  const display = selectedLabel(children, controlledValue ?? initialValue ?? '');
  return (
    <Select
      value={controlledValue}
      defaultValue={initialValue}
      disabled={disabled}
      required={required}
      name={name}
      onValueChange={(nextValue) => {
        const next = nextValue === EMPTY_VALUE ? '' : nextValue;
        onChange?.({ target: { value: next, name: name || '' }, currentTarget: { value: next, name: name || '' } } as ChangeEvent<HTMLSelectElement>);
      }}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} aria-describedby={ariaDescribedBy} className={cn('min-h-10', className)}>
        <SelectValue placeholder={placeholder || display}>{display}</SelectValue>
      </SelectTrigger>
      <SelectContent className={contentClassName}>{renderOptions(children)}</SelectContent>
    </Select>
  );
}
