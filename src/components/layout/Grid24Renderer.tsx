import React, { Suspense, lazy, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MAX_GRID24_NESTING_DEPTH,
  computeRowCount,
  getComponentGridColumn,
  getComponentGridRow,
  validateRowColSpan,
} from '@/utils/grid24LayoutSystem';
import type { Grid24LayoutConfig } from '@/types/components';
import { ParameterRecord } from '../types/parameters';
import { usePageFullscreen } from '@/contexts/PageFullscreenContext';
import { cn } from '@genispace/shared-utils';
import '../styles/grid24.css';
import { sortGrid24ComponentsForMobileFlow } from '@/mobile/components/ComponentAdapter';
import { useMobileFlowLayout } from '@/mobile/mobileFlowLayoutContext';
import { getGrid24SizeCapability } from '@/utils/grid24LayoutSystem';
import { Grid24FillCellProvider } from './grid24CellContext';

const PageComponentRenderer = lazy(() => import('../runtime/ComponentRenderer'));

interface Grid24RendererProps {
  config: Grid24LayoutConfig;
  components: any[];
  nestingLevel: number;
  appConfig: any;
  pageParams?: ParameterRecord;
  pageId?: string;
  tabId?: string;
  /** Render the mobile vertical flow regardless of the GLOBAL viewport flag —
      the studio's phone-frame preview must stack like real mobile does, but
      cannot flip the global override (it would switch the whole shell). */
  forceMobileFlow?: boolean;
  /** Optional node injected into the MOBILE flow only (e.g. the sub-page back
      button). Sits right below the first pinned FilterPanel, else at the top —
      mirroring the fluid fallback path in PageLayoutRenderer. */
  mobileFlowInsert?: React.ReactNode;
}

const DEFAULT_GRID24_GAP = 16;
const DEFAULT_GRID24_ROW_HEIGHT = 50;
const AUTO_HEIGHT_ROW_TEMPLATE = 'minmax(0, auto)';

/** Sizing capability mode for a placed component (registry-driven). */
function cellSizeMode(
  gridComp: Grid24LayoutConfig['components'][number],
  componentMap: Record<string, any>
): 'content' | 'fill' {
  return getGrid24SizeCapability(componentMap[gridComp.id]?.type).mode;
}

function isAutoHeightSingleSpanComponent(
  gridComp: Grid24LayoutConfig['components'][number],
  componentMap: Record<string, any>
): boolean {
  if (gridComp.rowStart === undefined || gridComp.rowSpan !== 1) return false;
  return cellSizeMode(gridComp, componentMap) === 'content';
}

/** Row sizes to content when EVERY component touching it is content-mode
    (registry generalization of the former NavTile-only special case). */
function isContentOnlyRow(
  rowIndex: number,
  gridComponents: Grid24LayoutConfig['components'],
  componentMap: Record<string, any>
): boolean {
  const rowComponents = gridComponents.filter(
    (gridComp) => rowIndex >= gridComp.rowStart && rowIndex < gridComp.rowStart + gridComp.rowSpan
  );

  return (
    rowComponents.length > 0 &&
    rowComponents.every((gridComp) => cellSizeMode(gridComp, componentMap) === 'content')
  );
}

function getFullscreenRowTemplate(
  rowIndex: number,
  gridComponents: Grid24LayoutConfig['components'],
  componentMap: Record<string, any>
): string {
  if (isContentOnlyRow(rowIndex, gridComponents, componentMap)) {
    return AUTO_HEIGHT_ROW_TEMPLATE;
  }

  const hasAutoHeightSingleSpanStartingAtRow = gridComponents.some(
    (gridComp) =>
      gridComp.rowStart === rowIndex &&
      isAutoHeightSingleSpanComponent(gridComp, componentMap)
  );

  if (hasAutoHeightSingleSpanStartingAtRow) {
    return AUTO_HEIGHT_ROW_TEMPLATE;
  }

  return 'minmax(0, 1fr)';
}

const Grid24Renderer: React.FC<Grid24RendererProps> = ({
  config,
  components,
  nestingLevel,
  appConfig,
  pageParams,
  pageId,
  tabId,
  forceMobileFlow = false,
  mobileFlowInsert = null,
}) => {
  const { t } = useTranslation('workbench');
  const isPageFullscreen = usePageFullscreen();
  // Only the PAGE-ROOT grid fills the viewport. Nested grids (Card / Container
  // children) must size to content / rowSpan bands — otherwise empty 1fr rows
  // crush nested StatisticGroups into flat clipped strips.
  const fillViewport = isPageFullscreen && nestingLevel === 0;
  // Narrow flow (real mobile OR phone frame): nested grid-24 sublayouts
  // (Container children) stack in the frame exactly as on a device. Hook must
  // stay above the nesting-depth early return (rules of hooks).
  const isMobileViewport = useMobileFlowLayout();
  const columnGap =
    typeof config.gap === 'number' && Number.isFinite(config.gap) ? config.gap : DEFAULT_GRID24_GAP;
  const rowGapSafe =
    typeof config.rowGap === 'number' && Number.isFinite(config.rowGap) ? config.rowGap : DEFAULT_GRID24_GAP;
  const rowHeightPx =
    typeof config.rowHeight === 'number' && Number.isFinite(config.rowHeight)
      ? config.rowHeight
      : DEFAULT_GRID24_ROW_HEIGHT;
  const componentMap = useMemo(() => {
    const map: Record<string, any> = {};
    (components || []).forEach((comp: any) => {
      if (comp?.id) map[comp.id] = comp;
    });
    return map;
  }, [components]);

  const rowCount = useMemo(() => Math.max(1, computeRowCount(config.components)), [config.components]);

  const isValid = useMemo(() => validateRowColSpan(config.components), [config.components]);

  if (!isValid) {
    console.warn('[Grid24Renderer] Row colSpan sum exceeds 24 for some row');
  }

  const gridTemplateRows = useMemo(() => {
    // Nested grids (Card / Container): always hug content. The page-root 50px
    // band floor would pad a short StatisticGroup into a tall empty shell.
    if (nestingLevel > 0) {
      return Array.from({ length: rowCount }, () => AUTO_HEIGHT_ROW_TEMPLATE).join(' ');
    }
    const defaultRowTemplate = `minmax(${rowHeightPx}px, auto)`;
    // content-only rows size to their content (a Title band is ~32px, not a
    // forced 50px+ minimum); mixed rows keep the band minimum so fill
    // neighbours get their space.
    return Array.from({ length: rowCount }, (_, rowIndex) =>
      isContentOnlyRow(rowIndex, config.components, componentMap)
        ? AUTO_HEIGHT_ROW_TEMPLATE
        : defaultRowTemplate
    ).join(' ');
  }, [componentMap, config.components, nestingLevel, rowCount, rowHeightPx]);

  const fullscreenGridTemplateRows = useMemo(
    () =>
      Array.from({ length: rowCount }, (_, rowIndex) =>
        getFullscreenRowTemplate(rowIndex, config.components, componentMap)
      ).join(' '),
    [componentMap, config.components, rowCount]
  );

  if (nestingLevel >= MAX_GRID24_NESTING_DEPTH) {
    return (
      <div className="space-y-4 w-full">
        <div className="grid-24-nesting-warning" role="note">
          {t(
            'grid24.nesting_fallback',
            'Nesting depth is at or above the limit (≥{{max}}). The inner 24-column grid has fallen back to a simple vertical stack. Use a preset layout or reduce nesting.',
            { max: MAX_GRID24_NESTING_DEPTH }
          )}
        </div>
        {(components || []).map((comp: any) =>
          comp?.id ? (
            <Suspense key={comp.id} fallback={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}>
              <PageComponentRenderer
                component={comp}
                appConfig={appConfig}
                pageParams={pageParams}
                pageId={pageId}
                tabId={tabId}
                nestingLevel={nestingLevel + 1}
              />
            </Suspense>
          ) : null
        )}
      </div>
    );
  }

  if (isMobileViewport || forceMobileFlow) {
    const sortedComponents = sortGrid24ComponentsForMobileFlow(config.components, config.mobileOrder);
    // Insert placement: below the first pinned FilterPanel when the flow opens with
    // one (sticky anchoring needs the panel first), otherwise at the very top.
    const firstGridComp = sortedComponents[0];
    const firstComp = firstGridComp ? componentMap[firstGridComp.id] : undefined;
    const firstIsStickyPanel =
      firstComp?.type === 'FilterPanel' && Boolean(firstComp?.props?.sticky);
    const insertAtTop = mobileFlowInsert && !firstIsStickyPanel ? mobileFlowInsert : null;

    return (
      <div className="mobile-flow-layout flex w-full min-h-0 flex-col gap-3">
        {insertAtTop}
        {sortedComponents.map((gridComp, gridIndex) => {
          const actualComponent = componentMap[gridComp.id];
          if (!actualComponent) return null;

          // A sticky component (pinned FilterPanel) must anchor its native-sticky containing
          // block to this tall flow column, not a wrapper as tall as itself — display:contents
          // skips the box, matching PageComponentRenderer's sticky shell (useEscapedStickyPanel
          // still falls back to the in-place fixed pin in constrained layouts).
          const isStickyPanel =
            actualComponent.type === 'FilterPanel' && Boolean(actualComponent.props?.sticky);

          return (
            <React.Fragment key={gridComp.id}>
              <div className={isStickyPanel ? 'contents' : 'mobile-flow-item w-full'}>
                <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}>
                  <PageComponentRenderer
                    component={actualComponent}
                    appConfig={appConfig}
                    pageParams={pageParams}
                    pageId={pageId}
                    tabId={tabId}
                    nestingLevel={nestingLevel + 1}
                  />
                </Suspense>
              </div>
              {mobileFlowInsert && firstIsStickyPanel && gridIndex === 0 ? mobileFlowInsert : null}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  const innerStyle: React.CSSProperties = fillViewport
    ? {
        gridTemplateRows: fullscreenGridTemplateRows,
        columnGap,
        rowGap: rowGapSafe,
        flex: 1,
        height: '100%',
        minHeight: 0,
      }
    : {
        gridTemplateRows,
        columnGap: columnGap,
        rowGap: rowGapSafe,
      };

  return (
    <div className={cn('grid-24 w-full min-h-0', fillViewport && 'grid-24-fill h-full flex flex-1 flex-col')}>
      <div className={cn('grid-24-inner', fillViewport && 'min-h-0 flex-1')} style={innerStyle}>
        {config.components.map((gridComp) => {
          const actualComponent = componentMap[gridComp.id];
          if (!actualComponent) return null;

          const mode = cellSizeMode(gridComp, componentMap);
          const isFitContentCell =
            fillViewport && isAutoHeightSingleSpanComponent(gridComp, componentMap);
          // Fixed fill-band px height is PAGE-ROOT only. Nested grids (Card /
          // Container children) size to content — otherwise a fill child like
          // StatisticGroup keeps a tall empty band under its cards and the
          // parent Card cannot hug.
          const imposeFillBand = !fillViewport && mode === 'fill' && nestingLevel === 0;
          const rowSpan = Math.max(1, gridComp.rowSpan || 1);
          const fillHeightPx = rowSpan * rowHeightPx + (rowSpan - 1) * rowGapSafe;

          // Imposed-height context: root fill bands and viewport-fill stretch.
          // Always render the provider (keyed) so fullscreen toggles don't remount.
          const imposedHeight = imposeFillBand || (fillViewport && !isFitContentCell);
          return (
            <Grid24FillCellProvider key={gridComp.id} value={imposedHeight}>
              <div
                className={cn(
                  'grid-24-cell',
                  fillViewport && !isFitContentCell && 'h-full min-h-0 overflow-hidden',
                  isFitContentCell && 'grid-24-cell--fit-content',
                  imposeFillBand && 'grid-24-cell--fill'
                )}
                style={{
                  gridColumn: getComponentGridColumn(gridComp),
                  gridRow: getComponentGridRow(gridComp),
                  ...(imposeFillBand ? { height: `${fillHeightPx}px` } : {}),
                }}
              >
                <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}>
                  <PageComponentRenderer
                    component={actualComponent}
                    appConfig={appConfig}
                    pageParams={pageParams}
                    pageId={pageId}
                    tabId={tabId}
                    nestingLevel={nestingLevel + 1}
                  />
                </Suspense>
              </div>
            </Grid24FillCellProvider>
          );
        })}
      </div>
    </div>
  );
};

export default Grid24Renderer;
