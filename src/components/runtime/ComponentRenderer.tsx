import React, { useState, useEffect, useMemo, useCallback, useRef, useContext } from 'react';
import { toast } from '@genispace/shared-ui';
import { useTranslation } from 'react-i18next';
import {
  ListRenderer,
  renderers,
  StatisticGroup,
  TextRenderer,
  TitleRenderer,
  ParagraphRenderer,
  DataGridCard,
  CardRenderer,
  ContainerRenderer,
  ChartRenderer,
  RadarChartRenderer,
  MapChartRenderer,
  EChartsChartRenderer,
  TableRenderer,
  TabsRenderer,
  TypographyRenderer,
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
  type ListRendererProps,
  type ContainerRendererProps,
  TaskInputRenderer
} from '../renderers';
import { mapTabsConfigItemsForRenderer } from '../renderers/tabs/tabsItemMapping';
import SimpleTreeRenderer from '../renderers/tree/SimpleTreeRenderer';
import FormRenderer from '../renderers/form/FormRenderer';
import FilterPanelRenderer from '../renderers/filter-panel/FilterPanelRenderer';
import ServiceDeskReporterRenderer from '../renderers/service-desk/ServiceDeskReporterRenderer';
import { evaluateVisibleWhen, type VisibleWhen } from '@/utils/visibleWhen';
import { useVisibleWhenContext } from '@/hooks/useVisibleWhenContext';
import { getGrid24SizeCapability } from '@/utils/grid24LayoutSystem';
import { useGrid24FillCell } from '@/layout/grid24CellContext';
import { ComponentSkeleton } from '../skeleton';
import { workbenchApi, ComponentConfig as BaseComponentConfig } from '@/app/services/workbenchApi';
import { useParameterHandler, buildDataSourceFilters } from '../hooks/useParameterHandler';
import { ParameterConfig, TableAction, FormConfig, NavigationItem } from '../types';
import type { TableColumnType, TableDataType } from '../types/renderers';
import { ParameterContext } from '../contexts/ParameterContext';
import { ParameterRecord, ParameterContextValue, type ParameterValue } from '../types/parameters';
import { ComponentEditOverlay, useEditMode } from './runtime-mode';
import { componentTypes } from './componentTypes';
import type { CustomStylesConfig } from '../types/components';
import { createTransformsFromConfig } from '../utils/workflowTransformsUtils';

import type { DatabaseDataSourceConfig } from '../types/databaseDataSource';
import type { EnhancedDataSource } from '../types/datasource';
import {
  mergePageComponentConfig,
  resolveComponentMockRecord,
  resolveMockDataRows,
  resolveUseMockData,
} from '@/utils/resolveComponentMockFields';
import { resolveDatabaseDataSourceConfig } from '@/utils/resolveDatabaseDataSourceConfig';
import {
  MobileChartView,
  MobileEChartsView,
  MobileFormView,
  MobileListView,
  MobileTableView,
  MobileTabsView,
  MobileCardView,
} from '@/mobile/components/ComponentAdapter';
import { useMobileFlowLayout } from '../mobile/mobileFlowLayoutContext';

interface ExtendedComponentConfig extends BaseComponentConfig {
  parameterConfig?: ParameterConfig;
  actions?: TableAction[];
  component?: ExtendedComponentConfig; 
  useMockData?: boolean; 

  databaseDataSourceConfig?: DatabaseDataSourceConfig;

  enhancedDataSource?: EnhancedDataSource;

  componentParameterConfig?: {
    enableParameterReceiving?: boolean;
    listenToParameters?: string[];

  };

  customStyles?: CustomStylesConfig;
}

interface PageComponentRendererProps {
  component: ExtendedComponentConfig;
  appConfig: Record<string, unknown>;
  parentProps?: Record<string, unknown>;
  pageParams?: ParameterRecord; 
  parameterContext?: ParameterContextValue; 
  pageId?: string; 
  tabId?: string; 
  /** Depth of layout containers (Container/Card/Tabs) wrapping this node; page roots use 0. */
  nestingLevel?: number;
}

function parseWorkbenchBool(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined || value === null) return defaultValue;
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return defaultValue;
}

const PageComponentRenderer: React.FC<PageComponentRendererProps> = ({ 
  component, 
  appConfig,
  parentProps,
  pageParams: inheritedPageParams,
  pageId = 'default',
  tabId,
  nestingLevel = 0,
}) => {
  const { t, i18n } = useTranslation(['renderers']);
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<TableDataType[]>([]);
  const [layoutKey, setLayoutKey] = useState<number>(0);

  const [localComponent, setLocalComponent] = useState(component);

  useEffect(() => {
    setLocalComponent((prev) => mergePageComponentConfig(component, prev));
  }, [component, i18n.language]);

  const parameterContext = useContext(ParameterContext);

  const parameterContextRef = useRef(parameterContext);
  parameterContextRef.current = parameterContext;

  const {
    type,
    props = {},
    dataSource,
    mockData,
    children,
    parameterConfig
  } = localComponent;

  // Mobile component-view swaps (MobileTableView & co.) key off the narrow
  // FLOW, not the raw viewport: real mobile AND the studio phone frame both
  // get the mobile variants — the frame previews exactly what a device shows.
  const isMobileViewport = useMobileFlowLayout();

  const setDataWithLogging = useCallback((newData: TableDataType[]) => {

    setData(newData); 
  }, [data.length, type, component.id]);

  const pageParams = useMemo((): ParameterRecord => {

    if (parameterContext) {
      const tabParams = parameterContext.currentTabParams;
      if (tabParams && Object.keys(tabParams).length > 0) {
        return tabParams;
      }

      return parameterContext.globalUrlParams;
    }

    if (inheritedPageParams && Object.keys(inheritedPageParams).length > 0) {
      return inheritedPageParams;
    }

    return {};
  }, [parameterContext, inheritedPageParams]);

  
  
  const isPreviewMode = (localComponent as { __isPreview?: boolean }).__isPreview;
  const visibleWhen =
    (localComponent as { visibleWhen?: VisibleWhen }).visibleWhen ??
    ((localComponent.props as Record<string, unknown> | undefined)?.visibleWhen as
      | VisibleWhen
      | undefined);
  const visibleWhenCtx = useVisibleWhenContext(pageParams);
  const { isEditMode } = useEditMode();
  const fillCell = useGrid24FillCell();
  const wouldHideAtRuntime = !evaluateVisibleWhen(visibleWhen, visibleWhenCtx);
  // Edit mode keeps hidden components fully rendered (annotated with a read-only
  // condition badge) so they stay selectable, but still suppresses their DS fetch.
  const isHidden = wouldHideAtRuntime && !isPreviewMode && !isEditMode;
  const suppressFetch = wouldHideAtRuntime && !isPreviewMode;

  const parameterHandlerInput = useMemo(
    () => ({
      parameterConfig: ['Tree', 'Form'].includes(type) ? undefined : component.parameterConfig,
      pageParams,
      componentId: component.id,
      componentParameterConfig:
        ['Table', 'Chart', 'EChartsChart', 'MapChart', 'StatisticGroup', 'Typography', 'HeroCard', 'NavTile'].includes(type) &&
        !['Tree', 'Form'].includes(type)
          ? component.componentParameterConfig
          : undefined,
    }),
    [type, component.parameterConfig, component.id, component.componentParameterConfig, pageParams]
  );

  const {
    getParameterForDataSource,
    getParameterForProps,
    isParameterEnabled,
    broadcastParameter: broadcastParameterFromHook,
    subscribeToParameters,
    isListeningToParameters,
  } = useParameterHandler(parameterHandlerInput);

  const broadcastParameterForTreeForm = useCallback(
    (key: string, value: unknown) => {
      if (parameterContextRef.current) {
        parameterContextRef.current.broadcastParameterChange(
          key,
          value as ParameterValue,
          'component',
          localComponent.id
        );
      }
    },
    [localComponent.id]
  );

  const broadcastParameter = ['Tree', 'Form'].includes(type)
    ? broadcastParameterForTreeForm
    : broadcastParameterFromHook;

  const dataSourceId = useMemo(() => {
    if (!dataSource) return null;
    return `${dataSource.type}-${dataSource.datasetId || 'no-dataset'}`;
  }, [dataSource?.type, dataSource?.datasetId]);

  const paramsId = useMemo(() => {
    const paramKeys = Object.keys(pageParams).sort();
    const paramValues = paramKeys.map(key => `${key}:${pageParams[key]}`).join('|');
    return `${isParameterEnabled}-${paramValues}`;
  }, [pageParams, isParameterEnabled]);

  const listDatasetParamsKey = useMemo(
    () => (dataSource?.params ? JSON.stringify(dataSource.params) : ''),
    [dataSource?.params]
  );

  const listDatasetConfig = useMemo(() => {
    if (type !== 'List' || !dataSource?.datasetId) return undefined;
    return {
      datasetId: dataSource.datasetId,
      params: dataSource.params ?? {},
    };
  }, [type, dataSource?.datasetId, listDatasetParamsKey]);

  const listDatabaseConfigKey = useMemo(() => {
    if (type !== 'List') return '';
    const cfg = resolveDatabaseDataSourceConfig(localComponent);
    if (!cfg?.datasourceId) return '';
    return JSON.stringify({
      type: 'database-datasource' as const,
      datasourceId: cfg.datasourceId,
      sqlQuery: cfg.sqlQuery,
      parameters: cfg.parameters,
      parameterTypes: cfg.parameterTypes,
      defaultSort: cfg.defaultSort,
      enableSort: cfg.enableSort,
      outputFields: cfg.outputFields,
    });
  }, [type, localComponent]);

  const listDatabaseConfig = useMemo((): DatabaseDataSourceConfig | undefined => {
    if (!listDatabaseConfigKey) return undefined;
    return JSON.parse(listDatabaseConfigKey) as DatabaseDataSourceConfig;
  }, [listDatabaseConfigKey]);

  const mergedProps = useMemo(() => {

    let paramProps = {};
    if (isParameterEnabled && type !== 'Tree') { 
      try {
        paramProps = getParameterForProps();
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[PageComponentRenderer] Error getting parameter props for component ${localComponent.id}:`, error);
        }
      }
    }

    const baseProps = {
      ...parentProps,  
      ...props,        
      ...paramProps,   

      pageId,
      tabId,
      componentId: localComponent.id
    };

    const baseComponentProps = {
      ...baseProps,
      onParameterChange: broadcastParameter
    };

    if (type !== 'Tree') {
      return {
        ...baseComponentProps,
        subscribeToParameters,
        isListeningToParameters
      };
    }

    return baseComponentProps;
  }, [
    props, 
    parentProps, 
    isParameterEnabled, 
    localComponent.id, 
    pageId, 
    tabId, 
    type,
    broadcastParameter,

    ...(type !== 'Tree' ? [subscribeToParameters, isListeningToParameters] : [])
  ]);

  const resolvedUseMockData = resolveUseMockData(localComponent);
  const resolvedMockRows = resolveMockDataRows(localComponent);

  const fetchData = useCallback(async () => {

    if (!dataSource) {
      return;
    }

    setLoading(true);
    try {

      if (resolvedUseMockData && resolvedMockRows.length > 0) {
        setDataWithLogging(resolvedMockRows as TableDataType[]);
        setLoading(false);
        return;
      }

      if (mockData) {
        const normalizedData = Array.isArray(mockData) ? mockData : [mockData];
        setDataWithLogging(normalizedData as TableDataType[]);
        setLoading(false);
        return;
      }

      let dataSourceParams = {};
      if (isParameterEnabled) {
        try {
          dataSourceParams = getParameterForDataSource();
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[PageComponentRenderer] Error getting data source parameters for component ${component.id}:`, error);
          }
        }
      }

      const additionalFilters = parameterConfig?.dataSourceFilters 
        ? buildDataSourceFilters(parameterConfig.dataSourceFilters, pageParams)
        : {};

      const enhancedParams = {
        ...dataSource.params,
        ...dataSourceParams,
        ...additionalFilters
      };

      const response = await workbenchApi.getComponentData(
        dataSource,
        enhancedParams
      );

      if (response.success) {
        const normalizedData = Array.isArray(response.data) ? response.data : [response.data];
        setDataWithLogging(normalizedData as TableDataType[]);
      } else {
        toast({
          variant: "destructive",
          title: t('renderers:form.data_load_failed', 'Data Load Failed'),
          description: response.message,
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('renderers:form.unknown_error', 'Unknown error');
      console.error('获取组件数据失败:', error);
      toast({
        variant: "destructive",
        title: t('renderers:form.data_load_failed', 'Data Load Failed'),
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [
    type,
    dataSourceId, 
    paramsId, 
    mockData,
    resolvedUseMockData,
    resolvedMockRows,

    ...(type !== 'Tree' ? [isParameterEnabled] : []), 
    component.id
  ]);

  const stableFetchData = useRef(fetchData);
  stableFetchData.current = fetchData;

  useEffect(() => {

    if (suppressFetch) return;
    if (type !== 'Tree' && type !== 'List') {
      fetchData();
    }
  }, [suppressFetch, dataSourceId, paramsId, type, resolvedUseMockData, resolvedMockRows.length]);

  useEffect(() => {
    const debounce = <TArgs extends unknown[]>(
      func: (...args: TArgs) => void,
      wait: number,
    ): ((...args: TArgs) => void) => {
      let timeout: ReturnType<typeof setTimeout>;
      return (...args: TArgs) => {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    };

    const handleLayoutUpdate = debounce((event: CustomEvent) => {
      if (event.detail.componentId === component.id) {
        if (type !== 'Form' && type !== 'List') {
          setLayoutKey(prev => prev + 1);
        }
      }
    }, 100);

    const handleConfigUpdate = debounce((event: CustomEvent) => {
      if (event.detail.componentId === component.id) {

        setLocalComponent(event.detail.config);

        if (type !== 'List') {
          setLayoutKey(prev => prev + 1);
        }

        if (!dataSource) {
          setLoading(false);
        }
      }
    }, 100);

    const handleComponentRefresh = debounce((event: CustomEvent) => {
      if (event.detail.componentId === component.id) {

        if (type !== 'Form' && type !== 'List') {
          setLayoutKey(prev => prev + 1);
        }
        if (!dataSource) {
          setLoading(false);
        }
      }
    }, 100);

    const handlePageAutoRefresh = debounce((event: CustomEvent) => {
      const { componentIds, source } = event.detail || {};

      if (source === 'page-auto-refresh' && Array.isArray(componentIds) && componentIds.includes(component.id)) {

        if (type !== 'Form' && type !== 'List') {
          setLayoutKey(prev => prev + 1);
        }
        if (!dataSource) {
          setLoading(false);
        }

        if (broadcastParameter) {
          const timestamp = Date.now();
          broadcastParameter('tableRefreshTrigger', timestamp);
          broadcastParameter('chartRefreshTrigger', timestamp);
        }
      }
    }, 100);

    window.addEventListener('component-layout-updated', handleLayoutUpdate as EventListener);
    window.addEventListener('component-config-updated', handleConfigUpdate as EventListener);
    window.addEventListener('component-refresh', handleComponentRefresh as EventListener);
    window.addEventListener('page-auto-refresh-trigger', handlePageAutoRefresh as EventListener);

    return () => {
      window.removeEventListener('component-layout-updated', handleLayoutUpdate as EventListener);
      window.removeEventListener('component-config-updated', handleConfigUpdate as EventListener);
      window.removeEventListener('component-refresh', handleComponentRefresh as EventListener);
      window.removeEventListener('page-auto-refresh-trigger', handlePageAutoRefresh as EventListener);
    };
  }, [component.id, dataSource, type, broadcastParameter]); 

  const formConfig = useMemo(() => {

    const componentFields = (localComponent.props as any)?.fields || (mergedProps as any).fields;
    const componentTitle = (localComponent.props as any)?.title || (mergedProps as any).title;
    const componentDisplayConfig = (localComponent.props as any)?.displayConfig || (mergedProps as any).displayConfig;

    const config = {
      title: componentTitle || t('renderers:form.form', 'Form'),
      description: (localComponent.props as any)?.description || (mergedProps as any).description,
      mode: ((localComponent.props as any)?.mode || (mergedProps as any).mode) as FormConfig['mode'] || 'edit',
      layout: ((localComponent.props as any)?.layout || (mergedProps as any).layout) as FormConfig['layout'] || 'vertical',
      fields: (componentFields as FormConfig['fields']) || [],
      actions: (localComponent.props as any)?.actions || (mergedProps as any).actions,
      displayConfig: componentDisplayConfig,

      height: (localComponent.props as any)?.height || (mergedProps as any).height,
      heightMode: (localComponent.props as any)?.heightMode || (mergedProps as any).heightMode,

      layoutConfig: (localComponent.props as any)?.layoutConfig || (mergedProps as any).layoutConfig,
    };

    return config;
  }, [
    localComponent.id,
    JSON.stringify(localComponent.props),
    JSON.stringify(mergedProps)
  ]); 

  if (loading && type !== 'Tree' && type !== 'Form' && type !== 'List' && type !== 'HeroCard' && type !== 'NavTile' && type !== 'MetricCarousel' && type !== 'CollapsePanel'  && type !== 'AnalyticsTable' && type !== 'ProductReport' && type !== 'ProductDetail' && type !== 'TileGrid' && type !== 'RingStat' && type !== 'AppIdentityList' && type !== 'IdentityAttributeAssign') {
    const skeletonHeight =
      Number((localComponent.props as Record<string, unknown> | undefined)?.height) ||
      Number((mergedProps as Record<string, unknown> | undefined)?.height) ||
      undefined;
    return <ComponentSkeleton type={type} height={skeletonHeight} />;
  }

  const renderChildren = () => {
    if (!children) return null;

    return children.map((child, index) => (
      <PageComponentRenderer
        key={`${child.id || index}`}
        component={child as ExtendedComponentConfig}
        appConfig={appConfig}
        parentProps={mergedProps}
        pageParams={pageParams} 
        pageId={pageId} 
        tabId={tabId} 
        nestingLevel={nestingLevel + 1}
      />
    ));
  };

  const renderComponent = () => {
    const componentChildren = renderChildren();

    switch (type) {
      case 'Form': {
        if (!formConfig) return null;

        const stableFormConfig = formConfig;
        const stableDataSource = dataSource;
        const stablePageParams = pageParams;

        const formUseMockData = resolveUseMockData(localComponent);
        const formMockRecord = resolveComponentMockRecord(localComponent);

        const stableNativeConfig = {
          ...stableFormConfig,
          parameterConfig: localComponent.parameterConfig,
          dataSource: stableDataSource,
          pageParams: stablePageParams,
          id: localComponent.id,
          customStyles: localComponent.customStyles || {},
          style: {},
        };

        const stableClassName = ((mergedProps as Record<string, unknown>).className as string) || '';
        const stableCustomStyles = localComponent.customStyles || {};
        const stableOnParameterChange = broadcastParameter;
        const stableDatasetConfig = dataSource
          ? { datasetId: dataSource.datasetId, params: dataSource.params }
          : undefined;
        const stableParameterConfig = localComponent.parameterConfig || { enableParameterReceiving: false };
        const formRendererKey = `${localComponent.id}-${layoutKey}`;

        return isMobileViewport ? (
          <MobileFormView
            key={formRendererKey}
            config={stableNativeConfig}
            className={stableClassName}
            id={localComponent.id}
            customStyles={stableCustomStyles}
            parameterConfig={stableParameterConfig}
            pageParams={stablePageParams}
            dataSource={stableDataSource}
            datasetConfig={stableDatasetConfig}
            databaseDataSourceConfig={localComponent.databaseDataSourceConfig}
            enhancedDataSource={localComponent.enhancedDataSource}
            useMockData={formUseMockData}
            mockData={formMockRecord}
            onParameterChange={stableOnParameterChange}
            componentId={localComponent.id}
            pageId={pageId}
            tabId={tabId}
          />
        ) : (
          <FormRenderer
            key={formRendererKey}
            config={stableNativeConfig}
            className={stableClassName}
            id={localComponent.id}
            customStyles={stableCustomStyles}
            parameterConfig={stableParameterConfig}
            pageParams={stablePageParams}
            dataSource={stableDataSource}
            datasetConfig={stableDatasetConfig}
            databaseDataSourceConfig={localComponent.databaseDataSourceConfig}
            enhancedDataSource={localComponent.enhancedDataSource}
            useMockData={formUseMockData}
            mockData={formMockRecord}
            onParameterChange={stableOnParameterChange}
            componentId={localComponent.id}
            pageId={pageId}
            tabId={tabId}
          />
        );
      }

      case 'Table': {

        const tableComponentType = componentTypes.find(ct => ct.type === 'Table');
        const defaultMockData = tableComponentType?.mockData?.defaultValue?.dataSource || [];
        const tableColumns = ((mergedProps as any).columns as TableColumnType[]) || [];

        const tableRendererProps = {
          columns: tableColumns,
          dataSource: data,
          loading,
          rowKey: ((mergedProps as any).rowKey as string) || 'id',
          showTotal: (mergedProps as any).showTotal as boolean,
          title: (mergedProps as any).title as string,
          showRefresh: (mergedProps as any).showRefresh as boolean,
          showSettings: (mergedProps as any).showSettings as boolean,
          showToolbar: (mergedProps as any).showToolbar as boolean,
          addable: (mergedProps as any).addable as boolean,
          editable: (mergedProps as any).editable as boolean,
          deletable: (mergedProps as any).deletable as boolean,
          enableExport: (mergedProps as any).enableExport as boolean,
          className: (mergedProps as any).className as string,
          pagination: (mergedProps as any).pagination as {
            pageSize?: number;
            current?: number;
            total?: number;
            showSizeChanger?: boolean;
            showTotal?: boolean;
          },
          rowStriped: (mergedProps as any).rowStriped as boolean,
          titleFontSize: (mergedProps as any).titleFontSize as number,
          headerFontSize: (mergedProps as any).headerFontSize as number,
          cellFontSize: (mergedProps as any).cellFontSize as number,
          tableStyle: (mergedProps as any).tableStyle as { headerVariant?: 'muted' | 'default' },
          datasetConfig: dataSource
            ? { datasetId: dataSource.datasetId, params: dataSource.params }
            : undefined,
          databaseDataSourceConfig: localComponent.databaseDataSourceConfig,
          summaryDataSourceConfig: (localComponent as { summaryDataSourceConfig?: DatabaseDataSourceConfig | null }).summaryDataSourceConfig,
          summaryLabel: (mergedProps as { summaryLabel?: string }).summaryLabel,
          enhancedDataSource: localComponent.enhancedDataSource,
          useMockData: localComponent.useMockData || false,
          mockData: (localComponent.mockData as TableDataType[]) || defaultMockData,
          parameterConfig: localComponent.parameterConfig,
          componentParameterConfig: localComponent.componentParameterConfig,
          actions:
            (localComponent as any).actions || (mergedProps as any).actions,
          recordInteraction:
            (localComponent as any).recordInteraction || (mergedProps as any).recordInteraction,
          pageParams,
          id: localComponent.id,
          customStyles: localComponent.customStyles,
          onDataSourceChange: (newData: TableDataType[]) => {
            setDataWithLogging(newData);
            toast({
              title: t('renderers:table.update_success', 'Update successful'),
              description: t('renderers:table.record_updated', 'Record has been updated'),
            });
          },
        };

        if (isMobileViewport) {
          return <MobileTableView {...tableRendererProps} />;
        }

        return <TableRenderer {...tableRendererProps} />;
      }

      case 'DataGridCard': {
        const columns = ((mergedProps as any).columns as Array<{
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
        }>) || [];

        return <DataGridCard 
          columns={columns} 
          dataSource={data} 
          loading={loading}
          rowKey={((mergedProps as any).rowKey as string) || 'id'}
          title={(mergedProps as any).title as string}
          showSearch={(mergedProps as any).showSearch as boolean}
          showRefresh={(mergedProps as any).showRefresh as boolean}
          searchPlaceholder={(mergedProps as any).searchPlaceholder as string}
          className={(mergedProps as any).className as string}
          pagination={(mergedProps as any).pagination as { pageSize?: number; current?: number; total?: number; showSizeChanger?: boolean; showTotal?: boolean }}
          onItemClick={(mergedProps as any).onItemClick as (record: TableDataType) => void}
          footerContent={(mergedProps as any).footerContent as React.ReactNode}
          showHeader={(mergedProps as any).showHeader !== false}
          databaseDataSourceConfig={localComponent.databaseDataSourceConfig}
          useMockData={localComponent.useMockData || false}
          mockData={Array.isArray(localComponent.mockData) ? localComponent.mockData as any[] : []}
          id={localComponent.id}
          customStyles={localComponent.customStyles}
        />;
      }

      case 'Tabs': {

        const items = (mergedProps as any).items;
        if (items && Array.isArray(items)) {
          const tabItems = mapTabsConfigItemsForRenderer(items);

          const {
            defaultActiveKey = tabItems[0]?.key,
            ...otherProps
          } = mergedProps as any;

          const TabsComponent = isMobileViewport ? MobileTabsView : TabsRenderer;

          return (
            <TabsComponent
              items={tabItems}
              defaultActiveKey={defaultActiveKey}
              {...otherProps}
              appConfig={appConfig}
              pageParams={pageParams}
              pageId={pageId}
              tabId={tabId}
              id={localComponent.id}
              customStyles={localComponent.customStyles}
              nestingLevel={nestingLevel}
            />
          );
        }

        const tabItems = children?.map((child, index) => {
          const childConfig = child as ExtendedComponentConfig;
          const key = String(childConfig.props?.key || index);
          const content = childConfig.component ? (
            <PageComponentRenderer
              component={childConfig.component}
              appConfig={appConfig}
              parentProps={childConfig.props}
              pageParams={pageParams}
              pageId={pageId}
              tabId={tabId}
              nestingLevel={nestingLevel + 1}
            />
          ) : (
            <PageComponentRenderer
              component={childConfig}
              appConfig={appConfig}
              parentProps={childConfig.props}
              pageParams={pageParams}
              pageId={pageId}
              tabId={tabId}
              nestingLevel={nestingLevel + 1}
            />
          );

          return {
            key,
            label: String(childConfig.props?.label || `Tab ${index + 1}`),
            children: content
          };
        }) || [];

        const {
          defaultActiveKey = tabItems[0]?.key,
          ...otherProps
        } = mergedProps as any;

        const TabsComponent = isMobileViewport ? MobileTabsView : TabsRenderer;

        return (
          <TabsComponent
            items={tabItems}
            defaultActiveKey={defaultActiveKey}
            {...otherProps}
            appConfig={appConfig}
            pageParams={pageParams}
            pageId={pageId}
            tabId={tabId}
            id={localComponent.id}
            customStyles={localComponent.customStyles}
            nestingLevel={nestingLevel}
          />
        );
      }

      case 'List': {
        const { key, ...listProps } = mergedProps as Record<string, unknown>;
        const listUseMockData = resolveUseMockData(localComponent);
        const listMockRows = resolveMockDataRows(localComponent);
        const listTemplate = (listProps as ListRendererProps).itemLayoutConfig?.template;
        const isDashboardList =
          listTemplate === 'ranking' ||
          listTemplate === 'progress-task' ||
          listTemplate === 'product-card';
        const listRendererProps = {
          ...(listProps as ListRendererProps),
          actions:
            (localComponent.props as Record<string, unknown> | undefined)?.actions as
              | TableAction[]
              | undefined ??
            (localComponent as ExtendedComponentConfig).actions ??
            ((mergedProps as Record<string, unknown>).actions as TableAction[] | undefined),
          navigationItems:
            ((appConfig as { navigation?: { items?: NavigationItem[] } })?.navigation
              ?.items ?? []) as NavigationItem[],
          dataSource: data as Record<string, unknown>[],
          loading,
          useMockData: listUseMockData,
          mockData: listMockRows,
          id: localComponent.id,
          customStyles: localComponent.customStyles,
          databaseDataSourceConfig: listDatabaseConfig ?? undefined,
          enhancedDataSource:
            localComponent.enhancedDataSource ??
            (localComponent.dataSource as EnhancedDataSource | undefined),
          parameterConfig: localComponent.parameterConfig,
          componentParameterConfig: localComponent.componentParameterConfig,
          pageParams,
          datasetConfig: listDatasetConfig,
          onParameterChange: broadcastParameter,
          componentId: localComponent.id,
          pageId,
          tabId,
        };

        const ListComponent = isMobileViewport ? MobileListView : ListRenderer;

        return (
          <div
            className={
              isDashboardList
                ? ''
                : 'bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm'
            }
          >
            <ListComponent {...listRendererProps} />
          </div>
        );
      }

      case 'Text':
        return <TextRenderer content={(mergedProps as any).content} type={(mergedProps as any).type} className={(mergedProps as any).className} />;

      case 'Title':
        return <TitleRenderer content={(mergedProps as any).content} level={(mergedProps as any).level} className={(mergedProps as any).className} />;

      case 'Paragraph':
        return <ParagraphRenderer content={(mergedProps as any).content} className={(mergedProps as any).className} />;

      case 'Typography': {
        const { key, ...typographyProps } = mergedProps as any;
        const rawProps = (localComponent.props || {}) as Record<string, unknown>;
        return (
          <TypographyRenderer
            {...typographyProps}
            id={localComponent.id}
            customStyles={localComponent.customStyles}
            useMockData={localComponent.useMockData || false}
            mockData={localComponent.mockData}
            pageParams={pageParams}
            componentParameterConfig={localComponent.componentParameterConfig}
            componentId={localComponent.id}
            databaseDataSourceConfig={
              (localComponent.databaseDataSourceConfig ??
                (rawProps as { databaseDataSourceConfig?: DatabaseDataSourceConfig | null }).databaseDataSourceConfig) as
                | DatabaseDataSourceConfig
                | null
                | undefined
            }
          />
        );
      }

      case 'Chart': {

        const { key, ...chartProps } = mergedProps as any;
        const rawProps = (localComponent.props || {}) as Record<string, unknown>;

        const coalesce = (k: string): unknown =>
          rawProps[k] !== undefined ? rawProps[k] : chartProps[k];

        const gridBool = parseWorkbenchBool(coalesce('grid'), true);
        const showValueAxisGridBool = parseWorkbenchBool(coalesce('showValueAxisGrid'), true);
        const barLengthAdjustmentBool = parseWorkbenchBool(coalesce('barLengthAdjustment'), false);
        const showBarNumberBool = parseWorkbenchBool(coalesce('showBarNumber'), false);
        const barSizePxCandidate = coalesce('barSizePx');
        const barSizePxResolved =
          typeof barSizePxCandidate === 'number' && !Number.isNaN(barSizePxCandidate) && barSizePxCandidate > 0
            ? barSizePxCandidate
            : typeof chartProps.barSizePx === 'number' && !Number.isNaN(chartProps.barSizePx) && chartProps.barSizePx > 0
              ? chartProps.barSizePx
              : undefined;

        const barNumberFontCandidate = coalesce('barNumberFontSize');
        const barNumberFontSizeResolved =
          typeof barNumberFontCandidate === 'number' &&
          !Number.isNaN(barNumberFontCandidate) &&
          barNumberFontCandidate > 0
            ? barNumberFontCandidate
            : typeof chartProps.barNumberFontSize === 'number' &&
                !Number.isNaN(chartProps.barNumberFontSize) &&
                chartProps.barNumberFontSize > 0
              ? chartProps.barNumberFontSize
              : undefined;

        const chartRendererProps = {
          chartType: chartProps.chartType || 'line',
          xField: chartProps.xField || '',
          yField: chartProps.yField || '',
          ...chartProps,
          grid: gridBool,
          showValueAxisGrid: showValueAxisGridBool,
          barLengthAdjustment: barLengthAdjustmentBool,
          showBarNumber: showBarNumberBool,
          barNumberFontSize: barNumberFontSizeResolved,
          barSizePx: barSizePxResolved,
          data,
          loading,
          useMockData: localComponent.useMockData || false,
          mockData: Array.isArray(localComponent.mockData)
            ? (localComponent.mockData as any[])
            : [],
          id: localComponent.id,
          customStyles: localComponent.customStyles,
          databaseDataSourceConfig: (localComponent.databaseDataSourceConfig ??
            (rawProps as { databaseDataSourceConfig?: DatabaseDataSourceConfig | null })
              .databaseDataSourceConfig) as DatabaseDataSourceConfig | null | undefined,
          
          drillDataSourceConfig: ((localComponent as { drillDataSourceConfig?: DatabaseDataSourceConfig | null }).drillDataSourceConfig ??
            (rawProps as { drillDataSourceConfig?: DatabaseDataSourceConfig | null }).drillDataSourceConfig ??
            null) as DatabaseDataSourceConfig | null,
          pageParams,
          componentParameterConfig: localComponent.componentParameterConfig,
          componentId: localComponent.id,
        };

        if (isMobileViewport) {
          return <MobileChartView {...chartRendererProps} height={280} />;
        }

        return <ChartRenderer {...chartRendererProps} />;
      }

      case 'RadarChart': {

        const { key, ...radarProps } = mergedProps as any;
        const radarCfg = resolveDatabaseDataSourceConfig(localComponent);
        return <RadarChartRenderer
          {...radarProps}
          data={data}
          loading={loading}
          useMockData={localComponent.useMockData || false}
          mockData={Array.isArray(localComponent.mockData) ? localComponent.mockData as Record<string, unknown>[] : []}
          id={localComponent.id}
          customStyles={localComponent.customStyles}
          databaseDataSourceConfig={radarCfg}
          componentParameterConfig={localComponent.componentParameterConfig}
          pageParams={pageParams}
        />;
      }

      case 'MapChart': {

        const { key, ...mapChartProps } = mergedProps as any;
        return <MapChartRenderer 
          {...mapChartProps}
          data={data}
          loading={loading}
          useMockData={localComponent.useMockData ?? false}
          mockData={Array.isArray(localComponent.mockData) ? localComponent.mockData : []}
          id={localComponent.id}
          customStyles={localComponent.customStyles}
          databaseDataSourceConfig={localComponent.databaseDataSourceConfig}
          pageParams={pageParams}
          componentParameterConfig={localComponent.componentParameterConfig}
          componentId={localComponent.id}
        />;
      }

      case 'EChartsChart': {

        const { key, ...echartsProps } = mergedProps as any;
        const rawProps = (localComponent.props || {}) as Record<string, unknown>;
        const coalesce = (k: string): unknown =>
          rawProps[k] !== undefined ? rawProps[k] : echartsProps[k];
        const barLengthAdjustmentBool = parseWorkbenchBool(coalesce('barLengthAdjustment'), false);

        const additionalStatsFontFromRaw =
          (coalesce('additionalStatsFontFamily') as string | undefined) ??
          (typeof rawProps.additional_stats_font_family === 'string'
            ? rawProps.additional_stats_font_family
            : undefined);
        const additionalStatsFontWeightResolved =
          (coalesce('additionalStatsFontWeight') as number | string | undefined) ??
          (rawProps.additional_stats_font_weight as number | string | undefined);
        const additionalStatsFontBoldResolved = parseWorkbenchBool(
          coalesce('additionalStatsFontBold') ?? rawProps.additional_stats_font_bold,
          false
        );
        const echartsUseMockData = resolveUseMockData(localComponent);
        const echartsMockRows = resolveMockDataRows(localComponent);

        const echartsRendererProps = {
          chartType: echartsProps.chartType || 'funnel',
          ...echartsProps,
          barLengthAdjustment: barLengthAdjustmentBool,
          data,
          loading,
          useMockData: echartsUseMockData,
          mockData: echartsMockRows,
          id: localComponent.id,
          customStyles: localComponent.customStyles,
          databaseDataSourceConfig: localComponent.databaseDataSourceConfig,
          pageParams,
          componentParameterConfig: localComponent.componentParameterConfig,
          componentId: localComponent.id,
          ...(additionalStatsFontFromRaw !== undefined
            ? { additionalStatsFontFamily: additionalStatsFontFromRaw }
            : {}),
          ...(additionalStatsFontWeightResolved !== undefined
            ? { additionalStatsFontWeight: additionalStatsFontWeightResolved }
            : {}),
          additionalStatsFontBold: additionalStatsFontBoldResolved,
        };

        if (isMobileViewport) {
          return <MobileEChartsView {...echartsRendererProps} height={280} />;
        }

        return <EChartsChartRenderer {...echartsRendererProps} />;
      }

      case 'Statistic':
      case 'StatisticGroup':

        const { items, className: statisticClassName, grid, itemStyle } = mergedProps as any;

        const databaseDataSourceConfig = resolveDatabaseDataSourceConfig(localComponent);
        const followPageRefresh = Boolean(
          (localComponent.props as any)?.followPageRefresh ?? (mergedProps as any)?.followPageRefresh
        );
        return <StatisticGroup 
          items={items}
          loading={loading}
          className={statisticClassName}
          useMockData={localComponent.useMockData || false}
          mockData={Array.isArray(localComponent.mockData) ? localComponent.mockData as any[] : []}
          grid={grid}
          itemStyle={itemStyle}
          databaseDataSourceConfig={databaseDataSourceConfig}
          componentParameterConfig={localComponent.componentParameterConfig}
          componentId={localComponent.id}
          pageId={pageId}
          tabId={tabId}
          pageParams={pageParams}
          onParameterChange={broadcastParameter}
          followPageRefresh={followPageRefresh}
          titleFontSize={(mergedProps as any).titleFontSize}
          valueFontSize={(mergedProps as any).valueFontSize}
          labelFontSize={(mergedProps as any).labelFontSize}
        />;

      case 'HeroCard': {
        const heroProps = mergedProps as Record<string, unknown>;
        const heroDbConfig = resolveDatabaseDataSourceConfig(localComponent);

        return (
          <HeroCardRenderer
            {...heroProps}
            id={localComponent.id}
            customStyles={localComponent.customStyles}
            useMockData={localComponent.useMockData || false}
            mockData={
              Array.isArray(localComponent.mockData)
                ? (localComponent.mockData as Record<string, unknown>[])
                : (localComponent.mockData as Record<string, unknown> | undefined)
            }
            databaseDataSourceConfig={heroDbConfig}
            componentParameterConfig={localComponent.componentParameterConfig}
            pageParams={pageParams}
            followPageRefresh={Boolean(
              (localComponent.props as Record<string, unknown> | undefined)?.followPageRefresh
            )}
          />
        );
      }

      case 'MetricCarousel': {
        const { key, ...mcProps } = mergedProps as any;
        return (
          <MetricCarouselRenderer {...mcProps} id={localComponent.id}>
            {componentChildren}
          </MetricCarouselRenderer>
        );
      }


      case 'AnalyticsTable': {
        const { key, ...dtProps } = mergedProps as any;
        const dtRowCfg = resolveDatabaseDataSourceConfig(localComponent);
        const dtSumCfg =
          (localComponent as { summaryDataSourceConfig?: unknown }).summaryDataSourceConfig ??
          (localComponent.props as Record<string, unknown> | undefined)?.summaryDataSourceConfig ??
          null;
        return (
          <AnalyticsTableRenderer
            {...dtProps}
            id={localComponent.id}
            databaseDataSourceConfig={dtRowCfg}
            summaryDataSourceConfig={dtSumCfg as DatabaseDataSourceConfig | null}
            componentParameterConfig={localComponent.componentParameterConfig}
            pageParams={pageParams}
            useMockData={resolveUseMockData(localComponent)}
            mockData={resolveMockDataRows(localComponent) as Record<string, unknown>[]}
          />
        );
      }

      case 'ProductReport': {
        const { key, ...prProps } = mergedProps as any;
        const prPluCfg = resolveDatabaseDataSourceConfig(localComponent);
        const prDimCfg =
          (localComponent as { dimDataSourceConfig?: unknown }).dimDataSourceConfig ??
          (localComponent.props as Record<string, unknown> | undefined)?.dimDataSourceConfig ??
          null;
        const prSumCfg =
          (localComponent as { summaryDataSourceConfig?: unknown }).summaryDataSourceConfig ??
          (localComponent.props as Record<string, unknown> | undefined)?.summaryDataSourceConfig ??
          null;
        const prTotalCfg =
          (localComponent as { totalRowDataSourceConfig?: unknown }).totalRowDataSourceConfig ??
          (localComponent.props as Record<string, unknown> | undefined)?.totalRowDataSourceConfig ??
          null;
        return (
          <ProductReportRenderer
            {...prProps}
            id={localComponent.id}
            databaseDataSourceConfig={prPluCfg}
            dimDataSourceConfig={prDimCfg as DatabaseDataSourceConfig | null}
            summaryDataSourceConfig={prSumCfg as DatabaseDataSourceConfig | null}
            totalRowDataSourceConfig={prTotalCfg as DatabaseDataSourceConfig | null}
            componentParameterConfig={localComponent.componentParameterConfig}
            pageParams={pageParams}
          />
        );
      }

      case 'ProductDetail': {
        const { key, ...pdProps } = mergedProps as any;
        const pdDetailCfg = resolveDatabaseDataSourceConfig(localComponent);
        const pick = (k: string) =>
          (localComponent as unknown as Record<string, unknown>)[k] ??
          (localComponent.props as Record<string, unknown> | undefined)?.[k] ??
          null;
        return (
          <ProductDetailRenderer
            {...pdProps}
            id={localComponent.id}
            databaseDataSourceConfig={pdDetailCfg}
            shareDataSourceConfig={pick('shareDataSourceConfig') as DatabaseDataSourceConfig | null}
            sizeDataSourceConfig={pick('sizeDataSourceConfig') as DatabaseDataSourceConfig | null}
            topStoresDataSourceConfig={pick('topStoresDataSourceConfig') as DatabaseDataSourceConfig | null}
            componentParameterConfig={localComponent.componentParameterConfig}
            pageParams={pageParams}
          />
        );
      }

      case 'TileGrid': {
        const { key, ...tgProps } = mergedProps as any;
        const tgCfg = resolveDatabaseDataSourceConfig(localComponent);
        return (
          <TileGridRenderer
            {...tgProps}
            id={localComponent.id}
            databaseDataSourceConfig={tgCfg}
            componentParameterConfig={localComponent.componentParameterConfig}
            pageParams={pageParams}
          />
        );
      }

      case 'RingStat': {
        const { key, ...rsProps } = mergedProps as any;
        const rsCfg = resolveDatabaseDataSourceConfig(localComponent);
        return (
          <RingStatRenderer
            {...rsProps}
            id={localComponent.id}
            databaseDataSourceConfig={rsCfg}
            componentParameterConfig={localComponent.componentParameterConfig}
            pageParams={pageParams}
            useMockData={resolveUseMockData(localComponent)}
            mockData={resolveMockDataRows(localComponent) as Record<string, unknown>[]}
          />
        );
      }

      case 'PublishHistory': {
        // Self-sourced: fetches the current workbench's publish history itself (no dataSource).
        const { key, ...phProps } = mergedProps as any;
        return (
          <PublishHistoryRenderer
            {...phProps}
            id={localComponent.id}
            customStyles={localComponent.customStyles}
          />
        );
      }

      case 'PublishPreviewEntry': {
        // Self-sourced: reads the current workbench's publish status itself (no dataSource).
        const { key, ...ppeProps } = mergedProps as any;
        return (
          <PublishPreviewEntryRenderer
            {...ppeProps}
            id={localComponent.id}
            customStyles={localComponent.customStyles}
          />
        );
      }

      case 'CollapsePanel': {
        const { key, ...cpProps } = mergedProps as any;
        const cpDbConfig = resolveDatabaseDataSourceConfig(localComponent);
        return (
          <CollapsePanelRenderer
            {...cpProps}
            id={localComponent.id}
            databaseDataSourceConfig={cpDbConfig}
            componentParameterConfig={localComponent.componentParameterConfig}
            pageParams={pageParams}
            useMockData={localComponent.useMockData || false}
            mockData={localComponent.mockData as Record<string, unknown>[] | Record<string, unknown> | undefined}
          />
        );
      }

      case 'NavTile': {
        const navTileProps = mergedProps as Record<string, unknown>;
        return (
          <NavTileRenderer
            {...navTileProps}
            id={localComponent.id}
            customStyles={localComponent.customStyles}
            pageParams={pageParams}
            navigationItems={
              ((appConfig as { navigation?: { items?: NavigationItem[] } })?.navigation
                ?.items ?? []) as NavigationItem[]
            }
          />
        );
      }

      case 'AppIdentityList': {
        const { key, ...aiProps } = mergedProps as any;
        return <AppIdentityListRenderer {...aiProps} id={localComponent.id} />;
      }

      case 'IdentityAttributeAssign': {
        const { key, ...iaProps } = mergedProps as any;
        return <IdentityAttributeAssignRenderer {...iaProps} id={localComponent.id} />;
      }

      case 'Card': {

        const { key, ...cardProps } = mergedProps as any;
        const cardRenderer = (
          <CardRenderer 
            {...cardProps}
            id={localComponent.id}
            customStyles={localComponent.customStyles}
            componentConfig={localComponent}
            appConfig={appConfig}
            pageParams={pageParams}
            pageId={pageId}
            nestingLevel={nestingLevel}
          >
            {componentChildren}
          </CardRenderer>
        );

        return isMobileViewport ? (
          <MobileCardView
            {...cardProps}
            id={localComponent.id}
            customStyles={localComponent.customStyles}
            componentConfig={localComponent}
            appConfig={appConfig}
            pageParams={pageParams}
            pageId={pageId}
            nestingLevel={nestingLevel}
          >
            {componentChildren}
          </MobileCardView>
        ) : (
          cardRenderer
        );
      }

      case 'Container': {

        const { key, ...containerProps } = mergedProps as any;
        return <ContainerRenderer 
          {...(containerProps as ContainerRendererProps)}
          loading={loading}
          id={localComponent.id}
          customStyles={localComponent.customStyles}
          componentConfig={localComponent}
          appConfig={appConfig}
          pageParams={pageParams}
          pageId={pageId}
          nestingLevel={nestingLevel}
        >
          {componentChildren}
        </ContainerRenderer>;
      }

      case 'TaskInput': {

        const { key, ...taskInputProps } = mergedProps as any;
        return <TaskInputRenderer 
          {...taskInputProps}
          parameterConfig={localComponent.parameterConfig}
          useMockData={localComponent.useMockData || false}
          mockFileData={(localComponent.props as any)?.mockFileData}
        />;
      }

      case 'ServiceDeskReporter': {
        const { key, ...reporterProps } = mergedProps as any;
        return (
          <ServiceDeskReporterRenderer
            {...reporterProps}
            pageParams={pageParams as Record<string, unknown>}
          />
        );
      }

      case 'Tree': {

        const { key, ...treeProps } = mergedProps as any;

        const stableTreeDataSource =
          dataSource?.datasetId
            ? null
            : data && data.length > 0
              ? data
              : null;

        return <SimpleTreeRenderer 
          {...(treeProps as any)}

          keyField={key || 'id'}  

          dataSource={stableTreeDataSource}

          loading={false} 
          useMockData={localComponent.useMockData || false}
          mockData={localComponent.mockData || []}
          datasetConfig={dataSource ? { datasetId: dataSource.datasetId, params: dataSource.params } : undefined}

          databaseDataSourceConfig={localComponent.databaseDataSourceConfig}
          enhancedDataSource={localComponent.enhancedDataSource}

          onRefresh={() => {

          }}
          id={localComponent.id}
          customStyles={localComponent.customStyles}

          parameterConfig={localComponent.parameterConfig}
          componentId={localComponent.id}
          pageId={pageId}
          pageParams={pageParams}
          onParameterChange={broadcastParameter}
        />;
      }

      case 'FilterPanel': {
        const filterPanelProps = mergedProps as any;
        return <FilterPanelRenderer
          filters={filterPanelProps.filters || []}
          presets={filterPanelProps.presets || []}
          title={filterPanelProps.title}
          className={filterPanelProps.className}
          mobileLayout={filterPanelProps.mobileLayout}
          layout={filterPanelProps.layout}
          cache={filterPanelProps.cache}
          sticky={filterPanelProps.sticky}
          stickyTop={filterPanelProps.stickyTop}
          partition={filterPanelProps.partition}
          roleFilterRules={filterPanelProps.roleFilterRules}
          useMockData={localComponent.useMockData || false}
          componentId={localComponent.id}
          pageId={pageId}
          tabId={tabId}
          onParameterChange={broadcastParameter}
        />;
      }

      case 'WorkflowComponent': {
        const RendererComponent = renderers[type] as React.ComponentType<any>;

        const { key, transforms: transformsConfig, ...rendererProps } = mergedProps as any;

        const needsConversion = transformsConfig && typeof transformsConfig === 'object' && (
          transformsConfig.transformStepData?.code ||
          transformsConfig.prepareStepOutput?.code ||
          transformsConfig.validateStepData?.code
        );
        const transforms = needsConversion
          ? createTransformsFromConfig(transformsConfig)
          : transformsConfig;

        return <RendererComponent 
          {...rendererProps}
          transforms={transforms}
          loading={loading} 
          id={localComponent.id} 
          customStyles={localComponent.customStyles}
          useMockData={localComponent.useMockData || false}
          mockData={localComponent.mockData}
        />;
      }

      default:
        if (renderers[type]) {
          const RendererComponent = renderers[type] as React.ComponentType<any>;

          const { key, ...rendererProps } = mergedProps as any;
          return <RendererComponent
            {...rendererProps}
            databaseDataSourceConfig={(localComponent as any).databaseDataSourceConfig}
            loading={loading}
            id={localComponent.id}
            customStyles={localComponent.customStyles}
            useMockData={localComponent.useMockData || false}
            mockData={localComponent.mockData}
            actions={(localComponent as any).actions || (mergedProps as any).actions}
          />;
        }
        return (
          <div className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-lg">
            <div className="text-center text-neutral-500 dark:text-neutral-400">
              {t('renderers:page_component_renderer.unknown_component_type', 'Unknown component type: {{type}}', { type })}
            </div>
          </div>
        );
    }
  };

  
  if (isHidden) {
    return null;
  }

  const componentKey = `component-${localComponent.id}-${layoutKey}`;
  // Sticky components (e.g. a pinned FilterPanel) must anchor to the tall scrolling page area,
  // not this per-component wrapper (whose height = the component, leaving sticky no room).
  // display:contents lets native sticky use the surrounding page flow; constrained edit layouts
  // are detected by useEscapedStickyPanel and use its fixed fallback instead.
  const stickyWrapStyle = (localComponent as { props?: { sticky?: boolean } })?.props?.sticky
    ? ({ display: 'contents' } as const)
    : undefined;
  // A cardPerRow HeroCard expands to N flat cards that must become direct flex items of a parent
  // MetricCarousel track — its shell (and edit overlay) must not generate a box in between.
  const transparentShell =
    type === 'HeroCard' &&
    Boolean((localComponent.props as Record<string, unknown> | undefined)?.cardPerRow);
  const shellStyle: React.CSSProperties | undefined = transparentShell
    ? { display: 'contents' }
    : stickyWrapStyle;
  // In the edit canvas, the surrounding cell is the one source of truth for
  // a component's visible frame. Outside edit mode, preserve the published
  // content-row behavior even when a fullscreen grid imposes a cell height.
  const contentSized =
    fillCell === false || (!isEditMode && getGrid24SizeCapability(type).mode === 'content');
  const editShellClassName = contentSized
    ? 'flex h-auto w-full shrink-0 flex-col'
    : 'flex h-full min-h-0 w-full flex-1 flex-col';

  if (isPreviewMode) {

    return (
      <div
        key={componentKey}
        className={editShellClassName}
        style={shellStyle}
      >
        {renderComponent()}
      </div>
    );
  }

  const editContent = (
    <ComponentEditOverlay
      componentId={localComponent.id}
      componentType={type}
      componentData={localComponent as unknown as Record<string, unknown>}
      pageId={pageId}
      // Match shell. Natural-height contexts drop the overlay's default h-full.
      className={transparentShell ? 'contents' : contentSized ? 'h-auto shrink-0' : undefined}
    >
      <div
        key={componentKey}
        // A definite cell carries height through this wrapper to the component
        // root. Natural-height container/view contexts remain h-auto.
        // sticky uses display:contents (style below) and skips this box.
        className={editShellClassName}
        style={shellStyle}
      >
        {renderComponent()}
      </div>
    </ComponentEditOverlay>
  );

  return editContent;
};

export default PageComponentRenderer;
