import React, { createContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '@/lib/api/apiClient';
import { permissionManager } from '@/lib/auth/permissionManager';
import { useAuthTokenSync } from '@genispace/shared-ui';
import { broadcastLogoutNotifications } from '@genispace/shared-utils';

interface UserState {
  isLoggedIn: boolean;
  id?: string;
  token?: string;
  refreshToken?: string;
  email?: string;
  name?: string;
  phoneNumber?: string;

  avatarUrl?: string | null;

}

interface UserContextType {
  user: UserState | null;
  setUser: React.Dispatch<React.SetStateAction<UserState | null>>;
  signOut: () => void;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserState | null>(() => {

    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      return parsedUser;
    }
    if (token) {
      return {
        isLoggedIn: true,
        token: token,
      };
    }
    return null;
  });

  useEffect(() => {

    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  useAuthTokenSync(user, setUser);

  useEffect(() => {
    const initializeUser = async () => {
      const needsProfile =
        user?.isLoggedIn &&
        user.token &&
        (!user.id ||
          !user.email ||
          !user.name ||
          !user.phoneNumber ||
          user.avatarUrl === undefined ||
          (typeof user.avatarUrl === 'string' && !user.avatarUrl.trim()));
      if (!needsProfile) return;

      try {
        const response = await apiClient.get('/auth/me');
        const userData = response.data as {
          id?: string;
          email?: string;
          name?: string;
          phoneNumber?: string | null;
          avatarUrl?: string | null;
        };
        if (userData) {
          setUser((prev) =>
            prev
              ? {
                  ...prev,
                isLoggedIn: true,
                id: userData.id ?? prev.id,
                email: userData.email ?? prev.email,
                name: userData.name ?? prev.name,
                phoneNumber: userData.phoneNumber ?? prev.phoneNumber,
                avatarUrl: userData.avatarUrl ?? prev.avatarUrl ?? null,
                }
              : null,
          );
        }
      } catch (error) {
        console.error('UserContext: 获取用户信息失败:', error);
      }
    };

    initializeUser();
  }, [user?.isLoggedIn, user?.token, user?.id, user?.email, user?.name, user?.phoneNumber, user?.avatarUrl]);

  useEffect(() => {
    const initializePermissions = async () => {
      if (user?.isLoggedIn && user.token) {
        try {
          await permissionManager.initialize();

          window.dispatchEvent(new CustomEvent('permissionsInitialized'));
        } catch (error) {
          console.error('UserContext: 权限管理器初始化失败:', error);
        }
      } else if (!user?.isLoggedIn) {

        permissionManager.clearPermissions();
      }
    };

    initializePermissions();
  }, [user?.isLoggedIn, user?.token]);

  const signOut = async () => {
    try {
      await apiClient.post('/auth/logout', {});
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');

      permissionManager.clearUserPermissions();
      // Front-channel logout: clear the other app origins' auth storage too.
      await broadcastLogoutNotifications();
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, signOut }}>
      {children}
    </UserContext.Provider>
  );
};
