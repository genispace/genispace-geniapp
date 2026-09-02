import React, { useState } from 'react';
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, Button, Calendar, Popover, PopoverContent, PopoverTrigger } from '@genispace/shared-ui';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@genispace/shared-utils';
import { JSONSchema, JSONSchemaProperty } from '@genispace/shared-types';
import { ArrayInput } from '@/inputs/ArrayInput';
import { ObjectArrayInput } from '@/inputs/ObjectArrayInput';

interface SimpleSchemaFormProps {
  schema: JSONSchema | null;
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  errors?: Record<string, string | Record<number, Record<string, string>>>;
  className?: string;
}

export const SimpleSchemaForm: React.FC<SimpleSchemaFormProps> = ({
  schema,
  values,
  onChange,
  errors = {},
  className = ''
}) => {
  if (!schema || !schema.properties) {
    return <div className="text-center py-8 text-gray-500">No schema available</div>;
  }

  const renderField = (name: string, fieldSchema: JSONSchemaProperty) => {
    const value = values[name];
    const error = errors[name];
    const isRequired = schema?.required?.includes(name);

    let inputComponent: React.ReactNode;

    if (fieldSchema.enum) {
      inputComponent = (
        <Select value={String(value || '')} onValueChange={(newValue) => onChange({ ...values, [name]: newValue })}>
          <SelectTrigger className={error ? 'border-red-500' : ''}>
            <SelectValue placeholder="Please select..." />
          </SelectTrigger>
          <SelectContent>
            {fieldSchema.enum.map((option: any) => (
              <SelectItem key={String(option)} value={String(option)}>
                {String(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    } else if (fieldSchema.type === 'boolean') {
      inputComponent = (
        <div className="flex items-center space-x-2">
          <Switch
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange({ ...values, [name]: checked })}
          />
          <span className="text-sm text-muted-foreground">
            {value ? 'Yes' : 'No'}
          </span>
        </div>
      );
    } else if (fieldSchema.type === 'number' || fieldSchema.type === 'integer') {
      inputComponent = (
        <Input
          type="number"
          value={String(value ?? '')}
          onChange={(e) => {
            const inputValue = e.target.value;
            if (inputValue === '') {
              onChange({ ...values, [name]: '' });
            } else {
              const numValue = fieldSchema.type === 'integer' ? parseInt(inputValue, 10) : parseFloat(inputValue);
              if (!isNaN(numValue)) {
                onChange({ ...values, [name]: numValue });
              }
            }
          }}
          min={fieldSchema.minimum}
          max={fieldSchema.maximum}
          className={error ? 'border-red-500' : ''}
        />
      );
    } else if (fieldSchema.type === 'array') {
      const itemType = fieldSchema.items?.type;
      const currentArray = Array.isArray(value) ? value : [];

      const itemsSchema = fieldSchema.items;
      const isObjectArray = itemType === 'object' && 
        itemsSchema && 
        typeof itemsSchema === 'object' && 
        'properties' in itemsSchema &&
        itemsSchema.properties;

      if (isObjectArray) {

        let arrayErrors: Record<number, Record<string, string>> = {};
        if (error) {
          if (typeof error === 'string') {

            arrayErrors[0] = { _general: error };
          } else if (typeof error === 'object') {

            arrayErrors = error as Record<number, Record<string, string>>;
          }
        }

        inputComponent = (
          <ObjectArrayInput
            value={currentArray}
            onChange={(newValues) => onChange({ ...values, [name]: newValues })}
            itemSchema={itemsSchema as JSONSchemaProperty}
            label={fieldSchema.title}
            description={fieldSchema.description}
            required={isRequired}
            errors={arrayErrors}
          />
        );
      } else {

        const arrayValue = currentArray.map(String);
        inputComponent = (
          <ArrayInput
            value={arrayValue}
            onChange={(newValues) => {

              if (itemType === 'number' || itemType === 'integer') {
                const converted = newValues.map(v => {
                  const num = itemType === 'integer' ? parseInt(v, 10) : parseFloat(v);
                  return isNaN(num) ? 0 : num;
                });
                onChange({ ...values, [name]: converted });
              } else if (itemType === 'boolean') {
                const converted = newValues.map(v => v === 'true' || v === '1');
                onChange({ ...values, [name]: converted });
              } else {
                onChange({ ...values, [name]: newValues });
              }
            }}
            placeholder={fieldSchema.description || `Enter ${fieldSchema.title || name}`}
            maxItems={typeof fieldSchema.maxItems === 'number' ? fieldSchema.maxItems : undefined}
            className={error ? 'border-red-500' : ''}
          />
        );
      }
    } else if (fieldSchema.type === 'object') {
      inputComponent = (
        <div className="space-y-2">
          <textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : ''}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange({ ...values, [name]: parsed });
              } catch {
                // Keep original value
              }
            }}
            className={`w-full min-h-[100px] p-2 border rounded ${error ? 'border-red-500' : ''}`}
            placeholder="Enter JSON object format"
          />
          <p className="text-xs text-gray-500">Enter JSON object format</p>
        </div>
      );
    } else if (fieldSchema.format === 'date') {

      let dateValue: Date | undefined = undefined;
      if (value) {
        if (value instanceof Date) {
          dateValue = value;
        } else if (typeof value === 'string') {

          const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (match) {
            const [, year, month, day] = match;

            dateValue = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else {

            const parsedDate = new Date(value);
            if (!isNaN(parsedDate.getTime())) {
              dateValue = parsedDate;
            }
          }
        }
      }

      const DatePickerField = () => {
        const [open, setOpen] = useState(false);

        const handleSelect = (date: Date | undefined) => {
          if (date) {

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;
            onChange({ ...values, [name]: dateString });

            setOpen(false);
          } else {
            onChange({ ...values, [name]: '' });
          }
        };

        return (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateValue && "text-muted-foreground",
                  error && "border-red-500"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue ? format(dateValue, "yyyy-MM-dd", { locale: zhCN }) : (fieldSchema.description || `Select ${fieldSchema.title || name}`)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={handleSelect}
                initialFocus
                locale={zhCN}
              />
            </PopoverContent>
          </Popover>
        );
      };

      inputComponent = <DatePickerField />;
    } else {
      inputComponent = (
        <Input
          type={fieldSchema.format === 'email' ? 'email' : 'text'}
          value={String(value ?? '')}
          onChange={(e) => onChange({ ...values, [name]: e.target.value })}
          placeholder={fieldSchema.description || `Enter ${fieldSchema.title || name}`}
          minLength={fieldSchema.minLength}
          maxLength={fieldSchema.maxLength}
          className={error ? 'border-red-500' : ''}
        />
      );
    }

    return (
      <div key={name} className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">
            {fieldSchema.title || name}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            {fieldSchema.type}
          </span>
        </div>
        {inputComponent}
        {fieldSchema.description && (
          <p className="text-xs text-gray-500">{fieldSchema.description}</p>
        )}
        {typeof error === 'string' && (
          <p className="text-xs text-red-500">{error}</p>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {Object.entries(schema.properties).map(([name, fieldSchema]) =>
        renderField(name, fieldSchema)
      )}
    </div>
  );
};
