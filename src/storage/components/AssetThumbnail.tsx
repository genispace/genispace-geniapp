import type { MouseEvent, ReactNode } from 'react';
import { FileText, Film, Music, Play } from 'lucide-react';
import type { AssetPreviewInput } from '../assetPreview';
import { inferAssetPreviewKind } from '../assetPreview';
import { isAuthenticatedStorageContentUrl } from '../platformStorage';
import { StorageImage } from './StorageImage';

export type AssetThumbnailSize = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<AssetThumbnailSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-32 w-full',
  lg: 'h-40 w-full',
};

const TYPE_EMOJI: Record<string, string> = {
  video_clip: '🎬',
  final_video: '🎥',
  image: '🖼️',
  audio: '🎵',
  script: '📄',
  subtitle: '💬',
  thumbnail: '🖼️',
  reference: '📎',
  other: '📁',
};

export interface AssetThumbnailProps {
  asset: AssetPreviewInput & { name?: string | null; type?: string | null };
  blobUrls?: Record<string, string>;
  size?: AssetThumbnailSize;
  onClick?: () => void;
  className?: string;
  interactive?: boolean;
}

function Placeholder({
  children,
  size,
  className,
  onClick,
  interactive,
  label,
}: {
  children: ReactNode;
  size: AssetThumbnailSize;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
  label?: string;
}) {
  const clickable = Boolean(onClick && interactive !== false);
  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? label : undefined}
      onClick={onClick}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`flex items-center justify-center bg-muted text-muted-foreground ${SIZE_CLASS[size]} ${clickable ? 'cursor-pointer hover:opacity-90' : ''} ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

export function AssetThumbnail({
  asset,
  blobUrls = {},
  size = 'md',
  onClick,
  className = '',
  interactive = true,
}: AssetThumbnailProps) {
  const kind = inferAssetPreviewKind(asset);
  const label = asset.name?.trim() || 'Asset preview';

  const handleClick = (e?: MouseEvent) => {
    if (!onClick) return;
    e?.stopPropagation();
    onClick();
  };

  if (kind === 'image') {
    const blobUrl = asset.storage_file_id ? blobUrls[asset.storage_file_id] : undefined;
    const externalUrl =
      asset.url?.trim() && !isAuthenticatedStorageContentUrl(asset.url) ? asset.url.trim() : null;
    const resolved = blobUrl || externalUrl;
    const clickable = Boolean(onClick && interactive !== false);
    return (
      <div
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        aria-label={clickable ? label : undefined}
        onClick={() => handleClick()}
        onKeyDown={
          clickable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick?.();
                }
              }
            : undefined
        }
        className={`relative overflow-hidden bg-muted ${SIZE_CLASS[size]} ${clickable ? 'cursor-pointer' : ''} ${className}`}
      >
        {resolved ? (
          <StorageImage
            storageFileId={asset.storage_file_id}
            fallbackUrl={asset.url}
            blobUrls={blobUrls}
            alt={label}
            className={`h-full w-full object-cover ${size === 'sm' ? 'rounded' : ''}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl">
            {TYPE_EMOJI[asset.type ?? ''] ?? '🖼️'}
          </div>
        )}
      </div>
    );
  }

  if (kind === 'video') {
    return (
      <Placeholder
        size={size}
        className={`relative bg-neutral-900 text-white ${className}`}
        onClick={() => handleClick()}
        interactive={interactive}
        label={label}
      >
        <Film className={size === 'sm' ? 'h-4 w-4 opacity-70' : 'h-8 w-8 opacity-50'} />
        {size !== 'sm' && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Play className="h-10 w-10 fill-white/90 text-white/90" />
          </span>
        )}
      </Placeholder>
    );
  }

  if (kind === 'audio') {
    return (
      <Placeholder
        size={size}
        className={className}
        onClick={() => handleClick()}
        interactive={interactive}
        label={label}
      >
        <Music className={size === 'sm' ? 'h-4 w-4' : 'h-8 w-8'} />
      </Placeholder>
    );
  }

  if (kind === 'text') {
    return (
      <Placeholder
        size={size}
        className={className}
        onClick={() => handleClick()}
        interactive={interactive}
        label={label}
      >
        <div className="flex flex-col items-center gap-1">
          <FileText className={size === 'sm' ? 'h-4 w-4' : 'h-8 w-8'} />
          {size !== 'sm' && asset.format && (
            <span className="text-[10px] uppercase tracking-wide">{asset.format}</span>
          )}
        </div>
      </Placeholder>
    );
  }

  return (
    <Placeholder
      size={size}
      className={className}
      onClick={() => handleClick()}
      interactive={interactive}
      label={label}
    >
      <span className={size === 'sm' ? 'text-base' : 'text-4xl'}>
        {TYPE_EMOJI[asset.type ?? ''] ?? '📁'}
      </span>
    </Placeholder>
  );
}
