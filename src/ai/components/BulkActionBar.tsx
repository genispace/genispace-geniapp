import { type ReactNode } from 'react';
import { Button, type ButtonProps } from '@genispace/geniapp/kit';

/** One action button rendered in a {@link BulkActionBar}. */
export interface BulkAction {
  /** Stable id (used for React keys). */
  key: string;
  /** Button content (already localized by the caller). */
  label: ReactNode;
  onClick: () => void;
  /** Button visual variant; forwarded to the kit `Button`. */
  variant?: ButtonProps['variant'];
  disabled?: boolean;
}

export interface BulkActionBarLabels {
  /** Localized "N selected" label; receives the current selected count. */
  selected: (n: number) => string;
  /** Localized "select all M matching" affordance; receives the total match count. */
  selectAllMatching?: (m: number) => string;
  /** Localized "clear selection" label. */
  clear: string;
}

export interface BulkActionBarProps {
  /** Number of currently selected rows. */
  selectedCount: number;
  /** Total rows matching the active filter (across all pages), if known. */
  totalMatching?: number;
  /** Whether every matching row (not just the visible page) is already selected. */
  allMatchingSelected?: boolean;
  /** Promote the current page selection to "all M matching". */
  onSelectAllMatching?: () => void;
  /** Clear the entire selection. */
  onClear: () => void;
  actions: BulkAction[];
  labels: BulkActionBarLabels;
  className?: string;
}

/**
 * Sticky toolbar surfaced when rows are selected. Shows the selected count, an
 * optional "select all M matching" affordance (for selecting beyond the visible
 * page), the caller's bulk actions, and a clear control. Renders nothing when the
 * selection is empty. i18n-agnostic — all text comes from `labels`/`actions`.
 */
export function BulkActionBar({
  selectedCount,
  totalMatching,
  allMatchingSelected,
  onSelectAllMatching,
  onClear,
  actions,
  labels,
  className,
}: BulkActionBarProps) {
  if (selectedCount <= 0) return null;

  // Offer "select all matching" only when there are more matches than selected,
  // the caller wired up a handler, and a localized label is available.
  const canSelectAllMatching =
    !allMatchingSelected &&
    Boolean(onSelectAllMatching) &&
    Boolean(labels.selectAllMatching) &&
    typeof totalMatching === 'number' &&
    totalMatching > selectedCount;

  return (
    <div
      className={
        className ??
        'sticky bottom-0 z-10 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-background/95 px-4 py-2.5 shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/80'
      }
      role="toolbar"
    >
      <span className="text-sm font-medium">{labels.selected(selectedCount)}</span>

      {canSelectAllMatching ? (
        <Button variant="link" size="sm" className="h-auto px-0" onClick={onSelectAllMatching}>
          {(labels.selectAllMatching as (m: number) => string)(totalMatching as number)}
        </Button>
      ) : null}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {actions.map((action) => (
          <Button
            key={action.key}
            variant={action.variant ?? 'outline'}
            size="sm"
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={onClear}>
          {labels.clear}
        </Button>
      </div>
    </div>
  );
}
