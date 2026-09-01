export const PORTABLE_WORKBENCH_COMPONENT_TYPES = [
  'Typography', 'Text', 'Title', 'Paragraph', 'Statistic', 'StatisticGroup',
  'Table', 'EditableTable', 'AnalyticsTable', 'DataGridCard', 'Chart',
  'EChartsChart', 'RadarChart', 'Form', 'TaskInput', 'TaskInputRenderer',
  'List', 'Tabs', 'Container', 'Card', 'CustomContent', 'FilterPanel',
] as const;

export type PortableWorkbenchComponentType = typeof PORTABLE_WORKBENCH_COMPONENT_TYPES[number];

export type WorkbenchNavigationItem = {
  key?: string;
  title?: string | Record<string, string>;
  icon?: string;
  linkedPage?: string;
  children?: WorkbenchNavigationItem[];
  visibility?: { devices?: Array<'desktop' | 'mobile'> };
  [key: string]: unknown;
};

export type WorkbenchComponentConfig = {
  id: string;
  type: PortableWorkbenchComponentType | string;
  props?: Record<string, unknown>;
  components?: WorkbenchComponentConfig[];
  children?: WorkbenchComponentConfig[];
  customStyles?: Record<string, unknown>;
  mockData?: unknown[];
  [key: string]: unknown;
};

export type WorkbenchPageConfig = {
  title?: string | Record<string, string>;
  description?: string | Record<string, string>;
  layout?: Record<string, unknown>;
  components?: WorkbenchComponentConfig[];
  customStyles?: Record<string, unknown>;
  [key: string]: unknown;
};

export type WorkbenchAppConfig = {
  appId?: string;
  name?: string | Record<string, string>;
  description?: string | Record<string, string>;
  defaultPage?: string;
  navigation?: { items?: WorkbenchNavigationItem[] };
  [key: string]: unknown;
};

export type WorkbenchConfig = {
  schemaVersion?: number;
  appConfig?: WorkbenchAppConfig;
  pages?: Record<string, WorkbenchPageConfig>;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};
