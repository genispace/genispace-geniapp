import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Globe2, Moon, RefreshCw, Sun, PanelsTopLeft } from 'lucide-react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppSidebar } from '../../ui/components/features/app/Sidebar';
import { cn } from '../../utils/utils/cn';
import { setTheme } from '../../utils/cookieSettings';
import { GeniAppShellBridge, hasShellInitApplied } from '../../shell';
import { GENISPACE_SHELL_INIT_APPLIED_EVENT } from '../../hooks';
import Loading from './Loading';
import { MultiPageRenderer, type RenderGeniAppPage } from './MultiPageRenderer';
import { renderLucideIcon } from '../utils/iconUtils';
import {
  filterNavigationItemsForMember,
  getNavigationTargetPageId,
  resolveDefaultWorkbenchLanding,
  serializeWorkbenchUrlSearchParams,
} from '../utils/navigationUtils';
import {
  registerWorkbenchContentPathSegment,
  unregisterWorkbenchContentPathSegment,
} from '../utils/workbenchPathUtils';
import { resolveMobileBottomNavTabs } from '../mobile/utils/mobileBottomNav';
import {
  resolveMobileToolbarNavItems,
  type MobileToolbarNavItem,
} from '../mobile/utils/mobileToolbarNav';
import { MobileFloatingBackButton } from '../mobile/components/MobileFloatingBackButton';
import { useMobileNavigationCanGoBack } from '../mobile/hooks/useMobileNavigationCanGoBack';
import {
  goBackMobileNavigation,
  mobileNavigateFromBottomTab,
  mobilePushNavigate,
  pushMobileNavigationEntry,
  resetMobileNavigationStack,
} from '../mobile/utils/mobileNavigationStore';
import { ParameterUtils } from '../utils/parameterUtils';
import { useWorkbenchConfigLocale } from '../contexts/WorkbenchConfigLocaleContext';
import { useViewport } from '../contexts/ViewportContext';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useVisibleWhenContext } from '../hooks/useVisibleWhenContext';
import { useResolvedApplicationId, useWorkbenchAppAccess } from '../hooks/useWorkbenchAppAccess';
import apiClient from '../lib/api/apiClient';
import { ReleaseNotesDialog, type LocalizedReleaseNotes } from '../release/ReleaseNotesDialog';
import type { WorkbenchConfig } from '../types/components';
import type { NavigationItem } from '../types';

export interface GeniAppWorkbenchConfig extends WorkbenchConfig {
  name?: string;
  description?: string;
  /**
   * Workbench-level datasource version pins (`{ [datasourceId]: version }`).
   * Accepted here so export hosts can hand the snapshot's pins straight to
   * GeniAppComponentProvider (standalone mount does this automatically).
   */
  datasourceVersions?: Record<string, number>;
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
  // Role/member context for navigation-level visibleWhen gates (same sourcing as the
  // Workbench BottomTabNavigation); without it role-gated tabs fail-closed away.
  const { currentUser } = useCurrentUser();
  const visibleWhenContext = useVisibleWhenContext(undefined);
  const tabs = useMemo(
    () => resolveMobileBottomNavTabs(items, currentUser?.id ?? null, language, visibleWhenContext),
    [items, currentUser?.id, language, visibleWhenContext],
  );
  if (tabs.length === 0) return null;

  return (
    <nav
      aria-label="Application bottom navigation"
      className="workbench-bottom-tab-nav relative z-20 shrink-0 border-t border-neutral-200/80 bg-white pt-2 dark:border-neutral-700/80 dark:bg-neutral-950"
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

function MobileToolbar({
  items,
  activePageId,
  showRuntimeControls,
  onNavigate,
}: {
  items: MobileToolbarNavItem[];
  activePageId: string;
  showRuntimeControls: boolean;
  onNavigate: (item: MobileToolbarNavItem) => void;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );
  const isChinese = i18n.language.startsWith('zh');
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

  const actionClass =
    'flex items-center gap-1 rounded-lg px-2 py-1.5 text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800';

  return (
    <div className="shrink-0 border-b border-neutral-200/80 bg-white dark:border-neutral-700/80 dark:bg-neutral-950">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-center py-0.5 text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-200"
        aria-label={t('mobile.more_actions', 'More')}
        aria-expanded={open}
      >
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="flex flex-wrap items-center justify-center gap-1 px-2 pb-1.5">
          {showRuntimeControls && (
            <>
              <button type="button" onClick={() => window.location.reload()} className={actionClass} aria-label={t('common:icons.refresh_cw', 'Refresh')}>
                <RefreshCw className="h-4 w-4" />
                <span className="text-xs font-medium">{t('common:icons.refresh_cw', 'Refresh')}</span>
              </button>
              <button type="button" onClick={switchLanguage} className={actionClass} aria-label={t('header.change_lang', 'Change Language')}>
                <Globe2 className="h-4 w-4" />
                <span className="text-xs font-medium">{isChinese ? 'EN' : 'ZH'}</span>
              </button>
              <button type="button" onClick={switchTheme} className={actionClass} aria-label={t('header.toggle_theme', 'Toggle theme')}>
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span className="text-xs font-medium">{isDark ? t('common:header.light_short', 'Light') : t('common:header.dark_short', 'Dark')}</span>
              </button>
            </>
          )}
          {items.map((item) => {
            const active = item.pageId === activePageId;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onNavigate(item);
                }}
                className={cn(actionClass, active && 'text-indigo-600 dark:text-indigo-400')}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
              >
                {item.icon ? renderLucideIcon(item.icon, 'h-4 w-4') : null}
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface LatestPublishedNote {
  applicationId: string;
  version: string;
  releaseNotes?: LocalizedReleaseNotes | string | string[] | null;
  publishedAt: string;
}

/**
 * "New version published" prompt for exported GeniApps. Unlike the Workbench-shell
 * useReleaseNotesPrompt (user-settings dismissal map), the read marker here lives
 * server-side per application member: the latest-published-note GET returns null once
 * the receipt PUT has acknowledged the version. One check per resolved application per
 * mount; non-members (403) and fetch failures stay silent.
 */
function GeniAppReleaseNotesPrompt() {
  const applicationId = useResolvedApplicationId();
  const { language } = useWorkbenchConfigLocale();
  const [note, setNote] = useState<LatestPublishedNote | null>(null);
  const checkedAppRef = useRef<string | null>(null);

  useEffect(() => {
    if (!applicationId || checkedAppRef.current === applicationId) return;
    checkedAppRef.current = applicationId;
    let alive = true;
    void apiClient
      .get<LatestPublishedNote | null>(`/applications/${applicationId}/releases/latest-published-note`)
      .then((res) => {
        if (!alive) return;
        const data = res?.data;
        if (data && data.version) setNote(data);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [applicationId]);

  const acknowledge = useCallback(() => {
    const current = note;
    setNote(null);
    if (current && applicationId) {
      void apiClient
        .put(`/applications/${applicationId}/releases/${encodeURIComponent(current.version)}/receipt`)
        .catch(() => undefined);
    }
  }, [note, applicationId]);

  if (!note) return null;
  const isZh = language === 'zh';
  return (
    <ReleaseNotesDialog
      open
      version={note.version}
      notes={note.releaseNotes}
      locale={language}
      title={isZh ? '应用已更新' : 'Application updated'}
      acknowledgeLabel={isZh ? '知道了' : 'Got it'}
      onAcknowledge={acknowledge}
    />
  );
}

function navigationHasVisibleWhenGate(items: NavigationItem[]): boolean {
  return items.some(
    (item) => Boolean(item.visibleWhen) || (item.children ? navigationHasVisibleWhenGate(item.children) : false),
  );
}

function GeniAppWorkbenchShell({
  identifier,
  config,
  name,
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
  const locationRef = useRef(location);
  locationRef.current = location;
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
  // Role-gated navigation makes the landing depend on app roles that resolve
  // asynchronously (my-installations → /me/access). Redirecting before they arrive
  // lands role users on the wrong page; apps with no visibleWhen gate redirect
  // immediately so their landing shows no extra wait.
  const { loading: appAccessLoading } = useWorkbenchAppAccess();
  const landingNeedsAppRoles = useMemo(() => navigationHasVisibleWhenGate(navigationItems), [navigationItems]);
  const landingContextReady = !landingNeedsAppRoles || !appAccessLoading;
  const activePageId = pathnamePageId(location.pathname, pages)
    ?? landing?.pageId
    ?? Object.keys(pages)[0]
    ?? '';
  const canGoBackMobileNav = useMobileNavigationCanGoBack();
  const isNavigationRootPage = visibleNavigation.some(
    (item) => getNavigationTargetPageId(item) === activePageId,
  );
  // Drill-down/detail pages (not reachable from the bottom nav) hide the bottom navigation
  // once a back target exists: bottom-tab taps reset the nav stack (2026-07-15 "bottom tab =
  // exit" semantics), so a stray tap on a detail page would wipe the very stack the floating
  // back button needs. Root pages always keep it; stack-less deep links keep it too — with no
  // back target it is the only way out. The top toolbar stays rendered on every page: it is a
  // collapsed strip (no stray-tap surface), and its nav entries go through the same
  // stack-clearing bottom-tab path, so jumping away from it is a deliberate, approved exit.
  const showMobileBottomNav = isNavigationRootPage || !canGoBackMobileNav;
  const sidebarStorageKey = `${identifier}:sidebar-collapsed`;
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(sidebarStorageKey);
      return saved !== null ? (JSON.parse(saved) as boolean) : false;
    } catch {
      return false;
    }
  });

  const goToPage = useCallback((pageId: string, params: Record<string, unknown> = {}, options?: { pushMobileEntry?: boolean }) => {
    if (!pages[pageId]) return;
    const target = navigationPath(identifier, pageId, params);
    // Drill-down style jumps (workbench-open-tab) record the page being left on the
    // shared mobile nav stack so the floating back button can return to it; the
    // helper no-ops off the mobile viewport. Bottom-tab jumps reset the stack instead.
    if (options?.pushMobileEntry) {
      mobilePushNavigate(navigate, locationRef.current, target);
    } else {
      navigate(target);
    }
  }, [identifier, navigate, pages]);

  const goToItem = useCallback((item: NavigationItem) => {
    const pageId = getNavigationTargetPageId(item);
    if (!pageId) return;
    goToPage(pageId, { ...(item.pageParameters ?? {}), _nav: item.key });
  }, [goToPage]);

  // Mobile back stack (mirrors the Workbench TabManager wiring the standalone shell
  // replaces): component-internal tab switches pushed by renderers, in-page back
  // requests, and a fresh stack per application.
  useEffect(() => {
    resetMobileNavigationStack();
  }, [identifier]);

  // Exported apps route under `/{identifier}/...` — whitelist that first segment so the
  // shared workbench-path gate (mobile back-stack push gating, content-path checks)
  // accepts it. The Workbench never registers a segment and keeps UUID/demo-only gating.
  useEffect(() => {
    registerWorkbenchContentPathSegment(identifier);
    return () => unregisterWorkbenchContentPathSegment(identifier);
  }, [identifier]);

  useEffect(() => {
    const handleComponentTabPush = (event: Event) => {
      const detail = (event as CustomEvent<{
        pageId?: string;
        componentId?: string;
        state?: { primaryKey: string; subTabKey?: string };
      }>).detail ?? {};
      if (!detail.pageId || !detail.componentId || !detail.state) return;
      pushMobileNavigationEntry({
        kind: 'component-tab',
        pageId: detail.pageId,
        componentId: detail.componentId,
        state: detail.state,
      });
    };
    // Pass the page currently on screen so goBack can discard stale component-tab entries
    // left behind by other pages instead of letting them swallow the back action.
    const handleNavBack = () => goBackMobileNavigation(
      navigate,
      pathnamePageId(locationRef.current.pathname, pages) ?? undefined,
    );
    window.addEventListener('workbench-component-tab-push', handleComponentTabPush);
    window.addEventListener('workbench-nav-back', handleNavBack);
    return () => {
      window.removeEventListener('workbench-component-tab-push', handleComponentTabPush);
      window.removeEventListener('workbench-nav-back', handleNavBack);
    };
  }, [navigate, pages]);

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en-US';
  }, [language]);

  useEffect(() => {
    if (!landingContextReady) return;
    if (pathnamePageId(location.pathname, pages) || !activePageId) return;
    navigate(navigationPath(identifier, activePageId, landing ? parsePageParams(landing.queryString) : {}), { replace: true });
  }, [landingContextReady, activePageId, identifier, landing, location.pathname, navigate, pages]);

  useEffect(() => {
    const openPage = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail ?? {};
      const pageId = typeof detail.pageId === 'string' ? detail.pageId : '';
      const params = detail.urlParams && typeof detail.urlParams === 'object'
        ? detail.urlParams as Record<string, unknown>
        : {};
      goToPage(pageId, params, { pushMobileEntry: true });
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

  // Config-driven mobile toolbar entries (navigation items flagged mobileToolbar:true),
  // same source and gating as the Workbench mobile layout.
  const mobileToolbarItems = useMemo(
    () => resolveMobileToolbarNavItems(navigationItems, currentUser?.id, language, visibleWhenContext),
    [navigationItems, currentUser?.id, language, visibleWhenContext],
  );
  const floatingBackEnabled = Boolean(
    (localizedAppConfig as { floatingBackButton?: boolean } | undefined)?.floatingBackButton,
  );

  const content = (
    <div
      className={cn(
        'min-h-0 w-full overflow-hidden bg-neutral-50 dark:bg-neutral-950',
        // Mobile sits in the flex-1 slot between toolbar and bottom nav — a dvh
        // height would overflow that slot by the chrome height and cover the
        // bottom nav. Desktop keeps the full-viewport height inside AppSidebar.
        viewport.isMobile ? 'h-full' : 'h-dvh',
      )}
    >
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
      <GeniAppReleaseNotesPrompt />
      {viewport.isMobile ? (
        <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-950">
          {(showRuntimeControls || mobileToolbarItems.length > 0) && (
            <MobileToolbar
              items={mobileToolbarItems}
              activePageId={activePageId}
              showRuntimeControls={showRuntimeControls}
              onNavigate={(item) => mobileNavigateFromBottomTab(
                navigate,
                navigationPath(identifier, item.pageId, { ...(item.pageParameters ?? {}), _nav: item.key }),
              )}
            />
          )}
          <div className="min-h-0 flex-1">{content}</div>
          <MobileFloatingBackButton
            enabled={floatingBackEnabled}
            workbenchId={identifier}
            currentPageId={activePageId}
          />
          {showMobileBottomNav && (
            <MobileNavigation
              items={visibleNavigation}
              activePageId={activePageId}
              onNavigate={(pageId, key, params) => mobileNavigateFromBottomTab(
                navigate,
                navigationPath(identifier, pageId, { ...(params ?? {}), _nav: key }),
              )}
            />
          )}
        </div>
      ) : (
        <>
          <AppSidebar
            collapsible
            storageKey={sidebarStorageKey}
            onCollapsedChange={setSidebarCollapsed}
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
          {/* Desktop floating back pill (parity with the Workbench shell's WorkbenchLayout):
              left edge tracks the sidebar width so the pill sits at the content area's left
              edge; stack entries arrive from drill-down route pushes (viewport gate removed)
              and component-tab pushes. */}
          <MobileFloatingBackButton
            enabled={floatingBackEnabled}
            workbenchId={identifier}
            variant="desktop"
            leftOffset={(sidebarCollapsed ? 80 : 256) - 18}
            currentPageId={activePageId}
          />
        </>
      )}
    </>
  );
}

const SHELL_INIT_GATE_TIMEOUT_MS = 1800;

function isEmbeddedIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin frame access throws — that only happens inside an iframe.
    return true;
  }
}

/**
 * First-paint gate for iframe-embedded GeniApps. The Shell delivers GENISPACE_SHELL_INIT
 * (accessToken, applicationId) asynchronously AFTER the iframe document has booted, so a
 * tree rendered immediately would resolve app roles and fetch datasource options under a
 * stale identity lingering in this origin's localStorage (session-scoped caches like
 * accessCache would then never refetch). Waiting for the init-applied event makes every
 * request start under the correct identity — no cache-invalidation pipeline needed. The
 * timeout covers Shell-less embeds (third-party iframes); plain standalone sessions are
 * not iframes and bypass the gate with zero behavior change.
 */
function useShellInitGate(): boolean {
  const [ready, setReady] = useState(() => !isEmbeddedIframe() || hasShellInitApplied());
  useEffect(() => {
    if (ready) return;
    const onApplied = () => setReady(true);
    window.addEventListener(GENISPACE_SHELL_INIT_APPLIED_EVENT, onApplied);
    const timer = window.setTimeout(onApplied, SHELL_INIT_GATE_TIMEOUT_MS);
    return () => {
      window.removeEventListener(GENISPACE_SHELL_INIT_APPLIED_EVENT, onApplied);
      window.clearTimeout(timer);
    };
  }, [ready]);
  return ready;
}

/**
 * Complete routed shell for a downloaded Workbench GeniApp.
 *
 * The export host mounts this component under a bare Router without declaring
 * routes, so the shell registers the Workbench route shapes itself: mirrored
 * renderers and hooks read `useParams().workbenchId/pageId` (filter input
 * history, rememberSelection namespacing, drill-down paths, app-role
 * resolution) and silently get nothing without a route match. The catch-all
 * keeps non-matching locations (e.g. the initial `/` before the landing
 * redirect) rendering the shell with empty params, exactly as before.
 *
 * The Shell bridge stays mounted while the iframe first-paint gate holds — it is
 * what receives the INIT the gate waits for.
 */
export function GeniAppWorkbench(props: GeniAppWorkbenchProps) {
  const shell = <GeniAppWorkbenchShell {...props} />;
  const gateReady = useShellInitGate();
  return (
    <>
      <GeniAppShellBridge identifier={props.identifier} allowedShellOrigins={props.allowedShellOrigins} />
      {gateReady ? (
        <Routes>
          <Route path="/workbench/:workbenchId/:pageId" element={shell} />
          <Route path="/workbench/:workbenchId" element={shell} />
          <Route path="/:workbenchId/:pageId" element={shell} />
          <Route path="/:workbenchId" element={shell} />
          <Route path="*" element={shell} />
        </Routes>
      ) : (
        <Loading fullScreen />
      )}
    </>
  );
}
