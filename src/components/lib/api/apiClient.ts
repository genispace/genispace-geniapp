import { NavigateFunction } from 'react-router-dom';
import axios from 'axios';
import { BaseApiClient } from './baseApiClient';
import { ApiResponse } from '../types/api';
import {
  clearAuthToken,
  getAuthToken,
  parsePlatformRefreshResponse,
  setupAuthInterceptors,
} from '@genispace/shared-api';
import { getConfig, isConfigLoaded, waitForConfig } from '@/lib/config';

// Dedicated interceptor-free instance for withoutAuth(). The shared baseAxiosInstance carries
// AuthApiClient's auth interceptors (401 → refresh → onAuthFailed → global /sso/login redirect);
// handing that out as "withoutAuth" made unauthenticated callers trigger the global login jump
// (and, with a stale base URL, fire the refresh against the wrong host). This sibling keeps the
// base-URL/language request wiring but never gets the response auth interceptor.
const noAuthAxiosInstance = axios.create({
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});
noAuthAxiosInstance.interceptors.request.use(async (config) => {
  if (!isConfigLoaded()) {
    await waitForConfig();
  }
  config.baseURL = getConfig().API_BASE_URL;
  config.headers['X-Language'] = localStorage.getItem('i18nextLng') || 'en';
  return config;
});
const noAuthApiClient = new BaseApiClient(noAuthAxiosInstance);

const refreshAxios = axios.create({
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});
refreshAxios.interceptors.request.use((config) => {
  config.baseURL = getConfig().API_BASE_URL;
  config.headers['X-Language'] = localStorage.getItem('i18nextLng') || 'en';
  return config;
});

const APP_TYPE = 'workbench';

class AuthApiClient extends BaseApiClient {
  constructor() {
    super();
    this.setupAuthInterceptors();
  }

  public setNavigate(_nav: NavigateFunction) {}

  private setupAuthInterceptors() {
    setupAuthInterceptors(this.getInstance(), {
      doRefreshToken: async (refreshToken) => {
        const res = await refreshAxios.post(`/sso/platform/${APP_TYPE}/refresh-token`, { refreshToken });
        return parsePlatformRefreshResponse(res.data);
      },
      onAuthFailed: (returnUrl) => {
        localStorage.setItem('returnPath', returnUrl);
        clearAuthToken();
        window.location.href = `/sso/login?returnPath=${encodeURIComponent(returnUrl)}`;
      },
      publicPaths: [
        '/auth/register',
        '/auth/verify-email',
        '/sso/login',
        '/sso/callback',
        '/integrations/oauth/login',
      ],
    });
  }

  public withoutAuth() {
    // A client on the dedicated no-interceptor instance — genuinely without auth handling.
    return noAuthApiClient;
  }

  public async batchRequest<T>(
    requests: Array<{
      url: string;
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      body?: any;
      config?: any;
    }>
  ): Promise<ApiResponse<T>[]> {
    const promises = requests.map(async (req) => {
      try {
        switch (req.method) {
          case 'GET':
            return await this.get<T>(req.url, req.body, req.config);
          case 'POST':
            return await this.post<T>(req.url, req.body, req.config);
          case 'PUT':
            return await this.put<T>(req.url, req.body, req.config);
          case 'DELETE':
            return await this.delete<T>(req.url, req.config);
          case 'PATCH':
            return await this.patch<T>(req.url, req.body, req.config);
          default:
            throw new Error(`Unsupported method: ${req.method}`);
        }
      } catch (error) {
        return {
          success: false,
          code: 500,
          message: 'Batch request failed',
          error: error,
          timestamp: new Date().toISOString(),
        } as ApiResponse<T>;
      }
    });
    return Promise.all(promises);
  }
}

export const apiClient = new AuthApiClient();

export const setNavigate = (nav: NavigateFunction) => {
  apiClient.setNavigate(nav);
};

export { AuthApiClient };
export { getAuthToken };
export default apiClient;
