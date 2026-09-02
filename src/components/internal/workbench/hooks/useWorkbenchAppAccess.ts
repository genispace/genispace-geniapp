import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '@/lib/api/apiClient';
import { useEditMode } from '@/components/edit-mode/EditModeProvider';

/**
 * Current user's access within the workbench's owning application.
 * `roles` are the application role CODES assigned to the current user (from
 * `GET /applications/:id/users/me/access`). Empty when the user has no app roles or the
 * workbench app has no custom roles yet.
 */
export interface WorkbenchAppAccess {
  isUser: boolean;
  roles: string[];
  permissionCodes: string[];
  loading: boolean;
  /** The workbench's owning application id (undefined until the workbench config loads). */
  applicationId?: string;
}

const EMPTY: Omit<WorkbenchAppAccess, 'loading'> = { isUser: false, roles: [], permissionCodes: [] };

// applicationId resolution, cached by workbenchId. Primary source is the loaded workbench
// (useEditMode().currentWorkbench.applicationId); when that isn't populated in this render tree
// (it can be null/stale in view mode), fall back to fetching GET /workbenches/:id, which always
// returns applicationId.
const appIdCache = new Map<string, string | null>();
const appIdInflight = new Map<string, Promise<string | null>>();

export function useResolvedApplicationId(): string | undefined {
  const { currentWorkbench } = useEditMode();
  const { workbenchId } = useParams();
  const ctxAppId: string | undefined = currentWorkbench?.applicationId || undefined;
  const [fetchedAppId, setFetchedAppId] = useState<string | undefined>(() =>
    workbenchId ? appIdCache.get(workbenchId) || undefined : undefined
  );
  useEffect(() => {
    let alive = true;
    if (ctxAppId || !workbenchId) return;
    const cached = appIdCache.get(workbenchId);
    if (cached !== undefined) {
      setFetchedAppId(cached || undefined);
      return;
    }
    let p = appIdInflight.get(workbenchId);
    if (!p) {
      p = apiClient
        .get(`/workbenches/${workbenchId}`)
        .then(r => {
          const id = ((r as { data?: { applicationId?: string } })?.data?.applicationId) ?? null;
          appIdCache.set(workbenchId, id);
          appIdInflight.delete(workbenchId);
          return id;
        })
        .catch(() => {
          appIdInflight.delete(workbenchId);
          return null;
        });
      appIdInflight.set(workbenchId, p);
    }
    p.then(id => {
      if (alive) setFetchedAppId(id || undefined);
    });
    return () => {
      alive = false;
    };
  }, [ctxAppId, workbenchId]);
  return ctxAppId || fetchedAppId;
}

// Module-level cache/dedupe keyed by applicationId so multiple FilterPanel instances (and any
// other consumer) on the same page share a single /me/access request.
const accessCache = new Map<string, Omit<WorkbenchAppAccess, 'loading'>>();
const inflight = new Map<string, Promise<Omit<WorkbenchAppAccess, 'loading'>>>();

async function fetchAppAccess(applicationId: string): Promise<Omit<WorkbenchAppAccess, 'loading'>> {
  // workbench apiClient.get returns the raw backend body ({ success, data }) — see baseApiClient.
  const resp = (await apiClient.get(`/applications/${applicationId}/users/me/access`)) as {
    data?: { isUser?: boolean; roles?: Array<{ code?: string }>; permissionCodes?: string[] };
  };
  const d = resp?.data ?? {};
  return {
    isUser: !!d.isUser,
    roles: Array.isArray(d.roles) ? d.roles.map(r => String(r?.code ?? '')).filter(Boolean) : [],
    permissionCodes: Array.isArray(d.permissionCodes) ? d.permissionCodes.map(String) : [],
  };
}

export function useWorkbenchAppAccess(): WorkbenchAppAccess {
  const applicationId = useResolvedApplicationId();

  const [access, setAccess] = useState<Omit<WorkbenchAppAccess, 'loading'>>(() =>
    applicationId ? accessCache.get(applicationId) ?? EMPTY : EMPTY
  );
  const [loading, setLoading] = useState<boolean>(() => !!applicationId && !accessCache.has(applicationId));

  useEffect(() => {
    let alive = true;
    if (!applicationId) {
      setAccess(EMPTY);
      setLoading(false);
      return;
    }
    const cached = accessCache.get(applicationId);
    if (cached) {
      setAccess(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    let p = inflight.get(applicationId);
    if (!p) {
      p = fetchAppAccess(applicationId)
        .then(a => {
          accessCache.set(applicationId, a);
          inflight.delete(applicationId);
          return a;
        })
        .catch(err => {
          inflight.delete(applicationId);
          throw err;
        });
      inflight.set(applicationId, p);
    }
    p.then(a => {
      if (alive) {
        setAccess(a);
        setLoading(false);
      }
    }).catch(() => {
      // Fail open (treat as no roles) — the store data itself is already gated server-side by
      // the injected user id, so an access-fetch failure never leaks data; it just skips the
      // role-driven UX.
      if (alive) {
        setAccess(EMPTY);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [applicationId]);

  return { ...access, loading, applicationId };
}
