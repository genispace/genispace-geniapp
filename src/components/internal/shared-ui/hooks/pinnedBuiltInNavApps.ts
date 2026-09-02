import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSpaceId } from '@genispace/shared-utils';
import type { UserSettingsApiClient } from './useUserSettings';
import { normalizePinnedBuiltInNavAppsMap, type PinnedBuiltInNavAppsMap } from './userPreferencesPinnedNav';

export const PINNED_BUILT_IN_NAV_APPS_CHANGED_EVENT = 'genispace:pinnedBuiltInNavAppsChanged';
const LEGACY_PINNED_BUILT_IN_NAV_APPS_STORAGE_KEY = 'genispace:pinnedBuiltInNavApps';

export interface UsePinnedBuiltInNavAppsOptions {
  apiClient?: UserSettingsApiClient | null;
}

function resolveSpaceKey(spaceId?: string | null): string {
  return spaceId?.trim() || getSpaceId()?.trim() || '_default';
}

function getIdsForSpace(map: PinnedBuiltInNavAppsMap, spaceId?: string | null): string[] {
  return map[resolveSpaceKey(spaceId)] ?? [];
}

function notifyPinnedNavAppsChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(PINNED_BUILT_IN_NAV_APPS_CHANGED_EVENT));
}

export function usePinnedBuiltInNavApps(options?: UsePinnedBuiltInNavAppsOptions) {
  const { apiClient } = options ?? {};
  const [pinnedMap, setPinnedMap] = useState<PinnedBuiltInNavAppsMap>({});
  const [activeSpaceKey, setActiveSpaceKey] = useState(() => resolveSpaceKey());

  const pinnedIds = useMemo(
    () => getIdsForSpace(pinnedMap, activeSpaceKey),
    [pinnedMap, activeSpaceKey]
  );

  const refreshSpaceKey = useCallback(() => {
    setActiveSpaceKey(resolveSpaceKey());
  }, []);

  const loadFromServer = useCallback(async () => {
    if (!apiClient) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    try {
      const response = await apiClient.get('/users/me/settings');
      if (!response.success || !response.data) return;
      const data = response.data as {
        preferences?: { pinnedBuiltInNavApps?: unknown };
      };
      let nextMap = normalizePinnedBuiltInNavAppsMap(data.preferences?.pinnedBuiltInNavApps);

      if (
        Object.keys(nextMap).length === 0 &&
        typeof window !== 'undefined'
      ) {
        try {
          const legacyRaw = localStorage.getItem(LEGACY_PINNED_BUILT_IN_NAV_APPS_STORAGE_KEY);
          if (legacyRaw) {
            const legacyMap = normalizePinnedBuiltInNavAppsMap(JSON.parse(legacyRaw));
            if (Object.keys(legacyMap).length > 0) {
              nextMap = legacyMap;
              await apiClient.put('/users/me/settings', {
                preferences: { pinnedBuiltInNavApps: legacyMap },
              });
              localStorage.removeItem(LEGACY_PINNED_BUILT_IN_NAV_APPS_STORAGE_KEY);
            }
          }
        } catch {
          // Ignore legacy migration failures; server remains source of truth.
        }
      }

      setPinnedMap(nextMap);
    } catch (error) {
      console.error('Failed to load pinned built-in nav apps:', error);
    }
  }, [apiClient]);

  useEffect(() => {
    void loadFromServer();
  }, [loadFromServer]);

  useEffect(() => {
    const onSpaceSwitch = () => {
      refreshSpaceKey();
      void loadFromServer();
    };
    const onPinnedChanged = () => {
      refreshSpaceKey();
    };

    window.addEventListener('globalDataRefresh', onSpaceSwitch);
    window.addEventListener(PINNED_BUILT_IN_NAV_APPS_CHANGED_EVENT, onPinnedChanged);
    return () => {
      window.removeEventListener('globalDataRefresh', onSpaceSwitch);
      window.removeEventListener(PINNED_BUILT_IN_NAV_APPS_CHANGED_EVENT, onPinnedChanged);
    };
  }, [loadFromServer, refreshSpaceKey]);

  const persistMap = useCallback(
    async (nextMap: PinnedBuiltInNavAppsMap) => {
      if (!apiClient) return;
      await apiClient.put('/users/me/settings', {
        preferences: { pinnedBuiltInNavApps: nextMap },
      });
    },
    [apiClient]
  );

  const pin = useCallback(
    async (appId: string) => {
      const trimmed = appId.trim();
      if (!trimmed || !apiClient) return;

      const spaceKey = resolveSpaceKey();
      const previousMap = pinnedMap;
      const current = previousMap[spaceKey] ?? [];
      if (current.includes(trimmed)) return;

      const nextMap: PinnedBuiltInNavAppsMap = {
        ...previousMap,
        [spaceKey]: [...current, trimmed],
      };

      setPinnedMap(nextMap);
      setActiveSpaceKey(spaceKey);
      notifyPinnedNavAppsChanged();

      try {
        await persistMap(nextMap);
      } catch (error) {
        console.error('Failed to pin built-in nav app:', error);
        setPinnedMap(previousMap);
        notifyPinnedNavAppsChanged();
      }
    },
    [apiClient, persistMap, pinnedMap]
  );

  const unpin = useCallback(
    async (appId: string) => {
      const trimmed = appId.trim();
      if (!trimmed || !apiClient) return;

      const spaceKey = resolveSpaceKey();
      const previousMap = pinnedMap;
      const current = previousMap[spaceKey] ?? [];
      if (!current.includes(trimmed)) return;

      const nextForSpace = current.filter((id) => id !== trimmed);
      const nextMap: PinnedBuiltInNavAppsMap = { ...previousMap };
      if (nextForSpace.length > 0) {
        nextMap[spaceKey] = nextForSpace;
      } else {
        delete nextMap[spaceKey];
      }

      setPinnedMap(nextMap);
      setActiveSpaceKey(spaceKey);
      notifyPinnedNavAppsChanged();

      try {
        await persistMap(nextMap);
      } catch (error) {
        console.error('Failed to unpin built-in nav app:', error);
        setPinnedMap(previousMap);
        notifyPinnedNavAppsChanged();
      }
    },
    [apiClient, persistMap, pinnedMap]
  );

  const isPinned = useCallback((appId: string) => pinnedIds.includes(appId), [pinnedIds]);

  return { pinnedIds, pin, unpin, isPinned, refresh: loadFromServer };
}
