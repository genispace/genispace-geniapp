import React, { useEffect, useRef } from 'react';

interface ColorEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export const ColorEditor: React.FC<ColorEditorProps> = ({
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
    <div className="flex items-center gap-2 w-full min-w-0 max-w-full">
      <input
        ref={inputRef}
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-8 shrink-0 p-0 rounded border border-input cursor-pointer"
      />
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="#000000"
        className="min-w-0 max-w-full flex-1 h-full box-border px-2 py-1 rounded border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
      />
    </div>
  );
};
