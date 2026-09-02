import type { FormField } from '@/types';

export function formatMobileFormDisplayValue(field: FormField, value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (field.type === 'number' && typeof value === 'number') {
    return value.toLocaleString('zh-CN');
  }

  return String(value);
}

export function getVisibleMobileFormFields(fields: FormField[] = []): FormField[] {
  return fields.filter((field) => field.mode !== 'hidden' && !field.hidden);
}
