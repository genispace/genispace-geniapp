import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@genispace/shared-ui';
import { Textarea } from '@genispace/shared-ui';
import { Label } from '@genispace/shared-ui';
import { Switch } from '@genispace/shared-ui';
import {
  DialogSafeSelect as Select,
  DialogSafeSelectContent as SelectContent,
  DialogSafeSelectItem as SelectItem,
  DialogSafeSelectTrigger as SelectTrigger,
  DialogSafeSelectValue as SelectValue,
} from '@/ui/dialog-safe-select';
import { Calendar } from '@genispace/shared-ui';
import { Popover, PopoverContent, PopoverTrigger } from '@genispace/shared-ui';
import { Button } from '@genispace/shared-ui';
import { CalendarIcon, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import apiClient from '@/lib/api/apiClient';
import { withDatasourceVersion } from '@/app/services/workbenchApi';
import { resolveRuntimeDatasourceVersion } from '@/utils/datasourceVersion';
import {
  toNativeDateInputValue,
  fromNativeDateInputString,
} from '@/renderers/editable-table/editableTableFormatters';
import type { SwitchConfig, TableColumnType } from '@/types/renderers';
import {
  fetchDictionaryRows,
  getDictionarySelectStaticOptions,
} from '@/renderers/editable-table/editableTableDictionary';

const DIALOG_SAFE_SELECT_CONTENT_CLASS =
  'z-[10001] max-h-[min(16rem,70vh)] w-[var(--radix-select-trigger-width)]';

export interface FormField {
  name: string;
  label: string;
  type:
    | 'input'
    | 'textarea'
    | 'select'
    | 'date'
    | 'number'
    | 'switch'
    | 'password'
    | 'color'
    | 'file';
  required?: boolean;
  hidden?: boolean;
  readonly?: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: Array<{ text: string; value: string }>;

  dateTimeMode?: 'date' | 'datetime';

  switchConfig?: SwitchConfig;

  dictionarySelectColumn?: Pick<TableColumnType, 'dataIndex' | 'dictionaryDataSource'>;

  selectDatasource?: {
    datasourceId?: string;
    version?: number;
    valueField?: string;
    labelField?: string;
  };
  validation?: {
    min?: number;
    max?: number;
    minRef?: { source: 'field' | 'record'; key: string };
    maxRef?: { source: 'field' | 'record'; key: string };
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    message?: string;
  };
  help?: string;
}

interface FormFieldRendererProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

const SelectWithDatasource: React.FC<{
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  error?: boolean;
}> = ({ field, value, onChange, disabled, error }) => {
  const { t } = useTranslation('common');
  const ds = field.selectDatasource;
  const [options, setOptions] = useState<{ value: string; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ds?.datasourceId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const response = await apiClient.post(
          withDatasourceVersion(
            `/datasources/${ds.datasourceId}/data`,
            resolveRuntimeDatasourceVersion(ds.datasourceId, ds.version)
          ),
          {
          limit: 1000,
          offset: 0,
        });
        const responseData = response.data as { data?: { data?: unknown[] } };
        const rows = responseData?.data?.data || [];
        const vf = ds.valueField || 'id';
        const lf = ds.labelField || 'name';
        if (!cancelled && Array.isArray(rows)) {
          setOptions(
            rows.map((item: Record<string, unknown>) => ({
              value: String(item[vf] ?? ''),
              text: String(item[lf] ?? ''),
            }))
          );
        }
      } catch (e) {
        console.error('[FormFieldRenderer] select datasource load failed', e);
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ds?.datasourceId, ds?.version, ds?.valueField, ds?.labelField]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 h-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('form_field_renderer.loading_options', 'Loading options...')}
      </div>
    );
  }

  return (
    <Select
      value={value != null && value !== '' ? String(value) : ''}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger
        className={`h-10 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600 ${
          error ? 'border-red-500 focus:border-red-500' : 'focus:border-blue-500'
        }`}
      >
        <SelectValue placeholder={field.placeholder || t('form_field_renderer.select_placeholder', 'Please select')} />
      </SelectTrigger>
      <SelectContent className={DIALOG_SAFE_SELECT_CONTENT_CLASS}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

/** Same as EditableTable dictionary column: load all dictionary rows and build select options */
const SelectWithDictionaryColumn: React.FC<{
  field: FormField;
  column: NonNullable<FormField['dictionarySelectColumn']>;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  error?: boolean;
}> = ({ field, column, value, onChange, disabled, error }) => {
  const { t } = useTranslation('common');
  const [options, setOptions] = useState<{ value: string; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ds = column.dictionaryDataSource;
    if (!ds || ds.type !== 'database' || !ds.datasourceId) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await fetchDictionaryRows(ds);
        if (cancelled) return;
        const staticOpts = getDictionarySelectStaticOptions(column as TableColumnType, rows);
        setOptions(staticOpts.map((o) => ({ value: o.value, text: o.label })));
      } catch (e) {
        console.error('[FormFieldRenderer] dictionary select load failed', e);
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    column.dataIndex,
    column.dictionaryDataSource?.datasourceId,
    column.dictionaryDataSource?.type,
  ]);

  if (loading) {
    return (
      <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('form_field_renderer.loading_options', 'Loading options...')}
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <Input
        id={field.name}
        value={value != null && value !== '' ? String(value) : ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        disabled={disabled}
        className={`h-10 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600 ${
          error ? 'border-red-500' : ''
        }`}
      />
    );
  }

  return (
    <Select
      value={value != null && value !== '' ? String(value) : ''}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger
        className={`h-10 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600 ${
          error ? 'border-red-500 focus:border-red-500' : 'focus:border-blue-500'
        }`}
      >
        <SelectValue placeholder={field.placeholder || t('form_field_renderer.select_placeholder', 'Please select')} />
      </SelectTrigger>
      <SelectContent className={DIALOG_SAFE_SELECT_CONTENT_CLASS}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export const FormFieldRenderer: React.FC<FormFieldRendererProps> = ({
  field,
  value,
  onChange,
  error,
}) => {
  const { t } = useTranslation('common');

  if (field.hidden) {
    return null;
  }

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'));
    } else {
      onChange('');
    }
  };

  const handleSwitchChange = (checked: boolean) => {
    onChange(checked);
  };

  const getSwitchChecked = (v: unknown): boolean => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v === 1;
    if (typeof v === 'string') {
      const s = v.toLowerCase();
      return s === 'true' || s === '1' || s === 'on';
    }
    return false;
  };

  const renderField = () => {
    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            id={field.name}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={field.readonly}
            className={`resize-none min-h-[100px] bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600 ${
              error ? 'border-red-500 focus:border-red-500' : 'focus:border-blue-500'
            }`}
            rows={4}
          />
        );

      case 'select': {
        if (field.dictionarySelectColumn?.dictionaryDataSource) {
          return (
            <SelectWithDictionaryColumn
              field={field}
              column={field.dictionarySelectColumn}
              value={value}
              onChange={onChange}
              disabled={field.readonly}
              error={Boolean(error)}
            />
          );
        }
        if (field.selectDatasource?.datasourceId) {
          return (
            <SelectWithDatasource
              field={field}
              value={value}
              onChange={onChange}
              disabled={field.readonly}
              error={Boolean(error)}
            />
          );
        }
        if (field.options && field.options.length > 0) {
          return (
            <Select value={value ?? ''} onValueChange={onChange} disabled={field.readonly}>
              <SelectTrigger
                className={`h-10 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600 ${
                  error ? 'border-red-500 focus:border-red-500' : 'focus:border-blue-500'
                }`}
              >
                <SelectValue
                  placeholder={field.placeholder || t('form_field_renderer.select_placeholder', 'Please select')}
                />
              </SelectTrigger>
              <SelectContent className={DIALOG_SAFE_SELECT_CONTENT_CLASS}>
                {field.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        return (
          <Input
            id={field.name}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={field.readonly}
            className={`h-10 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600 ${
              error ? 'border-red-500' : ''
            }`}
          />
        );
      }

      case 'date': {
        if (field.dateTimeMode === 'datetime') {
          const inputVal = toNativeDateInputValue(value, 'datetime');
          return (
            <Input
              id={field.name}
              type="datetime-local"
              value={inputVal}
              onChange={(e) => {
                const s = fromNativeDateInputString(e.target.value, 'datetime');
                onChange(s);
              }}
              disabled={field.readonly}
              className={`h-10 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600 ${
                error ? 'border-red-500' : ''
              }`}
            />
          );
        }
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full justify-start text-left font-normal ${
                  !value && 'text-muted-foreground'
                } ${error ? 'border-red-500' : ''}`}
                disabled={field.readonly}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value
                  ? format(new Date(String(value)), 'yyyy-MM-dd', { locale: zhCN })
                  : field.placeholder || t('form_field_renderer.select_date', 'Select date')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={value ? new Date(String(value)) : undefined}
                onSelect={handleDateChange}
                initialFocus
                locale={zhCN}
              />
            </PopoverContent>
          </Popover>
        );
      }

      case 'number':
        return (
          <Input
            id={field.name}
            type="number"
            inputMode="decimal"
            step="any"
            value={value ?? ''}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '' || raw === '-') {
                onChange('');
                return;
              }
              const n = Number(raw);
              onChange(Number.isNaN(n) ? raw : n);
            }}
            placeholder={field.placeholder}
            disabled={field.readonly}
            min={field.validation?.min}
            max={field.validation?.max}
            className={`bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600 ${
              error ? 'border-red-500 focus:border-red-500' : ''
            }`}
          />
        );

      case 'switch': {
        const sc = field.switchConfig;
        const checked = getSwitchChecked(value);
        const onLabel = sc?.onText ?? t('form_field_renderer.switch_on', 'On');
        const offLabel = sc?.offText ?? t('form_field_renderer.switch_off', 'Off');
        if (sc?.showText) {
          return (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground tabular-nums min-w-[2.5rem]">
                {checked ? onLabel : offLabel}
              </span>
              <Switch
                id={field.name}
                checked={checked}
                onCheckedChange={handleSwitchChange}
                disabled={field.readonly}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          );
        }
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={field.name}
              checked={checked}
              onCheckedChange={handleSwitchChange}
              disabled={field.readonly}
            />
            <span className="text-sm text-muted-foreground">
              {checked ? t('form_field_renderer.switch_on', 'On') : t('form_field_renderer.switch_off', 'Off')}
            </span>
          </div>
        );
      }

      case 'color':
        return (
          <div className="flex items-center gap-2 w-full">
            <input
              type="color"
              value={value && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(String(value)) ? String(value) : '#000000'}
              onChange={(e) => onChange(e.target.value)}
              disabled={field.readonly}
              className="w-9 h-9 p-0 border border-neutral-300 dark:border-neutral-600 rounded cursor-pointer shrink-0"
            />
            <Input
              type="text"
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
              disabled={field.readonly}
              className={`flex-1 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600 ${
                error ? 'border-red-500' : ''
              }`}
            />
          </div>
        );

      case 'file':
        return (
          <Input
            id={field.name}
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              onChange(f ? f.name : '');
            }}
            disabled={field.readonly}
            className={`h-10 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600 cursor-pointer ${
              error ? 'border-red-500' : ''
            }`}
          />
        );

      case 'password':
        return (
          <Input
            id={field.name}
            type="password"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={field.readonly}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
            className={`h-10 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600 ${
              error ? 'border-red-500 focus:border-red-500' : 'focus:border-blue-500'
            }`}
          />
        );

      default:
        return (
          <Input
            id={field.name}
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={field.readonly}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
            pattern={field.validation?.pattern}
            className={`h-10 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600 ${
              error ? 'border-red-500 focus:border-red-500' : 'focus:border-blue-500'
            }`}
          />
        );
    }
  };

  return (
    <div className="space-y-3">
      <Label htmlFor={field.name} className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      <div className="relative">{renderField()}</div>

      {error && (
        <div className="flex items-center space-x-1 text-sm text-red-500">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}

      {field.help && !error && (
        <div className="text-xs text-neutral-500 dark:text-neutral-400">{field.help}</div>
      )}
    </div>
  );
};

export default FormFieldRenderer;
