import React from 'react';
import { Switch } from '@genispace/shared-ui';
import { cn } from '@genispace/shared-utils';

export interface SwitchEditorProps {
  value: boolean | string | number;
  onChange: (value: boolean) => void;
  onSave: () => void;

  showText?: boolean;
  onText?: string;
  offText?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export const SwitchEditor: React.FC<SwitchEditorProps> = ({
  value,
  onChange,
  onSave,
  showText = false,
  onText = 'On',
  offText = 'Off',
  className,
  onKeyDown,
}) => {
  const normalizedValue =
    typeof value === 'boolean'
      ? value
      : typeof value === 'number'
        ? value === 1
        : typeof value === 'string'
          ? value === 'true' || value === '1'
          : false;

  const handleChange = (checked: boolean) => {
    onChange(checked);
    onSave();
  };

  const label = normalizedValue ? onText : offText;

  return (
    <div
      className={cn(
        'flex min-h-[32px] w-full min-w-0 max-w-full items-center gap-2',
        className
      )}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.key === 'Enter') onSave();
      }}
    >
      {showText ? (
        <span className="text-sm text-muted-foreground tabular-nums shrink-0 min-w-[2.5rem]">
          {label}
        </span>
      ) : null}
      <Switch
        checked={normalizedValue}
        onCheckedChange={handleChange}
        className="data-[state=checked]:bg-primary"
      />
    </div>
  );
};
