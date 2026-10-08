import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useParams } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { GeniAppComponentProvider } from './GeniAppComponentProvider';
import { GeniAppWorkbench, type GeniAppWorkbenchConfig } from './GeniAppWorkbench';
import {
  getMobileNavigationCanGoBack,
  resetMobileNavigationStack,
} from '../mobile/utils/mobileNavigationStore';
import { isWorkbenchContentPath } from '../utils/workbenchPathUtils';

const config = {
  appConfig: {
    appId: 'acceptance-app',
    name: 'Acceptance app',
    navigation: {
      items: [
        { key: 'overview-nav', title: { en: 'Overview', zh: '概览' }, icon: 'Home', linkedPage: 'overview' },
        { key: 'orders-nav', title: { en: 'Orders', zh: '订单' }, icon: 'List', linkedPage: 'orders' },
      ],
    },
  },
  metadata: {
    locales: {
      zh: {
        appConfig: { name: '验收应用' },
      },
    },
  },
  pages: {
    overview: {
      title: { en: 'Overview', zh: '概览' },
      components: [{ id: 'overview-copy', type: 'Typography', props: { content: 'Overview content' } }],
    },
    orders: {
      title: { en: 'Orders', zh: '订单' },
      components: [{ id: 'orders-copy', type: 'Typography', props: { content: 'Orders content' } }],
    },
  },
} as unknown as GeniAppWorkbenchConfig;

function renderApplication(locale = 'zh') {
  return render(
    <MemoryRouter initialEntries={['/acceptance-app/overview?_nav=overview-nav']}>
      <GeniAppComponentProvider
        applicationId="acceptance-app"
        locale={locale}
        localeMetadata={config.metadata}
      >
        <GeniAppWorkbench identifier="acceptance-app" name="Acceptance app" config={config} />
      </GeniAppComponentProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  sessionStorage.removeItem('viewportOverride');
  resetMobileNavigationStack();
});

const toolbarConfig = {
  ...config,
  appConfig: {
    ...config.appConfig,
    floatingBackButton: true,
    navigation: {
      items: [
        ...config.appConfig.navigation.items,
        {
          key: 'reports-nav',
          title: { en: 'Reports', zh: '报表' },
          icon: 'BarChart',
          linkedPage: 'reports',
          mobileToolbar: true,
          visibility: { devices: ['desktop'] },
        },
      ],
    },
  },
  pages: {
    ...config.pages,
    reports: {
      title: { en: 'Reports', zh: '报表' },
      components: [{ id: 'reports-copy', type: 'Typography', props: { content: 'Reports content' } }],
    },
  },
} as unknown as GeniAppWorkbenchConfig;

function RouteParamsProbe() {
  const params = useParams();
  return (
    <div data-testid="route-params">
      {String(params.workbenchId ?? '')}|{String(params.pageId ?? '')}
    </div>
  );
}

describe('GeniAppWorkbench', () => {
  it('uses the standard GeniApp sidebar and updates locale and theme controls', async () => {
    renderApplication();

    expect(await screen.findByRole('navigation', { name: 'Application navigation' })).toBeInTheDocument();
    expect(screen.getByText('验收应用')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '概览' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Overview content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '深色' })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('lang', 'zh-CN');

    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(await screen.findByRole('button', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByText('Acceptance app')).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('lang', 'en-US');

    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    expect(screen.getByRole('button', { name: 'Light' })).toBeInTheDocument();
  });

  it('fits the mobile content container into the flex slot (no h-dvh) and layers the bottom nav above page content', async () => {
    sessionStorage.setItem('viewportOverride', 'mobile');
    const { container } = renderApplication('en');

    await screen.findByRole('navigation', { name: 'Application bottom navigation' });
    await screen.findByText('Overview content');

    // The content wrapper must obey the flex-1 slot height; an h-dvh container would
    // overflow the slot by the toolbar/bottom-nav height and cover the bottom nav.
    const multiPageRoot = container.querySelector('.h-full.w-full.overflow-hidden.relative');
    const contentContainer = multiPageRoot?.parentElement;
    expect(contentContainer?.className).toContain('h-full');
    expect(contentContainer?.className).not.toContain('h-dvh');

    // Fuse against stacking-context leaks: the active tab wrapper uses zIndex 10.
    const bottomNav = screen.getByRole('navigation', { name: 'Application bottom navigation' });
    expect(bottomNav.className).toContain('z-20');
  });

  it('keeps the desktop content container at full viewport height', async () => {
    const { container } = renderApplication('en');

    await screen.findByRole('navigation', { name: 'Application navigation' });
    await screen.findByText('Overview content');

    const multiPageRoot = container.querySelector('.h-full.w-full.overflow-hidden.relative');
    expect(multiPageRoot?.parentElement?.className).toContain('h-dvh');
  });

  it('registers the application identifier as a workbench content path segment while mounted', async () => {
    const { unmount } = renderApplication();

    await screen.findByRole('navigation', { name: 'Application navigation' });
    // `/{identifier}/...` routes must pass the shared content-path gate (mobile back
    // stack, content-path checks) while the app is mounted — and only then.
    expect(isWorkbenchContentPath('/acceptance-app/publish-history')).toBe(true);
    expect(isWorkbenchContentPath('/some-other-app/publish-history')).toBe(false);

    unmount();
    expect(isWorkbenchContentPath('/acceptance-app/publish-history')).toBe(false);
  });

  it('uses Workbench bottom navigation in an explicit mobile session', async () => {
    sessionStorage.setItem('viewportOverride', 'mobile');
    renderApplication('en');

    const mobileNavigation = await screen.findByRole('navigation', { name: 'Application bottom navigation' });
    expect(mobileNavigation).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Application navigation' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Orders' }));
    expect(await screen.findByText('Orders content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Orders' })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps the standard shell while rendering application-owned page source', async () => {
    render(
      <MemoryRouter initialEntries={['/acceptance-app/overview']}>
        <GeniAppComponentProvider applicationId="acceptance-app" locale="en">
          <GeniAppWorkbench
            identifier="acceptance-app"
            config={config}
            renderPage={({ pageId, pageParams }) => (
              <div data-testid="application-page">{pageId}:{String(pageParams._nav || '')}</div>
            )}
          />
        </GeniAppComponentProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('navigation', { name: 'Application navigation' })).toBeInTheDocument();
    expect(screen.getByTestId('application-page')).toHaveTextContent('overview:');
    expect(screen.queryByText('Overview content')).not.toBeInTheDocument();
  });

  it('injects workbenchId/pageId route params into the rendered page tree', async () => {
    render(
      <MemoryRouter initialEntries={['/acceptance-app/orders?store=S001']}>
        <GeniAppComponentProvider applicationId="acceptance-app" locale="en">
          <GeniAppWorkbench
            identifier="acceptance-app"
            config={config}
            renderPage={() => <RouteParamsProbe />}
          />
        </GeniAppComponentProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('route-params')).toHaveTextContent('acceptance-app|orders');
  });

  it('redirects the bare root to the landing page and then exposes route params', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <GeniAppComponentProvider applicationId="acceptance-app" locale="en">
          <GeniAppWorkbench
            identifier="acceptance-app"
            config={config}
            renderPage={() => <RouteParamsProbe />}
          />
        </GeniAppComponentProvider>
      </MemoryRouter>,
    );

    // The landing redirect fires after the first paint, so params only settle
    // asynchronously — mirrored renderers gate on workbenchId the same way.
    await waitFor(() => expect(screen.getByTestId('route-params')).toHaveTextContent('acceptance-app|overview'));
  });

  it('surfaces mobileToolbar-flagged navigation entries in the mobile top toolbar', async () => {
    sessionStorage.setItem('viewportOverride', 'mobile');
    render(
      <MemoryRouter initialEntries={['/acceptance-app/overview']}>
        <GeniAppComponentProvider applicationId="acceptance-app" locale="en" localeMetadata={toolbarConfig.metadata}>
          <GeniAppWorkbench identifier="acceptance-app" config={toolbarConfig} />
        </GeniAppComponentProvider>
      </MemoryRouter>,
    );

    // devices:['desktop'] keeps the entry out of the bottom tab bar.
    await screen.findByRole('navigation', { name: 'Application bottom navigation' });
    expect(screen.queryByRole('button', { name: 'Reports' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Reports' }));

    expect(await screen.findByText('Reports content')).toBeInTheDocument();
  });

  it('wires the mobile back stack: component-tab pushes surface the floating back button', async () => {
    sessionStorage.setItem('viewportOverride', 'mobile');
    render(
      <MemoryRouter initialEntries={['/acceptance-app/overview']}>
        <GeniAppComponentProvider applicationId="acceptance-app" locale="en" localeMetadata={toolbarConfig.metadata}>
          <GeniAppWorkbench identifier="acceptance-app" config={toolbarConfig} />
        </GeniAppComponentProvider>
      </MemoryRouter>,
    );

    await screen.findByRole('navigation', { name: 'Application bottom navigation' });
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();

    window.dispatchEvent(new CustomEvent('workbench-component-tab-push', {
      detail: { pageId: 'overview', componentId: 'report-1', state: { primaryKey: 'tab-a' } },
    }));
    await waitFor(() => expect(getMobileNavigationCanGoBack()).toBe(true));
    expect(await screen.findByRole('button', { name: 'Back' })).toBeInTheDocument();

    const backEvents: Array<{ componentId?: string; state?: { primaryKey?: string } }> = [];
    const listener = (event: Event) => {
      backEvents.push((event as CustomEvent).detail);
    };
    window.addEventListener('workbench-component-tab-back', listener);
    window.dispatchEvent(new CustomEvent('workbench-nav-back'));
    window.removeEventListener('workbench-component-tab-back', listener);

    expect(backEvents).toEqual([{ kind: 'component-tab', pageId: 'overview', componentId: 'report-1', state: { primaryKey: 'tab-a' } }]);
    await waitFor(() => expect(getMobileNavigationCanGoBack()).toBe(false));
  });
});
