import { ReactNode } from 'react';
import { DataSource } from './datasource';

export interface CustomStylesConfig {

  rootStyles?: React.CSSProperties;

  childStyles?: {
    [selector: string]: React.CSSProperties;
  };

  stateStyles?: {
    [state: string]: React.CSSProperties;
  };

  responsiveStyles?: {
    [breakpoint: string]: React.CSSProperties;
  };

  customCss?: string;
}

export type ComponentTypeName =
  | 'Form'
  | 'Table'
  | 'EditableTable'
  | 'Chart'
  | 'StatisticGroup'
  | 'DataGridCard'
  | 'Container'
  | 'Tabs'
  | 'Typography'
  | 'HeroCard'
  | 'MetricCarousel'
  | 'CollapsePanel'
  | 'AnalyticsTable'
  | 'ProductReport'
  | 'ProductDetail'
  | 'TileGrid'
  | 'RingStat'
  | 'PublishHistory'
  | 'PublishPreviewEntry'
  | 'NavTile'
  | 'AppIdentityList'
  | 'IdentityAttributeAssign'
  | 'WorkflowComponent'
  | 'CustomContent'
  | 'Card'
  | 'List'
  | 'TaskInput'
  | 'ServiceDeskReporter'
  | 'Tree'
  | 'FilterPanel'
  | 'EChartsChart'
  | 'MapChart'
  | 'RadarChart';

export interface BaseComponent {
  type: string;
  id: string;
  props: Record<string, any>;
  dataSource?: DataSource;
  mockData?: any[];
}

export type LayoutType = 'fluid' | 'fixed' | 'card';

export type ChartType = 'line' | 'column' | 'pie';

export type TagColor = 'blue' | 'orange' | 'green' | 'red' | 'gold' | 'default';

export type TagStatus = 'active' | 'inactive' | 'vip' | 'interviewing' | 'matching' | 'offered' | 'pending' | 'closed';

/** 24-column grid layout (page or container / tab). */
export type Grid24Preset =
  | 'single'
  | 'two-equal'
  | 'three-equal'
  | 'two-ratio-1-2'
  | 'two-ratio-2-1'
  | 'two-ratio-3-1'
  | 'four-equal'
  | 'top-bottom'
  | 'top-three-bottom'
  | 'dashboard'
  | 'custom';

export interface Grid24Component {
  id: string;
  colStart: number;
  colSpan: number;
  rowStart: number;
  rowSpan: number;
}

export interface Grid24LayoutConfig {
  type: 'grid-24';
  preset?: Grid24Preset;
  columns: 24;
  gap: number;
  rowGap: number;
  rowHeight: number;
  components: Grid24Component[];
  /** Mobile stacked-flow display order (top-level component ids). Absent =
      grid reading order (rowStart, then colStart). Edited in the studio's
      phone preset; never affects the desktop grid. */
  mobileOrder?: string[];
}

export interface TabItem {
  key: string;
  label: string;

  children?: React.ReactNode; 
  component?: any; 
  components?: any[]; 
  render?: () => React.ReactNode; 

  /** Per-tab layout when using 24-column grid inside Tabs. */
  layout?: Grid24LayoutConfig;

  componentConfig?: {
    type: 'single' | 'multiple';
    data?: any;
    props?: Record<string, any>;
  };
}

export interface StatisticItem {
  key: string;
  title: string;
  value: number;
  icon: string;
  statisticType?: 'manual' | 'count' | 'sum' | 'avg' | 'max' | 'min' | 'column';
  statisticField?: string;
  statisticCondition?: string;
  datasetId?: string;

  databaseDataSourceConfig?: import('./databaseDataSource').DatabaseDataSourceConfig | null;

  useCustomDataSource?: boolean;
  trend?: {
    enabled?: boolean;
    trendCondition?: string;
    suffix?: string;
    description?: string;
    upStyle?: 'success' | 'warning' | 'error';
    downStyle?: 'success' | 'warning' | 'error';
    value?: number;
    type?: 'up' | 'down';
    status?: 'success' | 'warning' | 'error';
  };
  [key: string]: unknown;
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
    type: 'Tag' | 'Progress';
    props?: {
      color?: Record<string, TagColor>;
      textColor?: Record<string, TagColor>;
      text?: Record<string, string>;
      status?: string;
      showInfo?: boolean;
      size?: 'small' | 'default' | 'large';
    };
  };
}

export interface PageRefreshConfig {
  enabled: boolean;
  interval: number;
}

export interface PageComingSoonConfig {
  enabled: boolean;
}

export interface PageFullscreenConfig {
  enabled: boolean;
  backgroundColor?: string;
  header?: {
    enabled: boolean;
    backgroundColor?: string;
    textColor?: string;

    platformLogoPath?: string;
    showPlatformName?: boolean;

    platformNameText?: string;
    platformNameColor?: string;

    platformNameFontSize?: number;
    showPlatformLogo?: boolean;
    showWorkbenchName?: boolean;

    workbenchNameText?: string;
    showWorkbenchLogo?: boolean;
    showRefreshRate?: boolean;
  };
}

export interface PageConfig {
  title: string;
  description?: string;
  layout: LayoutType;
  components: Component[];
  /** Optional page-root styles; absent keeps the legacy page appearance. */
  customStyles?: CustomStylesConfig;
  fullscreen?: PageFullscreenConfig;
  autoRefresh?: PageRefreshConfig;
  comingSoon?: PageComingSoonConfig;
}

import type { AppConfig } from '../types';

export interface WorkbenchConfig {
  appConfig: AppConfig;
  pages: Record<string, PageConfig>;
  themeId?: string;
  metadata?: {
    locales?: Record<
      string,
      {
        appConfig?: Record<string, unknown>;
        pages?: Record<
          string,
          {
            title?: string;
            description?: string;
            components?: Record<string, Record<string, unknown>>;
          }
        >;
      }
    >;
  };
}

export interface BaseComponentConfig {
  id: string;
  type: ComponentTypeName;
  props?: Record<string, any>;
  dataSource?: DataSource;
  mockData?: any[];
  customStyles?: CustomStylesConfig;  
}

export interface ComponentWithStyles extends BaseComponentConfig {
  customStyles?: CustomStylesConfig;
}

export type Component = 
  | ({ type: 'Table'; id: string; props: any; dataSource?: DataSource; mockData?: any[]; customStyles?: CustomStylesConfig })
  | ({ type: 'EditableTable'; id: string; props: any; dataSource?: DataSource; mockData?: any[]; customStyles?: CustomStylesConfig })
  | ({ type: 'Chart'; id: string; props: any; dataSource?: DataSource; mockData?: any[]; customStyles?: CustomStylesConfig })
  | ({ type: 'StatisticGroup'; id: string; props: any; dataSource?: DataSource; mockData?: any[]; customStyles?: CustomStylesConfig })
  | ({ type: 'DataGridCard'; id: string; props: any; dataSource?: DataSource; mockData?: any[]; customStyles?: CustomStylesConfig })
  | ({ type: 'Container'; id: string; props: any; children: Component[]; customStyles?: CustomStylesConfig })
  | ({ type: 'Tabs'; id: string; props: any; customStyles?: CustomStylesConfig })
  | ({ type: 'Typography'; id: string; props: any; customStyles?: CustomStylesConfig })
  | ({ type: 'HeroCard'; id: string; props: any; mockData?: any[]; customStyles?: CustomStylesConfig; databaseDataSourceConfig?: import('./databaseDataSource').DatabaseDataSourceConfig })
  | ({ type: 'NavTile'; id: string; props: any; customStyles?: CustomStylesConfig })
  | ({ type: 'AppIdentityList'; id: string; props: any; customStyles?: CustomStylesConfig })
  | ({ type: 'IdentityAttributeAssign'; id: string; props: any; customStyles?: CustomStylesConfig })
  | ({ type: 'WorkflowComponent'; id: string; props: any; customStyles?: CustomStylesConfig })
  | ({ type: 'CustomContent'; id: string; props: any; customStyles?: CustomStylesConfig })
  | ({ type: 'Card'; id: string; props: any; customStyles?: CustomStylesConfig })
  | ({ type: 'List'; id: string; props: any; dataSource?: DataSource; mockData?: any[]; customStyles?: CustomStylesConfig })
  | ({ type: 'TaskInput'; id: string; props: any; customStyles?: CustomStylesConfig })
  | ({ type: 'ServiceDeskReporter'; id: string; props: any; customStyles?: CustomStylesConfig })
  | ({ type: 'Tree'; id: string; props: any; dataSource?: DataSource; mockData?: any[]; customStyles?: CustomStylesConfig })
  | ({ type: 'Form'; id: string; props: any; dataSource?: DataSource; mockData?: any[]; customStyles?: CustomStylesConfig })
  | ({ type: 'MapChart'; id: string; props: any; dataSource?: DataSource; mockData?: any[]; customStyles?: CustomStylesConfig })
  | ({ type: 'RadarChart'; id: string; props: any; dataSource?: DataSource; mockData?: any[]; customStyles?: CustomStylesConfig })
  | ({ type: 'EChartsChart'; id: string; props: any; dataSource?: DataSource; mockData?: any[]; customStyles?: CustomStylesConfig })
  | ({ type: 'RingStat'; id: string; props: any; dataSource?: DataSource; mockData?: any[]; customStyles?: CustomStylesConfig; databaseDataSourceConfig?: import('./databaseDataSource').DatabaseDataSourceConfig })
  // Self-sourced (fetches its own publish history via the API) — no dataSource
  | ({ type: 'PublishHistory'; id: string; props: any; customStyles?: CustomStylesConfig })
  // Self-sourced (reads the current workbench's publish status via the API) — no dataSource
  | ({ type: 'PublishPreviewEntry'; id: string; props: any; customStyles?: CustomStylesConfig })
  | ({
      type: 'FilterPanel';
      id: string;
      props: any;
      dataSource?: DataSource;
      mockData?: any[];
      customStyles?: CustomStylesConfig;
    });
