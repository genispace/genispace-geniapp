import type { NavigateFunction } from 'react-router-dom';
import type { Platform } from './types';

const win = typeof window !== 'undefined'
  ? (window as unknown as { genibot?: unknown })
  : null;

export function getPlatform(): Platform {
  if (!win) return 'web';
  return win.genibot != null ? 'desktop' : 'web';
}

export function isDesktop(): boolean {
  return getPlatform() === 'desktop';
}

export function resolveAbsoluteUrl(href: string, base?: string): string {
  const b = base ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  try {
    return new URL(href, b).href;
  } catch {
    return href;
  }
}

export function openExternal(url: string): void {
  if (getPlatform() === 'desktop') {
    const g = (win as unknown as { genibot?: { openExternal?: (u: string) => void } })?.genibot;
    if (typeof g?.openExternal === 'function') {
      g.openExternal(url);
      return;
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export interface NavigateToOptions {

  external?: boolean;
}

export function navigateTo(url: string, opts?: NavigateToOptions): void {
  if (opts?.external || isDesktop()) {
    openExternal(url);
  } else {
    window.location.href = url;
  }
}

/** `http(s):` or protocol-relative `//` — same check as AppHeader / team-app shortcuts. */
export function isAbsoluteUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//');
}

/**
 * Absolute URLs: desktop → shell external browser, web → same-tab navigation.
 * Relative paths → React Router `navigate`.
 */
export function navigateExternalOrInApp(href: string, navigate: NavigateFunction): void {
  if (!href) return;
  if (isAbsoluteUrl(href)) {
    const resolved = resolveNavigationHref(href);
    if (isDesktop()) {
      openExternal(resolved);
    } else {
      window.location.href = resolved;
    }
  } else {
    navigate(href);
  }
}

/** Resolve absolute / relative href to a full URL for `window.open` / `<a href>`. */
export function resolveNavigationHref(href: string): string {
  if (!href) return href;
  if (isAbsoluteUrl(href)) {
    return href.startsWith('//') ? `${window.location.protocol}${href}` : href;
  }
  return resolveAbsoluteUrl(href);
}

type NavigationPointerEvent = Pick<
  MouseEvent,
  'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'button'
>;

/** True when the browser should keep default navigation (new tab/window, middle-click, etc.). */
export function isModifiedNavigationClick(event: NavigationPointerEvent): boolean {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  );
}

/** Open href in a new browser tab/window (desktop → system browser). */
export function openNavigationInNewTab(href: string): void {
  if (!href) return;
  openExternal(resolveNavigationHref(href));
}

/**
 * Same-tab header navigation: absolute URLs use location / external browser;
 * relative paths use React Router when `navigate` is provided.
 */
export function navigateHeaderLink(href: string, navigate?: NavigateFunction): void {
  if (!href) return;
  if (navigate) {
    navigateExternalOrInApp(href, navigate);
    return;
  }
  const resolved = resolveNavigationHref(href);
  if (isDesktop()) {
    openExternal(resolved);
  } else {
    window.location.href = resolved;
  }
}

/** For `<button>` header links — modifier / middle-click opens a new tab. */
export function handleHeaderNavigationClick(
  event: NavigationPointerEvent,
  href: string,
  navigate?: NavigateFunction,
): void {
  if (!href) return;
  if (isModifiedNavigationClick(event)) {
    openNavigationInNewTab(href);
    return;
  }
  navigateHeaderLink(href, navigate);
}

/** For `<a href>` header links — preserves native modifier-click behavior. */
export function handleHeaderAnchorClick(
  event: { preventDefault(): void; nativeEvent: NavigationPointerEvent },
  href: string,
  navigate?: NavigateFunction,
): void {
  if (isModifiedNavigationClick(event.nativeEvent)) return;
  event.preventDefault();
  navigateHeaderLink(href, navigate);
}
