import React from 'react';

export interface DebugInfo {
  timestamp: number;
  type: 'parameter_change' | 'component_render' | 'navigation' | 'error';
  component?: string;
  tabId?: string;
  pageId?: string;
  details: any;
}

class DebugLogger {
  private logs: DebugInfo[] = [];
  private maxLogs = 1000;
  private isEnabled = process.env.NODE_ENV === 'development';

  log(type: DebugInfo['type'], details: any, component?: string, tabId?: string, pageId?: string) {
    if (!this.isEnabled) return;

    const debugInfo: DebugInfo = {
      timestamp: Date.now(),
      type,
      component,
      tabId,
      pageId,
      details
    };

    this.logs.push(debugInfo);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    console.warn(`[Workbench Debug] ${type}:`, debugInfo);
  }

  getLogs(filter?: Partial<Pick<DebugInfo, 'type' | 'component' | 'tabId' | 'pageId'>>) {
    if (!filter) return this.logs;

    return this.logs.filter(log => {
      return Object.entries(filter).every(([key, value]) => 
        log[key as keyof DebugInfo] === value
      );
    });
  }

  clear() {
    this.logs = [];
  }

  getStats() {
    const stats = {
      total: this.logs.length,
      byType: {} as Record<string, number>,
      byComponent: {} as Record<string, number>,
      byTab: {} as Record<string, number>
    };

    this.logs.forEach(log => {
      stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
      if (log.component) {
        stats.byComponent[log.component] = (stats.byComponent[log.component] || 0) + 1;
      }
      if (log.tabId) {
        stats.byTab[log.tabId] = (stats.byTab[log.tabId] || 0) + 1;
      }
    });

    return stats;
  }
}

export const debugLogger = new DebugLogger();

export const logParameterChange = (
  key: string, 
  value: any, 
  oldValue: any, 
  source: string,
  componentId?: string,
  tabId?: string
) => {
  debugLogger.log('parameter_change', {
    key,
    value,
    oldValue,
    source,
    componentId
  }, componentId, tabId);
};

export const logComponentRender = (
  componentId: string,
  componentType: string,
  renderProps: any,
  tabId?: string,
  pageId?: string
) => {
  debugLogger.log('component_render', {
    componentId,
    componentType,
    renderProps: Object.keys(renderProps || {})
  }, componentId, tabId, pageId);
};

export const logNavigation = (
  from: string,
  to: string,
  tabId?: string,
  pageId?: string
) => {
  debugLogger.log('navigation', {
    from,
    to
  }, undefined, tabId, pageId);
};

export const logError = (
  error: Error,
  context: string,
  componentId?: string,
  tabId?: string,
  pageId?: string
) => {
  debugLogger.log('error', {
    message: error.message,
    stack: error.stack,
    context
  }, componentId, tabId, pageId);
};

export const createPerformanceMonitor = (name: string) => {
  const startTime = performance.now();

  return {
    end: () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      debugLogger.log('parameter_change', {
        performance: {
          name,
          duration: `${duration.toFixed(2)}ms`,
          startTime,
          endTime
        }
      });

      return duration;
    }
  };
};

export const detectRenderingStateUpdates = () => {
  let isRendering = false;

  const originalSetState = React.Component.prototype.setState;
  React.Component.prototype.setState = function(...args) {
    if (isRendering) {
      console.warn('[Workbench Debug] setState called during rendering!', {
        component: this.constructor.name,
        stack: new Error().stack
      });
    }
    return originalSetState.apply(this, args);
  };

  // Hook for functional components
  const originalUseState = React.useState;

  React.useState = function (...args: any[]): [any, React.Dispatch<React.SetStateAction<any>>] {
    const [state, setState] = (originalUseState as (...a: any[]) => [any, React.Dispatch<React.SetStateAction<any>>])(
      ...args
    );

    const wrappedSetState = (newState: any) => {
      if (isRendering) {
        console.warn('[Workbench Debug] useState setter called during rendering!', {
          stack: new Error().stack
        });
      }
      return setState(newState);
    };

    return [state, wrappedSetState];
  };

  window.addEventListener('beforeunload', () => {
    isRendering = true;
  });

  window.addEventListener('load', () => {
    isRendering = false;
  });
};

export const setupGlobalErrorHandling = () => {
  window.addEventListener('error', (event) => {
    logError(event.error, 'Global error handler');
  });

  window.addEventListener('unhandledrejection', (event) => {
    logError(new Error(event.reason), 'Unhandled promise rejection');
  });
};

export const initDebugTools = () => {
  if (process.env.NODE_ENV === 'development') {
    setupGlobalErrorHandling();

    (window as any).workbenchDebug = {
      logger: debugLogger,
      logParameterChange,
      logComponentRender,
      logNavigation,
      logError,
      createPerformanceMonitor
    };

  }
}; 