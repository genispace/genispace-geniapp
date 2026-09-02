import { ReactNode } from 'react';
import type { CustomStylesConfig } from '../types/components';
import type { ComponentParameterConfig, ParameterRecord } from '../types/parameters';
import type { DatabaseDataSourceConfig } from '../types/databaseDataSource';

import {
  TableRendererProps,
  TableDataType,
  TableColumnType,
  ColumnRenderType
} from '../types/renderers';

export type {
  TableRendererProps,
  TableDataType,
  TableColumnType,
  ColumnRenderType
};

export interface LoadingRendererProps {
  text?: string;
  size?: 'small' | 'default' | 'large';
  className?: string;
  title?: string;
  height?: number;
  mode?: 'standalone' | 'overlay' | 'inline';
  showCard?: boolean;
  children?: React.ReactNode;
}

export interface TaskInputRendererProps {
  taskId?: string;
  className?: string;
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
}

import type {
  ListColumn,
  ListColumnRenderType,
  ListRendererProps,
  ListSlotType,
} from '../types/renderers';

export type { ListColumn, ListColumnRenderType, ListRendererProps, ListSlotType };

export interface TextRendererProps {
  content?: string | React.ReactNode;
  type?: 'secondary' | 'success' | 'warning' | 'danger';
  disabled?: boolean;
  mark?: boolean;
  strong?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
  copyable?: boolean | object;
  delete?: boolean;
  ellipsis?: boolean | object;
  keyboard?: boolean;
  fontSize?: string | number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;

  textType?: 'default' | 'secondary' | 'success' | 'warning' | 'danger';
}

export interface TitleRendererProps {
  content?: string | React.ReactNode;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  strong?: boolean;
  italic?: boolean;
  code?: boolean;
  keyboard?: boolean;
  copyable?: boolean | object;
  delete?: boolean;
  disabled?: boolean;
  ellipsis?: boolean | object;
  mark?: boolean;
  underline?: boolean;
  type?: 'secondary' | 'success' | 'warning' | 'danger';
  fontSize?: string | number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  textType?: 'default' | 'secondary' | 'success' | 'warning' | 'danger';
}

export interface ParagraphRendererProps {
  content?: string | React.ReactNode;
  code?: boolean;
  keyboard?: boolean;
  copyable?: boolean | object;
  delete?: boolean;
  disabled?: boolean;
  ellipsis?: boolean | object;
  mark?: boolean;
  strong?: boolean;
  italic?: boolean;
  underline?: boolean;
  type?: 'secondary' | 'success' | 'warning' | 'danger';
  fontSize?: string | number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  textType?: 'default' | 'secondary' | 'success' | 'warning' | 'danger';
}

export interface ContainerRendererProps {
  children?: ReactNode;
  title?: string;
  titleLevel?: 1 | 2 | 3 | 4 | 5;
  divider?: boolean;
  className?: string;
  style?: React.CSSProperties;
  direction?: 'horizontal' | 'vertical';
  gutter?: number | [number, number];
  justify?: 'start' | 'end' | 'center' | 'space-around' | 'space-between';
  align?: 'top' | 'middle' | 'bottom';
  layout?: 'block' | 'flex' | 'grid';
  cols?: number[];
  padding?: number | string;
  margin?: number | string;
  background?: string;
  border?: boolean;
  borderRadius?: number | string;
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export interface StatisticGroupProps {
  data?: any[];
  loading?: boolean;
  cols?: number;
  gutter?: number | [number, number];
  className?: string;
  style?: React.CSSProperties;
}

export interface BaseRendererProps {
  type: string;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}

export interface TabItem {
  key: string;
  label: string;

  children?: React.ReactNode; 
  component?: any; 
  components?: any[]; 
  render?: () => React.ReactNode; 

  componentConfig?: {
    type: 'single' | 'multiple';
    data?: any;
    props?: Record<string, any>;
  };
}

export interface TabsRendererProps {
  items: TabItem[];
  defaultActiveKey?: string;
  className?: string;
  [key: string]: any;
}

export interface CardRendererProps {
  title?: string;
  description?: string;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export interface DataGridCardProps {
  title?: string;
  columns: Array<{
    key?: string;
    dataIndex: string;
    title: string;
    primary?: boolean;
    secondary?: boolean;
    render?: {
      type: string;
      props?: {
        color?: Record<string, string>;
        text?: Record<string, string>;
      };
    };
  }>;
  dataSource: any[];
  loading?: boolean;
  rowKey?: string;
  className?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  showRefresh?: boolean;
  showHeader?: boolean;
  onItemClick?: (record: any) => void;
  pagination?: {
    pageSize?: number;
    current?: number;
    total?: number;
    showSizeChanger?: boolean;
    showTotal?: boolean;
  };
  footerContent?: React.ReactNode;
}

export interface RenderersMap {
  List?: React.FC<ListRendererProps>;
  Container?: React.FC<ContainerRendererProps>;
  StatisticGroup?: React.FC<StatisticGroupProps>;
  Table?: React.FC<TableRendererProps>;
  Tabs?: React.FC<TabsRendererProps>;
  Card?: React.FC<CardRendererProps>;
  Text?: React.FC<TextRendererProps>;
  Title?: React.FC<TitleRendererProps>;
  Paragraph?: React.FC<ParagraphRendererProps>;
  DataGridCard?: React.FC<DataGridCardProps>;
  Tree?: React.FC<SimpleTreeRendererProps>;
  RadarChart?: React.FC<RadarChartRendererProps>;
  FilterPanel?: React.FC<FilterPanelRendererProps>;
  Chart?: React.FC<any>;
  [key: string]: React.FC<any> | undefined;
}

export type LayoutType = 'fluid' | 'fixed' | 'card';
export type ChartType = 'line' | 'column' | 'bar' | 'area' | 'pie' | 'radar' | 'heatmap' | 'composedBar' | 'overlapBar';
export type TagColor = 'blue' | 'orange' | 'green' | 'red' | 'gold' | 'default';
export type TagStatus = 'active' | 'inactive' | 'vip' | 'interviewing' | 'matching' | 'offered' | 'pending' | 'closed';

export interface DataSource {
  type: 'dataset';
  datasetId: string;
  datasetName?: string; 
  params: {
    filter?: string;
    limit?: number;
    offset?: number;
    outputFields: string[];
  };
}

export interface TableColumn {
  title: string;
  dataIndex: string;
  key: string;
  primary?: boolean;
  secondary?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  filterSearch?: boolean;
  editable?: boolean;
  hidden?: boolean;
  sorter?: boolean;
  filterOptions?: { text: string; value: string }[];
  render?: {
    type: 'Tag' | 'Progress' | 'Image';
    props?: {
      color?: Record<string, TagColor>;
      text?: Record<string, string>;
      status?: string;
      showInfo?: boolean;
      size?: 'small' | 'default' | 'large';
      width?: number;
      height?: number;
      preview?: boolean;
      fallback?: string;
    };
  };
}

export interface TableProps {
  title: string;
  pagination?: boolean | { pageSize: number };
  rowKey: string;
  showSearch?: boolean;
  showRefresh?: boolean;
  showSettings?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  showToolbar?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  addable?: boolean;
  editable?: boolean;
  deletable?: boolean;
  enableExport?: boolean;
  columns: TableColumn[];
}

export interface ChartProps {
  chartType: ChartType;
  title: string;
  height: number;

  chartHeight?: number;
  xField: string;
  yField: string | string[];
  seriesField?: string;
  meta?: Record<string, { alias: string }>;
  label?: {
    text?: string;
    position?: string;
    style?: Record<string, any>;
    type?: string;
    content?: string;
  };
  legend?: {
    position?: string;
    layout?: string;
  };
  smooth?: boolean;
  isGroup?: boolean;
  isStack?: boolean;
  radius?: number;
  tooltip?: {
    formatter?: string;
  };
}

export interface StatisticGroupProps {
  grid: {
    cols: number;
  };
  items: Array<{
    key: string;
    title: string;
    value: number;
    icon: string;
    trend?: {
      value: number;
      type: 'up' | 'down';
      suffix: string;
      status: 'success' | 'error' | 'warning' | 'default';
      description: string;
    };
  }>;
}

export interface ContainerProps {
  layout: 'grid' | 'flex';
  cols: number[];
  gutter: number;
  children: Component[];
}

export interface TabsProps {
  defaultActiveKey: string;
  type: 'card' | 'line';
  size?: 'large' | 'default' | 'small';
  children: Array<{
    type: 'TabPane';
    props: {
      key: string;
      label: string;
    };
    component: Component;
  }>;
}

export type TypographySegmentTextType =
  | 'default'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger';

export interface TypographySegmentCommonStyle {
  color?: string;
  textType?: TypographySegmentTextType;

  marginBefore?: string;

  marginAfter?: string;
}

export interface TypographyTextSegment extends TypographySegmentCommonStyle {
  kind: 'text';
  value: string;
}

export interface TypographyParameterSegment extends TypographySegmentCommonStyle {
  kind: 'parameter';
  source: string;
  fallback?: string;
}

export interface TypographyDatabaseSegment extends TypographySegmentCommonStyle {
  kind: 'database';
  field: string;
  statisticCondition?: string;
  useCustomDataSource?: boolean;
  databaseDataSourceConfig?: DatabaseDataSourceConfig | null;
  fallback?: string;
}

export type TypographyContentSegment =
  | TypographyTextSegment
  | TypographyParameterSegment
  | TypographyDatabaseSegment;

export interface TypographyProps {
  type: 'title' | 'paragraph' | 'text' | 'blockquote';
  content: string;

  contentSegments?: TypographyContentSegment[];
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  fontSize?: string | number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  textType?: 'default' | 'secondary' | 'success' | 'warning' | 'danger';
  strong?: boolean;
  italic?: boolean;
  underline?: boolean;
  delete?: boolean;
  mark?: boolean;
  code?: boolean;
  keyboard?: boolean;
  copyable?: boolean;
  ellipsis?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  customStyles?: CustomStylesConfig;
  loading?: boolean;
  useMockData?: boolean;
  mockData?: unknown;

  pageParams?: ParameterRecord;
  componentParameterConfig?: ComponentParameterConfig;
  componentId?: string;

  databaseDataSourceConfig?: DatabaseDataSourceConfig | null;

  followPageRefresh?: boolean;
}

export interface CardProps {
  title: string;
  content: string;
}

export interface ListProps {
  title: string;
  items: any[];
}

export interface TaskInputProps {
  taskId: string;
  title?: string;
  description?: string;
  showTitle?: boolean;
  showDescription?: boolean;
  autoSubmit?: boolean;
  submitButtonText?: string;
  showOptionalInputs?: boolean;
  compact?: boolean;
}

export interface ServiceDeskReporterProps {
  applicationId?: string;
  intakeDatasourceId?: string;
  submitDatasourceId?: string;
  myTicketsDatasourceId?: string;
  requesterDetailDatasourceId?: string;
  addActivityDatasourceId?: string;
  requesterActionDatasourceId?: string;
  title?: string;
  description?: string;
  submitButtonText?: string;
  showRecentTickets?: boolean;
  allowAttachments?: boolean;
  maxFiles?: number;
  maxFileSizeMb?: number;
  acceptedFileTypes?: string;
  defaultCategoryId?: string;
  defaultImpact?: 'high' | 'medium' | 'low';
  defaultUrgency?: 'high' | 'medium' | 'low';
  contextStoreParam?: string;
  contextBrandParam?: string;
  contextDashboardParam?: string;
  contextWidgetParam?: string;
  pageParams?: Record<string, unknown>;
}

export interface FilterPanelRendererProps {
  filters: Array<{
    key: string;
    type: 'select' | 'radio' | 'dateRange' | 'date' | 'text' | 'number' | 'tagInput';
    label: string;
    options?: Array<{ label: string; value: string }>;
    multiple?: boolean;
    defaultValue?: any;
    placeholder?: string;
    inline?: boolean;
    style?: React.CSSProperties;
    quickSelect?: boolean;
    quickSelectItems?: Partial<
      Record<'today' | 'yesterday' | 'yesterdayToToday' | 'last7days' | 'last30days', boolean>
    >;
    useSpecifiedTime?: boolean;
    showTimePicker?: boolean;
    specifiedStartTime?: string;
    specifiedEndTime?: string;
    displayWidth?: string;

    dropdownWidth?: string;
  }>;
  presets?: Array<{
    label: string;
    value: Record<string, any>;
  }>;
  onFilterChange?: (filters: Record<string, any>) => void;
  className?: string;
  title?: string;
  useMockData?: boolean;
}

export interface RadarChartRendererProps {

  data?: any[];
  loading?: boolean;
  useMockData?: boolean;
  mockData?: any[];

  title?: string;
  height?: number;
  className?: string;

  angleField?: string; 
  radiusField?: string | string[]; 

  colors?: string[];
  fillOpacity?: number;
  strokeWidth?: number;

  showTooltip?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  showAngleAxis?: boolean;
  showRadiusAxis?: boolean;

  meta?: {
    [key: string]: {
      alias?: string;
      formatter?: (value: any) => string;
    };
  };

  id?: string;
  customStyles?: CustomStylesConfig;

  showDataView?: boolean;
}

export interface SimpleTreeRendererProps {

  parentKey?: string;
  keyField?: string; 
  label?: string;
  sortKey?: string;

  dataSource?: any[];
  loading?: boolean;
  useMockData?: boolean;
  mockData?: any[];

  title?: string;
  searchable?: boolean;
  showIcon?: boolean;
  showCount?: boolean;
  defaultExpandLevel?: number;

  addable?: boolean;
  editable?: boolean;
  deletable?: boolean;

  className?: string;
  height?: number;

  datasetConfig?: {
    datasetId: string;
    params?: Record<string, any>;
    useAutoId?: boolean;
  };

  insertDatasetConfig?: {
    targetDatasetId: string | {
      source: 'parameter' | 'static';
      paramName?: string;
      value?: string;
    };
    insertFields: {
      [fieldName: string]: {
        source: 'column' | 'static' | 'parameter' | 'computed' | 'field';
        value: string;
        required?: boolean;
        fieldType?: 'VARCHAR' | 'INT32' | 'FLOAT' | 'BOOL' | 'JSON' | 'ARRAY';
      };
    };
  };

  updateDatasetConfig?: {
    targetDatasetId: string | {
      source: 'parameter' | 'static';
      paramName?: string;
      value?: string;
    };
    updateFields: {
      [fieldName: string]: {
        source: 'column' | 'static' | 'parameter' | 'computed' | 'field';
        value: string;
        required?: boolean;
        fieldType?: 'VARCHAR' | 'INT32' | 'FLOAT' | 'BOOL' | 'JSON' | 'ARRAY';
      };
    };
    updateConditions: {
      [fieldName: string]: {
        source: 'column' | 'static' | 'parameter' | 'field';
        value: string;
        operator?: 'equals' | 'in';
      };
    };
  };

  onSelect?: (node: any) => void;
  onAdd?: (parentNode: any) => void;
  onEdit?: (node: any) => void;
  onDelete?: (node: any) => void;
  onMoveUp?: (node: any) => void;
  onMoveDown?: (node: any) => void;
  onRefresh?: () => void;
}

export interface TreeProps {
  title: string;
  parentKey: string;
  key: string;
  label: string;
  sortKey: string;
  height: number;
  searchable: boolean;
  showIcon: boolean;
  showCount: boolean;
  defaultExpandLevel: number;
  addable: boolean;
  editable: boolean;
  deletable: boolean;
}

export interface BaseComponent {
  type: string;
  id: string;
  props: Record<string, any>;
  dataSource?: DataSource;
  mockData?: any[];
}

export type Component = 
  | { type: 'Table'; id: string; props: TableProps; dataSource?: DataSource; mockData?: any[] }
  | { type: 'Chart'; id: string; props: ChartProps; dataSource?: DataSource; mockData?: any[] }
  | { type: 'StatisticGroup'; id: string; props: StatisticGroupProps; dataSource?: DataSource; mockData?: any[] }
  | { type: 'DataGridCard'; id: string; props: DataGridCardProps; dataSource?: DataSource; mockData?: any[] }
  | { type: 'Container'; id: string; props: ContainerProps; children: Component[] }
  | { type: 'Tabs'; id: string; props: TabsProps }
  | { type: 'Typography'; id: string; props: TypographyProps }
  | { type: 'Card'; id: string; props: CardProps }
  | { type: 'List'; id: string; props: ListProps; dataSource?: DataSource; mockData?: any[] }
  | { type: 'TaskInput'; id: string; props: TaskInputProps }
  | { type: 'ServiceDeskReporter'; id: string; props: ServiceDeskReporterProps }
  | { type: 'Tree'; id: string; props: TreeProps; dataSource?: DataSource; mockData?: any[] };

export interface PageConfig {
  title: string;
  layout: LayoutType;
  components: Component[];
}

export interface NavigationItem {
  key: string;
  path: string;
  title: string;
  icon: string;
}

import { AppConfig } from '../types';
import { FormConfig, ParameterConfig } from '../types';

export interface WorkbenchConfig {
  appConfig: AppConfig;
  pages: Record<string, PageConfig>;
}

export interface BaseFormRendererProps {
  config: FormConfig;
  parameterConfig?: ParameterConfig;
  dataSource?: {
    type: string;
    datasetId: string;
    params?: Record<string, unknown>;
  };
  pageParams?: Record<string, unknown>;
  className?: string;
  useMockData?: boolean; 
  mockData?: Record<string, unknown>; 
  loading?: boolean; 
  onSubmitSuccess?: (data: unknown) => void; 
  onSubmitError?: (error: Error | string) => void; 

  id?: string;
  customStyles?: CustomStylesConfig;
}

export interface FormFieldRenderProps {
  field: Record<string, unknown>;
  value: unknown;
  errors: Record<string, string>;
  submitting: boolean;
  onChange: (fieldName: string, value: unknown) => void;
}
