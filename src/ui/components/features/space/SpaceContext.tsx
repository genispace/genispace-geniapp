import React, { createContext, useState, useEffect, ReactNode, useCallback, useContext, startTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { setSpaceId, getSpaceId } from '@genispace/geniapp/utils';
import { normalizeSpaceSettings, type SpaceSettings } from '@genispace/geniapp/utils';
import i18n from 'i18next';

// Define subscription plan type
export type SubscriptionPlan = 'FREE' | 'PERSONAL' | 'PRO' | 'TEAM' | 'ENTERPRISE';

// Define space owner information
export interface SpaceOwner {
  id: string;
  name: string;
  email: string;
  subscriptionPlan: SubscriptionPlan;
  subscriptionExpiry: string;
}

// Define space type
export interface Space {
  id: string;
  name: string;
  description: string;
  type: 'personal' | 'collaborative';
  role?: 'owner' | 'admin' | 'member' | 'viewer';
  memberCount?: number;
  createdAt: string;
  updatedAt?: string;
  avatar?: string | null;
  members?: SpaceMember[];
  currentUserRole?: string;
  owner?: SpaceOwner;
  subscriptionPlan?: SubscriptionPlan;  // For quick access
  settings?: SpaceSettings;
  resources?: {
    total: number;
    agents: number;
    operators: number;
    knowledgeBases: number;
    tasks: number;
  }
}

export interface SpaceMember {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: string;
  roleName?: string; 
  joinedAt?: string;
  status?: string;
  lastActive?: string | null;
}

export const roleColors = {
  OWNER: 'bg-brand-primary/10 text-brand-primary dark:bg-brand-primary/20 dark:text-neutral-300',
  ADMINISTRATOR: 'bg-brand-primary/10 text-brand-primary dark:bg-brand-primary/20 dark:text-neutral-300',
  ADMIN: 'bg-neutral-100 text-ink-dark dark:bg-neutral-900/50 dark:text-neutral-300',
  MEMBER: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  VIEWER: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',

  // Compatible with lowercase role names
  owner: 'bg-brand-primary/10 text-brand-primary dark:bg-brand-primary/20 dark:text-neutral-300',
  admin: 'bg-neutral-100 text-ink-dark dark:bg-neutral-900/50 dark:text-neutral-300',
  member: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  viewer: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
};

// Role Chinese name mapping - using translation function
export const useRoleNames = () => {
  const { t } = useTranslation('common');

  return {
    OWNER: t('roles.owner', 'Owner'),
    ADMINISTRATOR: t('roles.administrator', 'Administrator'),
    ADMIN: t('roles.admin', 'Admin'),
    MEMBER: t('roles.member', 'Member'),
    VIEWER: t('roles.viewer', 'Viewer'),

    // Compatible with lowercase role names
    owner: t('roles.owner', 'Owner'),
    administrator: t('roles.administrator', 'Administrator'),
    member: t('roles.member', 'Member'),
    viewer: t('roles.viewer', 'Viewer')
  };
};

// Get role display name (utility function)
export const getRoleName = (role: string, language?: string): string => {
  const lowerRole = role.toLowerCase();

  // Only use i18n if it's initialized
  if (i18n.isInitialized) {
    // Try common.space.roles / common.team.roles (legacy)
    const commonSpaceKey = `common.space.roles.${lowerRole}`;
    const commonSpaceTranslated = i18n.t(commonSpaceKey);
    if (commonSpaceTranslated && commonSpaceTranslated !== commonSpaceKey) {
      return commonSpaceTranslated;
    }
    const commonTranslationKey = `common.team.roles.${lowerRole}`;
    const commonTranslated = i18n.t(commonTranslationKey);
    if (commonTranslated && commonTranslated !== commonTranslationKey) {
      return commonTranslated;
    }

    // Try console.roles namespace (e.g., 'console.roles.owner')
    const consoleTranslationKey = `console.roles.${lowerRole}`;
    const consoleTranslated = i18n.t(consoleTranslationKey);
    if (consoleTranslated && consoleTranslated !== consoleTranslationKey) {
      return consoleTranslated;
    }

    const spaceTranslationKey = `space.roles.${lowerRole}`;
    const spaceTranslated = i18n.t(spaceTranslationKey);
    if (spaceTranslated && spaceTranslated !== spaceTranslationKey) {
      return spaceTranslated;
    }

    // Try team.roles namespace with lowercase key (legacy)
    const teamTranslationKey = `team.roles.${lowerRole}`;
    const teamTranslated = i18n.t(teamTranslationKey);
    if (teamTranslated && teamTranslated !== teamTranslationKey) {
      return teamTranslated;
    }

    // Try team.roles namespace with uppercase key (some translation files use uppercase)
    const teamTranslationKeyUpper = `team.roles.${role}`;
    const teamTranslatedUpper = i18n.t(teamTranslationKeyUpper);
    if (teamTranslatedUpper && teamTranslatedUpper !== teamTranslationKeyUpper) {
      return teamTranslatedUpper;
    }
  }

  // Fallback to hardcoded map if translation not found or i18n not ready
  const roleNameMap: Record<string, Record<string, string>> = {
    en: {
      OWNER: 'Owner',
      ADMINISTRATOR: 'Administrator',
      ADMIN: 'Admin',
      MEMBER: 'Member',
      VIEWER: 'Viewer',
      owner: 'Owner',
      administrator: 'Administrator',
      admin: 'Admin',
      member: 'Member',
      viewer: 'Viewer'
    },
    zh: {
      OWNER: '所有者',
      ADMINISTRATOR: '管理员',
      ADMIN: '管理员',
      MEMBER: '成员',
      VIEWER: '查看者',
      owner: '所有者',
      administrator: '管理员',
      admin: '管理员',
      member: '成员',
      viewer: '查看者'
    }
  };

  // Use English as fallback if language not provided or not found
  const currentLanguage = language || i18n.language || 'en';
  const langMap = roleNameMap[currentLanguage] || roleNameMap.en;
  return langMap[role] || langMap[lowerRole] || role;
};

// Get role display name (English version for utility functions)
export const getRoleNameEn = (role: string): string => {
  const roleNameMap = {
    OWNER: 'Owner',
    ADMINISTRATOR: 'Administrator',
    ADMIN: 'Admin',
    MEMBER: 'Member',
    VIEWER: 'Viewer',
    owner: 'Owner',
    admin: 'Admin',
    member: 'Member',
    viewer: 'Viewer'
  };
  return roleNameMap[role as keyof typeof roleNameMap] || role;
};

// Get role style class
export const getRoleClass = (role: string): string => {
  return roleColors[role as keyof typeof roleColors] || '';
};

// Get space icon type (based on subscription version)
export const getSpaceIconType = (space: Space): 'personal' | 'personal-pro' | 'space' | 'enterprise' => {
  const subscriptionPlan = space.subscriptionPlan || space.owner?.subscriptionPlan;

  if (space.type === 'personal') {
    return subscriptionPlan === 'PRO' ? 'personal-pro' : 'personal';
  }

  if (subscriptionPlan === 'ENTERPRISE') {
    return 'enterprise';
  }

  return 'space';
};

// Get space icon color style
export const getSpaceIconStyle = (space: Space): string => {
  const iconType = getSpaceIconType(space);

  switch (iconType) {
    case 'personal':
      return 'bg-neutral-100 dark:bg-neutral-900/30 text-brand-primary dark:text-neutral-400';
    case 'personal-pro':
      return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
    case 'space':
      return 'bg-neutral-100 dark:bg-neutral-900/30 text-brand-primary dark:text-neutral-400';
    case 'enterprise':
      return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400';
    default:
      return 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400';
  }
};

// API Client interface
export interface SpaceApiClient {
  get: (
    url: string,
    params?: Record<string, unknown>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config?: any,
  ) => Promise<{ success: boolean; data: unknown; message?: string }>;
  post: (
    url: string,
    data?: unknown,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config?: any,
  ) => Promise<{ success: boolean; data: unknown; message?: string }>;
  put: (
    url: string,
    data?: unknown,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config?: any,
  ) => Promise<{ success: boolean; data: unknown; message?: string }>;
}

// Define context type
interface SpaceContextType {
  spaces: Space[];
  /** @deprecated Use `spaces` — compat alias until Phase 7 */
  teams: Space[];
  currentSpace: Space | null;
  spaceMembers: SpaceMember[];
  loading: boolean;
  isSwitchingSpace: boolean;
  error: string | null;
  fetchSpaces: () => Promise<void>;
  switchSpace: (space: Space, options?: { skipNavigation?: boolean }) => Promise<void>;
  fetchSpaceMembers: (spaceId: string) => Promise<void>;
  updateCurrentSpaceSettings: (settings: SpaceSettings) => void;
}

function spaceSettingsEqual(a?: SpaceSettings, b?: SpaceSettings): boolean {
  return JSON.stringify(normalizeSpaceSettings(a)) === JSON.stringify(normalizeSpaceSettings(b));
}

// Create context
export const SpaceContext = createContext<SpaceContextType | undefined>(undefined);

// SpaceProvider props
export interface SpaceProviderProps {
  apiClient: SpaceApiClient;
  user?: { isLoggedIn?: boolean } | null;
  onNavigate?: (path: string, options?: { replace?: boolean }) => void;
  onSpaceSwitch?: (spaceId: string) => void | Promise<void>;
  spaceSwitchRedirectPath?: string; 
  children: ReactNode;
}

// Create provider component
export const SpaceProvider: React.FC<SpaceProviderProps> = ({ 
  apiClient, 
  user,
  onNavigate,
  onSpaceSwitch,
  spaceSwitchRedirectPath = '/dashboard?from=space-switch',
  children 
}) => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [currentSpace, setCurrentSpace] = useState<Space | null>(null);
  const [spaceMembers, setSpaceMembers] = useState<SpaceMember[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isSwitchingSpace, setIsSwitchingSpace] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation('common');

  const currentSpaceRef = React.useRef<Space | null>(null);

  useEffect(() => {
    currentSpaceRef.current = currentSpace;
  }, [currentSpace]);

  const fetchSpaceMembers = useCallback(async (spaceId: string) => {
    if (!spaceId) return;

    try {
      const detailsResponse = await apiClient.get(`/spaces/${spaceId}`);

      if (detailsResponse.success && detailsResponse.data) {
        const spaceData = detailsResponse.data as Space;

        const processedSpace: Space = {
          ...spaceData,
          role: spaceData.currentUserRole?.toLowerCase() as Space['role'],
          memberCount: spaceData.members?.length || 0,
          subscriptionPlan: spaceData.subscriptionPlan || spaceData.owner?.subscriptionPlan
        };

        const processedWithSettings: Space = {
          ...processedSpace,
          settings: normalizeSpaceSettings(processedSpace.settings),
        };

        const current = currentSpaceRef.current;
        if (!current ||
            current.id !== processedWithSettings.id ||
            current.name !== processedWithSettings.name ||
            current.role !== processedWithSettings.role ||
            current.memberCount !== processedWithSettings.memberCount ||
            current.subscriptionPlan !== processedWithSettings.subscriptionPlan ||
            !spaceSettingsEqual(current.settings, processedWithSettings.settings)) {
          setCurrentSpace(processedWithSettings);
        }

        if (spaceData.members) {
          setSpaceMembers((prev) => {
            if (
              prev.length === spaceData.members!.length &&
              prev.every((member, index) => member.id === spaceData.members![index].id)
            ) {
              return prev;
            }
            return spaceData.members!;
          });
        }
      } else {
        setError(t('errors.fetch_space_details_failed', 'Failed to fetch space details'));
      }
    } catch (err) {
      console.error('Failed to fetch space details:', err);
      setError(t('errors.fetch_space_details_error', 'Error occurred while fetching space details'));
    }
  }, [apiClient, t]);

  const fetchSpaceMembersRef = React.useRef(fetchSpaceMembers);
  useEffect(() => {
    fetchSpaceMembersRef.current = fetchSpaceMembers;
  }, [fetchSpaceMembers]);

  // Get space list
  const fetchSpaces = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/spaces');

      if (response.success && response.data) {
        const spacesWithSubscription = (response.data as Space[]).map(space => ({
          ...space,
          subscriptionPlan: space.subscriptionPlan || space.owner?.subscriptionPlan
        }));

        setSpaces(spacesWithSubscription);

        const currentSpaceValue = currentSpaceRef.current;
        if (currentSpaceValue) {
          const refreshedCurrent = spacesWithSubscription.find((space) => space.id === currentSpaceValue.id);
          if (refreshedCurrent && (
            refreshedCurrent.name !== currentSpaceValue.name ||
            refreshedCurrent.memberCount !== currentSpaceValue.memberCount ||
            refreshedCurrent.subscriptionPlan !== currentSpaceValue.subscriptionPlan ||
            !spaceSettingsEqual(currentSpaceValue.settings, refreshedCurrent.settings)
          )) {
            setCurrentSpace({
              ...currentSpaceValue,
              ...refreshedCurrent,
              role: currentSpaceValue.role ?? refreshedCurrent.role,
              settings: normalizeSpaceSettings(refreshedCurrent.settings),
            });
          }
        }

        const currentSpaceStillExists = currentSpaceValue && spacesWithSubscription.some(space => space.id === currentSpaceValue.id);

        if ((!currentSpaceValue || !currentSpaceStillExists) && spacesWithSubscription.length > 0) {
        // Try to get spaceId from server settings first
        let activeSpace = null;
        try {
          const settingsResponse = await apiClient.get('/users/me/settings');
          const settingsData = settingsResponse.data as { spaceId?: string } | undefined;
          const resolvedSpaceId = settingsData?.spaceId;
          if (settingsResponse.success && resolvedSpaceId) {
            activeSpace = spacesWithSubscription.find(space => space.id === resolvedSpaceId);

            if (activeSpace) {
              setSpaceId(activeSpace.id);
            }
          }
        } catch (err) {
          console.warn('Failed to fetch spaceId from server settings, falling back to Cookie:', err);
        }

        // Fallback to Cookie if server fetch failed
        if (!activeSpace) {
          const savedSpaceId = getSpaceId();
          if (savedSpaceId) {
            activeSpace = spacesWithSubscription.find(space => space.id === savedSpaceId);
            if (!activeSpace) {
              console.warn(` ${t('logs.saved_space_id_invalid', 'Saved space ID is invalid, will select default space')} ${savedSpaceId}`);
              setSpaceId(null);
            }
          }
        }

        // Default to personal space or first space
        if (!activeSpace) {
          activeSpace = spacesWithSubscription.find(space => space.type === 'personal') || spacesWithSubscription[0];
        }

        setCurrentSpace(activeSpace);

        setSpaceId(activeSpace.id);

        // Sync spaceId to server if it's different
        if (activeSpace.id !== currentSpaceValue?.id) {
          try {
            await apiClient.put('/users/me/settings', { spaceId: activeSpace.id });
          } catch (err) {
            console.warn('Failed to sync spaceId to server:', err);
          }
        }

        const switchDetail = {
          newSpaceId: activeSpace.id,
          oldSpaceId: currentSpaceValue?.id || null,
          spaceInfo: {
            id: activeSpace.id,
            name: activeSpace.name,
            type: activeSpace.type,
            subscriptionPlan: activeSpace.subscriptionPlan || activeSpace.owner?.subscriptionPlan
          }
        };
        window.dispatchEvent(new CustomEvent('spaceSwitched', { detail: switchDetail }));

        fetchSpaceMembersRef.current(activeSpace.id);
        }
      } else {
        setError(t('errors.fetch_spaces_failed', 'Failed to fetch spaces'));
      }
    } catch (err) {
      console.error('Failed to fetch spaces:', err);
      setError(t('errors.fetch_spaces_error', 'Error occurred while fetching space list'));
    } finally {
      setLoading(false);
    }
  }, [apiClient, t]);

  const updateCurrentSpaceSettings = useCallback((settings: SpaceSettings) => {
    const normalized = normalizeSpaceSettings(settings);
    const spaceId = currentSpaceRef.current?.id;
    if (!spaceId) return;

    setCurrentSpace((prev) => (prev ? { ...prev, settings: normalized } : prev));
    setSpaces((prev) =>
      prev.map((space) => (space.id === spaceId ? { ...space, settings: normalized } : space)),
    );
  }, []);

  // Switch current space
  const switchSpace = useCallback(async (space: Space, options?: { skipNavigation?: boolean }) => {
    const previousSpace = currentSpace;

    try {
      setIsSwitchingSpace(true);
      setError(null);

      // Use new unified settings API
      const response = await apiClient.put('/users/me/settings', {
        spaceId: space.id
      });

      if (response.success && response.data) {
        // Load permissions before updating UI so permission checks during render do not race.
        if (onSpaceSwitch) {
          try {
            await onSpaceSwitch(space.id);
          } catch (permError) {
            console.warn(` ${t('logs.permissions_update_failed', 'Permission manager update failed')}:`, permError);
          }
        }

        setCurrentSpace(space);

        setSpaceId(space.id);

        const switchDetail = {
          newSpaceId: space.id,
          oldSpaceId: previousSpace?.id,
          spaceInfo: {
            id: space.id,
            name: space.name,
            type: space.type,
            subscriptionPlan: space.subscriptionPlan || space.owner?.subscriptionPlan
          }
        };
        window.dispatchEvent(new CustomEvent('spaceSwitched', { detail: switchDetail }));

        await fetchSpaceMembers(space.id);

        if (!options?.skipNavigation && onNavigate) {
          setTimeout(() => {
            onNavigate(spaceSwitchRedirectPath, { replace: true });
          }, 100);
        }

      } else {
        if (previousSpace) {
          setCurrentSpace(previousSpace);
        }
        const errorMessage = response.message || t('errors.switch_space_failed', 'Failed to switch space');
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err: unknown) {
      console.error(` ${t('errors.switch_space_failed', 'Failed to switch space')}:`, err);

      if (previousSpace) {
        setCurrentSpace(previousSpace);
        setSpaceId(previousSpace.id);
      }

      const ax = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMessage =
        ax.response?.data?.message ||
        ax.message ||
        t('errors.switch_space_error', 'Error occurred while switching space, please try again');
      setError(errorMessage);

      window.dispatchEvent(new CustomEvent('spaceSwitchError', {
        detail: {
          error: errorMessage,
          spaceId: space.id,
          spaceName: space.name
        }
      }));

      throw err;
    } finally {
      setIsSwitchingSpace(false);
    }
  }, [apiClient, currentSpace, t, fetchSpaceMembers, onSpaceSwitch, onNavigate, spaceSwitchRedirectPath]);

  // Get space list on initialization
  useEffect(() => {
    if (user?.isLoggedIn) {

      startTransition(() => {
        fetchSpaces();
      });
    }
  }, [user?.isLoggedIn, fetchSpaces]);

  // Keep every SpaceProvider instance in sync when any layer switches space.
  useEffect(() => {
    const handleSpaceSwitched = (event: Event) => {
      const { newSpaceId } = (event as CustomEvent<{ newSpaceId?: string }>).detail;
      if (!newSpaceId || currentSpaceRef.current?.id === newSpaceId) {
        return;
      }

      const targetSpace = spaces.find((space) => space.id === newSpaceId);
      if (targetSpace) {
        setCurrentSpace(targetSpace);
        setSpaceId(newSpaceId);
        void fetchSpaceMembers(newSpaceId);
      }
    };

    window.addEventListener('spaceSwitched', handleSpaceSwitched);

    return () => {
      window.removeEventListener('spaceSwitched', handleSpaceSwitched);
    };
  }, [spaces, fetchSpaceMembers]);

  // Event listener for invalid space detection
  useEffect(() => {
    const handleInvalidSpace = (event: CustomEvent) => {
      const { invalidSpaceId } = event.detail;
      console.warn(` ${t('logs.invalid_space_detected', 'Invalid space ID detected, attempting to switch to valid space')}: ${invalidSpaceId}`);

      if (currentSpace?.id === invalidSpaceId && spaces.length > 0) {
        const validSpace = spaces.find(space => space.type === 'collaborative') || spaces[0];
        if (validSpace && validSpace.id !== invalidSpaceId) {
          switchSpace(validSpace);
        }
      }
    };

    window.addEventListener('invalidSpaceDetected', handleInvalidSpace as EventListener);

    return () => {
      window.removeEventListener('invalidSpaceDetected', handleInvalidSpace as EventListener);
    };
  }, [currentSpace, spaces, switchSpace, t]);

  return (
    <SpaceContext.Provider value={{
      spaces,
      teams: spaces,
      currentSpace,
      spaceMembers,
      loading,
      isSwitchingSpace,
      error,
      fetchSpaces,
      switchSpace,
      fetchSpaceMembers,
      updateCurrentSpaceSettings,
    }}>
      {children}
    </SpaceContext.Provider>
  );
};

// Create custom hook for easy context usage
export const useSpace = () => {
  const context = useContext(SpaceContext);
  if (context === undefined) {
    throw new Error('useSpace must be used within a SpaceProvider');
  }
  return context;
};
