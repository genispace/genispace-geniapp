import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getAuthToken, getRefreshToken, setAuthToken, clearAuthToken } from './tokenStorage';

export interface RefreshResult {
  token: string;
  refreshToken?: string;
}

export interface AuthInterceptorConfig {

  doRefreshToken: (refreshToken: string) => Promise<RefreshResult>;

  onAuthFailed: (returnUrl: string) => void;

  publicPaths?: string[];

  allowUnauthenticatedHome?: boolean;
}

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

export function setupAuthInterceptors(
  instance: AxiosInstance,
  config: AuthInterceptorConfig
): void {
  const {
    doRefreshToken,
    onAuthFailed,
    publicPaths = [],
    allowUnauthenticatedHome = false,
  } = config;

  let isRefreshing = false;
  let refreshPromise: Promise<string> | null = null;

  const isPublicPath = (pathname: string): boolean => {
    if (allowUnauthenticatedHome && (pathname === '/' || pathname === '')) {
      return true;
    }
    return publicPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
  };

  const performRefresh = async (): Promise<string> => {
    if (isRefreshing && refreshPromise) {
      return refreshPromise;
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    isRefreshing = true;
    refreshPromise = (async () => {
      try {
        const result = await doRefreshToken(refreshToken);
        setAuthToken(result.token, result.refreshToken);
        return result.token;
      } catch (error) {
        clearAuthToken();
        throw error;
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  };

  instance.interceptors.request.use(
    (reqConfig: InternalAxiosRequestConfig) => {
      const token = getAuthToken();
      if (token && !reqConfig.headers.Authorization) {
        reqConfig.headers.Authorization = `Bearer ${token}`;
      }
      return reqConfig;
    },
    (error) => Promise.reject(error)
  );

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config as InternalAxiosRequestConfig;

      if (
        error.response?.status !== 401 ||
        !originalRequest ||
        originalRequest._retry
      ) {
        return Promise.reject(error);
      }

      const currentPath = window.location.pathname;
      const returnUrl = currentPath + window.location.search;

      const refreshToken = getRefreshToken();

      if (isPublicPath(currentPath) && !refreshToken) {
        return Promise.reject(error);
      }

      if (!refreshToken) {
        onAuthFailed(returnUrl);
        return Promise.reject(error);
      }

      try {
        originalRequest._retry = true;
        const newToken = await performRefresh();

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        } else {
          originalRequest.headers = { Authorization: `Bearer ${newToken}` } as typeof originalRequest.headers;
        }

        return instance(originalRequest);
      } catch (refreshError) {
        onAuthFailed(returnUrl);
        return Promise.reject(refreshError);
      }
    }
  );
}
