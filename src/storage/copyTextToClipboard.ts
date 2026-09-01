function execCommandCopy(text: string): boolean {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(textArea);
  }
}

function canUseAsyncClipboardItem(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.clipboard?.write === 'function' &&
    typeof ClipboardItem !== 'undefined'
  );
}

/**
 * Copy text while preserving the user-gesture window for async content.
 * Pass a Promise when the text is not yet available (e.g. after a network fetch).
 */
export async function copyTextToClipboard(textOrPromise: string | Promise<string>): Promise<void> {
  if (typeof textOrPromise === 'string') {
    await copyResolvedText(textOrPromise);
    return;
  }

  const textPromise = textOrPromise;

  if (canUseAsyncClipboardItem()) {
    try {
      const item = new ClipboardItem({
        'text/plain': textPromise.then((text) => new Blob([text], { type: 'text/plain' })),
      });
      await navigator.clipboard.write([item]);
      await textPromise;
      return;
    } catch {
      /* fall through to resolved-text strategies */
    }
  }

  const text = await textPromise;
  await copyResolvedText(text);
}

async function copyResolvedText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      /* fall through */
    }
  }

  if (execCommandCopy(text)) return;

  throw new Error('Failed to copy to clipboard');
}
