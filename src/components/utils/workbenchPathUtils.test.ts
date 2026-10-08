import { afterEach, describe, expect, it } from 'vitest';
import {
  isWorkbenchContentPath,
  registerWorkbenchContentPathSegment,
  unregisterWorkbenchContentPathSegment,
} from './workbenchPathUtils';
import {
  getMobileNavigationCanGoBack,
  mobilePushNavigate,
  resetMobileNavigationStack,
} from '../mobile/utils/mobileNavigationStore';

const APP_IDENTIFIER = 'sw-mypulse-app';
const WB_UUID = '99999999-0000-4000-8222-333333333333';

afterEach(() => {
  unregisterWorkbenchContentPathSegment(APP_IDENTIFIER);
  resetMobileNavigationStack();
  sessionStorage.removeItem('viewportOverride');
});

describe('workbenchPathUtils content-path segment registration', () => {
  it('rejects exported-app identifier paths until the runtime registers the segment', () => {
    expect(isWorkbenchContentPath(`/${APP_IDENTIFIER}/publish-history`)).toBe(false);
    registerWorkbenchContentPathSegment(APP_IDENTIFIER);
    expect(isWorkbenchContentPath(`/${APP_IDENTIFIER}/publish-history`)).toBe(true);
    expect(isWorkbenchContentPath(`/${APP_IDENTIFIER}`)).toBe(true);
    unregisterWorkbenchContentPathSegment(APP_IDENTIFIER);
    expect(isWorkbenchContentPath(`/${APP_IDENTIFIER}/publish-history`)).toBe(false);
  });

  it('keeps workbench-context gating unchanged', () => {
    expect(isWorkbenchContentPath(`/${WB_UUID}/overview`)).toBe(true);
    expect(isWorkbenchContentPath(`/workbench/${WB_UUID}/overview`)).toBe(true);
    expect(isWorkbenchContentPath('/demo-sales/overview')).toBe(true);
    expect(isWorkbenchContentPath('/dashboard')).toBe(false);
    expect(isWorkbenchContentPath('/sso/login')).toBe(false);
    expect(isWorkbenchContentPath('/')).toBe(false);
    // Registration of one identifier must not widen acceptance to arbitrary segments.
    registerWorkbenchContentPathSegment(APP_IDENTIFIER);
    expect(isWorkbenchContentPath('/some-other-app/page')).toBe(false);
  });

  it('lets the mobile back stack record drill-down entries on registered identifier paths', () => {
    sessionStorage.setItem('viewportOverride', 'mobile');
    const navigateCalls: string[] = [];
    const navigate = (to: string) => navigateCalls.push(to);
    const from = { pathname: `/${APP_IDENTIFIER}/products`, search: '' };

    // Unregistered: the path gate rejects the entry — no back target, floating button stays hidden.
    mobilePushNavigate(navigate, from, `/${APP_IDENTIFIER}/products/S001`);
    expect(getMobileNavigationCanGoBack()).toBe(false);

    registerWorkbenchContentPathSegment(APP_IDENTIFIER);
    mobilePushNavigate(navigate, from, `/${APP_IDENTIFIER}/products/S001`);
    expect(getMobileNavigationCanGoBack()).toBe(true);
    // Navigation itself is never gated — only the stack recording is.
    expect(navigateCalls).toEqual([`/${APP_IDENTIFIER}/products/S001`, `/${APP_IDENTIFIER}/products/S001`]);
  });
});
