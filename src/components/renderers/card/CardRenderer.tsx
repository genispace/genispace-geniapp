import React, { useMemo, lazy, Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@genispace/shared-ui';
import { applyCustomStyles, resolveGapCSSValue } from '@/utils/styleUtils';
import { CustomStylesConfig } from '../../types/components';
import { SEMANTIC_COLORS } from '@/utils/colors';
import { cn } from '@genispace/shared-utils';
import { useDroppable } from '@dnd-kit/core';
import { useTabActivity } from '@/contexts/TabActivityContext';
import { useEditMode } from '@/runtime/runtime-mode';
import { ContainerDropZoneOverlay } from '@/runtime/runtime-mode';
import { useTranslation } from 'react-i18next';
import { Grid24FillCellProvider, useGrid24FillCell } from '@/layout/grid24CellContext';
import { useMobileFlowLayout } from '@/mobile/mobileFlowLayoutContext';
import {
  LayoutPreset, 
  GridArea, 
  getVisibleAreas
} from '@/utils/layoutSystem';
import '../../styles/layoutSystem.css';
import Grid24Renderer from '../../layout/Grid24Renderer';
import type { Grid24LayoutConfig } from '@/types/components';

interface CardRendererProps {
  title?: string;
  description?: string;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bordered?: boolean;
  hoverable?: boolean;
  shadow?: boolean;
  /** Vertical gap between card title (header) and content. Number = px, or CSS length e.g. 8px, 0.5rem */
  titleToContentGap?: string | number;
  id?: string;
  customStyles?: CustomStylesConfig;

  componentConfig?: any;

  appConfig?: Record<string, unknown>;

  pageParams?: any;

  pageId?: string;

  nestingLevel?: number;
}

const CardRenderer: React.FC<CardRendererProps> = ({
  title,
  description,
  footer,
  children,
  className = '',
  bordered = true,
  hoverable = false,
  shadow = true,
  titleToContentGap: titleToContentGapProp,
  id,
  customStyles,
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
    id: `card-drop-zone-${id || 'default'}`,
    data: {
      type: 'card',
      componentId: id,
      componentType: 'Card'
    },
    disabled: !isEditMode || !isTabActive,
  });

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

  const PageComponentRenderer = useMemo(() => {
    return lazy(() => import('../../runtime/ComponentRenderer'));
  }, []);

  const renderChildren = () => {

    if (layoutConfig && (layoutConfig as Grid24LayoutConfig).type === 'grid-24' && appConfig && componentConfig) {
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

    return children;
  };

  const titleStyle = useMemo(() => {
    if (!componentConfig?.props?.titleStyle) return {};
    const style: React.CSSProperties = {};
    if (componentConfig.props.titleStyle.fontSize) {
      style.fontSize = componentConfig.props.titleStyle.fontSize;
    }
    if (componentConfig.props.titleStyle.fontWeight) {
      style.fontWeight = componentConfig.props.titleStyle.fontWeight;
    }
    return style;
  }, [componentConfig]);

  const titleToContentGapCss = useMemo(() => {
    const gap = titleToContentGapProp ?? componentConfig?.props?.titleToContentGap;
    return resolveGapCSSValue(gap);
  }, [titleToContentGapProp, componentConfig]);

  const cardClassName = cn(
    'bg-card text-card-foreground rounded-lg',
    !bordered && 'border-0',
    bordered && 'border border-border',
    hoverable && 'transition-all hover:shadow-lg hover:-translate-y-1',
    shadow && 'shadow-sm',
    isEditMode && isOver && 'ring-2 ring-primary ring-offset-2',
    customStyleProps.className
  );

  // fillCell: page-root fill/fullscreen band. Content-mode Cards (default) leave
  // fillCell false so height hugs nested children — no internal scrollbar and
  // no empty shell below the last child.
  return (
    <Card 
      ref={isEditMode ? setNodeRef : undefined}
      className={cn(`${cardClassName} relative group`, fillCell && 'h-full flex flex-col min-h-0')}
      style={customStyleProps.style}
    >
      {title && (
        <CardHeader
          className={cn('header', fillCell && 'shrink-0', titleToContentGapCss && 'pb-0')}
          style={titleToContentGapCss ? { paddingBottom: 0 } : undefined}
        >
          <CardTitle 
            className={cn(

              !titleStyle.fontSize && "text-lg",

              !titleStyle.fontWeight && "font-semibold",
              "title"
            )} 
            style={Object.keys(titleStyle).length > 0 ? titleStyle : undefined}
          >
            {title}
          </CardTitle>
          {description && (
            <CardDescription className={`text-sm ${SEMANTIC_COLORS.text.muted} description`}>
              {description}
            </CardDescription>
          )}
        </CardHeader>
      )}
      <CardContent
        className={cn(
          'p-4 content relative',
          // overflow-auto only when the cell truly imposes height (fill). Content
          // mode must not scroll — the outer band auto-fits to children instead.
          fillCell ? 'flex-1 min-h-0 overflow-auto' : 'overflow-visible',
          title && titleToContentGapCss && 'pt-0'
        )}
        style={
          title && titleToContentGapCss
            ? { paddingTop: titleToContentGapCss }
            : undefined
        }
      >
        <Grid24FillCellProvider value={false}>
          {renderChildren()}

          {isEditMode && (
            <ContainerDropZoneOverlay
              isOver={isOver}
              draggedComponentType={draggedComponentType}
              isAddingComponent={isAddingComponent}
              containerType="card"
            />
          )}

          {isEditMode && !children && !isOver && (
            <div className="absolute inset-0 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg flex items-center justify-center pointer-events-none">
              <div className="text-sm text-neutral-400 dark:text-neutral-500">
                {t('container.drag_component_hint', 'Drag component here')}
              </div>
            </div>
          )}
        </Grid24FillCellProvider>
      </CardContent>
        {footer && (
        <CardFooter className={cn('p-4 border-t border-border footer', fillCell && 'shrink-0')}>
          {footer}
        </CardFooter>
      )}
    </Card>
  );
};

export default CardRenderer;
