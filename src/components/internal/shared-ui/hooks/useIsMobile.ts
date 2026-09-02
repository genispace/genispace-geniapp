import { useEffect, useState } from 'react';

/**
 * Tailwind `sm` breakpoint in px. Below this width we treat the viewport as an
 * H5 / mobile device and switch to the mobile-first layouts (stat grids start at
 * 2 columns, data tables fall back to card lists, denser padding, etc.).
 */
export const MOBILE_BREAKPOINT = 640;

/**
 * Reports whether the viewport is narrower than the given breakpoint (default:
 * the Tailwind `sm` boundary, 640px). SSR-safe — returns `false` on the server
 * and during the first client render, then syncs on mount so hydration matches.
 *
 * Use this to switch between desktop and mobile renderings that pure Tailwind
 * responsive classes cannot express — e.g. rendering a card list instead of a
 * `<table>`, or mounting a bottom sheet instead of an inline filter row.
 */
export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const query = window.matchMedia(`(max-width: ${breakpoint - 0.02}px)`);
    const update = () => setIsMobile(query.matches);

    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [breakpoint]);

  return isMobile;
}
