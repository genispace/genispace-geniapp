/**
 * Pure state helpers for PublishHistoryRenderer — kept free of React/i18n/api
 * imports so the pagination reducer can be unit-tested in isolation.
 *
 * The API (`GET /workbenches/:id/publish-history`) already strips the
 * '[publish]' description prefix and returns metadata only, so no
 * description mapping happens client-side.
 */

export interface PublishHistoryItem {
  version: string;
  description: string;
  publishedByName: string;
  createdAt: string;
}

export interface PublishHistoryState {
  items: PublishHistoryItem[];
  total: number;
  /** Initial / replace fetch in flight (offset 0). */
  loading: boolean;
  /** "Load more" append fetch in flight (offset > 0). */
  loadingMore: boolean;
  error: string | null;
}

export type PublishHistoryAction =
  | { type: 'reset' }
  | { type: 'load-start'; append: boolean }
  | { type: 'load-success'; items: PublishHistoryItem[]; total: number; offset: number }
  | { type: 'load-error'; message: string };

export const createInitialPublishHistoryState = (): PublishHistoryState => ({
  items: [],
  total: 0,
  loading: false,
  loadingMore: false,
  error: null,
});

export function publishHistoryReducer(
  state: PublishHistoryState,
  action: PublishHistoryAction
): PublishHistoryState {
  switch (action.type) {
    case 'reset':
      return createInitialPublishHistoryState();
    case 'load-start':
      return {
        ...state,
        loading: !action.append,
        loadingMore: action.append,
        error: null,
      };
    case 'load-success':
      return {
        // offset 0 replaces (fresh load / retry); offset > 0 appends the next page
        items: action.offset > 0 ? [...state.items, ...action.items] : action.items,
        total: action.total,
        loading: false,
        loadingMore: false,
        error: null,
      };
    case 'load-error':
      return { ...state, loading: false, loadingMore: false, error: action.message };
    default:
      return state;
  }
}

/** 'v18'-style badge text: prefix a lowercase v unless the version already has one. */
export function formatVersionBadge(version: string): string {
  const v = String(version ?? '').trim();
  if (v === '') return '';
  return /^v/i.test(v) ? v : `v${v}`;
}

/**
 * Map one `GET /applications/:id/releases/published-notes` item's releaseNotes
 * to the flat multi-line description the timeline renders. Mirrors the
 * noteLines normalization in ReleaseNotesDialog (locale preference zh/en with
 * cross-locale fallback, string/array forms, per-line trim) and additionally
 * unwraps `{ text }`-shaped entries; empty notes map to ''.
 */
export function releaseNotesToDescription(notes: unknown, locale: string): string {
  if (notes == null) return '';
  const toLines = (value: unknown): string[] => {
    if (value == null) return [];
    const entries = Array.isArray(value) ? value : [value];
    return entries
      .map(entry => {
        if (typeof entry === 'string') return entry;
        if (entry && typeof entry === 'object' && 'text' in entry) {
          return String((entry as { text?: unknown }).text ?? '');
        }
        return String(entry ?? '');
      })
      .flatMap(text => text.split('\n'))
      .map(line => line.trim())
      .filter(Boolean);
  };
  if (typeof notes === 'string' || Array.isArray(notes)) return toLines(notes).join('\n');
  if (typeof notes === 'object') {
    const localized = notes as { zh?: unknown; en?: unknown };
    const preferred = locale.toLowerCase().startsWith('zh') ? localized.zh : localized.en;
    return toLines(preferred ?? localized.en ?? localized.zh).join('\n');
  }
  return String(notes);
}
