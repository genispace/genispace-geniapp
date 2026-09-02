import { LayoutGrid, type LucideIcon } from 'lucide-react';
import type { EnabledBuiltInAppItem } from '../components/primitives/layout/AppHeader';
import { resolveShellNavLucideIcon } from './shellNavLucideIcon';

/** Single locale block from marketplace catalog → `metadata.locales`. */
export type BuiltInAppLocaleBlock = {
  name?: string;
  description?: string;
};

/** Registry `metadata.locales` keyed by language code (`en`, `zh`, …). */
export type BuiltInAppLocales = Record<string, BuiltInAppLocaleBlock>;

function normalizeBuiltInAppLang(lng: string | undefined): string {
  if (!lng || typeof lng !== 'string') return 'en';
  const lower = lng.toLowerCase();
  if (lower.startsWith('zh')) return 'zh';
  if (lower.startsWith('en')) return 'en';
  const base = lower.split('-')[0];
  return base && base.length > 0 ? base : 'en';
}

/**
 * Resolve visible app title from registry locales (same rules as API `pickLocalizedStrings`).
 * Used so AppHeader updates when UI language changes without refetching the list.
 */
function pickBuiltInAppLocaleBlock(
  locales: BuiltInAppLocales | null | undefined,
  displayLanguage: string | undefined
): BuiltInAppLocaleBlock | null {
  const lang = normalizeBuiltInAppLang(displayLanguage);
  if (!locales || typeof locales !== 'object') return null;
  const baseKey = lang.split('-')[0];
  const pick =
    locales[lang] ||
    (baseKey && baseKey !== lang ? locales[baseKey] : undefined) ||
    locales.en ||
    locales.zh;
  if (!pick || typeof pick !== 'object') return null;
  return pick;
}

/**
 * Resolve visible app title from registry locales (same rules as API `pickLocalizedStrings`).
 * Used so AppHeader updates when UI language changes without refetching the list.
 */
export function pickBuiltInAppDisplayName(
  fallbackName: string,
  locales: BuiltInAppLocales | null | undefined,
  displayLanguage: string | undefined
): string {
  const pick = pickBuiltInAppLocaleBlock(locales, displayLanguage);
  if (!pick) return fallbackName;
  const n = typeof pick.name === 'string' ? pick.name.trim() : '';
  return n || fallbackName;
}

/**
 * Resolve visible app description from registry locales (same rules as display name).
 * Used by Workspace tiles so descriptions follow UI language without refetching.
 */
export function pickBuiltInAppDisplayDescription(
  fallbackDescription: string,
  locales: BuiltInAppLocales | null | undefined,
  displayLanguage: string | undefined
): string {
  const pick = pickBuiltInAppLocaleBlock(locales, displayLanguage);
  if (!pick) return fallbackDescription;
  const d = typeof pick.description === 'string' ? pick.description.trim() : '';
  return d || fallbackDescription;
}

/**
 * Enabled built-in app row from the platform API (`GET .../enabled-built-in-apps`).
 */
/** Optional shell sidebar links for the active GeniApp (manifest `navigation`, overridden by repo `data/navigation.json` when the API loads it). Paths are relative to `/${identifier}/`. */
export type AppNavigationItem = {
  label: string;
  path: string;
  /** Lucide icon component name, e.g. `ListChecks`. Resolved in App Shell sidebar. */
  icon?: string | null;
  /**
   * When set, App Shell resolves the visible label with `useTranslation('shell')` (e.g. `geniapp_hr_timesheet_nav_summary`).
   * Falls back to `label` if the key is missing in locale files.
   */
  labelKey?: string | null;
};

export interface BuiltInApp {
  id: string;
  /** URL segment under the shell, e.g. `demo` -> `/:appSlug` */
  identifier: string;
  name: string;
  /** From catalog `metadata.locales`; enables header label to follow UI language. */
  locales?: BuiltInAppLocales | null;
  pinnedVersion: string | null;
  /** Expanded iframe document base for this team's pinned version (manifest `iframeEntryTemplate`). */
  iframeEntryTemplate?: string | null;
  /** Optional `sandbox` attribute override for the iframe (space-separated tokens). */
  iframeSandbox?: string | null;
  /** Extra allowed Shell origins for postMessage validation on the GeniApp side (manifest `allowedShellOrigins`). */
  allowedShellOrigins?: string[] | null;
  /** Lucide icon name for shell sidebar app header (manifest `shellAppIcon`). */
  shellAppIcon?: string | null;
  /** When set, Shell may render these instead of a generic single-app link. */
  navigation?: AppNavigationItem[] | null;
  /** Navigation destination: App Shell iframe or Workbench editor. */
  navTarget?: 'shell' | 'workbench';
  /** Set when `navTarget === 'workbench'`. */
  workbenchId?: string | null;
}

export const BUILT_IN_APPS_QUERY_KEY = ['builtInApps'] as const;

/** Fallback when the API is unavailable (dev / contract drift). */
export const MOCK_BUILT_IN_APPS: BuiltInApp[] = [
  {
    id: 'mock-demo',
    identifier: 'demo',
    name: 'Demo',
    pinnedVersion: '1.0.0',
    iframeEntryTemplate: 'http://127.0.0.1:5210/',
  },
];

/** Minimal GET client shape (axios wrapper / BaseApiClient). */
export type BuiltInAppsApiClient = {
  get<T = unknown>(
    url: string,
    params?: Record<string, unknown>,
    config?: unknown
  ): Promise<{ success?: boolean; data?: T; message?: string }>;
};

export type BuiltInAppsPayload = {
  apps: BuiltInApp[];
};

/**
 * GET `/spaces/current/enabled-built-in-apps` — enabled built-ins for the active space.
 */
export async function fetchBuiltInApps(apiClient: BuiltInAppsApiClient): Promise<BuiltInApp[]> {
  try {
    const res = await apiClient.get<BuiltInAppsPayload | BuiltInApp[]>(
      '/spaces/current/enabled-built-in-apps'
    );
    if (!res.success || res.data == null) {
      return MOCK_BUILT_IN_APPS;
    }
    const raw = res.data;
    if (Array.isArray(raw)) {
      return raw;
    }
    if (raw && typeof raw === 'object' && Array.isArray((raw as BuiltInAppsPayload).apps)) {
      return (raw as BuiltInAppsPayload).apps;
    }
    return MOCK_BUILT_IN_APPS;
  } catch {
    return MOCK_BUILT_IN_APPS;
  }
}

/** First manifest navigation path (relative to `/${identifier}/`) for Shell deep-link; empty if none. */
function shellHeaderInnerFromNavigation(app: BuiltInApp): string {
  const nav = app.navigation;
  if (!nav?.length) return '';
  const p = nav[0]?.path;
  if (typeof p !== 'string') return '';
  const s = p.replace(/^\/+/u, '').replace(/\/+$/u, '');
  return s;
}

/**
 * Build AppHeader shortcuts: links go to the **App Shell** origin (`SHELL_URL`), not Console/Chat.
 * When the API provides `navigation`, the first item's `path` is appended so the Shell opens the same landing as the sidebar (no version segment in the Shell URL).
 */
export function mapBuiltInAppsToHeaderItems(
  apps: BuiltInApp[],
  shellOrigin: string,
  fallbackIcon: LucideIcon = LayoutGrid,
  displayLanguage?: string
): EnabledBuiltInAppItem[] {
  return mapNavAppsToHeaderItems(apps, {
    shellOrigin,
    workbenchUrl: '',
    fallbackIcon,
    displayLanguage,
  });
}

export type MapNavAppsOptions = {
  shellOrigin: string;
  workbenchUrl: string;
  fallbackIcon?: LucideIcon;
  displayLanguage?: string;
};

/**
 * Map enabled nav apps (Shell GeniApps + Workbench apps) to AppHeader shortcut items.
 */
export function mapNavAppsToHeaderItems(
  apps: BuiltInApp[],
  options: MapNavAppsOptions
): EnabledBuiltInAppItem[] {
  const { shellOrigin, workbenchUrl, fallbackIcon = LayoutGrid, displayLanguage } = options;
  const shellBase = shellOrigin.replace(/\/$/, '');
  const workbenchBase = workbenchUrl.replace(/\/$/, '');

  return apps.map((a) => {
    const isWorkbench = a.navTarget === 'workbench' && a.workbenchId;
    const href = isWorkbench
      ? `${workbenchBase}/workbench/${a.workbenchId}`
      : (() => {
          const inner = shellHeaderInnerFromNavigation(a);
          return inner ? `${shellBase}/${a.identifier}/${inner}` : `${shellBase}/${a.identifier}`;
        })();

    return {
      id: a.id,
      label: pickBuiltInAppDisplayName(a.name, a.locales ?? null, displayLanguage),
      href,
      icon: resolveShellNavLucideIcon(a.shellAppIcon, fallbackIcon),
    };
  });
}
