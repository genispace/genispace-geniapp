import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { fetchPageConfig } from '@/app/services/workbenchApi';
import { useToast } from '@genispace/shared-ui';
import { ParameterRecord } from '../types/parameters';
import { isCommunicationOnlyParameter } from '../config/componentTriggers';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
  buildWorkbenchBasePath,
  buildWorkbenchPagePath,
  isWorkbenchContentPath,
} from '@/utils/workbenchPathUtils';
import {
  pushMobileNavigationEntry,
  resetMobileNavigationStack,
  shouldPushMobileNavigation,
} from '@/mobile/utils/mobileNavigationStore';
import { useWorkbenchConfigLocale } from '@/contexts/WorkbenchConfigLocaleContext';

function isCanceledLike(error: unknown): boolean {
  if (axios.isCancel(error)) return true;
  const e = error as { code?: string; message?: string; name?: string };
  if (e?.code === 'ERR_CANCELED') return true;
  if (typeof e?.message === 'string' && e.message.toLowerCase() === 'canceled') return true;
  if (e?.name === 'CanceledError' || e?.name === 'AbortError') return true;
  return false;
}

export interface TabItem {
  id: string;
  pageId: string;
  title: string;
  icon?: string;
  isActive: boolean;
  pageConfig?: unknown;
  isLoading: boolean;
  hasError?: boolean;
  errorMessage?: string;

  urlParams?: ParameterRecord; 
  fullPath?: string; 
  navigationTitle?: string; 
  pageTitle?: string; 
}

interface TabContextType {
  tabs: TabItem[];
  activeTabId: string | null;
  openTab: (
    pageId: string,
    navigationTitle?: string,
    icon?: string,
    urlParams?: ParameterRecord,
    initialPageConfig?: unknown
  ) => Promise<void>;
  closeTab: (tabId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  closeAllTabs: () => void;
  switchTab: (tabId: string) => void;
  getTabById: (tabId: string) => TabItem | undefined;
  getActiveTab: () => TabItem | undefined;
}

const TabContext = createContext<TabContextType | null>(null);

export const workbenchHideTabBarRef = { current: false };

export const useTabManager = () => {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('useTabManager must be used within TabProvider');
  }
  return context;
};

interface TabProviderProps {
  children: React.ReactNode;
  workbenchId: string;
}

export const TabProvider: React.FC<TabProviderProps> = ({ 
  children, 
  workbenchId,
}) => {
  const { t } = useTranslation('common');

  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { localizePageConfig, language } = useWorkbenchConfigLocale();

  // Draft-aware page source: the in-memory workbench config (outlet context) is
  // the canonical client state — it already contains unsaved draft pages created
  // by the studio/copilot that the server doesn't know yet, and matches whatever
  // view (draft/published/preview) the layout loaded. Server fetch is fallback only.
  const outletContext = useOutletContext<{ currentWorkbench?: { config?: { pages?: Record<string, unknown> } } } | null>();
  const workbenchConfigRef = useRef(outletContext?.currentWorkbench?.config);
  workbenchConfigRef.current = outletContext?.currentWorkbench?.config;

  const tRef = useRef(t);
  tRef.current = t;
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;
  const locationRef = useRef(location);
  locationRef.current = location;

  const processingRef = useRef<Set<string>>(new Set());

  const tabsRef = useRef<TabItem[]>([]);
  tabsRef.current = tabs;

  const updateTabs = useCallback((updater: (tabs: TabItem[]) => TabItem[], newActiveTabId?: string) => {
    setTabs(prevTabs => {
      const newTabs = updater(prevTabs);

      const activeTabs = newTabs.filter(tab => tab.isActive);
      let finalTabs = newTabs;
      let finalActiveTabId: string | null = newActiveTabId ?? null;

      if (activeTabs.length > 1) {
        console.warn('TabManager: Multiple active tabs detected, fixing...');
        const firstActiveIndex = newTabs.findIndex(t => t.isActive);
        finalTabs = newTabs.map((tab, index) => ({
          ...tab,
          isActive: index === firstActiveIndex
        }));
        finalActiveTabId = newTabs[firstActiveIndex]?.id ?? null;
      } else if (activeTabs.length === 1) {
        finalActiveTabId = activeTabs[0].id;
      } else if (activeTabs.length === 0 && newTabs.length > 0) {

        finalTabs = newTabs.map((tab, index) => ({
          ...tab,
          isActive: index === 0
        }));
        finalActiveTabId = newTabs[0]?.id ?? null;
      } else {

        finalActiveTabId = null;
      }

      setActiveTabId(finalActiveTabId);

      return finalTabs;
    });
  }, []);

  const serializeUrlParams = useCallback((params: ParameterRecord): string => {
    return Object.keys(params)
      .filter(key => !isCommunicationOnlyParameter(key))
      .sort()
      .map(key => {
        const value = params[key];

        const encodedKey = encodeURIComponent(key);

        if (typeof value === 'string') {
          return `${encodedKey}=${encodeURIComponent(value)}`;
        } else {
          return `${encodedKey}=${encodeURIComponent(JSON.stringify(value))}`;
        }
      })
      .join('&');
  }, []);

  const buildTabUrlPath = useCallback(
    (pageId: string, urlParams?: ParameterRecord) => {
      const search = urlParams ? serializeUrlParams(urlParams) : '';
      return buildWorkbenchPagePath(
        workbenchId,
        pageId,
        search ? `?${search}` : '',
        locationRef.current.pathname
      );
    },
    [workbenchId, serializeUrlParams]
  );

  const generateParamsHash = useCallback((params: ParameterRecord): string => {
    const paramStr = serializeUrlParams(params);

    let hash = 0;
    for (let i = 0; i < paramStr.length; i++) {
      const char = paramStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; 
    }

    return Math.abs(hash).toString(36);
  }, [serializeUrlParams]);

  const generateTabId = useCallback((pageId: string, urlParams?: ParameterRecord) => {
    if (!urlParams || Object.keys(urlParams).length === 0) {
      return `tab-${pageId}-default`;
    }

    const paramHash = generateParamsHash(urlParams);
    return `tab-${pageId}-${paramHash}`;
  }, [generateParamsHash]);

  const generateFullPath = useCallback((pageId: string, urlParams?: ParameterRecord) => {
    if (!urlParams || Object.keys(urlParams).length === 0) {
      return pageId;
    }
    return `${pageId}?${serializeUrlParams(urlParams)}`;
  }, [serializeUrlParams]);

  const getTabTitle = useCallback((navigationTitle?: string, pageTitle?: string, pageId?: string) => {

    if (navigationTitle && navigationTitle !== pageId) {
      return navigationTitle;
    }

    if (pageTitle) {
      return pageTitle;
    }

    if (pageId && /^page_\d+$/.test(pageId)) {
      return tRef.current('tab_manager.loading', 'Loading...');
    }

    return pageId || tRef.current('tab_manager.unknown', 'Unknown');
  }, []);

  const loadPageConfig = useCallback(async (
    tabId: string,
    pageId: string,
    initialPageConfig?: unknown
  ) => {
    try {
      const localPage = workbenchConfigRef.current?.pages?.[pageId];
      const draftPage = initialPageConfig && typeof initialPageConfig === 'object'
        ? initialPageConfig
        : localPage;
      const pageConfigResponse = draftPage && typeof draftPage === 'object'
        ? { success: true as const, data: draftPage, message: '' }
        : await fetchPageConfig(workbenchId, pageId);

      if (pageConfigResponse.success && pageConfigResponse.data) {
        const configData = pageConfigResponse.data as Record<string, unknown>;
        const localizedConfig = localizePageConfig(pageId, configData) ?? configData;
        const pageTitleRaw =
          localizedConfig.title ?? localizedConfig.name ?? localizedConfig.pageTitle ?? localizedConfig.pageName;
        const pageTitle =
          pageTitleRaw !== undefined && pageTitleRaw !== null && String(pageTitleRaw).trim() !== ''
            ? String(pageTitleRaw)
            : undefined;

        updateTabs((prevTabs) => {
          if (!prevTabs.some((t) => t.id === tabId)) {
            return prevTabs;
          }
          return prevTabs.map((tab) =>
            tab.id === tabId
              ? {
                  ...tab,
                  pageConfig: configData,
                  isLoading: false,
                  hasError: false,
                  errorMessage: undefined,
                  pageTitle: pageTitle,
                  title: getTabTitle(tab.navigationTitle, pageTitle, tab.pageId),
                }
              : tab
          );
        });
      } else {
        throw new Error(
          pageConfigResponse.message ||
            tRef.current('tab_manager.load_page_config_failed', 'Failed to load page configuration')
        );
      }
    } catch (error: unknown) {
      if (isCanceledLike(error)) {
        updateTabs((prevTabs) => {
          if (!prevTabs.some((t) => t.id === tabId)) {
            return prevTabs;
          }
          return prevTabs.map((tab) =>
            tab.id === tabId ? { ...tab, isLoading: false } : tab
          );
        });
        return;
      }

      const errorMessage =
        error instanceof Error ? error.message : tRef.current('tab_manager.load_failed', 'Load failed');
      console.error('TabManager: Failed to load page config for:', tabId, error);
      updateTabs((prevTabs) => {
        if (!prevTabs.some((t) => t.id === tabId)) {
          return prevTabs;
        }
        return prevTabs.map((tab) =>
          tab.id === tabId
            ? {
                ...tab,
                isLoading: false,
                hasError: true,
                errorMessage,
              }
            : tab
        );
      });
      toast({
        title: tRef.current('tab_manager.page_load_failed', 'Page Load Failed'),
        description:
          errorMessage ||
          tRef.current('tab_manager.cannot_load_page_config', 'Unable to load page configuration'),
        variant: "destructive",
      });
    }
  }, [workbenchId, updateTabs, toast, getTabTitle]);

  const openTab = useCallback(async (
    pageId: string,
    navigationTitle?: string,
    icon?: string,
    urlParams?: ParameterRecord,
    initialPageConfig?: unknown
  ) => {
    const fullPath = generateFullPath(pageId, urlParams);
    const newTabId = generateTabId(pageId, urlParams);

    if (processingRef.current.has(newTabId)) {
      return;
    }
    processingRef.current.add(newTabId);

    try {

      const existingTabIndex = tabsRef.current.findIndex((tab) => tab.id === newTabId);
      if (existingTabIndex !== -1) {
        const applyActivate = () =>
          updateTabs(
            (prevTabs) =>
              prevTabs.map((tab, index) => ({
                ...tab,
                isActive: index === existingTabIndex,
                ...(index === existingTabIndex && initialPageConfig !== undefined
                  ? {
                      pageConfig: initialPageConfig,
                      isLoading: false,
                      hasError: false,
                      errorMessage: undefined,
                    }
                  : {}),
              })),
            newTabId
          );
        applyActivate();

        const urlPath = buildTabUrlPath(pageId, urlParams);
        navigate(urlPath, { replace: true });
        return;
      }

      const newTab: TabItem = {
        id: newTabId,
        pageId,
        title: getTabTitle(navigationTitle, undefined, pageId),
        icon,
        isActive: true, 
        isLoading: true,
        urlParams,
        fullPath,
        navigationTitle,
      };

      if (workbenchHideTabBarRef.current) {
        updateTabs(() => [newTab], newTabId);
      } else {
        updateTabs(
          prevTabs => [
            ...prevTabs.map(tab => ({ ...tab, isActive: false })),
            newTab,
          ],
          newTabId
        );
      }

      const urlPath = buildTabUrlPath(pageId, urlParams);
      if (shouldPushMobileNavigation(locationRef.current, urlPath)) {
        pushMobileNavigationEntry(locationRef.current);
      } else if (
        workbenchHideTabBarRef.current &&
        isWorkbenchContentPath(locationRef.current.pathname)
      ) {
        // Desktop with a hidden tab bar navigates stack-style like mobile (the new page
        // replaces the only tab): root/sidebar jumps are marked with `_nav` and reset the
        // stack; drill-downs record the current page so the floating back pill (desktop
        // variant, appConfig.floatingBackButton) can return to it.
        if (urlParams && '_nav' in urlParams) {
          resetMobileNavigationStack();
        } else if (`${locationRef.current.pathname}${locationRef.current.search}` !== urlPath) {
          pushMobileNavigationEntry(locationRef.current);
        }
      }
      navigate(urlPath, { replace: true });

      const tabActivatedEvent = new CustomEvent('workbench-tab-activated', {
        detail: {
          tabId: newTabId,
          pageId: pageId,
          urlParams: urlParams,
          fullPath: fullPath,
          navigationTitle: navigationTitle
        }
      });
      window.dispatchEvent(tabActivatedEvent);

      loadPageConfig(newTabId, pageId, initialPageConfig);
    } finally {

      processingRef.current.delete(newTabId);
    }
  }, [workbenchId, navigate, updateTabs, generateFullPath, generateTabId, getTabTitle, loadPageConfig, serializeUrlParams]);

  const switchTab = useCallback((tabId: string) => {
    const targetTabIndex = tabsRef.current.findIndex((tab) => tab.id === tabId);
    if (targetTabIndex === -1) return;

    const targetTabToActivate = tabsRef.current[targetTabIndex];

    const urlPath = buildTabUrlPath(
      targetTabToActivate.pageId,
      targetTabToActivate.urlParams
    );

    const loc = locationRef.current;
    const currentPath = loc.pathname + loc.search;
    const targetPath = urlPath;

    const needsNavigation = currentPath !== targetPath;

    const isAlreadyActive =
      targetTabToActivate.isActive && activeTabIdRef.current === tabId && !needsNavigation;
    if (isAlreadyActive) {
      return;
    }

    if (needsNavigation) {

      navigate(urlPath, { replace: true, preventScrollReset: true });
    }

    updateTabs(prevTabs => 
      prevTabs.map((tab, index) => ({
        ...tab,
        isActive: index === targetTabIndex
      })), targetTabToActivate.id
    );

    const tabSwitchedEvent = new CustomEvent('workbench-tab-switched', {
      detail: {
        tabId: targetTabToActivate.id,
        pageId: targetTabToActivate.pageId,
        urlParams: targetTabToActivate.urlParams,
        fullPath: targetTabToActivate.fullPath
      }
    });
    window.dispatchEvent(tabSwitchedEvent);
  }, [workbenchId, navigate, updateTabs, serializeUrlParams]);

  const closeTab = useCallback((tabId: string) => {
    const currentTabs = tabs;
    const tabToClose = currentTabs.find(tab => tab.id === tabId);
    const remainingTabs = currentTabs.filter(tab => tab.id !== tabId);

    if (!tabToClose) {
      console.warn('TabManager: Tab not found:', tabId);
      return;
    }

    const tabClosedEvent = new CustomEvent('workbench-tab-closed', {
      detail: { 
        closedTabId: tabToClose.id, 
        pageId: tabToClose.pageId,
        wasActive: tabToClose.isActive,
        remainingTabsCount: remainingTabs.length
      }
    });
    window.dispatchEvent(tabClosedEvent);

    if (remainingTabs.length > 0) {
      const nextActiveTab = (() => {
        if (tabToClose.isActive) {
          const closedTabIndex = currentTabs.findIndex(tab => tab.id === tabId);
          const nextActiveIndex = closedTabIndex > 0 ? closedTabIndex - 1 : 0;
          return remainingTabs[nextActiveIndex];
        } else {
          return remainingTabs.find(tab => tab.isActive);
        }
      })();

      if (nextActiveTab) {

        updateTabs(() => remainingTabs.map(tab => ({
          ...tab,
          isActive: tab.id === nextActiveTab.id
        })), nextActiveTab.id);

        if (tabToClose.isActive) {

          const urlPath = buildTabUrlPath(
            nextActiveTab.pageId,
            nextActiveTab.urlParams
          );

          navigate(urlPath, { replace: true });
        }
      }
    } else {

      updateTabs(() => [], undefined);

      setTimeout(() => {
        navigate(
          buildWorkbenchBasePath(workbenchId, locationRef.current.pathname),
          { replace: true }
        );
      }, 100);
    }
  }, [tabs, workbenchId, navigate, serializeUrlParams, updateTabs]);

  const closeOtherTabs = useCallback((tabId: string) => {
    const tabToKeep = tabs.find(tab => tab.id === tabId);
    if (!tabToKeep) {
      console.warn('TabManager: Tab to keep not found:', tabId);
      return;
    }

    const tabsToClose = tabs.filter(tab => tab.id !== tabId);

    const otherTabsClosedEvent = new CustomEvent('workbench-other-tabs-closed', {
      detail: { 
        keptTabId: tabId,
        closedTabsCount: tabsToClose.length,
        workbenchId: workbenchId
      }
    });
    window.dispatchEvent(otherTabsClosedEvent);

    updateTabs(() => [{ ...tabToKeep, isActive: true }], tabToKeep.id);

    if (!tabToKeep.isActive) {
      const urlPath = buildTabUrlPath(tabToKeep.pageId, tabToKeep.urlParams);

      navigate(urlPath, { replace: true });
    }
  }, [workbenchId, navigate, serializeUrlParams, tabs, updateTabs]);

  const closeAllTabs = useCallback(() => {

    const allTabsClosedEvent = new CustomEvent('workbench-all-tabs-closed', {
      detail: { 
        closedTabsCount: tabs.length,
        workbenchId: workbenchId
      }
    });
    window.dispatchEvent(allTabsClosedEvent);

    updateTabs(() => [], undefined);

    setTimeout(() => {
      navigate(
        buildWorkbenchBasePath(workbenchId, locationRef.current.pathname),
        { replace: true }
      );
    }, 100);
  }, [workbenchId, navigate, updateTabs, tabs.length]);

  const getTabById = useCallback((tabId: string) => {
    return tabs.find(tab => tab.id === tabId);
  }, [tabs]);

  const getActiveTab = useCallback(() => {
    return tabs.find(tab => tab.isActive);
  }, [tabs]);

  useEffect(() => {
    const onPageConfigUpdated = (event: Event) => {
      const e = event as CustomEvent<{ pageId?: string; pageConfig?: unknown }>;
      const pageId = e.detail?.pageId;
      const pageConfig = e.detail?.pageConfig;
      if (!pageId || pageConfig === undefined) return;

      updateTabs(prev =>
        prev.map(tab =>
          tab.pageId === pageId
            ? { ...tab, pageConfig, isLoading: false, hasError: false, errorMessage: undefined }
            : tab
        )
      );
    };

    window.addEventListener('page-config-updated', onPageConfigUpdated);
    return () => window.removeEventListener('page-config-updated', onPageConfigUpdated);
  }, [updateTabs]);

  useEffect(() => {
    updateTabs((prevTabs) =>
      prevTabs.map((tab) => {
        if (!tab.pageConfig || typeof tab.pageConfig !== 'object') {
          return tab;
        }
        const localized = localizePageConfig(tab.pageId, tab.pageConfig as Record<string, unknown>);
        if (!localized) {
          return tab;
        }
        const pageTitleRaw = localized.title;
        const pageTitle =
          pageTitleRaw !== undefined && pageTitleRaw !== null && String(pageTitleRaw).trim() !== ''
            ? String(pageTitleRaw)
            : tab.pageTitle;
        return {
          ...tab,
          pageTitle,
          title: getTabTitle(tab.navigationTitle, pageTitle, tab.pageId),
        };
      })
    );
  }, [language, localizePageConfig, getTabTitle, updateTabs]);

  useEffect(() => {
    const onPageLayoutUpdated = (event: Event) => {
      const e = event as CustomEvent<{ pageId?: string; layoutConfig?: unknown }>;
      const pageId = e.detail?.pageId;
      const layoutConfig = e.detail?.layoutConfig;
      if (!pageId || layoutConfig === undefined) return;

      updateTabs(prev =>
        prev.map(tab =>
          tab.pageId !== pageId || tab.pageConfig === undefined || typeof tab.pageConfig !== 'object'
            ? tab
            : {
                ...tab,
                pageConfig: {
                  ...(tab.pageConfig as Record<string, unknown>),
                  layout: layoutConfig,
                },
              }
        )
      );
    };

    window.addEventListener('page-layout-updated', onPageLayoutUpdated as EventListener);
    return () => window.removeEventListener('page-layout-updated', onPageLayoutUpdated as EventListener);
  }, [updateTabs]);

  const value: TabContextType = {
    tabs,
    activeTabId, 
    openTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    switchTab,
    getTabById,
    getActiveTab,
  };

  return (
    <TabContext.Provider value={value}>
      {children}
    </TabContext.Provider>
  );
};
