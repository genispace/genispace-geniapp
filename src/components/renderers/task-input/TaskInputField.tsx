import React, { useMemo } from 'react';
import { X, FileText, Video, File as FileIcon, Code, Copy, Check, Loader2, Plus } from 'lucide-react';
import { Button } from '@genispace/shared-ui';
import { Input } from '@genispace/shared-ui';
import { Label } from '@genispace/shared-ui';
import { DialogSafeSelect as Select, DialogSafeSelectContent as SelectContent, DialogSafeSelectItem as SelectItem, DialogSafeSelectTrigger as SelectTrigger, DialogSafeSelectValue as SelectValue } from '@/ui/dialog-safe-select';
import { Switch } from '@genispace/shared-ui';
import { Textarea } from '@genispace/shared-ui';
import { cn } from '@genispace/shared-utils';
import { ArrayInput } from '@/inputs/ArrayInput';
import FileUploadDropzone from '../form/FileUploadDropzone';
import { useTranslation } from 'react-i18next';
import { useDatabaseDataSource } from '@/hooks/useDatabaseDataSource';
import type { DatabaseDataSourceConfig } from '@/types/databaseDataSource';

interface FileUploadValue {
  name: string;
  size: number;
  type: string;
  url: string;
  fileId: string;
  status: 'uploaded';
}

interface TaskInputParam {
  type: string;
  required: boolean;
  description: string;
  default?: unknown;
  enum?: unknown[];
  arrayType?: string;
  maxItems?: number;
  maxSize?: number;
  accept?: string;
}

export interface TaskInputFieldDataSourceConfig {
  datasourceId: string;
  valueField: string;
  labelField: string;
}

interface TaskInputFieldProps {
  fieldId: string;
  paramName: string;

  labelText?: string;
  paramSchema: TaskInputParam;
  value: unknown;
  isUploading?: { file: File; progress: number };
  arrayPreviews: Array<{ id: string; name: string; url: string; type: string; size: number }>;
  compact?: boolean;

  dataSourceConfig?: TaskInputFieldDataSourceConfig | null;

  dataSourceOptions?: Array<{ value: string; label: string }>;

  requiredOverride?: boolean;

  suppressSchemaHints?: boolean;
  onInputChange: (fieldId: string, value: unknown) => void;
  onFileUpload: (fieldId: string, file: File) => void;
  onArrayFileChange: (fieldId: string, files: FileList | null, arrayType: string, maxItems?: number, maxSize?: number) => void;
  onRemoveArrayFile: (fieldId: string, index: number) => void;
  onFormatJSON: (fieldId: string, value: unknown) => void;
  onCopyToClipboard: (fieldId: string, text: string) => void;
  isFormatting: Record<string, boolean>;
  copiedCode: Record<string, boolean>;
}

const TaskInputField: React.FC<TaskInputFieldProps> = ({
  fieldId,
  paramName,
  labelText,
  paramSchema,
  value,
  isUploading,
  arrayPreviews,
  compact = false,
  dataSourceConfig,
  dataSourceOptions: dataSourceOptionsProp,
  requiredOverride = false,
  suppressSchemaHints = false,
  onInputChange,
  onFileUpload,
  onArrayFileChange,
  onRemoveArrayFile,
  onFormatJSON,
  onCopyToClipboard,
  isFormatting,
  copiedCode
}) => {
  const { t } = useTranslation(['renderers', 'common']);
  const fieldSpacing = compact ? "space-y-1" : "space-y-2";
  const isRequired = paramSchema.required || requiredOverride;
  const hintPlaceholder = suppressSchemaHints ? undefined : paramSchema.description;
  const fieldLabel = useMemo(() => {
    const custom = labelText?.trim();
    if (custom) return custom;
    return paramSchema.description || paramName;
  }, [labelText, paramSchema.description, paramName]);

  const dbDataSourceConfig: DatabaseDataSourceConfig | null = useMemo(() => {
    if (!dataSourceConfig?.datasourceId || dataSourceOptionsProp !== undefined) return null;
    return {
      type: 'database-datasource',
      datasourceId: dataSourceConfig.datasourceId,
      parameters: {},
      outputFields: [dataSourceConfig.valueField, dataSourceConfig.labelField]
    };
  }, [dataSourceConfig, dataSourceOptionsProp]);

  const { data: dataSourceData } = useDatabaseDataSource(
    dbDataSourceConfig,
    'Table',
    {},
    { autoFetch: !!dbDataSourceConfig }
  );

  const internalDataSourceOptions = useMemo(() => {
    if (!dataSourceData || !Array.isArray(dataSourceData) || !dataSourceConfig) return [];
    const valueField = dataSourceConfig.valueField || 'value';
    const labelField = dataSourceConfig.labelField || 'label';
    return dataSourceData.map(item => ({
      value: String(item[valueField] ?? ''),
      label: String(item[labelField] ?? item[valueField] ?? '')
    })).filter(opt => opt.value !== '');
  }, [dataSourceData, dataSourceConfig]);

  const dataSourceOptions = dataSourceOptionsProp !== undefined ? dataSourceOptionsProp : internalDataSourceOptions;

  const renderAsDataSourceSelect = dataSourceConfig?.datasourceId && ['string', 'text', 'number'].includes(paramSchema.type);

  if (renderAsDataSourceSelect) {
    return (
      <div className={fieldSpacing}>
        <Label htmlFor={fieldId}>
          {fieldLabel}
          {isRequired && <span className="text-status-error ml-1">*</span>}
        </Label>
        <Select
          value={(value as string)?.toString() || ''}
          onValueChange={(v) => onInputChange(fieldId, v)}
        >
          <SelectTrigger id={fieldId} className={compact ? "h-8" : undefined}>
            <SelectValue placeholder={t('task_input.select_option', 'Please select an option')} />
          </SelectTrigger>
          <SelectContent>
            {dataSourceOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  switch (paramSchema.type) {
    case 'string':
    case 'text':
      return (
        <div className={fieldSpacing}>
          <Label htmlFor={fieldId}>
            {fieldLabel}
            {isRequired && <span className="text-status-error ml-1">*</span>}
          </Label>
          <Input
            id={fieldId}
            value={(value as string) || ''}
            onChange={(e) => onInputChange(fieldId, e.target.value)}
            placeholder={hintPlaceholder}
            className={compact ? "h-8" : undefined}
          />
        </div>
      );

    case 'number':
      return (
        <div className={fieldSpacing}>
          <Label htmlFor={fieldId}>
            {fieldLabel}
            {isRequired && <span className="text-status-error ml-1">*</span>}
          </Label>
          <Input
            id={fieldId}
            type="number"
            value={value === null || value === undefined ? '' : (value as number)}
            onChange={(e) => {
              const nextValue = e.target.valueAsNumber;
              onInputChange(fieldId, Number.isNaN(nextValue) ? null : nextValue);
            }}
            placeholder={hintPlaceholder}
            className={compact ? "h-8" : undefined}
          />
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center space-x-2">
          <Switch
            id={fieldId}
            checked={Boolean(value)}
            onCheckedChange={(checked) => onInputChange(fieldId, checked)}
          />
          <Label htmlFor={fieldId}>{fieldLabel}</Label>
        </div>
      );

    case 'json':
      return (
        <div className={fieldSpacing}>
          <Label htmlFor={fieldId}>
            {fieldLabel}
            {isRequired && <span className="text-status-error ml-1">*</span>}
          </Label>
          <div className="relative">
            <Textarea
              id={fieldId}
              value={(value as string) || ''}
              onChange={(e) => onInputChange(fieldId, e.target.value)}
              placeholder={suppressSchemaHints ? '{"key": "value"}' : (paramSchema.description || '{"key": "value"}')}
              className={cn("font-mono text-sm pr-16", compact ? "min-h-[60px]" : "min-h-[120px]")}
            />
            <div className="absolute top-2 right-2 flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onFormatJSON(fieldId, value)}
                className="h-7 w-7 p-0"
                disabled={isFormatting[fieldId]}
                title={t('task_input.format_json', 'Format JSON')}
              >
                {isFormatting[fieldId] ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Code className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onCopyToClipboard(fieldId, (value as string) || '{}')}
                className="h-7 w-7 p-0"
                title={t('task_input.copy', 'Copy')}
              >
                {copiedCode[fieldId] ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          {!suppressSchemaHints && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {t('task_input.enter_valid_json', 'Please enter a valid JSON object')}
            </p>
          )}
        </div>
      );

    case 'array':

      if (paramSchema.arrayType && ['file', 'image', 'video', 'document'].includes(paramSchema.arrayType)) {
        const arrayType = paramSchema.arrayType;
        const currentValue = (value as unknown[]) || [];

        return (
          <div className={fieldSpacing}>
            <Label htmlFor={fieldId}>
              {fieldLabel}
              {isRequired && <span className="text-status-error ml-1">*</span>}
            </Label>
            <div className="space-y-3">
              {currentValue.length > 0 && (
                <div className="space-y-2">
                  {arrayPreviews.map((preview, index) => (
                    <div key={preview.id || index} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card">
                      {arrayType === 'image' && (
                        <div className="relative h-16 w-16 rounded-md overflow-hidden flex-shrink-0 border border-border">
                          <img src={preview.url} alt={preview.name} className="h-full w-full object-cover" />
                        </div>
                      )}

                      {arrayType === 'video' && (
                        <div className="flex-shrink-0 w-16 h-16 rounded-md bg-muted flex items-center justify-center border border-border">
                          <Video className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      {arrayType === 'document' && (
                        <div className="flex-shrink-0 w-16 h-16 rounded-md bg-muted flex items-center justify-center border border-border">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      {arrayType === 'file' && (
                        <div className="flex-shrink-0 w-16 h-16 rounded-md bg-muted flex items-center justify-center border border-border">
                          <FileIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{preview.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {preview.size ? `${(preview.size / 1024 / 1024).toFixed(2)} MB` : ''}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveArrayFile(fieldId, index)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {(!paramSchema.maxItems || currentValue.length < paramSchema.maxItems) && (
                <div
                  className={cn(
                    'rounded-lg border-2 border-dashed p-6 transition-colors',
                    'border-neutral-300 bg-neutral-50/80 dark:border-neutral-600 dark:bg-neutral-900/40',
                    'hover:border-neutral-400 hover:bg-neutral-100/90 dark:hover:border-neutral-500 dark:hover:bg-neutral-800/55'
                  )}
                >
                  <div className="flex items-center justify-center">
                    <input
                      type="file"
                      accept={paramSchema.accept}
                      multiple
                      onChange={(e) => onArrayFileChange(fieldId, e.target.files, arrayType, paramSchema.maxItems, paramSchema.maxSize)}
                      className="hidden"
                      id={`${fieldId}-array-input`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById(`${fieldId}-array-input`)?.click()}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      {t('task_input.add_file', 'Add file')}
                    </Button>
                  </div>
                  {(paramSchema.maxSize || paramSchema.maxItems) && (
                    <div className="mt-2 space-y-0.5 text-center">
                      {paramSchema.maxSize && (
                        <p className="text-xs text-muted-foreground">
                          {t('task_input.file_size_limit', 'File size limit')}: {paramSchema.maxSize}MB
                        </p>
                      )}
                      {paramSchema.maxItems && (
                        <p className="text-xs text-muted-foreground">
                          {t('task_input.max_files', 'Maximum {{count}} files', { count: paramSchema.maxItems })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      } else {

        let arrayValue: string[] = [];
        if (Array.isArray(value)) {
          arrayValue = value.map(String);
        } else if (typeof value === 'string' && value.trim()) {
          try {
            const parsed = JSON.parse(value);
            arrayValue = Array.isArray(parsed) ? parsed.map(String) : [];
          } catch {
            arrayValue = [];
          }
        }

        return (
          <div className={fieldSpacing}>
            <Label htmlFor={fieldId}>
              {fieldLabel}
              {isRequired && <span className="text-status-error ml-1">*</span>}
            </Label>
            <ArrayInput
              value={arrayValue}
              onChange={(newValues) => onInputChange(fieldId, newValues)}
              placeholder={suppressSchemaHints ? t('task_input.item', 'Item') : (paramSchema.description || t('task_input.item', 'Item'))}
              maxItems={paramSchema.maxItems}
              emptyMessage={t('task_input.no_items', 'No items, click the button below to add')}
              addButtonLabel={t('task_input.add_item', 'Add item')}
              inputClassName={cn("w-full", compact ? "h-8 py-1" : "py-2")}
            />
          </div>
        );
      }

    case 'image':
    case 'video':
    case 'document':
    case 'file':
      return (
        <div className={fieldSpacing}>
          <Label htmlFor={fieldId}>
            {fieldLabel}
            {isRequired && <span className="text-status-error ml-1">*</span>}
          </Label>
          <FileUploadDropzone
            fieldId={fieldId}
            value={value as FileUploadValue | null}
            isUploading={isUploading}
            accept={paramSchema.accept ? { [paramSchema.accept]: [] } : {
              'application/pdf': ['.pdf'],
              'application/msword': ['.doc'],
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
              'text/plain': ['.txt'],
              'application/vnd.ms-excel': ['.xls'],
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
              'image/jpeg': ['.jpg', '.jpeg'],
              'image/png': ['.png'],
              'image/gif': ['.gif'],
              'image/bmp': ['.bmp'],
              'image/tiff': ['.tiff'],
              'image/webp': ['.webp']
            }}
            description={
              suppressSchemaHints
                ? undefined
                : paramSchema.description || t('task_input.file_format_description', 'Supports PDF, Word, Excel and other document formats, JPEG, PNG, GIF and other image formats (with OCR text recognition support)')
            }
            onUpload={onFileUpload}
            onRemove={(fieldId) => onInputChange(fieldId, null)}
          />
        </div>
      );

    default:
      if (paramSchema.enum) {
        return (
          <div className={fieldSpacing}>
            <Label htmlFor={fieldId}>
              {fieldLabel}
              {isRequired && <span className="text-status-error ml-1">*</span>}
            </Label>
            <Select
              value={(value as string)?.toString() || ''}
              onValueChange={(value) => onInputChange(fieldId, value)}
            >
              <SelectTrigger id={fieldId} className={compact ? "h-8" : undefined}>
                <SelectValue placeholder={t('task_input.select_option', 'Please select an option')} />
              </SelectTrigger>
              <SelectContent>
                {paramSchema.enum.filter((option: unknown) => String(option) !== '').map((option: unknown) => (
                  <SelectItem key={String(option)} value={String(option)}>
                    {String(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      }

      return (
        <div className={fieldSpacing}>
          <Label htmlFor={fieldId}>
            {fieldLabel}
            {isRequired && <span className="text-status-error ml-1">*</span>}
          </Label>
          <Textarea
            id={fieldId}
            value={(value as string) || ''}
            onChange={(e) => onInputChange(fieldId, e.target.value)}
            placeholder={hintPlaceholder}
            className={compact ? "min-h-[60px]" : undefined}
          />
        </div>
      );
  }
};

export default TaskInputField;
