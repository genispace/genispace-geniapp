export interface WorkbenchHostRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  responseType?: 'json' | 'blob' | 'text';
  signal?: AbortSignal;
}

export interface WorkbenchHostResponse<T = unknown> {
  success: boolean;
  data?: T;
  code?: number;
  message?: string;
  error?: unknown;
  timestamp?: string;
}

export interface WorkbenchHostAdapters {
  request?: <T = unknown>(request: WorkbenchHostRequest) => Promise<WorkbenchHostResponse<T>>;
}

let activeAdapters: WorkbenchHostAdapters = {};

export function configureWorkbenchHostAdapters(adapters: WorkbenchHostAdapters): () => void {
  const previous = activeAdapters;
  activeAdapters = adapters;
  return () => {
    if (activeAdapters === adapters) activeAdapters = previous;
  };
}

export function getWorkbenchHostAdapters(): WorkbenchHostAdapters {
  return activeAdapters;
}
