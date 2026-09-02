import type { RefreshResult } from './setupAuthInterceptors';

export function parsePlatformRefreshResponse(raw: unknown): RefreshResult {
  if (raw == null || typeof raw !== 'object') {
    throw new Error('Token refresh failed: Invalid response');
  }

  const root = raw as Record<string, unknown>;
  const useWrapped =
    'success' in root &&
    Boolean(root.success) &&
    root.data != null &&
    typeof root.data === 'object';

  const payload = useWrapped
    ? (root.data as Record<string, unknown>)
    : root;

  const token =
    (typeof payload.token === 'string' ? payload.token : undefined) ??
    (typeof payload.access_token === 'string' ? payload.access_token : undefined);

  const refreshToken =
    (typeof payload.refreshToken === 'string' ? payload.refreshToken : undefined) ??
    (typeof payload.refresh_token === 'string' ? payload.refresh_token : undefined);

  if (!token) {
    throw new Error('Token refresh failed: Invalid response');
  }

  return {
    token,
    ...(refreshToken ? { refreshToken } : {}),
  };
}
