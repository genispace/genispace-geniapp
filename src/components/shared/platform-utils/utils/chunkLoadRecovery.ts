const DEFAULT_STORAGE_KEY = 'genispace:chunk_reload_once';

function storageKey(options?: { storageKey?: string }): string {
  return options?.storageKey ?? DEFAULT_STORAGE_KEY;
}

export function isChunkLoadError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; message?: string };
  if (e.name === 'ChunkLoadError') return true;
  const msg = String(e.message ?? '');
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('dynamically imported module')
  );
}

function isLikelyViteBundleScript(src: string): boolean {
  if (!src) return false;
  try {
    const u = new URL(src, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    return u.pathname.includes('/static/');
  } catch {
    return src.includes('/static/');
  }
}

function tryReloadOnce(key: string): boolean {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return false;
  }
  if (sessionStorage.getItem(key)) {
    return false;
  }
  sessionStorage.setItem(key, '1');
  window.location.reload();
  return true;
}

export function reloadOnceIfChunkError(
  error: unknown,
  options?: { storageKey?: string },
): boolean {
  if (!isChunkLoadError(error)) {
    return false;
  }
  return tryReloadOnce(storageKey(options));
}

let recoveryInstalled = false;

export function setupChunkLoadRecovery(options?: { storageKey?: string }): void {
  if (typeof window === 'undefined' || recoveryInstalled) {
    return;
  }
  recoveryInstalled = true;
  const key = storageKey(options);

  window.addEventListener('unhandledrejection', (event) => {
    if (!isChunkLoadError(event.reason)) return;
    event.preventDefault();
    tryReloadOnce(key);
  });

  window.addEventListener(
    'error',
    (event) => {
      const t = event.target;
      if (!(t instanceof HTMLScriptElement) || !t.src) return;
      if (!isLikelyViteBundleScript(t.src)) return;
      tryReloadOnce(key);
    },
    true,
  );
}
