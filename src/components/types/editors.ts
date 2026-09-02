import { DataSource, DataSourceParams, SchemaField, DatasetSchema, ColumnConfig, EnhancedDataSource } from './datasource';
import { ComponentTypeName } from './components';

export interface BasePropertyEditorProps {
  component: {
    id: string;
    type: string;
    props?: Record<string, unknown>;
    dataSource?: DataSource;
    mockData?: unknown;
    parameterConfig?: unknown;
    actions?: unknown[];
    [key: string]: unknown;
  };
  onPropChange: (propKey: string, value: unknown) => void;
  availablePages?: Array<{ key: string; title: string }>;
  availableParameters?: Array<{ label: string; value: string; type?: string }>;
}

export interface ComponentEditorProps extends BasePropertyEditorProps {
  onDataSourceChange?: (dataSource: DataSource) => void;
  onMockDataChange?: (mockData: unknown) => void;
  onIdChange?: (id: string) => void;
}

export interface DataSourceEditorProps {
  dataSource: EnhancedDataSource | null;
  componentType: ComponentTypeName;
  onChange: (dataSource: EnhancedDataSource) => void;
  availableParameters?: Array<{ label: string; value: string; type?: string }>;
}

export interface MockDataEditorProps {
  mockData: unknown;
  componentType: ComponentTypeName;
  onChange: (mockData: unknown) => void;
}

export interface SchemaColumnSelectorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  schema: DatasetSchema | null;
  existingColumns: ColumnConfig[];
  onSelect: (selectedFields: SchemaField[]) => void;
}

export interface PropertyConfig {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  label: string;
  description?: string;
  required?: boolean;
  defaultValue?: any;
  options?: Array<{ label: string; value: string | number }>;
  children?: {
    [key: string]: PropertyConfig;
  };
}

export interface ComponentTypeConfig {
  type: ComponentTypeName;
  title: string;
  description: string;
  icon: string;
  propTypes: {
    [key: string]: PropertyConfig;
  };
  dataSourceTypes?: {
    [key: string]: {
      label: string;
      description?: string;
      required?: boolean;
      children: {
        [key: string]: PropertyConfig;
      };
    };
  };
  mockData?: {
    type: 'array' | 'object';
    label: string;
    description: string;
    defaultValue: any;
  };
} 