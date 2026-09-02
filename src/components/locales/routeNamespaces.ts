import { namespacesForPath, type RouteLocaleRule } from '@genispace/shared-utils';
import type { Namespace } from './types';

const WORKBENCH_AREA_NS: Namespace[] = [
  'workbench',
  'editor',
  'editMode',
  'workbenchApi',
  'spaceSwitchSuccess',
  'spaceContext',
  'permissions',
  'form',
  'task',
  'execution',
  'file',
  'apiKey',
  'configMap',
  'renderers',
];

export const ROUTE_LOCALE_RULES: RouteLocaleRule[] = [
  { prefix: '/workbench', namespaces: WORKBENCH_AREA_NS },
  { prefix: '/help', namespaces: ['editor', 'common', 'renderers'] },
  { prefix: '/sso', namespaces: ['common'] },
];

export function prefetchNamespacesForWorkbenchPath(pathname: string): string[] {
  const fromRules = namespacesForPath(pathname, ROUTE_LOCALE_RULES);
  if (fromRules.length > 0) {
    return fromRules;
  }
  const p = pathname;
  if (
    p !== '/' &&
    !p.startsWith('/sso') &&
    !p.startsWith('/workbench') &&
    /^\/[^/]+/.test(p)
  ) {
    return [...WORKBENCH_AREA_NS];
  }
  return [];
}
