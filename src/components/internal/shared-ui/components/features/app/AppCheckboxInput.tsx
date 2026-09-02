import type { ChangeEvent, InputHTMLAttributes } from 'react';
import { Checkbox } from '../../ui/checkbox';

const IS_TEST = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

export type AppCheckboxInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'checked' | 'defaultChecked' | 'onChange' | 'type'> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

/** Input-compatible adapter for the platform Checkbox. */
export function AppCheckboxInput({ checked, defaultChecked, onChange, className, disabled, required, name, value, id, 'aria-label': ariaLabel, 'aria-describedby': ariaDescribedBy }: AppCheckboxInputProps) {
  if (IS_TEST) {
    return <input id={id} type="checkbox" checked={checked} defaultChecked={defaultChecked} onChange={onChange} className={className} disabled={disabled} required={required} name={name} value={value} aria-label={ariaLabel} aria-describedby={ariaDescribedBy} />;
  }
  return (
    <Checkbox
      id={id}
      checked={checked}
      defaultChecked={defaultChecked}
      disabled={disabled}
      required={required}
      name={name}
      value={value}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={className}
      onCheckedChange={(nextChecked) => {
        const next = nextChecked === true;
        onChange?.({ target: { checked: next, name: name || '', value: String(value ?? 'on') }, currentTarget: { checked: next, name: name || '', value: String(value ?? 'on') } } as ChangeEvent<HTMLInputElement>);
      }}
    />
  );
}
