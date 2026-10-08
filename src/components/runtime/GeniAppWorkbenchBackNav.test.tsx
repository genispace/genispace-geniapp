import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('@/lib/api/apiClient', () => ({
  default: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}));

import apiClient from '@/lib/api/apiClient';
import { resetMobileNavigationStack } from '@/mobile/utils/mobileNavigationStore';
import { GeniAppComponentProvider } from './GeniAppComponentProvider';
import { GeniAppWorkbench, type GeniAppWorkbenchConfig } from './GeniAppWorkbench';

const mockGet = apiClient.get as Mock;

// Distinct app ids per test: useWorkbenchAppAccess caches per applicationId module-wide.
const APP_UUIDS = {
  mobileDetail: '66666666-7777-4888-8000-111111111111',
  mobileRoot: '66666666-7777-4888-8000-222222222222',
  desktopDrill: '66666666-7777-4888-8000-333333333333',
  desktopStale: '66666666-7777-4888-8000-444444444444',
};

function page(title: string, content: string) {
  return {
    title: { en: title, zh: title },
    components: [{ id: `${title}-copy`, type: 'Typography', props: { content } }],
  };
}

// products/members are bottom-nav roots; product-detail is a drill-down target reachable
// only through workbench-open-tab (mirrors the SW product list → detail flow).
const backNavConfig = {
  appConfig: {
    appId: 'nav-app',
    name: 'Nav app',
    defaultOpenType: 'navigation',
    defaultNavigationKey: 'products-nav',
    floatingBackButton: true,
    navigation: {
      items: [
        { key: 'products-nav', title: { en: 'Products', zh: '商品' }, icon: 'List', linkedPage: 'products' },
        { key: 'members-nav', title: { en: 'Members', zh: '会员' }, icon: 'Users', linkedPage: 'members' },
      ],
    },
  },
  pages: {
    products: page('products', 'Products content'),
    members: page('members', 'Members content'),
    'product-detail': page('product-detail', 'Detail content'),
  },
} as unknown as GeniAppWorkbenchConfig;

function PathProbe() {
  const location = useLocation();
  return <output data-testid="path">{location.pathname}</output>;
}

function renderBackNavApplication(appUuid: string, entry = '/nav-app/products') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <GeniAppComponentProvider applicationId={appUuid} locale="zh">
        <GeniAppWorkbench
          identifier="nav-app"
          config={backNavConfig}
          renderPage={() => <PathProbe />}
        />
      </GeniAppComponentProvider>
    </MemoryRouter>,
  );
}

function mockAccess(appUuid: string) {
  mockGet.mockImplementation((url: string) => {
    if (url === `/applications/${appUuid}/users/me/access`) return new Promise(() => undefined);
    if (url.endsWith('/releases/latest-published-note')) return Promise.resolve({ data: null });
    return Promise.reject(new Error(`unexpected ${url}`));
  });
}

// jsdom has no PointerEvent: dispatch a MouseEvent under the pointer type so clientY survives.
const pointer = (type: 'pointerdown' | 'pointerup', node: Element, clientY = 200) =>
  fireEvent(node, new MouseEvent(type, { bubbles: true, cancelable: true, clientY }));

const BOTTOM_NAV = { name: 'Application bottom navigation' } as const;
const BACK_BUTTON = { name: '返回' } as const;
// MobileToolbar collapse/expand handle ("mobile.more_actions" has no locale entry, so the
// defaultValue 'More' is the accessible name in every language).
const TOOLBAR = { name: 'More' } as const;

beforeEach(() => {
  mockGet.mockReset();
  resetMobileNavigationStack();
  localStorage.clear();
});

afterEach(() => {
  sessionStorage.removeItem('viewportOverride');
});

describe('GeniAppWorkbench mobile chrome on drill-down pages', () => {
  it('hides the bottom navigation on a drill-down page and restores it after back', async () => {
    sessionStorage.setItem('viewportOverride', 'mobile');
    mockAccess(APP_UUIDS.mobileDetail);
    renderBackNavApplication(APP_UUIDS.mobileDetail);

    // Root page: bottom nav and toolbar present, no back pill (stack empty).
    expect(await screen.findByRole('navigation', BOTTOM_NAV)).toBeInTheDocument();
    expect(screen.getByRole('button', TOOLBAR)).toBeInTheDocument();
    expect(screen.queryByRole('button', BACK_BUTTON)).not.toBeInTheDocument();

    // Drill into the detail page: route entry pushed, bottom nav hides, back pill shows.
    // The top toolbar stays — hiding it was the 1.0.26 regression; its nav entries reuse the
    // stack-clearing bottom-tab path, so they are deliberate exits, not back-stack bypasses.
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/nav-app/products'));
    fireEvent(window, new CustomEvent('workbench-open-tab', {
      detail: { pageId: 'product-detail', urlParams: { id: '1' } },
    }));
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/nav-app/product-detail'));
    await waitFor(() => expect(screen.queryByRole('navigation', BOTTOM_NAV)).not.toBeInTheDocument());
    expect(screen.getByRole('button', TOOLBAR)).toBeInTheDocument();
    const backButton = await screen.findByRole('button', BACK_BUTTON);

    // Back: route entry popped → root page, bottom nav restored.
    pointer('pointerdown', backButton);
    pointer('pointerup', backButton);
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/nav-app/products'));
    expect(await screen.findByRole('navigation', BOTTOM_NAV)).toBeInTheDocument();
    expect(screen.getByRole('button', TOOLBAR)).toBeInTheDocument();
  });

  it('keeps the bottom navigation on a root page even with tab-history entries stacked', async () => {
    sessionStorage.setItem('viewportOverride', 'mobile');
    mockAccess(APP_UUIDS.mobileRoot);
    renderBackNavApplication(APP_UUIDS.mobileRoot);

    expect(await screen.findByRole('navigation', BOTTOM_NAV)).toBeInTheDocument();
    expect(screen.getByRole('button', TOOLBAR)).toBeInTheDocument();
    fireEvent(window, new CustomEvent('workbench-component-tab-push', {
      detail: { pageId: 'products', componentId: 'report', state: { primaryKey: 'product' } },
    }));

    // Stack non-empty → back pill appears, but the root page keeps its bottom nav and toolbar.
    expect(await screen.findByRole('button', BACK_BUTTON)).toBeInTheDocument();
    expect(screen.getByRole('navigation', BOTTOM_NAV)).toBeInTheDocument();
    expect(screen.getByRole('button', TOOLBAR)).toBeInTheDocument();
  });
});

describe('GeniAppWorkbench desktop floating back button', () => {
  it('renders on drill-down (desktop route push) and returns to the previous page', async () => {
    mockAccess(APP_UUIDS.desktopDrill);
    renderBackNavApplication(APP_UUIDS.desktopDrill);

    // Desktop chrome: sidebar nav present, no bottom nav, no back pill while stack is empty.
    expect(await screen.findByRole('navigation', { name: 'Application navigation' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', BOTTOM_NAV)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', BACK_BUTTON)).not.toBeInTheDocument();

    // Drill-down pushes a route entry without any mobile viewport (gate removed), so the
    // desktop back pill appears.
    fireEvent(window, new CustomEvent('workbench-open-tab', {
      detail: { pageId: 'product-detail', urlParams: { id: '1' } },
    }));
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/nav-app/product-detail'));
    const backButton = await screen.findByRole('button', BACK_BUTTON);

    pointer('pointerdown', backButton);
    pointer('pointerup', backButton);
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/nav-app/products'));
    await waitFor(() => expect(screen.queryByRole('button', BACK_BUTTON)).not.toBeInTheDocument());
  });

  it('discards a stale component-tab entry from the list page instead of swallowing back', async () => {
    mockAccess(APP_UUIDS.desktopStale);
    renderBackNavApplication(APP_UUIDS.desktopStale);
    expect(await screen.findByRole('navigation', { name: 'Application navigation' })).toBeInTheDocument();

    const tabBackEvents: CustomEvent[] = [];
    const listener = (e: Event) => tabBackEvents.push(e as CustomEvent);
    window.addEventListener('workbench-component-tab-back', listener);

    // Tab switch on the list page stacks a component-tab entry, then the drill-down stacks
    // a route entry on top of it.
    fireEvent(window, new CustomEvent('workbench-component-tab-push', {
      detail: { pageId: 'products', componentId: 'report', state: { primaryKey: 'store' } },
    }));
    fireEvent(window, new CustomEvent('workbench-open-tab', {
      detail: { pageId: 'product-detail', urlParams: { id: '1' } },
    }));
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/nav-app/product-detail'));
    const backButton = await screen.findByRole('button', BACK_BUTTON);

    // On the detail page the list page's tab entry is stale: back must skip it (no
    // tab-back event — its renderer is unmounted) and navigate via the route entry.
    pointer('pointerdown', backButton);
    pointer('pointerup', backButton);
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/nav-app/products'));
    expect(tabBackEvents).toHaveLength(0);

    window.removeEventListener('workbench-component-tab-back', listener);
  });
});
