import { createContext, useContext } from 'react';
import { isMobileWorkbenchViewport } from '@/mobile/utils/mobileComponentProps';
import { useStudioPreview } from '@/runtime/runtime-mode';

/**
 * True when components render inside the single-column mobile stacked flow —
 * real mobile viewport OR the studio's 390px phone frame. Renderers use this
 * for narrow-layout decisions (column collapse, vertical steppers, mobile view
 * swaps) instead of Tailwind viewport breakpoints: sm:/md:/lg: are MEDIA
 * queries, so inside the phone frame (a narrow div in a WIDE desktop viewport)
 * they resolve to the DESKTOP branch and squeeze desktop arrangements into
 * 390px, while on real mobile they'd resolve mobile — one class list cannot
 * serve both. The hook ORs three sources so every consumer agrees:
 * explicit provider (future hosts, e.g. a mobile preview dialog) → studio
 * phone frame (previewOnly) → real mobile viewport.
 */
const MobileFlowLayoutContext = createContext(false);

export const MobileFlowLayoutProvider = MobileFlowLayoutContext.Provider;

export const useMobileFlowLayout = (): boolean => {
  const fromContext = useContext(MobileFlowLayoutContext);
  const { previewOnly } = useStudioPreview();
  return fromContext || previewOnly || isMobileWorkbenchViewport();
};
