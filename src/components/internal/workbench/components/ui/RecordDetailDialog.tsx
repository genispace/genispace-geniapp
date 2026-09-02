import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, MODAL_DIMENSIONS, ScrollArea } from '@genispace/shared-ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { TableDataType, TableRendererProps } from '@/types/renderers';

type RecordInteraction = NonNullable<TableRendererProps['recordInteraction']>;

interface RecordDetailDialogProps {
  open: boolean;
  record: TableDataType | null;
  config: RecordInteraction;
  onClose: () => void;
  onEdit?: () => void;
}

const humanizeKey = (key: string) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());

type StructuredLabelResolver = (key: string) => string;
const renderStructuredValue = (
  value: unknown,
  resolveLabel: StructuredLabelResolver
): React.ReactNode => {
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    if (value.every((item) => item === null || typeof item !== 'object')) {
      return (
        <ul className="list-disc space-y-1 pl-5">
          {value.map((item, index) => <li key={index}>{String(item ?? '—')}</li>)}
        </ul>
      );
    }
    return (
      <div className="space-y-3">
        {value.map((item, index) => (
          <div key={index} className="rounded-lg border bg-muted/20 p-3">
            {item && typeof item === 'object' && !Array.isArray(item) ? (
              <dl className="grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
                {Object.entries(item as Record<string, unknown>).map(([key, nestedValue]) => (
                  <div
                    key={key}
                    className={Array.isArray(nestedValue) || (nestedValue !== null && typeof nestedValue === 'object')
                      ? 'sm:col-span-2'
                      : undefined}
                  >
                    <dt className="text-[11px] font-medium text-muted-foreground">{resolveLabel(key)}</dt>
                    <dd className="mt-0.5 text-sm">{renderStructuredValue(nestedValue, resolveLabel)}</dd>
                  </div>
                ))}
              </dl>
            ) : renderStructuredValue(item, resolveLabel)}
          </div>
        ))}
      </div>
    );
  }
  if (value !== null && typeof value === 'object') {
    return (
      <dl className="grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
        {Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => (
          <div key={key}>
            <dt className="text-[11px] font-medium text-muted-foreground">{resolveLabel(key)}</dt>
            <dd className="mt-0.5">{renderStructuredValue(nestedValue, resolveLabel)}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return <span className="whitespace-pre-wrap break-words">{String(value ?? '—')}</span>;
};

export const formatRecordDetailValue = (
  value: unknown,
  format: NonNullable<RecordInteraction['fields']>[number]['format'],
  resolveLabel: StructuredLabelResolver = humanizeKey
): React.ReactNode => {
  if (value === null || value === undefined || value === '') return '—';
  if (format === 'json' || (typeof value === 'object' && value !== null)) {
    if (typeof value === 'string') {
      try {
        return renderStructuredValue(JSON.parse(value), resolveLabel);
      } catch {
        return <span className="whitespace-pre-wrap break-words">{value}</span>;
      }
    }
    return renderStructuredValue(value, resolveLabel);
  }
  if (format === 'number' && typeof value === 'number') return value.toLocaleString();
  if (format === 'date' || format === 'datetime') {
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) {
      return format === 'date' ? date.toLocaleDateString() : date.toLocaleString();
    }
  }
  return <span className={format === 'multiline' ? 'whitespace-pre-wrap break-words' : 'break-words'}>{String(value)}</span>;
};

export const RecordDetailDialog: React.FC<RecordDetailDialogProps> = ({
  open,
  record,
  config,
  onClose,
  onEdit,
}) => {
  const { t } = useTranslation('common');
  const visibleFields = useMemo(
    () => (config.fields || []).filter((field) => !field.hidden),
    [config.fields]
  );
  const fieldMap = useMemo(
    () => new Map(visibleFields.map((field) => [field.name, field])),
    [visibleFields]
  );
  const sections = config.sections?.length
    ? config.sections
    : [{ id: 'record', fields: visibleFields.map((field) => field.name) }];

  if (!record) return null;

  const titleField = config.titleField || visibleFields[0]?.name;
  const title = titleField
    ? String(record[titleField] ?? t('record_detail.title', 'Record details'))
    : t('record_detail.title', 'Record details');
  const subtitle = (config.subtitleFields || [])
    .map((field) => record[field])
    .filter((value) => value !== null && value !== undefined && value !== '')
    .join(' · ');

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) onClose();
    }}>
      <DialogContent
        style={{ maxWidth: MODAL_DIMENSIONS.lg.width, maxHeight: MODAL_DIMENSIONS.lg.maxHeight }}
        className="flex flex-col overflow-hidden px-8"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitle ? <DialogDescription>{subtitle}</DialogDescription> : null}
        </DialogHeader>
        <ScrollArea className="min-h-0 flex-1 pr-4">
          <div className="space-y-6 py-2">
            {sections.map((section) => {
              const fields = section.fields
                .map((name) => fieldMap.get(name))
                .filter((field): field is NonNullable<typeof field> => Boolean(field));
              if (fields.length === 0) return null;
              return (
                <section key={section.id} className="space-y-3">
                  {section.title ? (
                    <h3 className="border-b pb-2 text-sm font-semibold text-foreground">{section.title}</h3>
                  ) : null}
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                    {fields.map((field) => (
                      <div key={field.name} className={field.format === 'json' || field.format === 'multiline' ? 'md:col-span-2' : undefined}>
                        <dt className="mb-1 text-xs font-medium text-muted-foreground">{field.label || field.name}</dt>
                        <dd className="text-sm text-foreground">
                          {formatRecordDetailValue(
                            record[field.name],
                            field.format || 'text',
                            (key) => field.nestedFieldLabels?.[key] ?? humanizeKey(key)
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              );
            })}
          </div>
        </ScrollArea>
        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>{t('record_detail.close', 'Close')}</Button>
          {config.edit?.enabled && config.edit.action && onEdit ? (
            <Button onClick={onEdit}>{t('record_detail.edit', 'Edit')}</Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
