import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('@/lib/api/apiClient', () => ({
  default: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}));

import apiClient from '@/lib/api/apiClient';
import { GeniAppComponentProvider } from './GeniAppComponentProvider';
import { GeniAppWorkbench, type GeniAppWorkbenchConfig } from './GeniAppWorkbench';

const mockGet = apiClient.get as Mock;
const mockPut = apiClient.put as Mock;

const APP_UUID = '66666666-7777-4888-8999-000000000000';

const config = {
  appConfig: {
    appId: 'notes-app',
    name: 'Notes app',
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

function renderApplication(locale = 'zh') {
  return render(
    <MemoryRouter initialEntries={['/notes-app/overview']}>
      <GeniAppComponentProvider applicationId={APP_UUID} locale={locale}>
        <GeniAppWorkbench identifier="notes-app" name="Notes app" config={config} />
      </GeniAppComponentProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockGet.mockReset();
  mockPut.mockReset();
  mockPut.mockResolvedValue({ data: null });
});

describe('GeniAppWorkbench release notes prompt', () => {
  it('shows the latest published note and posts the read receipt on acknowledge', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === `/applications/${APP_UUID}/releases/latest-published-note`) {
        return Promise.resolve({
          data: {
            applicationId: APP_UUID,
            version: '7',
            releaseNotes: { en: ['New dashboard'], zh: ['新看板'] },
            publishedAt: '2026-09-21T08:00:00.000Z',
          },
        });
      }
      return Promise.reject(new Error(`unexpected ${url}`));
    });

    renderApplication('zh');

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('应用已更新')).toBeInTheDocument();
    expect(screen.getByText('新看板')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '知道了' }));

    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith(`/applications/${APP_UUID}/releases/7/receipt`),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('follows the current locale for the note body', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === `/applications/${APP_UUID}/releases/latest-published-note`) {
        return Promise.resolve({
          data: {
            applicationId: APP_UUID,
            version: '8',
            releaseNotes: { en: ['New dashboard'], zh: ['新看板'] },
            publishedAt: '2026-09-21T08:00:00.000Z',
          },
        });
      }
      return Promise.reject(new Error(`unexpected ${url}`));
    });

    renderApplication('en');

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Application updated')).toBeInTheDocument();
    expect(screen.getByText('New dashboard')).toBeInTheDocument();
  });

  it('stays silent when there is no unread note and when the request fails', async () => {
    mockGet.mockResolvedValue({ data: null });
    const { unmount } = renderApplication('en');
    await screen.findByText('Overview content');
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    unmount();

    mockGet.mockRejectedValue(new Error('forbidden'));
    renderApplication('en');
    await screen.findAllByText('Overview content');
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
