import { useEffect, useMemo, useState } from 'react';
import type { PlatformStorageClient } from '../platformStorage';
import { resolveAuthenticatedBlobUrls } from '../platformStorage';

export function useAuthenticatedStorageBlobs(
  client: PlatformStorageClient | null,
  storageFileIds: Array<string | null | undefined>
): Record<string, string> {
  const ids = useMemo(
    () => [...new Set(storageFileIds.filter((id): id is string => Boolean(id?.trim())))],
    [storageFileIds]
  );
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!client || ids.length === 0) {
      setBlobUrls({});
      return;
    }
    let cancelled = false;
    void resolveAuthenticatedBlobUrls(client, ids).then((map) => {
      if (!cancelled) setBlobUrls(map);
    });
    return () => {
      cancelled = true;
    };
  }, [client, ids.join('|')]);

  return blobUrls;
}
