import React, { useEffect, useRef } from 'react';

interface TextEditorProps {
  value: string | number;
  onChange: (value: string) => void;
  onSave: () => void;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    onKeyDown?.(e);
    if (e.key === 'Enter') {
      onSave();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      size={1}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      className="box-border h-full w-full min-w-0 max-w-full px-2 py-1 [field-sizing:fixed] rounded border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
    />
  );
};
