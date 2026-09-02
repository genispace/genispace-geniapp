import type { InsertDatasetConfig, UpdateDatasetConfig } from '../types';
import i18n from '@/locales/i18n';

export function debugCurrentUser() {

  const userInfo = localStorage.getItem('user');

  const user = getCurrentUser();

  const testExpressions = ['{{user.name}}', '{{user.id}}', '{{user.email}}'];
  testExpressions.forEach(expr => {
    evaluateExpression(expr, {}, {});
  });
}

export function evaluateExpression(
  expression: string,
  formData: Record<string, any>,
  parameters: Record<string, any>
): any {
  try {

    if (expression.includes('{{') && expression.includes('}}')) {
      const result = expression.replace(/\{\{(.+?)\}\}/g, (match, expr) => {
        const trimmedExpr = expr.trim();

        if (trimmedExpr.startsWith('user.')) {

          const userField = trimmedExpr.substring(5) as keyof ReturnType<typeof getCurrentUser>;
          const user = getCurrentUser();

          if (user) {
            const value = user[userField] || '';
            return value;
          } else {
            console.warn(` 无法获取用户信息，表达式: ${trimmedExpr}`);
            return '';
          }
        } else if (trimmedExpr.includes('Date.now()') || trimmedExpr.includes('new Date()')) {

          if (trimmedExpr === 'Date.now()') {
            return Date.now().toString();
          } else if (trimmedExpr === 'new Date().toISOString()') {
            return new Date().toISOString();
          } else if (trimmedExpr === 'new Date().getTime()') {
            return new Date().getTime().toString();
          }
          return new Date().toISOString();
        } else if (trimmedExpr.startsWith('form.')) {

          const fieldName = trimmedExpr.substring(5);
          return formData[fieldName] || '';
        } else if (trimmedExpr.startsWith('param.')) {

          const paramName = trimmedExpr.substring(6);
          return parameters[paramName] || '';
        }

        return match; 
      });

      return result;
    }

    return expression;
  } catch (error) {
    console.error('表达式计算失败:', expression, error);
    return expression;
  }
}

function getCurrentUser(): { id: string; name: string; email: string } | null {
  try {

    const userInfo = localStorage.getItem('user');
    if (userInfo) {
      const user = JSON.parse(userInfo);

      return {
        id: user.id || user.userId || user.user_id || 'unknown-id',
        name: user.name || user.username || user.nickname || user.realName || i18n.t('data_config_utils.unknown_user', 'Unknown User'), 
        email: user.email || user.mail || 'no-email@example.com'
      };
    }

    return null;
  } catch (error) {
    console.error('解析用户信息失败:', error);

    return {
      id: 'error-user-id',
      name: i18n.t('data_config_utils.parse_failed', 'Parse Failed'),
      email: 'error@example.com'
    };
  }
}

export function buildInsertDataFromConfig(
  insertFields: InsertDatasetConfig['insertFields'],
  formData: Record<string, any>,
  parameters: Record<string, any> = {}
): Record<string, any> {
  const insertData: Record<string, any> = {};

  Object.entries(insertFields).forEach(([fieldName, fieldConfig]) => {
    let value: any;

    switch (fieldConfig.source as string) {
      case 'static':
        value = fieldConfig.value;
        break;

      case 'column':
      case 'field':
        value = formData[fieldConfig.value];
        break;

      case 'parameter':
        value = parameters[fieldConfig.value];
        break;

      case 'computed':

        value = evaluateExpression(fieldConfig.value, formData, parameters);
        break;

      case 'datasource':

        value = formData[fieldName]; 
        break;

      default:
        value = fieldConfig.value;
    }

    if (value !== undefined && value !== null) {
      switch (fieldConfig.fieldType) {
        case 'INT32':
          value = parseInt(String(value), 10);
          if (isNaN(value)) value = 0;
          break;

        case 'FLOAT':
          value = parseFloat(String(value));
          if (isNaN(value)) value = 0.0;
          break;

        case 'BOOL':
          value = Boolean(value);
          break;

        case 'JSON':
        case 'ARRAY':
          if (typeof value === 'string') {
            try {
              value = JSON.parse(value);
            } catch {
              value = fieldConfig.fieldType === 'ARRAY' ? [] : {};
            }
          }
          break;

        case 'VARCHAR':
        default:
          value = String(value);
          break;
      }
    }

    if (fieldConfig.required && (value === undefined || value === null || value === '')) {
      console.warn(i18n.t('data_config_utils.required_field_empty', 'Required field {{fieldName}} is empty', { fieldName }));
    }

    insertData[fieldName] = value;
  });

  return insertData;
}

export function buildUpdateDataFromConfig(
  updateFields: UpdateDatasetConfig['updateFields'],
  formData: Record<string, any>,
  parameters: Record<string, any> = {}
): Record<string, any> {

  return buildInsertDataFromConfig(updateFields as any, formData, parameters);
}

export function buildUpdateConditionsFromConfig(
  updateConditions: UpdateDatasetConfig['updateConditions'],
  formData: Record<string, any>,
  parameters: Record<string, any> = {}
): Record<string, any> {

  const conditions: Record<string, any> = {};

  if (!updateConditions || typeof updateConditions !== 'object') {
    return conditions;
  }

  Object.entries(updateConditions).forEach(([fieldName, conditionConfig]) => {

    let value: any;

    switch (conditionConfig.source) {
      case 'static':
        value = conditionConfig.value;
        break;

      case 'column':
        value = formData[conditionConfig.value];
        break;

      case 'parameter':
        value = parameters[conditionConfig.value];
        break;

      default:
        value = conditionConfig.value;
    }

    if (value !== undefined && value !== null && value !== '') {
      conditions[fieldName] = {
        value,
        operator: conditionConfig.operator || 'equals'
      };
    }
  });

  return conditions;
}

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any)._debugCurrentUser = debugCurrentUser;
}

export function buildDatabaseUpdateData(
  updateFields: Record<string, {
    source: 'static' | 'parameter' | 'input_field' | 'column' | 'computed' | 'user';
    value: string;
    required?: boolean;
    fieldType?: 'VARCHAR' | 'INT32' | 'FLOAT' | 'BOOL' | 'JSON' | 'DATETIME';
    defaultValue?: any;
    transform?: string;
  }>,
  rowData: Record<string, any>,
  parameters: Record<string, any> = {}
): Record<string, any> {
  const updateData: Record<string, any> = {};

  Object.entries(updateFields).forEach(([fieldName, fieldConfig]) => {
    let value: any;

    switch (fieldConfig.source) {
      case 'static':
        value = fieldConfig.value;
        break;

      case 'parameter':
        value = parameters[fieldConfig.value] || new URLSearchParams(window.location.search).get(fieldConfig.value);
        break;

      case 'input_field':

        value = parameters[fieldName];
        break;

      case 'column':

        value = rowData[fieldConfig.value];
        break;

      case 'computed':

        try {

          if (fieldConfig.value.includes('{{') && fieldConfig.value.includes('}}')) {

            console.warn(`计算表达式暂未完全支持: ${fieldConfig.value}`);
            value = fieldConfig.value;
          } else {
            value = fieldConfig.value;
          }
        } catch (error) {
          console.warn(`计算字段 ${fieldName} 的值失败:`, error);
          value = fieldConfig.value;
        }
        break;

      case 'user':

        value = getUserValue(fieldConfig.value);
        break;

      default:
        console.warn(`不支持的字段来源类型: ${fieldConfig.source} for field ${fieldName}`);
        value = fieldConfig.value;
    }

    if (fieldConfig.transform) {
      value = applyDataTransform(value, fieldConfig.transform, rowData, parameters);
    }

    if (value !== undefined && value !== null) {
      value = convertDatabaseFieldType(value, fieldConfig.fieldType || 'VARCHAR');
    }

    if ((value === undefined || value === null || value === '') && fieldConfig.defaultValue !== undefined) {
      value = fieldConfig.defaultValue;
    }

    if (fieldConfig.required && (value === undefined || value === null || value === '')) {
      console.warn(`必填字段 '${fieldName}' 的值为空`);
    }

    updateData[fieldName] = value;
  });

  return updateData;
}

export function buildDatabaseUpdateConditions(
  updateConditions: Record<string, {
    id?: string;
    source: 'static' | 'parameter' | 'input_field' | 'column';
    value: string;
    operator?: 'equals' | 'not_equals' | 'in' | 'not_in' | 'like' | 'between';
  }>,
  rowData: Record<string, any>,
  parameters: Record<string, any> = {}
): Record<string, any> | null {
  if (!updateConditions || typeof updateConditions !== 'object') {
    return null;
  }

  const keys = Object.keys(updateConditions);
  if (keys.length === 0) {
    return null;
  }

  const conditions: Record<string, any> = {};

  for (const fieldName of keys) {
    const conditionConfig = updateConditions[fieldName];
    let value: any;

    switch (conditionConfig.source) {
      case 'static':
        value = conditionConfig.value;
        break;

      case 'parameter': {
        const fromParams = parameters[conditionConfig.value];
        if (fromParams !== undefined && fromParams !== null && fromParams !== '') {
          value = fromParams;
        } else {
          value =
            typeof window !== 'undefined'
              ? new URLSearchParams(window.location.search).get(conditionConfig.value)
              : null;
        }
        break;
      }

      case 'input_field':
        value = parameters[fieldName];
        break;

      case 'column':
        value = rowData[conditionConfig.value];
        break;

      default:
        console.warn(`不支持的条件来源类型: ${conditionConfig.source} for condition ${fieldName}`);
        value = conditionConfig.value;
    }

    if (value === undefined || value === null || value === '') {
      return null;
    }

    switch (conditionConfig.operator) {
      case 'equals':
        conditions[fieldName] = value;
        break;
      case 'not_equals':
        conditions[fieldName] = { $ne: value };
        break;
      case 'in':
        conditions[fieldName] = { $in: Array.isArray(value) ? value : [value] };
        break;
      case 'not_in':
        conditions[fieldName] = { $nin: Array.isArray(value) ? value : [value] };
        break;
      case 'like':
        conditions[fieldName] = { $like: `%${value}%` };
        break;
      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          conditions[fieldName] = { $between: value };
        } else if (typeof value === 'string' && value.includes(',')) {
          const [min, max] = value.split(',').map((v) => v.trim());
          conditions[fieldName] = { $between: [min, max] };
        } else {
          return null;
        }
        break;
      default:
        conditions[fieldName] = value;
    }
  }

  return conditions;
}

function getUserValue(property: string): any {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user[property] || '';
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return '';
  }
}

function applyDataTransform(
  value: any, 
  transform: string, 
  rowData: Record<string, any>, 
  parameters: Record<string, any>
): any {
  try {
    switch (transform) {
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'trim':
        return String(value).trim();
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      default:

        if (transform.includes('{{')) {
          return evaluateExpression(transform.replace('{{value}}', String(value)), rowData, parameters);
        }
        return value;
    }
  } catch (error) {
    console.error('数据转换失败:', transform, error);
    return value;
  }
}

function convertDatabaseFieldType(value: any, fieldType: string): any {
  if (value === null || value === undefined) return value;

  switch (fieldType) {
    case 'INT32':
      const intValue = parseInt(String(value), 10);
      return isNaN(intValue) ? 0 : intValue;

    case 'FLOAT':
      const floatValue = parseFloat(String(value));
      return isNaN(floatValue) ? 0 : floatValue;

    case 'BOOL':
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value === '1';
      }
      return Boolean(value);

    case 'JSON':
      if (typeof value === 'object') return value;
      try {
        return JSON.parse(String(value));
      } catch {
        return {};
      }

    case 'DATETIME':
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
        return value;
      }
      return new Date(value).toISOString();

    case 'VARCHAR':
    default:
      return String(value);
  }
}

export interface DatasourceField {
  name: string;
  type: string;
  title?: string;
  description?: string;
  required?: boolean;
  format?: string;
}

export interface DatasourceSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    title?: string;
    description?: string;
    format?: string;
  }>;
  required?: string[];
}

export function extractOutputSchemaProperties(outputSchema: Record<string, unknown> | null | undefined): Record<string, { type?: string; title?: string; description?: string; format?: string; nullable?: boolean }> | null {
  if (!outputSchema || typeof outputSchema !== 'object') return null;
  const props = outputSchema.properties as Record<string, unknown> | undefined;
  if (!props) return null;

  const dataItems = (props as { data?: { items?: { properties?: Record<string, unknown> } } })?.data?.items;
  if (dataItems?.properties) return dataItems.properties as Record<string, { type?: string; title?: string; description?: string; format?: string; nullable?: boolean }>;

  return props as Record<string, { type?: string; title?: string; description?: string; format?: string; nullable?: boolean }>;
}

function extractOutputSchemaRequired(outputSchema: Record<string, unknown> | null | undefined): string[] {
  if (!outputSchema || typeof outputSchema !== 'object') return [];
  const rootRequired = outputSchema.required as string[] | undefined;
  if (Array.isArray(rootRequired)) return rootRequired;
  const props = outputSchema.properties as Record<string, unknown> | undefined;
  const dataItems = (props as { data?: { items?: { required?: string[] } } })?.data?.items;
  return (dataItems?.required as string[]) || [];
}

export function parseOutputSchemaFields(outputSchema: Record<string, unknown> | null | undefined): Array<{ name: string; type: string; title?: string; description?: string; format?: string; nullable?: boolean; required?: boolean }> {
  const properties = extractOutputSchemaProperties(outputSchema);
  if (!properties) return [];
  const requiredFields = extractOutputSchemaRequired(outputSchema);
  return Object.keys(properties).map(fieldName => {
    const fieldInfo = properties[fieldName];
    return {
      name: fieldName,
      type: fieldInfo?.type || 'string',
      title: fieldInfo?.title || fieldName,
      description: fieldInfo?.description || fieldInfo?.title || '',
      format: fieldInfo?.format,
      nullable: fieldInfo?.nullable,
      required: requiredFields.includes(fieldName)
    };
  });
}

export function mapSchemaFieldType(
  schemaType: string,
  format?: string
): 'VARCHAR' | 'INT32' | 'FLOAT' | 'BOOL' | 'JSON' | 'DATETIME' {

  if (format) {
    switch (format.toLowerCase()) {
      case 'date':
      case 'date-time':
      case 'datetime':
        return 'DATETIME';
      case 'email':
      case 'uri':
      case 'uuid':
        return 'VARCHAR';
    }
  }

  switch (schemaType.toLowerCase()) {
    case 'integer':
    case 'int':
    case 'int32':
    case 'int64':
      return 'INT32';

    case 'number':
    case 'float':
    case 'double':
    case 'decimal':
      return 'FLOAT';

    case 'boolean':
    case 'bool':
      return 'BOOL';

    case 'object':
    case 'array':
      return 'JSON';

    case 'string':
    default:
      return 'VARCHAR';
  }
}

export function getRecommendedOperators(
  fieldType: 'VARCHAR' | 'INT32' | 'FLOAT' | 'BOOL' | 'JSON' | 'DATETIME'
): Array<'equals' | 'not_equals' | 'in' | 'not_in' | 'like' | 'between'> {
  switch (fieldType) {
    case 'VARCHAR':
      return ['equals', 'not_equals', 'like', 'in', 'not_in'];

    case 'INT32':
    case 'FLOAT':
    case 'DATETIME':
      return ['equals', 'not_equals', 'between', 'in', 'not_in'];

    case 'BOOL':
      return ['equals', 'not_equals'];

    case 'JSON':
      return ['equals', 'not_equals'];

    default:
      return ['equals', 'not_equals'];
  }
}

export function validateFieldTypeCompatibility(
  fieldName: string,
  sourceType: string,
  targetType: 'VARCHAR' | 'INT32' | 'FLOAT' | 'BOOL' | 'JSON' | 'DATETIME'
): { valid: boolean; message?: string } {
  const mappedSourceType = mapSchemaFieldType(sourceType);

  if (mappedSourceType === targetType) {
    return { valid: true };
  }

  const compatibleConversions: Record<string, string[]> = {
    'VARCHAR': ['INT32', 'FLOAT', 'BOOL', 'DATETIME'], 
    'INT32': ['FLOAT', 'VARCHAR'], 
    'FLOAT': ['VARCHAR'], 
    'BOOL': ['VARCHAR'], 
    'DATETIME': ['VARCHAR'], 
    'JSON': ['VARCHAR'] 
  };

  if (compatibleConversions[mappedSourceType]?.includes(targetType)) {
    return {
      valid: true,
      message: i18n.t('data_config_utils.field_auto_convert', 'Field "{{fieldName}}" will be automatically converted from {{mappedSourceType}} to {{targetType}}', {
        fieldName,
        mappedSourceType,
        targetType
      })
    };
  }

  return {
    valid: false,
    message: i18n.t('data_config_utils.field_cannot_convert', 'Field "{{fieldName}}" of type {{mappedSourceType}} cannot be converted to {{targetType}}', {
      fieldName,
      mappedSourceType,
      targetType
    })
  };
}

export interface InputSchemaParameter {
  name: string;
  type: string;
  title?: string;
  description?: string;
  required?: boolean;
  defaultValue?: any;
}

export interface InputSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    title?: string;
    description?: string;
    format?: string;
    default?: any;
  }>;
  required?: string[];
}

