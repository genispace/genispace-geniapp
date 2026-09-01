/**
 * Path inside a GeniApp SPA after removing Vite's public base (`import.meta.env.BASE_URL`).
 * Matches Shell ↔ iframe `innerPath` convention: no leading/trailing slashes (empty = app root).
 */
export function pathnameWithinBase(pathname: string, viteBaseRaw: string): string {
  const pathnameNorm = pathname.replace(/\/+/gu, '/');
  const raw = viteBaseRaw.trim();
  if (!raw || raw === '/') {
    return pathnameNorm.replace(/^\/+|\/+$/gu, '');
  }
  let base = raw.replace(/\/+/gu, '/');
  if (!base.startsWith('/')) base = `/${base}`;
  base = base.replace(/\/+$/u, '') || '/';
  if (base === '/') {
    return pathnameNorm.replace(/^\/+|\/+$/gu, '');
  }
  const pathNoTrailing = pathnameNorm.replace(/\/+$/u, '') || '/';
  const prefix = `${base}/`;
  if (pathNoTrailing === base) return '';
  if (pathNoTrailing.startsWith(prefix)) {
    return pathNoTrailing.slice(prefix.length).replace(/\/+$/u, '');
  }
  return pathnameNorm.replace(/^\/+|\/+$/gu, '');
}
