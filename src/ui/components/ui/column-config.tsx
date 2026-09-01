import * as React from 'react';
import { RotateCcw, Settings2 } from 'lucide-react';

import { cn } from '@genispace/geniapp/utils';

import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';

export interface ColumnConfigColumn {
  /** Stable column identifier persisted to localStorage */
  key: string;
  /** Human-readable label shown in the menu */
  label: React.ReactNode;
}

export interface UseColumnConfigResult {
  /** Keys of currently visible columns, in `allColumns` order */
  visibleKeys: string[];
  /** Whether a given column key is visible */
  isVisible: (key: string) => boolean;
  /** Toggle visibility of a column */
  toggle: (key: string) => void;
  /** Restore the default visibility (clears persisted state) */
  reset: () => void;
}

function readHiddenKeys(storageKey: string, fallback: string[]): string[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((k) => typeof k === 'string')) {
      return parsed;
    }
  } catch {
    // Ignore malformed persisted state and fall back to defaults.
  }
  return fallback;
}

/**
 * useColumnConfig — client-side column visibility state persisted to localStorage.
 * Tables consume `isVisible(key)` to filter their column arrays; pair with
 * `ColumnConfigMenu` for the standard configuration dropdown.
 */
export function useColumnConfig(
  storageKey: string,
  allColumns: ColumnConfigColumn[],
  defaultHidden: string[] = []
): UseColumnConfigResult {
  const defaultHiddenRef = React.useRef(defaultHidden);
  defaultHiddenRef.current = defaultHidden;

  const [hiddenKeys, setHiddenKeys] = React.useState<string[]>(() =>
    readHiddenKeys(storageKey, defaultHidden)
  );

  // Re-read persisted state when the storage key changes.
  React.useEffect(() => {
    setHiddenKeys(readHiddenKeys(storageKey, defaultHiddenRef.current));
  }, [storageKey]);

  const isVisible = React.useCallback(
    (key: string) => !hiddenKeys.includes(key),
    [hiddenKeys]
  );

  const toggle = React.useCallback(
    (key: string) => {
      setHiddenKeys((prev) => {
        const next = prev.includes(key)
          ? prev.filter((k) => k !== key)
          : [...prev, key];
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // Persisting is best-effort (private mode, quota, SSR).
        }
        return next;
      });
    },
    [storageKey]
  );

  const reset = React.useCallback(() => {
    setHiddenKeys(defaultHiddenRef.current);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Best-effort.
    }
  }, [storageKey]);

  const visibleKeys = React.useMemo(
    () => allColumns.map((c) => c.key).filter((key) => !hiddenKeys.includes(key)),
    [allColumns, hiddenKeys]
  );

  return { visibleKeys, isVisible, toggle, reset };
}

export interface ColumnConfigMenuProps {
  /** Column definitions to list in the menu */
  columns: ColumnConfigColumn[];
  /** Result of `useColumnConfig` */
  hook: UseColumnConfigResult;
  /** Accessible label for the trigger button (i18n override) */
  label?: string;
  /** Menu heading (i18n override) */
  menuLabel?: string;
  /** Reset item label (i18n override) */
  resetLabel?: string;
  /** Extra classes for the trigger button */
  className?: string;
}

/**
 * ColumnConfigMenu — standard "configure columns" dropdown (Settings2 ghost icon
 * button) with a checkbox item per column and a reset item.
 */
export function ColumnConfigMenu({
  columns,
  hook,
  label = 'Configure columns',
  menuLabel = 'Columns',
  resetLabel = 'Reset columns',
  className,
}: ColumnConfigMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          className={cn('shrink-0', className)}
        >
          <Settings2 className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>{menuLabel}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.key}
            checked={hook.isVisible(column.key)}
            onCheckedChange={() => hook.toggle(column.key)}
            // Keep the menu open while toggling multiple columns.
            onSelect={(event) => event.preventDefault()}
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => hook.reset()}>
          <RotateCcw className="mr-2 h-3.5 w-3.5" aria-hidden />
          {resetLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
