/** Minimal GeniSpace storage surface used by GeniApps. */
export interface StorageFileRecord {
  id: string;
  url: string;
  publicUrl?: string;
  mimeType?: string;
}

export interface PlatformStorageClient {
  storage: {
    getFile(fileId: string): Promise<StorageFileRecord | { data?: StorageFileRecord }>;
    getFileContent(fileId: string): Promise<ArrayBuffer | ArrayBufferView>;
  };
}

/** SDK `get()` returns `{ success, data: file }` — unwrap to the file record. */
export function unwrapStorageFileRecord(raw: unknown): StorageFileRecord {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid storage file response');
  }
  const obj = raw as StorageFileRecord & { data?: StorageFileRecord };
  if (obj.data && typeof obj.data === 'object' && obj.data.id) {
    return obj.data;
  }
  if (obj.id) {
    return obj;
  }
  throw new Error('Invalid storage file response');
}

export interface AuthenticatedBlobResult {
  blobUrl: string;
  revoke: () => void;
}

const blobCache = new Map<string, { blobUrl: string; refCount: number }>();

/** Normalize SDK binary payloads into a Blob-safe byte view (avoids Buffer pool slicing bugs). */
function toBlobPart(data: ArrayBuffer | ArrayBufferView): BlobPart {
  if (data instanceof ArrayBuffer) {
    return data.slice(0);
  }
  const copy = new Uint8Array(data.byteLength);
  copy.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
  return copy;
}

/** JWT-backed `/content` URLs cannot be used in `<img src>` — browser sends no Authorization header. */
export function isAuthenticatedStorageContentUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  return /\/storage\/files\/[^/?#]+\/content(?:[/?#]|$)/i.test(url.trim());
}

/** JWT-backed in-app preview: fetch /content and return a blob: URL. */
export async function fetchAuthenticatedBlobUrl(
  client: PlatformStorageClient,
  fileId: string,
  mimeType?: string
): Promise<AuthenticatedBlobResult> {
  const cached = blobCache.get(fileId);
  if (cached) {
    cached.refCount += 1;
    return {
      blobUrl: cached.blobUrl,
      revoke: () => releaseBlobCache(fileId),
    };
  }

  const meta = unwrapStorageFileRecord(await client.storage.getFile(fileId));
  const content = await client.storage.getFileContent(fileId);
  const type = mimeType || meta.mimeType || 'application/octet-stream';
  const blob = new Blob([toBlobPart(content)], { type });
  const blobUrl = URL.createObjectURL(blob);
  blobCache.set(fileId, { blobUrl, refCount: 1 });

  return {
    blobUrl,
    revoke: () => releaseBlobCache(fileId),
  };
}

function releaseBlobCache(fileId: string): void {
  const entry = blobCache.get(fileId);
  if (!entry) return;
  entry.refCount -= 1;
  if (entry.refCount <= 0) {
    URL.revokeObjectURL(entry.blobUrl);
    blobCache.delete(fileId);
  }
}

/** Batch fetch blob URLs with limited concurrency. */
export async function resolveAuthenticatedBlobUrls(
  client: PlatformStorageClient,
  fileIds: string[],
  concurrency = 4
): Promise<Record<string, string>> {
  const unique = [...new Set(fileIds.filter(Boolean))];
  const out: Record<string, string> = {};
  if (unique.length === 0) return out;

  let index = 0;
  async function worker() {
    while (index < unique.length) {
      const id = unique[index++];
      try {
        const { blobUrl } = await fetchAuthenticatedBlobUrl(client, id);
        out[id] = blobUrl;
      } catch {
        /* skip failed */
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, () => worker()));
  return out;
}

/** Share/copy/external HTTP: fresh signed publicUrl (TTL ~1h on server). */
export async function resolveShareablePublicUrl(
  client: PlatformStorageClient,
  fileId: string
): Promise<string> {
  const file = unwrapStorageFileRecord(await client.storage.getFile(fileId));
  if (!file.publicUrl?.trim()) {
    throw new Error('Shareable public URL is not available for this file.');
  }
  return file.publicUrl;
}

export async function resolveShareablePublicUrls(
  client: PlatformStorageClient,
  fileIds: string[]
): Promise<Record<string, string>> {
  const unique = [...new Set(fileIds.filter(Boolean))];
  const out: Record<string, string> = {};
  await Promise.all(
    unique.map(async (id) => {
      try {
        out[id] = await resolveShareablePublicUrl(client, id);
      } catch {
        /* skip */
      }
    })
  );
  return out;
}

/** Pick blob URL for display, else external/content fallback. */
export function pickStorageDisplayUrl(
  storageFileId: string | null | undefined,
  fallbackUrl: string | null | undefined,
  blobUrls: Record<string, string>
): string | null {
  if (storageFileId && blobUrls[storageFileId]) return blobUrls[storageFileId];
  const fallback = fallbackUrl?.trim();
  if (fallback && !isAuthenticatedStorageContentUrl(fallback)) return fallback;
  return null;
}

/** Persist content endpoint URL from upload response — never publicUrl. */
export function contentUrlFromUpload(file: { url: string; publicUrl?: string }): string {
  return file.url;
}

export function createPlatformStorageHelpers(client: PlatformStorageClient) {
  return {
    fetchAuthenticatedBlobUrl: (fileId: string, mimeType?: string) =>
      fetchAuthenticatedBlobUrl(client, fileId, mimeType),
    resolveAuthenticatedBlobUrls: (fileIds: string[]) =>
      resolveAuthenticatedBlobUrls(client, fileIds),
    resolveShareablePublicUrl: (fileId: string) => resolveShareablePublicUrl(client, fileId),
    resolveShareablePublicUrls: (fileIds: string[]) => resolveShareablePublicUrls(client, fileIds),
  };
}
