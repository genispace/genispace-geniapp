import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Label, Textarea } from '@genispace/shared-ui';
import { Plus, Trash2 } from 'lucide-react';

type JsonObject = Record<string, unknown>;

interface StructuredValueFieldProps {
  id: string;
  label: string;
  value: unknown;
  onChange: (value: string) => void;
  error?: string;
  readonly?: boolean;
  required?: boolean;
  itemTemplate?: JsonObject;
  fieldLabels?: Record<string, string>;
}

function parseValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function humanizeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function emptyLike(value: unknown): unknown {
  if (Array.isArray(value)) return [];
  if (typeof value === 'boolean') return false;
  if (typeof value === 'number') return 0;
  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, emptyLike(nestedValue)])
    );
  }
  return '';
}

export const StructuredValueField: React.FC<StructuredValueFieldProps> = ({
  id,
  label,
  value,
  onChange,
  error,
  readonly,
  required,
  itemTemplate,
  fieldLabels,
}) => {
  const { t } = useTranslation('common');
  const parsed = useMemo(() => parseValue(value), [value]);

  const commit = (nextValue: unknown) => {
    onChange(JSON.stringify(nextValue, null, 2));
  };

  const renderObjectField = (
    item: JsonObject,
    fieldName: string,
    update: (nextValue: unknown) => void,
    path: string
  ) => {
    const fieldValue = item[fieldName];
    const fieldId = `${id}-${path}-${fieldName}`;

    if (Array.isArray(fieldValue) && fieldValue.every((entry) => !isObject(entry))) {
      return (
        <Textarea
          id={fieldId}
          value={fieldValue.join('\n')}
          onChange={(event) =>
            update(
              event.target.value
                .split('\n')
                .map((entry) => entry.trim())
                .filter(Boolean)
            )
          }
          disabled={readonly}
          rows={3}
          placeholder={t(
            'structured_value.one_per_line',
            'Enter one item per line'
          )}
        />
      );
    }

    if (typeof fieldValue === 'boolean') {
      return (
        <input
          id={fieldId}
          type="checkbox"
          checked={fieldValue}
          onChange={(event) => update(event.target.checked)}
          disabled={readonly}
          className="h-4 w-4 rounded border-neutral-300"
        />
      );
    }

    if (isObject(fieldValue) || Array.isArray(fieldValue)) {
      return (
        <Textarea
          id={fieldId}
          value={JSON.stringify(fieldValue, null, 2)}
          onChange={(event) => {
            try {
              update(JSON.parse(event.target.value));
            } catch {
              // Keep the last valid nested value until the user finishes editing.
            }
          }}
          disabled={readonly}
          rows={4}
        />
      );
    }

    return (
      <Input
        id={fieldId}
        type={typeof fieldValue === 'number' ? 'number' : 'text'}
        value={fieldValue == null ? '' : String(fieldValue)}
        onChange={(event) =>
          update(
            typeof fieldValue === 'number'
              ? Number(event.target.value)
              : event.target.value
          )
        }
        disabled={readonly}
      />
    );
  };

  const renderObject = (
    item: JsonObject,
    updateItem: (nextItem: JsonObject) => void,
    path: string
  ) => (
    <div className="grid gap-4 sm:grid-cols-2">
      {Object.keys(item).map((fieldName) => (
        <div
          key={fieldName}
          className={
            Array.isArray(item[fieldName]) || isObject(item[fieldName])
              ? 'space-y-2 sm:col-span-2'
              : 'space-y-2'
          }
        >
          <Label htmlFor={`${id}-${path}-${fieldName}`}>
            {fieldLabels?.[fieldName] ?? humanizeKey(fieldName)}
          </Label>
          {renderObjectField(
            item,
            fieldName,
            (nextValue) => updateItem({ ...item, [fieldName]: nextValue }),
            path
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </Label>

      {Array.isArray(parsed) && parsed.every(isObject) ? (
        <div className="space-y-3">
          {parsed.map((item, index) => (
            <div
              key={index}
              className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-4 dark:border-neutral-700 dark:bg-neutral-900/40"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  {t('structured_value.item', 'Item {{number}}', {
                    number: index + 1,
                  })}
                </span>
                {!readonly ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={t('structured_value.remove_item', 'Remove item')}
                    onClick={() =>
                      commit(parsed.filter((_, itemIndex) => itemIndex !== index))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
              {renderObject(
                item,
                (nextItem) =>
                  commit(
                    parsed.map((currentItem, itemIndex) =>
                      itemIndex === index ? nextItem : currentItem
                    )
                  ),
                String(index)
              )}
            </div>
          ))}

          {!readonly && (parsed.length > 0 || itemTemplate) ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                commit([
                  ...parsed,
                  emptyLike(parsed[0] ?? itemTemplate ?? {}),
                ])
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('structured_value.add_item', 'Add item')}
            </Button>
          ) : null}

          {parsed.length === 0 && !itemTemplate ? (
            <p className="rounded-md border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-700">
              {t(
                'structured_value.empty_schema',
                'No items are available yet. Configure field structure before adding the first item.'
              )}
            </p>
          ) : null}
        </div>
      ) : isObject(parsed) ? (
        renderObject(parsed, commit, 'object')
      ) : (
        <Textarea
          id={id}
          value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          onChange={(event) => onChange(event.target.value)}
          disabled={readonly}
          rows={6}
          aria-invalid={Boolean(error)}
        />
      )}

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
};
