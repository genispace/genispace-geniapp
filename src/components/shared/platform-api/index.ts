export { getAuthToken, getRefreshToken, setAuthToken, clearAuthToken } from './auth/tokenStorage';
export { setupAuthInterceptors } from './auth/setupAuthInterceptors';
export { parsePlatformRefreshResponse } from './auth/platformRefreshResponse';
export type { AuthInterceptorConfig, RefreshResult } from './auth/setupAuthInterceptors';

