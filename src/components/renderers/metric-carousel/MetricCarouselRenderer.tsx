import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@genispace/shared-utils';
import i18n from '@/locales/i18n';
import { useDroppable } from '@dnd-kit/core';
import { useTabActivity } from '@/contexts/TabActivityContext';
import { useEditMode } from '@/runtime/runtime-mode';
import { ContainerDropZoneOverlay } from '@/runtime/runtime-mode';
import { useMobileFlowLayout } from '@/mobile/mobileFlowLayoutContext';
import { Grid24FillCellProvider, useGrid24FillCell } from '@/layout/grid24CellContext';

export interface MetricCarouselRendererProps {
  id?: string;
  gap?: number;
  /** Each child fills this % of the carousel width (scroll layout). 100=full slide; ~90 lets the next item peek. */
  itemWidthPct?: number;
  /** Fixed per-child width in px (scroll layout). When set (>0) it OVERRIDES itemWidthPct so card width does NOT
   *  scale with screen width — wide phones show ~2 cards, narrow phones ~1.5 (dashboard acceptance 0709 #2). */
  itemWidth?: number;
  hideScrollbar?: boolean;
  showSwipeHint?: boolean;
  /** Show pagination dots (●●●) under the carousel instead of the swipe-hint text. Active dot tracks scroll. */
  showDots?: boolean;
  edgeBleed?: { enabled?: boolean; mx?: number; px?: number };
  layout?: 'scroll' | 'grid';
  /** Swipe-hint text font size (px). Default 13. */
  labelFontSize?: number;
  children?: React.ReactNode;
}

const MetricCarouselRenderer: React.FC<MetricCarouselRendererProps> = ({
  id,
  gap = 12,
  itemWidthPct = 90,
  itemWidth,
  hideScrollbar = true,
  showSwipeHint = false,
  showDots = false,
  edgeBleed,
  layout = 'scroll',
  labelFontSize,
  children,
}) => {
  const labelFs = labelFontSize ?? 13;
  const isMobileFlow = useMobileFlowLayout();
  const fillCell = useGrid24FillCell();
  // Generic container: any child component type can be dropped in edit mode (reuses the 'container' drop path).
  const { isEditMode, draggedComponentType, isAddingComponent } = useEditMode();
  // Hidden keep-alive tabs keep full-size rects (opacity:0) — an enabled zone
  // there would hijack drops on the visible page.
  const isTabActive = useTabActivity();
  const { setNodeRef, isOver } = useDroppable({
    id: `container-drop-zone-${id || 'default'}`,
    data: { type: 'container', componentId: id, componentType: 'MetricCarousel' },
    disabled: !isEditMode || !isTabActive,
  });

  const pct = Number.isFinite(itemWidthPct) ? Math.min(100, Math.max(1, itemWidthPct)) : 90;
  // Fixed-px mode wins when itemWidth is a positive number; otherwise fall back to the percentage width.
  const fixedW = Number.isFinite(itemWidth) && (itemWidth as number) > 0 ? (itemWidth as number) : undefined;

  const count = React.Children.count(children);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Dots reflect which cards are actually in view (a card counts as "shown" when >=25% visible), measured from
  // real child geometry rather than scrollWidth/count — so with several cards visible, several dots light up,
  // and the highlight stays accurate regardless of edge-bleed padding. (dashboard acceptance 0709 #7)
  const [visibleDots, setVisibleDots] = useState<number[]>([0]);
  // Scroll items are measured from the real DOM, NOT React.Children.count: a child may expand to
  // N flat cards (cardPerRow HeroCard, marked with data-mc-item), often only after its datasource
  // returns. Each marked card counts as its own item; an unmarked child counts as one.
  const [itemCount, setItemCount] = useState(count);
  const getItems = useCallback((): HTMLElement[] => {
    const el = scrollRef.current;
    if (!el) return [];
    const items: HTMLElement[] = [];
    Array.from(el.children).forEach(k => {
      const marked = (k as HTMLElement).querySelectorAll<HTMLElement>('[data-mc-item]');
      if (marked.length > 0) items.push(...Array.from(marked));
      else items.push(k as HTMLElement);
    });
    return items;
  }, []);
  const recomputeDots = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const items = getItems();
    setItemCount(items.length);
    const L = el.scrollLeft, R = L + el.clientWidth;
    const vis: number[] = [];
    items.forEach((kEl, i) => {
      const kl = kEl.offsetLeft, kw = kEl.offsetWidth;
      const overlap = Math.min(kl + kw, R) - Math.max(kl, L);
      if (kw > 0 && overlap >= kw * 0.25) vis.push(i); // a card that has "appeared" (>=25% in view) lights its dot
    });
    setVisibleDots(vis.length ? vis : [0]);
  }, [getItems]);
  useEffect(() => {
    if (layout !== 'scroll') return;
    recomputeDots();
    const el = scrollRef.current;
    if (!el) return;
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(recomputeDots);
      ro.observe(el);
    }
    // Async child expansion (a cardPerRow HeroCard rendering its N cards once data lands) happens
    // INSIDE a child's subtree — observe the whole subtree so count/dots follow.
    let mo: MutationObserver | undefined;
    if (typeof MutationObserver !== 'undefined') {
      mo = new MutationObserver(recomputeDots);
      mo.observe(el, { childList: true, subtree: true });
    }
    return () => {
      ro?.disconnect();
      mo?.disconnect();
    };
  }, [layout, count, recomputeDots]);

  // Single-item special case: one card stretches to fill the carousel (e.g. a manager with a
  // single store, or an HQ user in the store view) instead of sitting at the fixed item width.
  const effectiveItemW = itemCount === 1 ? '100%' : fixedW ? `${fixedW}px` : `${pct}%`;

  const inner =
    layout === 'grid' ? (
      // Grid: columns govern width — do NOT wrap with itemWidthPct.
      // Narrow flow drops the viewport variants: inside the phone frame the
      // WIDE desktop viewport would apply lg:grid-cols-3 at 390px.
      <div className={cn('grid grid-cols-1 gap-3', fillCell && 'min-h-0 flex-1 auto-rows-fr', !isMobileFlow && 'sm:grid-cols-2 lg:grid-cols-3')}>
        {children}
      </div>
    ) : (
      <div
        ref={scrollRef}
        onScroll={showDots ? recomputeDots : undefined}
        className={cn(
          'flex overflow-x-auto',
          // Item width is applied to every DIRECT DOM child via the --mc-item-w var instead of a
          // per-child wrapper div. Children that expand to N flat cards (cardPerRow HeroCard)
          // render their shell as display:contents and carry the same var on each card, so every
          // card scrolls as its own item. The fillCell h-full/min-h-0 is kept the same way.
          '[&>*]:flex-[0_0_var(--mc-item-w)] [&>*]:max-w-[var(--mc-item-w)]',
          fillCell && 'min-h-0 flex-1 [&>*]:h-full [&>*]:min-h-0',
          hideScrollbar && '[&::-webkit-scrollbar]:hidden'
        )}
        style={{
          gap,
          scrollbarWidth: hideScrollbar ? 'none' : undefined,
          '--mc-item-w': effectiveItemW,
        } as React.CSSProperties}
      >
        {children}
      </div>
    );

  return (
    <div className={cn('rounded-lg', fillCell && 'flex h-full min-h-0 flex-col')}>
      <Grid24FillCellProvider value={fillCell}>
        <div
          className={cn(fillCell && 'flex min-h-0 flex-1 flex-col')}
          style={
            edgeBleed?.enabled
              ? {
                  marginLeft: -(edgeBleed.mx ?? 16),
                  marginRight: -(edgeBleed.mx ?? 16),
                  paddingLeft: edgeBleed.px ?? 16,
                  paddingRight: edgeBleed.px ?? 16,
                }
              : undefined
          }
        >
          <div
            ref={isEditMode ? setNodeRef : undefined}
            className={cn('relative', fillCell && 'flex min-h-0 flex-1 flex-col', isEditMode && isOver && 'rounded-lg ring-2 ring-primary ring-offset-2')}
          >
            {inner}
            {isEditMode && (
              <ContainerDropZoneOverlay
                isOver={isOver}
                draggedComponentType={draggedComponentType}
                isAddingComponent={isAddingComponent}
                containerType="container"
              />
            )}
          </div>
          {showDots && layout === 'scroll' && itemCount > 1 ? (
            <div className="mt-2 flex items-center justify-center gap-1.5" aria-hidden>
              {Array.from({ length: itemCount }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'rounded-full transition-all duration-200',
                    visibleDots.includes(i) ? 'w-4 bg-muted-foreground/70' : 'w-1.5 bg-muted-foreground/30',
                  )}
                  style={{ height: 6 }}
                />
              ))}
            </div>
          ) : showSwipeHint ? (
            <p className="mt-2 text-center text-muted-foreground" style={{ fontSize: labelFs }}>
              {i18n.t('renderers:metric_carousel.swipe_hint', '← Swipe to see all →')}
            </p>
          ) : null}
        </div>
      </Grid24FillCellProvider>
    </div>
  );
};

export default MetricCarouselRenderer;
