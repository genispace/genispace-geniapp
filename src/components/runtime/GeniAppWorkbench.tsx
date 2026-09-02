import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Globe2, Moon, PanelsTopLeft, Sun } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppSidebar } from '../../ui/components/features/app/Sidebar';
import { cn } from '../../utils/utils/cn';
import { setTheme } from '../../utils/cookieSettings';
import { GeniAppShellBridge } from '../../shell';
import { MultiPageRenderer, type RenderGeniAppPage } from './MultiPageRenderer';
import { renderLucideIcon } from '../utils/iconUtils';
import {
  filterNavigationItemsForMember,
  getNavigationTargetPageId,
  resolveDefaultWorkbenchLanding,
  serializeWorkbenchUrlSearchParams,
} from '../utils/navigationUtils';
import { resolveMobileBottomNavTabs } from '../mobile/utils/mobileBottomNav';
import { ParameterUtils } from '../utils/parameterUtils';
import { useWorkbenchConfigLocale } from '../contexts/WorkbenchConfigLocaleContext';
import { useViewport } from '../contexts/ViewportContext';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useVisibleWhenContext } from '../hooks/useVisibleWhenContext';
import type { WorkbenchConfig } from '../types/components';
import type { NavigationItem } from '../types';

export interface GeniAppWorkbenchConfig extends WorkbenchConfig {
  name?: string;
  description?: string;
  geniappRuntime?: {
    datasourceIdentifiers?: Record<string, string>;
    datasetIdentifiers?: Record<string, string>;
    agentIdentifiers?: Record<string, string>;
    taskIdentifiers?: Record<string, string>;
    workflowIdentifiers?: Record<string, string>;
    operatorIdentifiers?: Record<string, string>;
    knowledgeBaseIdentifiers?: Record<string, string>;
    skillIdentifiers?: Record<string, string>;
  };
}

export interface GeniAppWorkbenchProps {
  identifier: string;
  config: GeniAppWorkbenchConfig;
  name?: string;
  allowedShellOrigins?: string[];
  headerIcon?: ReactNode;
  showRuntimeControls?: boolean;
  renderPage?: RenderGeniAppPage;
}

function parsePageParams(search: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  new URLSearchParams(search).forEach((value, key) => {
    result[key] = ParameterUtils.inferParameterType(value);
  });
  return result;
}

function pathnamePageId(pathname: string, pages: Record<string, unknown>): string | null {
  const segments = pathname.split('/').filter(Boolean);
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const candidate = decodeURIComponent(segments[index]);
    if (pages[candidate]) return candidate;
  }
  return null;
}

function navigationPath(identifier: string, pageId: string, params: Record<string, unknown> = {}): string {
  const query = serializeWorkbenchUrlSearchParams(params);
  return `/${encodeURIComponent(identifier)}/${encodeURIComponent(pageId)}${query ? `?${query}` : ''}`;
}

function NavigationRows({
  items,
  activePageId,
  collapsed,
  depth = 0,
  onNavigate,
  resolveTitle,
}: {
  items: NavigationItem[];
  activePageId: string;
  collapsed: boolean;
  depth?: number;
  onNavigate: (item: NavigationItem) => void;
  resolveTitle: (value: unknown) => string;
}) {
  return (
    <div className={depth === 0 ? 'space-y-1' : 'mt-1 space-y-1'}>
      {items.map((item) => {
        const targetPageId = getNavigationTargetPageId(item);
        const isNavigable = Boolean(targetPageId && (!item.children?.length || item.linkedPage));
        const active = targetPageId === activePageId;
        const title = resolveTitle(item.title);
        return (
          <div key={item.key}>
            <button
              type="button"
              title={collapsed ? title : undefined}
              disabled={!isNavigable}
              onClick={() => isNavigable && onNavigate(item)}
              className={cn(
                'flex min-h-10 w-full items-center rounded-lg text-sm font-medium transition-colors',
                collapsed ? 'justify-center px-2' : 'gap-3 px-3 text-left',
                active
                  ? 'bg-primary text-primary-foreground'
                  : isNavigable
                    ? 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    : 'cursor-default text-muted-foreground',
              )}
              style={!collapsed && depth > 0 ? { paddingLeft: `${12 + depth * 16}px` } : undefined}
              aria-current={active ? 'page' : undefined}
            >
              <span className="shrink-0">
                {renderLucideIcon(item.icon || (item.children?.length ? 'folder' : 'layout-grid'), 'h-4 w-4')}
              </span>
              {!collapsed && <span className="min-w-0 truncate">{title}</span>}
            </button>
            {!collapsed && item.children?.length ? (
              <NavigationRows
                items={item.children}
                activePageId={activePageId}
                collapsed={false}
                depth={depth + 1}
                onNavigate={onNavigate}
                resolveTitle={resolveTitle}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function RuntimeControls() {
  const { i18n } = useTranslation();
  const isChinese = i18n.language.startsWith('zh');
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );
  const switchLanguage = () => {
    const next = isChinese ? 'en' : 'zh';
    localStorage.setItem('i18nextLng', next);
    void i18n.changeLanguage(next);
  };
  const switchTheme = () => {
    const nextIsDark = !isDark;
    setTheme(nextIsDark ? 'dark' : 'light');
    setIsDark(nextIsDark);
  };

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={switchLanguage}
        className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Globe2 className="h-4 w-4" />
        <span>{isChinese ? 'English' : '中文'}</span>
      </button>
      <button
        type="button"
        onClick={switchTheme}
        className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        <span>{isDark ? (isChinese ? '浅色' : 'Light') : (isChinese ? '深色' : 'Dark')}</span>
      </button>
    </div>
  );
}

function MobileNavigation({
  items,
  activePageId,
  onNavigate,
}: {
  items: NavigationItem[];
  activePageId: string;
  onNavigate: (pageId: string, key: string, params?: Record<string, unknown>) => void;
}) {
  const { language } = useWorkbenchConfigLocale();
  const tabs = useMemo(() => resolveMobileBottomNavTabs(items, null, language), [items, language]);
  if (tabs.length === 0) return null;

  return (
    <nav
      aria-label="Application bottom navigation"
      className="workbench-bottom-tab-nav relative shrink-0 border-t border-neutral-200/80 bg-white pt-2 dark:border-neutral-700/80 dark:bg-neutral-950"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.75rem)' }}
    >
      <div className="flex h-14 items-stretch">
        {tabs.map((tab) => {
          const active = tab.pageId === activePageId;
          return (
            <button
              key={tab.key}
              type="button"
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
              onClick={() => onNavigate(tab.pageId, tab.key, tab.pageParameters)}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 transition-colors duration-200',
                active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-neutral-400',
              )}
            >
              {tab.icon ? renderLucideIcon(tab.icon, 'h-7 w-7 shrink-0') : null}
              <span className="w-full truncate px-0.5 text-center text-[11px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Complete routed shell for a downloaded Workbench GeniApp. */
export function GeniAppWorkbench({
  identifier,
  config,
  name,
  allowedShellOrigins,
  headerIcon,
  showRuntimeControls = true,
  renderPage,
}: GeniAppWorkbenchProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const viewport = useViewport();
  const { currentUser } = useCurrentUser();
  const visibleWhenContext = useVisibleWhenContext(parsePageParams(location.search));
  const { language, localizeAppConfig, resolveBilingualText } = useWorkbenchConfigLocale();
  const pages = config.pages ?? {};
  const localizedAppConfig = localizeAppConfig(
    config.appConfig as unknown as Record<string, unknown>,
  ) as unknown as WorkbenchConfig['appConfig'] & { name?: string };
  const navigationItems = localizedAppConfig?.navigation?.items ?? [];
  const visibleNavigation = useMemo(
    () => filterNavigationItemsForMember(
      navigationItems,
      currentUser?.id,
      viewport.isMobile ? 'mobile' : 'desktop',
      visibleWhenContext,
    ),
    [currentUser?.id, navigationItems, viewport.isMobile, visibleWhenContext],
  );

  const landing = useMemo(
    () => resolveDefaultWorkbenchLanding(localizedAppConfig, pages, currentUser?.id, { visibleWhenContext }),
    [currentUser?.id, localizedAppConfig, pages, visibleWhenContext],
  );
  const activePageId = pathnamePageId(location.pathname, pages)
    ?? landing?.pageId
    ?? Object.keys(pages)[0]
    ?? '';

  const goToPage = useCallback((pageId: string, params: Record<string, unknown> = {}) => {
    if (!pages[pageId]) return;
    navigate(navigationPath(identifier, pageId, params));
  }, [identifier, navigate, pages]);

  const goToItem = useCallback((item: NavigationItem) => {
    const pageId = getNavigationTargetPageId(item);
    if (!pageId) return;
    goToPage(pageId, { ...(item.pageParameters ?? {}), _nav: item.key });
  }, [goToPage]);

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en-US';
  }, [language]);

  useEffect(() => {
    if (pathnamePageId(location.pathname, pages) || !activePageId) return;
    navigate(navigationPath(identifier, activePageId, landing ? parsePageParams(landing.queryString) : {}), { replace: true });
  }, [activePageId, identifier, landing, location.pathname, navigate, pages]);

  useEffect(() => {
    const openPage = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail ?? {};
      const pageId = typeof detail.pageId === 'string' ? detail.pageId : '';
      const params = detail.urlParams && typeof detail.urlParams === 'object'
        ? detail.urlParams as Record<string, unknown>
        : {};
      goToPage(pageId, params);
    };
    window.addEventListener('workbench-open-tab', openPage);
    return () => window.removeEventListener('workbench-open-tab', openPage);
  }, [goToPage]);

  const pageConfig = pages[activePageId];
  const tab = pageConfig ? [{
    id: `${activePageId}:${location.search}`,
    pageId: activePageId,
    title: pageConfig.title,
    isActive: true,
    pageConfig,
    isLoading: false,
    urlParams: parsePageParams(location.search),
  }] : [];
  const appName = localizedAppConfig?.name || name || config.name || localizedAppConfig?.appId || identifier;
  const content = (
    <div className="h-dvh min-h-0 w-full overflow-hidden bg-neutral-50 dark:bg-neutral-950">
      <MultiPageRenderer
        tabs={tab}
        activeTabId={tab[0]?.id ?? null}
        appConfig={localizedAppConfig}
        renderPage={renderPage}
      />
    </div>
  );

  return (
    <>
      <GeniAppShellBridge identifier={identifier} allowedShellOrigins={allowedShellOrigins} />
      {viewport.isMobile ? (
        <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-950">
          <div className="min-h-0 flex-1">{content}</div>
          <MobileNavigation
            items={visibleNavigation}
            activePageId={activePageId}
            onNavigate={(pageId, key, params) => goToPage(pageId, { ...(params ?? {}), _nav: key })}
          />
        </div>
      ) : (
        <AppSidebar
          collapsible
          storageKey={`${identifier}:sidebar-collapsed`}
          navAriaLabel="Application navigation"
          sidebarHeader={(collapsed) => (
            <div className={cn('flex min-w-0 items-center', collapsed ? 'justify-center' : 'gap-3')}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-primary-foreground">
                {headerIcon ?? (localizedAppConfig?.logo
                  ? <img src={localizedAppConfig.logo} alt="" className="h-full w-full object-cover" />
                  : <PanelsTopLeft className="h-5 w-5" />)}
              </span>
              {!collapsed && <span className="truncate text-sm font-semibold text-foreground">{appName}</span>}
            </div>
          )}
          sidebarNav={(collapsed) => (
            <NavigationRows
              items={visibleNavigation}
              activePageId={activePageId}
              collapsed={collapsed}
              onNavigate={goToItem}
              resolveTitle={resolveBilingualText}
            />
          )}
          sidebarFooter={showRuntimeControls ? (collapsed) => collapsed ? null : <RuntimeControls /> : undefined}
        >
          {content}
        </AppSidebar>
      )}
    </>
  );
}
