import type { FormField } from '@/ui/FormFieldRenderer';
import type { TableDataType } from '@/types/renderers';

/** Reference another field or a record value as the min/max bound */
export interface ActionFieldValidationRef {
  source: 'field' | 'record';
  key: string;
}

export interface ActionFieldValidation {
  min?: number;
  max?: number;
  minRef?: ActionFieldValidationRef;
  maxRef?: ActionFieldValidationRef;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  message?: string;
}

/** Range rule from transactionDatabase.validation, keyed by field name */
export interface ActionDatabaseValidationRule {
  type?: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'range' | 'custom';
  min?: number;
  max?: number;
  minRef?: ActionFieldValidationRef;
  maxRef?: ActionFieldValidationRef;
  value?: unknown;
  message?: string;
}

function coerceNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function resolveRefValue(
  ref: ActionFieldValidationRef | undefined,
  formData: Record<string, unknown>,
  record: TableDataType | null
): number | null {
  if (!ref?.key) return null;
  const raw =
    ref.source === 'record'
      ? record?.[ref.key]
      : formData[ref.key];
  return coerceNumber(raw);
}

/** Merge updateFields[].validation with transactionDatabase.validation */
export function resolveActionFieldValidation(
  fieldName: string,
  fieldConfig: { validation?: ActionFieldValidation } | undefined,
  databaseValidation: Record<string, ActionDatabaseValidationRule> | undefined
): FormField['validation'] | undefined {
  const fromField = fieldConfig?.validation;
  const fromDb = databaseValidation?.[fieldName];

  if (!fromField && !fromDb) {
    return undefined;
  }

  const merged: ActionFieldValidation = {
    ...(fromDb?.type === 'range' || fromDb?.min !== undefined || fromDb?.max !== undefined
      ? {
          min: fromDb.min,
          max: fromDb.max,
          minRef: fromDb.minRef,
          maxRef: fromDb.maxRef,
          message: fromDb.message,
        }
      : {}),
    ...fromField,
  };

  if (
    merged.min === undefined &&
    merged.max === undefined &&
    !merged.minRef &&
    !merged.maxRef &&
    merged.minLength === undefined &&
    merged.maxLength === undefined &&
    !merged.pattern
  ) {
    return undefined;
  }

  return {
    min: merged.min,
    max: merged.max,
    minLength: merged.minLength,
    maxLength: merged.maxLength,
    pattern: merged.pattern,
    message: merged.message,
    ...(merged.minRef ? { minRef: merged.minRef } : {}),
    ...(merged.maxRef ? { maxRef: merged.maxRef } : {}),
  } as FormField['validation'];
}

export function validateActionFormField(
  field: FormField,
  value: unknown,
  formData: Record<string, unknown>,
  record: TableDataType | null,
  t: (key: string, defaultValue: string, opts?: Record<string, unknown>) => string
): string | null {
  if (field.required) {
    const isEmpty =
      value === undefined ||
      value === null ||
      value === '' ||
      (typeof value === 'string' && value.trim() === '');
    if (isEmpty) {
      return t('action_form_dialog.field_required', '{{fieldName}} is required', {
        fieldName: field.label,
      });
    }
  }

  const validation = field.validation as (FormField['validation'] & {
    minRef?: ActionFieldValidationRef;
    maxRef?: ActionFieldValidationRef;
  }) | undefined;

  if (!validation) {
    return null;
  }

  const { minLength, maxLength, pattern, message } = validation;

  if (typeof value === 'string') {
    if (minLength !== undefined && value.length < minLength) {
      return (
        message ||
        t('action_form_dialog.min_length', '{{fieldName}} must be at least {{minLength}} characters', {
          fieldName: field.label,
          minLength,
        })
      );
    }
    if (maxLength !== undefined && value.length > maxLength) {
      return (
        message ||
        t('action_form_dialog.max_length', '{{fieldName}} cannot exceed {{maxLength}} characters', {
          fieldName: field.label,
          maxLength,
        })
      );
    }
    if (pattern && !new RegExp(pattern).test(value)) {
      return (
        message ||
        t('action_form_dialog.invalid_format', '{{fieldName}} format is incorrect', {
          fieldName: field.label,
        })
      );
    }
  }

  const num = coerceNumber(value);
  if (num !== null) {
    const minBound =
      validation.minRef !== undefined
        ? resolveRefValue(validation.minRef, formData, record)
        : validation.min;
    const maxBound =
      validation.maxRef !== undefined
        ? resolveRefValue(validation.maxRef, formData, record)
        : validation.max;

    if (minBound !== undefined && minBound !== null && num < minBound) {
      return (
        message ||
        t('action_form_dialog.min_value', '{{fieldName}} cannot be less than {{min}}', {
          fieldName: field.label,
          min: minBound,
        })
      );
    }
    if (maxBound !== undefined && maxBound !== null && num > maxBound) {
      return (
        message ||
        t('action_form_dialog.max_value', '{{fieldName}} cannot be greater than {{max}}', {
          fieldName: field.label,
          max: maxBound,
        })
      );
    }
  }

  return null;
}

export function validateActionForm(
  formFields: FormField[],
  formData: Record<string, unknown>,
  record: TableDataType | null,
  t: (key: string, defaultValue: string, opts?: Record<string, unknown>) => string
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of formFields) {
    const err = validateActionFormField(field, formData[field.name], formData, record, t);
    if (err) {
      errors[field.name] = err;
    }
  }
  return errors;
}
