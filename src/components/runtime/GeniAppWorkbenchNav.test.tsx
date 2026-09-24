import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('@/lib/api/apiClient', () => ({
  default: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}));

import apiClient from '@/lib/api/apiClient';
import { GeniAppComponentProvider } from './GeniAppComponentProvider';
import { GeniAppWorkbench, type GeniAppWorkbenchConfig } from './GeniAppWorkbench';

const mockGet = apiClient.get as Mock;

// Distinct app ids per test: useWorkbenchAppAccess caches per applicationId module-wide.
const APP_UUIDS = {
  gated: '77777777-8888-4999-8000-111111111111',
  ungatedRole: '77777777-8888-4999-8000-222222222222',
  landingWait: '77777777-8888-4999-8000-333333333333',
  landingImmediate: '77777777-8888-4999-8000-444444444444',
};
const STORE_MANAGER_RULE = {
  rules: [{ source: 'role', field: 'app', op: 'in', value: ['store_manager'] }],
};

function page(title: string, content: string) {
  return {
    title: { en: title, zh: title },
    components: [{ id: `${title}-copy`, type: 'Typography', props: { content } }],
  };
}

const navConfig = {
  appConfig: {
    appId: 'nav-app',
    name: 'Nav app',
    defaultOpenType: 'navigation',
    defaultNavigationKey: 'sales-nav',
    navigation: {
      items: [
        {
          key: 'sales-nav',
          title: { en: 'Sales', zh: '销售' },
          icon: 'Home',
          linkedPage: 'sales',
          visibleWhen: STORE_MANAGER_RULE,
        },
        { key: 'products-nav', title: { en: 'Products', zh: '商品' }, icon: 'List', linkedPage: 'products' },
        { key: 'members-nav', title: { en: 'Members', zh: '会员' }, icon: 'Users', linkedPage: 'members' },
        { key: 'guides-nav', title: { en: 'Guides', zh: '导购' }, icon: 'Star', linkedPage: 'guides' },
        {
          key: 'admin-nav',
          title: { en: 'Admin', zh: '管理' },
          icon: 'Settings',
          linkedPage: 'admin',
          visibility: { mode: 'all', devices: ['desktop'] },
        },
      ],
    },
  },
  pages: {
    sales: page('sales', 'Sales content'),
    products: page('products', 'Products content'),
    members: page('members', 'Members content'),
    guides: page('guides', 'Guides content'),
    admin: page('admin', 'Admin content'),
  },
} as unknown as GeniAppWorkbenchConfig;

function PathProbe() {
  const location = useLocation();
  return <output data-testid="path">{location.pathname}</output>;
}

function renderNavApplication(config: GeniAppWorkbenchConfig, appUuid: string, entry = '/') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <GeniAppComponentProvider applicationId={appUuid} locale="zh">
        <GeniAppWorkbench
          identifier="nav-app"
          config={config}
          renderPage={() => <PathProbe />}
        />
      </GeniAppComponentProvider>
    </MemoryRouter>,
  );
}

function mockAccess(appUuid: string, roles: string[] | (() => Promise<unknown>)) {
  mockGet.mockImplementation((url: string) => {
    if (url === `/applications/${appUuid}/users/me/access`) {
      if (typeof roles === 'function') return roles();
      return Promise.resolve({
        data: { isUser: true, roles: roles.map((code) => ({ code })), permissionCodes: [] },
      });
    }
    if (url.endsWith('/releases/latest-published-note')) return Promise.resolve({ data: null });
    return Promise.reject(new Error(`unexpected ${url}`));
  });
}

beforeEach(() => {
  mockGet.mockReset();
});

afterEach(() => {
  sessionStorage.removeItem('viewportOverride');
});

describe('GeniAppWorkbench mobile bottom navigation role gating', () => {
  it('keeps visibleWhen role-gated tabs once the app-role context resolves, and still hides desktop-only items', async () => {
    sessionStorage.setItem('viewportOverride', 'mobile');
    mockAccess(APP_UUIDS.gated, ['store_manager']);
    renderNavApplication(navConfig, APP_UUIDS.gated, '/nav-app/products');

    const bottomNav = await screen.findByRole('navigation', { name: 'Application bottom navigation' });
    // Role-gated 销售 arrives once /me/access resolves; ungated tabs were there all along.
    expect(await screen.findByRole('button', { name: '销售' })).toBeInTheDocument();
    const labels = Array.from(bottomNav.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'));
    expect(labels).toEqual(['销售', '商品', '会员', '导购']);
    expect(screen.queryByRole('button', { name: '管理' })).not.toBeInTheDocument();
  });

  it('hides the role-gated tab for users without the role', async () => {
    sessionStorage.setItem('viewportOverride', 'mobile');
    mockAccess(APP_UUIDS.ungatedRole, ['hq_analyst']);
    renderNavApplication(navConfig, APP_UUIDS.ungatedRole, '/nav-app/products');

    const bottomNav = await screen.findByRole('navigation', { name: 'Application bottom navigation' });
    await screen.findByRole('button', { name: '商品' });
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith(`/applications/${APP_UUIDS.ungatedRole}/users/me/access`));
    await new Promise((resolve) => setTimeout(resolve, 30));
    const labels = Array.from(bottomNav.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'));
    expect(labels).toEqual(['商品', '会员', '导购']);
  });
});

describe('GeniAppWorkbench standalone landing redirect', () => {
  it('waits for the app-role context before redirecting to a role-gated default page', async () => {
    let resolveAccess: (value: unknown) => void = () => undefined;
    mockAccess(APP_UUIDS.landingWait, () => new Promise((resolve) => { resolveAccess = resolve; }));
    renderNavApplication(navConfig, APP_UUIDS.landingWait);

    // Access fetch is in flight; the redirect must not fire on a stale (role-less) context.
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith(`/applications/${APP_UUIDS.landingWait}/users/me/access`));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(screen.getByTestId('path')).toHaveTextContent(/^\/$/);

    resolveAccess({ data: { isUser: true, roles: [{ code: 'store_manager' }], permissionCodes: [] } });
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/nav-app/sales'));
  });

  it('redirects immediately when no navigation item is visibleWhen-gated', async () => {
    // Access promise never settles — ungated apps must not wait on it at all.
    mockAccess(APP_UUIDS.landingImmediate, () => new Promise(() => undefined));
    const ungatedConfig = {
      ...navConfig,
      appConfig: {
        ...(navConfig.appConfig as Record<string, unknown>),
        navigation: {
          items: [
            { key: 'products-nav', title: { en: 'Products', zh: '商品' }, icon: 'List', linkedPage: 'products' },
          ],
        },
        defaultNavigationKey: 'products-nav',
      },
    } as unknown as GeniAppWorkbenchConfig;
    renderNavApplication(ungatedConfig, APP_UUIDS.landingImmediate);

    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/nav-app/products'));
  });
});
