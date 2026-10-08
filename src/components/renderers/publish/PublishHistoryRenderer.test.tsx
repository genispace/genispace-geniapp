import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('@/lib/api/apiClient', () => ({
  default: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}));

import apiClient from '@/lib/api/apiClient';
import { GeniAppComponentProvider } from '../../runtime/GeniAppComponentProvider';
import PublishHistoryRenderer from './PublishHistoryRenderer';

const mockGet = apiClient.get as Mock;

const APP_UUID = '55555555-6666-4777-8888-999999999999';

const publishedNotesResponse = {
  data: {
    items: [
      {
        version: '3',
        releaseNotes: {
          en: ['Improved filters', { text: 'Faster sync' }],
          zh: ['筛选优化', { text: '同步提速' }],
        },
        publishedAt: '2026-09-20T08:00:00.000Z',
        publishedByName: 'Alice',
      },
      {
        version: '2',
        releaseNotes: null,
        publishedAt: '2026-09-10T08:00:00.000Z',
        publishedByName: 'Bob',
      },
    ],
    total: 2,
  },
};

function renderHistory(locale: string) {
  return render(
    <MemoryRouter initialEntries={['/history-app/publish']}>
      <GeniAppComponentProvider applicationId={APP_UUID} locale={locale}>
        <Routes>
          <Route path="/:workbenchId/:pageId" element={<PublishHistoryRenderer />} />
        </Routes>
      </GeniAppComponentProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockGet.mockReset();
  mockGet.mockImplementation((url: string) => {
    if (url === `/applications/${APP_UUID}/releases/published-notes`) {
      return Promise.resolve(publishedNotesResponse);
    }
    return Promise.reject(new Error(`unexpected ${url}`));
  });
});

describe('PublishHistoryRenderer (GeniApp export context)', () => {
  it('pages published release notes by application id and renders zh notes under a zh locale', async () => {
    renderHistory('zh');

    expect(await screen.findByText(/筛选优化/)).toBeInTheDocument();
    expect(screen.getByText(/筛选优化/).textContent).toContain('同步提速');
    expect(screen.getByText('v3')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    // releaseNotes: null maps to an empty description, but the entry still renders.
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();

    expect(mockGet).toHaveBeenCalledWith(
      `/applications/${APP_UUID}/releases/published-notes`,
      { limit: 10, offset: 0 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(
      mockGet.mock.calls.some(([url]) => String(url).includes('publish-history')),
    ).toBe(false);
  });

  it('renders en notes under an en locale', async () => {
    renderHistory('en');

    expect(await screen.findByText(/Improved filters/)).toBeInTheDocument();
    expect(screen.getByText(/Improved filters/).textContent).toContain('Faster sync');
    expect(screen.queryByText('筛选优化')).not.toBeInTheDocument();
  });

  it('keeps load-more pagination semantics on the application endpoint', async () => {
    mockGet.mockImplementation((url: string, params?: { offset?: number }) => {
      if (url !== `/applications/${APP_UUID}/releases/published-notes`) {
        return Promise.reject(new Error(`unexpected ${url}`));
      }
      if ((params?.offset ?? 0) > 0) {
        return Promise.resolve({
          data: {
            items: [
              {
                version: '1',
                releaseNotes: { en: 'Initial release' },
                publishedAt: '2026-09-01T08:00:00.000Z',
                publishedByName: 'Carol',
              },
            ],
            total: 3,
          },
        });
      }
      return Promise.resolve({
        data: { ...publishedNotesResponse.data, total: 3 },
      });
    });
    renderHistory('en');

    const loadMore = await screen.findByRole('button', { name: 'Load more' });
    loadMore.click();

    expect(await screen.findByText('Initial release')).toBeInTheDocument();
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith(
        `/applications/${APP_UUID}/releases/published-notes`,
        { limit: 10, offset: 2 },
        expect.anything(),
      ),
    );
  });
});
