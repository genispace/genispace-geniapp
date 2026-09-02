import type { InsertDatasetConfig, UpdateDatasetConfig } from '../types';
import type { ColumnConfig } from '../types/editor';

export interface EnhancedFieldConfig {
  source: 'column' | 'static' | 'parameter' | 'computed' | 'field' | 'datasource';
  value: string;
  required: boolean;
  fieldType: 'VARCHAR' | 'INT32' | 'FLOAT' | 'BOOL' | 'JSON' | 'ARRAY';

  datasourceConfig?: {
    datasetId: string;          
    valueField: string;         
    labelField: string;         
    filter?: string;            
  };
}

export interface TreeFormField {
  name: string;                 
  label: string;               
  type: 'text' | 'number' | 'select' | 'datasource-select' | 'computed-display' | 'switch' | 'textarea';
  required: boolean;
  source: EnhancedFieldConfig['source'];
  config: EnhancedFieldConfig;

  datasourceOptions?: Array<{
    value: any;
    label: string;
    record: Record<string, any>; 
  }>;

  computedValue?: any;
}

export interface DatasourceOption {
  value: any;
  label: string;
  record: Record<string, any>;
}

function getInputTypeFromFieldType(
  fieldType: EnhancedFieldConfig['fieldType'],
  source: EnhancedFieldConfig['source']
): TreeFormField['type'] {

  if (source === 'datasource') {
    return 'datasource-select';
  }

  if (source === 'computed') {
    return 'computed-display';
  }

  let resultType: TreeFormField['type'];
  switch (fieldType) {
    case 'INT32':
    case 'FLOAT':
      resultType = 'number';
      break;
    case 'BOOL':
      resultType = 'switch';
      break;
    case 'JSON':
    case 'ARRAY':
      resultType = 'textarea';
      break;
    case 'VARCHAR':
    default:
      resultType = 'text';
      break;
  }

  return resultType;
}

function getFieldDisplayLabel(fieldName: string, treeColumns: ColumnConfig[]): string {

  const column = treeColumns.find(col => col.dataIndex === fieldName);
  if (column) {
    return column.title;
  }

  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

export function parseInsertConfigToFormFields(
  insertConfig: InsertDatasetConfig,
  treeColumns: ColumnConfig[]
): TreeFormField[] {

  return Object.entries(insertConfig.insertFields).map(([fieldName, config]) => {
    const enhancedConfig = config as EnhancedFieldConfig;

    const fieldType = getInputTypeFromFieldType(enhancedConfig.fieldType, enhancedConfig.source);

    const baseField: TreeFormField = {
      name: fieldName,
      label: getFieldDisplayLabel(fieldName, treeColumns),
      required: enhancedConfig.required || false,
      source: enhancedConfig.source,
      config: enhancedConfig,
      type: fieldType
    };

    return baseField;
  });
}

export function parseUpdateConfigToFormFields(
  updateConfig: UpdateDatasetConfig,
  treeColumns: ColumnConfig[]
): TreeFormField[] {
  return Object.entries(updateConfig.updateFields).map(([fieldName, config]) => {
    const enhancedConfig = config as EnhancedFieldConfig;

    const baseField: TreeFormField = {
      name: fieldName,
      label: getFieldDisplayLabel(fieldName, treeColumns),
      required: enhancedConfig.required || false,
      source: enhancedConfig.source,
      config: enhancedConfig,
      type: getInputTypeFromFieldType(enhancedConfig.fieldType, enhancedConfig.source)
    };

    return baseField;
  });
}

export function findTreeDisplayField(formFields: TreeFormField[]): TreeFormField | null {

  const possibleNameFields = ['name', 'label', 'title', 'text'];

  for (const fieldName of possibleNameFields) {
    const field = formFields.find(f => f.name === fieldName);
    if (field) {
      return field;
    }
  }

  return formFields.find(f => f.type === 'text') || null;
}

export function validateRequiredFields(
  formFields: TreeFormField[],
  formData: Record<string, any>
): { isValid: boolean; missingFields: string[] } {
  const missingFields = formFields
    .filter(field => field.required && (
      formData[field.name] === undefined || 
      formData[field.name] === null || 
      formData[field.name] === ''
    ))
    .map(field => field.label);

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}
