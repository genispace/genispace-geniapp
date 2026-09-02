import React from 'react';
import { useTranslation } from 'react-i18next';

interface ArrayInputProps {
  value: string[];
  onChange: (newValues: string[]) => void;
  placeholder?: string;
  maxItems?: number;
  emptyMessage?: string;
  addButtonLabel?: string;
  className?: string;
  inputClassName?: string;
}

export function ArrayInput({
  value = [],
  onChange,
  placeholder = 'Item',
  maxItems,
  emptyMessage,
  addButtonLabel,
  className = '',
  inputClassName = 'input w-full py-2',
}: ArrayInputProps) {
  const { t } = useTranslation('common');
  const defaultEmptyMessage = emptyMessage || t('array_input.no_items', 'No items, click the button below to add');
  const defaultAddButtonLabel = addButtonLabel || t('array_input.add_item', 'Add Item');
  const handleAddItem = () => {
    const newValue = [...value, ''];
    onChange(newValue);
  };

  const handleRemoveItem = (index: number) => {
    const newValue = value.filter((_, i) => i !== index);
    onChange(newValue);
  };

  const handleItemChange = (index: number, newItemValue: string) => {
    const newValue = [...value];
    newValue[index] = newItemValue;
    onChange(newValue);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-col space-y-2">
        {value.length > 0 ? (
          value.map((item, index) => (
            <div key={index} className="flex items-center gap-2 group">
              <div className="flex-1">
                <input
                  type="text"
                  className={`${inputClassName} pl-3 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 border-neutral-300 dark:border-neutral-600`}
                  value={item}
                  onChange={(e) => handleItemChange(index, e.target.value)}
                  placeholder={`${placeholder} ${index + 1}`}
                />
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon text-destructive rounded-full opacity-0 group-hover:opacity-100"
                onClick={() => handleRemoveItem(index)}
                title={t('array_input.delete_item', 'Delete this item')}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-content-muted dark:text-content-dark-muted italic">
            {defaultEmptyMessage}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <button
          type="button"
          className="btn btn-sm btn-outline flex items-center gap-1"
          onClick={handleAddItem}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {defaultAddButtonLabel}
        </button>

        {maxItems && (
          <div className="text-xs text-content-muted dark:text-content-dark-muted">
            {t('array_input.max_items', '(Maximum {{count}} items)', { count: maxItems })}
          </div>
        )}
      </div>
    </div>
  );
} 