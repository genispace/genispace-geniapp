function openUrlDirect(url: string): void {
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (opened) return;

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

/**
 * Open a URL in a new tab after async resolution.
 * Uses a synchronous `about:blank` popup (without `noopener`) so the opener can navigate it
 * once the URL is ready; then clears `opener` for security.
 */
export async function openUrlInNewTab(urlOrPromise: string | Promise<string>): Promise<string> {
  if (typeof urlOrPromise === 'string') {
    openUrlDirect(urlOrPromise);
    return urlOrPromise;
  }

  const popup = window.open('about:blank', '_blank');
  if (!popup) {
    throw new Error('Popup blocked. Allow popups for this site and try again.');
  }

  try {
    const url = await urlOrPromise;
    popup.location.replace(url);
    popup.opener = null;
    return url;
  } catch (err) {
    popup.close();
    throw err;
  }
}
