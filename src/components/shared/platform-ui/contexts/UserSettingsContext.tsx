import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useUserSettings, UserSettings, UserPreferences, UserSettingsApiClient } from '../hooks/useUserSettings';

interface UserSettingsContextType {
  settings: UserSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (updates: Partial<{ spaceId: string | null; preferences: Partial<UserPreferences> }>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const UserSettingsContext = createContext<UserSettingsContextType | undefined>(undefined);

export interface UserSettingsProviderProps {
  apiClient: UserSettingsApiClient;
  user?: { isLoggedIn?: boolean } | null;
  children: ReactNode;
}

export const UserSettingsProvider: React.FC<UserSettingsProviderProps> = ({
  apiClient,
  user,
  children
}) => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const { loading, error, updateUserSettings, syncSettings, fetchAndSyncSettings } = useUserSettings(apiClient);

  // Fetch and sync settings on mount and when user logs in
  useEffect(() => {
    if (user?.isLoggedIn) {
      fetchAndSyncSettings().then((fetchedSettings) => {
        if (fetchedSettings) {
          setSettings(fetchedSettings);
        }
      });
    } else {
      // Clear settings when user logs out
      setSettings(null);
    }
  }, [user?.isLoggedIn, fetchAndSyncSettings]);

  // Update settings
  const updateSettings = useCallback(async (
    updates: Partial<{ spaceId: string | null; preferences: Partial<UserPreferences> }>
  ) => {
    try {
      const updatedSettings = await updateUserSettings(updates);
      if (updatedSettings) {
        setSettings(updatedSettings);
        syncSettings(updatedSettings);
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
      throw err;
    }
  }, [updateUserSettings, syncSettings]);

  // Refresh settings from server
  const refreshSettings = useCallback(async () => {
    const fetchedSettings = await fetchAndSyncSettings();
    if (fetchedSettings) {
      setSettings(fetchedSettings);
    }
  }, [fetchAndSyncSettings]);

  return (
    <UserSettingsContext.Provider
      value={{
        settings,
        loading,
        error,
        updateSettings,
        refreshSettings
      }}
    >
      {children}
    </UserSettingsContext.Provider>
  );
};

export const useUserSettingsContext = () => {
  const context = useContext(UserSettingsContext);
  if (context === undefined) {
    throw new Error('useUserSettingsContext must be used within a UserSettingsProvider');
  }
  return context;
};
