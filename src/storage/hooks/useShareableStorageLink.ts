import { useCallback, useState } from 'react';
import { copyTextToClipboard } from '../copyTextToClipboard';
import { openUrlInNewTab } from '../openUrlInNewTab';
import type { PlatformStorageClient } from '../platformStorage';
import { resolveShareablePublicUrl } from '../platformStorage';

export function useShareableStorageLink(
  client: PlatformStorageClient | null,
  onError?: (message: string) => void
) {
  const [loading, setLoading] = useState(false);

  const copyLink = useCallback(
    async (fileId: string): Promise<string | null> => {
      if (!client || !fileId.trim()) return null;
      setLoading(true);
      try {
        const urlPromise = resolveShareablePublicUrl(client, fileId);
        await copyTextToClipboard(urlPromise);
        return await urlPromise;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        onError?.(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [client, onError]
  );

  const openShareTab = useCallback(
    async (fileId: string): Promise<string | null> => {
      if (!client || !fileId.trim()) return null;
      setLoading(true);
      try {
        const urlPromise = resolveShareablePublicUrl(client, fileId);
        return await openUrlInNewTab(urlPromise);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        onError?.(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [client, onError]
  );

  return { copyLink, openShareTab, loading };
}
