import { useMemo } from 'react';
import { useCurrentUser } from './useCurrentUser';
import { useWorkbenchAppAccess } from './useWorkbenchAppAccess';
import { permissionManager } from '@/lib/auth/permissionManager';
import type { VisibleWhenContext } from '@/utils/visibleWhen';



export function useVisibleWhenContext(
  pageParams: Record<string, unknown> | undefined
): VisibleWhenContext {
  const { currentUser } = useCurrentUser();
  // Application-level role codes (async; [] until the access fetch resolves, after which
  // the new `appRoles` reference triggers a context rebuild and visibility re-evaluates).
  const { roles: appRoles } = useWorkbenchAppAccess();
  const spaceId =
    typeof window !== 'undefined' ? window.localStorage.getItem('activeSpaceId') : null;

  // Depend on the user's primitive fields rather than the object identity so the memo
  // stays stable even if an upstream hook ever returns a fresh user object per render.
  const userId = currentUser?.id;
  const userName = currentUser?.name;
  const userEmail = currentUser?.email;

  return useMemo(
    () => ({
      pageParams,
      user: currentUser,
      roles: {
        space: permissionManager.getCurrentSpaceRole(spaceId),
        platform: permissionManager.getPlatformRoles(),
        app: appRoles,
      },
    }),
    [pageParams, userId, userName, userEmail, spaceId, appRoles]
  );
}
