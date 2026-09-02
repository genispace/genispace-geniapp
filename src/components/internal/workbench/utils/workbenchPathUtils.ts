const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NON_WORKBENCH_PATH_SEGMENTS = new Set([
  'dashboard',
  'profile',
  'settings',
  'team',
  'sso',
  'auth',
  'help',
]);

function isDemoWorkbenchId(workbenchId: string): boolean {
  return workbenchId.startsWith('demo-') || workbenchId.endsWith('-demo');
}

function isValidWorkbenchIdSegment(segment: string): boolean {
  return UUID_REGEX.test(segment) || isDemoWorkbenchId(segment);
}

export function stripLegacyMobileRoutePrefix(pathname: string): string {
  if (pathname === '/m') {
    return '/';
  }
  if (pathname.startsWith('/m/')) {
    return pathname.slice(2);
  }
  return pathname;
}

export function isLegacyMobileRoutePath(pathname: string): boolean {
  return pathname === '/m' || pathname.startsWith('/m/');
}

/** Workbench content routes (/{workbenchId}/...), excluding public routes. */
export function isWorkbenchContentPath(pathname: string): boolean {
  const normalized = stripLegacyMobileRoutePrefix(pathname);
  if (normalized === '/' || normalized === '') {
    return false;
  }

  const segments = normalized.split('/').filter(Boolean);
  if (segments.length === 0) {
    return false;
  }

  const [first, second] = segments;

  if (first === 'sso' || first === 'help') {
    return false;
  }

  if (first === 'workbench') {
    return Boolean(second && isValidWorkbenchIdSegment(second));
  }

  if (NON_WORKBENCH_PATH_SEGMENTS.has(first.toLowerCase())) {
    return false;
  }

  return isValidWorkbenchIdSegment(first);
}

/** @deprecated Use isWorkbenchContentPath */
export const isViewportRoutablePath = isWorkbenchContentPath;

export function buildWorkbenchPagePath(
  workbenchId: string,
  pageId: string,
  search = '',
  pathname?: string
): string {
  const normalizedSearch =
    search && !search.startsWith('?') ? `?${search}` : search;
  const prefix = pathname?.startsWith('/workbench/') || pathname === '/workbench' ? '/workbench' : '';
  return `${prefix}/${workbenchId}/${pageId}${normalizedSearch}`;
}

export function buildWorkbenchBasePath(
  workbenchId: string,
  pathname?: string
): string {
  const prefix = pathname?.startsWith('/workbench/') || pathname === '/workbench' ? '/workbench' : '';
  return `${prefix}/${workbenchId}`;
}
