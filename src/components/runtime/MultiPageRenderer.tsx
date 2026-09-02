import React, { useEffect, useMemo, memo } from 'react';
import { TabItem } from './TabManager';
import PageLayoutRenderer from './PageRenderer';
import { WorkbenchEditMode } from './runtime-mode';
import { PageLoadingSkeleton } from '@genispace/shared-ui';
import { renderLucideIcon } from '@/utils/iconUtils';
import { ParameterProvider } from '../contexts/ParameterContext';
import { useTranslation } from 'react-i18next';
import { usePageAutoRefresh } from '../hooks/usePageAutoRefresh';
import type { PageConfig as PageConfigType } from '../types/components';
import { createDefaultGrid24Layout } from '@/utils/grid24LayoutSystem';
import { isMobileWorkbenchViewport } from '@/mobile/components/ComponentAdapter';
import { useMobileFlowLayout } from '@/mobile/mobileFlowLayoutContext';
import { useLocalizedPageConfig } from '@/contexts/WorkbenchConfigLocaleContext';
import { MOBILE_BOTTOM_NAV_CLEARANCE } from '@/mobile/utils/mobileBottomNavInset';
import { useMobileTabTransitionDirection } from '@/mobile/hooks/useMobileTabTransitionDirection';
import { resetMobileTabTransitionDirection } from '@/mobile/utils/mobileNavigationStore';
import { cn } from '@genispace/shared-utils';
import { usePageFullscreen } from '../contexts/PageFullscreenContext';
import { TabActivityProvider } from '../contexts/TabActivityContext';
import { PageComingSoonOverlay } from './PageComingSoonOverlay';
import { applyCustomStyles } from '@/utils/styleUtils';
import type { ParameterRecord } from '../types/parameters';

const ParameterDebugPanel: React.FC = () => {

  return null;

  // const { currentTabParams } = useParameterContext();
  // const { isEditMode } = useEditMode();
  // const [isCollapsed, setIsCollapsed] = React.useState(false);

  // const filterPanelParams = React.useMemo(() => {
  //   return Object.entries(currentTabParams).filter(([key]) => 
  //     key.includes('filterPanel') || key.includes('FilterPanel')
  //   );
  // }, [currentTabParams]);

  // if (!isEditMode) {
  //   return null;
  // }

  // if (Object.keys(currentTabParams).length === 0) {
  //   return null;
  // }

  // return (
  //   <div className="fixed bottom-20 left-4 z-50 max-w-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg">
  //     <div 
  //       className="flex items-center justify-between px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-t-lg cursor-pointer"
  //       onClick={() => setIsCollapsed(!isCollapsed)}
  //     >
  //       <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">

  //       </span>
  //       <span className="text-xs text-neutral-500">
  //         {isCollapsed ? '▶' : '▼'}
  //       </span>
  //     </div>
  //     {!isCollapsed && (
  //       <div className="p-3 max-h-64 overflow-auto text-xs">
  //         {filterPanelParams.length > 0 ? (
  //           <div className="mb-2">
  //             <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">

  //             </div>
  //             {filterPanelParams.map(([key, value]) => (
  //               <div key={key} className="flex justify-between gap-2 py-1 border-b border-neutral-100 dark:border-neutral-700">
  //                 <span className="text-neutral-600 dark:text-neutral-400 truncate" title={key}>
  //                   {key}:
  //                 </span>
  //                 <span className="text-neutral-900 dark:text-neutral-100 font-mono">
  //                   {JSON.stringify(value)}
  //                 </span>
  //               </div>
  //             ))}
  //           </div>
  //         ) : (

  //         )}

  //         <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1 mt-2">

  //         </div>
  //         {Object.entries(currentTabParams).map(([key, value]) => (
  //           <div key={key} className="flex justify-between gap-2 py-1 border-b border-neutral-100 dark:border-neutral-700">
  //             <span className="text-neutral-600 dark:text-neutral-400 truncate" title={key}>
  //               {key}:
  //             </span>
  //             <span className="text-neutral-900 dark:text-neutral-100 font-mono">
  //               {JSON.stringify(value)}
  //             </span>
  //           </div>
  //         ))}
  //       </div>
  //     )}
  //   </div>
  // );
};

export interface RenderGeniAppPageContext {
  pageId: string;
  tabId: string;
  pageConfig: PageConfigType;
  appConfig: any;
  pageParams: ParameterRecord;
}

export type RenderGeniAppPage = (context: RenderGeniAppPageContext) => React.ReactNode;

interface TabContentProps {
  tab: TabItem;
  appConfig: any;
  availableParameters: Array<{ label: string; value: string; type?: string }>;
  isEmpty: boolean;
  isTabActive?: boolean;
  renderPage?: RenderGeniAppPage;
}

const TabContent = memo<TabContentProps>(({ tab, appConfig, availableParameters, isEmpty, isTabActive = true, renderPage }) => {
  const { t } = useTranslation(['workbench', 'common']);
  const rawPageConfig = tab.pageConfig as PageConfigType;
  const pageConfig = useLocalizedPageConfig(tab.pageId, rawPageConfig) ?? rawPageConfig;
  // Narrow flow (real mobile OR phone frame) drives the page gutter/scroll
  // styling; the bottom-nav CLEARANCE stays real-viewport-only — the studio
  // frame's nav preview is in-flow (flex), not a fixed overlay.
  const isMobileViewport = useMobileFlowLayout();
  const isRealMobileViewport = isMobileWorkbenchViewport();
  const isPageFullscreen = usePageFullscreen();
  const pageStyleProps = applyCustomStyles(
    `page-${tab.pageId}`,
    pageConfig.customStyles,
    ''
  );

  return (
    <TabActivityProvider value={isTabActive}>
    <div
      className={cn(
        'h-full w-full min-h-0 bg-neutral-50 dark:bg-neutral-900',
        pageStyleProps.className,
        isPageFullscreen
          ? 'flex flex-col overflow-hidden'
          : isMobileViewport
            // Mobile: vertical scroll only (hide horizontal + disable overscroll bounce/chaining so the page feels fixed) + hide scrollbar.
            // Top padding lives on the inner wrapper (below) so a sticky first component (e.g. pinned
            // FilterPanel) anchors flush to the scrollport top instead of leaving an 8px gap that leaks.
            ? 'overflow-y-auto overflow-x-hidden overscroll-none mobile-no-scrollbar'
            : 'overflow-auto custom-scrollbar pt-4',
      )}
      style={pageStyleProps.style}
    >
      <div
        className={cn(
          isPageFullscreen
            // Keep an inset in fullscreen so cards don't sit flush against the
            // chrome frame (Workbench removes the normal page gutter when filling).
            ? 'flex min-h-0 flex-1 flex-col p-3 sm:p-4 md:p-5'
            : isMobileViewport
              ? 'px-2 pt-2'
              : 'px-4 pb-4',
        )}
        style={
          !isPageFullscreen && isRealMobileViewport
            ? { paddingBottom: MOBILE_BOTTOM_NAV_CLEARANCE }
            : undefined
        }
      >
        <ParameterProvider
          tabId={tab.id}
          pageId={tab.pageId}
          initialParams={tab.urlParams || {}}
        >
          <ParameterDebugPanel />

          {/* Same (localized) object PageLayoutRenderer reads — the edit-mode
              gate and the renderer must never see diverging configs. */}
          <WorkbenchEditMode
            pageConfig={pageConfig}
            pageId={tab.pageId}
            tabId={tab.id}
            isTabActive={isTabActive}
            availableParameters={availableParameters}
          >
            {isEmpty ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-md mx-auto">
                  <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-4">
                    {renderLucideIcon('layout-grid', 'w-12 h-12 text-primary')}
                  </div>
                  <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                    {t('multi_page_renderer.start_building', 'Start Building Your Page')}
                  </h3>
                  <p className="text-neutral-500 dark:text-neutral-400 mb-6">
                    {t('multi_page_renderer.start_building_description', 'Drag components from the component library on the right to here to start building your page')}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-neutral-400 dark:text-neutral-500">
                    {renderLucideIcon('arrow-right', 'w-4 h-4')}
                    <span>{t('multi_page_renderer.drag_component_hint', 'Drag components here')}</span>
                  </div>
                </div>
              </div>
            ) : renderPage ? (
              renderPage({
                pageId: tab.pageId,
                tabId: tab.id,
                pageConfig,
                appConfig,
                pageParams: tab.urlParams || {},
              })
            ) : (
              <PageLayoutRenderer
                key={`layout-${tab.id}`}
                components={pageConfig.components || []}
                appConfig={appConfig}
                layoutConfig={pageConfig.layout as any}
                pageParams={tab.urlParams}
                pageId={tab.pageId}
                tabId={tab.id}
              />
            )}
          </WorkbenchEditMode>
        </ParameterProvider>

        {/* Publish-history footer link: muted, bottom of every page when the
            workbench-header switch is on and a target page is configured.
            Hidden on the target page itself. */}
        {appConfig?.showPublishHistory && appConfig?.publishHistoryPageKey && tab.pageId !== appConfig.publishHistoryPageKey && (
          <div className="mt-8 flex justify-center pb-2">
            <button
              type="button"
              className="text-xs text-neutral-400 transition-colors hover:text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-500"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('workbench-open-tab', {
                    detail: {
                      pageId: appConfig.publishHistoryPageKey,
                      navigationTitle: t('publish_history_nav', 'Publish History'),
                      icon: 'history',
                      urlParams: {},
                    },
                  })
                )
              }
            >
              {t('view_publish_history', 'View publish history')}
            </button>
          </div>
        )}
      </div>
    </div>
    {/* Sibling of the scroll container so it doesn't scroll with content; positioned by the
        tab wrapper (absolute inset-0) in MultiPageRenderer below. Edit-mode gating lives inside
        the overlay — subscribing to useEditMode here would defeat TabContent's memo. */}
    {pageConfig?.comingSoon?.enabled && <PageComingSoonOverlay />}
    </TabActivityProvider>
  );
});

TabContent.displayName = 'TabContent';

interface MultiPageRendererProps {
  tabs: TabItem[];
  activeTabId: string | null;
  appConfig: any;
  availableParameters?: Array<{ label: string; value: string; type?: string }>;
  renderPage?: RenderGeniAppPage;
}

export const MultiPageRenderer: React.FC<MultiPageRendererProps> = ({
  tabs,
  activeTabId,
  appConfig,
  availableParameters = [],
  renderPage,
}) => {
  const { t } = useTranslation(['workbench', 'common']);
  const isMobileViewport = isMobileWorkbenchViewport();
  const tabTransitionDirection = useMobileTabTransitionDirection();

  const resolvedActiveTabId = useMemo(() => {
    if (tabs.length === 0) return null;
    if (activeTabId && tabs.some((t) => t.id === activeTabId)) return activeTabId;
    const marked = tabs.find((t) => t.isActive);
    if (marked) return marked.id;
    if (tabs.length === 1) return tabs[0].id;
    return tabs[0]?.id ?? null;
  }, [tabs, activeTabId]);

  const renderedTabs = useMemo(() => {
    return tabs.map((tab) => {
      const isActive = tab.id === resolvedActiveTabId;
      const hasError = Boolean(tab.hasError);
      const isLoading = Boolean(tab.isLoading);
      const showError = hasError && !isLoading;
      const showContent = Boolean(tab.pageConfig) && !isLoading && !hasError;

      return { tab, isActive, hasError, isLoading, showError, showContent };
    });
  }, [tabs, resolvedActiveTabId]);

  const activeTabForAutoRefresh = useMemo(() => {
    const entry = renderedTabs.find((r) => r.isActive && r.showContent);
    return entry?.tab ?? null;
  }, [renderedTabs]);

  usePageAutoRefresh({
    pageConfig:
      (activeTabForAutoRefresh?.pageConfig as PageConfigType) ??
      ({
        title: '',
        layout: createDefaultGrid24Layout([]) as unknown as PageConfigType['layout'],
        components: [],
      } as PageConfigType),
    pageId: activeTabForAutoRefresh?.pageId ?? '',
    isActive: Boolean(activeTabForAutoRefresh),
  });

  useEffect(() => {
    if (!isMobileViewport || tabTransitionDirection === 0) {
      return;
    }

    const timer = window.setTimeout(resetMobileTabTransitionDirection, 280);
    return () => window.clearTimeout(timer);
  }, [isMobileViewport, resolvedActiveTabId, tabTransitionDirection]);

  if (!resolvedActiveTabId || tabs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full w-full p-8 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-neutral-900 dark:to-neutral-800">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-6">
              {renderLucideIcon('layout-grid', 'w-8 h-8 text-primary')}
            </div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600 mb-4">
              {t('multi_page_renderer.welcome_title', 'Welcome to Workbench')}
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto leading-relaxed">
              {t('multi_page_renderer.welcome_description', 'Quickly build enterprise applications through drag-and-drop visual interface, supporting rich component library, data binding, custom styles and real-time preview, making it easy to develop professional applications')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm border border-neutral-200 dark:border-neutral-700 hover:shadow-md transition-shadow">
              <div className="p-3 rounded-lg bg-blue-500/10 w-fit mx-auto mb-4">
                {renderLucideIcon('layout-panel-top', 'w-8 h-8 text-blue-500')}
              </div>
              <h3 className="text-lg font-semibold mb-2 text-neutral-900 dark:text-neutral-100">{t('multi_page_renderer.feature_visual_drag', 'Visual Drag & Drop')}</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {t('multi_page_renderer.feature_visual_drag_description', '30+ component types including forms, tables, charts, containers, supporting custom styles and interactions')}
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm border border-neutral-200 dark:border-neutral-700 hover:shadow-md transition-shadow">
              <div className="p-3 rounded-lg bg-purple-500/10 w-fit mx-auto mb-4">
                {renderLucideIcon('database', 'w-8 h-8 text-purple-500')}
              </div>
              <h3 className="text-lg font-semibold mb-2 text-neutral-900 dark:text-neutral-100">{t('multi_page_renderer.feature_data_binding', 'Smart Data Binding')}</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {t('multi_page_renderer.feature_data_binding_description', 'Seamlessly connect enterprise data sources, supporting real-time data display and business logic configuration')}
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm border border-neutral-200 dark:border-neutral-700 hover:shadow-md transition-shadow">
              <div className="p-3 rounded-lg bg-emerald-500/10 w-fit mx-auto mb-4">
                {renderLucideIcon('sparkles', 'w-8 h-8 text-emerald-500')}
              </div>
              <h3 className="text-lg font-semibold mb-2 text-neutral-900 dark:text-neutral-100">{t('multi_page_renderer.feature_component_communication', 'Component Communication')}</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {t('multi_page_renderer.feature_component_communication_description', 'Support parameter passing and event triggering, building complex business processes and user interactions')}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-lg p-8 shadow-sm border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-center gap-2 mb-4">
              {renderLucideIcon('arrow-right', 'w-5 h-5 text-primary')}
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                {t('multi_page_renderer.start_creating_title', 'Start Creating Your First Page')}
              </h3>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              {t('multi_page_renderer.start_creating_description', 'Click the navigation menu to open a page, or create a new page configuration through edit mode')}
            </p>
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                {renderLucideIcon('mouse-pointer-click', 'w-4 h-4 text-primary')}
                <span className="text-sm font-medium text-primary">{t('multi_page_renderer.select_page', 'Select Page')}</span>
              </div>
              <span className="text-neutral-400">{t('multi_page_renderer.or', 'or')}</span>
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                {renderLucideIcon('edit', 'w-4 h-4 text-primary')}
                <span className="text-sm font-medium text-primary">{t('multi_page_renderer.enable_edit_mode', 'Enable Edit Mode')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden relative">
      {renderedTabs.map(({ tab, isActive, hasError: _hasError, isLoading, showError, showContent }) => {
        const inactiveOffsetX =
          tabTransitionDirection === 0 ? 8 : tabTransitionDirection * 24;

        return (
          <div
            key={tab.id}
            className="absolute inset-0 h-full w-full"
            style={{
              opacity: isActive ? 1 : 0,
              zIndex: isActive ? 10 : 0,
              pointerEvents: isActive ? 'auto' : 'none',
              transform: isActive
                ? 'translateX(0)'
                : `translateX(${inactiveOffsetX}px)`,
              transition: isMobileViewport
                ? 'opacity 0.24s ease, transform 0.24s ease'
                : 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out',
              willChange: isActive ? 'opacity, transform' : 'auto',
            }}
            aria-hidden={!isActive}
          >
            {isLoading ? (
              <div className="h-full overflow-hidden p-4">
                <PageLoadingSkeleton preset="dashboard" />
              </div>
            ) : null}

            {showError ? (
              <div className="flex items-center justify-center h-full pt-4">
                <div className="text-center max-w-md mx-auto p-6">
                  {renderLucideIcon('alert-circle', 'w-16 h-16 text-status-error mx-auto mb-4')}
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                    {t('multi_page_renderer.page_load_failed', 'Page Load Failed')}
                  </h3>
                  <p className="text-red-600 dark:text-red-400 mb-4">
                    {typeof tab.errorMessage === 'string' ? tab.errorMessage : t('multi_page_renderer.unknown_error', 'Unknown error')}
                  </p>
                  <button
                    onClick={() => {

                      window.location.reload();
                    }}
                    className="btn btn-primary"
                  >
                    {t('multi_page_renderer.reload', 'Reload')}
                  </button>
                </div>
              </div>
            ) : null}

            {showContent && (
              <TabContent
                tab={tab}
                appConfig={appConfig}
                availableParameters={availableParameters}
                isEmpty={!(tab.pageConfig as PageConfigType)?.components?.length}
                isTabActive={isActive}
                renderPage={renderPage}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
