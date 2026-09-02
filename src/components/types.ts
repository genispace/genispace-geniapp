export interface WorkbenchHistory {
  id: string;
  workbenchId: string;
  version: string;
  config: any;
  description?: string;
  createdBy: string;
  createdAt: string;
}

export interface WorkbenchLocaleMetadata {
  locales?: Record<
    string,
    {
      appConfig?: Record<string, unknown>;
      pages?: Record<string, unknown>;
      labels?: Record<string, string>;
    }
  >;
}

export interface WorkbenchConfigData {
  appConfig: AppConfig;
  pages?: Record<string, any>;
  /** Built-in appearance package id (`classic`, `inkOnyx`, …). Not user-custom themes. */
  themeId?: string;
  metadata?: WorkbenchLocaleMetadata;
  /**
   * Workbench-level datasource version pins: `{ [datasourceId]: version }`.
   * Sparse map — a missing entry means "follow the datasource default version".
   * Runtime priority: this map > component/action-level version field > default.
   */
  datasourceVersions?: Record<string, number>;
}

export interface Workbench {
  id: string;
  name: string;
  description?: string;
  config: WorkbenchConfigData;
  spaceId: string;
  // Owning application id (applications.workbenchId -> workbench.id); returned by
  // GET /workbenches/:id. Used to resolve app roles via /applications/:id/... .
  applicationId?: string | null;
  version: string | number;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  histories?: WorkbenchHistory[];
  /** Publish flow: which view this payload's config represents. */
  configView?: 'draft' | 'published';
  publishedVersion?: string | null;
  publishedAt?: string | null;
  publishedBy?: string | null;
  /** True when the draft version differs from the published snapshot. */
  hasUnpublishedChanges?: boolean;
}

export interface WorkbenchPreviewToken {
  id: string;
  workbenchId: string;
  token: string;
  type: string;
  expiresAt?: string | null;
  revoked: boolean;
  createdBy: string;
  createdAt: string;
}

export interface NavigationItem {
  key: string;
  path: string;
  /** Plain string or inline bilingual `{ zh, en }` — resolve via resolveBilingualText before display. */
  title: string | { zh?: string; en?: string };
  icon?: string;
  linkedPage?: string;   
  pageParameters?: Record<string, any>; 
  visibility?: {
    mode: 'all' | 'members';
    memberIds?: string[];
    /** Device gate, orthogonal to mode: undefined/both = show everywhere. */
    devices?: Array<'desktop' | 'mobile'>;
  };
  /** Conditional visibility (e.g. by application role), ANDed with the member/device gates. */
  visibleWhen?: import('./utils/visibleWhen').VisibleWhen;
  /** When true, this item is also rendered in the mobile top toolbar ("..." panel),
   *  even when hidden from the mobile bottom nav (e.g. devices:['desktop']).
   *  Member / visibleWhen gates still apply. Default off. */
  mobileToolbar?: boolean;
  children?: NavigationItem[];
  level?: number;        
  parentKey?: string;    
  hasChildren?: boolean; 
}

export interface WorkbenchSidebarProps {
  workbenchId?: string;
}

export interface UpdateWorkbenchRequest {
  id: string;
  name?: string;
  description?: string;
  config?: WorkbenchConfigData;
  status?: Workbench['status'];
}

export interface ParameterReference {
  type: 'parameter' | 'static' | 'computed';
  value: string;
  transform?: string;
}

export type ParameterMapping = Record<
  string,
  {
    targetType: string;
    targetField: string;
    required?: boolean;
    [key: string]: unknown;
  }
>;

export interface ParameterConfig {
  enableParameterReceiving: boolean;
  parameterMapping?: ParameterMapping;
  dataSourceFilters?: {
    field: string;
    operator: 'equals' | 'like' | 'in' | 'between' | 'gt' | 'lt' | 'not_equals';
    value: string | ParameterReference;
  }[];

  enableCommunication?: boolean;
  emitParameters?: string[];
  listenToParameters?: string[];

}

export interface ParameterContext {
  sourceParams: Record<string, any>;
  transformedParams: Record<string, any>;
  parameterHistory: ParameterHistoryItem[];
}

export interface ParameterHistoryItem {
  timestamp: number;
  source: string;
  params: Record<string, any>;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'date' | 'textarea' | 'switch' | 'checkbox' | 'radio' | 'json';
  mode: 'editable' | 'readonly' | 'hidden';
  hidden?: boolean;
  required?: boolean;
  placeholder?: string;
  rows?: number; 

  fieldType?: 'VARCHAR' | 'INT8' | 'INT16' | 'INT32' | 'INT64' | 'FLOAT' | 'DOUBLE' | 'BOOL' | 'JSON' | 'ARRAY' | 'DATE' | 'DATETIME' | 'TEXT';

  options?: Array<{ label: string; value: string | number }>;

  dataSource?: 'dataset' | 'custom' | 'parameter' | {
    type: 'static' | 'dataset' | 'parameter';
    config?: any;
  };

  parameterConfig?: {
    paramName: string;
    defaultValue?: any;

    fieldName?: string; 
  };
  validation?: ValidationRule[];
  displayConfig?: {
    format?: string;
    renderer?: 'text' | 'tag' | 'badge' | 'image' | 'link';
    colorMapping?: Record<string, string>;
  };

  switchConfig?: {
    onText?: string;  
    offText?: string; 
    showText?: boolean; 
  };
  defaultValue?: any;

  layoutConfig?: {

    gridPosition?: {
      row: number;      
      column: number;   
      rowSpan?: number; 
      colSpan?: number; 
    };

    labelPosition?: 'top' | 'left' | 'right' | 'bottom' | 'inside' | 'none';
    labelWidth?: string; 
    labelVerticalAlign?: 'start' | 'center' | 'end'; 

    containerStyle?: {
      width?: string;
      minWidth?: string;
      maxWidth?: string;
      margin?: string;
      padding?: string;
    };
  };
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

export interface FormConfig {
  title: string;
  description?: string;
  mode: 'edit' | 'display' | 'mixed';
  layout: 'vertical' | 'horizontal' | 'grid';
  height?: number; 
  heightMode?: 'auto' | 'fixed' | 'fullscreen'; 
  fields: FormField[];
  actions?: FormAction[]; 
  displayConfig?: DisplayConfig;
  parameterConfig?: ParameterConfig;

  layoutConfig?: {

    layoutMode?: 'auto' | 'grid' | 'flex';

    gridConfig?: {
      columns: number;      
      rows?: number;        
      gap?: string;         
      columnTemplate?: string; 
    };

    actionsLayout?: {
      position?: 'top' | 'bottom';     
      floating?: boolean;              
      alignment?: 'left' | 'right';    
    };

    containerStyle?: {
      maxWidth?: string;
      padding?: string;
      background?: string;
    };
  };
}

export interface FormAction {
  id: string;
  label: string;
  type: 'navigate' | 'api' | 'modal' | 'form' | 'confirm' | 'updateDataset' | 'insertDataset' | 'deleteDataset' | 'download' | 'taskCall' | 'taskExecute';
  icon?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'approve' | 'reject' | 'success' | 'warning' | 'info';
  config: FormActionConfig;
  /** @deprecated Prefer actionVisibility; still normalized at runtime for older configs */
  visibilityCondition?: VisibilityCondition;
  actionVisibility?: FormActionVisibility;
}

export interface FormActionConfig {

  targetPage?: string;
  openInNewTab?: boolean;

  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';

  updateDataset?: UpdateDatasetConfig;
  insertDataset?: InsertDatasetConfig;
  deleteDataset?: DeleteDatasetConfig;

  downloadConfig?: {
    fileUrlField: string; 
    fileNameField?: string; 
  };

  taskCall?: {
    taskId: string | {
      source: 'parameter' | 'static';
      paramName?: string;
      value?: string;
    };

    parameterMapping?: Record<string, {
      source: 'static' | 'formField' | 'parameter' | 'database' | 'column';
      value: string;
      labelText?: string;
      requiredInTaskInput?: boolean;
      sortOrder?: number;
    }>;
    requireConfirmation?: boolean;
    confirmMessage?: string;
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: { type: 'refresh' | 'navigate' | 'message'; message?: string; targetPage?: string; };
    onError?: { type: 'message' | 'console'; message?: string; };
  };

  taskExecute?: {
    taskId: string | {
      source: 'parameter' | 'static';
      paramName?: string;
      value?: string;
    };

    interactiveMode?: 'professional' | 'normal';

    parameterMapping?: Record<string, {
      source: 'static' | 'formField' | 'parameter' | 'database' | 'column';
      value: string;
      labelText?: string;
      requiredInTaskInput?: boolean;
      sortOrder?: number;
    }>;
    requireConfirmation?: boolean;
    confirmMessage?: string;
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: { type: 'refresh' | 'navigate' | 'message'; message?: string; targetPage?: string; };
    onError?: { type: 'message' | 'console'; message?: string; };
  };

  parameterMapping?: {
    [paramKey: string]: {
      source: 'field' | 'static' | 'computed' | 'parameter';
      value: string; 
      transform?: string; 
      required?: boolean; 
    };
  };

  requireConfirmation?: boolean;
  confirmMessage?: string;

  requireValidation?: boolean; 

  successMessage?: string;
  errorMessage?: string;
}

export interface DisplayConfig {
  showTitle?: boolean;
  groupFields?: boolean;
  cardLayout?: boolean;
  columnsPerRow?: number;
}

export interface TableAction {
  id: string;
  label: string;
  type: 'navigate' | 'api' | 'modal' | 'form' | 'confirm' | 'updateDataset' | 'insertDataset' | 'deleteDataset' | 'updateDatabase' | 'insertDatabase' | 'deleteDatabase' | 'transactionDatabase' | 'download' | 'taskCall' | 'taskExecute';
  icon?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'approve' | 'reject' | 'success' | 'warning' | 'info';
  config: TableActionConfig;
  /** @deprecated Prefer actionVisibility; still normalized at runtime for older configs */
  visibilityCondition?: VisibilityCondition;
  actionVisibility?: FormActionVisibility;

  position?: 'global' | 'row';

  inputMode?: 'direct' | 'form';

  formOptions?: {
    title?: string;
    width?: number;
    submitText?: string;
    cancelText?: string;
    description?: string;
    allowEdit?: string[];
    hiddenFields?: string[];
    fieldLabels?: Record<string, string>;
    fieldOrder?: string[];
  };

  triggerMode?: 'button' | 'rowClick';
}

export interface TableActionConfig {

  targetPage?: string;
  openInNewTab?: boolean;

  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';

  updateDataset?: UpdateDatasetConfig;
  insertDataset?: InsertDatasetConfig;
  deleteDataset?: DeleteDatasetConfig;

  updateDatabase?: UpdateDatabaseConfig;
  insertDatabase?: InsertDatabaseConfig;
  deleteDatabase?: DeleteDatabaseConfig;

  transactionDatabase?: TransactionDatabaseConfig;

  taskCall?: {
    taskId: string | {
      source: 'parameter' | 'static';
      paramName?: string;
      value?: string;
    };

    parameterMapping?: Record<string, {
      source: 'static' | 'formField' | 'parameter' | 'database' | 'column';
      value: string;
      labelText?: string;
      requiredInTaskInput?: boolean;
      sortOrder?: number;
    }>;
    requireConfirmation?: boolean;
    confirmMessage?: string;
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: { type: 'refresh' | 'navigate' | 'message'; message?: string; targetPage?: string; };
    onError?: { type: 'message' | 'console'; message?: string; };
  };

  taskExecute?: {
    taskId: string | {
      source: 'parameter' | 'static';
      paramName?: string;
      value?: string;
    };

    parameterMapping?: Record<string, {
      source: 'static' | 'formField' | 'parameter' | 'database' | 'column';
      value: string;
      labelText?: string;
      requiredInTaskInput?: boolean;
      sortOrder?: number;
    }>;

    interactiveMode?: 'professional' | 'normal';

    refreshAfterSuccess?: boolean;

    successMessage?: string;
    errorMessage?: string;
  };

  parameterMapping?: {
    [paramKey: string]: {
      source: 'column' | 'static' | 'computed' | 'parameter';
      value: string; 
      transform?: string; 
      required?: boolean; 
    };
  };

  requireConfirmation?: boolean;
  confirmMessage?: string;

  requireValidation?: boolean; 

  successMessage?: string;
  errorMessage?: string;
}

export interface UpdateDatasetConfig {

  targetDatasetId: string | {
    source: 'parameter' | 'static';
    paramName?: string;
    value?: string;
  };

  fieldOrder?: string[];

  updateFields: {
    [fieldName: string]: {
      source: 'column' | 'static' | 'parameter' | 'computed' | 'input_field' | 'datasource';
      value: string;
      required?: boolean;
      fieldType?: 'VARCHAR' | 'INT32' | 'FLOAT' | 'BOOL' | 'JSON' | 'ARRAY';
      title?: string; 
      datasourceConfig?: {
        datasetId?: string;
        valueField?: string;
        labelField?: string;
        filter?: string;
      };
    };
  };

  updateConditions: {
    [fieldName: string]: {
      id?: string; 
      source: 'column' | 'static' | 'parameter' | 'input_field' | 'field';
      value: string;
      operator?: 'equals' | 'in';
    };
  };
}

export interface InsertDatasetConfig {

  targetDatasetId: string | {
    source: 'parameter' | 'static';
    paramName?: string;
    value?: string;
  };

  fieldOrder?: string[];

  insertFields: {
    [fieldName: string]: {
      source: 'column' | 'static' | 'parameter' | 'computed' | 'input_field' | 'datasource';
      value: string;
      required?: boolean;
      fieldType?: 'VARCHAR' | 'INT32' | 'FLOAT' | 'BOOL' | 'JSON' | 'ARRAY';
      title?: string; 
      datasourceConfig?: {
        datasetId?: string;
        valueField?: string;
        labelField?: string;
        filter?: string;
      };
    };
  };
}

export interface DeleteDatasetConfig {

  targetDatasetId: string | {
    source: 'parameter' | 'static';
    paramName?: string;
    value?: string;
  };

  deleteConditions: {
    [fieldName: string]: {
      id?: string; 
      source: 'column' | 'static' | 'parameter' | 'field';
      value: string;
      operator?: 'equals' | 'in';
    };
  };
  requireConfirmation?: boolean;
  confirmMessage?: string;
}

export interface UpdateDatabaseConfig {

  targetDatasourceId: string;

  /** Pin a datasource version; omit to use the default version */
  targetDatasourceVersion?: number;

  fieldOrder?: string[];

  updateFields: {
    [fieldName: string]: {
      source: 'column' | 'static' | 'parameter' | 'computed' | 'input_field' | 'user' | 'display_only';
      value: string;
      required?: boolean;
      fieldType?: 'VARCHAR' | 'INT32' | 'FLOAT' | 'BOOL' | 'JSON' | 'DATETIME';
      defaultValue?: any;
      transform?: string;
      title?: string;
      validation?: {
        min?: number;
        max?: number;
        minRef?: { source: 'field' | 'record'; key: string };
        maxRef?: { source: 'field' | 'record'; key: string };
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        message?: string;
      };
    };
  };

  updateConditions: {
    [fieldName: string]: {
      id?: string; 
      source: 'column' | 'static' | 'parameter' | 'input_field' | 'computed';
      value: string;
      operator?: 'equals' | 'not_equals' | 'in' | 'not_in' | 'like' | 'between';
    };
  };

  validation?: {
    [fieldName: string]: {
      type?: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'range' | 'custom';
      min?: number;
      max?: number;
      minRef?: { source: 'field' | 'record'; key: string };
      maxRef?: { source: 'field' | 'record'; key: string };
      value?: any;
      message?: string;
    };
  };
}

export type TransactionDatabaseConfig = UpdateDatabaseConfig;

export interface InsertDatabaseConfig {

  targetDatasourceId: string;

  /** Pin a datasource version; omit to use the default version */
  targetDatasourceVersion?: number;

  fieldOrder?: string[];

  insertFields: {
    [fieldName: string]: {
      source: 'column' | 'static' | 'parameter' | 'computed' | 'input_field' | 'user' | 'display_only';
      value: string;
      required?: boolean;
      fieldType?: 'VARCHAR' | 'INT32' | 'FLOAT' | 'BOOL' | 'JSON' | 'DATETIME';
      defaultValue?: any;
      transform?: string;
      title?: string;
    };
  };

  validation?: {
    [fieldName: string]: {
      type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'range' | 'custom';
      value?: any;
      message?: string;
    };
  };
}

export interface DeleteDatabaseConfig {

  targetDatasourceId: string;

  /** Pin a datasource version; omit to use the default version */
  targetDatasourceVersion?: number;

  deleteConditions: {
    [fieldName: string]: {
      id?: string; 
      source: 'column' | 'static' | 'parameter' | 'input_field';
      value: string;
      operator?: 'equals' | 'not_equals' | 'in' | 'not_in';
    };
  };

  requireConfirmation?: boolean;
  confirmMessage?: string;

  onSuccess?: { type: 'refresh' | 'navigate' | 'message'; message?: string; targetPage?: string; };
  onError?: { type: 'message' | 'console'; message?: string; };
}

export interface VisibilityCondition {
  field: string;
  operator: 'equals' | 'in' | 'not_equals' | 'gt' | 'lt' | 'contains';
  value: any;
}

export type FormActionVisibilityOperator = VisibilityCondition['operator'];

export interface FormActionVisibilityClause {
  source: 'formField' | 'parameter';
  key: string;
  operator: FormActionVisibilityOperator;
  value: unknown;
}

/** Multiple clauses are combined with AND. Empty / omitted means always visible. */
export interface FormActionVisibility {
  clauses: FormActionVisibilityClause[];
}

export interface EnhancedComponentConfig {
  id: string;
  type: string;
  props: Record<string, any>;
  dataSource?: any;
  mockData?: any;
  children?: EnhancedComponentConfig[];
  parameterConfig?: ParameterConfig;
  actions?: TableAction[]; 
}

export interface AppConfig {
  appId: string;
  logo?: string;
  theme?: string;
  defaultPage?: string;
  /** When omitted, defaults to page-based landing (backward compatible). Use `navigation` with defaultNavigationKey. */
  defaultOpenType?: 'page' | 'navigation';
  /** Nav item key when defaultOpenType is `navigation`. */
  defaultNavigationKey?: string;

  hideTabBar?: boolean;
  /** Mobile drill-down pages show a floating, draggable back pill at the left edge. Default off. */
  floatingBackButton?: boolean;
  /** When on, every page footer shows a muted "View publish history" link. Default off. */
  showPublishHistory?: boolean;
  /** Existing page the footer link opens (required for the link to appear). */
  publishHistoryPageKey?: string;
  layout: {
    type: string;
    headerActions?: string[];
    menuPosition?: 'side' | 'top' | 'mix';
  };
  navigation: {
    items: NavigationItem[];
  };
}

export * from './types/application';
