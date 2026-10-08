import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '@/lib/api/apiClient';
import { useEditMode } from '@/runtime/runtime-mode';
import { useGeniAppHost } from '../runtime/GeniAppHostContext';
import {
  GENISPACE_SHELL_INIT_APPLIED_EVENT,
  GENISPACE_SHELL_SESSION_APPLICATION_ID_KEY,
} from '../../hooks/shell/shell';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Route params / host props in exported apps carry identifiers like "my-app", not UUIDs. */
export function isUuid(value: string | undefined | null): value is string {
  return !!value && UUID_PATTERN.test(value);
}

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

function getShellApplicationId(): string | undefined {
  try {
    return sessionStorage.getItem(GENISPACE_SHELL_SESSION_APPLICATION_ID_KEY) || undefined;
  } catch {
    return undefined;
  }
}

// Host-supplied application IDENTIFIER → installation instance UUID, resolved via
// GET /applications/my-installations. Cached + deduped module-wide like appIdCache.
const hostAppIdCache = new Map<string, string | null>();
const hostAppIdInflight = new Map<string, Promise<string | null>>();

interface MyInstallationsItem {
  id?: string;
  identifier?: string;
  application?: { identifier?: string };
}

function resolveHostApplicationId(identifier: string): Promise<string | null> {
  const cached = hostAppIdCache.get(identifier);
  if (cached !== undefined) return Promise.resolve(cached);
  let p = hostAppIdInflight.get(identifier);
  if (!p) {
    p = apiClient
      .get('/applications/my-installations', { limit: 100 })
      .then(r => {
        const items =
          ((r as { data?: { items?: MyInstallationsItem[] } })?.data?.items ?? []) as MyInstallationsItem[];
        const match = Array.isArray(items)
          ? items.find(it => (it?.identifier ?? it?.application?.identifier) === identifier)
          : undefined;
        const id = match?.id ?? null;
        hostAppIdCache.set(identifier, id);
        hostAppIdInflight.delete(identifier);
        return id;
      })
      .catch(() => {
        // Fail open: a failed lookup just means no role-driven UX this session.
        hostAppIdInflight.delete(identifier);
        return null;
      });
    hostAppIdInflight.set(identifier, p);
  }
  return p;
}

export function useResolvedApplicationId(): string | undefined {
  const { currentWorkbench } = useEditMode();
  const { workbenchId } = useParams();
  const { applicationId: hostAppId } = useGeniAppHost();
  const ctxAppId: string | undefined = currentWorkbench?.applicationId || undefined;
  // The GeniApp standalone shell registers `/:workbenchId/...` routes whose param is the
  // application identifier — only a UUID-shaped param may hit GET /workbenches/:id.
  const uuidWorkbenchId = isUuid(workbenchId) ? workbenchId : undefined;
  const hostUuidAppId = isUuid(hostAppId) ? hostAppId : undefined;
  const hostIdentifier = hostAppId && !isUuid(hostAppId) ? hostAppId : undefined;
  const [fetchedAppId, setFetchedAppId] = useState<string | undefined>(() =>
    uuidWorkbenchId ? appIdCache.get(uuidWorkbenchId) || undefined : undefined
  );
  // GeniApp iframe mode has neither a workbenchId route param nor a currentWorkbench;
  // the Shell injects the application instance id into sessionStorage on INIT.
  const [shellAppId, setShellAppId] = useState<string | undefined>(() => getShellApplicationId());
  const [resolvedHostAppId, setResolvedHostAppId] = useState<string | undefined>(() =>
    hostIdentifier ? hostAppIdCache.get(hostIdentifier) || undefined : undefined
  );
  useEffect(() => {
    if (shellAppId || typeof window === 'undefined') return;
    const onInitApplied = () => setShellAppId(getShellApplicationId());
    window.addEventListener(GENISPACE_SHELL_INIT_APPLIED_EVENT, onInitApplied);
    return () => window.removeEventListener(GENISPACE_SHELL_INIT_APPLIED_EVENT, onInitApplied);
  }, [shellAppId]);
  useEffect(() => {
    let alive = true;
    if (ctxAppId || !uuidWorkbenchId) return;
    const cached = appIdCache.get(uuidWorkbenchId);
    if (cached !== undefined) {
      setFetchedAppId(cached || undefined);
      return;
    }
    let p = appIdInflight.get(uuidWorkbenchId);
    if (!p) {
      p = apiClient
        .get(`/workbenches/${uuidWorkbenchId}`)
        .then(r => {
          const id = ((r as { data?: { applicationId?: string } })?.data?.applicationId) ?? null;
          appIdCache.set(uuidWorkbenchId, id);
          appIdInflight.delete(uuidWorkbenchId);
          return id;
        })
        .catch(() => {
          appIdInflight.delete(uuidWorkbenchId);
          return null;
        });
      appIdInflight.set(uuidWorkbenchId, p);
    }
    p.then(id => {
      if (alive) setFetchedAppId(id || undefined);
    });
    return () => {
      alive = false;
    };
  }, [ctxAppId, uuidWorkbenchId]);
  // Lowest priority: standalone hosts pass the application identifier, resolved to the
  // installation instance id via my-installations. Skipped while any authoritative source
  // (workbench context, UUID route param, Shell injection) can settle it directly.
  useEffect(() => {
    let alive = true;
    if (!hostIdentifier || ctxAppId || hostUuidAppId || uuidWorkbenchId || shellAppId) return;
    void resolveHostApplicationId(hostIdentifier).then(id => {
      if (alive) setResolvedHostAppId(id || undefined);
    });
    return () => {
      alive = false;
    };
  }, [hostIdentifier, ctxAppId, hostUuidAppId, uuidWorkbenchId, shellAppId]);
  // Priority: workbench context (edit mode) → reverse lookup by UUID route param → host prop
  // UUID → shell session injection → host identifier via my-installations. The reverse lookup
  // must beat the host UUID prop: the workbench VIEWER hands the WORKBENCH id (not the owning
  // application id) to GeniAppComponentProvider's applicationId prop, so trusting it 404s
  // /me/access into fail-open and every role rule silently dies; GET /workbenches/:id always
  // returns the real applicationId. Standalone/iframe routes carry a non-UUID identifier, so
  // uuidWorkbenchId/fetchedAppId stay undefined there and this reorder is a no-op for them.
  return ctxAppId || fetchedAppId || hostUuidAppId || shellAppId || resolvedHostAppId;
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
