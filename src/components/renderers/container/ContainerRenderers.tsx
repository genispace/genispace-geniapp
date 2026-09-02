import React, { useMemo, lazy, Suspense } from 'react';
import { Separator } from '@genispace/shared-ui';
import { H1, H2, H3, H4 } from '@genispace/shared-ui';
import { applyCustomStyles } from '@/utils/styleUtils';
import { CustomStylesConfig } from '../../types/components';
import { useDroppable } from '@dnd-kit/core';
import { useTabActivity } from '@/contexts/TabActivityContext';
import { useEditMode } from '@/runtime/runtime-mode';
import { ContainerDropZoneOverlay } from '@/runtime/runtime-mode';
import { cn } from '@genispace/shared-utils';
import { useTranslation } from 'react-i18next';
import { 
  LayoutPreset, 
  GridArea, 
  getVisibleAreas
} from '@/utils/layoutSystem';
import '../../styles/layoutSystem.css';
import Grid24Renderer from '../../layout/Grid24Renderer';
import { Grid24FillCellProvider, useGrid24FillCell } from '@/layout/grid24CellContext';
import { useMobileFlowLayout } from '@/mobile/mobileFlowLayoutContext';
import type { Grid24LayoutConfig } from '@/types/components';

interface ContainerRendererProps {

  children?: React.ReactNode;

  title?: string;

  description?: string;

  titleLevel?: 1 | 2 | 3 | 4 | 5;

  divider?: boolean;

  className?: string;

  style?: React.CSSProperties;

  direction?: 'horizontal' | 'vertical';

  gutter?: number | [number, number];

  justify?: 'start' | 'end' | 'center' | 'space-around' | 'space-between';

  align?: 'top' | 'middle' | 'bottom';

  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';

  layout?: 'block' | 'flex' | 'grid';

  cols?: number[];

  padding?: number | string;

  margin?: number | string;

  background?: string;

  border?: boolean;

  borderRadius?: number | string;

  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';

  minHeight?: number | string;

  maxHeight?: number | string;

  scrollable?: boolean;

  responsive?: {

    mobile?: number;

    tablet?: number;

    desktop?: number;
  };

  id?: string;

  customStyles?: CustomStylesConfig;

  loading?: boolean;

  componentConfig?: any;

  appConfig?: Record<string, unknown>;

  pageParams?: any;

  pageId?: string;

  /** Nesting depth for 24-column grid (page root children use 0). */
  nestingLevel?: number;
}

export const ContainerRenderer: React.FC<ContainerRendererProps> = ({
  children,
  title,
  description,
  titleLevel = 4,
  divider = false,
  className = '',
  style = {},
  direction = 'vertical',
  gutter = 16,
  justify = 'start',
  align = 'top',
  wrap = 'nowrap',
  layout = 'block',
  cols,
  padding,
  margin,
  background,
  border = false,
  borderRadius,
  shadow = 'none',
  minHeight,
  maxHeight,
  scrollable = false,
  responsive,
  id,
  customStyles,
  loading = false,
  componentConfig,
  appConfig,
  pageParams,
  pageId,
  nestingLevel = 0,
}) => {
  const { t } = useTranslation(['renderers', 'common']);
  const fillCell = useGrid24FillCell();
  const isMobileFlow = useMobileFlowLayout();

  const customStyleProps = id ? applyCustomStyles(id, customStyles, className) : { className, style: {} };

  const { isEditMode, draggedComponentType, isAddingComponent } = useEditMode();
  const isTabActive = useTabActivity();
  const { setNodeRef, isOver } = useDroppable({
    id: `container-drop-zone-${id || 'default'}`,
    data: {
      type: 'container',
      componentId: id,
      componentType: 'Container'
    },
    disabled: !isEditMode || !isTabActive,
  });

  const containerStyle: React.CSSProperties = {
    ...style,
    ...customStyleProps.style,
    padding: padding,
    margin: margin,
    background: background,
    border: border ? '1px solid var(--border-color, rgba(0, 0, 0, 0.1))' : undefined,
    borderRadius: borderRadius,
    boxShadow: getShadowStyle(shadow),
    minHeight: minHeight,
    maxHeight: maxHeight,
    overflow: scrollable ? 'auto' : undefined,
  };

  const renderTitle = () => {
    if (!title) return null;

    const titleElement = () => {
      switch (titleLevel) {
        case 1: return <H1 className="title">{title}</H1>;
        case 2: return <H2 className="title">{title}</H2>;
        case 3: return <H3 className="title">{title}</H3>;
        case 4: 
        case 5:
        default: return <H4 className="title">{title}</H4>;
      }
    };

    return (
      <div className={cn('header', fillCell && 'shrink-0')}>
        {titleElement()}
        {description && (
          <p className="description text-sm text-neutral-600 mt-1">{description}</p>
        )}
      </div>
    );
  };

  const getResponsiveGridColumns = () => {
    // Narrow flow: the inline template below always beats the responsive
    // md:/lg: classes (inline > class), so without this branch a multi-column
    // container never collapses — on real mobile OR in the phone frame.
    if (isMobileFlow) {
      const mobileCols = responsive?.mobile || 1;
      return {
        gridTemplateColumns: `repeat(${mobileCols}, 1fr)`,
        className: '',
      };
    }
    if (responsive) {

      const mobileCols = responsive.mobile || 1;
      const tabletCols = responsive.tablet || 2;
      const desktopCols = responsive.desktop || (cols?.length || 2);

      return {
        gridTemplateColumns: cols ? cols.map(col => `${col}fr`).join(' ') : `repeat(${desktopCols}, 1fr)`,

        className: `grid-cols-${mobileCols} md:grid-cols-${tabletCols} lg:grid-cols-${desktopCols}`,
      };
    }
    return {
      gridTemplateColumns: cols ? cols.map(col => `${col}fr`).join(' ') : 'repeat(2, 1fr)',
      className: '',
    };
  };

  const layoutConfig = useMemo(() => {
    if (!componentConfig) return null;
    const layout = componentConfig.props?.layout || componentConfig.layout;
    if (!layout) return null;
    if ((layout as Grid24LayoutConfig).type === 'grid-24') {
      return layout as Grid24LayoutConfig;
    }
    if (!layout.preset) return null;
    return layout;
  }, [componentConfig]);

  const componentsByArea = useMemo(() => {
    if (!layoutConfig || (layoutConfig as Grid24LayoutConfig).type === 'grid-24' || !componentConfig?.children) return null;

    const componentMapping: Record<GridArea, any[]> = {
      'top': [],
      'bottom': [],
      'bottom-left': [],
      'bottom-center': [],
      'bottom-right': [],
      'bottom-second': [],
      'left': [],
      'left-top': [],
      'left-center': [],
      'left-bottom': [],
      'right': [],
      'right-top': [],
      'right-bottom': [],
      'header': [],
      'middle-left': [],
      'middle-center': [],
      'middle-right': [],
      'middle': []
    };

    const childrenArray = componentConfig.children || [];
    const componentPositions = layoutConfig.componentPositions || {};

    childrenArray.forEach((component: any) => {
      const position = componentPositions[component.id];
      if (position?.area) {
        const area = position.area as GridArea;
        if (componentMapping[area]) {
          componentMapping[area].push({ component, order: position.order || 0 });
        }
      } else {

        componentMapping['top'].push({ component, order: 0 });
      }
    });

    Object.keys(componentMapping).forEach((area: string) => {
      componentMapping[area as GridArea].sort((a, b) => a.order - b.order);
    });

    return componentMapping;
  }, [layoutConfig, componentConfig]);

  const renderChildren = () => {
    if (!children) return null;

    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }

    if (layoutConfig && (layoutConfig as Grid24LayoutConfig).type === 'grid-24' && appConfig) {
      const cfg = layoutConfig as Grid24LayoutConfig;
      const kids = componentConfig.children || [];
      return (
        <Grid24Renderer
          config={cfg}
          components={kids}
          nestingLevel={nestingLevel + 1}
          appConfig={appConfig}
          pageParams={pageParams}
          pageId={pageId}
        />
      );
    }

    if (layoutConfig && componentsByArea && appConfig) {
      const preset = layoutConfig.preset as LayoutPreset;
      const visibleAreas = getVisibleAreas(preset);

      const PageComponentRenderer = lazy(() => import('../../runtime/ComponentRenderer'));

      return (
        <div className={cn(
          `layout-grid layout-grid--in-container layout-${preset} w-full`,
          preset === 'dashboard-layout' && 'layout-dashboard-in-card',
          isMobileFlow && 'layout-grid--narrow'
        )}>
          {visibleAreas.map((area) => {
            const componentsInArea = componentsByArea[area] || [];

            if (componentsInArea.length === 0) {
              return null;
            }

            return (
              <div
                key={area}
                className={`layout-area-${area} min-h-0 min-w-0`}
              >
                <div className="w-full flex flex-col min-h-0" style={{ gap: '1rem' }}>
                  {componentsInArea.map((item, index) => {
                    const component = item.component;
                    return (
                      <Suspense key={component.id || index} fallback={<div className="p-4 text-center text-sm text-neutral-500">{t('loading.text', 'Loading...')}</div>}>
                        <PageComponentRenderer
                          component={component}
                          appConfig={appConfig}
                          pageParams={pageParams}
                          pageId={pageId}
                          nestingLevel={nestingLevel + 1}
                        />
                      </Suspense>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (Array.isArray(children) && cols && cols.length > 0) {
      const gridConfig = getResponsiveGridColumns();
      return (
        <div 
          className={`grid gap-${gutter} ${gridConfig.className}`} 
          style={{
            display: 'grid',
            gridTemplateColumns: gridConfig.gridTemplateColumns,
            gap: `${gutter}px`,
          }}
        >
          {React.Children.map(children, (child, index) => (
            <div key={`col-${index}`} className="w-full min-w-0">
              {child}
            </div>
          ))}
        </div>
      );
    }

    if (layout === 'flex') {
      // Narrow flow: collapse horizontal rows to a vertical stack. The inline
      // flexDirection beats any responsive class, so it must switch here too.
      const effectiveDirection = isMobileFlow && direction === 'horizontal' ? 'vertical' : direction;
      const collapsed = effectiveDirection !== direction;
      return (
        <div
          className={`flex ${effectiveDirection === 'vertical' ? 'flex-col' : 'flex-row'} gap-${gutter}`}
          style={{
            display: 'flex',
            flexDirection: effectiveDirection === 'vertical' ? 'column' : 'row',
            // Row-specific justify (space-between etc.) is meaningless once collapsed
            justifyContent: collapsed ? 'flex-start' : getJustifyStyle(justify),
            alignItems: collapsed ? 'stretch' : getAlignStyle(align),
            flexWrap: wrap,
            gap: `${gutter}px`,
          }}
        >
          {children}
        </div>
      );
    }

    if (layout === 'grid') {
      const gridConfig = getResponsiveGridColumns();
      return (
        <div 
          className={`grid gap-${gutter} ${gridConfig.className}`} 
          style={{
            display: 'grid',
            gridTemplateColumns: gridConfig.gridTemplateColumns,
            gap: `${gutter}px`,
          }}
        >
          {children}
        </div>
      );
    }

    return <div className="space-y-4">{children}</div>;
  };

  return (
    <div 
      ref={isEditMode ? setNodeRef : undefined}
      className={`container-renderer${fillCell ? ' h-full flex flex-col min-h-0' : ''} bg-white dark:bg-neutral-800 rounded-lg relative group ${customStyleProps.className} ${
        isEditMode && isOver ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      style={containerStyle}
    >
      {renderTitle()}
      {divider && <Separator />}
      <div className={`content relative ${fillCell ? 'flex-1 min-h-0 overflow-auto ' : ''}${padding ? '' : 'p-4'}`}>
        <Grid24FillCellProvider value={false}>
          {renderChildren()}
        </Grid24FillCellProvider>

        {isEditMode && (
          <ContainerDropZoneOverlay
            isOver={isOver}
            draggedComponentType={draggedComponentType}
            isAddingComponent={isAddingComponent}
            containerType="container"
          />
        )}

        {isEditMode && (!children || (Array.isArray(children) && children.length === 0)) && !isOver && (
          <div className="absolute inset-0 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg flex items-center justify-center pointer-events-none">
            <div className="text-sm text-neutral-400 dark:text-neutral-500">
              {t('container.drag_component_hint', 'Drag component here')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function getShadowStyle(shadow: 'none' | 'sm' | 'md' | 'lg' | 'xl'): string | undefined {
  switch (shadow) {
    case 'sm': return '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
    case 'md': return '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
    case 'lg': return '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
    case 'xl': return '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
    default: return undefined;
  }
}

function getJustifyStyle(justify: string): string {
  switch (justify) {
    case 'start': return 'flex-start';
    case 'end': return 'flex-end';
    case 'center': return 'center';
    case 'space-around': return 'space-around';
    case 'space-between': return 'space-between';
    default: return 'flex-start';
  }
}

function getAlignStyle(align: string): string {
  switch (align) {
    case 'top': return 'flex-start';
    case 'middle': return 'center';
    case 'bottom': return 'flex-end';
    default: return 'flex-start';
  }
} 