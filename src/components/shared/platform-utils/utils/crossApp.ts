/**
 * Cross-plane navigation + post-login landing resolution for the
 * Hub / Console / Shell split.
 *
 * Base URLs come from the runtime `window.__APP_CONFIG__` so the same logic
 * works in every app. When a plane's URL is unset (pre-split, single origin),
 * targets resolve to relative paths and navigation stays in-app — i.e. this is
 * behaviour-preserving until the subdomains are provisioned.
 */

export type AppPlane = 'hub' | 'console' | 'shell' | 'workbench' | 'chat';

interface RuntimeConfig {
  /** Hub / platform base (login / account / identity), e.g. https://www.genispace.ai. */
  APP_URL?: string;
  /** Console (management) base, e.g. https://www.genispace.ai/console. */
  CONSOLE_URL?: string;
  SHELL_URL?: string;
  WORKBENCH_URL?: string;
  CHAT_URL?: string;
}

function readRuntimeConfig(): RuntimeConfig {
  if (typeof window === 'undefined') return {};
  return ((window as Window & { __APP_CONFIG__?: RuntimeConfig }).__APP_CONFIG__) || {};
}

function trimUrl(value?: string): string {
  return typeof value === 'string' && value.trim() !== '' ? value.trim().replace(/\/$/, '') : '';
}

/**
 * Origin for a plane from runtime config. Empty string means "same origin"
 * (pre-split), in which case callers should navigate with a relative path.
 */
export function getPlaneBaseUrl(plane: AppPlane): string {
  const c = readRuntimeConfig();
  switch (plane) {
    case 'hub':
      return trimUrl(c.APP_URL);
    case 'console':
      return trimUrl(c.CONSOLE_URL);
    case 'shell':
      return trimUrl(c.SHELL_URL);
    case 'workbench':
      return trimUrl(c.WORKBENCH_URL);
    case 'chat':
      return trimUrl(c.CHAT_URL);
    default:
      return '';
  }
}

/** Build a URL for another plane: absolute when its origin is configured, else a relative path. */
export function buildCrossAppUrl(plane: AppPlane, path = ''): string {
  const base = getPlaneBaseUrl(plane);
  const rel = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  if (!base) return rel || '/';
  return `${base}${rel}`;
}

/**
 * Navigate to another plane. If the target is same-origin (no configured base)
 * and an SPA `navigate` fn is supplied, use it; otherwise do a full navigation.
 */
export function crossAppNav(
  plane: AppPlane,
  path = '',
  navigate?: (path: string) => void
): void {
  const base = getPlaneBaseUrl(plane);
  const url = buildCrossAppUrl(plane, path);
  if (!base && navigate) {
    navigate(url);
    return;
  }
  if (typeof window !== 'undefined') {
    window.location.assign(url);
  }
}

/** A launchable app (any type) as returned by the backend capability snapshot. */
export interface LaunchableApp {
  id: string;
  identifier: string;
  name?: string;
  /** Short description shown on launcher tiles. */
  description?: string | null;
  type?: string;
  /** Pinned version label (null → shown as "Default"). */
  version?: string | null;
  /** Backend launcher kind (`BUILTIN` from `/rbac/my-permissions`) or legacy `BUILT_IN`. */
  kind?: 'BUILT_IN' | 'BUILTIN' | 'SHELL' | 'WORKBENCH' | 'CONSOLE' | 'CUSTOM';
  workbenchId?: string | null;
  ingressHost?: string | null;
}

function isWorkbenchApp(app: LaunchableApp): boolean {
  const kind = (app.kind || '').toUpperCase();
  if (kind === 'WORKBENCH') return !!app.workbenchId;
  const t = (app.type || '').toUpperCase();
  return (t === 'WORKBENCH' || t === 'LOWCODE') && !!app.workbenchId;
}

function isBuiltInShellApp(app: LaunchableApp): boolean {
  const kind = (app.kind || '').toUpperCase();
  if (kind === 'BUILT_IN' || kind === 'BUILTIN' || kind === 'SHELL') return true;
  const t = (app.type || '').toUpperCase();
  return t === 'GENIAPP' || t === 'PLATFORM_BUILTIN';
}

/**
 * Resolve the open URL for a launchable app of any type, mirroring the
 * console's applicationOpenHref rules:
 *  - workbench  -> WORKBENCH_URL/workbench/{workbenchId}
 *  - built-in   -> SHELL_URL/{identifier}
 *  - custom     -> https://{ingressHost} (RUNNING deployment)
 * Returns null when the app is not currently openable.
 */
export function getAppLaunchUrl(app: LaunchableApp): string | null {
  if (isWorkbenchApp(app)) {
    const base = getPlaneBaseUrl('workbench');
    if (base) return `${base}/workbench/${app.workbenchId}`;
    return null;
  }
  if (isBuiltInShellApp(app)) {
    const base = getPlaneBaseUrl('shell');
    if (base) return `${base}/${app.identifier}`;
    return null;
  }
  if (app.ingressHost) {
    return `https://${app.ingressHost}`;
  }
  return null;
}

export interface ResolveLandingInput {
  canAccessConsole: boolean;
  accessibleApps: LaunchableApp[];
  /** Server-authoritative last surface: 'console' | 'app' | 'launcher'. */
  lastSurface?: string | null;
  lastAppId?: string | null;
}

export type LandingTarget =
  | { kind: 'console'; path: string }
  | { kind: 'app'; app: LaunchableApp }
  | { kind: 'launcher' }
  | { kind: 'home' };

/**
 * Decide where a user lands after login or after switching space. Shared by the
 * Hub and Console so behaviour is identical across surfaces. The caller is
 * responsible for validating that a remembered target is still accessible — the
 * accessibleApps list passed in is already the authoritative current set.
 */
export function resolveLanding(input: ResolveLandingInput): LandingTarget {
  const apps = Array.isArray(input.accessibleApps) ? input.accessibleApps : [];

  // 1. Console-entitled and the last surface was the console.
  if (input.canAccessConsole && input.lastSurface === 'console') {
    return { kind: 'console', path: '/dashboard' };
  }
  // 2. A remembered last app that is still accessible.
  if (input.lastAppId) {
    const last = apps.find((a) => a.id === input.lastAppId);
    if (last) return { kind: 'app', app: last };
  }
  // 3. Exactly one app and no console -> open it directly.
  if (apps.length === 1 && !input.canAccessConsole) {
    return { kind: 'app', app: apps[0] };
  }
  // 4. Has apps -> the launcher (shows app tiles + console tile if entitled).
  if (apps.length > 0) {
    return { kind: 'launcher' };
  }
  // 5. Console-entitled with no apps -> the console.
  if (input.canAccessConsole) {
    return { kind: 'console', path: '/dashboard' };
  }
  // 6. Nothing actionable -> the Hub home / personal space.
  return { kind: 'home' };
}
