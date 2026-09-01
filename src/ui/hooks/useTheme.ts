import { useState, useEffect } from 'react';
import { useUserSettings, UserSettingsApiClient } from './useUserSettings';
import { getTheme, setTheme as setThemeCookie } from '@genispace/geniapp/utils';
import { getHttpErrorStatus } from '../utils/unknownError';

type Theme = 'light' | 'dark';

export interface UseThemeOptions {
  apiClient?: UserSettingsApiClient | null;
}

export function useTheme(options?: UseThemeOptions) {
  const { apiClient } = options || {};
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = getTheme() as Theme;
      return savedTheme || 'light';
    }
    return 'light';
  });

  // Use useUserSettings hook if apiClient is provided
  // Create a dummy apiClient if not provided to avoid hook conditional call
  const dummyApiClient: UserSettingsApiClient = {
    get: async () => ({ success: false, data: null }),
    put: async () => ({ success: false, data: null })
  };
  const { fetchAndSyncSettings, updateUserSettings } = useUserSettings(apiClient || dummyApiClient);

  // Fetch theme from server on mount (only once, and only if apiClient is provided)
  useEffect(() => {
    if (!apiClient) {
      return;
    }

    const fetchThemeFromServer = async () => {
      // Check if user is logged in before making API call
      const token = localStorage.getItem('token');
      if (!token) {
        // User is not logged in, skip API call
        return;
      }

      try {
        const settings = await fetchAndSyncSettings();
        if (settings?.preferences?.theme) {
          const serverTheme = settings.preferences.theme;
          const currentTheme = (getTheme() as Theme) || 'light';
          if (serverTheme !== currentTheme) {
            setTheme(serverTheme);
          }
        }
      } catch (error: unknown) {
        // Only log warning if it's not a 401 (unauthorized) error
        if (getHttpErrorStatus(error) !== 401) {
          console.warn('Failed to fetch theme from server, using Cookie:', error);
        }
        // Silently ignore 401 errors for unauthenticated users
      }
    };

    fetchThemeFromServer();
  }, [apiClient, fetchAndSyncSettings]);

  // Apply theme to DOM and Cookie
  useEffect(() => {
    setThemeCookie(theme);
  }, [theme]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue) {
        const newTheme = e.newValue as Theme;
        if (newTheme !== theme) {
          setTheme(newTheme);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail.key === 'theme' && e.detail.newValue) {
        const newTheme = e.detail.newValue as Theme;
        if (newTheme !== theme) {
          setTheme(newTheme);
        }
      }
    };

    window.addEventListener('localStorageChange', handleCustomStorageChange as EventListener);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const isDark = document.documentElement.classList.contains('dark');
          const currentTheme: Theme = isDark ? 'dark' : 'light';
          if (currentTheme !== theme) {
            setTheme(currentTheme);
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleCustomStorageChange as EventListener);
      observer.disconnect();
    };
  }, [theme]);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);

    // Sync to server only if apiClient is provided and user is logged in
    if (apiClient) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          await updateUserSettings({
            preferences: { theme: newTheme }
          });
        } catch (error: unknown) {
          // Only log error if it's not a 401 (unauthorized) error
          if (getHttpErrorStatus(error) !== 401) {
            console.error('Failed to sync theme to server:', error);
          }
          // Don't revert on error - keep the theme change for better UX
          // The theme is already saved to localStorage, so it will persist
        }
      }
    }
  };

  return { theme, toggleTheme };
}
