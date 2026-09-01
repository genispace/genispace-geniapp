import { Copy, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useShareableStorageLink } from '../hooks/useShareableStorageLink';
import type { PlatformStorageClient } from '../platformStorage';

interface CopyStorageLinkButtonProps {
  client: PlatformStorageClient | null;
  storageFileId: string | null | undefined;
  copyLabel?: string;
  openLabel?: string;
  expiryHint?: string;
  className?: string;
  onError?: (message: string) => void;
}

export function CopyStorageLinkButton({
  client,
  storageFileId,
  copyLabel = 'Copy link',
  openLabel = 'Open share link',
  expiryHint = 'Link valid ~1 hour',
  className = '',
  onError,
}: CopyStorageLinkButtonProps) {
  const { copyLink, openShareTab, loading } = useShareableStorageLink(client, onError);
  const [copied, setCopied] = useState(false);

  if (!storageFileId?.trim()) return null;

  const disabled = loading || !client;

  async function handleCopy() {
    const url = await copyLink(storageFileId!);
    if (url) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        type="button"
        disabled={disabled}
        title={copied ? 'Copied' : client ? expiryHint : 'Session not ready'}
        onClick={() => void handleCopy()}
        className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent disabled:opacity-60"
        aria-label={copyLabel}
      >
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
      </button>
      <button
        type="button"
        disabled={disabled}
        title={client ? expiryHint : 'Session not ready'}
        onClick={() => void openShareTab(storageFileId)}
        className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent disabled:opacity-60"
        aria-label={openLabel}
      >
        <ExternalLink className="h-4 w-4" />
      </button>
    </div>
  );
}
