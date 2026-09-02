import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Eye, Rocket } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@genispace/shared-ui';
import { useEditMode } from '@/runtime/runtime-mode';

/** Nearest ancestor that actually scrolls vertically — its client box is the visible pane. */
function findScrollParent(node: HTMLElement | null): HTMLElement | null {
  for (let p = node?.parentElement ?? null; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p);
    if (overflowY === 'auto' || overflowY === 'scroll') return p;
  }
  return null;
}

/**
 * Frosted-glass overlay shown above the page content when the page's
 * `comingSoon.enabled` config is on. Dismissal is per-mount only: reopening
 * or refreshing the page shows the overlay again. Hidden in edit mode so the
 * page stays editable.
 *
 * Visual language follows the system empty-state pattern (EmptyStateBadge):
 * soft icon badge + medium title + muted one-liner + small pill action —
 * not a billboard headline.
 */
export function PageComingSoonOverlay() {
  const { t } = useTranslation('workbench');
  const { isEditMode } = useEditMode();
  const [dismissed, setDismissed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // Height of the VISIBLE pane (the scroll container's client box — below the top chrome, above
  // the mobile bottom nav). Used as the centering box: 100dvh would also count chrome the pane
  // doesn't own, biasing the content downward.
  const [paneHeight, setPaneHeight] = useState<number | null>(null);

  // Re-arm on edit-mode toggle so an editor leaving edit mode sees the overlay immediately.
  useEffect(() => {
    setDismissed(false);
  }, [isEditMode]);

  useLayoutEffect(() => {
    if (isEditMode || dismissed) return;
    const scrollParent = findScrollParent(rootRef.current);
    const update = () => {
      const paneRect = scrollParent
        ? scrollParent.getBoundingClientRect()
        : { top: 0, bottom: window.innerHeight };
      // The mobile bottom tab bar is fixed and OVERLAYS the scroll container's bottom edge —
      // clip the pane at the nav's top so "centered" means centered in what the user can see.
      const nav = document.querySelector('.workbench-bottom-tab-nav');
      const navTop = nav ? nav.getBoundingClientRect().top : Number.POSITIVE_INFINITY;
      setPaneHeight(Math.max(0, Math.round(Math.min(paneRect.bottom, navTop) - paneRect.top)));
    };
    update();
    if (scrollParent && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(update);
      ro.observe(scrollParent);
      window.addEventListener('resize', update);
      return () => {
        ro.disconnect();
        window.removeEventListener('resize', update);
      };
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isEditMode, dismissed]);

  if (isEditMode || dismissed) {
    return null;
  }

  return (
    // z-40 clears the sticky FilterPanel (z-30) which shares the tab wrapper's stacking context.
    <div ref={rootRef} className="absolute inset-0 z-40 bg-white/70 backdrop-blur-md dark:bg-neutral-900/70">
      {/* Center within the VISIBLE pane, not the full scrollable content height: on layouts where
          the overlay's positioning parent grows with the page (mobile full-page scroll), plain
          flex-centering lands below the first screen. Sticky pins this box to the top of the
          scroll area and it is sized to the scroll container's client height (capped by
          max-h-full for short embedded panes) so its center is the on-screen pane center. */}
      <div
        className="sticky top-0 flex max-h-full flex-col items-center justify-center gap-4 px-6"
        style={{ height: paneHeight != null ? `${paneHeight}px` : '100dvh' }}
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300">
          <Rocket className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />
        </span>
        <div className="flex select-none flex-col items-center gap-1 text-center">
          <span className="text-lg font-semibold tracking-tight text-slate-800 dark:text-neutral-100">
            {t('coming_soon.title', 'Coming Soon')}
          </span>
          <span className="text-sm leading-snug text-slate-500 dark:text-neutral-400">
            {t('coming_soon.description', 'This page is under construction — stay tuned.')}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDismissed(true)}
          className="mt-1 h-8 gap-1.5 rounded-full bg-white/80 px-3.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-white dark:bg-neutral-800/80 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          {t('coming_soon.preview', 'Preview page')}
        </Button>
      </div>
    </div>
  );
}
