import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LOGOUT_COMPLETED_MESSAGE } from '@genispace/shared-utils';

const AUTH_STORAGE_KEYS = ['token', 'refreshToken', 'user'];

/**
 * Front-channel logout receiver. Every app mounts this at
 * `/logout-notification`; sign-out in any app loads it in a hidden iframe
 * (see `broadcastLogoutNotifications` in shared-utils) so this origin's auth
 * storage is cleared too. Open tabs on this origin pick the change up via the
 * native cross-context `storage` event (`useAuthTokenSync` / `RequireAuth`).
 */
export function LogoutNotificationPage() {
  const { t } = useTranslation('common');

  useEffect(() => {
    for (const key of AUTH_STORAGE_KEYS) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
      try {
        window.dispatchEvent(new CustomEvent('localStorageChange', { detail: { key } }));
      } catch {
        /* ignore */
      }
    }

    if (window.parent && window.parent !== window) {
      window.parent.postMessage(LOGOUT_COMPLETED_MESSAGE, '*');
    }
  }, []);

  return (
    <div className="flex h-screen items-center justify-center bg-white dark:bg-neutral-950">
      <div className="text-center text-sm text-neutral-600 dark:text-neutral-400">
        {t('logout_notification.processing', 'Processing logout notification...')}
      </div>
    </div>
  );
}
