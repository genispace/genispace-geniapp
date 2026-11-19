export type SandboxCsp = Partial<Record<'connectDomains' | 'resourceDomains' | 'frameDomains' | 'baseUriDomains', string[]>>;
/** No platform authentication, business result or HTML is sent to the proxy service. */
export function webMcpAppSandbox(baseUrl: string) {
  const base = new URL(baseUrl, window.location.href);
  if (!['http:', 'https:'].includes(base.protocol) || base.origin === location.origin || base.username || base.password) throw new Error('Independent App sandbox required');
  const request = async (url: URL, init: RequestInit, timeout = 15000) => {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout);
    try { return await fetch(url, { ...init, signal: controller.signal, credentials: 'omit', redirect: 'error' }); }
    finally { clearTimeout(timer); }
  };
  return async (resource: { csp: SandboxCsp }) => {
    const response = await request(new URL('/sandboxes', base), { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csp: resource.csp }) });
    if (!response.ok) throw new Error('App sandbox unavailable');
    const result: { id?: string; path?: string } = await response.json();
    if (!result.id || !/^[a-f0-9-]{36}$/.test(result.id) || result.path !== `/${result.id}/sandbox.html`) throw new Error('Invalid App sandbox');
    const url = new URL(result.path, base);
    return { url: url.href, release: async () => { await request(url, { method: 'DELETE' }, 2000).catch(() => {}); } };
  };
}
