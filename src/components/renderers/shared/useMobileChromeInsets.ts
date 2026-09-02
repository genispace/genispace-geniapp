import { useEffect, useState } from 'react';

export interface MobileChromeInsets {
  /** Viewport px occupied by sticky/fixed chrome at the TOP (sticky FilterPanel or mobile header). */
  top: number;
  /** Viewport px occupied by fixed chrome at the BOTTOM (the bottom tab nav). */
  bottom: number;
}

/**
 * Mobile-only: measure the viewport insets taken by fixed/sticky workbench chrome — the sticky
 * FilterPanel (falling back to the mobile header) at the top and the fixed bottom tab nav at the
 * bottom. Pass the result to a floating element (e.g. {@link TableEmptyState}'s `floatBadge`) so it
 * stays inside the content area instead of overlapping that chrome.
 *
 * Both values are 0 when `enabled` is false (e.g. desktop). The chrome sits at stable viewport
 * positions, so we only re-measure on mount, on resize, and whenever `remeasureKey` changes — pass
 * the "is the floating element visible" flag so insets are refreshed right when they are needed
 * (the FilterPanel may not be sticky-positioned yet at first mount).
 */
export function useMobileChromeInsets(enabled: boolean, remeasureKey?: unknown): MobileChromeInsets {
  const [insets, setInsets] = useState<MobileChromeInsets>({ top: 0, bottom: 0 });

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') {
      setInsets({ top: 0, bottom: 0 });
      return;
    }
    const measure = () => {
      const fp = document.querySelector('.workbench-filter-panel--mobile') as HTMLElement | null;
      const header = document.querySelector('.workbench-mobile-header') as HTMLElement | null;
      const nav = document.querySelector('.workbench-bottom-tab-nav') as HTMLElement | null;
      const top = Math.max(0, fp?.getBoundingClientRect().bottom ?? header?.getBoundingClientRect().bottom ?? 0);
      const bottom = nav ? Math.max(0, window.innerHeight - nav.getBoundingClientRect().top) : 0;
      setInsets({ top, bottom });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [enabled, remeasureKey]);

  return insets;
}
