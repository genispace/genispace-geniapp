import { createResolveApiRoot } from '../../hooks/shell/resolveApiRoot';
import { GENISPACE_SHELL_SESSION_APPLICATION_ID_KEY } from '../../hooks/shell/shell';
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
  /** Source or portable logical id -> installed logical id, grouped by resource type. */
  resourceIdentifiers?: Partial<Record<PlatformResourceType, Record<string, string>>>;
}

export type PlatformResourceType =
  | 'datasource'
  | 'dataset'
  | 'agent'
  | 'task'
  | 'workflow'
  | 'operator'
  | 'knowledge_base'
  | 'skill';

const RESOURCE_URL_PATTERNS: Array<{ type: PlatformResourceType; pattern: RegExp }> = [
  { type: 'datasource', pattern: /\/datasources\/([^/?#]+)(?=\/|\?|#|$)/u },
  { type: 'dataset', pattern: /\/datasets\/([^/?#]+)(?=\/|\?|#|$)/u },
  { type: 'task', pattern: /\/tasks\/([^/?#]+)(?=\/|\?|#|$)/u },
  { type: 'agent', pattern: /\/agents\/([^/?#]+)(?=\/|\?|#|$)/u },
  { type: 'workflow', pattern: /\/workflows\/([^/?#]+)(?=\/|\?|#|$)/u },
  { type: 'operator', pattern: /\/(?:operators|user-operators)\/([^/?#]+)(?=\/|\?|#|$)/u },
];

const RESOURCE_FIELD_TYPES: Record<string, PlatformResourceType> = {
  datasourceId: 'datasource',
  datasetId: 'dataset',
  agentId: 'agent',
  userAgentId: 'agent',
  taskId: 'task',
  workflowId: 'workflow',
  operatorId: 'operator',
  knowledgeBaseId: 'knowledge_base',
  skillId: 'skill',
};

const RESOURCE_LIST_FIELD_TYPES: Record<string, PlatformResourceType> = {
  datasourceIds: 'datasource',
  datasetIds: 'dataset',
  agentIds: 'agent',
  userAgentIds: 'agent',
  taskIds: 'task',
  workflowIds: 'workflow',
  operatorIds: 'operator',
  knowledgeBaseIds: 'knowledge_base',
  skillIds: 'skill',
};

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
  const resolvedResourceIds = new Map<string, Promise<string>>();
  const resourceIdentifiers: CreatePlatformHostAdaptersOptions['resourceIdentifiers'] = {
    ...options.resourceIdentifiers,
    datasource: {
      ...(options.datasourceIdentifiers || {}),
      ...(options.resourceIdentifiers?.datasource || {}),
    },
  };

  const readApplicationId = () => {
    try {
      return typeof sessionStorage === 'undefined'
        ? null
        : sessionStorage.getItem(GENISPACE_SHELL_SESSION_APPLICATION_ID_KEY);
    } catch {
      return null;
    }
  };

  const resolveResourceId = async (
    type: PlatformResourceType,
    sourceId: string,
    headers: Headers,
  ): Promise<string> => {
    const logicalIdentifier = resourceIdentifiers?.[type]?.[sourceId];
    if (!logicalIdentifier || !options.applicationIdentifier) return sourceId;
    const cacheKey = `${type}:${sourceId}`;
    let resolution = resolvedResourceIds.get(cacheKey);
    if (!resolution) {
      resolution = (async () => {
        const applicationId = readApplicationId();
        if (!applicationId && type === 'datasource') {
          const params = new URLSearchParams({
            applicationIdentifier: options.applicationIdentifier || '',
            datasourceIdentifier: logicalIdentifier,
          });
          const response = await fetch(
            joinApiUrl(resolveRoot(), `/datasources/managed/resolve?${params}`),
            { headers, credentials: 'same-origin' },
          );
          const payload = await response.json() as { data?: { datasourceId?: string }; message?: string };
          const datasourceId = payload.data?.datasourceId;
          if (!response.ok || !datasourceId) throw responseError(response, payload);
          return datasourceId;
        }
        if (!applicationId) return sourceId;
        const params = new URLSearchParams({
          applicationId,
          applicationIdentifier: options.applicationIdentifier || '',
          resourceType: type,
          logicalIdentifier,
        });
        const response = await fetch(
          joinApiUrl(resolveRoot(), `/applications/runtime-resources/resolve?${params}`),
          { headers, credentials: 'same-origin' },
        );
        const payload = await response.json() as { data?: { resourceId?: string }; message?: string };
        const resourceId = payload.data?.resourceId;
        if (!response.ok || !resourceId) throw responseError(response, payload);
        return resourceId;
      })();
      resolvedResourceIds.set(cacheKey, resolution);
    }
    try {
      return await resolution;
    } catch (error) {
      resolvedResourceIds.delete(cacheKey);
      throw error;
    }
  };

  const resolveResourceUrl = async (
    rawUrl: string,
    headers: Headers,
  ): Promise<string> => {
    for (const candidate of RESOURCE_URL_PATTERNS) {
      const match = rawUrl.match(candidate.pattern);
      if (!match) continue;
      const sourceId = decodeURIComponent(match[1]);
      if (!resourceIdentifiers?.[candidate.type]?.[sourceId]) return rawUrl;
      const resourceId = await resolveResourceId(candidate.type, sourceId, headers);
      return rawUrl.replace(match[1], encodeURIComponent(resourceId));
    }
    return rawUrl;
  };

  const resolveBodyReferences = async (value: unknown, headers: Headers): Promise<unknown> => {
    if (Array.isArray(value)) return Promise.all(value.map((item) => resolveBodyReferences(item, headers)));
    if (!value || typeof value !== 'object') return value;
    const entries = await Promise.all(Object.entries(value as Record<string, unknown>).map(async ([key, child]) => {
      const type = RESOURCE_FIELD_TYPES[key];
      if (type && typeof child === 'string' && resourceIdentifiers?.[type]?.[child]) {
        return [key, await resolveResourceId(type, child, headers)] as const;
      }
      const listType = RESOURCE_LIST_FIELD_TYPES[key];
      if (listType && Array.isArray(child)) {
        return [key, await Promise.all(child.map((item) => (
          typeof item === 'string' && resourceIdentifiers?.[listType]?.[item]
            ? resolveResourceId(listType, item, headers)
            : item
        )))] as const;
      }
      return [key, await resolveBodyReferences(child, headers)] as const;
    }));
    return Object.fromEntries(entries);
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
    const resolvedUrl = await resolveResourceUrl(url, headers);
    const finalUrl = appendParams(joinApiUrl(resolveRoot(), resolvedUrl), params);
    const resolvedBody = body === undefined || (typeof FormData !== 'undefined' && body instanceof FormData)
      ? body
      : await resolveBodyReferences(body, headers);

    const isFormData = typeof FormData !== 'undefined' && resolvedBody instanceof FormData;
    if (resolvedBody !== undefined && !isFormData && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (isFormData) headers.delete('Content-Type');

    const response = await fetch(finalUrl, {
      method,
      headers,
      signal,
      credentials: 'same-origin',
      body: resolvedBody === undefined
        ? undefined
        : isFormData || typeof resolvedBody === 'string' || resolvedBody instanceof Blob
          ? resolvedBody as BodyInit
          : JSON.stringify(resolvedBody),
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
