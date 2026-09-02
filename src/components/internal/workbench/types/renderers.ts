import { ReactNode } from 'react';
import { DataSource, EnhancedDataSource } from './datasource';
import { TabItem, ChartType, TagColor, TagStatus } from './components';
import type { TableAction, NavigationItem } from '../types';

export type { TableAction };

export type TableDataType = Record<string, unknown>;

export type ColumnRenderType = {
  type:
    | 'Tag'
    | 'Progress'
    | 'Image'
    | 'yyyy-MM-dd'
    | 'yyyy-MM-dd HH:mm:ss'
    | 'Custom'
    
    | 'Stacked'
    | 'Delta'
    | 'PctBar'
    | 'RankBadge'
    | 'Currency'
    | 'Number';
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
    
    
    format?: 'currency-compact' | 'compact-k' | 'percent1' | 'number2' | 'number' | 'plain';
    
    mainField?: string;
    
    subField?: string;
    
    subFormat?: 'currency-compact' | 'compact-k' | 'percent1' | 'number2' | 'number' | 'plain';
    
    subPrefix?: string;
    
    subSuffix?: string;
    
    subKind?: 'value' | 'diffPct' | 'diffPP' | 'signed';
    
    baselineField?: string;
    
    emptyDash?: boolean;
    
    currency?: string;
    
    
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

export interface SwitchConfig {
  showText?: boolean;
  onText?: string;
  offText?: string;
}

export interface DictionaryDataSourceConfig {
  type: 'database';
  datasourceId?: string;
  /** Pin a datasource version; omit to use the default version */
  version?: number;
  matchConditions: Array<{
    tableField: string;
    dictionaryField: string;
  }>;
  displayField: string;

  backgroundColorField?: string;

  textColorField?: string;
}

export type TableColumnType = {
  key?: string;
  dataIndex: string;
  title: string;

  width?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  filterable?: boolean;
  filterType?: 'equals' | 'like' | 'in';
  filterOptions?: Array<{text: string; value: string}>;

  filterMultiSelect?: boolean;

  filterMaxTags?: number;

  filterPassMode?: 'filter' | 'parameter';

  filterParameterName?: string;
  editable?: boolean;
  editRequired?: boolean;
  hidden?: boolean;
  fieldType?: 'VARCHAR' | 'INT8' | 'INT16' | 'INT32' | 'INT64' | 'FLOAT' | 'DOUBLE' | 'BOOL' | 'JSON' | 'ARRAY' | 'DATE' | 'DATETIME' | 'TEXT' | 'SWITCH' | 'IMAGE';

  databaseFieldType?: 'number' | 'string' | 'boolean' | 'date';
  switchConfig?: SwitchConfig;
  render?: ColumnRenderType;

  dictionaryDataSource?: DictionaryDataSourceConfig;

  inputType?: 'text' | 'number' | 'color' | 'date' | 'select' | 'switch' | 'file';
  datasource?: {
    datasourceId?: string;
    /** Pin a datasource version; omit to use the default version */
    version?: number;
    valueField?: string;
    labelField?: string;
  };

  /** If set, table header shows this field’s value from the first loaded row */
  headerLabelField?: string;

  /** Pin column to the left; stays visible during horizontal scroll */
  frozen?: boolean;
};

export interface BaseRendererProps {
  type: string;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}

export interface TaskInputRendererProps {
  taskId?: string;
  className?: string;
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;

  onParameterChange?: (key: string, value: any) => void;
  componentId?: string;
  pageId?: string;
  tabId?: string;
}

export type ListItemTemplate = 'default' | 'ranking' | 'progress-task' | 'product-card';

export type ListSlotType =
  | 'title'
  | 'titleSuffix'
  | 'subtitle'
  | 'description'
  | 'tags'
  | 'avatar'
  | 'icon'
  | 'actions'
  | 'custom'
  | 'prefix'
  | 'extra'
  | 'extraTop'
  | 'meta'
  | 'progress'
  | 'metric';

export type ListColumnRenderType =
  | 'default'
  | 'Tag'
  | 'Image'
  | 'Icon'
  | 'Progress'
  | 'Switch'
  | 'Date'
  | 'yyyy-MM-dd'
  | 'yyyy-MM-dd HH:mm:ss'
  | 'Rank'
  | 'Number'
  | 'Currency'
  | 'Percent'
  | 'Trend'
  | 'RankChange';

export type ListColumnLineRole = 'primary' | 'secondary';

export interface ListRenderProps {
  max?: number;
  relativeTo?: 'none' | 'pageMax' | 'dataMax' | 'field';
  relativeField?: string;
  showPercent?: boolean;
  percentPosition?: 'right' | 'inside' | 'none';
  fullWidth?: boolean;
  barColor?: 'green' | 'purple' | 'blue' | 'primary' | string;
  barColorField?: string;
  /** Track (background) color: a token (green/indigo/emerald/…) → light tint, or a raw CSS color.
   *  When omitted, a token `barColor`/`barColorField` value auto-tints the track to its matching shade. */
  trackColor?: string;
  /** Per-row track color field — same idea as barColorField, but for the track/background. */
  trackColorField?: string;
  size?: 'sm' | 'md' | 'lg';
  iconSize?: 'sm' | 'md' | 'lg';
  iconVariant?: 'circle' | 'plain';
  iconColor?: string;
  rankSource?: 'index' | 'field';
  rankField?: string;
  rankOffset?: number;
  rankStyle?: 'circle' | 'rounded-square';
  topHighlight?: number;
  topColor?: 'orange' | 'gradient-orange' | string;
  defaultColor?: 'gray' | string;
  format?: 'plain' | 'thousands' | 'compact' | 'currency' | 'percent';
  prefix?: string;
  suffix?: string;
  decimals?: number;
  compactThreshold?: number;
  compactDivisor?: number;
  locale?: string;
  align?: 'left' | 'right' | 'center';
  fontWeight?: 'normal' | 'medium' | 'semibold';
  /** Number → exact px (inline style); legacy 'xs'/'sm'/'base' → text-xs/sm/base classes (12/14/16). */
  fontSize?: number | 'xs' | 'sm' | 'base';
  /** Render text in muted gray (text-slate-400, same as the sales-detail LY sub-line) — generic de-emphasis for text/number/date cells. */
  muted?: boolean;
  variant?: 'pill' | 'outline' | 'text';
  tagSize?: 'xs' | 'sm';
  /** Render only on highlighted rows; other rows render nothing (e.g. store-manager "own store only" cells). */
  onlyHighlighted?: boolean;
  /** Render nothing when the value is null/undefined/'' (default shows a muted dash). */
  hideWhenNull?: boolean;
  /** Optional leading label inside the badge/text (e.g. RankChange "YTD" / "last month"); { zh, en } resolved at render time. */
  label?: string | { zh?: string; en?: string };
  width?: number;
  height?: number;
}

export interface ListColumn {
  dataIndex: string;
  title?: string;
  slotType: ListSlotType;
  width?: string | number;
  slotIndex?: number;
  lineRole?: ListColumnLineRole;
  showLabel?: boolean;
  render?: {
    type?: ListColumnRenderType;
    colorMap?: Record<string, string>;
    textColorMap?: Record<string, string>;
    props?: ListRenderProps;
  };
  hidden?: boolean;
  fieldType?:
    | 'VARCHAR'
    | 'INT32'
    | 'INT64'
    | 'FLOAT'
    | 'BOOL'
    | 'DATE'
    | 'SWITCH'
    | 'JSON'
    | 'ARRAY'
    | 'IMAGE';
}

export interface ListItemLayoutConfig {
  template?: ListItemTemplate;
  rowClickAction?: TableAction;
  rowGap?: 'sm' | 'md' | 'lg';
  itemSpacing?: 'sm' | 'md';
}

export interface ListViewToggleOption {
  icon: string;
  value: string;
}

export interface ListViewToggleConfig {
  /** @deprecated Use top-level showDataView instead. Kept for legacy configs. */
  options?: ListViewToggleOption[];
  /** @deprecated Use local viewType state; optional param sync only. */
  defaultValue?: string;
  broadcastParameter?: string;
  chartProps?: Record<string, unknown>;
}

export interface ListHeaderExtra {
  viewToggle?: ListViewToggleConfig;
  link?: {
    label?: string;
    action?: TableAction;
  };
}

/** A quick-filter pill for List/AnalyticsTable toolbars. */
export interface ListPill {
  value: string;
  label?: unknown; // string | { zh; en }
  color?: string;
  filter?: { field: string; eq: unknown };
}

export interface ListRendererProps {
  dataSource?: Record<string, unknown>[];
  loading?: boolean;
  itemLayout?: 'horizontal' | 'vertical';
  size?: 'large' | 'default' | 'small';
  bordered?: boolean;
  split?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  title?: string;
  pagination?: boolean | {
    pageSize?: number;
    current?: number;
    total?: number;
    showSizeChanger?: boolean;
    showTotal?: boolean;
  };
  pageSize?: number;
  grid?: unknown;
  renderItem?: (item: Record<string, unknown>, index: number) => ReactNode;
  className?: string;
  useMockData?: boolean;
  mockData?: Record<string, unknown>[];
  id?: string;
  customStyles?: import('./components').CustomStylesConfig;

  columns?: ListColumn[];
  /** Same as Table: split row vs toolbar by position; used when rowActions/toolbarActions are unset */
  actions?: TableAction[];
  rowActions?: TableAction[];
  showRowActions?: 'always' | 'hover';
  toolbarActions?: TableAction[];
  showToolbar?: boolean;
  showRefresh?: boolean;

  selectionType?: 'none' | 'single' | 'multiple';
  rowKey?: string;
  selectedRowIds?: (string | number)[];
  onSelectionChange?: (
    selectedIds: (string | number)[],
    selectedRows: Record<string, unknown>[]
  ) => void;

  databaseDataSourceConfig?: import('./databaseDataSource').DatabaseDataSourceConfig;
  enhancedDataSource?: EnhancedDataSource;
  parameterConfig?: import('../types').ParameterConfig;
  componentParameterConfig?: {
    enableParameterReceiving?: boolean;
    listenToParameters?: string[];
  };
  pageParams?: Record<string, unknown>;
  datasetConfig?: {
    datasetId: string;
    params?: Record<string, unknown>;
  };

  enableSort?: boolean;
  defaultSort?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  enableExport?: boolean;

  /**
   * Row search + quick-filter pills (config-driven; mirrors AnalyticsTable toolbar).
   * When `pillParam` is set, selecting a pill re-queries the datasource with
   * `{ [pillParam]: activePill.value }` (server-side filtering) instead of filtering loaded rows.
   * When `searchParam` is set, the (debounced) search text is likewise sent as a query param
   * and client-side search filtering is skipped — the SQL is expected to ILIKE-match it.
   */
  toolbar?: { search?: boolean; searchFields?: string[]; pills?: ListPill[]; pillParam?: string; searchParam?: string };
  /** Highlight the row whose `field` equals a static `value` or a live bus param `valueParam`.
   * `memberField`: optional CSV column of group-member ids — the row also highlights when the
   * value matches any member (e.g. a live sub-store selects its main-store rollup row). */
  highlightRow?: { field: string; value?: string; valueParam?: string; memberField?: string; badge?: unknown };
  /** Small status dots before the title (e.g. focused / new-door); shown when row[field] == eq (eq omitted → truthy). */
  statusDots?: Array<{ field: string; eq?: unknown; color?: string }>;

  itemLayoutConfig?: ListItemLayoutConfig;
  /** When true, shows chart/data toggle in header (same as Chart.showDataView). */
  showDataView?: boolean;
  /** Optional ECharts props for chart view when chartProps is not in headerExtra.viewToggle. */
  chartViewProps?: Record<string, unknown>;
  headerExtra?: ListHeaderExtra;
  onParameterChange?: (key: string, value: unknown) => void;
  componentId?: string;
  pageId?: string;
  tabId?: string;
  /** Workbench sidebar navigation items — used to attach `_nav` when opening pages */
  navigationItems?: NavigationItem[];
}

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
}

export interface TitleRendererProps {
  content?: string | React.ReactNode;
  level?: 1 | 2 | 3 | 4 | 5;
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
}

export interface ParagraphRendererProps {
  content?: string | React.ReactNode;
  code?: boolean;
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

  databaseDataSourceConfig?: import('./databaseDataSource').DatabaseDataSourceConfig | null;
}

/** 1–6 columns; used for Table / EditableTable filter field responsive grid. */
export type FilterPanelGridColumnCount = 1 | 2 | 3 | 4 | 5 | 6;

export interface FilterPanelGridColumns {
  base?: FilterPanelGridColumnCount;
  sm?: FilterPanelGridColumnCount;
  md?: FilterPanelGridColumnCount;
  lg?: FilterPanelGridColumnCount;
  xl?: FilterPanelGridColumnCount;
}

/** Default `filter_panel_footer` matches legacy: apply button in filter area bottom-right. */
export type ApplyFilterButtonPlacement =
  | 'filter_panel_footer'
  | 'filter_grid_trailing'
  | 'toolbar_leading';

export interface TableRendererProps {
  columns: TableColumnType[];
  dataSource: TableDataType[];
  loading?: boolean;
  rowKey?: string;
  showTotal?: boolean;
  className?: string;
  title?: string;
  showRefresh?: boolean;
  showSettings?: boolean;
  showToolbar?: boolean;
  addable?: boolean;
  editable?: boolean;
  deletable?: boolean;
  enableExport?: boolean;
  onDataSourceChange?: (data: TableDataType[]) => void;

  id?: string;
  customStyles?: import('./components').CustomStylesConfig;
  pagination?: {
    pageSize?: number;
    current?: number;
    total?: number;
    showSizeChanger?: boolean;
    showTotal?: boolean;
    style?: 'default' | 'simple'; 
  };

  datasetConfig?: {
    datasetId: string;
    params?: {
      limit?: number;
      offset?: number;
      outputFields?: string[];
      [key: string]: unknown;
    };

    useAutoId?: boolean;
  };

  enhancedDataSource?: EnhancedDataSource;

  databaseDataSourceConfig?: import('./databaseDataSource').DatabaseDataSourceConfig;

  
  summaryDataSourceConfig?: import('./databaseDataSource').DatabaseDataSourceConfig | null;
  
  summaryLabel?: string;

  useMockData?: boolean;
  mockData?: TableDataType[];

  parameterConfig?: any;

  componentParameterConfig?: {
    enableParameterReceiving?: boolean;
    listenToParameters?: string[];
  };

  actions?: TableAction[];

  /**
   * Optional record drill-down contract. Existing tables without this property
   * keep their current selection/editing behaviour.
   */
  recordInteraction?: {
    enabled?: boolean;
    trigger?: 'rowClick' | 'actionOnly';
    titleField?: string;
    subtitleFields?: string[];
    fields?: Array<{
      name: string;
      label?: string;
      hidden?: boolean;
      format?: 'text' | 'number' | 'date' | 'datetime' | 'json' | 'multiline';
      nestedFieldLabels?: Record<string, string>;
    }>;
    sections?: Array<{
      id: string;
      title?: string;
      fields: string[];
    }>;
    edit?: {
      enabled?: boolean;
      action?: TableAction;
    };
  };

  pageParams?: Record<string, unknown>;

  availableParameters?: Array<{ label: string; value: string; type?: string }>;

  onRowClick?: (record: Record<string, unknown>, columnKey?: string) => void;

  /** When true and onRowClick is omitted, row click does not toggle row selection (EditableTable without row-click action). */
  skipDefaultRowSelection?: boolean;

  onCellClick?: (record: Record<string, unknown>, columnKey: string) => void;

  onRowFocusOut?: (e: React.FocusEvent<HTMLTableRowElement>, rowId: string) => void;

  editingRowId?: string | null;

  rowDisplayPatches?: Record<string, Record<string, unknown>>;

  /** Per-breakpoint filter field grid. Defaults: base 1, md 3. */
  filterPanelGridColumns?: FilterPanelGridColumns;
  /**
   * Where to show the "Apply filters" action. "Reset" stays on the filter panel header row.
   * - filter_panel_footer: full-width row below the grid, right-aligned
   * - filter_grid_trailing: last cell in the same responsive grid as filter fields
   * - toolbar_leading: first control in the table header toolbar (before global actions)
   */
  applyFilterButtonPlacement?: ApplyFilterButtonPlacement;
  
  rowStriped?: boolean;
  
  tableStyle?: { headerVariant?: 'muted' | 'default' };
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

export interface TreeRendererProps {
  parentKey?: string;
  key?: string;
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
  Tree?: React.FC<TreeRendererProps>;
  [key: string]: React.FC<any> | undefined;
}
