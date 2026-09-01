import { useState, useCallback } from 'react';
import i18n from 'i18next';
import { setTheme, setLanguage, setTimeZone, setSpaceId } from '@genispace/geniapp/utils';
import { normalizePinnedBuiltInNavAppsMap, type PinnedBuiltInNavAppsMap } from './userPreferencesPinnedNav';

export interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  timeZone: string;
  pinnedBuiltInNavApps?: PinnedBuiltInNavAppsMap;
}

export interface UserSettings {
  spaceId: string | null;
  preferences: UserPreferences;
}

export interface UserSettingsApiClient {
  get: (
    url: string,
    params?: Record<string, unknown>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config?: any,
  ) => Promise<{ success: boolean; data?: unknown; message?: string }>;
  put: (
    url: string,
    data?: unknown,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config?: any,
  ) => Promise<{ success: boolean; data?: unknown; message?: string }>;
}

interface UserSettingsResponseData {
  spaceId?: string | null;
  preferences?: {
    theme?: string;
    language?: string;
    timeZone?: string;
    pinnedBuiltInNavApps?: unknown;
  };
}

function normalizeTheme(raw: string | undefined): UserPreferences['theme'] {
  return raw === 'dark' ? 'dark' : 'light';
}

function resolveSpaceId(data: UserSettingsResponseData): string | null {
  return data.spaceId ?? null;
}

/**
 * Hook for managing user settings (spaceId + preferences)
 * Provides methods to get, update, and sync user settings
 */
export function useUserSettings(apiClient: UserSettingsApiClient) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get user settings from server
   */
  const getUserSettings = useCallback(async (): Promise<UserSettings | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/users/me/settings');

      if (response.success && response.data) {
        const data = response.data as UserSettingsResponseData;
        return {
          spaceId: resolveSpaceId(data),
          preferences: {
            theme: normalizeTheme(data.preferences?.theme),
            language: data.preferences?.language || 'zh',
            timeZone: data.preferences?.timeZone || 'Asia/Shanghai',
            pinnedBuiltInNavApps: normalizePinnedBuiltInNavAppsMap(data.preferences?.pinnedBuiltInNavApps),
          }
        };
      }

      throw new Error(response.message || 'Failed to fetch user settings');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user settings';
      setError(errorMessage);
      console.error('Failed to fetch user settings:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  /**
   * Update user settings on server
   * Supports partial updates
   */
  const updateUserSettings = useCallback(async (
    updates: Partial<{ spaceId: string | null; preferences: Partial<UserPreferences> }>
  ): Promise<UserSettings | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.put('/users/me/settings', updates);

      if (response.success && response.data) {
        const data = response.data as UserSettingsResponseData;
        return {
          spaceId: resolveSpaceId(data),
          preferences: {
            theme: normalizeTheme(data.preferences?.theme),
            language: data.preferences?.language || 'zh',
            timeZone: data.preferences?.timeZone || 'Asia/Shanghai',
            pinnedBuiltInNavApps: normalizePinnedBuiltInNavAppsMap(data.preferences?.pinnedBuiltInNavApps),
          }
        };
      }

      throw new Error(response.message || 'Failed to update user settings');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user settings';
      setError(errorMessage);
      console.error('Failed to update user settings:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  const syncSettings = useCallback((settings: UserSettings) => {
    // Apply theme
    if (settings.preferences.theme) {

      setTheme(settings.preferences.theme);

      // Trigger custom event for theme change
      window.dispatchEvent(new CustomEvent('localStorageChange', {
        detail: { key: 'theme', newValue: settings.preferences.theme }
      }));
    }

    // Apply language
    if (settings.preferences.language) {

      setLanguage(settings.preferences.language);
      i18n.changeLanguage(settings.preferences.language);
    }

    // Apply timeZone
    if (settings.preferences.timeZone) {

      setTimeZone(settings.preferences.timeZone);
    }

    // Apply spaceId
    if (settings.spaceId !== undefined) {

      setSpaceId(settings.spaceId);
    }
  }, []);

  /**
   * Get settings from server and sync to current application
   */
  const fetchAndSyncSettings = useCallback(async (): Promise<UserSettings | null> => {
    const settings = await getUserSettings();
    if (settings) {
      syncSettings(settings);
    }
    return settings;
  }, [getUserSettings, syncSettings]);

  return {
    loading,
    error,
    getUserSettings,
    updateUserSettings,
    syncSettings,
    fetchAndSyncSettings
  };
}
