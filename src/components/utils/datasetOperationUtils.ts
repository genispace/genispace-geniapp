import {
  insertDatasetData,
  updateDatasetData,
  deleteDatasetData,
} from '@/app/services/workbenchApi';
import type { ParameterRecord } from '@/types/parameters';
import type { TableDataType } from '@/types/renderers';

interface FieldMappingConfig {
  source: string;
  value: string;
  fieldType?: string;
  required?: boolean;
}

function resolveFieldValue(
  fieldConfig: FieldMappingConfig,
  record: TableDataType,
  parameters: ParameterRecord,
  pageParams?: ParameterRecord,
  formValues?: Record<string, unknown>,
  fieldName?: string
): unknown {
  let value: unknown;
  switch (fieldConfig.source) {
    case 'input_field':
      value = fieldName ? formValues?.[fieldName] : undefined;
      break;
    case 'column':
      value = record[fieldConfig.value];
      break;
    case 'static':
      value = fieldConfig.value;
      break;
    case 'parameter':
      value = parameters[fieldConfig.value] ?? pageParams?.[fieldConfig.value];
      break;
    case 'computed':
      try {
        if (fieldConfig.value.includes('{{') && fieldConfig.value.includes('}}')) {
          value = fieldConfig.value.replace(/\{\{(.+?)\}\}/g, (_match, expr: string) => {
            const trimmed = expr.trim();
            if (trimmed === 'new Date().toISOString()') return new Date().toISOString();
            if (trimmed === 'Date.now()') return Date.now().toString();
            return trimmed;
          });
        } else {
          value = fieldConfig.value;
        }
      } catch {
        value = fieldConfig.value;
      }
      break;
    default:
      value = fieldConfig.value;
  }

  if (fieldConfig.fieldType === 'INT32' || fieldConfig.fieldType === 'INT64') {
    return parseInt(String(value), 10);
  }
  if (fieldConfig.fieldType === 'FLOAT' || fieldConfig.fieldType === 'DOUBLE') {
    return parseFloat(String(value));
  }
  if (fieldConfig.fieldType === 'BOOL') {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1';
    }
    return Boolean(value);
  }
  if (fieldConfig.fieldType === 'JSON' || fieldConfig.fieldType === 'ARRAY') {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return fieldConfig.fieldType === 'ARRAY' ? [] : {};
    }
  }
  return value;
}

export function resolveTargetDatasetId(
  targetDatasetId: string | { source: 'parameter' | 'static'; paramName?: string; value?: string },
  parameters: ParameterRecord,
  pageParams?: ParameterRecord
): string {
  if (typeof targetDatasetId === 'string') return targetDatasetId;
  if (targetDatasetId.source === 'parameter') {
    return String(
      parameters[targetDatasetId.paramName ?? ''] ??
        pageParams?.[targetDatasetId.paramName ?? ''] ??
        ''
    );
  }
  return targetDatasetId.value ?? '';
}

export async function executeDatasetOperation(
  operationType: 'update' | 'insert' | 'delete',
  config: {
    targetDatasetId: string | { source: 'parameter' | 'static'; paramName?: string; value?: string };
    updateFields?: Record<string, FieldMappingConfig & { source?: string }>;
    insertFields?: Record<string, FieldMappingConfig & { source?: string }>;
    updateConditions?: Record<string, FieldMappingConfig & { source?: string }>;
    deleteConditions?: Record<string, FieldMappingConfig & { source?: string }>;
  },
  record: TableDataType,
  parameters: ParameterRecord = {},
  pageParams?: ParameterRecord,
  formValues?: Record<string, unknown>
) {
  const targetDatasetId = resolveTargetDatasetId(config.targetDatasetId, parameters, pageParams);
  if (!targetDatasetId) {
    throw new Error('Target dataset ID not specified');
  }

  const operationData: Record<string, unknown> = {};
  if (operationType === 'update' || operationType === 'insert') {
    const fields = operationType === 'update' ? config.updateFields : config.insertFields;
    if (fields) {
      for (const [fieldName, fieldConfig] of Object.entries(fields)) {
        operationData[fieldName] = resolveFieldValue(
          fieldConfig as FieldMappingConfig,
          record,
          parameters,
          pageParams,
          formValues,
          fieldName
        );
      }
    }
  }

  const conditions: Record<string, unknown> = {};
  if (operationType === 'update' || operationType === 'delete') {
    const conditionConfig =
      operationType === 'update' ? config.updateConditions : config.deleteConditions;
    if (conditionConfig) {
      for (const [fieldName, conditionFieldConfig] of Object.entries(conditionConfig)) {
        conditions[fieldName] = resolveFieldValue(
          conditionFieldConfig as FieldMappingConfig,
          record,
          parameters,
          pageParams,
          formValues
        );
      }
    }
  }

  switch (operationType) {
    case 'update': {
      const filter = Object.entries(conditions)
        .map(([field, value]) => `${field}=${value}`)
        .join(' AND ');
      return updateDatasetData(targetDatasetId, filter, operationData);
    }
    case 'insert':
      return insertDatasetData(targetDatasetId, [operationData]);
    case 'delete': {
      const filter = Object.entries(conditions)
        .map(([field, value]) => `${field}==${value}`)
        .join(' AND ');
      return deleteDatasetData(targetDatasetId, filter);
    }
    default:
      throw new Error(`Unsupported operation: ${operationType}`);
  }
}
