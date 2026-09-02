import { useContext, useMemo } from 'react';
import { UserContext } from '@/app/context/UserContext';

export interface CurrentUserInfo {
  id: string;
  name: string;
  email: string;
}

export function useCurrentUser() {
  const userContext = useContext(UserContext);
  const user = userContext?.user ?? null;
  const loading = Boolean(user?.isLoggedIn && !user?.id);

  // Memoized: downstream memos/effects (e.g. useVisibleWhenContext and the workbench
  // route guard) depend on a stable reference — a fresh object per render would
  // re-fire them on every render.
  const currentUser: CurrentUserInfo | null = useMemo(() => {
    if (!user || !(user.name || user.email)) {
      return null;
    }
    return {
      id: user.id || '',
      name: user.name || user.email?.split('@')[0] || 'Unknown User',
      email: user.email || ''
    };
  }, [user]);

  return {
    currentUser,
    loading,
    error: null
  };
}
