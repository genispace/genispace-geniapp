import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useAppSettings } from '../../../hooks/useAppSettings';
import { UserSettingsApiClient } from '../../../hooks/useUserSettings';

export interface ThemeToggleProps {
  /**
   * Optional API client for server synchronization.
   * If provided, theme changes will be synced to the server.
   * If not provided, theme changes will only be stored locally.
   */
  apiClient?: UserSettingsApiClient | null;
  /**
   * Additional CSS class names to apply to the button
   */
  className?: string;
}

/**
 * ThemeToggle component for switching between light and dark themes.
 * 
 * This component uses the `useAppSettings` hook from shared-ui to manage theme state
 * and optionally sync with the server if an `apiClient` is provided.
 * Settings are automatically synced across subdomains via Cookie.
 * 
 * @example
 * ```tsx
 * // Without server sync (local only)
 * <ThemeToggle />
 * 
 * // With server sync
 * import apiClient from '@/lib/api/apiClient';
 * <ThemeToggle apiClient={apiClient} />
 * ```
 */
export function ThemeToggle({ apiClient, className }: ThemeToggleProps) {

  const userLoggedIn = typeof localStorage !== 'undefined' && !!localStorage.getItem('token');
  const { theme, toggleTheme } = useAppSettings({ apiClient, userLoggedIn });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    toggleTheme();
  };

  return (
    <button
      onClick={handleClick}
      className={`p-2 rounded-lg hover:bg-surface-darker/10 dark:hover:bg-surface/10 flex items-center gap-1 text-content dark:text-content-dark ${className || ''}`}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-current" />
      ) : (
        <Moon className="w-5 h-5 text-current" />
      )}
    </button>
  );
}
