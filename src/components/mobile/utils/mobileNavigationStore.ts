import { getIsMobileViewport } from '@/mobile/utils/getMobileViewportState';
import {
  isWorkbenchContentPath,
  stripLegacyMobileRoutePrefix,
} from '@/utils/workbenchPathUtils';

export interface RouteMobileNavEntry {
  /** Absent on entries written before the union existed — treated as 'route'. */
  kind?: 'route';
  pathname: string;
  search: string;
}

/** Component-internal tab selection, pushed by renderers through the
 *  workbench-component-tab-push event (task #80, 2026-09-08). Popping it restores the tab
 *  state in place (workbench-component-tab-back event back to the component) — no navigation. */
export interface ComponentTabMobileNavEntry {
  kind: 'component-tab';
  pageId: string;
  componentId: string;
  state: { primaryKey: string; subTabKey?: string };
}

export type MobileNavEntry = RouteMobileNavEntry | ComponentTabMobileNavEntry;

/** Upper bound so a long session of cross-page hops (task #92 req 4) can't grow the stack
 *  without limit — the oldest entries are dropped first. */
export const MAX_MOBILE_NAVIGATION_STACK = 20;

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

export function pushMobileNavigationEntry(entry: MobileNavEntry): void {
  if (entry.kind === 'component-tab') {
    // Dedupe against the stack top: re-pushing the state already on top would make the next
    // back press a visible no-op (e.g. re-clicking the tab a back-restore just landed on).
    const top = stack[stack.length - 1];
    if (
      top?.kind === 'component-tab' &&
      top.pageId === entry.pageId &&
      top.componentId === entry.componentId &&
      top.state.primaryKey === entry.state.primaryKey &&
      top.state.subTabKey === entry.state.subTabKey
    ) {
      return;
    }
    stack.push({
      kind: 'component-tab',
      pageId: entry.pageId,
      componentId: entry.componentId,
      state: { ...entry.state },
    });
  } else {
    // Same top-dedupe as component-tab entries: re-entering the page already on top (repeat
    // clicks on the current page) must not stack a no-op back step.
    const top = stack[stack.length - 1];
    if (
      top &&
      top.kind !== 'component-tab' &&
      top.pathname === entry.pathname &&
      top.search === entry.search
    ) {
      return;
    }
    stack.push({
      pathname: entry.pathname,
      search: entry.search,
    });
  }
  if (stack.length > MAX_MOBILE_NAVIGATION_STACK) {
    stack.splice(0, stack.length - MAX_MOBILE_NAVIGATION_STACK);
  }
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

export function formatMobileNavEntry(entry: RouteMobileNavEntry): string {
  return `${entry.pathname}${entry.search}`;
}

/** Shared floating-back behavior (task #80): pop the stack; a route entry navigates,
 *  a component-tab entry dispatches workbench-component-tab-back so the owning renderer
 *  restores its tab selection in place (the renderer may live in another bundle, so the
 *  answer goes through a CustomEvent, never a direct store import). */
export function goBackMobileNavigation(
  navigate: (to: string, options?: { replace?: boolean }) => void
): void {
  const prev = popMobileNavigationEntry();
  if (!prev) {
    return;
  }
  if (prev.kind === 'component-tab') {
    window.dispatchEvent(new CustomEvent('workbench-component-tab-back', { detail: prev }));
    return;
  }
  navigate(formatMobileNavEntry(prev), { replace: true });
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
