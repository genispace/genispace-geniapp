import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Label } from '@genispace/shared-ui';
import { X, Plus } from 'lucide-react';
import { JSONSchemaProperty } from '@genispace/shared-types';
import { cn } from '@genispace/shared-utils';

interface ObjectArrayInputProps {
  value: any[];
  onChange: (newValues: any[]) => void;
  itemSchema: JSONSchemaProperty;
  className?: string;
  label?: string;
  description?: string;
  required?: boolean;
  errors?: Record<number, Record<string, string>>;
}

export const ObjectArrayInput: React.FC<ObjectArrayInputProps> = ({
  value = [],
  onChange,
  itemSchema,
  className = '',
  label,
  description,
  required = false,
  errors = []
}) => {
  const { t } = useTranslation(['workbench', 'common']);
  const handleAddItem = () => {
    const newItem: any = {};
    if (itemSchema.properties) {
      Object.keys(itemSchema.properties).forEach(key => {
        const prop = itemSchema.properties![key];
        if (prop.default !== undefined) {
          newItem[key] = prop.default;
        } else if (prop.type === 'number' || prop.type === 'integer') {
          newItem[key] = 0;
        } else if (prop.type === 'boolean') {
          newItem[key] = false;
        } else if (prop.type === 'array') {
          newItem[key] = [];
        } else if (prop.type === 'object') {
          newItem[key] = {};
        } else {
          newItem[key] = '';
        }
      });
    }
    onChange([...value, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const newValue = value.filter((_, i) => i !== index);
    onChange(newValue);
  };

  const handleItemFieldChange = (index: number, fieldName: string, fieldValue: any) => {
    const newValue = [...value];
    newValue[index] = {
      ...newValue[index],
      [fieldName]: fieldValue
    };
    onChange(newValue);
  };

  const renderField = (item: any, itemIndex: number, fieldName: string, fieldSchema: JSONSchemaProperty) => {
    const fieldValue = item[fieldName];
    const isFieldRequired = itemSchema.required?.includes(fieldName);
    const fieldError = errors?.[itemIndex]?.[fieldName] || '';

    if (fieldSchema.enum) {
      return (
        <select
          value={String(fieldValue ?? '')}
          onChange={(e) => handleItemFieldChange(itemIndex, fieldName, e.target.value)}
          className={cn(
            "w-full px-3 py-2 border rounded-md",
            fieldError ? "border-red-500" : "border-gray-300"
          )}
        >
          <option value="">
            {t('workbench:object_array_input.select_placeholder', 'Please select...')}
          </option>
          {fieldSchema.enum.map((option: any) => (
            <option key={String(option)} value={String(option)}>
              {String(option)}
            </option>
          ))}
        </select>
      );
    }

    switch (fieldSchema.type) {
      case 'number':
      case 'integer':
        return (
          <Input
            type="number"
            value={String(fieldValue ?? '')}
            onChange={(e) => {
              const inputValue = e.target.value;
              if (inputValue === '') {
                handleItemFieldChange(itemIndex, fieldName, '');
              } else {
                const numValue = fieldSchema.type === 'integer' 
                  ? parseInt(inputValue, 10) 
                  : parseFloat(inputValue);
                if (!isNaN(numValue)) {
                  handleItemFieldChange(itemIndex, fieldName, numValue);
                }
              }
            }}
            min={fieldSchema.minimum}
            max={fieldSchema.maximum}
            step={fieldSchema.type === 'integer' ? 1 : undefined}
            className={cn(
              fieldError ? "border-red-500" : ""
            )}
            placeholder={fieldSchema.description || fieldSchema.title || fieldName}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={Boolean(fieldValue)}
              onChange={(e) => handleItemFieldChange(itemIndex, fieldName, e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-600">
              {fieldValue
                ? t('common:tree_form_dialog.yes', 'Yes')
                : t('common:tree_form_dialog.no', 'No')}
            </span>
          </div>
        );

      case 'string':
      default:
        if (fieldSchema.format === 'date') {
          return (
            <Input
              type="date"
              value={fieldValue || ''}
              onChange={(e) => handleItemFieldChange(itemIndex, fieldName, e.target.value)}
              className={cn(
                fieldError ? "border-red-500" : ""
              )}
            />
          );
        }
        return (
          <Input
            type="text"
            value={String(fieldValue ?? '')}
            onChange={(e) => handleItemFieldChange(itemIndex, fieldName, e.target.value)}
            className={cn(
              fieldError ? "border-red-500" : ""
            )}
            placeholder={fieldSchema.description || fieldSchema.title || fieldName}
            minLength={fieldSchema.minLength}
            maxLength={fieldSchema.maxLength}
          />
        );
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {(label || description) && (
        <div>
          {label && (
            <Label className="text-sm font-medium">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </Label>
          )}
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
      )}

      <div className="space-y-3">
        {value.length > 0 ? (
          value.map((item, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50 dark:bg-gray-800 space-y-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {label || t('workbench:object_array_input.item_fallback', 'Item')} {index + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem(index)}
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {itemSchema.properties && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(itemSchema.properties).map(([fieldName, fieldSchema]) => {
                    const fieldRequired = itemSchema.required?.includes(fieldName);
                    const fieldError = errors?.[index]?.[fieldName];

                    return (
                      <div key={fieldName} className="space-y-1">
                        <Label className="text-xs text-gray-600 dark:text-gray-400">
                          {fieldSchema.title || fieldName}
                          {fieldRequired && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        {renderField(item, index, fieldName, fieldSchema as JSONSchemaProperty)}
                        {fieldSchema.description && (
                          <p className="text-xs text-gray-400">{fieldSchema.description}</p>
                        )}
                        {fieldError && (
                          <p className="text-xs text-red-500">{fieldError}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg">
            {t('workbench:object_array_input.empty_hint', 'No items yet. Use the button below to add one.')}
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleAddItem}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        {t('workbench:object_array_input.add_label', 'Add {{label}}', {
          label: label || t('workbench:object_array_input.item_fallback', 'Item'),
        })}
      </Button>
    </div>
  );
};

