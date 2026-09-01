import type { CSSProperties } from 'react';
import type { AppModalSize } from '@genispace/geniapp/kit';

/** AI adopt sidebar column (DESIGN_GUIDELINE §16.1). */
export const AI_SIDEBAR_MIN = '280px';
export const AI_SIDEBAR_MAX = '320px';

/**
 * Modal size when AiSuggestionPanel is shown beside the form.
 * Uses `xl` for compatibility with published shared-ui; switch to `wide` once
 * @genispace/geniapp exports AppModalSize `'wide'`.
 */
export const MODAL_SIZE_WITH_AI = 'xl' as const satisfies AppModalSize;

export type ModalSizeWithAi = typeof MODAL_SIZE_WITH_AI;

/** Modal / dialog: form + AI sidebar columns (inline — not dependent on Tailwind scan). */
export const AI_ADOPT_MODAL_GRID_STYLE: CSSProperties = {
  gridTemplateColumns: `minmax(0, 1fr) minmax(${AI_SIDEBAR_MIN}, ${AI_SIDEBAR_MAX})`,
};

/** Tailwind class for apps that include shared/ai/** in content paths (optional). */
export const AI_ADOPT_GRID_CLASS =
  'grid grid-cols-[minmax(0,1fr)_minmax(280px,320px)] gap-4';

/** Full-page adopt layout: same columns from lg breakpoint upward. */
export const AI_ADOPT_PAGE_GRID_CLASS =
  'space-y-6 lg:grid lg:grid-cols-[1fr_minmax(280px,320px)] lg:gap-6 lg:space-y-0';

export const AI_ADOPT_MODAL_MAX_HEIGHT = 'max-h-[70vh]';
