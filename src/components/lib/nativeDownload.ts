const ALLOWED_DOWNLOAD_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Start a browser-managed download without reading the response in JavaScript.
 * This keeps signed object-storage downloads outside the authenticated Axios
 * request chain, so a cross-origin redirect cannot trigger an XHR preflight.
 */
export const startNativeDownload = (url: string, filename?: string): void => {
  const resolvedUrl = new URL(url, window.location.origin);
  if (!ALLOWED_DOWNLOAD_PROTOCOLS.has(resolvedUrl.protocol)) {
    throw new Error('Unsupported download URL protocol');
  }

  const link = document.createElement('a');
  link.href = resolvedUrl.toString();
  link.download = filename || 'download';
  link.referrerPolicy = 'no-referrer';
  link.rel = 'noopener noreferrer';
  link.hidden = true;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
  }
};
