import { pickStorageDisplayUrl } from '../platformStorage';

import type { VideoHTMLAttributes } from 'react';

interface StorageVideoProps extends VideoHTMLAttributes<HTMLVideoElement> {
  storageFileId?: string | null;
  fallbackUrl?: string | null;
  blobUrls: Record<string, string>;
}

export function StorageVideo({
  storageFileId,
  fallbackUrl,
  blobUrls,
  src,
  ...rest
}: StorageVideoProps) {
  const resolved =
    pickStorageDisplayUrl(storageFileId, fallbackUrl ?? (typeof src === 'string' ? src : null), blobUrls) ??
    undefined;
  if (!resolved) return null;
  return <video src={resolved} {...rest} />;
}
