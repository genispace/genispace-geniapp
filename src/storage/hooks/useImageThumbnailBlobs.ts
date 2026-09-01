import { useEffect, useMemo, useState } from 'react';
import type { PlatformStorageClient } from '../platformStorage';
import { resolveAuthenticatedBlobUrls } from '../platformStorage';
import type { AssetPreviewInput } from '../assetPreview';
import { inferAssetPreviewKind, isImagePreviewKind } from '../assetPreview';

export function useImageThumbnailBlobs(
  client: PlatformStorageClient | null,
  items: AssetPreviewInput[]
): Record<string, string> {
  const imageIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of items) {
      const id = item.storage_file_id?.trim();
      if (!id) continue;
      if (isImagePreviewKind(inferAssetPreviewKind(item))) ids.add(id);
    }
    return [...ids];
  }, [items]);

  const idKey = imageIds.join('|');
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!client || imageIds.length === 0) {
      setBlobUrls({});
      return;
    }
    let cancelled = false;
    void resolveAuthenticatedBlobUrls(client, imageIds).then((map) => {
      if (!cancelled) setBlobUrls(map);
    });
    return () => {
      cancelled = true;
    };
  }, [client, idKey]);

  return blobUrls;
}
