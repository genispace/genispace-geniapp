import { setSpaceId } from '@genispace/shared-utils';

export type SubscriptionPlan = 'FREE' | 'PERSONAL' | 'PRO' | 'TEAM' | 'ENTERPRISE';

export const TeamRoles = {
  OWNER: 'OWNER',
  ADMINISTRATOR: 'ADMINISTRATOR', 
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER'
} as const;

export type TeamRole = typeof TeamRoles[keyof typeof TeamRoles];

export interface TeamOwner {
  id: string;
  name: string;
  email: string;
  subscriptionPlan: SubscriptionPlan;
  subscriptionExpiry: string;
}

export interface TeamInfo {
  id: string;
  name: string;
  type: 'personal' | 'collaborative';
  subscriptionPlan?: SubscriptionPlan;
  owner?: TeamOwner;
  role?: string;
}

export interface UserPermissions {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isPartner: boolean;
  partner: {
    id: string;
    name: string;
    type: string;
    tier: string;
  } | null;
}

interface SpacePermissions {
  spaceId: string;
  role: string; 
  permissions: string[]; 
  canManageRoles: boolean;
}

interface PlatformPermissions {
  roles: string[]; 
  permissions: string[]; 
}

interface PermissionData {
  platform: PlatformPermissions | null;
  teams: Record<string, SpacePermissions>;
  isInitialized: boolean;
}

class PermissionManager {

  private data: PermissionData = {
    platform: null,
    teams: {},
    isInitialized: false
  };

  private readonly STORAGE_KEY = 'userPermissions';

  private initializePromise: Promise<void> | null = null;
  private isInitializing = false;

  private loadFromStorage(): boolean {
    try {
      const dataStr = localStorage.getItem(this.STORAGE_KEY);
      if (!dataStr) return false;

      const savedData: PermissionData = JSON.parse(dataStr);
      this.data = savedData;

      return true;
    } catch (error) {
      console.error('[PermissionManager] Failed to load permission data from storage:', error);
      localStorage.removeItem(this.STORAGE_KEY);
      return false;
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));

    } catch (error) {
      console.error('[PermissionManager] Failed to save permission data to storage:', error);
    }
  }

  clearPermissions(spaceId?: string): void {
    if (spaceId) {
      delete this.data.teams[spaceId];
      this.saveToStorage();

    } else {

      this.initializePromise = null;
      this.isInitializing = false;

      this.data = {
        platform: null,
        teams: {},
        isInitialized: false
      };
      localStorage.removeItem(this.STORAGE_KEY);

    }
  }

  async initialize(): Promise<void> {

    if (this.initializePromise) {

      return this.initializePromise;
    }

    if (this.data.isInitialized && !this.isInitializing) {

      return;
    }

    this.isInitializing = true;
    this.initializePromise = this._doInitialize();

    try {
      await this.initializePromise;
    } finally {

      this.initializePromise = null;
      this.isInitializing = false;
    }
  }

  private async _doInitialize(): Promise<void> {
    try {

      const dataLoaded = this.loadFromStorage();
      if (dataLoaded && this.data.isInitialized) {

        return;
      }

      this.data.isInitialized = false;
      this.data.teams = {};

      await this.loadPlatformPermissions();

      this.data.isInitialized = true;

      this.saveToStorage();

    } catch (error) {
      console.error('[PermissionManager] Initialization failed:', error);

      this.data.isInitialized = false;
      throw error;
    }
  }

  private async loadPlatformPermissions(): Promise<void> {
    try {
      const { default: apiClient } = await import('@/lib/api/apiClient');
      const response = await apiClient.get('/rbac/my-permissions');

      if (response.success && response.data) {
        const data = response.data as any;

        if (data.platform) {
          this.data.platform = data.platform;
        } else {
          this.data.platform = { roles: [], permissions: [] };
        }

        const spacePayload = data.space ?? data.team;
        if (spacePayload?.spaceId) {
          const teamData = spacePayload;
          const teamPermissions: SpacePermissions = {
            spaceId: teamData.spaceId,
            role: teamData.role?.code || teamData.role || 'VIEWER',
            permissions: Array.isArray(teamData.permissions) ? teamData.permissions : [],
            canManageRoles: ['OWNER', 'ADMINISTRATOR'].includes((teamData.role?.code || teamData.role || '').toUpperCase())
          };

          this.data.teams[teamData.spaceId] = teamPermissions;
        }

      } else {
        console.warn('[PermissionManager] Unexpected platform permissions API response:', response);
        this.data.platform = { roles: [], permissions: [] };
      }
    } catch (error) {
      console.error('[PermissionManager] Failed to load platform permissions:', error);
      this.data.platform = { roles: [], permissions: [] };
    }
  }

  async loadSpacePermissions(spaceId: string): Promise<void> {
    if (!spaceId) {
      console.warn('[PermissionManager] Invalid team id');
      return;
    }

    try {

      const { default: apiClient } = await import('@/lib/api/apiClient');

      const [teamInfoResponse, permissionsResponse] = await Promise.all([
        apiClient.get(`/spaces/${spaceId}`),
        apiClient.get(`/rbac/my-permissions?spaceId=${spaceId}`)
      ]);

      const teamPermissions: SpacePermissions = {
        spaceId,
        role: 'VIEWER',
        permissions: [],
        canManageRoles: false
      };

      if (teamInfoResponse.success) {
        const team = teamInfoResponse.data as any;
        teamPermissions.role = team.currentUserRole || team.role || 'VIEWER';

        const roleCode = teamPermissions.role.toUpperCase();
        teamPermissions.canManageRoles = ['OWNER', 'ADMINISTRATOR'].includes(roleCode);
      }

      if (permissionsResponse.success && permissionsResponse.data) {
        const teamData = (permissionsResponse.data as any).team;
        if (teamData && teamData.spaceId === spaceId) {

          if (teamData.role) {
            teamPermissions.role = teamData.role?.code || teamData.role || 'VIEWER';
            teamPermissions.canManageRoles = ['OWNER', 'ADMINISTRATOR'].includes(
              (teamData.role?.code || teamData.role || '').toUpperCase()
            );
          }

          teamPermissions.permissions = Array.isArray(teamData.permissions) ? teamData.permissions : [];
        }
      }

      this.data.teams[spaceId] = teamPermissions;

      this.saveToStorage();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('spacePermissionsLoaded', {
          detail: { 
            spaceId, 
            permissions: teamPermissions,
            timestamp: Date.now()
          }
        }));
      }
    } catch (error) {
      console.error(`[PermissionManager] Failed to load permissions for team ${spaceId}:`, error);

      this.data.teams[spaceId] = {
        spaceId,
        role: 'VIEWER',
        permissions: [],
        canManageRoles: false
      };

      this.saveToStorage();
    }
  }

  hasSpacePermission(spaceId: string, permission: string): boolean {
    if (!this.data.isInitialized) {
      console.warn('[PermissionManager] Not initialized; cannot check team permission');
      return false;
    }

    const teamPermissions = this.data.teams[spaceId];
    if (!teamPermissions) {
      console.warn(`[PermissionManager] Team ${spaceId} permissions not loaded; denying access`);
      return false;
    }

    let hasPermission = false;

    if (permission.endsWith('.*')) {

      const resourcePrefix = permission.replace('.*', '');
      hasPermission = teamPermissions.permissions.some(p => p.startsWith(resourcePrefix + '.'));
    } else {

      hasPermission = teamPermissions.permissions.includes(permission);

      if (!hasPermission && permission.endsWith('.read')) {
        const resource = permission.replace('.read', '');
        const higherPermissions = [
          `${resource}.write`,
          `${resource}.delete`, 
          `${resource}.admin`
        ];
        hasPermission = higherPermissions.some(p => teamPermissions.permissions.includes(p));
      }

      if (!hasPermission && permission.endsWith('.write')) {
        const resource = permission.replace('.write', '');
        const higherPermissions = [
          `${resource}.delete`,
          `${resource}.admin`
        ];
        hasPermission = higherPermissions.some(p => teamPermissions.permissions.includes(p));
      }

      if (!hasPermission && permission.endsWith('.delete')) {
        const resource = permission.replace('.delete', '');
        hasPermission = teamPermissions.permissions.includes(`${resource}.admin`);
      }
    }

    return hasPermission;
  }

  hasPlatformPermission(permission: string): boolean {
    if (!this.data.isInitialized) {
      console.warn('[PermissionManager] Not initialized; cannot check platform permission');
      return false;
    }

    const platformPermissions = this.data.platform;
    if (!platformPermissions || !platformPermissions.permissions) {
      console.warn('[PermissionManager] Platform permissions not loaded');
      return false;
    }

    let hasPermission = false;

    if (permission.endsWith('.*')) {

      const resourcePrefix = permission.replace('.*', '');
      hasPermission = platformPermissions.permissions.some(p => p.startsWith(resourcePrefix + '.'));
    } else {

      hasPermission = platformPermissions.permissions.includes(permission);

      if (!hasPermission && permission.endsWith('.read')) {
        const resource = permission.replace('.read', '');
        const higherPermissions = [
          `${resource}.write`,
          `${resource}.delete`, 
          `${resource}.admin`
        ];
        hasPermission = higherPermissions.some(p => platformPermissions.permissions.includes(p));
      }

      if (!hasPermission && permission.endsWith('.write')) {
        const resource = permission.replace('.write', '');
        const higherPermissions = [
          `${resource}.delete`,
          `${resource}.admin`
        ];
        hasPermission = higherPermissions.some(p => platformPermissions.permissions.includes(p));
      }

      if (!hasPermission && permission.endsWith('.delete')) {
        const resource = permission.replace('.delete', '');
        hasPermission = platformPermissions.permissions.includes(`${resource}.admin`);
      }
    }

    return hasPermission;
  }

  clearUserPermissions(): void {

    localStorage.removeItem('userPermissions');
    localStorage.removeItem('adminAccess');
    localStorage.removeItem('partnerAccess');
    localStorage.removeItem('partnerInfo');
    localStorage.removeItem('currentSpaceInfo');
    localStorage.removeItem('userTeams');
    setSpaceId(null);

    this.clearPermissions();
  }

  getSpacePermissions(spaceId: string): SpacePermissions | null {
    return this.data.teams[spaceId] || null;
  }

  
  getPlatformRoles(): string[] {
    return this.data.platform?.roles ?? [];
  }

  
  getCurrentSpaceRole(spaceId: string | null | undefined): string | null {
    return spaceId ? this.data.teams[spaceId]?.role ?? null : null;
  }

  isSpacePermissionsLoaded(spaceId: string): boolean {
    return !!this.data.teams[spaceId];
  }

  getPermissionSummary(): any {
    return {
      isInitialized: this.data.isInitialized,
      isInitializing: this.isInitializing,
      hasInitializePromise: !!this.initializePromise,
      platform: this.data.platform,
      teams: Object.keys(this.data.teams).reduce((acc, spaceId) => {
        const team = this.data.teams[spaceId];
        acc[spaceId] = {
          role: team.role,
          permissionCount: team.permissions.length,
          canManageRoles: team.canManageRoles
        };
        return acc;
      }, {} as any),
      dataSize: JSON.stringify(this.data).length
    };
  }
}

export const permissionManager = new PermissionManager();

if (typeof window !== 'undefined') {

  (window as any).permissionManager = permissionManager;

  (window as any).debugPermissions = () => {
    return permissionManager.getPermissionSummary();
  };

  (window as any).initializePermissions = async () => {
    await permissionManager.initialize();
  };

  (window as any).loadSpacePermissions = async (spaceId: string) => {
    await permissionManager.loadSpacePermissions(spaceId);
  };
}

export const hasSpacePermission = (spaceId: string, permission: string): boolean => {
  return permissionManager.hasSpacePermission(spaceId, permission);
};

export const hasPlatformPermission = (permission: string): boolean => {
  return permissionManager.hasPlatformPermission(permission);
};

export const initializePermissions = async (): Promise<void> => {
  await permissionManager.initialize();
};

export const loadSpacePermissions = async (spaceId: string): Promise<void> => {
  await permissionManager.loadSpacePermissions(spaceId);
};

export default permissionManager;

