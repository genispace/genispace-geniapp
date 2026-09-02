import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { permissionManager } from '@/lib/auth/permissionManager';
import { getSpaceId } from '@genispace/shared-utils';

interface PermissionContextType {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  currentSpaceId: string | null;
  hasSpacePermission: (permission: string, spaceId?: string) => boolean;
  hasPlatformPermission: (permission: string) => boolean;
  setCurrentSpaceId: (spaceId: string | null) => void;
  initialize: () => Promise<void>;
  loadSpacePermissions: (spaceId: string) => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | null>(null);

interface PermissionProviderProps {
  children: ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const { t } = useTranslation('common');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSpaceId, setCurrentSpaceIdState] = useState<string | null>(null);

  const initialize = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await permissionManager.initialize();

      setIsInitialized(true);
    } catch (err) {
      console.error('PermissionProvider: 权限初始化失败', err);
      setError(err instanceof Error ? err.message : t('errors.permission_init_failed', 'Permission initialization failed'));
      setIsInitialized(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSpacePermissions = async (spaceId: string) => {
    try {
      setError(null);

      await permissionManager.loadSpacePermissions(spaceId);
    } catch (err) {
      console.error(` PermissionProvider: 空间 ${spaceId} 权限加载失败`, err);
      setError(err instanceof Error ? err.message : t('errors.space_permission_load_failed', 'Failed to load space permissions'));
    }
  };

  useEffect(() => {

    const checkInitializedState = () => {
      const permissionData = localStorage.getItem('userPermissions');
      if (permissionData) {
        try {
          const data = JSON.parse(permissionData);
          if (data.isInitialized) {
            setIsInitialized(true);
          }
        } catch {
          console.warn(' PermissionProvider: localStorage 权限数据解析失败');
        }
      }
    };

    const handlePermissionsInitialized = () => {
      setIsInitialized(true);
    };

    checkInitializedState();

    window.addEventListener('permissionsInitialized', handlePermissionsInitialized);

    return () => {
      window.removeEventListener('permissionsInitialized', handlePermissionsInitialized);
    };
  }, []);

  const hasSpacePermission = (permission: string, spaceId?: string): boolean => {
    if (!isInitialized) return false;
    const targetSpaceId = spaceId || currentSpaceId;
    if (!targetSpaceId) return false;
    return permissionManager.hasSpacePermission(targetSpaceId, permission);
  };

  const hasPlatformPermission = (permission: string): boolean => {
    if (!isInitialized) return false;
    return permissionManager.hasPlatformPermission(permission);
  };

  const updateCurrentSpaceId = (spaceId: string | null) => {
    setCurrentSpaceIdState(spaceId);
  };

  const value: PermissionContextType = {
    isInitialized,
    isLoading,
    error,
    currentSpaceId,
    hasSpacePermission,
    hasPlatformPermission,
    setCurrentSpaceId: updateCurrentSpaceId,
    initialize,
    loadSpacePermissions
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}

export function useSpacePermissions() {
  const permissions = usePermissions();

  const fallbackSpaceId = getSpaceId() || undefined;

  useEffect(() => {
    const handleSpaceSwitched = async (event: Event) => {
      const customEvent = event as CustomEvent<{ newSpaceId: string }>;
      const { newSpaceId } = customEvent.detail;

      if (newSpaceId) {

        permissions.setCurrentSpaceId(newSpaceId);

        try {
          await permissions.loadSpacePermissions(newSpaceId);
        } catch (error) {
          console.error('PermissionContext: 空间权限加载失败', error);
        }
      }
    };

    window.addEventListener('spaceSwitched', handleSpaceSwitched);

    return () => {
      window.removeEventListener('spaceSwitched', handleSpaceSwitched);
    };
  }, [permissions]);

  useEffect(() => {
    if (fallbackSpaceId && fallbackSpaceId !== permissions.currentSpaceId) {
      permissions.setCurrentSpaceId(fallbackSpaceId);
    }
  }, [fallbackSpaceId, permissions.currentSpaceId, permissions.setCurrentSpaceId]);

  return {
    ...permissions,
    hasPermission: (permission: string) => {
      return permissions.hasSpacePermission(permission, fallbackSpaceId);
    },
  };
}

export default PermissionContext;
