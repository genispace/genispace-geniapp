import React, { useRef } from 'react';

interface FileEditorProps {
  value?: string;
  onChange: (value: string) => void;
  onSave: () => void;
}

export const FileEditor: React.FC<FileEditorProps> = ({
  value,
  onChange,
  onSave,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // For file upload, we'd typically upload to server first
      // For simplicity, just store the filename
      onChange(file.name);
      onSave();
    }
  };

  return (
    <input
      ref={inputRef}
      type="file"
      onChange={handleChange}
      className="w-full min-w-0 max-w-full text-sm file:mr-2 file:max-w-[min(100%,8rem)]"
    />
  );
};
