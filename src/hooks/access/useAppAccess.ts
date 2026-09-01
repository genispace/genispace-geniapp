import { useCallback, useEffect, useState } from 'react';
import { GENISPACE_SHELL_INIT_APPLIED_EVENT, GENISPACE_SHELL_SESSION_API_KEY } from '../shell/shell';

export type AppAccess = {
  isUser: boolean;
  permissionCodes: string[];
  loading: boolean;
  /** Set when the access API call fails (network / server error). Distinct from zero permissions. */
  accessError: string | null;
  reloadAccess: () => void;
};

export type UseAppAccessOptions = {
  /** Application instance id from Shell GENISPACE_SHELL_INIT (sessionStorage). */
  sessionStorageKey: string;
  /** Resolve platform API root including `/api` suffix. */
  getApiRoot: () => string;
};

export function setAppApplicationId(sessionStorageKey: string, applicationId: string | null) {
  try {
    if (applicationId) sessionStorage.setItem(sessionStorageKey, applicationId);
    else sessionStorage.removeItem(sessionStorageKey);
  } catch {
    /* ignore */
  }
}

export function getAppApplicationId(sessionStorageKey: string): string | null {
  try {
    return sessionStorage.getItem(sessionStorageKey);
  } catch {
    return null;
  }
}

export function hasAppPermission(codes: string[], required: string): boolean {
  if (codes.length === 0 && !isAppRbacRelaxed()) return false;
  return codes.includes(required);
}

/** Allow-all RBAC only in dev or when explicitly relaxed (standalone local dev). */
export function isAppRbacRelaxed(): boolean {
  try {
    return import.meta.env.DEV === true || import.meta.env.VITE_RBAC_RELAXED === 'true';
  } catch {
    return false;
  }
}

export function canAccessNavItem(
  loading: boolean,
  permissionCodes: string[],
  permission: string,
  accessError?: string | null,
): boolean {
  if (loading) return false;
  if (accessError != null) return false;
  if (permissionCodes.length === 0) return isAppRbacRelaxed();
  return permissionCodes.includes(permission);
}

/** Page-level action gate — fail-closed when access fetch fails. */
export function canPerformAppAction(
  loading: boolean,
  permissionCodes: string[],
  required: string,
  accessError?: string | null,
): boolean {
  if (loading) return false;
  if (accessError != null) return false;
  return hasAppPermission(permissionCodes, required);
}

/** Default API root from Shell injection or window origin. */
export function resolvePlatformApiRootFromShell(): string {
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
}

export function createAppAccessHook(
  sessionStorageKey: string,
  getApiRoot: () => string
): () => AppAccess {
  return () => useAppAccess({ sessionStorageKey, getApiRoot });
}

async function fetchAppAccess(
  sessionStorageKey: string,
  getApiRoot: () => string
): Promise<Pick<AppAccess, 'isUser' | 'permissionCodes' | 'accessError'>> {
  const applicationId = getAppApplicationId(sessionStorageKey);
  if (!applicationId) {
    return { isUser: true, permissionCodes: [], accessError: null };
  }
  const root = getApiRoot().replace(/\/$/, '');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const token = localStorage.getItem('token');
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    /* ignore */
  }
  const res = await fetch(`${root}/applications/${encodeURIComponent(applicationId)}/users/me/access`, {
    headers,
    credentials: 'include',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 404) {
      try {
        const body = text ? JSON.parse(text) : null;
        if (body?.code === 'NOT_FOUND') {
          // Stale instance id after reinstall — drop cache so Shell GENISPACE_SHELL_INIT can refresh it.
          setAppApplicationId(sessionStorageKey, null);
        }
      } catch {
        /* ignore */
      }
    }
    if (res.status === 401 || res.status === 403) {
      return {
        isUser: false,
        permissionCodes: [],
        accessError: text || res.statusText || `Access denied (${res.status})`,
      };
    }
    return {
      isUser: true,
      permissionCodes: [],
      accessError: text || res.statusText || `Access check failed (${res.status})`,
    };
  }
  const body = await res.json();
  const data = body?.data ?? body;
  return {
    isUser: Boolean(data?.isUser),
    permissionCodes: Array.isArray(data?.permissionCodes) ? data.permissionCodes : [],
    accessError: null,
  };
}

export function useAppAccess({ sessionStorageKey, getApiRoot }: UseAppAccessOptions): AppAccess {
  const [state, setState] = useState<AppAccess>({
    isUser: true,
    permissionCodes: [],
    loading: true,
    accessError: null,
    reloadAccess: () => {},
  });

  const reloadAccess = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true, accessError: null }));
    void fetchAppAccess(sessionStorageKey, getApiRoot)
      .then((result) => {
        setState((prev) => ({
          ...prev,
          ...result,
          loading: false,
        }));
      })
      .catch((e) => {
        setState((prev) => ({
          ...prev,
          isUser: true,
          permissionCodes: [],
          loading: false,
          accessError: e instanceof Error ? e.message : String(e),
        }));
      });
  }, [sessionStorageKey, getApiRoot]);

  useEffect(() => {
    reloadAccess();
  }, [reloadAccess]);

  useEffect(() => {
    const onApplied = () => reloadAccess();
    window.addEventListener(GENISPACE_SHELL_INIT_APPLIED_EVENT, onApplied);
    return () => window.removeEventListener(GENISPACE_SHELL_INIT_APPLIED_EVENT, onApplied);
  }, [reloadAccess]);

  useEffect(() => {
    setState((prev) => ({ ...prev, reloadAccess }));
  }, [reloadAccess]);

  return state;
}
