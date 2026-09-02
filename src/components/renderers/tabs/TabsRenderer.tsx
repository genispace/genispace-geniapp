import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@genispace/shared-ui';
import { cn } from '@genispace/shared-utils';
import { Grid24FillCellProvider, useGrid24FillCell } from '@/layout/grid24CellContext';
import { useMobileFlowLayout } from '@/mobile/mobileFlowLayoutContext';
import PageComponentRenderer from '../../runtime/ComponentRenderer';
import Grid24Renderer from '../../layout/Grid24Renderer';
import type { ParameterRecord } from '../../types/parameters';
import type { Grid24LayoutConfig } from '@/types/components';
import * as LucideIcons from 'lucide-react';
import { Badge } from '@genispace/shared-ui';
import { X } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { useTabActivity } from '@/contexts/TabActivityContext';
import { useEditMode } from '@/runtime/runtime-mode';
import { ContainerDropZoneOverlay } from '@/runtime/runtime-mode';
import { useTranslation } from 'react-i18next';
import { resolveGapCSSValue } from '@/utils/styleUtils';
import { isEditableTabVariant, normalizeTabVariant, resolveTabVariantClasses } from './tabVariantStyles';
import type { TabOrientation } from './tabVariantStyles';
import { evaluateVisibleWhen, type VisibleWhen } from '@/utils/visibleWhen';
import { useVisibleWhenContext } from '@/hooks/useVisibleWhenContext';
import { useWorkbenchConfigLocale } from '@/contexts/WorkbenchConfigLocaleContext';
import { resolveBilingualText } from '@/utils/workbenchDisplayLocale';

function biLabel(v: unknown, lang: string): string {
  return resolveBilingualText(v, lang);
}

interface TabItem {
  key: string;
  label: any; // string | { zh, en }
  
  visibleWhen?: VisibleWhen;

  icon?: string;

  disabled?: boolean;

  closable?: boolean;

  badge?: string | number;

  children?: React.ReactNode; 
  component?: any; 
  components?: any[]; 
  render?: () => React.ReactNode; 

  layout?: Grid24LayoutConfig;

  componentConfig?: {
    type: 'single' | 'multiple';
    data?: any;
    props?: Record<string, any>;
  };
}

interface TabsRendererProps {
  items: TabItem[];
  defaultActiveKey?: string;
  className?: string;
  tabPosition?: 'top' | 'bottom' | 'left' | 'right';
  type?: 'line' | 'card' | 'editable-card' | 'pill' | 'boxed' | 'vertical-line';
  size?: 'small' | 'default' | 'large';
  /** Vertical gap between tab bar and tab panel content. Number = px, or CSS length */
  tabBarToContentGap?: string | number;
  /**
   * When true (default), the Tabs renderer wraps its content in a white
   * rounded card with padding so the tab strip looks like a self-contained
   * container. When false, the outer card chrome (background, padding,
   * rounded corners) is dropped so the tab strip visually merges with the
   * surrounding layout — useful when the parent already provides its own
   * container chrome (e.g. a Card, or a panel that should appear
   * flush with the tab content below).
   */
  showBorder?: boolean;

  onChange?: (activeKey: string) => void;

  onEdit?: (action: 'add' | 'remove', targetKey?: string) => void;
  appConfig?: Record<string, unknown>;
  pageParams?: ParameterRecord;
  pageId?: string;
  tabId?: string;
  id?: string;
  customStyles?: any;
  loading?: boolean;
  /** Section title font size (px). Default 14. */
  titleFontSize?: number;
  /** Tab trigger label font size (px). Default 14. */
  labelFontSize?: number;
  /** Tab badge font size (px). Default 13. */
  badgeFontSize?: number;
  [key: string]: any;
  nestingLevel?: number;
}




const DroppableTabContent: React.FC<{
  tabKey: string;
  componentId: string;
  children: React.ReactNode;
  tabLabel?: string;
  className?: string;
}> = ({ tabKey, componentId, children, tabLabel, className = '' }) => {
  const { isEditMode, draggedComponentType, isAddingComponent } = useEditMode();
  const isTabActive = useTabActivity();
  const { t } = useTranslation(['renderers', 'common']);
  const { setNodeRef, isOver } = useDroppable({
    id: `tabs-drop-zone-${componentId}-${tabKey}`,
    data: {
      type: 'tabs-tab',
      componentId: componentId,
      tabKey: tabKey,
      componentType: 'Tabs'
    },
    disabled: !isEditMode || !isTabActive,
  });

  return (
    <div
      ref={isEditMode ? setNodeRef : undefined}
      className={cn(
        'relative min-h-[100px]',
        className,
        isEditMode && isOver && 'ring-2 ring-primary ring-offset-2 rounded-lg'
      )}
    >
      <Grid24FillCellProvider value={false}>{children}</Grid24FillCellProvider>

      {isEditMode && (
        <ContainerDropZoneOverlay
          isOver={isOver}
          draggedComponentType={draggedComponentType}
          isAddingComponent={isAddingComponent}
          containerType="tabs"
          tabLabel={tabLabel}
        />
      )}

      {isEditMode && !children && !isOver && (
        <div className="absolute inset-0 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg flex items-center justify-center pointer-events-none">
          <div className="text-sm text-neutral-400 dark:text-neutral-500">
            {t('container.drag_component_hint', 'Drag component here')}
          </div>
        </div>
      )}
    </div>
  );
};

const TabsRenderer: React.FC<TabsRendererProps> = ({
  items = [],
  defaultActiveKey,
  className = '',
  tabPosition = 'top',
  type = 'line',
  size = 'default',
  tabBarToContentGap,
  showBorder = true,
  onChange,
  onEdit,
  loading = false,
  titleFontSize,
  labelFontSize,
  badgeFontSize,
  ...otherProps
}) => {
  const titleFs = titleFontSize ?? 14;
  const labelFs = labelFontSize ?? 14;
  const badgeFs = badgeFontSize ?? 13;

  const {
    pageId,
    tabId,
    componentId,
    onParameterChange,
    subscribeToParameters,
    isListeningToParameters,
    customStyles,
    id,
    useMockData,
    mockData,
    parameterConfig,
    pageParams,
    availableParameters,
    appConfig,
    nestingLevel = 0,
    headerLayout,
    title,
    tabBarAlign,
    destroyInactiveTabPane,
    ...domSafeProps
  } = otherProps;

  const { isEditMode, draggedComponentType, isAddingComponent } = useEditMode();
  const fillCell = useGrid24FillCell();
  const isMobileFlow = useMobileFlowLayout();
  const { t } = useTranslation(['renderers', 'common']);
  const { language } = useWorkbenchConfigLocale();
  const lang = language === 'zh' ? 'zh' : 'en';
  const visibleWhenCtx = useVisibleWhenContext(pageParams);

  const visibleItems = useMemo(
    () => items.filter((it) => evaluateVisibleWhen(it.visibleWhen, visibleWhenCtx)),
    [items, visibleWhenCtx]
  );

  const [activeKey, setActiveKey] = useState<string>(defaultActiveKey || items[0]?.key || '');
  
  const effectiveActiveKey =
    visibleItems.some(i => i.key === activeKey) ? activeKey : visibleItems[0]?.key || '';

  
  
  
  const [activatedKeys, setActivatedKeys] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (effectiveActiveKey && !activatedKeys.has(effectiveActiveKey)) {
      setActivatedKeys(prev => {
        const next = new Set(prev);
        next.add(effectiveActiveKey);
        return next;
      });
    }
  }, [effectiveActiveKey, activatedKeys]);

  useEffect(() => {
    if (defaultActiveKey && defaultActiveKey !== activeKey) {
      setActiveKey(defaultActiveKey);
    }
  }, [defaultActiveKey]);

  const handleValueChange = (value: string) => {
    if (value !== activeKey) {
      setActiveKey(value);
      onChange?.(value);
    }
  };

  const renderIcon = (iconName?: string) => {
    if (!iconName) return null;
    const IconComponent = (LucideIcons as any)[iconName];
    if (!IconComponent) return null;
    return <IconComponent className="w-4 h-4 mr-1.5" />;
  };

  if (!items || items.length === 0) {
    return null;
  }

  const tabBarToContentGapCss = resolveGapCSSValue(tabBarToContentGap);
  const normalizedType = normalizeTabVariant(type);
  const tabOrientation: TabOrientation =
    tabPosition === 'left' || tabPosition === 'right' ? 'vertical' : 'horizontal';
  const variantClasses = resolveTabVariantClasses(normalizedType, tabOrientation);
  const showEditableControls = isEditableTabVariant(normalizedType);

  const renderTabContent = (item: TabItem) => {

    if (item.render) {
      return item.render();
    }

    if (item.children) {
      return item.children;
    }

    if (item.components && Array.isArray(item.components) && appConfig) {
      if (item.layout?.type === 'grid-24') {
        return (
          <Grid24Renderer
            config={item.layout}
            components={item.components}
            nestingLevel={nestingLevel + 1}
            appConfig={appConfig}
            pageParams={pageParams}
            pageId={pageId}
            tabId={tabId}
          />
        );
      }
      return (
        <div className="space-y-4">
          {item.components.map((component, index) => (
            <PageComponentRenderer
              key={component.id || index}
              component={component}
              appConfig={appConfig}
              pageParams={pageParams}
              pageId={pageId}
              tabId={tabId}
              nestingLevel={nestingLevel + 1}
            />
          ))}
        </div>
      );
    }

    if (item.component && appConfig) {
      return (
        <PageComponentRenderer
          component={item.component}
          appConfig={appConfig}
          pageParams={pageParams}
          pageId={pageId}
          tabId={tabId}
          nestingLevel={nestingLevel + 1}
        />
      );
    }

    if (item.componentConfig && appConfig) {
      const { type, data, props } = item.componentConfig;

      if (type === 'single' && data) {
        return (
          <PageComponentRenderer
            component={data}
            appConfig={appConfig}
            pageParams={pageParams}
            pageId={pageId}
            tabId={tabId}
            nestingLevel={nestingLevel + 1}
            {...props}
          />
        );
      }

      if (type === 'multiple' && Array.isArray(data)) {
        return (
          <div className="space-y-4">
            {data.map((component, index) => (
              <PageComponentRenderer
                key={component.id || index}
                component={component}
                appConfig={appConfig}
                pageParams={pageParams}
                pageId={pageId}
                tabId={tabId}
                nestingLevel={nestingLevel + 1}
                {...props}
              />
            ))}
          </div>
        );
      }
    }

    return null;
  };

  const isSplit = headerLayout === 'split';
  /** Runtime: one visible tab → hide tab strip, show content only. Edit mode keeps the strip for tab management. */
  const hideTabBar = !isEditMode && visibleItems.length === 1;
  const soleVisibleTab = hideTabBar ? visibleItems[0] : null;

  const renderTabPanel = (item: TabItem) => {
    const isActive = item.key === effectiveActiveKey;
    const hasBeenActive = activatedKeys.has(item.key);

    const panelBody = loading ? (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    ) : (
      renderTabContent(item)
    );

    if (hideTabBar) {
      return (
        <DroppableTabContent
          tabKey={item.key}
          componentId={id || ''}
          tabLabel={biLabel(item.label, lang)}
          className={fillCell ? 'flex-1 overflow-y-auto' : ''}
        >
          {panelBody}
        </DroppableTabContent>
      );
    }

    if (destroyInactiveTabPane && !isActive && !hasBeenActive) {
      return <TabsContent key={item.key} value={item.key} className="hidden" />;
    }

    return (
      <TabsContent
        key={item.key}
        value={item.key}
        className={cn(
          tabBarToContentGapCss ? '' : 'mt-4',
          !isActive
            ? 'hidden'
            : fillCell &&
                (tabOrientation === 'horizontal'
                  ? 'flex-1 min-h-0 overflow-y-auto'
                  : 'flex-1 min-w-0 min-h-0 overflow-y-auto')
        )}
        style={tabBarToContentGapCss ? { marginTop: 0 } : undefined}
        forceMount={(!destroyInactiveTabPane || (!isActive && hasBeenActive)) ? true : undefined}
      >
        <DroppableTabContent
          tabKey={item.key}
          componentId={id || ''}
          tabLabel={biLabel(item.label, lang)}
          className={fillCell ? 'h-full' : ''}
        >
          {panelBody}
        </DroppableTabContent>
      </TabsContent>
    );
  };

  const sectionTitleEl = title ? (
    isSplit ? (
      <span className="font-semibold text-foreground" style={{ fontSize: titleFs }}>
        {biLabel(title, lang)}
      </span>
    ) : (
      <div className={cn('mb-3 font-semibold text-foreground', fillCell && 'shrink-0')} style={{ fontSize: titleFs }}>
        {biLabel(title, lang)}
      </div>
    )
  ) : null;

  const tabsListEl = (
    <TabsList
      className={`${variantClasses.list} ${
        isSplit || tabBarToContentGapCss ? '' : 'mb-4'
      } ${
        tabPosition === 'left' || tabPosition === 'right'
          ? 'flex-col h-auto'
          : isMobileFlow
            ? 'max-w-full overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
            : ''
      } ${
        size === 'small' ? 'h-8' : size === 'large' ? 'h-12' : 'h-10'
      } ${isSplit && isMobileFlow ? 'min-w-0 max-w-full' : ''} ${isSplit && tabBarAlign === 'end' ? 'ml-auto' : ''}${fillCell ? ' shrink-0' : ''}`}
      style={!isSplit && tabBarToContentGapCss ? { marginBottom: tabBarToContentGapCss } : undefined}
    >
      {visibleItems.map((item) => (
        <TabsTrigger
          key={item.key}
          value={item.key}
          disabled={item.disabled}
          className={`${variantClasses.trigger} ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {renderIcon(item.icon)}
          <span style={{ fontSize: labelFs }}>{biLabel(item.label, lang)}</span>
          {item.badge !== undefined && (
            <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5" style={{ fontSize: badgeFs }}>
              {item.badge}
            </Badge>
          )}
          {showEditableControls && item.closable && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit?.('remove', item.key); }}
              className={variantClasses.closableButton}
              aria-label={t('tabs.close_tab', 'Close tab')}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </TabsTrigger>
      ))}
      {showEditableControls && onEdit && (
        <button type="button" onClick={() => onEdit('add')} className={variantClasses.addButton}>
          {t('tabs.add_tab', '+ Add')}
        </button>
      )}
    </TabsList>
  );

  if (soleVisibleTab) {
    return (
      <div
        className={cn(
          'relative group',
          fillCell && 'h-full flex flex-col min-h-0',
          className,
          showBorder && 'bg-white dark:bg-neutral-800 p-4 rounded-lg'
        )}
      >
        {isSplit && sectionTitleEl ? (
          <div className={cn('mb-3 flex items-center justify-between gap-3', isMobileFlow && 'flex-wrap', fillCell && 'shrink-0')}>{sectionTitleEl}</div>
        ) : (
          sectionTitleEl
        )}
        {renderTabPanel(soleVisibleTab)}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative group',
        fillCell && 'h-full flex flex-col min-h-0',
        className,
        showBorder && 'bg-white dark:bg-neutral-800 p-4 rounded-lg'
      )}
    >
      <Tabs
        value={effectiveActiveKey}
        onValueChange={handleValueChange}
        className={cn(
          'w-full',
          fillCell &&
            (tabOrientation === 'horizontal' ? 'flex-1 min-h-0 flex flex-col' : 'flex-1 min-h-0 flex')
        )}
        orientation={tabPosition === 'left' || tabPosition === 'right' ? 'vertical' : 'horizontal'}
        {...domSafeProps}
      >
        {isSplit ? (
          <div className={cn('mb-3 flex items-center justify-between gap-3', isMobileFlow && 'flex-wrap', fillCell && 'shrink-0')}>
            {sectionTitleEl}
            {tabsListEl}
          </div>
        ) : title ? (
          <>
            {sectionTitleEl}
            {tabsListEl}
          </>
        ) : (
          tabsListEl
        )}
        {visibleItems.map((item) => renderTabPanel(item))}
      </Tabs>
    </div>
  );
};

export default TabsRenderer; 