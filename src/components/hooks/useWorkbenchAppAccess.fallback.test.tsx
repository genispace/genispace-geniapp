import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('@/lib/api/apiClient', () => ({
  default: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}));

import apiClient from '@/lib/api/apiClient';
import { GeniAppComponentProvider } from '../runtime/GeniAppComponentProvider';
import { GeniAppWorkbench, type GeniAppWorkbenchConfig } from '../runtime/GeniAppWorkbench';

const mockGet = apiClient.get as Mock;
const mockFetch = vi.fn();

// Distinct identifiers per test: hostAppIdCache/accessCache are module-wide.
const APPS = {
  fallback: { identifier: 'fallback-app', instanceId: 'aaaaaaaa-1111-4222-8333-444444444444' },
  business404: { identifier: 'business-404-app', instanceId: 'bbbbbbbb-1111-4222-8333-444444444444' },
  noToken: { identifier: 'no-token-app', instanceId: 'cccccccc-1111-4222-8333-444444444444' },
};

const ISSUER = 'https://api.genispace.test';

const makeToken = (payload: Record<string, unknown>) =>
  `header.${btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.sig`;

const infra404 = () => ({ response: { status: 404, data: 'API route not found' } });
const business404 = () => ({
  response: { status: 404, data: { success: false, message: '未找到可管理的应用' } },
});

const fallbackConfig = {
  appConfig: {
    appId: 'fallback-app-config',
    name: 'Fallback app',
    defaultOpenType: 'navigation',
    defaultNavigationKey: 'plain-nav',
    navigation: {
      items: [
        {
          key: 'role-nav',
          title: { en: 'Role', zh: '角色页' },
          icon: 'Home',
          linkedPage: 'role',
          visibleWhen: {
            rules: [{ source: 'role', field: 'app', op: 'in', value: ['hq_admin'] }],
          },
        },
        { key: 'plain-nav', title: { en: 'Plain', zh: '普通页' }, icon: 'List', linkedPage: 'plain' },
      ],
    },
  },
  pages: {
    role: { title: { en: 'Role', zh: '角色页' }, components: [] },
    plain: { title: { en: 'Plain', zh: '普通页' }, components: [] },
  },
} as unknown as GeniAppWorkbenchConfig;

function renderApp(config: GeniAppWorkbenchConfig, applicationId: string) {
  return render(
    <MemoryRouter initialEntries={['/fallback-app/plain']}>
      <GeniAppComponentProvider applicationId={applicationId} locale="zh">
        <GeniAppWorkbench
          identifier="fallback-app-config"
          config={config}
          renderPage={() => <output data-testid="page">page</output>}
        />
      </GeniAppComponentProvider>
    </MemoryRouter>
  );
}

function stubFetchFor(app: { identifier: string; instanceId: string }, roles: string[]) {
  mockFetch.mockImplementation(async (url: string) => {
    if (url.startsWith(`${ISSUER}/api/applications/my-installations`)) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { items: [{ id: app.instanceId, identifier: app.identifier }] },
        }),
      };
    }
    if (url === `${ISSUER}/api/applications/${app.instanceId}/users/me/access`) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { isUser: true, roles: roles.map((code) => ({ code })), permissionCodes: [] },
        }),
      };
    }
    throw new Error(`unexpected fallback url ${url}`);
  });
}

beforeEach(() => {
  mockGet.mockReset();
  mockFetch.mockReset();
  localStorage.setItem('i18nextLng', 'zh');
  localStorage.setItem('token', makeToken({ iss: ISSUER, sub: 'user-1' }));
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('useWorkbenchAppAccess platform-api fallback (dedicated-instance domains)', () => {
  it('resolves the instance id and app roles via the token issuer when same-origin platform routes 404', async () => {
    mockGet.mockRejectedValue(infra404());
    stubFetchFor(APPS.fallback, ['hq_admin']);
    renderApp(fallbackConfig, APPS.fallback.identifier);

    // Role-gated tab appears only after my-installations + /me/access both round-trip
    // through the issuer fallback.
    expect(await screen.findByRole('button', { name: '角色页' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '普通页' })).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith(
      `${ISSUER}/api/applications/my-installations?limit=100`,
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Bearer /) }) })
    );
    expect(mockFetch).toHaveBeenCalledWith(
      `${ISSUER}/api/applications/${APPS.fallback.instanceId}/users/me/access`,
      expect.anything()
    );
  });

  it('does not hit the issuer on a platform business 404 (JSON body) and keeps role tabs hidden', async () => {
    mockGet.mockRejectedValue(business404());
    stubFetchFor(APPS.business404, ['hq_admin']);
    renderApp(fallbackConfig, APPS.business404.identifier);

    expect(await screen.findByRole('button', { name: '普通页' })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('button', { name: '角色页' })).not.toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('stays silent when no token/issuer is available', async () => {
    localStorage.removeItem('token');
    mockGet.mockRejectedValue(infra404());
    renderApp(fallbackConfig, APPS.noToken.identifier);

    expect(await screen.findByRole('button', { name: '普通页' })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('button', { name: '角色页' })).not.toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
