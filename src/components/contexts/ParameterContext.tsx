import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { 
  ParameterContextValue, 
  ParameterRecord, 
  TabParameterInfo,
  ParameterParseConfig,
  ParameterValue,
  ParameterChangeEvent,
  ParameterListener,
  ParameterSubscription,
  ParameterReadyCallback
} from '../types/parameters';
import { ParameterUtils } from '@/utils/parameterUtils';
import { getSharedPanelParamValue, hasSharedPanelParamValue } from '@/utils/filterPanelSharedStore';

const ParameterContext = createContext<ParameterContextValue | null>(null);

export { ParameterContext };

interface ParameterProviderProps {
  children: React.ReactNode;
  tabId: string;
  pageId: string;
  initialParams?: ParameterRecord;
  // PageParam names the current page's FilterPanel components emit (derived statically from the
  // page config via collectPageFilterPanelParamNames). Re-init reconciliation keeps these — value
  // AND ready mark — because the remounting panel dedupes its re-emit and would never re-publish
  // them; params no longer owned are stripped and unmarked instead.
  filterPanelParamNames?: string[];
}

const globalTabParametersStore = new Map<string, TabParameterInfo>();

const globalParameterListeners = new Map<string, Map<string, ParameterListener>>();

const parameterChangeQueue = new Map<string, {
  timer: NodeJS.Timeout;
  events: ParameterChangeEvent[];
}>();

const globalParameterReadyStore = new Map<string, Map<string, boolean>>();

interface ParameterReadyListener {
  keys: string[];
  callback: ParameterReadyCallback;
}
const globalParameterReadyListeners = new Map<string, Map<string, ParameterReadyListener>>();

export const parseUrlParameters = (config?: ParameterParseConfig): ParameterRecord => {
  if (typeof window === 'undefined') return config?.defaultValues || {};

  const params = new URLSearchParams(window.location.search);
  const result: ParameterRecord = { ...config?.defaultValues };

  params.forEach((value, key) => {
    let parsedValue: ParameterValue = value;

    if (config?.enableJsonParsing !== false) {
      parsedValue = ParameterUtils.inferParameterType(value);
    }

    if (config?.validationRules?.[key]) {
      if (config.validationRules[key](parsedValue)) {
        result[key] = parsedValue;
      }
    } else {
      result[key] = parsedValue;
    }
  });

  return result;
};

// Multi-select params are real arrays on the bus; identity comparison would treat
// every emit as a change (fresh array reference) and churn broadcasts/refetches.
const isSameParamValue = (a: unknown, b: unknown): boolean => {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return a === b;
};

const isEmptyParamValue = (v: unknown): boolean =>
  v === '' || (Array.isArray(v) && v.length === 0);

type Debounced<T extends (...args: any[]) => void> = T & { cancel: () => void };

function debounce<T extends (...args: any[]) => void>(func: T, wait: number): Debounced<T> {
  let timeout: NodeJS.Timeout | undefined;
  const debounced = ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  }) as Debounced<T>;
  // Pending invocations must be cancellable on unmount — a timer that outlives the component
  // (or the test's jsdom environment) fires against a torn-down window.
  debounced.cancel = () => clearTimeout(timeout);
  return debounced;
}

export const ParameterProvider: React.FC<ParameterProviderProps> = ({
  children,
  tabId,
  pageId,
  initialParams = {},
  filterPanelParamNames
}) => {
  const [globalUrlParams, setGlobalUrlParams] = useState<ParameterRecord>(() => 
    parseUrlParameters({ enableJsonParsing: true, defaultValues: {} })
  );
  const [forceUpdate, setForceUpdate] = useState(0);

  const urlListenerRef = useRef<boolean>(false);

  const getCurrentTabParams = useCallback((): ParameterRecord => {
    const tabInfo = globalTabParametersStore.get(tabId);
    const rawParams = tabInfo?.parameters || initialParams;
    return ParameterUtils.parseParameters(rawParams);
  }, [tabId, initialParams]);

  const broadcastParameterChangeInternal = useCallback((
    key: string, 
    value: ParameterValue, 
    oldValue: ParameterValue,
    source: 'user' | 'component' | 'system' = 'user',
    componentId?: string
  ) => {
    const event: ParameterChangeEvent = {
      key,
      value,
      oldValue,
      source,
      timestamp: Date.now(),
      componentId
    };

    setTimeout(() => {
      const tabListeners = globalParameterListeners.get(tabId);
      if (tabListeners) {
        tabListeners.forEach((listener, listenerId) => {
          try {
            listener(event);
          } catch (error) {
            console.error(`Error in parameter listener ${listenerId}:`, error);
          }
        });
      }
    }, 0);
  }, [tabId]);

  const updateTabParams = useCallback((
    params: Partial<ParameterRecord>, 
    source: 'user' | 'component' | 'system' = 'user',
    componentId?: string
  ) => {
    const currentInfo = globalTabParametersStore.get(tabId);
    const oldParams = currentInfo?.parameters || initialParams;

    const hasChanges = Object.entries(params).some(([key, value]) => {
      const oldVal = oldParams[key];
      if (!isSameParamValue(oldVal, value)) return true;
      return isEmptyParamValue(value) && isEmptyParamValue(oldVal);
    });
    if (!hasChanges) {
      return; 
    }

    const newParams = {
      ...oldParams,
      ...params
    };

    globalTabParametersStore.set(tabId, {
      tabId,
      pageId,
      parameters: newParams,
      timestamp: Date.now()
    });

    const parsedOldParams = ParameterUtils.parseParameters(oldParams);
    const parsedNewParams = ParameterUtils.parseParameters(newParams);

    Object.entries(params).forEach(([key, value]) => {
      const oldValue = parsedOldParams[key];
      const newValue = parsedNewParams[key];
      const isDuplicateEmptyResend = isEmptyParamValue(value) && isEmptyParamValue(oldParams[key]);
      if (!isSameParamValue(oldValue, newValue) || isDuplicateEmptyResend) {
        broadcastParameterChangeInternal(key, newValue, oldValue, source, componentId);
      }
    });

    setTimeout(() => {
      setForceUpdate(prev => prev + 1);
    }, 0);
  }, [tabId, pageId, initialParams, broadcastParameterChangeInternal]);

  const getTabParams = useCallback((targetTabId: string): ParameterRecord => {
    const tabInfo = globalTabParametersStore.get(targetTabId);
    const rawParams = tabInfo?.parameters || {};

    return ParameterUtils.parseParameters(rawParams);
  }, []);

  const cleanupTabParams = useCallback((activeTabIds: string[]) => {
    const activeTabSet = new Set(activeTabIds);
    const keysToDelete: string[] = [];

    globalTabParametersStore.forEach((_, tabId) => {
      if (!activeTabSet.has(tabId)) {
        keysToDelete.push(tabId);
      }
    });

    keysToDelete.forEach(key => {
      globalTabParametersStore.delete(key);
    });
  }, []);

  const lastUrlRef = useRef(window.location.search);

  const debouncedUrlParamsUpdate = useCallback(
    debounce(() => {
      const currentUrl = window.location.search;

      if (lastUrlRef.current === currentUrl) {
        return;
      }
      lastUrlRef.current = currentUrl;

      const newParams = parseUrlParameters({ enableJsonParsing: true, defaultValues: {} });
      setGlobalUrlParams(prev => {

        const isDifferent = JSON.stringify(prev) !== JSON.stringify(newParams);
        return isDifferent ? newParams : prev;
      });
    }, 100),
    []
  );

  useEffect(() => {
    if (urlListenerRef.current) return;

    urlListenerRef.current = true;

    const handleUrlChange = () => {
      debouncedUrlParamsUpdate();
    };

    window.addEventListener('popstate', handleUrlChange);

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      handleUrlChange();
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      handleUrlChange();
    };

    return () => {
      debouncedUrlParamsUpdate.cancel();
      window.removeEventListener('popstate', handleUrlChange);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      urlListenerRef.current = false;
    };
  }, [debouncedUrlParamsUpdate]);

  const subscribeToParameter = useCallback((subscription: ParameterSubscription) => {
    const { parameterKeys, callback, componentId, immediate = false } = subscription;
    const listenerId = componentId || `listener-${Date.now()}-${Math.random()}`;

    if (!globalParameterListeners.has(tabId)) {
      globalParameterListeners.set(tabId, new Map());
    }

    const tabListeners = globalParameterListeners.get(tabId)!;

    const filteredListener: ParameterListener = (event) => {
      if (parameterKeys.includes(event.key)) {
        callback(event);
      }
    };

    tabListeners.set(listenerId, filteredListener);

    if (immediate) {
      const currentParams = getCurrentTabParams(); 
      parameterKeys.forEach(key => {
        if (currentParams[key] !== undefined) {
          const event: ParameterChangeEvent = {
            key,
            value: currentParams[key], 
            oldValue: undefined,
            source: 'system',
            timestamp: Date.now(),
            componentId: 'initial'
          };
          try {
            callback(event);
          } catch (error) {
            console.error(`Error in immediate parameter callback for ${key}:`, error);
          }
        }
      });
    }

    return () => {
      const tabListeners = globalParameterListeners.get(tabId);
      if (tabListeners) {
        tabListeners.delete(listenerId);
        if (tabListeners.size === 0) {
          globalParameterListeners.delete(tabId);
        }
      }
    };
  }, [tabId, getCurrentTabParams]);

  const unsubscribeFromParameter = useCallback((parameterKeys: string[], componentId?: string) => {
    const tabListeners = globalParameterListeners.get(tabId);
    if (tabListeners && componentId) {
      tabListeners.delete(componentId);
      if (tabListeners.size === 0) {
        globalParameterListeners.delete(tabId);
      }
    }
  }, [tabId]);

  const broadcastParameterChange = useCallback((
    key: string, 
    value: ParameterValue, 
    source: 'user' | 'component' | 'system' = 'component',
    componentId?: string
  ) => {

    const currentParams = getCurrentTabParams();
    const oldValue = currentParams[key];

    updateTabParams({ [key]: value }, source, componentId);

  }, [getCurrentTabParams, updateTabParams, tabId]);

  const isFilterPanelParameter = useCallback((paramName: string): boolean => {

    const dateRangePattern = /^[^_]+_[^_]+\.(startTime|endTime)$/;
    const normalPattern = /^[^_]+_[^_]+$/;

    if (dateRangePattern.test(paramName)) {
      return true;
    }

    if (normalPattern.test(paramName)) {
      const [componentId] = paramName.split('_');
      const lowerComponentId = componentId.toLowerCase();

      return lowerComponentId.includes('filter') || lowerComponentId === 'filterpanel';
    }

    return false;
  }, []);

  const markParametersReady = useCallback((parameterKeys: string[]) => {
    if (!parameterKeys || parameterKeys.length === 0) {
      return;
    }

    let tabReadyMap = globalParameterReadyStore.get(tabId);
    if (!tabReadyMap) {
      tabReadyMap = new Map();
      globalParameterReadyStore.set(tabId, tabReadyMap);
    }

    let hasNewReady = false;
    parameterKeys.forEach(key => {
      if (!tabReadyMap!.get(key)) {
        tabReadyMap!.set(key, true);
        hasNewReady = true;
      }
    });

    if (hasNewReady) {

      const tabListeners = globalParameterReadyListeners.get(tabId);
      if (tabListeners) {

        setTimeout(() => {
          tabListeners.forEach((listener, listenerId) => {
            try {

              const allReady = listener.keys.every(key => tabReadyMap!.get(key) === true);
              if (allReady) {
                listener.callback();
              }
            } catch (error) {
              console.error(`[ParameterContext] 参数就绪回调执行错误 (${listenerId}):`, error);
            }
          });
        }, 0);
      }

      setTimeout(() => {
        setForceUpdate(prev => prev + 1);
      }, 0);
    }
  }, [tabId]);

  // Initialize/reconcile this tab's store entry DURING RENDER (guarded, once per tab+page),
  // NOT in a useEffect. Child effects run before a parent's effect, so an effect-timed init
  // here runs AFTER children already emitted their mount defaults (e.g. FilterPanel resolving
  // presetDateRange start/end from a warm option cache). The old effect then saw the entry
  // those emits had just created, took the "stale entry" branch, and the filter-param strip
  // wiped the fresh values — and since the emitters dedupe (emittedRef / initialParamsSent),
  // nothing re-emitted: every consumer bound to periodStart/periodEnd waited forever.
  // Rendering parent-before-children guarantees this init happens before any child can emit.
  const initKeyRef = useRef<string | null>(null);
  const initKey = `${tabId}|${pageId}`;
  if (initKeyRef.current !== initKey) {
    initKeyRef.current = initKey;
    const existingInfo = globalTabParametersStore.get(tabId);
    if (!existingInfo) {
      globalTabParametersStore.set(tabId, {
        tabId,
        pageId,
        parameters: initialParams,
        timestamp: Date.now()
      });
    } else {
      // Entry left over from a previous incarnation of this tab (revisit / page switch):
      // reconcile against the NEW page's FilterPanel ownership instead of blanket-stripping.
      // The remounting panel dedupes its re-emit (emittedRef / initialParamsSent), so a param it
      // still owns would never be re-published — stripping it (or dropping its ready mark) wedges
      // every consumer waiting on it. Params no longer owned by the new page's panels are stale:
      // strip their values AND unmark readiness so gates wait for the new owner's first emit.
      const ownedParams = new Set(filterPanelParamNames ?? []);
      const keptParams: ParameterRecord = {};
      const strippedKeys: string[] = [];
      Object.entries(existingInfo.parameters).forEach(([key, value]) => {
        if (isFilterPanelParameter(key) && !ownedParams.has(key)) {
          strippedKeys.push(key);
        } else {
          keptParams[key] = value;
        }
      });
      // Kept owned values are only safe against the panel-dedupe wedge; they are NOT freshness
      // guaranteed. While this tab was unmounted, a sibling page's panel may have committed a
      // newer value for the same logical filter (every commit is mirrored into the shared panel
      // store by bus param name). An unmounted page's panel cannot re-emit, and mount hydration
      // prefers the bus over the shared store — so without this refresh the stale kept value
      // wins, the panel re-publishes it, and the page is stuck on yesterday's selection (seen
      // as: drill right after changing stores shows the previous/empty store set). Refresh kept
      // owned values from the latest cross-page commit; params the shared store has never seen
      // keep their lingering value (the wedge-safe status quo).
      ownedParams.forEach((paramName) => {
        if (paramName in keptParams && hasSharedPanelParamValue(paramName)) {
          keptParams[paramName] = getSharedPanelParamValue(paramName);
        }
      });
      if (strippedKeys.length > 0) {
        const tabReadyMap = globalParameterReadyStore.get(tabId);
        if (tabReadyMap) {
          strippedKeys.forEach((key) => tabReadyMap.delete(key));
        }
      }
      globalTabParametersStore.set(tabId, {
        ...existingInfo,
        tabId,
        pageId,
        parameters: {
          ...keptParams,
          ...initialParams
        },
        timestamp: Date.now()
      });
    }
  }

  useEffect(() => {
    if (initialParams && Object.keys(initialParams).length > 0) {

      setTimeout(() => {
        markParametersReady(Object.keys(initialParams));
      }, 0);
    }
  }, [tabId, pageId, initialParams]);

  const isParametersReady = useCallback((parameterKeys: string[]): boolean => {
    if (!parameterKeys || parameterKeys.length === 0) {
      return true; 
    }
    const tabReadyMap = globalParameterReadyStore.get(tabId);
    if (!tabReadyMap) {
      return false;
    }
    return parameterKeys.every(key => tabReadyMap.get(key) === true);
  }, [tabId]);

  const subscribeToParametersReady = useCallback((
    parameterKeys: string[],
    callback: ParameterReadyCallback
  ): (() => void) => {
    if (!parameterKeys || parameterKeys.length === 0) {

      setTimeout(callback, 0);
      return () => {};
    }

    const listenerId = `ready-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let tabListeners = globalParameterReadyListeners.get(tabId);
    if (!tabListeners) {
      tabListeners = new Map();
      globalParameterReadyListeners.set(tabId, tabListeners);
    }

    tabListeners.set(listenerId, {
      keys: parameterKeys,
      callback
    });

    if (isParametersReady(parameterKeys)) {
      setTimeout(callback, 0);
    }

    return () => {
      const listeners = globalParameterReadyListeners.get(tabId);
      if (listeners) {
        listeners.delete(listenerId);
        if (listeners.size === 0) {
          globalParameterReadyListeners.delete(tabId);
        }
      }
    };
  }, [tabId, isParametersReady]);

  useEffect(() => {
    return () => {

      globalParameterListeners.delete(tabId);

      globalParameterReadyStore.delete(tabId);
      globalParameterReadyListeners.delete(tabId);
    };
  }, [tabId]);

  
  
  
  const currentTabParams = useMemo(() => getCurrentTabParams(), [getCurrentTabParams, forceUpdate]);
  const contextValue: ParameterContextValue = useMemo(() => ({
    currentTabParams,
    getCurrentTabParams,
    globalUrlParams,
    updateTabParams,
    getTabParams,
    cleanupTabParams,
    subscribeToParameter,
    unsubscribeFromParameter,
    broadcastParameterChange,
    markParametersReady,
    isParametersReady,
    subscribeToParametersReady,
    filterPanelParamNames
  }), [
    currentTabParams, getCurrentTabParams, globalUrlParams, updateTabParams, getTabParams,
    cleanupTabParams, subscribeToParameter, unsubscribeFromParameter, broadcastParameterChange,
    markParametersReady, isParametersReady, subscribeToParametersReady, filterPanelParamNames
  ]);

  return (
    <ParameterContext.Provider value={contextValue}>
      {children}
    </ParameterContext.Provider>
  );
};

export const useParameterContext = () => {
  const context = useContext(ParameterContext);
  if (!context) {
    throw new Error('useParameterContext must be used within ParameterProvider');
  }
  return context;
};

export const usePageParameters = () => {
  const context = useParameterContext();
  return context.currentTabParams;
};

export const useParameter = (key: string) => {
  const context = useParameterContext();
  return context.currentTabParams[key];
};

export const useParameters = (keys: string[]) => {
  const context = useParameterContext();
  const result: Record<string, any> = {};
  keys.forEach(key => {
    result[key] = context.currentTabParams[key];
  });
  return result;
};

export const clearAllTabParameters = () => {
  globalTabParametersStore.clear();
}; 