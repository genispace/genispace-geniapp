export type AssetPreviewKind = 'image' | 'video' | 'audio' | 'text' | 'download' | 'unknown';

export interface AssetPreviewInput {
  type?: string | null;
  format?: string | null;
  name?: string | null;
  url?: string | null;
  storage_file_id?: string | null;
}

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']);
const VIDEO_EXTS = new Set(['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg']);
const TEXT_EXTS = new Set(['txt', 'md', 'markdown', 'json', 'log', 'csv', 'xml']);
const DOWNLOAD_EXTS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip']);

const IMAGE_TYPES = new Set(['image', 'thumbnail', 'reference']);
const VIDEO_TYPES = new Set(['video_clip', 'final_video']);
const TEXT_TYPES = new Set(['script', 'subtitle']);

function normalizeExt(value: string | null | undefined): string {
  if (!value?.trim()) return '';
  const cleaned = value.trim().toLowerCase().replace(/^\./, '');
  return cleaned.split(/[?#]/)[0] ?? '';
}

function extFromName(name: string | null | undefined): string {
  if (!name?.trim()) return '';
  const base = name.trim().split('/').pop() ?? '';
  const dot = base.lastIndexOf('.');
  if (dot < 0) return '';
  return normalizeExt(base.slice(dot + 1));
}

function extFromUrl(url: string | null | undefined): string {
  if (!url?.trim()) return '';
  try {
    const pathname = new URL(url, 'https://placeholder.local').pathname;
    return extFromName(pathname);
  } catch {
    return extFromName(url);
  }
}

function resolveExt(input: AssetPreviewInput): string {
  return normalizeExt(input.format) || extFromName(input.name) || extFromUrl(input.url);
}

function hasPreviewSource(input: AssetPreviewInput): boolean {
  return Boolean(input.storage_file_id?.trim()) || Boolean(input.url?.trim());
}

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
  txt: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
  json: 'application/json',
  csv: 'text/csv',
  xml: 'application/xml',
  pdf: 'application/pdf',
};

/** Infer preview category from asset type, format, and filename — not from blob URL suffix. */
export function inferAssetPreviewKind(input: AssetPreviewInput): AssetPreviewKind {
  if (!hasPreviewSource(input)) return 'unknown';

  const type = String(input.type ?? '').trim().toLowerCase();
  const ext = resolveExt(input);

  if (VIDEO_TYPES.has(type) || VIDEO_EXTS.has(ext)) return 'video';
  if (type === 'audio' || AUDIO_EXTS.has(ext)) return 'audio';
  if (TEXT_EXTS.has(ext) || (TEXT_TYPES.has(type) && !VIDEO_EXTS.has(ext) && !IMAGE_EXTS.has(ext))) {
    return 'text';
  }
  if (DOWNLOAD_EXTS.has(ext)) return 'download';
  if (IMAGE_TYPES.has(type) && ext && !VIDEO_EXTS.has(ext) && !AUDIO_EXTS.has(ext) && !TEXT_EXTS.has(ext)) {
    return IMAGE_EXTS.has(ext) || ext === '' ? 'image' : inferFromExtOnly(ext);
  }
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (type === 'other' && ext) return inferFromExtOnly(ext);
  if (IMAGE_TYPES.has(type)) return 'image';
  return 'download';
}

function inferFromExtOnly(ext: string): AssetPreviewKind {
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (VIDEO_EXTS.has(ext)) return 'video';
  if (AUDIO_EXTS.has(ext)) return 'audio';
  if (TEXT_EXTS.has(ext)) return 'text';
  if (DOWNLOAD_EXTS.has(ext)) return 'download';
  return 'download';
}

export function inferMimeType(input: AssetPreviewInput): string {
  const ext = resolveExt(input);
  if (ext && EXT_TO_MIME[ext]) return EXT_TO_MIME[ext];

  const kind = inferAssetPreviewKind(input);
  switch (kind) {
    case 'image':
      return 'image/jpeg';
    case 'video':
      return 'video/mp4';
    case 'audio':
      return 'audio/mpeg';
    case 'text':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}

export function isImagePreviewKind(kind: AssetPreviewKind): boolean {
  return kind === 'image';
}
