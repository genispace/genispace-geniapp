import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export interface VisibleCenter {
  /** 视口坐标系下，可见交集矩形的水平中心（px） */
  x: number;
  /** 视口坐标系下，可见交集矩形的垂直中心（px） */
  y: number;
  /** 元素在屏幕上是否有有效可见区域 */
  visible: boolean;
  /**
   * Scale (0..1] to apply to a `reserveHeight`-sized box so it fits the clean band (element ∩ safe
   * area) without spilling onto the chrome or the element's own header. 1 when it fits as-is, or
   * when reserveHeight is not provided.
   */
  scale: number;
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const OVERFLOW_CLIP = /(auto|scroll|hidden|clip)/;
/** 交集面积小于该阈值视为不可见，避免边缘 1~2px 抖动时还渲染徽章 */
const MIN_VISIBLE_AREA = 16;
/** Floor for the fit-to-band shrink — below this the badge would be illegible, so allow slight overflow. */
const MIN_SCALE = 0.5;
/** Px kept clear on each side between the (fitted) box and the chrome/header edges. */
const EDGE_GAP = 4;

/** 收集 el 之上所有会裁剪内容的祖先（overflow 非 visible）。挂载时算一次即可。 */
function collectClipAncestors(el: HTMLElement): HTMLElement[] {
  const result: HTMLElement[] = [];
  let parent = el.parentElement;
  while (parent) {
    const style = getComputedStyle(parent);
    if (OVERFLOW_CLIP.test(style.overflow + style.overflowX + style.overflowY)) {
      result.push(parent);
    }
    parent = parent.parentElement;
  }
  return result;
}

/**
 * 返回 ref 元素与「所有裁剪祖先 + 视口」求交后那块可见区域的中心点（视口坐标）。
 * 用于把空态徽章浮动居中到组件**当前在屏幕上可见的那一块**，而非元素自身的完整几何尺寸。
 * 横向（如表格 overflow-auto 容器）与纵向（如页面滚动容器）会被各自的裁剪祖先正确收窄。
 */
export interface VisibleCenterOptions {
  /** Inset (px) from the viewport TOP — excludes fixed/sticky top chrome (e.g. a pinned header). */
  topInset?: number;
  /** Inset (px) from the viewport BOTTOM — excludes a fixed bottom bar (e.g. mobile tab nav). */
  bottomInset?: number;
  /**
   * Natural height (px) of the element that will be centered at the returned point. When set, the
   * returned `scale` shrinks it to fit the clean band (element ∩ safe area) and the centre y keeps the
   * scaled box inside that band, so it never spills onto the chrome or the element's own header.
   */
  reserveHeight?: number;
}

export function useVisibleCenter(
  ref: RefObject<HTMLElement>,
  { topInset = 0, bottomInset = 0, reserveHeight = 0 }: VisibleCenterOptions = {},
): VisibleCenter {
  const [state, setState] = useState<VisibleCenter>({ x: 0, y: 0, visible: false, scale: 1 });
  const rafRef = useRef<number | null>(null);
  const ancestorsRef = useRef<HTMLElement[]>([]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = ref.current;
    if (!el) return;

    ancestorsRef.current = collectClipAncestors(el);

    const compute = () => {
      rafRef.current = null;
      const node = ref.current;
      if (!node) return;

      // getBoundingClientRect 对 visibility:hidden / opacity:0 的祖先（如 keep-alive 的
      // 非激活页签）仍返回完整几何，需显式判不可见，避免浮动徽章从隐藏页泄漏到当前页。
      // 同时传新旧两套 option key（checkOpacity/checkVisibilityCSS 与 opacityProperty/visibilityProperty）以兼容各浏览器版本。
      const checkVisibility = (
        node as HTMLElement & { checkVisibility?: (options?: object) => boolean }
      ).checkVisibility;
      if (
        typeof checkVisibility === 'function' &&
        !checkVisibility.call(node, {
          checkOpacity: true,
          checkVisibilityCSS: true,
          opacityProperty: true,
          visibilityProperty: true,
        })
      ) {
        setState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      const r = node.getBoundingClientRect();
      const rect: Rect = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };

      for (const ancestor of ancestorsRef.current) {
        const ar = ancestor.getBoundingClientRect();
        rect.left = Math.max(rect.left, ar.left);
        rect.top = Math.max(rect.top, ar.top);
        rect.right = Math.min(rect.right, ar.right);
        rect.bottom = Math.min(rect.bottom, ar.bottom);
      }

      // 与视口求交（再用 topInset/bottomInset 排除吸顶/固定的页面 chrome，避免徽章浮到其上方/下方）
      rect.left = Math.max(rect.left, 0);
      rect.top = Math.max(rect.top, topInset);
      rect.right = Math.min(rect.right, window.innerWidth);
      rect.bottom = Math.min(rect.bottom, window.innerHeight - bottomInset);

      const width = rect.right - rect.left;
      const height = rect.bottom - rect.top;
      if (width <= 0 || height <= 0 || width * height < MIN_VISIBLE_AREA) {
        setState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      let centerY = rect.top + height / 2;
      let scale = 1;
      if (reserveHeight > 0) {
        // The "clean band" the box may occupy: inside the element's OWN bounds (so it never floats
        // over the table's header/toolbar above r.top, nor below its body) AND clear of the top/bottom
        // chrome (sticky FilterPanel / fixed nav).
        const topBound = Math.max(topInset, r.top);
        const botBound = Math.min(window.innerHeight - bottomInset, r.bottom);
        // Leave a small gap on each side so the box is provably clear of the chrome/header edges.
        const usable = botBound - topBound - 2 * EDGE_GAP;
        // If the band can't hold the box, shrink the box to fit (down to MIN_SCALE) instead of letting
        // it spill onto the chrome or the table header. Then centre the (scaled) box within the band.
        scale = usable >= reserveHeight ? 1 : Math.max(MIN_SCALE, usable / reserveHeight);
        const half = (reserveHeight * scale) / 2;
        const loY = topBound + EDGE_GAP + half;
        const hiY = botBound - EDGE_GAP - half;
        // When even the shrunk box can't fit the band (extremely short viewport), keeping it off the
        // bottom nav is the priority: pin its bottom just above botBound (= min(nav top, element bottom)),
        // letting the top spill onto the table's own header rather than over the nav. Never above the
        // top chrome, though.
        centerY =
          hiY >= loY
            ? Math.min(Math.max(centerY, loY), hiY)
            : Math.max(topInset + half, botBound - EDGE_GAP - half);
      }

      const next: VisibleCenter = {
        x: rect.left + width / 2,
        y: centerY,
        visible: true,
        scale,
      };
      setState((prev) =>
        prev.visible === next.visible && prev.x === next.x && prev.y === next.y && prev.scale === next.scale
          ? prev
          : next,
      );
    };

    const schedule = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(compute);
    };

    schedule();

    // scroll 不冒泡：用 capture 捕获任意嵌套滚动容器（如表格横向 overflow 容器）
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);

    // 覆盖侧边栏折叠/展开等不触发 scroll/resize、但会改变内容列宽的布局变化
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    ancestorsRef.current.forEach((a) => ro.observe(a));

    return () => {
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      ro.disconnect();
      // Reset to null after cancelling: otherwise a re-run of this effect (e.g. when an inset prop
      // changes) finds a non-null rafRef and schedule()'s `if (rafRef.current != null) return` guard
      // short-circuits, so the recompute with the new props never runs.
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [ref, topInset, bottomInset, reserveHeight]);

  return state;
}
