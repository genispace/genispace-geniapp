import { ListRenderer } from './list/ListRenderers';
import { renderByType } from './base/BaseRenderers';
import { ContainerRenderer } from './container/ContainerRenderers';
import StatisticGroup from './statistics/StatisticGroup';
import TableRenderer from './table/TableRenderer';
import EditableTableRenderer from './editable-table/EditableTableRenderer';
import TabsRenderer from './tabs/TabsRenderer';
import CardRenderer from './card/CardRenderer';
import DataGridCard from './data-grid-card/DataGridCard';
import ChartRenderer from './chart/ChartRenderer';
import RadarChartRenderer from './radar-chart/RadarChartRenderer';
import MapChartRenderer from './map-chart/MapChartRenderer';
import EChartsChartRenderer from './echarts/EChartsChartRenderer';
import FilterPanelRenderer from './filter-panel/FilterPanelRenderer';
import {
  TypographyRenderer,
  TextRenderer,
  TitleRenderer,
  ParagraphRenderer,
} from './typography/TypographyRenderer';
import HeroCardRenderer from './hero-card/HeroCardRenderer';
import MetricCarouselRenderer from './metric-carousel/MetricCarouselRenderer';
import CollapsePanelRenderer from './collapse-panel/CollapsePanelRenderer';
import AnalyticsTableRenderer from './analytics-table/AnalyticsTableRenderer';
import ProductReportRenderer from './product-report/ProductReportRenderer';
import ProductDetailRenderer from './product-detail/ProductDetailRenderer';
import TileGridRenderer from './tile-grid/TileGridRenderer';
import RingStatRenderer from './ring-stat/RingStatRenderer';
import PublishHistoryRenderer from './publish/PublishHistoryRenderer';
import PublishPreviewEntryRenderer from './publish/PublishPreviewEntryRenderer';
import NavTileRenderer from './navigation/NavTileRenderer';
import AppIdentityListRenderer from './identity/AppIdentityListRenderer';
import IdentityAttributeAssignRenderer from './identity/IdentityAttributeAssignRenderer';
import LoadingRenderer from './base/LoadingRenderer';
import TaskInputRenderer from './task-input/TaskInputRenderer';
import ServiceDeskReporterRenderer from './service-desk/ServiceDeskReporterRenderer';
import SimpleTreeRenderer from './tree/SimpleTreeRenderer';
import { WorkflowComponent } from './workflow/WorkflowComponent';
import CustomContentRenderer from './custom-content/CustomContentRenderer';

import type {
  ListRendererProps,
  ContainerRendererProps,
  StatisticGroupProps,
  TableRendererProps,
  TabsRendererProps,
  CardRendererProps,
  DataGridCardProps,
  TextRendererProps,
  TitleRendererProps,
  ParagraphRendererProps,
  TypographyProps,
  TypographyContentSegment,
  TypographyDatabaseSegment,
  TypographySegmentTextType,
  TaskInputRendererProps,
  SimpleTreeRendererProps,
  RadarChartRendererProps,
  FilterPanelRendererProps,
  RenderersMap
} from './types';

const renderers: RenderersMap = {

  List: ListRenderer as React.FC<ListRendererProps>,

  Container: ContainerRenderer as React.FC<ContainerRendererProps>,

  StatisticGroup: StatisticGroup as React.FC<StatisticGroupProps>,

  Table: TableRenderer as React.FC<TableRendererProps>,

  EditableTable: EditableTableRenderer,

  DataGridCard: DataGridCard,

  Tabs: TabsRenderer,

  Card: CardRenderer,

  Chart: ChartRenderer,

  // Typography component
  Typography: TypographyRenderer,

  Text: TextRenderer,

  Title: TitleRenderer,

  Paragraph: ParagraphRenderer,

  TaskInputRenderer: TaskInputRenderer,
  ServiceDeskReporter: ServiceDeskReporterRenderer,

  Tree: SimpleTreeRenderer as React.FC<SimpleTreeRendererProps>,

  RadarChart: RadarChartRenderer as React.FC<RadarChartRendererProps>,

  MapChart: MapChartRenderer as React.FC<any>,

  EChartsChart: EChartsChartRenderer as React.FC<any>,

  FilterPanel: FilterPanelRenderer as React.FC<FilterPanelRendererProps>,

  HeroCard: HeroCardRenderer,
  MetricCarousel: MetricCarouselRenderer,
  CollapsePanel: CollapsePanelRenderer,
  AnalyticsTable: AnalyticsTableRenderer,
  ProductReport: ProductReportRenderer,
  ProductDetail: ProductDetailRenderer,
  TileGrid: TileGridRenderer,
  RingStat: RingStatRenderer,
  PublishHistory: PublishHistoryRenderer,
  PublishPreviewEntry: PublishPreviewEntryRenderer,

  NavTile: NavTileRenderer,

  AppIdentityList: AppIdentityListRenderer as React.FC<any>,
  IdentityAttributeAssign: IdentityAttributeAssignRenderer as React.FC<any>,

  WorkflowComponent: WorkflowComponent as React.FC<any>,
  CustomContent: CustomContentRenderer as React.FC<any>
};

export type {
  ListRendererProps,
  ContainerRendererProps,
  StatisticGroupProps,
  TableRendererProps,
  TabsRendererProps,
  CardRendererProps,
  DataGridCardProps,
  TextRendererProps,
  TitleRendererProps,
  ParagraphRendererProps,
  TypographyProps,
  TypographyContentSegment,
  TypographyDatabaseSegment,
  TypographySegmentTextType,
  TaskInputRendererProps,
  SimpleTreeRendererProps,
  RadarChartRendererProps,
  FilterPanelRendererProps
};

export {

  ListRenderer,

  ContainerRenderer,

  renderByType,

  StatisticGroup,

  TableRenderer,
  EditableTableRenderer,

  DataGridCard,

  TabsRenderer,

  CardRenderer,

  ChartRenderer,

  RadarChartRenderer,

  MapChartRenderer,

  EChartsChartRenderer,

  FilterPanelRenderer,

  HeroCardRenderer,
  MetricCarouselRenderer,
  CollapsePanelRenderer,
  AnalyticsTableRenderer,
  ProductReportRenderer,
  ProductDetailRenderer,
  TileGridRenderer,
  RingStatRenderer,
  PublishHistoryRenderer,
  PublishPreviewEntryRenderer,

  NavTileRenderer,

  AppIdentityListRenderer,
  IdentityAttributeAssignRenderer,

  // Typography component
  TypographyRenderer,

  TextRenderer,

  TitleRenderer,

  ParagraphRenderer,

  LoadingRenderer,

  renderers,

  TaskInputRenderer,
  ServiceDeskReporterRenderer,
  CustomContentRenderer,

  SimpleTreeRenderer
};
