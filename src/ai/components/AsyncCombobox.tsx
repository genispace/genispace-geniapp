import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Input,
  Popover,
  PopoverTrigger,
  PopoverContent,
  ScrollArea,
} from '@genispace/geniapp/kit';

export interface AsyncOption {
  value: string;
  label: string;
  /** Optional secondary text (e.g. store of an associate). */
  hint?: string;
}

export interface AsyncComboboxLabels {
  /** Shown on the trigger when nothing is selected. */
  placeholder: string;
  searchPlaceholder: string;
  empty: string;
  loadMore: string;
  clear: string;
}

export interface AsyncComboboxProps {
  value: string | null;
  onChange: (value: string | null) => void;
  /**
   * Server-side search. Return up to `limit` options for the page; the combobox
   * requests `pageSize + 1` to detect "has more" without a COUNT.
   */
  loadOptions: (args: { search: string; limit: number; offset: number }) => Promise<AsyncOption[]>;
  /**
   * Resolve the label for the current `value` when it isn't in the loaded page
   * (e.g. a preselected id). Optional — falls back to showing the raw value.
   */
  resolveSelected?: (value: string) => Promise<AsyncOption | null>;
  labels: AsyncComboboxLabels;
  disabled?: boolean;
  allowClear?: boolean;
  pageSize?: number;
  triggerClassName?: string;
  contentClassName?: string;
}

/**
 * Searchable, paginated single-select bound to a server datasource. Replaces
 * "load-all + client filter" dropdowns; safe for very large option sets because
 * it only ever fetches one debounced page at a time. i18n-agnostic (labels in).
 */
export function AsyncCombobox({
  value,
  onChange,
  loadOptions,
  resolveSelected,
  labels,
  disabled,
  allowClear = true,
  pageSize = 20,
  triggerClassName,
  contentClassName,
}: AsyncComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [options, setOptions] = useState<AsyncOption[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<AsyncOption | null>(null);

  const reqId = useRef(0);

  // Debounce the search input.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  const fetchPage = useCallback(
    async (search: string, nextOffset: number, append: boolean) => {
      const myId = ++reqId.current;
      setLoading(true);
      try {
        const fetched = await loadOptions({ search, limit: pageSize + 1, offset: nextOffset });
        if (myId !== reqId.current) return;
        const more = fetched.length > pageSize;
        const page = fetched.slice(0, pageSize);
        setHasMore(more);
        setOffset(nextOffset);
        setOptions((prev) => (append ? [...prev, ...page] : page));
      } catch {
        if (myId !== reqId.current) return;
        if (!append) setOptions([]);
        setHasMore(false);
      } finally {
        if (myId === reqId.current) setLoading(false);
      }
    },
    [loadOptions, pageSize]
  );

  // (Re)load from the first page when opened or when the debounced query changes.
  useEffect(() => {
    if (!open) return;
    void fetchPage(debounced, 0, false);
  }, [open, debounced, fetchPage]);

  // Resolve the label for a preselected value not present in the loaded page.
  useEffect(() => {
    if (!value) {
      setSelectedOption(null);
      return;
    }
    if (selectedOption?.value === value) return;
    const inOptions = options.find((o) => o.value === value);
    if (inOptions) {
      setSelectedOption(inOptions);
      return;
    }
    if (!resolveSelected) return;
    let cancelled = false;
    void resolveSelected(value).then((opt) => {
      if (!cancelled && opt) setSelectedOption(opt);
    });
    return () => {
      cancelled = true;
    };
  }, [value, options, resolveSelected, selectedOption]);

  const triggerLabel = selectedOption?.label ?? (value || labels.placeholder);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={triggerClassName ?? 'min-w-[12rem] justify-between font-normal'}
        >
          <span className={selectedOption || value ? '' : 'text-muted-foreground'}>{triggerLabel}</span>
          <span aria-hidden className="ml-2 text-xs text-muted-foreground">▾</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className={contentClassName ?? 'w-[16rem] p-0'} align="start">
        <div className="border-b border-border p-2">
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.searchPlaceholder}
            aria-label={labels.searchPlaceholder}
          />
        </div>
        <ScrollArea className="max-h-64">
          <div className="p-1">
            {allowClear && value ? (
              <button
                type="button"
                className="block w-full rounded px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent"
                onClick={() => {
                  onChange(null);
                  setSelectedOption(null);
                  setOpen(false);
                }}
              >
                {labels.clear}
              </button>
            ) : null}

            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent ${
                  opt.value === value ? 'bg-accent font-medium' : ''
                }`}
                onClick={() => {
                  onChange(opt.value);
                  setSelectedOption(opt);
                  setOpen(false);
                }}
              >
                <span>{opt.label}</span>
                {opt.hint ? <span className="ml-2 text-xs text-muted-foreground">{opt.hint}</span> : null}
              </button>
            ))}

            {!loading && options.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">{labels.empty}</p>
            ) : null}

            {loading ? (
              <div className="space-y-1 p-1" aria-busy>
                <div className="h-7 animate-pulse rounded bg-muted" />
                <div className="h-7 animate-pulse rounded bg-muted" />
              </div>
            ) : null}

            {hasMore && !loading ? (
              <button
                type="button"
                className="mt-1 block w-full rounded px-2 py-1.5 text-center text-sm text-primary hover:bg-accent"
                onClick={() => void fetchPage(debounced, offset + pageSize, true)}
              >
                {labels.loadMore}
              </button>
            ) : null}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
