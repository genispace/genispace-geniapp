import React, { useEffect, useRef } from 'react';
import {
  toNativeDateInputValue,
  fromNativeDateInputString,
} from '../editableTableFormatters';

export interface DateEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  autoFocus?: boolean;

  dateMode?: 'date' | 'datetime';
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export const DateEditor: React.FC<DateEditorProps> = ({
  value,
  onChange,
  onSave,
  autoFocus = true,
  dateMode = 'date',
  onKeyDown,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const inputType = dateMode === 'datetime' ? 'datetime-local' : 'date';
  const inputValue = toNativeDateInputValue(value, dateMode);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = fromNativeDateInputString(e.target.value, dateMode);
    onChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e);
    if (e.key === 'Enter') {
      onSave();
    }
  };

  return (
    <input
      ref={inputRef}
      type={inputType}
      value={inputValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className="w-full min-w-0 max-w-full box-border h-full px-2 py-1 rounded border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
    />
  );
};
