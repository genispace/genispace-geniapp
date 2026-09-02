import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { isWeComEnvironment } from '@/mobile/utils/wecomDetector';
import {
  canReturnToDesktop as resolveCanReturnToDesktop,
  dispatchViewportModeChanged,
  getViewportDebugState,
  publishViewportDebugState,
  resolveViewportMode,
  resolveViewportSource,
  setViewportOverride,
  type ViewportMode,
  type ViewportSource,
} from '@/mobile/utils/getMobileViewportState';

export type { ViewportMode };

interface ViewportContextValue {
  mode: ViewportMode;
  isMobile: boolean;
  /** True when on desktop browser with a manual mobile preview override. */
  canReturnToDesktop: boolean;
  viewportSource: ViewportSource;
  isWeCom: boolean;
  forceMobile: () => void;
  forceDesktop: () => void;
  reset: () => void;
}

const ViewportContext = createContext<ViewportContextValue | null>(null);

function readViewportState() {
  const debugState = getViewportDebugState();
  return {
    mode: debugState.mode,
    canReturnToDesktop: debugState.canReturnToDesktop,
    viewportSource: debugState.source,
  };
}

export function ViewportProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ViewportMode>(() => resolveViewportMode());
  const [canReturnToDesktop, setCanReturnToDesktop] = useState(
    resolveCanReturnToDesktop
  );
  const [viewportSource, setViewportSource] = useState<ViewportSource>(
    resolveViewportSource
  );

  const syncViewportState = useCallback(() => {
    const nextState = readViewportState();
    setMode(nextState.mode);
    setCanReturnToDesktop(nextState.canReturnToDesktop);
    setViewportSource(nextState.viewportSource);
  }, []);

  const forceMobile = useCallback(() => {
    setViewportOverride('mobile');
    setMode('mobile');
    setCanReturnToDesktop(resolveCanReturnToDesktop());
    setViewportSource('override');
    dispatchViewportModeChanged();
  }, []);

  const forceDesktop = useCallback(() => {
    setViewportOverride('desktop');
    setMode('desktop');
    setCanReturnToDesktop(false);
    setViewportSource('override');
    dispatchViewportModeChanged();
  }, []);

  const reset = useCallback(() => {
    setViewportOverride(null);
    syncViewportState();
    dispatchViewportModeChanged();
  }, [syncViewportState]);

  useEffect(() => {
    publishViewportDebugState();
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      syncViewportState();
    };

    const handleViewportModeChanged = () => {
      syncViewportState();
    };

    // DevTools device emulation flips navigator.userAgent without firing any
    // event React observes — the mode only updated on full reload. Emulation
    // toggles DO fire window resize, so re-evaluate (debounced) on resize.
    let resizeTimer: number | undefined;
    const handleResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(syncViewportState, 150);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(
      'workbench-viewport-mode-changed',
      handleViewportModeChanged
    );
    window.addEventListener('resize', handleResize);

    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(
        'workbench-viewport-mode-changed',
        handleViewportModeChanged
      );
      window.removeEventListener('resize', handleResize);
    };
  }, [syncViewportState]);

  return (
    <ViewportContext.Provider
      value={{
        mode,
        isMobile: mode === 'mobile',
        canReturnToDesktop,
        viewportSource,
        isWeCom: isWeComEnvironment(),
        forceMobile,
        forceDesktop,
        reset,
      }}
    >
      {children}
    </ViewportContext.Provider>
  );
}

export function useViewport(): ViewportContextValue {
  const context = useContext(ViewportContext);
  if (!context) {
    throw new Error('useViewport must be used within ViewportProvider');
  }
  return context;
}
