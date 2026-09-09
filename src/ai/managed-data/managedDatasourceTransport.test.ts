import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryManagedDatasourceRows } from './queryManagedDatasource';
import { executeManagedDatasourceOperation } from './executeManagedDatasource';
import { managedDatasourceTransport } from './managedDatasourceTransport';

afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); localStorage.clear(); });
function setup() {
  sessionStorage.setItem('__genispace_shell_application_id__', 'app');
  sessionStorage.setItem('__genispace_shell_application_identifier__', 'orders');
  sessionStorage.setItem('__genispace_shell_release_channel__', 'stable');
  const calls = vi.fn(async (url: string, init: RequestInit) => {
    const query = new URL(url);
    const data = url.includes('/runtime-resources/resolve?') ? { resourceId: 'physical' }
      : init.method === 'POST' ? { affectedRows: 1 }
      : { data: Array.from({ length: 3 }, (_, i) => ({ id: Number(query.searchParams.get('offset') || 0) + i })), metadata: {} };
    return new Response(JSON.stringify({ success: true, data }), { status: 200 });
  });
  vi.stubGlobal('fetch', calls);
  return calls;
}
describe('managed datasource version binding', () => {
  it('uses the binding for both pagination windows and retains explicit source versions', async () => {
    const calls = setup();
    const rows = await queryManagedDatasourceRows('https://api.example', 'synthetic-token', 'orders', 'orders_read', { limit: 3, offset: 2, version: 2 });
    expect(rows).toEqual([{ id: 2 }, { id: 3 }, { id: 4 }]);
    const executions = calls.mock.calls.filter(([url]) => url.includes('/datasources/physical/'));
    expect(executions).toHaveLength(2);
    for (const [url, init] of executions) {
      expect(new URL(url).searchParams.get('version')).toBe('2');
      expect((init.headers as Headers).get('X-GeniApp-Resource-Identifier')).toBe('orders_read');
      expect((init.headers as Headers).get('X-GeniApp-Release-Channel')).toBe('stable');
    }
  });
  it('binds writes and preserves the operation body without copying a physical revision from the resolver', async () => {
    const calls = setup();
    expect(await executeManagedDatasourceOperation('https://api.example', 'synthetic-token', 'orders', 'orders_write', { id: 1, version: 2 })).toEqual({ affectedRows: 1 });
    const [, request] = calls.mock.calls[1];
    expect(JSON.parse(String(request.body))).toEqual({ id: 1, version: 2 });
    expect((request.headers as Headers).get('X-Application-Id')).toBe('app');
  });
  it('does not reinterpret cross-app or standalone requests as current-application resources', () => {
    expect(managedDatasourceTransport('https://api.example', 'token', 'orders', 'read')).toBeNull();
    setup();
    expect(managedDatasourceTransport('https://api.example', 'token', 'partners', 'read')).toBeNull();
  });
});
