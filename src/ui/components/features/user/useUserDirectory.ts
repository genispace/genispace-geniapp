import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PublicUserProfile, UserDirectoryClient } from './userDirectoryTypes';

export type UseUserDirectoryOptions = {
  memberStatus?: string;
};

export type UseUserDirectoryResult = {
  loading: boolean;
  error: string | null;
  members: PublicUserProfile[];
  getProfile: (userId: string | null | undefined) => PublicUserProfile | undefined;
  resolveMany: (userIds: string[]) => Promise<void>;
};

export function useUserDirectory(
  client: UserDirectoryClient | null | undefined,
  options?: UseUserDirectoryOptions
): UseUserDirectoryResult {
  const memberStatus = options?.memberStatus ?? 'ACTIVE';
  const [members, setMembers] = useState<PublicUserProfile[]>([]);
  const [loading, setLoading] = useState(Boolean(client));
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, PublicUserProfile>>(new Map());

  useEffect(() => {
    if (!client) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    cacheRef.current.clear();
    client.spaces
      .listMemberProfiles({ status: memberStatus })
      .then((list) => {
        if (cancelled) return;
        setMembers(list);
        const map = cacheRef.current;
        for (const p of list) {
          map.set(p.id, p);
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load team members');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, memberStatus]);

  const getProfile = useCallback((userId: string | null | undefined) => {
    if (!userId) return undefined;
    return cacheRef.current.get(userId);
  }, []);

  const resolveMany = useCallback(
    async (userIds: string[]) => {
      if (!client) return;
      const missing = [...new Set(userIds.filter((id) => id && !cacheRef.current.has(id)))];
      if (!missing.length) return;
      try {
        const profiles = await client.users.getPublicProfiles(missing);
        for (const p of profiles) {
          cacheRef.current.set(p.id, p);
        }
        setMembers((prev) => {
          const byId = new Map(prev.map((m) => [m.id, m]));
          for (const p of profiles) {
            byId.set(p.id, p);
          }
          return [...byId.values()];
        });
      } catch {
        /* keep cached labels only */
      }
    },
    [client]
  );

  return useMemo(
    () => ({
      loading,
      error,
      members,
      getProfile,
      resolveMany,
    }),
    [loading, error, members, getProfile, resolveMany]
  );
}
