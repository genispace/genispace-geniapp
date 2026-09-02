/**
 * Front-channel logout across the multi-origin app family (Hub / Console /
 * Workbench / Chat / Ebook / Partner / Shell).
 *
 * Auth tokens live in each origin's own localStorage, so signing out (or
 * switching accounts) in one app cannot directly clear the others. Every app
 * exposes a `/logout-notification` receiver page that wipes its origin's auth
 * keys; on sign-out the initiating app loads those receivers in hidden iframes
 * and waits for their `logout-completed` acks (bounded by a timeout).
 *
 * This relies on all apps being served from the same site (eTLD+1) so browser
 * third-party storage partitioning does not isolate the iframes' localStorage.
 */

export const LOGOUT_NOTIFICATION_PATH = '/logout-notification';
export const LOGOUT_COMPLETED_MESSAGE = 'logout-completed';

interface LogoutRuntimeConfig {
  APP_URL?: string;
  CONSOLE_URL?: string;
  WORKBENCH_URL?: string;
  CHAT_URL?: string;
  EBOOK_URL?: string;
  PARTNER_URL?: string;
  SHELL_URL?: string;
}

function readRuntimeConfig(): LogoutRuntimeConfig {
  if (typeof window === 'undefined') return {};
  return (window as Window & { __APP_CONFIG__?: LogoutRuntimeConfig }).__APP_CONFIG__ || {};
}

/**
 * Receiver URLs for every configured app base except the current origin
 * (the caller clears its own storage directly). Bases sharing an origin are
 * deduped (e.g. Hub and its `/console` mount) — one receiver per origin.
 */
export function collectLogoutNotificationUrls(): string[] {
  if (typeof window === 'undefined') return [];
  const c = readRuntimeConfig();
  const candidates = [
    c.APP_URL,
    c.CONSOLE_URL,
    c.WORKBENCH_URL,
    c.CHAT_URL,
    c.EBOOK_URL,
    c.PARTNER_URL,
    c.SHELL_URL,
  ];
  const seenOrigins = new Set<string>([window.location.origin]);
  const urls: string[] = [];
  for (const raw of candidates) {
    const base = typeof raw === 'string' ? raw.trim().replace(/\/+$/, '') : '';
    if (!base) continue;
    let origin = '';
    try {
      origin = new URL(base, window.location.origin).origin;
    } catch {
      continue;
    }
    if (seenOrigins.has(origin)) continue;
    seenOrigins.add(origin);
    urls.push(`${base}${LOGOUT_NOTIFICATION_PATH}`);
  }
  return urls;
}

/**
 * True while a local sign-out broadcast is running in this window. Auth
 * watchers (e.g. RequireAuth's logged-out restart) must not navigate away
 * while this is set: the local token is already cleared but the identity
 * provider's origin may not be yet — redirecting to SSO at that moment would
 * silently log the user straight back in and abort the iframe broadcast.
 */
let broadcastInProgress = false;

export function isLogoutBroadcastInProgress(): boolean {
  return broadcastInProgress;
}

/**
 * Load each receiver in a hidden iframe and resolve once every origin has
 * acked with `logout-completed`, or after `timeoutMs` — never rejects, so it
 * is safe to await inside sign-out flows before redirecting.
 */
export function broadcastLogoutNotifications(
  urls: string[] = collectLogoutNotificationUrls(),
  timeoutMs = 2500
): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined' || urls.length === 0) {
    return Promise.resolve();
  }
  broadcastInProgress = true;
  return new Promise((resolve) => {
    const iframes: HTMLIFrameElement[] = [];
    const pendingOrigins = new Set(
      urls
        .map((u) => {
          try {
            return new URL(u, window.location.origin).origin;
          } catch {
            return '';
          }
        })
        .filter(Boolean)
    );
    let timer = 0;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      broadcastInProgress = false;
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timer);
      for (const frame of iframes) frame.parentNode?.removeChild(frame);
      resolve();
    };
    const onMessage = (ev: MessageEvent) => {
      if (ev.data !== LOGOUT_COMPLETED_MESSAGE) return;
      pendingOrigins.delete(ev.origin);
      if (pendingOrigins.size === 0) finish();
    };
    window.addEventListener('message', onMessage);
    timer = window.setTimeout(finish, timeoutMs);
    for (const url of urls) {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.setAttribute('aria-hidden', 'true');
      iframe.src = url;
      document.body.appendChild(iframe);
      iframes.push(iframe);
    }
  });
}
