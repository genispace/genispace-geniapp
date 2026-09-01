import { useEffect } from 'react';

export function useAuthTokenSync(
  user: { isLoggedIn?: boolean } | null,
  setUser: (user: null) => void
): void {
  useEffect(() => {
    const syncState = () => {
      const currentToken = localStorage.getItem('token');
      const currentUser = localStorage.getItem('user');
      if (!currentToken && !currentUser && user?.isLoggedIn) {
        setUser(null);
      }
    };

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ key: string }>;
      const key = customEvent.detail?.key;
      if (key === 'token' || key === 'user') {
        syncState();
      }
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (
        (e.key === 'token' && !e.newValue) ||
        (e.key === 'user' && !e.newValue)
      ) {
        syncState();
      }
    };

    const timer = setInterval(syncState, 1000);

    window.addEventListener('localStorageChange', handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener('localStorageChange', handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
      clearInterval(timer);
    };
  }, [user, setUser]);
}
