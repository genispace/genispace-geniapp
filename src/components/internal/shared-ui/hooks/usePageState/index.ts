import { useState, useEffect, useCallback } from 'react';
import { PageStateOptions, PageStateReturn, StorageType } from './types';

export type { PageStateOptions, PageStateReturn, StorageType };

const STORAGE_CACHE: Map<string, unknown> = new Map();

export function usePageState<T extends Record<string, unknown>>(
  options: PageStateOptions<T>
): PageStateReturn<T> {
  const {
    key,
    defaultValues,
    storageType = 'localStorage',
    restoreOnMount = true,
  } = options;

  const storage = storageType === 'localStorage' ? localStorage : sessionStorage;

  const getInitialState = (): T => {
    if (!restoreOnMount) return defaultValues;

    if (STORAGE_CACHE.has(key)) {
      return STORAGE_CACHE.get(key) as T;
    }

    try {
      const saved = storage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as T;
        STORAGE_CACHE.set(key, parsed);
        return parsed;
      }
    } catch (e) {
      console.warn(`[usePageState] Failed to parse stored value for key "${key}":`, e);
    }

    return defaultValues;
  };

  const [state, setState] = useState<T>(getInitialState);

  useEffect(() => {
    try {
      storage.setItem(key, JSON.stringify(state));
      STORAGE_CACHE.set(key, state);
    } catch (e) {
      console.warn(`[usePageState] Failed to save state for key "${key}":`, e);
    }
  }, [key, state, storage]);

  const resetState = useCallback(() => {
    setState(defaultValues);
  }, [defaultValues]);

  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setState(prev => ({ ...prev, [field]: value }));
  }, []);

  return {
    state,
    setState,
    resetState,
    updateField,
  };
}
