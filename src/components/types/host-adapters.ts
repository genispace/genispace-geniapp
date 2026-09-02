export type GeniAppHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface GeniAppHostRequest {
  url: string;
  method: GeniAppHttpMethod;
  body?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  responseType?: 'json' | 'blob' | 'text';
  signal?: AbortSignal;
}

export interface GeniAppHostResponse<T = unknown> {
  success: boolean;
  data?: T;
  code?: number;
  message?: string;
  error?: unknown;
  timestamp?: string;
}

export interface GeniAppHostAdapters {
  /** Platform transport used by Datasource, Task, Identity and Access renderers. */
  request?: <T = unknown>(request: GeniAppHostRequest) => Promise<GeniAppHostResponse<T>>;
  /** Application navigation. The default implementation uses react-router/browser history. */
  navigate?: (path: string, options?: { replace?: boolean; state?: unknown }) => void;
  /** Optional notification bridge for hosts that centralize user feedback. */
  notify?: (notification: {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive' | 'success';
  }) => void;
  /** Optional namespaced storage implementation. Browser storage is used by default. */
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
}

