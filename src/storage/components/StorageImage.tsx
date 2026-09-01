import { pickStorageDisplayUrl } from '../platformStorage';

import type { ImgHTMLAttributes } from 'react';

interface StorageImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  storageFileId?: string | null;
  fallbackUrl?: string | null;
  blobUrls: Record<string, string>;
}

export function StorageImage({
  storageFileId,
  fallbackUrl,
  blobUrls,
  src,
  alt = '',
  ...rest
}: StorageImageProps) {
  const resolved =
    pickStorageDisplayUrl(storageFileId, fallbackUrl ?? (typeof src === 'string' ? src : null), blobUrls) ??
    undefined;
  if (!resolved) return null;
  return <img src={resolved} alt={alt} {...rest} />;
}
