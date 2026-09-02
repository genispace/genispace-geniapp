import { UpdateDatabaseConfig } from '@/types';
import { DatasourceField } from '@/utils/dataConfigUtils';

export interface BaseConditionMapperProps {

  updateConditions: UpdateDatabaseConfig['updateConditions'];

  onChange: (conditions: UpdateDatabaseConfig['updateConditions']) => void;

  availableParameters?: Array<{ label: string; value: string; type?: string }>;

  className?: string;
}

export interface ColumnConfig {
  title: string;
  dataIndex: string;
  fieldType?: string;
}

export interface FormFieldConfig {
  label: string;
  value: string;
  type?: string;
}

export interface InputSchemaParameter {
  name: string;
  type: string;
  title?: string;
  description?: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
}

export interface DatabaseConditionMapperProps extends BaseConditionMapperProps {

  availableColumns?: ColumnConfig[];

  availableFormFields?: FormFieldConfig[];

  inputSchemaParameters?: InputSchemaParameter[];
}

export interface SchemaConditionMapperProps extends BaseConditionMapperProps {

  availableFields?: DatasourceField[];

  availableColumns?: ColumnConfig[];
}

export interface ConditionStats {

  total: number;

  hasStatic: boolean;

  hasParameter: boolean;

  hasColumn: boolean;

  hasInputField: boolean;
}

export interface ConditionValidationResult {

  isValid: boolean;

  errors: string[];
}

export interface OperatorOption {
  value: string;
  label: string;
}

export interface SourceOption {
  value: string;
  label: string;
  icon: 'Table' | 'Database' | 'Settings';
}
