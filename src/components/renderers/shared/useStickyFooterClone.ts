import { useLayoutEffect } from 'react';

/**
 * Page-level sticky table FOOTER (total row), without losing horizontal scroll.
 *
 * Mirror image of useStickyHeaderClone: a table that scrolls horizontally lives inside an
 * `overflow-x:auto` wrapper, so a plain `position: sticky` <tfoot> can only pin inside that
 * wrapper — and without a height bound on the wrapper there is nothing to stick against, so
 * the footer sits at its natural position off-screen. Bounding the wrapper (maxHeight +
 * overflow-y) makes the table scroll in a small inner box whose bottom edge is usually below
 * the fold, so the pinned footer is still not visible while page-scrolling.
 *
 * Instead we render a lightweight CLONE of the real <tfoot> OUTSIDE the horizontal scroller,
 * as the LAST child of the table card: `position: sticky; bottom: 0` pins it to the page
 * scrollport bottom while the table's natural footer position is below the fold; once the end
 * of the table scrolls into view the clone settles exactly onto the hidden real footer (its
 * flow position coincides via a negative marginTop). Horizontal offset and column widths are
 * synced to the body scroller, same technique as the header clone.
 *
 * The hook is markup-agnostic: give it an empty overlay <div> rendered as the LAST child of
 * the table card (after the scroll container). It finds the card's real <table> (the one that
 * HAS a <tfoot>, skipping header/footer clones), clones the footer, and keeps it in sync.
 * Ancestors up to the page scroller must stay overflow-visible or the sticky pin is clipped.
 */
export interface UseStickyFooterCloneArgs {
  /** Enable only when the table actually renders a footer row. */
  enabled: boolean;
  /** Empty div rendered as the LAST child of the table card, after the scroll container. */
  overlayRef: React.RefObject<HTMLDivElement | null>;
  /** Change this to force a full re-clone (footer values / columns / language / font). */
  cloneKey?: unknown;
  /** CSS var consumed as the bottom pin offset. Defaults to a plain 0. */
  offsetVar?: string;
}

export function useStickyFooterClone({
  enabled,
  overlayRef,
  cloneKey,
  offsetVar,
}: UseStickyFooterCloneArgs): void {
  useLayoutEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') return;

    const overlay = overlayRef.current;
    const card = overlay?.parentElement;
    if (!overlay || !card) return;

    // The real table is the one that HAS a <tfoot> — header/footer clone tables never do.
    const realTable = Array.from(card.querySelectorAll('table')).find((t) => !overlay.contains(t) && t.querySelector('tfoot')) ?? null;
    const realTfoot = realTable?.querySelector('tfoot') as HTMLElement | null;
    const footRow = realTfoot?.querySelector('tr');
    if (!realTable || !realTfoot || !footRow) return;
    // No layout box → nothing meaningful to pin (jsdom, or a display:none ancestor): leave the
    // real footer visible as the plain fallback instead of cloning a zero-height overlay.
    if (realTfoot.offsetHeight === 0) return;

    // Nearest horizontal scroll container between the table and the card.
    let scroller: HTMLElement | null = realTable.parentElement;
    while (scroller && scroller !== card) {
      const ox = getComputedStyle(scroller).overflowX;
      if (ox === 'auto' || ox === 'scroll') break;
      scroller = scroller.parentElement;
    }
    if (!scroller || scroller === card) scroller = realTable.parentElement;
    if (!scroller) return;

    // ---- build the clone (footer only) ----
    overlay.replaceChildren();
    overlay.setAttribute('aria-hidden', 'true');
    Object.assign(overlay.style, {
      position: 'sticky',
      bottom: offsetVar ? `var(${offsetVar}, 0px)` : '0px',
      zIndex: '20',
      overflowX: 'hidden',
      // absorb taps so the pinned footer never forwards a click to a row beneath it
      pointerEvents: 'auto',
    } as Partial<CSSStyleDeclaration>);

    const cloneTable = document.createElement('table');
    cloneTable.className = realTable.className;
    cloneTable.style.cssText = realTable.style.cssText; // carry fontSize etc.
    cloneTable.style.tableLayout = 'fixed';
    cloneTable.style.margin = '0';

    const colgroup = document.createElement('colgroup');
    const cloneTfoot = realTfoot.cloneNode(true) as HTMLElement;
    // the cloned tfoot sits in a non-scrolling overlay; its own vertical sticky is moot
    cloneTfoot.style.position = 'static';

    cloneTable.appendChild(colgroup);
    cloneTable.appendChild(cloneTfoot);
    overlay.appendChild(cloneTable);

    // The clone permanently overlays the real footer (it coincides with it at rest and pins on
    // scroll). Hide the real <tfoot> so the two never show as a doubled footer — but keep its
    // layout box (visibility:hidden) so column widths stay intact for measurement and the body.
    const prevVisibility = realTfoot.style.visibility;
    realTfoot.style.visibility = 'hidden';

    const measure = () => {
      const cells = Array.from(footRow.children) as HTMLElement[];
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

      const h = realTfoot.offsetHeight;
      overlay.style.height = `${h}px`;
      // pull up out of flow so the clone coincides with the hidden real footer and the card
      // never gains extra layout height
      overlay.style.marginTop = `${-h}px`;
      overlay.scrollLeft = scroller!.scrollLeft;
    };
    measure();

    const onScroll = () => {
      overlay.scrollLeft = scroller!.scrollLeft;
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });

    const ro = new ResizeObserver(() => measure());
    ro.observe(realTable);
    window.addEventListener('resize', measure);

    return () => {
      scroller!.removeEventListener('scroll', onScroll);
      ro.disconnect();
      window.removeEventListener('resize', measure);
      realTfoot.style.visibility = prevVisibility;
      overlay.replaceChildren();
      overlay.style.marginTop = '';
      overlay.style.height = '';
    };
  }, [enabled, cloneKey, offsetVar, overlayRef]);
}
