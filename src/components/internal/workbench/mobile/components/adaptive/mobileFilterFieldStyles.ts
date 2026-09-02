import { cn } from '@genispace/shared-utils';

/** Shared layout tokens for mobile FilterPanel fields (DESIGN_GUIDELINE §05–07). */
export const mobileFilterFieldStyles = {
  panel: cn(
    'workbench-filter-panel workbench-filter-panel--mobile w-full',
    'rounded-lg border border-border bg-card p-4 shadow-sm'
  ),
  fieldsStack: 'flex flex-col gap-4',
  /** Label left, control right (panel row fields). */
  field: 'flex flex-row items-center gap-2',
  /** Vertical stack inside bottom sheet (e.g. date start/end). */
  sheetField: 'flex flex-col gap-2',
  label: 'shrink-0 text-sm font-medium text-foreground whitespace-nowrap',
  control: 'min-w-0 flex-1',
  /** Border aligned with date summary row (overrides Select default neutral-300) */
  fieldControl: cn(
    'rounded-lg border border-border bg-background shadow-sm',
    'text-sm text-foreground'
  ),
  controlTrigger: cn(
    'h-9 w-full justify-between rounded-lg font-normal',
    'border-border bg-background text-foreground'
  ),
  selectTrigger: cn(
    'h-9 w-full rounded-lg border-border bg-background shadow-sm',
    'focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background'
  ),
  chipRow: 'flex gap-2 overflow-x-auto pb-1',
  chip: 'shrink-0 rounded-full',
  sheetFooter: cn(
    'sticky bottom-0 -mx-4 mt-6 flex gap-3 border-t border-border',
    'bg-background px-4 pb-2 pt-4'
  ),
  sheetAction: 'h-9 flex-1 rounded-lg',
} as const;
