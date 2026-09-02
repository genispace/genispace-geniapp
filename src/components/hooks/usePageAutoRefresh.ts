import { useEffect, useRef, useCallback } from 'react';
import type { PageConfig, Component } from '../types/components';

interface PageAutoRefreshOptions {
  pageConfig: PageConfig;
  pageId: string;
  isActive: boolean;
}

const collectRefreshableComponents = (components: Component[]): string[] => {
  const refreshableIds: string[] = [];

  const traverse = (comps: Component[]) => {
    for (const comp of comps) {

      if (comp.type === 'Container' && comp.children) {
        traverse(comp.children);
        continue;
      }

      if (comp.type === 'Tabs' && comp.props?.items) {
        for (const tab of comp.props.items) {
          if (tab.children) {
            traverse(tab.children);
          }
          // items[].components structure (SW workbench etc.): tab content hangs directly on the components array
          if (tab.components) {
            traverse(tab.components);
          }
        }
        continue;
      }

      if (comp.type === 'Card' && comp.props?.content) {
        traverse([comp.props.content]);
        continue;
      }

      const followRefresh = comp.props?.followPageRefresh === true;
      if (followRefresh) {
        refreshableIds.push(comp.id);
      }
    }
  };

  traverse(components);
  return refreshableIds;
};

export const usePageAutoRefresh = ({
  pageConfig,
  pageId,
  isActive
}: PageAutoRefreshOptions) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const refreshableComponentsRef = useRef<string[]>([]);

  const collectComponents = useCallback(() => {
    if (!pageConfig?.components) {
      return [];
    }
    return collectRefreshableComponents(pageConfig.components);
  }, [pageConfig?.components]);

  const triggerRefresh = useCallback(() => {
    const timestamp = Date.now();
    const refreshableComponents = refreshableComponentsRef.current;

    if (typeof window !== 'undefined') {
      const refreshEvent = new CustomEvent('page-auto-refresh-trigger', {
        detail: {
          timestamp,
          pageId,
          componentIds: refreshableComponents, 
          source: 'page-auto-refresh' 
        }
      });
      window.dispatchEvent(refreshEvent);
    }
  }, [pageId]);

  useEffect(() => {

    const autoRefresh = pageConfig?.autoRefresh;
    if (!isActive || !autoRefresh?.enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const refreshableComponents = collectComponents();
    refreshableComponentsRef.current = refreshableComponents;

    if (refreshableComponents.length === 0) {
      return;
    }

    const interval = autoRefresh.interval * 1000; 
    intervalRef.current = setInterval(() => {
      triggerRefresh();
    }, interval);

    triggerRefresh();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [pageConfig?.autoRefresh?.enabled, pageConfig?.autoRefresh?.interval, isActive, collectComponents, triggerRefresh]);

  useEffect(() => {
    if (intervalRef.current && pageConfig?.autoRefresh?.enabled) {
      const refreshableComponents = collectComponents();
      refreshableComponentsRef.current = refreshableComponents;
    }
  }, [pageConfig?.components, pageConfig?.autoRefresh?.enabled, collectComponents]);
};

export default usePageAutoRefresh;
