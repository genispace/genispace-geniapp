import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('@/lib/api/apiClient', () => ({
  default: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}));

import apiClient from '@/lib/api/apiClient';
import { GENISPACE_SHELL_INIT_APPLIED_EVENT } from '../../hooks';
import { GeniAppComponentProvider } from './GeniAppComponentProvider';
import { GeniAppWorkbench, type GeniAppWorkbenchConfig } from './GeniAppWorkbench';

const mockGet = apiClient.get as Mock;

const config = {
  appConfig: {
    appId: 'gate-app',
    name: 'Gate app',
    navigation: {
      items: [
        { key: 'overview-nav', title: { en: 'Overview', zh: '概览' }, icon: 'Home', linkedPage: 'overview' },
      ],
    },
  },
  pages: {
    overview: {
      title: { en: 'Overview', zh: '概览' },
      components: [{ id: 'overview-copy', type: 'Typography', props: { content: 'Overview content' } }],
    },
  },
} as unknown as GeniAppWorkbenchConfig;

function renderApplication() {
  return render(
    <MemoryRouter initialEntries={['/gate-app/overview']}>
      <GeniAppComponentProvider applicationId="gate-app" locale="en">
        <GeniAppWorkbench identifier="gate-app" name="Gate app" config={config} />
      </GeniAppComponentProvider>
    </MemoryRouter>,
  );
}

/** jsdom is a top-level browsing context; pretend we are inside an iframe. */
function mockEmbeddedIframe() {
  Object.defineProperty(window, 'top', { configurable: true, writable: true, value: {} });
}

function restoreTop() {
  // jsdom's top-level context has window.top === window; restore that shape explicitly
  // (deleting the own property would leave `top` undefined and still read as "iframe").
  Object.defineProperty(window, 'top', { configurable: true, writable: true, value: window });
}

const sidebarNav = () => screen.queryByRole('navigation', { name: 'Application navigation' });

beforeEach(() => {
  mockGet.mockReset();
  mockGet.mockRejectedValue(new Error('offline'));
});

afterEach(() => {
  restoreTop();
  vi.useRealTimers();
});

describe('GeniAppWorkbench Shell-INIT first-paint gate', () => {
  it('renders Loading (not the workbench tree) inside an iframe until the init-applied event lands', async () => {
    mockEmbeddedIframe();
    const { container } = renderApplication();

    // Gate holds: spinner instead of the workbench shell, and no role/data requests yet.
    expect(container.querySelector('.animate-spin')).not.toBeNull();
    expect(sidebarNav()).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();

    await act(async () => {
      window.dispatchEvent(new Event(GENISPACE_SHELL_INIT_APPLIED_EVENT));
    });

    expect(sidebarNav()).not.toBeNull();
    expect(screen.getByText('Overview content')).toBeInTheDocument();
  });

  it('falls back to rendering after the timeout when no Shell INIT arrives', () => {
    vi.useFakeTimers();
    mockEmbeddedIframe();
    const { container } = renderApplication();

    expect(sidebarNav()).toBeNull();
    expect(container.querySelector('.animate-spin')).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(1900);
    });

    expect(sidebarNav()).not.toBeNull();
  });

  it('renders immediately in a non-iframe standalone session', () => {
    renderApplication();

    expect(sidebarNav()).not.toBeNull();
    expect(screen.getByText('Overview content')).toBeInTheDocument();
  });
});
