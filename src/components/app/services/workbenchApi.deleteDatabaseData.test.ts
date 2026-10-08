import { afterEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/lib/api/apiClient';
import { configureWorkbenchHostAdapters } from '@/lib/api/hostAdapterBridge';
import type { WorkbenchHostRequest } from '@/lib/api/hostAdapterBridge';
import { deleteDatabaseData } from './workbenchApi';

// deleteDatabaseData used to bypass BaseApiClient.request (the channel that routes through the
// hostRequest adapter — base-URL injection, datasource identifier→UUID translation,
// X-Application-Id version binding) and fired a bare shared-axios DELETE instead. In standalone
// (no __APP_CONFIG__) that instance's base falls back to the hardcoded CLOUD api, the 401
// cascaded through the auth interceptor into a global /sso/login redirect.

describe('deleteDatabaseData transport', () => {
  let unconfigure: (() => void) | undefined;
  afterEach(() => {
    unconfigure?.();
    unconfigure = undefined;
  });

  it('routes the DELETE-with-body through the hostRequest adapter, not bare axios', async () => {
    const requestSpy = vi.fn(async (_req: WorkbenchHostRequest) => ({
      success: true,
      data: { deletedCount: 1 },
    }));
    unconfigure = configureWorkbenchHostAdapters({ request: requestSpy });

    const res = await deleteDatabaseData('ds-identifier', {
      workbenchId: 'wb-1',
      componentId: 'comp-1',
      fieldKey: 'store',
      inputValue: '北京SKP',
    });

    expect(requestSpy).toHaveBeenCalledTimes(1);
    const req = requestSpy.mock.calls[0][0];
    expect(req.method).toBe('DELETE');
    expect(req.url).toBe('/datasources/ds-identifier/data');
    expect(req.body).toEqual({
      workbenchId: 'wb-1',
      componentId: 'comp-1',
      fieldKey: 'store',
      inputValue: '北京SKP',
    });
    expect(res.success).toBe(true);
    expect(res.data?.deletedCount).toBe(1);
  });
});

describe('apiClient.withoutAuth()', () => {
  it('hands out a client on a DEDICATED instance with no auth response interceptors (no global 401 → login redirect)', () => {
    const authInstance = apiClient.getInstance();
    const noAuthInstance = apiClient.withoutAuth().getInstance();

    // The old implementation returned the SHARED baseAxiosInstance, which AuthApiClient had
    // already wired with 401 → refresh → /sso/login interceptors — "withoutAuth" in name only.
    expect(noAuthInstance).not.toBe(authInstance);

    const responseHandlerCount = (instance: typeof authInstance) =>
      ((instance.interceptors.response as unknown as { handlers: unknown[] }).handlers ?? [])
        .filter(Boolean).length;
    expect(responseHandlerCount(noAuthInstance)).toBe(0);
    expect(responseHandlerCount(authInstance)).toBeGreaterThan(0);
  });
});
