const GATE_EVENT = 'workbench-space-sync-changed';

const activeReasons = new Set<string>();

/** Block datasource auto-fetch while mobile workbench space is being aligned. */
export function beginWorkbenchSpaceSync(reason: string): void {
  if (activeReasons.has(reason)) {
    return;
  }

  activeReasons.add(reason);
  notifyWorkbenchSpaceSyncGateChanged();
}

export function endWorkbenchSpaceSync(reason: string): void {
  if (!activeReasons.has(reason)) {
    return;
  }

  activeReasons.delete(reason);
  notifyWorkbenchSpaceSyncGateChanged();
}

export function releaseWorkbenchSpaceSyncForMobileContent(): void {
  endWorkbenchSpaceSync('mobile-layout');
  endWorkbenchSpaceSync('viewport-toggle');
}

export function isWorkbenchSpaceSyncPending(): boolean {
  return activeReasons.size > 0;
}

export function resetWorkbenchSpaceSyncGate(): void {
  if (activeReasons.size === 0) {
    return;
  }

  activeReasons.clear();
  notifyWorkbenchSpaceSyncGateChanged();
}

function notifyWorkbenchSpaceSyncGateChanged(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(GATE_EVENT));
}

export function subscribeWorkbenchSpaceSyncGate(listener: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  window.addEventListener(GATE_EVENT, listener);
  return () => {
    window.removeEventListener(GATE_EVENT, listener);
  };
}
