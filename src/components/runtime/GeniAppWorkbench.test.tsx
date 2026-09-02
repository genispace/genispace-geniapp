import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { GeniAppComponentProvider } from './GeniAppComponentProvider';
import { GeniAppWorkbench, type GeniAppWorkbenchConfig } from './GeniAppWorkbench';

const config = {
  appConfig: {
    appId: 'acceptance-app',
    navigation: {
      items: [
        { key: 'overview-nav', title: { en: 'Overview', zh: '概览' }, icon: 'Home', linkedPage: 'overview' },
        { key: 'orders-nav', title: { en: 'Orders', zh: '订单' }, icon: 'List', linkedPage: 'orders' },
      ],
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
      <GeniAppComponentProvider applicationId="acceptance-app" locale={locale}>
        <GeniAppWorkbench identifier="acceptance-app" name="Acceptance app" config={config} />
      </GeniAppComponentProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  sessionStorage.removeItem('viewportOverride');
});

describe('GeniAppWorkbench', () => {
  it('uses the standard GeniApp sidebar and updates locale and theme controls', async () => {
    renderApplication();

    expect(await screen.findByRole('navigation', { name: 'Application navigation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '概览' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Overview content')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(await screen.findByRole('button', { name: 'Overview' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
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
});
