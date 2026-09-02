export type FilterOperator = 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'in' | 'not_in';

export interface ParameterFilterCondition {
  id: string;
  field: string;           
  operator: FilterOperator; 
  parameterName: string;   
  fallbackValue?: any;     
  enabled: boolean;        
  description?: string;    
}

export interface DataSourceCommunicationConfig {
  enabled: boolean;                      
  listenToParameters: string[];          

  enableDebugLog?: boolean;              

  manualListenParameters?: string[];     
  autoListenParameters?: string[];       
}

export interface DataSourceParams {
  parameterFilters?: ParameterFilterCondition[];     
  limit?: number;
  offset?: number;
  outputFields?: string[];
  [key: string]: unknown;
}

export interface DataSource {
  type: 'dataset';
  datasetId: string;
  datasetName?: string; 
  params: DataSourceParams;
  [key: string]: unknown;
}

export interface EnhancedDataSource extends DataSource {

  communicationConfig?: DataSourceCommunicationConfig;
}

export interface SchemaField {
  name: string;
  type: string;
  description?: string;
}

export interface DatasetSchema {
  fields: SchemaField[];
}

export interface ColumnConfig {
  title: string;
  dataIndex: string;
  key: string;

  width?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  align?: string;
  ellipsis?: boolean;
  editable?: boolean;
  editRequired?: boolean;
  filterable?: boolean;
  filterType?: 'equals' | 'like' | 'in';

  filterMultiSelect?: boolean;

  filterMaxTags?: number;

  filterPassMode?: 'filter' | 'parameter';

  filterParameterName?: string;
  hidden?: boolean;
  /** Pin column to the left in table renderer (horizontal scroll) */
  frozen?: boolean;
  fieldType?: 'VARCHAR' | 'INT8' | 'INT16' | 'INT32' | 'INT64' | 'FLOAT' | 'DOUBLE' | 'BOOL' | 'JSON' | 'ARRAY' | 'DATE' | 'DATETIME' | 'TEXT' | 'SWITCH' | 'IMAGE';
  render?: {
    type: 'Tag' | 'Progress' | 'Image' | 'yyyy-MM-dd' | 'yyyy-MM-dd HH:mm:ss' | 'Custom' | 'RankBadge' | 'Currency' | 'Number';
    props?: {
      color?: Record<string, string>;
      text?: Record<string, string>;
      textColor?: Record<string, string>;
      status?: string;
      showInfo?: boolean;
      size?: 'small' | 'default' | 'large';
      width?: number;
      height?: number;
      preview?: boolean;
      fallback?: string;
      render?: string;
      // Custom renderer style props
      customColor?: string;
      fontWeight?: string;
      fontFamily?: string;
      fontStyle?: string;
      textDecoration?: string;
      
      topHighlight?: number;
      highlightFrom?: string;
      highlightTo?: string;
      defaultFill?: string;
      rankStyle?: 'square' | 'circle';
      rankSize?: 'xs' | 'sm' | 'md';
      medalTop?: number;
      // ── Currency / Number ──
      currencyField?: string;
      compact?: boolean;
      decimals?: number;
    };
  };
  switchConfig?: {
    showText?: boolean;
    onText?: string;
    offText?: string;
  };
  inputType?: 'text' | 'number' | 'color' | 'date' | 'select' | 'switch' | 'file';
  datasource?: {
    datasourceId?: string;
    /** Pin a datasource version; omit to use the default version */
    version?: number;
    valueField?: string;
    labelField?: string;
  };
  [key: string]: unknown;
}

export interface PaginationConfig {
  pageSize: number;
  current?: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: boolean;
  [key: string]: unknown;
} 