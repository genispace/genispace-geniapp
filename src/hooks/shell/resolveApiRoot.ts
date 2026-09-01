import { GENISPACE_SHELL_SESSION_API_KEY } from './shell';

export type CreateResolveApiRootOptions = {
  /** e.g. import.meta.env.VITE_HR_API_BASE */
  dedicatedEnv?: string | undefined;
  platformEnv?: string | undefined;
};

/** Platform API root (`…/api`) for GeniApp iframe + standalone dev. */
export function createResolveApiRoot(options: CreateResolveApiRootOptions = {}): () => string {
  return () => {
    const dedicated = options.dedicatedEnv;
    if (typeof dedicated === 'string' && dedicated.trim() !== '') {
      return dedicated.replace(/\/$/, '');
    }
    const platform = options.platformEnv;
    if (typeof platform === 'string' && platform.trim() !== '') {
      return platform.replace(/\/$/, '');
    }
    try {
      if (typeof sessionStorage !== 'undefined') {
        const injected = sessionStorage.getItem(GENISPACE_SHELL_SESSION_API_KEY);
        if (injected && injected.trim() !== '') {
          const u = new URL(injected, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
          return `${u.origin}/api`;
        }
      }
    } catch {
      /* ignore */
    }
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api`;
    }
    return '';
  };
}

/** Cross–dataScope table CRUD (read/patch). Documented integration exception only. */
export function createScopeTableClient(buildApiRoot: () => string) {
  function readToken(): string | null {
    try {
      return localStorage.getItem('token');
    } catch {
      return null;
    }
  }

  function authHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = readToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  function tableUrl(scope: string, table: string, id?: string): string {
    const root = buildApiRoot();
    const base = `${root}/data/${encodeURIComponent(scope)}/tables/${encodeURIComponent(table)}`;
    return id ? `${base}/${encodeURIComponent(id)}` : base;
  }

  async function scopeGet<T>(scope: string, table: string, id: string): Promise<T> {
    const res = await fetch(tableUrl(scope, table, id), { headers: authHeaders() });
    const text = await res.text();
    if (!res.ok) throw new Error(text || res.statusText);
    const body = text ? JSON.parse(text) : {};
    return ((body as { data?: T }).data ?? body) as T;
  }

  async function scopeList<T>(
    scope: string,
    table: string,
    filter?: Record<string, string | boolean | number | null>
  ): Promise<T[]> {
    const params = new URLSearchParams();
    if (filter) params.set('filter', JSON.stringify(filter));
    const res = await fetch(`${tableUrl(scope, table)}?${params}`, { headers: authHeaders() });
    const text = await res.text();
    if (!res.ok) throw new Error(text || res.statusText);
    const body = text ? JSON.parse(text) : {};
    const data = (body as { data?: { items?: T[] } | T[] }).data;
    if (Array.isArray(data)) return data;
    return data?.items ?? [];
  }

  async function scopePatch(
    scope: string,
    table: string,
    id: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const res = await fetch(tableUrl(scope, table, id), {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText);
    }
  }

  return { scopeGet, scopeList, scopePatch };
}
