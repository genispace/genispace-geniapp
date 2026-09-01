import { useEffect, useRef, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import type { AssetPreviewInput } from '../assetPreview';
import { inferAssetPreviewKind, inferMimeType } from '../assetPreview';
import {
  fetchAuthenticatedBlobUrl,
  pickStorageDisplayUrl,
  type PlatformStorageClient,
} from '../platformStorage';

export interface StoragePreviewContentProps {
  open: boolean;
  asset: AssetPreviewInput & {
    name?: string | null;
    size_bytes?: number | null;
    format?: string | null;
  };
  client: PlatformStorageClient | null;
  blobUrls?: Record<string, string>;
  onDownload?: () => void | Promise<void>;
  labels?: {
    loading?: string;
    loadFailed?: string;
    downloadOnly?: string;
    download?: string;
    emptyText?: string;
  };
}

async function loadPreviewUrl(
  client: PlatformStorageClient | null,
  asset: AssetPreviewInput,
  mimeType: string,
  existingBlob?: string | null
): Promise<{ url: string; revoke?: () => void }> {
  if (existingBlob) {
    return { url: existingBlob };
  }
  const storageId = asset.storage_file_id?.trim();
  if (storageId && client) {
    const { blobUrl, revoke } = await fetchAuthenticatedBlobUrl(client, storageId, mimeType);
    return { url: blobUrl, revoke };
  }
  const external = asset.url?.trim();
  if (external && !external.startsWith('blob:')) {
    return { url: external };
  }
  throw new Error('Preview source unavailable');
}

export function StoragePreviewContent({
  open,
  asset,
  client,
  blobUrls = {},
  onDownload,
  labels = {},
}: StoragePreviewContentProps) {
  const kind = inferAssetPreviewKind(asset);
  const mimeType = inferMimeType(asset);
  const fileName = asset.name?.trim() || 'file';
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const revokeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!open) {
      revokeRef.current?.();
      revokeRef.current = null;
      setPreviewUrl(null);
      setTextContent('');
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const existingBlob = pickStorageDisplayUrl(asset.storage_file_id, asset.url, blobUrls);

    void (async () => {
      try {
        if (kind === 'download') {
          if (!cancelled) {
            setPreviewUrl(null);
            setLoading(false);
          }
          return;
        }

        const { url, revoke } = await loadPreviewUrl(client, asset, mimeType, existingBlob);
        if (cancelled) {
          revoke?.();
          return;
        }
        revokeRef.current?.();
        revokeRef.current = revoke ?? null;
        setPreviewUrl(url);

        if (kind === 'text') {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          if (!cancelled) setTextContent(text);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      revokeRef.current?.();
      revokeRef.current = null;
    };
  }, [open, asset.storage_file_id, asset.url, kind, mimeType, blobUrls, client]);

  if (loading) {
    return (
      <div className="min-h-[240px] animate-pulse space-y-4 p-6" role="status" aria-busy="true">
        <div className="h-6 w-48 rounded bg-muted" />
        <div className="h-40 w-full rounded-xl bg-muted" />
        <div className="space-y-2">
          <div className="h-4 w-4/5 rounded bg-muted" />
          <div className="h-4 w-2/3 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
        <p>{labels.loadFailed ?? 'Failed to load preview'}</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (kind === 'image' && previewUrl) {
    return (
      <div className="flex min-h-[240px] items-center justify-center bg-neutral-950/5 p-4 dark:bg-neutral-950">
        <img
          src={previewUrl}
          alt={fileName}
          className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-lg"
        />
      </div>
    );
  }

  if (kind === 'video' && previewUrl) {
    return (
      <div className="flex min-h-[240px] items-center justify-center bg-neutral-950 p-4">
        <video controls className="max-h-[70vh] max-w-full rounded-lg shadow-lg" src={previewUrl}>
          Video
        </video>
      </div>
    );
  }

  if (kind === 'audio' && previewUrl) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm font-medium">{fileName}</p>
        <audio controls className="w-full max-w-md" src={previewUrl}>
          Audio
        </audio>
      </div>
    );
  }

  if (kind === 'text') {
    return (
      <div className="max-h-[70vh] overflow-auto p-4">
        <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 font-mono text-sm">
          {textContent || labels.emptyText || '(empty)'}
        </pre>
      </div>
    );
  }

  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 p-8 text-center">
      <FileText className="h-12 w-12 text-muted-foreground" />
      <div>
        <p className="font-medium">{fileName}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {labels.downloadOnly ?? 'Preview is not available for this file type.'}
        </p>
      </div>
      {onDownload && (
        <button
          type="button"
          onClick={() => void onDownload()}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
        >
          <Download className="h-4 w-4" />
          {labels.download ?? 'Download'}
        </button>
      )}
    </div>
  );
}
