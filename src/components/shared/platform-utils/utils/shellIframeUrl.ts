/**
 * Helpers for Shell iframe embedding of GeniApps (cross-origin safe URL composition).
 */

export function normalizeIframeBaseUrl(base: string): string {
  const x = base.trim();
  if (!x) return x;
  return x.endsWith('/') ? x : `${x}/`;
}

/** True when `baseUrl` is an expanded CDN directory (`…/{identifier}/{version}/`), not a bare dev origin. */
export function isExpandedGeniappIframeBase(baseUrl: string, identifier: string): boolean {
  try {
    const parts = new URL(baseUrl).pathname.split('/').filter(Boolean);
    const identifierIndex = parts.lastIndexOf(identifier);
    return (
      identifierIndex >= 0 &&
      identifierIndex === parts.length - 2 &&
      /^\d+\.\d+\.\d+$/u.test(parts[identifierIndex + 1] ?? '')
    );
  } catch {
    return false;
  }
}

/**
 * Build full iframe document URL. `baseUrl` is typically expanded manifest `iframeEntryTemplate`
 * (must include trailing slash when serving SPA from a directory prefix).
 *
 * - Bare origin (`https://host/`): append `{identifier}` and optional `innerPath` (legacy hr-timesheet dev).
 * - Expanded CDN base (`…/{identifier}/{version}/`): always load the version directory root. Object
 *   storage/CDN origins do not provide BrowserRouter fallback for deep paths; Shell sends `innerPath`
 *   separately through `GENISPACE_SHELL_ROUTE` after the iframe is available.
 */
export function buildAppIframeSrc(baseUrl: string, identifier: string, innerPath: string): string {
  const baseNorm = normalizeIframeBaseUrl(baseUrl);
  const expandedCdn = isExpandedGeniappIframeBase(baseNorm, identifier);
  const tail = expandedCdn
    ? ''
    : innerPath
      ? `${identifier}/${innerPath}`
      : `${identifier}`;
  const u = new URL(tail, baseNorm);
  // Vite apps with versioned `base` only serve the document at the directory URL (trailing slash).
  if (!innerPath && !u.pathname.endsWith('/')) {
    u.pathname += '/';
  }
  return u.href;
}

/** Shell route `/:appSlug/*` → path segments inside the GeniApp router (`summary`, `reports/project`, …). */
export function shellPathnameToInnerPath(pathname: string, appSlug: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== appSlug) return '';
  return parts.slice(1).join('/');
}

/** @deprecated Use buildAppIframeSrc */
export const buildGeniappIframeSrc = buildAppIframeSrc;
