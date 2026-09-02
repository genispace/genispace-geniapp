import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserSettings, UserSettingsApiClient } from './useUserSettings';
import { setLanguage as setLanguageCookie } from '@genispace/shared-utils';
import { getHttpErrorStatus } from '../utils/unknownError';

type Language = 'zh' | 'en';

export interface UseLanguageOptions {
  apiClient?: UserSettingsApiClient | null;
}

export function useLanguage(options?: UseLanguageOptions) {
  const { apiClient } = options || {};
  const { i18n } = useTranslation();

  // Use useUserSettings hook if apiClient is provided
  // Create a dummy apiClient if not provided to avoid hook conditional call
  const dummyApiClient: UserSettingsApiClient = {
    get: async () => ({ success: false, data: null }),
    put: async () => ({ success: false, data: null })
  };
  const { fetchAndSyncSettings, updateUserSettings } = useUserSettings(apiClient || dummyApiClient);

  // Fetch language from server on mount (only once, and only if apiClient is provided)
  useEffect(() => {
    if (!apiClient) {
      return;
    }

    const fetchLanguageFromServer = async () => {
      // Check if user is logged in before making API call
      const token = localStorage.getItem('token');
      if (!token) {
        // User is not logged in, skip API call
        return;
      }

      try {
        const settings = await fetchAndSyncSettings();
        if (settings?.preferences?.language) {
          const serverLanguage = settings.preferences.language;
          const currentLanguage = i18n.language;
          if (serverLanguage !== currentLanguage) {
            i18n.changeLanguage(serverLanguage);
            setLanguageCookie(serverLanguage);
          }
        }
      } catch (error: unknown) {
        // Only log warning if it's not a 401 (unauthorized) error
        if (getHttpErrorStatus(error) !== 401) {
          console.warn('Failed to fetch language from server, using local storage:', error);
        }
        // Silently ignore 401 errors for unauthenticated users
      }
    };

    fetchLanguageFromServer();
  }, [apiClient, fetchAndSyncSettings, i18n]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'i18nextLng' && e.newValue) {
        const newLanguage = e.newValue as Language;
        if (newLanguage !== i18n.language) {
          i18n.changeLanguage(newLanguage);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail.key === 'i18nextLng' && e.detail.newValue) {
        const newLanguage = e.detail.newValue as Language;
        if (newLanguage !== i18n.language) {
          i18n.changeLanguage(newLanguage);
        }
      }
    };

    window.addEventListener('localStorageChange', handleCustomStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleCustomStorageChange as EventListener);
    };
  }, [i18n]);

  const toggleLanguage = async () => {
    const currentLang = i18n.language as Language;
    const newLang = currentLang === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
    setLanguageCookie(newLang);

    // Sync to server only if apiClient is provided and user is logged in
    if (apiClient) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          await updateUserSettings({
            preferences: { language: newLang }
          });
        } catch (error: unknown) {
          // Only log error if it's not a 401 (unauthorized) error
          if (getHttpErrorStatus(error) !== 401) {
            console.error('Failed to sync language to server:', error);
          }
          // Don't revert on error - keep the language change for better UX
          // The language is already saved to Cookie, so it will persist
        }
      }
    }
  };

  return { 
    language: i18n.language as Language, 
    toggleLanguage 
  };
}
