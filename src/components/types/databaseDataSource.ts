export interface ParameterRefConfig {
  type: 'parameter' | 'system';
  source?: string; 
  systemParam?: string; 
  value?: any; 

  waitForValue?: boolean;
}

export interface DatabaseDataSourceConfig {
  type: 'database-datasource';
  datasourceId: string;
  datasourceName?: string;
  /** Pin a datasource version; omit to use the default version */
  version?: number;
  sqlQuery?: string; 
  parameters?: Record<string, any>;

  parameterTypes?: Record<string, string>;

  outputFields?: string[];

  defaultSort?: DefaultSortItem[];

  enableSort?: boolean;

}

export interface DatabaseDataSourceResponse {
  success: boolean;
  data?: {
    rows: Record<string, any>[];
    columns: string[];
    totalCount: number;
    executionTime: number;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  message?: string;
  error?: string;
}

export interface DatabaseDataSourceParams {
  parameters?: Record<string, any>;
  page?: number;
  limit?: number;
  offset?: number; 
  filter?: string; 
  sort?: string; 
  outputFields?: string[];
}

export type ComponentDataSourceType = 'dataset' | 'database-datasource' | 'external' | 'mock';

export type UnifiedDataSourceConfig = 
  | { type: 'dataset'; datasetConfig: any }
  | { type: 'database-datasource'; databaseDataSourceConfig: DatabaseDataSourceConfig }
  | { type: 'external'; externalConfig: any }
  | { type: 'mock'; mockConfig: any };

export interface DatabaseDataSourceOption {
  id: string;
  name: string;
  description?: string;
  type?: string;
  status?: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface DatabaseFieldInfo {
  name: string;
  type: string;
  description?: string;
  nullable?: boolean;
  defaultValue?: any;
}

export interface DatabaseDataSourcePreviewData {
  fields: DatabaseFieldInfo[];
  sampleData: Record<string, any>[];
  totalCount?: number;
}

export interface UseDatabaseDataSourceReturn {
  data: Record<string, any>[];
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    current_page: number;
    total_pages: number;
    limit: number;
    offset: number;
    has_more: boolean;
  } | null;
  isInitialized: boolean; 
  refetch: (params?: Record<string, any>) => Promise<void>;
  clearCache: () => void;
  exportAllData: (onProgress: (current: number, total: number) => void) => Promise<Record<string, any>[]>;
}

export type SupportedComponentType =
  | 'Tree'
  | 'Table'
  | 'EditableTable'
  | 'Form'
  | 'Chart'
  | 'StatisticGroup'
  | 'Typography'
  | 'HeroCard'
  | 'CollapsePanel'
  | 'ProductReport'
  | 'ProductDetail'
  | 'TileGrid'
  | 'RingStat'
  | 'RadarChart'
  | 'List';

export interface DefaultSortItem {
  field: string; 
  direction: 'asc' | 'desc'; 
}

export interface DataExtractionStrategy {
  componentType: SupportedComponentType;
  dataPath?: string; 
  transformFn?: (data: any[]) => any[]; 
}

export interface ErrorHandlingConfig {
  showToast?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  fallbackData?: any[];
}

export interface PerformanceConfig {
  debounceTime?: number; 
  throttleTime?: number; 
  batchSize?: number; 
  lazyLoad?: boolean; 
}
