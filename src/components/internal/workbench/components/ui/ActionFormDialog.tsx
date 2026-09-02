import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button, MODAL_DIMENSIONS } from '@genispace/shared-ui';
import { ScrollArea } from '@genispace/shared-ui';
import { Loader2 } from 'lucide-react';
import { FormFieldRenderer, FormField } from '@/components/ui/FormFieldRenderer';
import { StructuredValueField } from '@/components/ui/StructuredValueField';
import { TableDataType, TableAction, type TableColumnType } from '@/types/renderers';
import { ParameterRecord } from '@/types/parameters';
import { evaluateComputedExpression } from '@/utils/expressionUtils';
import {
  resolveActionFieldValidation,
  validateActionForm,
  type ActionDatabaseValidationRule,
} from '@/utils/actionFormValidation';

const EMPTY_PAGE_PARAMS: ParameterRecord = {};
const EMPTY_FORM_FIELDS: FormField[] = [];
type StructuredFieldType = 'JSON' | 'ARRAY';
type StructuredFormField = FormField & {
  structuredFieldType?: StructuredFieldType;
  structuredItemTemplate?: Record<string, unknown>;
  structuredFieldLabels?: Record<string, string>;
};

export function serializeStructuredFormValue(
  value: unknown,
  fieldType?: string
): unknown {
  if (fieldType !== 'JSON' && fieldType !== 'ARRAY' && (typeof value !== 'object' || value === null)) {
    return value;
  }
  if (value === '' || value === null || value === undefined) return '';
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
}

export function parseStructuredFormValue(
  value: unknown,
  fieldType?: StructuredFieldType
): unknown {
  if (!fieldType || typeof value !== 'string' || value.trim() === '') return value;
  const parsed = JSON.parse(value);
  if (fieldType === 'ARRAY' && !Array.isArray(parsed)) {
    throw new TypeError('ARRAY_VALUE_REQUIRED');
  }
  return parsed;
}

function mergeFormFieldWithColumn(
  field: FormField,
  col: TableColumnType | undefined
): FormField {
  if (!col?.inputType) {
    return field;
  }
  const it = col.inputType;
  const out: FormField = { ...field };
  switch (it) {
    case 'text':
      out.type = 'input';
      delete out.dictionarySelectColumn;
      break;
    case 'number':
      out.type = 'number';
      delete out.dictionarySelectColumn;
      break;
    case 'color':
      out.type = 'color';
      delete out.dictionarySelectColumn;
      break;
    case 'date': {
      out.type = 'date';
      out.dateTimeMode =
        col.render?.type === 'yyyy-MM-dd HH:mm:ss' ? 'datetime' : 'date';
      delete out.dictionarySelectColumn;
      break;
    }
    case 'select': {
      out.type = 'select';
      delete out.selectDatasource;
      delete out.dictionarySelectColumn;
      if (col.dictionaryDataSource) {
        out.dictionarySelectColumn = {
          dataIndex: col.dataIndex,
          dictionaryDataSource: col.dictionaryDataSource,
        };
      } else if (col.datasource?.datasourceId) {
        out.selectDatasource = {
          datasourceId: col.datasource.datasourceId,
          version: col.datasource.version,
          valueField: col.datasource.valueField,
          labelField: col.datasource.labelField,
        };
      }
      if (out.dictionarySelectColumn || out.selectDatasource) {
        delete out.options;
      }
      break;
    }
    case 'switch': {
      out.type = 'switch';
      if (col.switchConfig) {
        out.switchConfig = { ...col.switchConfig };
      }
      delete out.dictionarySelectColumn;
      break;
    }
    case 'file':
      out.type = 'file';
      delete out.dictionarySelectColumn;
      break;
    default:
      break;
  }
  return out;
}

interface ActionFormDialogProps {
  isOpen: boolean;
  action: TableAction | null;
  record: TableDataType | null;
  pageParams?: ParameterRecord;
  onSubmit: (formData: ParameterRecord) => Promise<void>;
  onClose: () => void;
  loading?: boolean;

  tableColumns?: TableColumnType[];
}

export const ActionFormDialog: React.FC<ActionFormDialogProps> = ({
  isOpen,
  action,
  record,
  pageParams,
  onSubmit,
  onClose,
  loading = false,
  tableColumns,
}) => {
  const { t } = useTranslation('common');
  const resolvedPageParams = pageParams ?? EMPTY_PAGE_PARAMS;
  const [formData, setFormData] = useState<ParameterRecord>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formFields = useMemo((): FormField[] => {

    if (!isOpen) {
      return EMPTY_FORM_FIELDS;
    }

    if (!action || !record) {
      return EMPTY_FORM_FIELDS;
    }

    let updateFields: Record<string, any> = {};
    let currentConfig: any = null;

    if (action.type === 'updateDataset' && action.config.updateDataset) {
      updateFields = action.config.updateDataset.updateFields || {};
      currentConfig = action.config.updateDataset;
    } else if (action.type === 'insertDataset' && action.config.insertDataset) {
      updateFields = action.config.insertDataset.insertFields || {};
      currentConfig = action.config.insertDataset;
    } else if (action.type === 'updateDatabase' && action.config.updateDatabase) {
      updateFields = action.config.updateDatabase.updateFields || {};
      currentConfig = action.config.updateDatabase;
    } else if (action.type === 'insertDatabase' && action.config.insertDatabase) {
      updateFields = action.config.insertDatabase.insertFields || {};
      currentConfig = action.config.insertDatabase;
    } else if (action.type === 'transactionDatabase' && action.config.transactionDatabase) {
      updateFields = action.config.transactionDatabase.updateFields || {};
      currentConfig = action.config.transactionDatabase;
    } else if (action.type === 'deleteDatabase' && action.config.deleteDatabase) {

      updateFields = action.config.deleteDatabase.deleteConditions || {};
      currentConfig = action.config.deleteDatabase;
    }

    if (!currentConfig) {
      return [];
    }

    const fieldLabels = action.formOptions?.fieldLabels || {};
    const hiddenFields = action.formOptions?.hiddenFields || [];
    const allowEdit = action.formOptions?.allowEdit;

    const getFormFieldType = (fieldType?: string): FormField['type'] => {
      switch (fieldType) {
        case 'INT8':
        case 'INT16':
        case 'INT32':
        case 'INT64':
        case 'FLOAT':
        case 'DOUBLE':
          return 'number';
        case 'BOOL':
          return 'switch';
        case 'JSON':
        case 'ARRAY':
          return 'textarea';
        case 'DATE':
          return 'date';
        default:
          return 'input';
      }
    };

    const getFieldDefaultValue = (fieldConfig: any, fieldName: string): any => {
      switch (fieldConfig.source) {
        case 'display_only':

          return record[fieldName] ?? '';
        case 'input_field':

          const currentValue = record[fieldName];
          const defaultValue = fieldConfig.defaultValue;
          const finalValue = currentValue ?? defaultValue ?? '';

          return finalValue;
        case 'column':
          return record[fieldConfig.value] || '';
        case 'static':
          return fieldConfig.value || '';
        case 'parameter':
          return resolvedPageParams[fieldConfig.value] || '';
        case 'computed':
          try {
            return evaluateComputedExpression(String(fieldConfig.value ?? '')) || '';
          } catch (error) {
            console.warn('计算表达式执行失败:', error);
            return '';
          }
        default:
          return '';
      }
    };

    const shouldShowInForm = (fieldConfig: any): boolean => {

      return fieldConfig.source === 'input_field' || fieldConfig.source === 'display_only';
    };

    const isFieldReadonly = (fieldConfig: any): boolean => {

      return fieldConfig.source === 'display_only';
    };

    const fieldOrder = currentConfig.fieldOrder || Object.keys(updateFields);

    const orderedFieldEntries = fieldOrder
      .filter(fieldName => updateFields[fieldName])
      .map(fieldName => [fieldName, updateFields[fieldName]] as [string, any])
      .filter(([fieldName, fieldConfig]) => {
        const shouldShow = shouldShowInForm(fieldConfig);
        return shouldShow;
      });

    const fields = orderedFieldEntries.map(([fieldName, fieldConfig]): FormField => {

        const displayTitle = fieldConfig.title || fieldLabels[fieldName] || fieldName;
        const col = tableColumns?.find((c) => c.dataIndex === fieldName);
        
        const structuredFieldType =
          fieldConfig.fieldType === 'JSON' || fieldConfig.fieldType === 'ARRAY'
            ? fieldConfig.fieldType as StructuredFieldType
            : undefined;
        const field: StructuredFormField = {
          name: fieldName,
          label: displayTitle,
          type: getFormFieldType(fieldConfig.fieldType),
          required: fieldConfig.required || false,
          hidden: hiddenFields.includes(fieldName),
          readonly: isFieldReadonly(fieldConfig) || (allowEdit ? !allowEdit.includes(fieldName) : false),
          defaultValue: serializeStructuredFormValue(
            getFieldDefaultValue(fieldConfig, fieldName),
            structuredFieldType
          ),
          structuredFieldType,
          structuredItemTemplate: fieldConfig.itemTemplate,
          structuredFieldLabels: fieldConfig.itemLabels,
          placeholder: t('action_form_dialog.enter_field', 'Enter {{fieldName}}', { fieldName: displayTitle })
        };

        if (fieldConfig.options) {
          field.type = 'select';
          field.options = fieldConfig.options;
        }

        const dbValidation = currentConfig.validation as
          | Record<string, ActionDatabaseValidationRule>
          | undefined;
        const resolvedValidation = resolveActionFieldValidation(
          fieldName,
          fieldConfig,
          dbValidation
        );
        if (resolvedValidation) {
          field.validation = resolvedValidation;
        }

        return mergeFormFieldWithColumn(field, col);
      });

    if (action.formOptions?.fieldOrder) {
      const orderedFields: FormField[] = [];
      const fieldMap = new Map<string, FormField>(fields.map(field => [field.name, field]));

      action.formOptions.fieldOrder.forEach(fieldName => {
        const field = fieldMap.get(fieldName);
        if (field) {
          orderedFields.push(field);
          fieldMap.delete(fieldName);
        }
      });

      fieldMap.forEach(field => orderedFields.push(field));

      return orderedFields;
    }

    return fields;
  }, [action, record, resolvedPageParams, isOpen, tableColumns, t]);

  const formFieldsInitKey = useMemo(
    () =>
      isOpen && formFields.length > 0
        ? formFields.map((f) => `${f.name}:${String(f.defaultValue ?? '')}`).join('|')
        : '',
    [isOpen, formFields]
  );

  useEffect(() => {
    if (isOpen && formFieldsInitKey && action && record) {
      const initialData: ParameterRecord = {};
      formFields.forEach((field) => {
        initialData[field.name] = field.defaultValue;
      });
      const initialKey = JSON.stringify(initialData);
      setFormData((prev) => (JSON.stringify(prev) === initialKey ? prev : initialData));
      setValidationErrors((prev) => (Object.keys(prev).length === 0 ? prev : {}));
    } else if (!isOpen) {
      setFormData((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      setValidationErrors((prev) => (Object.keys(prev).length === 0 ? prev : {}));
    }
  }, [isOpen, formFieldsInitKey, action, record]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));

    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors = validateActionForm(formFields, formData, record, t);
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const parsedFormData: ParameterRecord = { ...formData };
    const structuredErrors: Record<string, string> = {};
    formFields.forEach((field) => {
      const structuredFieldType = (field as StructuredFormField).structuredFieldType;
      if (!structuredFieldType) return;
      try {
        parsedFormData[field.name] = parseStructuredFormValue(
          formData[field.name],
          structuredFieldType
        ) as ParameterRecord[string];
      } catch (error) {
        structuredErrors[field.name] =
          error instanceof TypeError && error.message === 'ARRAY_VALUE_REQUIRED'
            ? t('action_form_dialog.array_required', 'Enter a valid JSON array')
            : t('action_form_dialog.json_invalid', 'Enter valid JSON');
      }
    });
    if (Object.keys(structuredErrors).length > 0) {
      setValidationErrors((previous) => ({ ...previous, ...structuredErrors }));
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(parsedFormData);
    } catch (error) {
      console.error(t('action_form_dialog.submit_failed', 'Form submission failed:'), error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({});
    setValidationErrors({});
    onClose();
  };

  if (!action || !record) {
    return null;
  }

  const title = action.formOptions?.title || t('action_form_dialog.confirm_title', 'Confirm {{actionLabel}}', { actionLabel: action.label });
  const submitText = action.formOptions?.submitText || t('action_form_dialog.confirm_execute', 'Confirm Execute');
  const cancelText = action.formOptions?.cancelText || t('cancel', 'Cancel');

  const visibleFormFields = formFields.filter((field) => !field.hidden);
  const customDescription = action.formOptions?.description?.trim();
  const descriptionText =
    customDescription ||
    (visibleFormFields.length > 0
      ? t('action_form_dialog.description', 'Please fill in the following information to complete the operation')
      : null);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent style={{ maxWidth: MODAL_DIMENSIONS.md.width, maxHeight: MODAL_DIMENSIONS.md.maxHeight }} className="px-8 overflow-y-auto">
        <DialogHeader className="pb-6">
          <DialogTitle className="flex items-center space-x-2 text-lg font-semibold">
            <span>{title}</span>
            {(loading || isSubmitting) && (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            )}
          </DialogTitle>
          {descriptionText ? (
            <DialogDescription>{descriptionText}</DialogDescription>
          ) : null}
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-2 px-2">
            {visibleFormFields.length > 0 ? (
              visibleFormFields.map((field) => (
                (field as StructuredFormField).structuredFieldType ? (
                  <StructuredValueField
                    key={field.name}
                    id={field.name}
                    label={field.label}
                    value={formData[field.name]}
                    onChange={(value) => handleFieldChange(field.name, value)}
                    error={validationErrors[field.name]}
                    readonly={field.readonly}
                    required={field.required}
                    itemTemplate={
                      (field as StructuredFormField).structuredItemTemplate
                    }
                    fieldLabels={
                      (field as StructuredFormField).structuredFieldLabels
                    }
                  />
                ) : (
                  <FormFieldRenderer
                    key={field.name}
                    field={field}
                    value={formData[field.name]}
                    onChange={(value) => handleFieldChange(field.name, value)}
                    error={validationErrors[field.name]}
                  />
                )
                ))
            ) : null}
          </div>
        </ScrollArea>

        <DialogFooter className="flex justify-end space-x-3 pt-6 border-t border-neutral-200 dark:border-neutral-700 px-2">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={loading || isSubmitting}
            className="px-6"
          >
            {cancelText}
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading || isSubmitting}
            className="min-w-[100px] px-6"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {t('action_form_dialog.executing', 'Executing...')}
              </>
            ) : (
              submitText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ActionFormDialog;
