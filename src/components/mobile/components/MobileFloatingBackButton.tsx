import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { useMobileNavigationCanGoBack } from '@/mobile/hooks/useMobileNavigationCanGoBack';
import {
  formatMobileNavEntry,
  popMobileNavigationEntry,
} from '@/mobile/utils/mobileNavigationStore';

const BTN_HEIGHT = 36;
const DRAG_THRESHOLD_PX = 4;
// Default: just below the sticky FilterPanel (toolbar ~20 + panel with store/date rows ~150
// + spacing) so the pill never overlaps the panel's selected-items row.
const DEFAULT_TOP = 188;
const MIN_TOP = 28;
const BOTTOM_MARGIN = 24;

function clampTop(top: number): number {
  const maxTop = window.innerHeight - BTN_HEIGHT - BOTTOM_MARGIN;
  return Math.max(MIN_TOP, Math.min(maxTop, top));
}

function storageKey(workbenchId: string | undefined, variant: 'mobile' | 'desktop'): string {
  // Positions are remembered per device form factor: desktop and mobile screens differ
  // too much in height for a dragged offset to make sense on both.
  const suffix = variant === 'desktop' ? '-desktop' : '';
  return `wb-fab-back-top-${workbenchId ?? 'default'}${suffix}`;
}

function readStoredTop(workbenchId: string | undefined, variant: 'mobile' | 'desktop'): number {
  try {
    const raw = localStorage.getItem(storageKey(workbenchId, variant));
    const parsed = raw === null ? NaN : parseInt(raw, 10);
    return Number.isNaN(parsed) ? DEFAULT_TOP : parsed;
  } catch {
    return DEFAULT_TOP;
  }
}

interface MobileFloatingBackButtonProps {
  /** Config gate (appConfig.floatingBackButton). */
  enabled: boolean;
  workbenchId?: string;
  /** Form factor — only affects which localStorage key the dragged position is stored
   *  under (desktop and mobile positions are remembered separately). Defaults to mobile. */
  variant?: 'mobile' | 'desktop';
  /** Left offset in px. Desktop passes the sidebar width + gap so the pill sits at the
   *  content area's left edge instead of covering the sidebar nav; mobile keeps the
   *  viewport left edge (safe-area aware) when omitted. */
  leftOffset?: number;
}

/**
 * Floating pill-shaped back button for drill-down pages (SW requirement E rework, 2026-08-05;
 * extended to the desktop layout 2026-08-06 despite the Mobile* name). Shown whenever the
 * shared nav stack has a previous entry; sits at the left edge below the FilterPanel,
 * draggable vertically, and the dragged position is shared across drill-down pages
 * (persisted per workbench per form factor in localStorage).
 */
export const MobileFloatingBackButton: React.FC<MobileFloatingBackButtonProps> = ({
  enabled,
  workbenchId,
  variant = 'mobile',
  leftOffset,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation(['workbench', 'common']);
  const canGoBack = useMobileNavigationCanGoBack();

  const [top, setTop] = useState<number>(() => clampTop(readStoredTop(workbenchId, variant)));
  const [dragging, setDragging] = useState(false);
  const dragState = useRef({ dragging: false, moved: false, startY: 0, startTop: 0 });

  useEffect(() => {
    setTop(clampTop(readStoredTop(workbenchId, variant)));
  }, [workbenchId, variant]);

  const goBack = useCallback(() => {
    const prev = popMobileNavigationEntry();
    if (prev) {
      navigate(formatMobileNavEntry(prev), { replace: true });
    }
  }, [navigate]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    dragState.current = { dragging: true, moved: false, startY: e.clientY, startTop: top };
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }, [top]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const state = dragState.current;
    if (!state.dragging) {
      return;
    }
    const dy = e.clientY - state.startY;
    if (Math.abs(dy) > DRAG_THRESHOLD_PX) {
      state.moved = true;
    }
    if (state.moved) {
      setTop(clampTop(state.startTop + dy));
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    const state = dragState.current;
    setDragging(false);
    if (!state.dragging) {
      return;
    }
    state.dragging = false;
    if (state.moved) {
      try {
        localStorage.setItem(storageKey(workbenchId, variant), String(Math.round(top)));
      } catch {
        // storage unavailable — position stays in memory for this session
      }
    } else {
      goBack();
    }
  }, [goBack, top, workbenchId, variant]);

  const handlePointerCancel = useCallback(() => {
    dragState.current.dragging = false;
    setDragging(false);
  }, []);

  if (!enabled || !canGoBack) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label={t('mobile.back', 'Back')}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className={`fixed z-[35] flex h-9 select-none items-center gap-0.5 rounded-full border border-slate-200 bg-white pl-2 pr-3.5 text-sm font-medium text-indigo-600 shadow-md touch-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-indigo-300 ${
        dragging ? 'cursor-grabbing shadow-lg' : 'cursor-grab'
      }`}
      style={{
        top,
        left: leftOffset ?? 'calc(8px + env(safe-area-inset-left, 0px))',
      }}
    >
      <ChevronLeft className="h-[18px] w-[18px]" aria-hidden />
      <span>{t('mobile.back', 'Back')}</span>
    </button>
  );
};

export default MobileFloatingBackButton;
