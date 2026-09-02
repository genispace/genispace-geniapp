import { getIsMobileViewport } from '@/mobile/utils/getMobileViewportState';
import {
  isWorkbenchContentPath,
  stripLegacyMobileRoutePrefix,
} from '@/utils/workbenchPathUtils';

export interface MobileNavEntry {
  pathname: string;
  search: string;
}

let stack: MobileNavEntry[] = [];
let tabTransitionDirection: -1 | 0 | 1 = 0;
const listeners = new Set<() => void>();
const tabTransitionListeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function notifyTabTransitionListeners() {
  tabTransitionListeners.forEach((listener) => listener());
}

export function isMobileWorkbenchPath(pathname: string): boolean {
  if (!getIsMobileViewport()) {
    return false;
  }
  return isWorkbenchContentPath(stripLegacyMobileRoutePrefix(pathname));
}

export function subscribeMobileNavigation(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeMobileTabTransition(listener: () => void): () => void {
  tabTransitionListeners.add(listener);
  return () => {
    tabTransitionListeners.delete(listener);
  };
}

export function getMobileTabTransitionDirection(): -1 | 0 | 1 {
  return tabTransitionDirection;
}

export function setMobileTabTransitionDirection(direction: -1 | 0 | 1): void {
  tabTransitionDirection = direction;
  notifyTabTransitionListeners();
}

export function resetMobileTabTransitionDirection(): void {
  if (tabTransitionDirection === 0) {
    return;
  }
  tabTransitionDirection = 0;
  notifyTabTransitionListeners();
}

export function getMobileNavigationCanGoBack(): boolean {
  return stack.length > 0;
}

export function resetMobileNavigationStack(): void {
  if (stack.length === 0) {
    return;
  }
  stack = [];
  notifyListeners();
}

export function pushMobileNavigationEntry(location: {
  pathname: string;
  search: string;
}): void {
  stack.push({
    pathname: location.pathname,
    search: location.search,
  });
  notifyListeners();
}

export function popMobileNavigationEntry(): MobileNavEntry | undefined {
  if (stack.length === 0) {
    return undefined;
  }
  const entry = stack.pop();
  notifyListeners();
  return entry;
}

export function formatMobileNavEntry(entry: MobileNavEntry): string {
  return `${entry.pathname}${entry.search}`;
}

export function shouldPushMobileNavigation(
  location: { pathname: string; search: string },
  targetPath: string
): boolean {
  if (!isMobileWorkbenchPath(location.pathname)) {
    return false;
  }
  const currentPath = `${location.pathname}${location.search}`;
  return currentPath !== targetPath;
}

/** Record current page and navigate — used for in-app page jumps on mobile. */
export function mobilePushNavigate(
  navigate: (to: string, options?: { replace?: boolean }) => void,
  location: { pathname: string; search: string },
  to: string,
  options?: { replace?: boolean }
): void {
  if (shouldPushMobileNavigation(location, to)) {
    pushMobileNavigationEntry(location);
  }
  if (options) {
    navigate(to, options);
  } else {
    navigate(to);
  }
}

/** Bottom tab navigation — clears stack and opens a root tab page. */
export function mobileNavigateFromBottomTab(
  navigate: (to: string, options?: { replace?: boolean }) => void,
  to: string
): void {
  resetMobileNavigationStack();
  // replace, not push: tabs are peer entry points (the stack was just reset), and a growing
  // webview history makes WeCom iOS pop up its native "< >" bottom toolbar — the biggest
  // trigger of the bottom-nav height jitter. Trade-off (approved 2026-07-15): hardware back /
  // WeCom swipe-back on a tab page exits the workbench instead of stepping through tab
  // history. Drill-down navigation (mobilePushNavigate) still pushes, so detail-page back
  // behavior is unchanged.
  navigate(to, { replace: true });
}
