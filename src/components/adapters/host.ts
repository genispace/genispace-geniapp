import type { GeniAppHostAdapters } from '../types/host-adapters';
import {
  configureWorkbenchHostAdapters,
  getWorkbenchHostAdapters,
} from '../internal/workbench/lib/api/hostAdapterBridge';

export function configureGeniAppHostAdapters(adapters: GeniAppHostAdapters): () => void {
  return configureWorkbenchHostAdapters(adapters);
}

export function getGeniAppHostAdapters(): GeniAppHostAdapters {
  return getWorkbenchHostAdapters();
}
