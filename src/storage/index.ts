export {
  contentUrlFromUpload,
  createPlatformStorageHelpers,
  fetchAuthenticatedBlobUrl,
  isAuthenticatedStorageContentUrl,
  pickStorageDisplayUrl,
  resolveAuthenticatedBlobUrls,
  resolveShareablePublicUrl,
  resolveShareablePublicUrls,
  unwrapStorageFileRecord,
  type AuthenticatedBlobResult,
  type PlatformStorageClient,
  type StorageFileRecord,
} from './platformStorage';

export { copyTextToClipboard } from './copyTextToClipboard';
export { openUrlInNewTab } from './openUrlInNewTab';

export {
  inferAssetPreviewKind,
  inferMimeType,
  isImagePreviewKind,
  type AssetPreviewInput,
  type AssetPreviewKind,
} from './assetPreview';

export { useAuthenticatedStorageBlobs } from './hooks/useAuthenticatedStorageBlobs';
export { useImageThumbnailBlobs } from './hooks/useImageThumbnailBlobs';
export { useShareableStorageLink } from './hooks/useShareableStorageLink';
export { StorageImage } from './components/StorageImage';
export { StorageVideo } from './components/StorageVideo';
export { AssetThumbnail, type AssetThumbnailProps, type AssetThumbnailSize } from './components/AssetThumbnail';
export { StoragePreviewContent, type StoragePreviewContentProps } from './components/StoragePreviewContent';
export { CopyStorageLinkButton } from './components/CopyStorageLinkButton';
