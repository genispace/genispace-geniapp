import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  setTheme, 
  getTheme, 
  setLanguage, 
  getLanguage, 
  setTimeZone, 
  getTimeZone,
  setSpaceId,
  getSpaceId,
  initializeSettings 
} from '@genispace/shared-utils';
import type { UserSettingsApiClient } from './useUserSettings';

export interface UseAppSettingsOptions {
  apiClient?: UserSettingsApiClient | null;
  userLoggedIn?: boolean;
  /**
   * Skip applying theme/language from cookies + `initializeSettings` on mount.
   * Use for iframe embed routes where the URL owns light/dark and `lang` (see chat `EmbedLayout`).
   */
  skipPersistedChromeBootstrap?: boolean;
}

function resolveSpaceIdFromSettings(data: {
  spaceId?: string | null;
}): string | null | undefined {
  return data.spaceId ?? null;
}

export function useAppSettings(options?: UseAppSettingsOptions) {
  const { apiClient, userLoggedIn = false, skipPersistedChromeBootstrap = false } = options || {};
  const { i18n } = useTranslation();

  useEffect(() => {
    if (skipPersistedChromeBootstrap) {
      return;
    }

    const cookieLang = getLanguage();

    if (cookieLang) {

      if (cookieLang !== i18n.language) {
        i18n.changeLanguage(cookieLang);
      }
    }

    initializeSettings(
      (theme) => {

        if (typeof theme === 'string' && (theme === 'light' || theme === 'dark')) {
          if (typeof document !== 'undefined') {
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(theme);
          }
        } else {
          console.warn('Invalid theme value in initializeSettings callback:', theme);
        }
      },
      (_language) => {

        void _language;
      },
      (_timeZone) => {
        void _timeZone;
      },
      (_spaceId) => {
        void _spaceId;
      }
    );
  }, [i18n, skipPersistedChromeBootstrap]);

  useEffect(() => {
    if (!userLoggedIn || !apiClient) return;

    const syncFromServer = async () => {
      try {
        const response = await apiClient.get('/users/me/settings');

        if (response.success && response.data) {
          const data = response.data as {
            spaceId?: string | null;
            preferences: { theme: string; language: string; timeZone: string };
          };
          const { preferences } = data;
          const spaceId = resolveSpaceIdFromSettings(data);

          if (preferences?.theme) {
            setTheme(preferences.theme);
          }

          if (preferences?.language) {
            setLanguage(preferences.language);
            i18n.changeLanguage(preferences.language);
          }

          if (preferences?.timeZone) {
            setTimeZone(preferences.timeZone);
          }

          if (spaceId !== undefined && spaceId !== null) {
            setSpaceId(spaceId);
          }
        }
      } catch (error) {

        console.warn('Failed to sync settings from server:', error);
      }
    };

    syncFromServer();
  }, [userLoggedIn, apiClient, i18n]);

  const toggleTheme = useCallback(async (theme?: 'light' | 'dark') => {

    let newTheme: 'light' | 'dark';
    if (theme === 'light' || theme === 'dark') {
      newTheme = theme;
    } else {
      newTheme = getTheme() === 'dark' ? 'light' : 'dark';
    }

    setTheme(newTheme);

    if (userLoggedIn && apiClient) {
      try {
        await apiClient.put('/users/me/settings', {
          preferences: { theme: newTheme }
        });
      } catch (error) {
        console.warn('Failed to sync theme to server:', error);

      }
    }
  }, [userLoggedIn, apiClient]);

  const toggleLanguage = useCallback(async (language?: string) => {
    const raw = getLanguage() || i18n.language || 'en';
    const isZh = raw === 'zh' || (typeof raw === 'string' && raw.startsWith('zh'));
    const newLang =
      typeof language === 'string' && language.trim() !== ''
        ? language.trim()
        : isZh
          ? 'en'
          : 'zh';

    setLanguage(newLang);

    i18n.changeLanguage(newLang);

    if (userLoggedIn && apiClient) {
      try {
        await apiClient.put('/users/me/settings', {
          preferences: { language: newLang }
        });
      } catch (error) {
        console.warn('Failed to sync language to server:', error);

      }
    }
  }, [userLoggedIn, apiClient, i18n]);

  const updateTimeZone = useCallback(async (timeZone: string) => {

    setTimeZone(timeZone);

    if (userLoggedIn && apiClient) {
      try {
        await apiClient.put('/users/me/settings', {
          preferences: { timeZone }
        });
      } catch (error) {
        console.warn('Failed to sync timeZone to server:', error);

      }
    }
  }, [userLoggedIn, apiClient]);

  const updateSpaceId = useCallback(async (spaceId: string | null) => {
    const oldSpaceId = getSpaceId();

    setSpaceId(spaceId);

    if (userLoggedIn && apiClient) {
      try {
        await apiClient.put('/users/me/settings', {
          spaceId
        });
      } catch (error) {
        console.warn('Failed to sync spaceId to server:', error);

      }
    }

    if (spaceId !== oldSpaceId) {
      const switchDetail = { newSpaceId: spaceId, oldSpaceId: oldSpaceId };
      window.dispatchEvent(new CustomEvent('spaceSwitched', { detail: switchDetail }));
    }
  }, [userLoggedIn, apiClient]);

  return {
    theme: getTheme(),
    language: getLanguage(),
    timeZone: getTimeZone(),
    spaceId: getSpaceId(),
    toggleTheme,
    toggleLanguage,
    updateTimeZone,
    updateSpaceId,
  };
}
