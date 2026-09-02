import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPlatformHostAdapters } from './platform';

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
});

describe('createPlatformHostAdapters', () => {
  it('resolves exported datasource identifiers once and forwards shell credentials', async () => {
    localStorage.setItem('token', 'acceptance-token');
    localStorage.setItem('i18nextLng', 'zh');

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/datasources/managed/resolve?')) {
        return new Response(JSON.stringify({ data: { datasourceId: 'installed-datasource-id' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true, data: { url, method: init?.method } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const adapters = createPlatformHostAdapters({
      apiRoot: 'https://platform.example/api',
      applicationIdentifier: 'acceptance-app',
      datasourceIdentifiers: { 'source-datasource-id': 'acceptance-app-main' },
    });

    await adapters.request?.({
      url: '/datasources/source-datasource-id/query',
      method: 'POST',
      body: { sql: 'select 1' },
    });
    await adapters.request?.({
      url: '/datasources/source-datasource-id/schema',
      method: 'GET',
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      '/datasources/managed/resolve?applicationIdentifier=acceptance-app&datasourceIdentifier=acceptance-app-main',
    );
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
      'https://platform.example/api/datasources/installed-datasource-id/query',
    );
    expect(String(fetchMock.mock.calls[2]?.[0])).toBe(
      'https://platform.example/api/datasources/installed-datasource-id/schema',
    );

    const resolveHeaders = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    const requestHeaders = fetchMock.mock.calls[1]?.[1]?.headers as Headers;
    expect(resolveHeaders.get('Authorization')).toBe('Bearer acceptance-token');
    expect(resolveHeaders.get('X-Language')).toBe('zh');
    expect(requestHeaders.get('Authorization')).toBe('Bearer acceptance-token');
    expect(requestHeaders.get('Content-Type')).toBe('application/json');
  });

  it('resolves portable task references through the installed application version', async () => {
    sessionStorage.setItem('__genispace_shell_application_id__', 'application-1');
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/applications/runtime-resources/resolve?')) {
        return new Response(JSON.stringify({ data: { resourceId: 'physical-task-id' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true, data: { body: init?.body } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const adapters = createPlatformHostAdapters({
      apiRoot: 'https://platform.example/api',
      applicationIdentifier: 'portable-app',
      resourceIdentifiers: {
        task: { portable_task: 'portable_task' },
      },
    });
    await adapters.request?.({
      url: '/tasks/portable_task/execute',
      method: 'POST',
      body: { taskId: 'portable_task' },
    });

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      'applicationId=application-1&applicationIdentifier=portable-app&resourceType=task&logicalIdentifier=portable_task',
    );
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
      'https://platform.example/api/tasks/physical-task-id/execute',
    );
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ taskId: 'physical-task-id' });
  });
});
