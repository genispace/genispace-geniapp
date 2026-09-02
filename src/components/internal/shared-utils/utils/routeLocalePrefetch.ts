export interface RouteLocaleRule {

  prefix: string;
  namespaces: readonly string[];
}

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '') return '/';
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

function ruleMatches(pathname: string, prefix: string): boolean {
  const p = normalizePathname(pathname);
  if (prefix === '/') {
    return p === '/' || p === '';
  }
  const pre = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
  if (!pre.startsWith('/')) {
    return false;
  }
  return p === pre || p.startsWith(`${pre}/`);
}

export function namespacesForPath(
  pathname: string,
  rules: readonly RouteLocaleRule[],
): string[] {
  const sorted = [...rules].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const rule of sorted) {
    if (ruleMatches(pathname, rule.prefix)) {
      return [...rule.namespaces];
    }
  }
  return [];
}
