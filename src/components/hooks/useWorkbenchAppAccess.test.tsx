import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('@/lib/api/apiClient', () => ({
  default: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}));

import apiClient from '@/lib/api/apiClient';
import { useWorkbenchAppAccess } from './useWorkbenchAppAccess';
import { GeniAppHostProvider } from '../runtime/GeniAppHostContext';

const mockGet = apiClient.get as Mock;

function AccessProbe() {
  const { roles, applicationId, loading } = useWorkbenchAppAccess();
  return (
    <div data-testid="access">
      {JSON.stringify({ roles, applicationId: applicationId ?? null, loading })}
    </div>
  );
}

function readProbe() {
  return JSON.parse(screen.getByTestId('access').textContent ?? '{}') as {
    roles: string[];
    applicationId: string | null;
    loading: boolean;
  };
}

beforeEach(() => {
  mockGet.mockReset();
});

describe('useWorkbenchAppAccess / useResolvedApplicationId', () => {
  it('resolves a host application identifier via my-installations and loads app roles', async () => {
    const APP_UUID = '11111111-2222-4333-8444-555555555555';
    mockGet.mockImplementation((url: string) => {
      if (url === '/applications/my-installations') {
        return Promise.resolve({
          data: { items: [{ id: APP_UUID, identifier: 'host-app-alpha' }] },
        });
      }
      if (url === `/applications/${APP_UUID}/users/me/access`) {
        return Promise.resolve({
          data: { isUser: true, roles: [{ code: 'manager' }], permissionCodes: [] },
        });
      }
      return Promise.reject(new Error(`unexpected ${url}`));
    });

    render(
      <MemoryRouter>
        <GeniAppHostProvider applicationId="host-app-alpha">
          <AccessProbe />
        </GeniAppHostProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(readProbe().roles).toEqual(['manager']));
    expect(readProbe().applicationId).toBe(APP_UUID);
    expect(mockGet).toHaveBeenCalledWith('/applications/my-installations', { limit: 100 });
    expect(mockGet).toHaveBeenCalledWith(`/applications/${APP_UUID}/users/me/access`);
    expect(
      mockGet.mock.calls.some(([url]) => String(url).startsWith('/workbenches/')),
    ).toBe(false);
  });

  it('uses a UUID host applicationId directly without my-installations', async () => {
    const APP_UUID = '22222222-3333-4444-8555-666666666666';
    mockGet.mockImplementation((url: string) => {
      if (url === `/applications/${APP_UUID}/users/me/access`) {
        return Promise.resolve({
          data: { isUser: true, roles: [{ code: 'viewer' }], permissionCodes: [] },
        });
      }
      return Promise.reject(new Error(`unexpected ${url}`));
    });

    render(
      <MemoryRouter>
        <GeniAppHostProvider applicationId={APP_UUID}>
          <AccessProbe />
        </GeniAppHostProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(readProbe().roles).toEqual(['viewer']));
    expect(mockGet).not.toHaveBeenCalledWith(
      '/applications/my-installations',
      expect.anything(),
    );
  });

  it('does not request /workbenches/:id when the route param is an identifier, not a UUID', async () => {
    render(
      <MemoryRouter initialEntries={['/identifier-not-uuid/overview']}>
        <Routes>
          <Route path="/:workbenchId/:pageId" element={<AccessProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByTestId('access');
    // Let all resolution effects settle before asserting no request went out.
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(mockGet).not.toHaveBeenCalled();
    expect(readProbe().applicationId).toBeNull();
  });

  it('still resolves the applicationId from a UUID workbench route param', async () => {
    const WB_UUID = '33333333-4444-4555-8666-777777777777';
    const APP_UUID = '44444444-5555-4666-8777-888888888888';
    mockGet.mockImplementation((url: string) => {
      if (url === `/workbenches/${WB_UUID}`) {
        return Promise.resolve({ data: { applicationId: APP_UUID } });
      }
      if (url === `/applications/${APP_UUID}/users/me/access`) {
        return Promise.resolve({
          data: { isUser: true, roles: [{ code: 'analyst' }], permissionCodes: [] },
        });
      }
      return Promise.reject(new Error(`unexpected ${url}`));
    });

    render(
      <MemoryRouter initialEntries={[`/workbench/${WB_UUID}`]}>
        <Routes>
          <Route path="/workbench/:workbenchId" element={<AccessProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(readProbe().roles).toEqual(['analyst']));
    expect(mockGet).toHaveBeenCalledWith(`/workbenches/${WB_UUID}`);
  });
});
