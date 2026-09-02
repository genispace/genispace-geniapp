import { useLayoutEffect } from 'react';

/**
 * Page-level sticky table header for MOBILE, without losing horizontal scroll.
 *
 * Why a clone: a table that scrolls horizontally lives inside an `overflow-x:auto`
 * wrapper. Per CSS, that wrapper is also the vertical scroll container, so a plain
 * `position: sticky` <thead> can only pin inside that wrapper — never to the page.
 * So we render a lightweight CLONE of the real <thead> OUTSIDE the horizontal
 * scroller: `position: sticky; top: var(--wb-filter-sticky-height)` pins it to the
 * page scrollport right below the sticky FilterPanel; we sync its horizontal offset
 * to the body's scrollLeft and mirror column widths. (This is what antd's
 * `Table sticky={{ offsetHeader }}` does under the hood.)
 *
 * The hook is markup-agnostic: give it an empty overlay <div> rendered as the first
 * child of the table card (before the scroll container). It finds the card's <table>
 * + <thead> + horizontal scroller itself, clones the header, and keeps it in sync.
 * Frozen/sticky-left columns keep working for free because the clone preserves the
 * real header cells' classes/inline styles inside its own horizontal scroll context.
 *
 * Desktop (enabled=false) is a complete no-op: no clone, no observers, no listeners.
 */
export interface UseStickyHeaderCloneArgs {
  /** Enable only on mobile (e.g. useMobileViewport().isMobile && tableViewIsActive). */
  enabled: boolean;
  /** Empty div rendered as the FIRST child of the table card, before the scroll container. */
  overlayRef: React.RefObject<HTMLDivElement | null>;
  /** Change this to force a full re-clone (columns identity / language / header font / view). */
  cloneKey?: unknown;
  /** CSS var consumed as the pin offset. Defaults to the FilterPanel height var. */
  offsetVar?: string;
}

export function useStickyHeaderClone({
  enabled,
  overlayRef,
  cloneKey,
  offsetVar = '--wb-filter-sticky-height',
}: UseStickyHeaderCloneArgs): void {
  useLayoutEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') return;

    const overlay = overlayRef.current;
    const card = overlay?.parentElement;
    if (!overlay || !card) return;

    // Exclude the overlay's own clone (it may already exist from a prior run / re-clone).
    const realTable = Array.from(card.querySelectorAll('table')).find((t) => !overlay.contains(t)) ?? null;
    const realThead = realTable?.querySelector('thead') as HTMLElement | null;
    const headRow = realThead?.querySelector('tr');
    if (!realTable || !realThead || !headRow) return;

    // Nearest horizontal scroll container between the table and the card.
    let scroller: HTMLElement | null = realTable.parentElement;
    while (scroller && scroller !== card) {
      const ox = getComputedStyle(scroller).overflowX;
      if (ox === 'auto' || ox === 'scroll') break;
      scroller = scroller.parentElement;
    }
    if (!scroller || scroller === card) scroller = realTable.parentElement;
    if (!scroller) return;

    // ---- build the clone (header only) ----
    overlay.replaceChildren();
    overlay.setAttribute('aria-hidden', 'true');
    Object.assign(overlay.style, {
      position: 'sticky',
      top: `var(${offsetVar}, 0px)`,
      zIndex: '20',
      overflowX: 'hidden',
      // absorb taps so the pinned header never forwards a click to a row beneath it
      pointerEvents: 'auto',
    } as Partial<CSSStyleDeclaration>);

    const cloneTable = document.createElement('table');
    cloneTable.className = realTable.className;
    cloneTable.style.cssText = realTable.style.cssText; // carry fontSize etc.
    cloneTable.style.tableLayout = 'fixed';
    cloneTable.style.margin = '0';

    const colgroup = document.createElement('colgroup');
    const cloneThead = realThead.cloneNode(true) as HTMLElement;
    // the cloned thead sits in a non-scrolling overlay; its own vertical sticky is moot
    cloneThead.style.position = 'static';

    cloneTable.appendChild(colgroup);
    cloneTable.appendChild(cloneThead);
    overlay.appendChild(cloneTable);

    // The clone permanently overlays the real header (it coincides with it at rest and pins on
    // scroll). Hide the real <thead> so the two never show as a doubled header — but keep its
    // layout box (visibility:hidden) so column widths stay intact for measurement and the body.
    const prevVisibility = realThead.style.visibility;
    realThead.style.visibility = 'hidden';

    const measure = () => {
      const cells = Array.from(headRow.children) as HTMLElement[];
      const cols = document.createDocumentFragment();
      let total = 0;
      for (const cell of cells) {
        // offsetWidth, not getBoundingClientRect: the studio phone frame is
        // CSS-scaled, and rect widths are VISUAL px — writing them back as
        // inline px inside the transformed subtree would re-scale them (scale²).
        const w = cell.offsetWidth;
        total += w;
        const col = document.createElement('col');
        col.style.width = `${w}px`;
        cols.appendChild(col);
      }
      colgroup.replaceChildren(cols);
      cloneTable.style.width = `${total}px`;

      const h = realThead.offsetHeight;
      overlay.style.height = `${h}px`;
      // pull out of flow so the clone overlaps the real header and never adds layout height
      overlay.style.marginBottom = `${-h}px`;
      overlay.scrollLeft = scroller!.scrollLeft;
    };
    measure();

    const onScroll = () => {
      overlay.scrollLeft = scroller!.scrollLeft;
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });

    // The clone is an inert DOM copy, so interactive headers (e.g. sortable columns) would be dead.
    // Forward a clone-header click to the matching real <th> — its React handler (sort) still fires
    // even though the real <thead> is visibility:hidden, since .click() dispatches a bubbling event.
    const cloneHeadRow = cloneThead.querySelector('tr');
    const onCloneClick = (e: Event) => {
      const th = (e.target as Element | null)?.closest('th, td');
      if (!th || !cloneHeadRow) return;
      const idx = Array.prototype.indexOf.call(cloneHeadRow.children, th);
      if (idx < 0) return;
      const realCell = headRow.children[idx] as HTMLElement | undefined;
      realCell?.click();
    };
    overlay.addEventListener('click', onCloneClick);

    const ro = new ResizeObserver(() => measure());
    ro.observe(realTable);
    window.addEventListener('resize', measure);

    return () => {
      scroller!.removeEventListener('scroll', onScroll);
      overlay.removeEventListener('click', onCloneClick);
      ro.disconnect();
      window.removeEventListener('resize', measure);
      realThead.style.visibility = prevVisibility;
      overlay.replaceChildren();
      overlay.style.marginBottom = '';
      overlay.style.height = '';
    };
  }, [enabled, cloneKey, offsetVar, overlayRef]);
}
