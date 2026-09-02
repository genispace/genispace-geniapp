import type { ViewType } from '../shared/ViewToggleButton';

/** Legacy configs used `list` for the visual/card view — treat as chart view. */
export function normalizeViewType(raw: unknown): ViewType {
  const value = String(raw ?? 'chart');
  if (value === 'data') return 'data';
  return 'chart';
}

export function isDataViewType(viewType: ViewType): boolean {
  return viewType === 'data';
}
