import { ListRenderer } from './ListRenderers';
import { renderByType } from './BaseRenderers';
import { ContainerRenderer } from './ContainerRenderers';
import StatisticGroup from './StatisticGroup';
import TableRenderer from './TableRenderer';
import EditableTableRenderer from './EditableTableRenderer';
import TabsRenderer from './TabsRenderer';
import CardRenderer from './CardRenderer';
import DataGridCard from './DataGridCard';
import ChartRenderer from './ChartRenderer';
import RadarChartRenderer from './RadarChartRenderer';
import MapChartRenderer from './MapChartRenderer';
import EChartsChartRenderer from './EChartsChartRenderer';
import FilterPanelRenderer from './FilterPanelRenderer';
import {
  TypographyRenderer,
  TextRenderer,
  TitleRenderer,
  ParagraphRenderer,
} from './TypographyRenderer';
import HeroCardRenderer from './HeroCardRenderer';
import MetricCarouselRenderer from './MetricCarouselRenderer';
import CollapsePanelRenderer from './CollapsePanelRenderer';
import AnalyticsTableRenderer from './AnalyticsTableRenderer';
import ProductReportRenderer from './ProductReportRenderer';
import ProductDetailRenderer from './ProductDetailRenderer';
import TileGridRenderer from './TileGridRenderer';
import RingStatRenderer from './RingStatRenderer';
import PublishHistoryRenderer from './PublishHistoryRenderer';
import PublishPreviewEntryRenderer from './PublishPreviewEntryRenderer';
import NavTileRenderer from './NavTileRenderer';
import AppIdentityListRenderer from './AppIdentityListRenderer';
import IdentityAttributeAssignRenderer from './IdentityAttributeAssignRenderer';
import LoadingRenderer from './LoadingRenderer';
import TaskInputRenderer from './TaskInputRenderer';
import ServiceDeskReporterRenderer from './ServiceDeskReporterRenderer';
import SimpleTreeRenderer from './SimpleTreeRenderer';
import { WorkflowComponent } from './WorkflowComponent';
import CustomContentRenderer from './CustomContentRenderer';

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
