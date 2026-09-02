import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import {
  GENISPACE_SHELL_INIT_APPLIED_EVENT,
  GENISPACE_SHELL_SESSION_API_KEY,
  GENISPACE_SHELL_SESSION_APPLICATION_ID_KEY,
} from './hooks';
import { setLanguage, setTheme } from './utils';

export const GENISPACE_SHELL_MESSAGE_VERSION = 1 as const;

export type GeniAppTheme = 'light' | 'dark';

export type GeniAppShellContext = {
  applicationId?: string | null;
  identifier: string | null;
  pinnedVersion: string | null;
  stableVersion?: string | null;
  previewVersion?: string | null;
  effectiveVersion?: string | null;
  releaseChannel?: 'stable' | 'preview';
  apiPublicBaseUrl?: string | null;
  accessToken?: string | null;
  locale?: string;
  theme?: GeniAppTheme;
  shellOrigin: string;
  allowedShellOrigins?: string[] | null;
};

export type GeniAppShellBridgeProps = {
  /** Manifest identifier returned in GENISPACE_IFRAME_READY. */
  identifier: string;
  /** Explicit production Shell allow-list. `document.referrer` is also trusted. */
  allowedShellOrigins?: string[];
  /** Defaults to `token`; pass null when the application owns token persistence. */
  accessTokenStorageKey?: string | null;
  onApplicationId?: (applicationId: string | null) => void;
  onContext?: (context: GeniAppShellContext) => void;
};

function normalizeOrigin(value?: string | null) {
  if (!value?.trim()) return null;
  try {
    const origin = new URL(value).origin;
    return origin === 'null' ? null : origin;
  } catch {
    return null;
  }
}

function referrerOrigin() {
  if (typeof document === 'undefined') return null;
  return normalizeOrigin(document.referrer);
}

function initialAllowedOrigins(configured: string[] | undefined) {
  const result = new Set<string>();
  const add = (value?: string | null) => {
    const origin = normalizeOrigin(value);
    if (origin) result.add(origin);
  };

  configured?.forEach(add);
  add(referrerOrigin());

  if (typeof window !== 'undefined') {
    const runtime = (window as Window & { __GENISPACE_ALLOWED_SHELL_ORIGINS__?: string[] })
      .__GENISPACE_ALLOWED_SHELL_ORIGINS__;
    runtime?.forEach(add);
  }

  if (result.size === 0) {
    add('http://localhost:5017');
    add('http://127.0.0.1:5017');
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isShellContext(value: unknown): value is GeniAppShellContext {
  if (!isRecord(value)) return false;
  return typeof value.shellOrigin === 'string'
    && (typeof value.identifier === 'string' || value.identifier === null)
    && (typeof value.pinnedVersion === 'string' || value.pinnedVersion === null);
}

function setStorageValue(storage: Storage, key: string, value?: string | null) {
  if (!value) return;
  try {
    storage.setItem(key, value);
  } catch {
    // Storage can be unavailable in privacy-restricted iframes.
  }
}

/**
 * Canonical bridge between a routed GeniApp and the platform Shell iframe.
 *
 * The initial message is accepted only from an explicit/referrer/local origin;
 * an untrusted sender cannot whitelist itself through its payload.
 */
export function GeniAppShellBridge({
  identifier,
  allowedShellOrigins,
  accessTokenStorageKey = 'token',
  onApplicationId,
  onContext,
}: GeniAppShellBridgeProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const { i18n } = useTranslation();
  const trustedOriginsRef = useRef<Set<string>>(new Set());
  const parentOriginRef = useRef<string | null>(null);

  useEffect(() => {
    trustedOriginsRef.current = initialAllowedOrigins(allowedShellOrigins);
  }, [allowedShellOrigins]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!isRecord(event.data) || event.data.v !== GENISPACE_SHELL_MESSAGE_VERSION) return;
      const message = event.data;

      if (message.type === 'GENISPACE_SHELL_INIT') {
        if (!trustedOriginsRef.current.has(event.origin) || !isShellContext(message.payload)) return;
        const context = message.payload;
        const declaredOrigin = normalizeOrigin(context.shellOrigin);
        if (declaredOrigin !== event.origin) return;

        parentOriginRef.current = event.origin;
        context.allowedShellOrigins?.forEach((origin) => {
          const normalized = normalizeOrigin(origin);
          if (normalized) trustedOriginsRef.current.add(normalized);
        });

        setStorageValue(sessionStorage, GENISPACE_SHELL_SESSION_API_KEY, context.apiPublicBaseUrl);
        setStorageValue(sessionStorage, GENISPACE_SHELL_SESSION_APPLICATION_ID_KEY, context.applicationId);
        if (accessTokenStorageKey) setStorageValue(localStorage, accessTokenStorageKey, context.accessToken);

        onApplicationId?.(context.applicationId || null);
        if (context.locale?.trim()) {
          void i18n.changeLanguage(context.locale);
          setLanguage(context.locale);
        }
        if (context.theme === 'light' || context.theme === 'dark') setTheme(context.theme);
        onContext?.(context);

        window.dispatchEvent(new Event(GENISPACE_SHELL_INIT_APPLIED_EVENT));
        window.parent.postMessage(
          {
            type: 'GENISPACE_IFRAME_READY',
            v: GENISPACE_SHELL_MESSAGE_VERSION,
            identifier: context.identifier || identifier,
          },
          event.origin,
        );
        return;
      }

      if (!trustedOriginsRef.current.has(event.origin) || parentOriginRef.current !== event.origin) return;

      if (message.type === 'GENISPACE_SHELL_UI') {
        if (typeof message.locale === 'string' && message.locale.trim()) {
          void i18n.changeLanguage(message.locale);
          setLanguage(message.locale);
        }
        if (message.theme === 'light' || message.theme === 'dark') setTheme(message.theme);
        return;
      }

      if (message.type !== 'GENISPACE_SHELL_ROUTE') return;
      const rawInnerPath = typeof message.innerPath === 'string' ? message.innerPath.trim() : '';
      if (rawInnerPath.startsWith('//')) return;
      try {
        const parsed = new URL(rawInnerPath ? `/${rawInnerPath.replace(/^\/+/, '')}` : '/', window.location.origin);
        if (parsed.origin !== window.location.origin) return;
        const nextLocation = `${parsed.pathname}${parsed.search}${parsed.hash}`;
        const currentLocation = `${location.pathname}${location.search}${location.hash}`;
        if (currentLocation !== nextLocation) navigate(nextLocation, { replace: true });
      } catch {
        // Ignore malformed route messages from the host.
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [accessTokenStorageKey, i18n, identifier, location.hash, location.pathname, location.search, navigate, onApplicationId, onContext]);

  useEffect(() => {
    const parentOrigin = parentOriginRef.current;
    if (!parentOrigin) return;
    window.parent.postMessage(
      {
        type: 'GENISPACE_IFRAME_NAVIGATE',
        v: GENISPACE_SHELL_MESSAGE_VERSION,
        innerPath: `${location.pathname.replace(/^\/+/, '')}${location.search}${location.hash}`,
        replace: navigationType === 'REPLACE',
      },
      parentOrigin,
    );
  }, [location.hash, location.pathname, location.search, navigationType]);

  return null;
}
