import React, { useEffect, useRef } from 'react';

export interface NumberEditorProps {
  value: string | number;
  onChange: (value: number | string) => void;
  onSave: () => void;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export const NumberEditor: React.FC<NumberEditorProps> = ({
  value,
  onChange,
  onSave,
  autoFocus = true,
  onKeyDown,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const str =
    value === null || value === undefined || value === ''
      ? ''
      : typeof value === 'number'
        ? (Number.isNaN(value) ? '' : String(value))
        : String(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '' || raw === '-') {
      onChange('');
      return;
    }
    const n = Number(raw);
    onChange(Number.isNaN(n) ? raw : n);
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
      type="number"
      inputMode="decimal"
      step="any"
      value={str}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className="w-full h-full min-w-0 max-w-full box-border px-2 py-1 rounded border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
    />
  );
};
