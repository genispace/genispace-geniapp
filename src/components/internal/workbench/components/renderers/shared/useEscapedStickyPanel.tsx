import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';

/**
 * CSS `position: sticky` fails in some edit-mode layouts because:
 *  - drag/grid editor cells can be positioned with `transform` (sticky containing block collapses)
 *  - ComponentEditOverlay / flow item wrappers are only as tall as the panel (nowhere to travel)
 *  - DeviceCanvas applies `transform: scale(...)`, which also breaks sticky/fixed ancestry
 *
 * On a normal, tall page flow the hook uses native `position: sticky`: the panel remains mounted
 * in place and the browser's scroll compositor pins it. The fallback ("escaped") pins the SAME
 * in-flow wrapper with `position: fixed` — it used to move the panel into a createPortal on pin,
 * but switching React parents REMOUNTS the whole panel subtree, and a remounted FilterPanel
 * re-emits all of its parameters (framework contract: pages rely on panel remount re-emitting),
 * so every scroll across the sticky line triggered a full data refetch storm (measured 2026-08-05:
 * on the product detail page, 3 scroll round-trips = 6 panel remounts = 56 duplicate fetch requests). The panel therefore never
 * changes parents: the outer div stays in flow as scroll sentinel + spacer, the inner wrapper
 * holds the panel and only its style flips between in-flow and fixed. Fixed coordinates are
 * converted into the nearest transformed ancestor's local space (DeviceCanvas scale) exactly
 * like the portal version did. No per-scroll coordinate compensation — that was the source of
 * the visible jitter in the old absolute-position implementation.
 */
function findScrollParent(el: HTMLElement | null): HTMLElement | Window {
  let node = el?.parentElement ?? null;
  while (node) {
    const style = getComputedStyle(node);
    const oy = style.overflowY;
    // Inline styles / jsdom sometimes only populate the shorthand `overflow`.
    const overflow = style.overflow;
    if (
      oy === 'auto' ||
      oy === 'scroll' ||
      oy === 'overlay' ||
      overflow === 'auto' ||
      overflow === 'scroll'
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return window;
}

function parseStickyTopPx(stickyTop: string): number {
  const n = parseFloat(stickyTop || '0');
  return Number.isFinite(n) ? n : 0;
}

type EscapedBox = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type StickyStrategy = 'native' | 'escaped' | null;

function hasCssValue(value: string | undefined, expected: string): boolean {
  return Boolean(value && value !== expected);
}

function createsFixedContainingBlock(style: CSSStyleDeclaration): boolean {
  return (
    hasCssValue(style.transform, 'none') ||
    hasCssValue(style.perspective, 'none') ||
    hasCssValue(style.filter, 'none') ||
    style.contain.includes('paint') ||
    style.willChange.includes('transform')
  );
}

function hasStickyBlockingOverflow(style: CSSStyleDeclaration): boolean {
  const values = [style.overflow, style.overflowX, style.overflowY];
  return values.some((value) =>
    value === 'auto' ||
    value === 'scroll' ||
    value === 'overlay' ||
    value === 'hidden' ||
    value === 'clip'
  );
}

/**
 * Sticky needs a long, unclipped containing block. This deliberately accepts only the
 * straightforward page-flow case; constrained canvas/layout cases use the stable fixed fallback.
 */
function effectiveContainingBlock(host: HTMLElement): HTMLElement | null {
  // display:contents wrappers (PageComponentRenderer's sticky shell, the mobile-flow item)
  // generate no box — sticky's containing block skips them, and their rects are 0x0, so both
  // the travel-range checks below and ResizeObserver must look at the first real box ancestor.
  let node = host.parentElement;
  while (node && getComputedStyle(node).display === 'contents') {
    node = node.parentElement;
  }
  return node;
}

function canUseNativeSticky(host: HTMLElement, scrollParent: HTMLElement | Window): boolean {
  const hostParent = effectiveContainingBlock(host);
  if (!hostParent) return false;

  const scrollRect =
    scrollParent === window
      ? { top: 0, bottom: window.innerHeight }
      : (scrollParent as HTMLElement).getBoundingClientRect();
  const hostRect = host.getBoundingClientRect();
  const parentRect = hostParent.getBoundingClientRect();

  // The direct parent determines the sticky travel range. If it does not extend beyond the
  // scrollport, a sticky panel would immediately unstick at its bottom edge.
  if (
    hostRect.height === 0 ||
    parentRect.height <= hostRect.height + 0.5 ||
    parentRect.bottom <= scrollRect.bottom + 0.5
  ) {
    return false;
  }

  // A clipped ancestor *before the nearest scrollport* limits sticky travel. Keep scanning for
  // transforms above the scrollport too: DeviceCanvas' scale lives outside the page scroll element.
  // Overflow on an outer, non-scrolling app shell does not affect this panel's nearest scrollport.
  let beforeScrollParent = scrollParent !== window;
  for (let node: HTMLElement | null = hostParent; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (createsFixedContainingBlock(style)) return false;
    if (beforeScrollParent && node !== scrollParent && hasStickyBlockingOverflow(style)) {
      return false;
    }
    if (node === scrollParent) beforeScrollParent = false;
  }

  return true;
}

/**
 * A transformed ancestor changes the containing block for position:fixed. Convert viewport-space
 * positioning to that block's local CSS pixels once when entering sticky mode; it remains stable
 * while the page scrolls. Walks up from the pinned element itself (the fixed containing block is
 * determined by ITS ancestry).
 */
function toFixedContainingBlockBox(
  visualBox: EscapedBox,
  fromEl: HTMLElement
): EscapedBox {
  let node: HTMLElement | null = fromEl;
  while (node) {
    if (createsFixedContainingBlock(getComputedStyle(node))) {
      const rect = node.getBoundingClientRect();
      const localWidth = node.clientWidth || node.offsetWidth;
      const scale = localWidth > 0 && rect.width > 0 ? rect.width / localWidth : 1;
      return {
        top: (visualBox.top - rect.top) / scale,
        left: (visualBox.left - rect.left) / scale,
        width: visualBox.width / scale,
        height: visualBox.height / scale,
      };
    }
    node = node.parentElement;
  }
  return visualBox;
}

function boxesEqual(a: EscapedBox | null, b: EscapedBox): boolean {
  return !!a &&
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5;
}

export function useEscapedStickyPanel(
  enabled: boolean,
  stickyTop = '0px'
): {
  wrapSticky: (panel: ReactElement) => ReactNode;
  stuck: boolean;
} {
  const hostRef = useRef<HTMLDivElement>(null);
  const panelWrapRef = useRef<HTMLDivElement>(null);
  const stuckRef = useRef(false);
  const fixedBoxRef = useRef<EscapedBox | null>(null);
  // Mirrors `strategy` for the layout effect's recheck callback (the effect closure captures
  // a stale `strategy` while ResizeObserver keeps firing).
  const strategyRef = useRef<StickyStrategy>(null);
  const [strategy, setStrategy] = useState<StickyStrategy>(null);
  const [stuck, setStuck] = useState(false);
  const [fixedBox, setFixedBox] = useState<EscapedBox | null>(null);

  useLayoutEffect(() => {
    if (!enabled) {
      stuckRef.current = false;
      fixedBoxRef.current = null;
      strategyRef.current = null;
      setStrategy(null);
      setStuck(false);
      setFixedBox(null);
      return;
    }

    const host = hostRef.current;
    if (!host || typeof window === 'undefined') return;

    const scrollParent = findScrollParent(host);
    const switchStrategy = (next: StickyStrategy) => {
      // A strategy switch must never leave a stale pin behind. The panel itself is NOT remounted
      // — host/wrapper keep their tree positions across strategies; only styles flip.
      stuckRef.current = false;
      fixedBoxRef.current = null;
      setStuck(false);
      setFixedBox(null);
      strategyRef.current = next;
      setStrategy(next);
    };

    const nextStrategy = canUseNativeSticky(host, scrollParent) ? 'native' : 'escaped';
    if (strategy !== nextStrategy) {
      switchStrategy(nextStrategy);
      return;
    }

    // The mount-time strategy decision is not final: content below the panel can load AFTER
    // mount (Suspense placeholders, lazy charts), growing the page flow past the scrollport —
    // and shrinking it again on navigation. Re-evaluate whenever the effective containing block
    // (the page flow column) resizes, in both modes; the rect-based checks are scroll-position
    // independent, so no scroll listener is needed for this.
    const watchTarget = effectiveContainingBlock(host);
    const recheckStrategy = () => {
      const s = canUseNativeSticky(host, scrollParent) ? 'native' : 'escaped';
      if (s !== strategyRef.current) switchStrategy(s);
    };
    const strategyRo =
      typeof ResizeObserver !== 'undefined' && watchTarget
        ? new ResizeObserver(recheckStrategy)
        : null;
    strategyRo?.observe(watchTarget as HTMLElement);
    window.addEventListener('resize', recheckStrategy);
    const cleanupStrategyWatch = () => {
      strategyRo?.disconnect();
      window.removeEventListener('resize', recheckStrategy);
    };

    // Native sticky stays mounted in page flow and needs no scroll listener or measurement.
    if (strategy === 'native') return cleanupStrategyWatch;

    // Escaped: pin/unpin only flips the inner wrapper between in-flow and position:fixed —
    // the panel subtree never changes parents (see the module docstring), so no remount and
    // no FilterPanel re-emit / data refetch on scroll.
    const writeEscapedBox = (box: EscapedBox) => {
      const wrap = panelWrapRef.current;
      if (!wrap) return false;
      // A resize can change the fixed containing block's local coordinates.
      // This is intentionally not used to compensate normal scrolling.
      wrap.style.top = `${box.top}px`;
      wrap.style.left = `${box.left}px`;
      wrap.style.width = `${box.width}px`;
      return true;
    };

    const pin = (box: EscapedBox) => {
      const previous = fixedBoxRef.current;

      if (!stuckRef.current) {
        stuckRef.current = true;
        fixedBoxRef.current = box;
        setStuck(true);
        setFixedBox(box);
        return;
      }

      // Normal scrolling produces the same fixed box. Only a real resize,
      // reflow, or device-scale change updates the wrapper and spacer.
      if (!boxesEqual(previous, box)) {
        fixedBoxRef.current = box;
        writeEscapedBox(box);
        setFixedBox(box);
      }
    };

    const unpin = () => {
      if (!stuckRef.current && fixedBoxRef.current === null) return;
      stuckRef.current = false;
      fixedBoxRef.current = null;
      setStuck(false);
      setFixedBox(null);
    };

    const measure = () => {
      const hostRect = host.getBoundingClientRect();
      // jsdom (and pre-layout) often reports an empty rect — don't pin yet.
      if (hostRect.width === 0 && hostRect.height === 0) {
        unpin();
        return;
      }

      const topOffset = parseStickyTopPx(stickyTop);
      const visualTop =
        scrollParent === window
          ? topOffset
          : (scrollParent as HTMLElement).getBoundingClientRect().top + topOffset;
      const visualBox = {
        top: visualTop,
        left: hostRect.left,
        width: hostRect.width,
        height: hostRect.height,
      };
      const positionedBox = toFixedContainingBlockBox(visualBox, host);
      // Panel height from the wrapper (it holds the panel); fall back to the host spacer
      // (already pinned at the last box height) so the spacer never collapses mid-pin.
      const fixedBox = {
        ...positionedBox,
        height: panelWrapRef.current?.offsetHeight || host.offsetHeight || positionedBox.height,
      };

      if (scrollParent === window) {
        const threshold = topOffset;
        if (hostRect.top <= threshold) {
          pin(fixedBox);
        } else {
          unpin();
        }
        return;
      }

      const scroller = scrollParent as HTMLElement;
      const scrollerRect = scroller.getBoundingClientRect();
      const threshold = scrollerRect.top + topOffset;

      if (hostRect.top <= threshold) {
        pin(fixedBox);
      } else {
        unpin();
      }
    };

    measure();

    const onScrollOrResize = () => measure();
    scrollParent.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(host);
    // The wrapper's height is content-driven (filters wrap/expand): track it so the spacer and
    // the fixed box follow panel growth while pinned.
    if (panelWrapRef.current) ro?.observe(panelWrapRef.current);

    return () => {
      cleanupStrategyWatch();
      scrollParent.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      ro?.disconnect();
      stuckRef.current = false;
      fixedBoxRef.current = null;
    };
  }, [enabled, stickyTop, strategy]);

  const wrapSticky = (panel: ReactElement): ReactNode => {
    if (!enabled) {
      return panel;
    }

    const isEscaped = strategy === 'escaped';
    // The panel wrapper NEVER moves in the React tree — across native/escaped strategy switches
    // and pin/unpin alike, only styles flip — so the panel subtree (e.g. a FilterPanel with all
    // of its filter state) is never remounted. The outer host doubles as the scroll sentinel and,
    // while pinned, as the spacer preserving the panel's flow space.
    const hostStyle: CSSProperties | undefined =
      strategy === 'native'
        ? {
            position: 'sticky',
            top: stickyTop,
            zIndex: 30,
            alignSelf: 'stretch',
          }
        : isEscaped && stuck && fixedBox
          ? { height: fixedBox.height, width: '100%' }
          : undefined;

    const wrapStyle: CSSProperties | undefined =
      isEscaped && stuck && fixedBox
        ? {
            position: 'fixed',
            top: fixedBox.top,
            left: fixedBox.left,
            width: fixedBox.width,
            zIndex: 30,
            // Never ease position changes. The panel must track the scrollport exactly,
            // including when a transformed studio device frame changes its visual coordinates.
            transition: 'none',
          }
        : undefined;

    return (
      <div ref={hostRef} data-wb-filter-sticky-host="" style={hostStyle}>
        <div
          ref={panelWrapRef}
          data-wb-filter-sticky-escaped={isEscaped && stuck ? '' : undefined}
          style={wrapStyle}
        >
          {panel}
        </div>
      </div>
    );
  };

  return { wrapSticky, stuck };
}
