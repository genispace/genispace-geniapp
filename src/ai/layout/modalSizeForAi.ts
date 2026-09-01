import type { AppModalSize } from '@genispace/geniapp/kit';
import { MODAL_SIZE_WITH_AI } from './layoutConstants';

/** Use wide modal when an AI adopt sidebar is shown; otherwise keep the app default. */
export function modalSizeForAi<S extends AppModalSize>(
  hasAiSidebar: boolean,
  defaultSize: S,
): S | typeof MODAL_SIZE_WITH_AI {
  return hasAiSidebar ? MODAL_SIZE_WITH_AI : defaultSize;
}
