import { isMobileUserAgent } from './mobileUA';
import { isWeComEnvironment } from './wecomDetector';

export type ViewportMode = 'mobile' | 'desktop';
export type ViewportOverride = ViewportMode | null;
export type ViewportSource = 'override' | 'wecom' | 'ua' | 'default';

export const VIEWPORT_OVERRIDE_STORAGE_KEY = 'viewportOverride';
const LEGACY_FORCE_MOBILE_STORAGE_KEY = 'forceMobile';

export interface WorkbenchViewportDebugState {
  mode: ViewportMode;
  source: ViewportSource;
  override: ViewportOverride;
  canReturnToDesktop: boolean;
}

declare global {
  interface Window {
    __WORKBENCH_VIEWPORT__?: WorkbenchViewportDebugState;
  }
}

function migrateLegacyForceMobile(): void {
  try {
    if (localStorage.getItem(LEGACY_FORCE_MOBILE_STORAGE_KEY) !== 'true') {
      return;
    }
    if (!sessionStorage.getItem(VIEWPORT_OVERRIDE_STORAGE_KEY)) {
      sessionStorage.setItem(VIEWPORT_OVERRIDE_STORAGE_KEY, 'mobile');
    }
    localStorage.removeItem(LEGACY_FORCE_MOBILE_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

export function getViewportOverride(): ViewportOverride {
  migrateLegacyForceMobile();
  try {
    const value = sessionStorage.getItem(VIEWPORT_OVERRIDE_STORAGE_KEY);
    if (value === 'mobile' || value === 'desktop') {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

export function setViewportOverride(override: ViewportOverride): void {
  try {
    if (override === null) {
      sessionStorage.removeItem(VIEWPORT_OVERRIDE_STORAGE_KEY);
    } else {
      sessionStorage.setItem(VIEWPORT_OVERRIDE_STORAGE_KEY, override);
    }
  } catch {
    // ignore storage errors
  }
  publishViewportDebugState();
}

export function resolveViewportSource(): ViewportSource {
  if (isWeComEnvironment()) {
    return 'wecom';
  }
  if (typeof navigator !== 'undefined' && isMobileUserAgent()) {
    return 'ua';
  }
  if (getViewportOverride() !== null) {
    return 'override';
  }
  return 'default';
}

export function resolveViewportMode(): ViewportMode {
  if (isWeComEnvironment()) {
    return 'mobile';
  }
  if (typeof navigator !== 'undefined' && isMobileUserAgent()) {
    return 'mobile';
  }

  const override = getViewportOverride();
  if (override === 'mobile') {
    return 'mobile';
  }
  if (override === 'desktop') {
    return 'desktop';
  }

  return 'desktop';
}

export function getIsMobileViewport(): boolean {
  return resolveViewportMode() === 'mobile';
}

export function isNativeMobileSession(): boolean {
  if (isWeComEnvironment()) {
    return true;
  }
  if (typeof navigator !== 'undefined' && isMobileUserAgent()) {
    return true;
  }
  return false;
}

export function canReturnToDesktop(): boolean {
  return resolveViewportMode() === 'mobile' && !isNativeMobileSession();
}

export function getViewportDebugState(): WorkbenchViewportDebugState {
  return {
    mode: resolveViewportMode(),
    source: resolveViewportSource(),
    override: getViewportOverride(),
    canReturnToDesktop: canReturnToDesktop(),
  };
}

export function publishViewportDebugState(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.__WORKBENCH_VIEWPORT__ = getViewportDebugState();
}

export function dispatchViewportModeChanged(): void {
  if (typeof window === 'undefined') {
    return;
  }
  publishViewportDebugState();
  window.dispatchEvent(new CustomEvent('workbench-viewport-mode-changed'));
}
