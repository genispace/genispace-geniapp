import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('@/lib/api/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));
vi.mock('@/app/services/workbenchApi', () => ({
  withDatasourceVersion: (url: string) => url,
}));
vi.mock('@/utils/datasourceVersion', () => ({
  isDatasourceVersionNotFoundError: () => false,
  resolveDatasourceVersion: () => null,
  resolveRuntimeDatasourceVersion: () => null,
  useDatasourceVersions: () => ({}),
}));
vi.mock('@genispace/shared-ui', () => ({ toast: vi.fn() }));
vi.mock('@/locales/i18n', () => ({
  default: { t: (_key: string, fallback?: string) => fallback ?? _key },
}));
vi.mock('@/mobile/utils/workbenchSpaceSyncGate', () => ({
  isWorkbenchSpaceSyncPending: () => false,
  subscribeWorkbenchSpaceSyncGate: () => () => {},
}));

import apiClient from '@/lib/api/apiClient';
import type { DatabaseDataSourceConfig } from '../types/databaseDataSource';
import { useDatabaseDataSource } from './useDatabaseDataSource';

const mockPost = apiClient.post as Mock;

const sizeConfig = {
  datasourceId: 'ds-size-stock',
  parameters: { plu: '', storeIds: '' },
  parameterTypes: { plu: 'string', storeIds: 'array' },
} as unknown as DatabaseDataSourceConfig;

let probeRefetch: ((overrides?: Record<string, unknown>) => Promise<void>) | null = null;

function RowsProbe({ params }: { params: Record<string, unknown> }) {
  const { data, refetch } = useDatabaseDataSource(sizeConfig, 'Table', params, {
    autoFetch: false,
    errorConfig: { showToast: false, retryAttempts: 3, retryDelay: 60, fallbackData: [] },
  });
  probeRefetch = refetch as (overrides?: Record<string, unknown>) => Promise<void>;
  return <div data-testid="rows">{JSON.stringify(data)}</div>;
}

const flush = async (ms = 30) => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
};

beforeEach(() => {
  mockPost.mockReset();
  probeRefetch = null;
});

describe('useDatabaseDataSource abort handling', () => {
  it('does NOT retry a superseded (aborted) request — no stale empty-param replay', async () => {
    // The HTTP layer rethrows fetch aborts as plain Errors ("signal is aborted without
    // reason"), which used to slip past the AbortError/ERR_CANCELED checks and land in the
    // retry branch: the retry replayed the STALE params captured by the superseded call and
    // its empty-param response finished last, freezing national-scope data over the filtered
    // one. The aborted request must be swallowed; only the superseding request may complete.
    mockPost.mockImplementation((url: string, body: Record<string, unknown>, opts?: { signal?: AbortSignal }) => {
      const storeIds = body.storeIds as string[];
      if (storeIds.length === 0) {
        return new Promise((_resolve, reject) => {
          opts?.signal?.addEventListener('abort', () => {
            reject(new Error('signal is aborted without reason'));
          });
        });
      }
      return Promise.resolve({
        success: true,
        data: {
          data: [{ size: '40', stock: 28 }],
          pagination: { total: 1, page: 1, pages: 1, limit: 20 },
        },
      });
    });

    render(<RowsProbe params={{ plu: 'SW6701028_BLK', storeIds: [] }} />);
    await flush();

    // First fetch: empty scope (pre-broadcast), stays in flight.
    await act(async () => {
      void probeRefetch!();
    });
    await flush();
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect((mockPost.mock.calls[0][1] as { storeIds: string[] }).storeIds).toEqual([]);

    // Superseding fetch with the broadcast values: aborts the first one.
    await act(async () => {
      void probeRefetch!({ plu: 'SW6701028_BLK', storeIds: ['R001', 'R002'] });
    });
    // Wait well beyond retryDelay (60ms): a retry of the aborted call would fire here.
    await flush(200);

    expect(mockPost).toHaveBeenCalledTimes(2);
    expect((mockPost.mock.calls[1][1] as { storeIds: string[] }).storeIds).toEqual(['R001', 'R002']);
    expect(screen.getByTestId('rows').textContent).toContain('"stock":28');
  });

  it('still retries a genuine (non-abort) failure', async () => {
    let attempts = 0;
    mockPost.mockImplementation(() => {
      attempts += 1;
      if (attempts < 2) {
        return Promise.reject(new Error('network unreachable'));
      }
      return Promise.resolve({
        success: true,
        data: { data: [{ size: '40', stock: 7 }], pagination: { total: 1, page: 1, pages: 1, limit: 20 } },
      });
    });

    render(<RowsProbe params={{ plu: 'SW6701028_BLK', storeIds: ['R001'] }} />);
    await flush();
    await act(async () => {
      void probeRefetch!();
    });
    await flush(200);

    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('rows').textContent).toContain('"stock":7');
  });
});
