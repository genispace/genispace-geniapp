import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  formatMobileNavEntry,
  getMobileNavigationCanGoBack,
  getMobileTabTransitionDirection,
  goBackMobileNavigation,
  MAX_MOBILE_NAVIGATION_STACK,
  mobileNavigateFromBottomTab,
  mobilePushNavigate,
  popMobileNavigationEntry,
  pushMobileNavigationEntry,
  resetMobileNavigationStack,
  resetMobileTabTransitionDirection,
  setMobileTabTransitionDirection,
  shouldPushMobileNavigation,
  type RouteMobileNavEntry,
} from '@/mobile/utils/mobileNavigationStore';
import { VIEWPORT_OVERRIDE_STORAGE_KEY } from '@/mobile/utils/getMobileViewportState';

describe('mobileNavigationStore', () => {
  beforeEach(() => {
    resetMobileNavigationStack();
    resetMobileTabTransitionDirection();
    sessionStorage.removeItem(VIEWPORT_OVERRIDE_STORAGE_KEY);
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 Macintosh',
      configurable: true,
    });
  });

  it('tracks stack for in-app navigation and clears on bottom tab', () => {
    sessionStorage.setItem(VIEWPORT_OVERRIDE_STORAGE_KEY, 'mobile');

    const navigated: string[] = [];
    const navigate = (to: string) => {
      navigated.push(to);
    };

    mobilePushNavigate(
      navigate,
      { pathname: '/demo-example/page-a', search: '?foo=1' },
      '/demo-example/page-b'
    );

    expect(navigated).toEqual(['/demo-example/page-b']);
    expect(getMobileNavigationCanGoBack()).toBe(true);
    expect(formatMobileNavEntry(popMobileNavigationEntry()! as RouteMobileNavEntry)).toBe(
      '/demo-example/page-a?foo=1'
    );
    expect(getMobileNavigationCanGoBack()).toBe(false);

    pushMobileNavigationEntry({ pathname: '/demo-example/page-a', search: '' });
    mobileNavigateFromBottomTab(navigate, '/demo-example/page-c');
    expect(navigated).toEqual(['/demo-example/page-b', '/demo-example/page-c']);
    expect(getMobileNavigationCanGoBack()).toBe(false);
  });

  it('tracks tab transition direction for bottom navigation', () => {
    expect(getMobileTabTransitionDirection()).toBe(0);
    setMobileTabTransitionDirection(1);
    expect(getMobileTabTransitionDirection()).toBe(1);
    setMobileTabTransitionDirection(-1);
    expect(getMobileTabTransitionDirection()).toBe(-1);
    resetMobileTabTransitionDirection();
    expect(getMobileTabTransitionDirection()).toBe(0);
  });

  it('pushes on any viewport for workbench content paths; skips same-path and non-content paths', () => {
    sessionStorage.setItem(VIEWPORT_OVERRIDE_STORAGE_KEY, 'mobile');

    expect(
      shouldPushMobileNavigation(
        { pathname: '/demo-example/page-a', search: '' },
        '/demo-example/page-a'
      )
    ).toBe(false);
    expect(
      shouldPushMobileNavigation(
        { pathname: '/demo-example/page-a', search: '' },
        '/demo-example/page-b'
      )
    ).toBe(true);

    // Viewport gate removed (2026-09-30): desktop drill-downs record the page being left
    // too, so the desktop floating back pill can return to it.
    sessionStorage.removeItem(VIEWPORT_OVERRIDE_STORAGE_KEY);
    expect(
      shouldPushMobileNavigation(
        { pathname: '/demo-example/page-a', search: '' },
        '/demo-example/page-b'
      )
    ).toBe(true);

    // Non-content paths never push, on either viewport.
    expect(
      shouldPushMobileNavigation({ pathname: '/sso/login', search: '' }, '/demo-example/page-b')
    ).toBe(false);
    sessionStorage.setItem(VIEWPORT_OVERRIDE_STORAGE_KEY, 'mobile');
    expect(
      shouldPushMobileNavigation({ pathname: '/sso/login', search: '' }, '/demo-example/page-b')
    ).toBe(false);
  });

  // Component-tab entries (task #80): renderers push their pre-switch tab selection onto the
  // same stack; route and tab entries interleave in strict LIFO order.
  it('mixes route and component-tab entries in strict LIFO order', () => {
    pushMobileNavigationEntry({ pathname: '/demo-example/page-a', search: '' });
    pushMobileNavigationEntry({
      kind: 'component-tab',
      pageId: 'product-page',
      componentId: 'sw-product-report',
      state: { primaryKey: 'product' },
    });
    expect(getMobileNavigationCanGoBack()).toBe(true);

    expect(popMobileNavigationEntry()).toEqual({
      kind: 'component-tab',
      pageId: 'product-page',
      componentId: 'sw-product-report',
      state: { primaryKey: 'product' },
    });
    const routeEntry = popMobileNavigationEntry();
    expect(routeEntry?.kind).not.toBe('component-tab');
    expect(formatMobileNavEntry(routeEntry as RouteMobileNavEntry)).toBe('/demo-example/page-a');
    expect(getMobileNavigationCanGoBack()).toBe(false);
  });

  it('dedupes a component-tab push identical to the stack top', () => {
    const entry = {
      kind: 'component-tab',
      pageId: 'product-page',
      componentId: 'sw-product-report',
      state: { primaryKey: 'store', subTabKey: 'store-all' },
    } as const;
    pushMobileNavigationEntry(entry);
    pushMobileNavigationEntry(entry);
    expect(popMobileNavigationEntry()?.kind).toBe('component-tab');
    expect(getMobileNavigationCanGoBack()).toBe(false);
  });

  it('bottom-tab reset clears component-tab entries together with route entries', () => {
    pushMobileNavigationEntry({
      kind: 'component-tab',
      pageId: 'product-page',
      componentId: 'sw-product-report',
      state: { primaryKey: 'product' },
    });
    resetMobileNavigationStack();
    expect(getMobileNavigationCanGoBack()).toBe(false);
  });

  it('goBackMobileNavigation navigates for route entries and dispatches an event for tab entries', () => {
    const navigate = vi.fn();
    const events: CustomEvent[] = [];
    const listener = (e: Event) => events.push(e as CustomEvent);
    window.addEventListener('workbench-component-tab-back', listener);

    pushMobileNavigationEntry({
      kind: 'component-tab',
      pageId: 'product-page',
      componentId: 'sw-product-report',
      state: { primaryKey: 'store' },
    });
    pushMobileNavigationEntry({ pathname: '/demo-example/list', search: '?x=1' });

    goBackMobileNavigation(navigate); // pops the route entry → navigate
    expect(navigate).toHaveBeenCalledWith('/demo-example/list?x=1', { replace: true });
    expect(events).toHaveLength(0);

    goBackMobileNavigation(navigate); // pops the tab entry → event, no navigation
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual({
      kind: 'component-tab',
      pageId: 'product-page',
      componentId: 'sw-product-report',
      state: { primaryKey: 'store' },
    });

    goBackMobileNavigation(navigate); // empty stack → no-op
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(events).toHaveLength(1);

    window.removeEventListener('workbench-component-tab-back', listener);
  });

  // Stale-entry discarding (2026-09-30): a component-tab entry whose page is no longer on
  // screen restores nothing (its owning renderer is unmounted) — dispatching its tab-back
  // event would invisibly swallow the back action. Discard it and keep popping.
  it('discards component-tab entries from other pages until a route entry, then navigates', () => {
    const navigate = vi.fn();
    const events: CustomEvent[] = [];
    const listener = (e: Event) => events.push(e as CustomEvent);
    window.addEventListener('workbench-component-tab-back', listener);

    pushMobileNavigationEntry({ pathname: '/demo-example/list', search: '' });
    pushMobileNavigationEntry({
      kind: 'component-tab',
      pageId: 'list-page',
      componentId: 'report',
      state: { primaryKey: 'a' },
    });
    pushMobileNavigationEntry({
      kind: 'component-tab',
      pageId: 'list-page',
      componentId: 'report',
      state: { primaryKey: 'b' },
    });

    goBackMobileNavigation(navigate, 'detail-page'); // both tab entries are foreign → discarded
    expect(events).toHaveLength(0);
    expect(navigate).toHaveBeenCalledWith('/demo-example/list', { replace: true });
    expect(getMobileNavigationCanGoBack()).toBe(false);

    window.removeEventListener('workbench-component-tab-back', listener);
  });

  it('restores a same-page component-tab entry, then discards the remaining foreign one', () => {
    const navigate = vi.fn();
    const events: CustomEvent[] = [];
    const listener = (e: Event) => events.push(e as CustomEvent);
    window.addEventListener('workbench-component-tab-back', listener);

    pushMobileNavigationEntry({
      kind: 'component-tab',
      pageId: 'other-page',
      componentId: 'report',
      state: { primaryKey: 'a' },
    });
    pushMobileNavigationEntry({
      kind: 'component-tab',
      pageId: 'current-page',
      componentId: 'report',
      state: { primaryKey: 'b' },
    });

    goBackMobileNavigation(navigate, 'current-page'); // same-page entry → restore event
    expect(navigate).not.toHaveBeenCalled();
    expect(events).toHaveLength(1);
    expect(events[0].detail).toMatchObject({ pageId: 'current-page' });

    goBackMobileNavigation(navigate, 'current-page'); // foreign entry, nothing after → discarded
    expect(navigate).not.toHaveBeenCalled();
    expect(events).toHaveLength(1);
    expect(getMobileNavigationCanGoBack()).toBe(false);

    window.removeEventListener('workbench-component-tab-back', listener);
  });

  // Cross-page back stack (task #92 req 4, user scenario): list → detail → back → list leaves
  // the back button usable, and the next back returns to the page visited before the list.
  it('keeps the back button usable across pages: list → detail → back → list → back → previous tab', () => {
    const navigate = vi.fn();

    // Sidebar jump into the list records the previous tab; the drill-down records the list.
    pushMobileNavigationEntry({ pathname: '/wb/sw-page-sales', search: '?_nav=sales' });
    pushMobileNavigationEntry({ pathname: '/wb/sw-page-product', search: '?_nav=product' });
    expect(getMobileNavigationCanGoBack()).toBe(true);

    goBackMobileNavigation(navigate); // detail → list
    expect(navigate).toHaveBeenLastCalledWith('/wb/sw-page-product?_nav=product', { replace: true });
    expect(getMobileNavigationCanGoBack()).toBe(true); // button still usable on the list page

    goBackMobileNavigation(navigate); // list → the tab visited before it
    expect(navigate).toHaveBeenLastCalledWith('/wb/sw-page-sales?_nav=sales', { replace: true });
    expect(getMobileNavigationCanGoBack()).toBe(false); // stack empty → button hides (as on deep-link)
  });

  it('dedupes a route push identical to the stack top', () => {
    pushMobileNavigationEntry({ pathname: '/wb/list', search: '?a=1' });
    pushMobileNavigationEntry({ pathname: '/wb/list', search: '?a=1' });
    expect(popMobileNavigationEntry()).toEqual({ pathname: '/wb/list', search: '?a=1' });
    expect(getMobileNavigationCanGoBack()).toBe(false);
  });

  it('caps the stack at MAX_MOBILE_NAVIGATION_STACK, dropping the oldest entries', () => {
    for (let i = 0; i < MAX_MOBILE_NAVIGATION_STACK + 5; i += 1) {
      pushMobileNavigationEntry({ pathname: `/wb/page-${i}`, search: '' });
    }
    let depth = 0;
    let oldest: RouteMobileNavEntry | undefined;
    for (let entry = popMobileNavigationEntry(); entry; entry = popMobileNavigationEntry()) {
      oldest = entry as RouteMobileNavEntry;
      depth += 1;
    }
    expect(depth).toBe(MAX_MOBILE_NAVIGATION_STACK);
    expect(oldest?.pathname).toBe('/wb/page-5');
  });
});
