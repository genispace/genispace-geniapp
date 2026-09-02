import { createResolveApiRoot } from '../../hooks/shell/resolveApiRoot';
import type {
  GeniAppHostAdapters,
  GeniAppHostRequest,
  GeniAppHostResponse,
} from '../types/host-adapters';

export interface CreatePlatformHostAdaptersOptions {
  apiRoot?: string | (() => string);
  tokenStorageKey?: string;
  languageStorageKey?: string;
  applicationIdentifier?: string;
  /** Source datasource UUID -> installed managed datasource identifier. */
  datasourceIdentifiers?: Record<string, string>;
}

const isAbsoluteUrl = (value: string) => /^https?:\/\//iu.test(value);

function joinApiUrl(root: string, path: string): string {
  if (isAbsoluteUrl(path)) return path;
  const normalizedRoot = root.replace(/\/$/u, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedRoot}${normalizedPath}`;
}

function appendParams(url: string, params?: Record<string, unknown>): string {
  if (!params || Object.keys(params).length === 0) return url;
  const parsed = new URL(url, typeof window === 'undefined' ? 'http://localhost' : window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    parsed.searchParams.append(key, String(value));
  });
  return isAbsoluteUrl(url) ? parsed.toString() : `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function readStorage(storage: Storage | undefined, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function responseError(
  response: Response,
  payload: unknown,
): Error & { code: number; response: { status: number; data: unknown } } {
  const record = payload && typeof payload === 'object' ? payload as Record<string, unknown> : undefined;
  const message = typeof record?.message === 'string'
    ? record.message
    : typeof payload === 'string' && payload.trim()
      ? payload
      : response.statusText || `HTTP ${response.status}`;
  return Object.assign(new Error(message), {
    code: response.status,
    response: { status: response.status, data: payload },
  });
}

/**
 * Default browser adapter for an installed GeniApp. It consumes the API root and
 * access token injected by the platform shell and keeps renderer transport out of
 * the generated application's source tree.
 */
export function createPlatformHostAdapters(
  options: CreatePlatformHostAdaptersOptions = {},
): GeniAppHostAdapters {
  const resolveDefaultRoot = createResolveApiRoot();
  const configuredRoot = options.apiRoot;
  const resolveRoot = typeof configuredRoot === 'function'
    ? configuredRoot
    : () => configuredRoot?.trim() || resolveDefaultRoot();
  const tokenStorageKey = options.tokenStorageKey ?? 'token';
  const languageStorageKey = options.languageStorageKey ?? 'i18nextLng';
  const resolvedDatasourceIds = new Map<string, Promise<string>>();

  const resolveDatasourceUrl = async (
    rawUrl: string,
    headers: Headers,
  ): Promise<string> => {
    const match = rawUrl.match(/\/datasources\/([^/?#]+)(?=\/|\?|#|$)/u);
    if (!match || !options.applicationIdentifier) return rawUrl;
    const sourceId = decodeURIComponent(match[1]);
    const datasourceIdentifier = options.datasourceIdentifiers?.[sourceId];
    if (!datasourceIdentifier) return rawUrl;

    let resolution = resolvedDatasourceIds.get(sourceId);
    if (!resolution) {
      resolution = (async () => {
        const params = new URLSearchParams({
          applicationIdentifier: options.applicationIdentifier || '',
          datasourceIdentifier,
        });
        const response = await fetch(
          joinApiUrl(resolveRoot(), `/datasources/managed/resolve?${params}`),
          { headers, credentials: 'same-origin' },
        );
        const payload = await response.json() as {
          data?: { datasourceId?: string };
          message?: string;
        };
        const datasourceId = payload.data?.datasourceId;
        if (!response.ok || !datasourceId) throw responseError(response, payload);
        return datasourceId;
      })();
      resolvedDatasourceIds.set(sourceId, resolution);
    }

    try {
      const datasourceId = await resolution;
      return rawUrl.replace(match[1], encodeURIComponent(datasourceId));
    } catch (error) {
      resolvedDatasourceIds.delete(sourceId);
      throw error;
    }
  };

  const request = async <T = unknown>({
    url,
    method,
    body,
    params,
    headers: suppliedHeaders,
    responseType = 'json',
    signal,
  }: GeniAppHostRequest): Promise<GeniAppHostResponse<T>> => {
    const headers = new Headers(suppliedHeaders);
    const token = typeof localStorage === 'undefined'
      ? null
      : readStorage(localStorage, tokenStorageKey);
    const language = typeof localStorage === 'undefined'
      ? null
      : readStorage(localStorage, languageStorageKey);

    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    if (language && !headers.has('X-Language')) headers.set('X-Language', language);
    const resolvedUrl = await resolveDatasourceUrl(url, headers);
    const finalUrl = appendParams(joinApiUrl(resolveRoot(), resolvedUrl), params);

    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    if (body !== undefined && !isFormData && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (isFormData) headers.delete('Content-Type');

    const response = await fetch(finalUrl, {
      method,
      headers,
      signal,
      credentials: 'same-origin',
      body: body === undefined
        ? undefined
        : isFormData || typeof body === 'string' || body instanceof Blob
          ? body as BodyInit
          : JSON.stringify(body),
    });

    let payload: unknown;
    if (responseType === 'blob') {
      payload = await response.blob();
    } else if (responseType === 'text') {
      payload = await response.text();
    } else {
      const text = await response.text();
      try {
        payload = text ? JSON.parse(text) : undefined;
      } catch {
        payload = text;
      }
    }

    if (!response.ok) throw responseError(response, payload);

    if (payload && typeof payload === 'object' && 'success' in payload) {
      return payload as GeniAppHostResponse<T>;
    }

    return {
      success: true,
      data: payload as T,
      code: response.status,
      message: response.statusText || 'Success',
      timestamp: new Date().toISOString(),
    };
  };

  return {
    request,
    navigate(path, navigationOptions) {
      if (navigationOptions?.replace) window.history.replaceState(navigationOptions.state, '', path);
      else window.history.pushState(navigationOptions?.state, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    },
    storage: typeof localStorage === 'undefined' ? undefined : localStorage,
  };
}
