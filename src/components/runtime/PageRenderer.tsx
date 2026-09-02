import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { useMobileNavigationCanGoBack } from '@/mobile/hooks/useMobileNavigationCanGoBack';
import { popMobileNavigationEntry, formatMobileNavEntry } from '@/mobile/utils/mobileNavigationStore';
import PageComponentRenderer from './ComponentRenderer';
import { useEditMode } from './runtime-mode';
import {
  Grid24EditableCanvas,
  MobileFlowCanvas,
  useGridCanvasGate,
  useStudioPreview,
} from './runtime-mode';
import Grid24Renderer from '../layout/Grid24Renderer';
import type { Grid24LayoutConfig } from '@/types/components';
import { 
  LayoutPreset, 
  GridArea, 
  getVisibleAreas,
  LAYOUT_PRESETS
} from '@/utils/layoutSystem';
import { ParameterRecord } from '../types/parameters';
import { usePageFullscreen } from '../contexts/PageFullscreenContext';
import { cn } from '@genispace/shared-utils';
import '../styles/layoutSystem.css';
import { isMobileWorkbenchViewport } from '@/mobile/components/ComponentAdapter';
import { useMobileFlowLayout } from '../mobile/mobileFlowLayoutContext';

interface PageLayoutConfig {
  type: 'default' | 'grid' | 'custom';
  preset?: LayoutPreset | 'top1-bottom2' | 'left1-right2' | 'top1-bottom3' | 'all-vertical' | 'dashboard-layout';
  areas?: {
    top?: string[];
    bottom?: string[];
    left?: string[];
    right?: string[];
  };
  gridTemplate?: {
    rows: string;
    columns: string;
    areas: string;
  };
  componentPositions?: Record<string, {
    area: GridArea | 'top' | 'bottom' | 'left' | 'right';
    order: number;
    span?: number; 
  }>;
}

type PageLayoutInput = PageLayoutConfig | Grid24LayoutConfig;

function isGrid24LayoutInput(lc: PageLayoutInput | undefined): lc is Grid24LayoutConfig {
  return !!lc && (lc as Grid24LayoutConfig).type === 'grid-24';
}

/** Synthetic config for pages ADOPTED by the editable canvas (no stored grid-24
    layout yet): mergeGrid24WithChildIds stacks the components full-width and the
    first layout commit persists the conversion. Module-level for stable identity. */
const ADOPTION_GRID24_CONFIG: Grid24LayoutConfig = {
  type: 'grid-24',
  columns: 24,
  gap: 16,
  rowGap: 16,
  rowHeight: 50,
  components: [],
};

export interface RenderPageComponentContext {
  appConfig: any;
  pageParams?: ParameterRecord;
  pageId?: string;
  tabId?: string;
  keyPrefix: string;
}

export type RenderPageComponent = (
  component: any,
  index: number,
  context: RenderPageComponentContext,
) => React.ReactNode;

interface PageLayoutRendererProps {
  components: any[];
  appConfig: any;
  layoutConfig?: PageLayoutInput;
  pageParams?: ParameterRecord;
  pageId?: string;
  tabId?: string;
  renderComponent?: RenderPageComponent;
}

const PageLayoutRenderer: React.FC<PageLayoutRendererProps> = ({
  components,
  appConfig,
  layoutConfig,
  pageParams,
  pageId,
  tabId,
  renderComponent: renderApplicationComponent,
}) => {
  // Narrow flow (real mobile OR phone frame) drives every layout branch below
  // — legacy preset pages stack in the frame exactly as on a device. The raw
  // viewport stays for real-device-only concerns (canvas gate, mobile back).
  const isMobileViewport = useMobileFlowLayout();
  const isRealMobileViewport = isMobileWorkbenchViewport();
  const isPageFullscreen = usePageFullscreen();
  const { isEditMode, permissions } = useEditMode();
  const { previewOnly } = useStudioPreview();
  // Free-canvas editing applies to the page-root grid only; fullscreen and
  // mobile rendering keep the plain view renderer. The gate is computed ONCE in
  // WorkbenchEditMode (shared with the page drop-zone suppression) — the local
  // computation is only the fallback outside that provider.
  const gridCanvasGate = useGridCanvasGate();
  const useEditableCanvas =
    gridCanvasGate ??
    (isEditMode && permissions.canEdit && !previewOnly && !isRealMobileViewport && !isPageFullscreen);

  // Sub-page back button (mobile, opt-in via appConfig.subPageBackButton). Shown on pages
  // reached via navigation/row-click (mobile nav stack can go back). Positioned below a
  // sticky FilterPanel when the first component is one, else at the very top of the page.
  const { t } = useTranslation('workbench');
  const navigate = useNavigate();
  const canGoBack = useMobileNavigationCanGoBack();
  const backEnabled = isRealMobileViewport && canGoBack && Boolean((appConfig as any)?.subPageBackButton);
  const handleSubPageBack = useCallback(() => {
    const prev = popMobileNavigationEntry();
    if (prev) navigate(formatMobileNavEntry(prev), { replace: true });
  }, [navigate]);
  const subPageBack = backEnabled ? (
    <button
      key="__subpage_back__"
      type="button"
      onClick={handleSubPageBack}
      aria-label={t('mobile.back', 'Back')}
      className="flex w-fit items-center gap-1 text-sm text-indigo-600"
    >
      <ChevronLeft className="h-4 w-4" />
      {t('mobile.back', 'Back')}
    </button>
  ) : null;
  const stickyFilterFirst =
    backEnabled && components[0]?.type === 'FilterPanel' && Boolean(components[0]?.props?.sticky);

  const renderComponent = useCallback((component: any, index: number, keyPrefix: string = '') => {
    if (renderApplicationComponent) {
      return renderApplicationComponent(component, index, {
        appConfig,
        pageParams,
        pageId,
        tabId,
        keyPrefix,
      });
    }
    return (
      <PageComponentRenderer
        key={`${keyPrefix}${component.id || component.type}-${index}`}
        component={component}
        appConfig={appConfig}
        pageParams={pageParams}
        pageId={pageId}
        tabId={tabId}
        nestingLevel={0}
      />
    );
  }, [appConfig, pageParams, pageId, renderApplicationComponent, tabId]);

  const mapLegacyArea = (area: string): GridArea => {
    const mapping: Record<string, GridArea> = {
      'top': 'top',
      'bottom': 'bottom',
      'bottom-left': 'bottom-left',
      'bottom-center': 'bottom-center',
      'bottom-right': 'bottom-right',
      'bottom-second': 'bottom-second',
      'left': 'left',
      'left-top': 'left-top',
      'left-center': 'left-center',
      'left-bottom': 'left-bottom',
      'right': 'right',
      'right-top': 'right-top',
      'right-bottom': 'right-bottom',
      'header': 'header',
      'middle-left': 'middle-left',
      'middle-center': 'middle-center',
      'middle-right': 'middle-right',
      'middle': 'middle'
    };
    return (mapping[area] as GridArea) || (area as GridArea);
  };

  const componentMapping = useMemo(() => {

    if (!layoutConfig || isGrid24LayoutInput(layoutConfig)) {
      return null;
    }

    if (!layoutConfig.componentPositions) {
      return null;
    }

    const legacyLayout = layoutConfig;
    const mapping: Record<GridArea, any[]> = {
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

    const withoutLayout: any[] = [];

    components.forEach(component => {
      const position = legacyLayout.componentPositions?.[component.id];
      if (position?.area) {

        const mappedArea = mapLegacyArea(position.area);
        if (mapping[mappedArea]) {
          mapping[mappedArea].push({ component, order: position.order || 0 });
        } else {
          withoutLayout.push({ component, order: 0 });
        }
      } else {
        withoutLayout.push({ component, order: 0 });
      }
    });

    Object.keys(mapping).forEach((area: string) => {
      mapping[area as GridArea].sort((a, b) => a.order - b.order);
    });

    mapping['top'].push(...withoutLayout);

    return mapping;
  }, [components, layoutConfig]);

  const renderComponentList = useCallback((componentList: any[], keyPrefix: string = '') => (
    <div
      className="w-full h-full flex flex-col"
      style={{ gap: isMobileViewport ? '0.75rem' : '1rem' }}
    >
      {componentList.map((item, index) => {
        const component = item.component || item;

        const position = (layoutConfig as PageLayoutConfig).componentPositions?.[component.id];
        const span = position?.span || component.props?.span || 1;
        const gridColumnStyle = span > 1 ? { gridColumn: `span ${span}` } : {};

        return (
          <div 
            key={`${keyPrefix}${component.id || component.type}-${index}`} 
            style={gridColumnStyle}
            className="w-full flex-shrink-0"
          >
            {renderComponent(component, index, keyPrefix)}
          </div>
        );
      })}
    </div>
  ), [renderComponent, layoutConfig, isMobileViewport]);

  // Empty page (no components yet, e.g. freshly created draft): render a quiet
  // hint instead of a blank surface. Placed after all hooks (rules of hooks);
  // edit mode overlays its own drop zones above this.
  // In editable-canvas mode an empty page must still mount the canvas — it is
  // the drop target for palette drags (and shows its own affordance).
  if ((!components || components.length === 0) && !useEditableCanvas) {
    return (
      <div className="flex min-h-[240px] items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">
          {t('page_empty_hint', 'This page has no content yet.')}
        </p>
      </div>
    );
  }

  // Editable canvas: grid-24 pages natively; pages WITHOUT legacy area
  // positioning (missing layout / no componentPositions) are ADOPTED — the
  // canvas synthesizes stacked placements (mergeGrid24WithChildIds) and the
  // first layout commit persists the grid-24 conversion. Pages with real
  // legacy componentPositions keep the old edit UX.
  const editableGridConfig: Grid24LayoutConfig | null = isGrid24LayoutInput(layoutConfig)
    ? layoutConfig
    : !layoutConfig || !(layoutConfig as PageLayoutConfig).componentPositions
      ? ADOPTION_GRID24_CONFIG
      : null;

  if (useEditableCanvas && pageId && editableGridConfig) {
    return (
      <div className="h-full w-full min-h-0">
        <React.Suspense fallback={<div className="min-h-[240px] w-full animate-pulse rounded-lg bg-muted/30" />}>
          <Grid24EditableCanvas
            config={editableGridConfig}
            components={components}
            appConfig={appConfig}
            pageParams={pageParams}
            pageId={pageId}
            tabId={tabId}
          />
        </React.Suspense>
      </div>
    );
  }

  // Studio phone preset in edit mode: selection/configuration parity with PC,
  // but "layout" in the single-column flow means STACK ORDER — the flow canvas
  // edits layout.mobileOrder (mobile-only; the desktop grid is untouched).
  if (
    isEditMode &&
    permissions.canEdit &&
    previewOnly &&
    !isMobileViewport &&
    !isPageFullscreen &&
    pageId &&
    editableGridConfig
  ) {
    return (
      <div className="h-full w-full min-h-0">
        <React.Suspense fallback={<div className="min-h-[240px] w-full animate-pulse rounded-lg bg-muted/30" />}>
          <MobileFlowCanvas
            config={editableGridConfig}
            components={components}
            appConfig={appConfig}
            pageParams={pageParams}
            pageId={pageId}
            tabId={tabId}
          />
        </React.Suspense>
      </div>
    );
  }

  if (layoutConfig && isGrid24LayoutInput(layoutConfig)) {
    return (
      <div className={cn('h-full w-full min-h-0', isPageFullscreen && 'flex flex-1 flex-col')}>
        <Grid24Renderer
          config={layoutConfig as Grid24LayoutConfig}
          components={components}
          nestingLevel={0}
          appConfig={appConfig}
          pageParams={pageParams}
          pageId={pageId}
          tabId={tabId}
          // Studio phone-frame preview (previewOnly = mobile preset): stack
          // vertically like real mobile instead of squeezing the 24-col grid.
          forceMobileFlow={previewOnly}
          // Sub-page back button (real mobile only, backEnabled-gated): the fluid
          // fallback path injects it inline; grid-24 pages hand it to the mobile
          // flow so it lands below a pinned FilterPanel just the same.
          mobileFlowInsert={subPageBack}
        />
      </div>
    );
  }

  if (layoutConfig && componentMapping) {

    let preset: LayoutPreset = 'all-vertical';

    if (layoutConfig.preset && Object.keys(LAYOUT_PRESETS).includes(layoutConfig.preset)) {
      preset = layoutConfig.preset as LayoutPreset;
    } else {

      const legacyMapping: Record<string, LayoutPreset> = {
        'all-vertical': 'all-vertical',
        'top1-bottom2': 'top1-bottom2',
        'top1-bottom2-equal': 'top1-bottom2-equal',
        'left1-right2': 'left1-right2',
        'top1-bottom3': 'top1-bottom3'
      };
      preset = legacyMapping[layoutConfig.preset as string] || 'all-vertical';
    }

    const visibleAreas = getVisibleAreas(preset);

    if (isMobileViewport) {
      const allComponents = visibleAreas.flatMap(
        (area) => componentMapping?.[area] || []
      );

      return (
        <div className="mobile-flow-layout flex w-full flex-col gap-3">
          {allComponents.map((item, index) => {
            const component = item.component || item;
            // Same native-sticky anchoring as the grid-24 mobile flow: a pinned FilterPanel's
            // wrapper must not generate a box (display:contents), or its containing block is a
            // wrapper as tall as itself and sticky has nowhere to travel.
            const isStickyPanel =
              component?.type === 'FilterPanel' && Boolean(component?.props?.sticky);
            return (
              <div
                key={`mobile-${component.id || component.type}-${index}`}
                className={isStickyPanel ? 'contents' : 'w-full'}
              >
                {renderComponent(component, index, 'mobile-')}
              </div>
            );
          })}
        </div>
      );
    }

      return (
      <div className={`layout-grid layout-${preset} h-full w-full`}>
        {visibleAreas.map((area) => {
          const componentsInArea = componentMapping?.[area] || [];

          if (componentsInArea.length === 0) {
            return null;
          }

          return (
          <div
            key={area}
            className={`layout-area-${area} min-h-0 min-w-0`}
          >
            {renderComponentList(componentsInArea, `${area}-`)}
           </div>
          );
        })}
       </div>
      );
  }

  // A Title immediately followed by a Paragraph is a page-header block — keep the
  // description hugging the title instead of a full layout gap (console PageLayout parity).
  const fallbackItems: React.ReactNode[] = [];
  for (let i = 0; i < components.length; i++) {
    const component = components[i];
    const next = components[i + 1];
    if (component?.type === 'Title' && next?.type === 'Paragraph') {
      fallbackItems.push(
        <div
          key={`fallback-header-${component.id || component.type}-${i}`}
          className="space-y-1"
        >
          {renderComponent(component, i, 'fallback-')}
          {renderComponent(next, i + 1, 'fallback-')}
        </div>
      );
      i++;
      continue;
    }
    fallbackItems.push(renderComponent(component, i, 'fallback-'));
  }
  const ordered = !backEnabled
    ? fallbackItems
    : stickyFilterFirst
      ? [fallbackItems[0], subPageBack, ...fallbackItems.slice(1)]
      : [subPageBack, ...fallbackItems];
  return (
    <div className={isMobileViewport ? 'mobile-flow-layout space-y-3 w-full' : 'space-y-4 w-full'}>
      {ordered}
    </div>
  );
};

export default PageLayoutRenderer;
