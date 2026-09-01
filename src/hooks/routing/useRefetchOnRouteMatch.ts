import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

function normalizePath(p: string): string {
  const t = p.replace(/\/$/, '');
  return t || '/';
}

/** True when pathname is exactly the list route (not `/list/new` or `/list/:id`). */
export function isListRoutePath(pathname: string, listPath: string): boolean {
  return normalizePath(pathname) === normalizePath(listPath);
}

/**
 * Refetch list data when the user is on the list route (including returning from a FormPage).
 */
export function useRefetchOnRouteMatch(
  listPath: string,
  load: () => void | Promise<void>
): void {
  const { pathname } = useLocation();
  const loadRef = useRef(load);
  loadRef.current = load;
  const onList = isListRoutePath(pathname, listPath);

  useEffect(() => {
    if (!onList) return;
    void loadRef.current();
  }, [onList, pathname, listPath]);
}
