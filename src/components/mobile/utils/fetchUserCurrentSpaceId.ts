import apiClient from '@/lib/api/apiClient';
import { getSpaceId } from '@genispace/shared-utils';

interface UserSettingsResponse {
  spaceId?: string | null;
}

async function fetchServerSpaceId(): Promise<string | null> {
  const response = await apiClient.get<UserSettingsResponse>('/users/me/settings');

  if (response.success && response.data) {
    return response.data.spaceId ?? null;
  }

  return null;
}

/**
 * Resolve the user's active space from server settings only.
 * Used for workbench space alignment — must not fall back to cookie.
 */
export async function fetchUserCurrentSpaceIdStrict(): Promise<string | null> {
  try {
    return await fetchServerSpaceId();
  } catch (error) {
    console.warn('[fetchUserCurrentSpaceIdStrict] Failed to load server spaceId:', error);
    return null;
  }
}

/**
 * Resolve the user's active space from server settings (authoritative),
 * falling back to local cookie when the request fails.
 */
export async function fetchUserCurrentSpaceId(): Promise<string | null> {
  try {
    const resolved = await fetchServerSpaceId();
    if (resolved) {
      return resolved;
    }
  } catch (error) {
    console.warn('[fetchUserCurrentSpaceId] Failed to load server spaceId:', error);
  }

  return getSpaceId();
}

export async function waitForUserSpaceId(
  expectedSpaceId: string,
  options?: {
    maxAttempts?: number;
    delayMs?: number;
    fetchUserCurrentSpaceId?: () => Promise<string | null>;
  }
): Promise<boolean> {
  const resolveCurrentSpaceId =
    options?.fetchUserCurrentSpaceId ?? fetchUserCurrentSpaceIdStrict;
  const maxAttempts = options?.maxAttempts ?? 8;
  const delayMs = options?.delayMs ?? 150;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const currentSpaceId = await resolveCurrentSpaceId();
    if (currentSpaceId === expectedSpaceId) {
      return true;
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => {
        setTimeout(resolve, delayMs);
      });
    }
  }

  return false;
}
