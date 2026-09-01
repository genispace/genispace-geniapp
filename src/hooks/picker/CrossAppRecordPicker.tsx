import { useEffect, useId, useRef, useState } from "react";

export type CrossAppRecordOption = {
  id: string;
  primary: string;
  secondary?: string;
  status?: string;
  snapshot?: Record<string, CrossAppSnapshotValue>;
};

export type CrossAppSnapshotValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | CrossAppSnapshotValue[]
  | { [key: string]: CrossAppSnapshotValue };

export type CrossAppRecordPage = {
  records: CrossAppRecordOption[];
  total: number;
};

export type CrossAppRecordPickerProps = {
  label: string;
  description?: string;
  placeholder?: string;
  emptyText: string;
  unavailableText: string;
  forbiddenText: string;
  selected?: CrossAppRecordOption | null;
  pageSize?: number;
  disabled?: boolean;
  providerState?: "ready" | "unavailable" | "forbidden";
  loadPage: (input: {
    search: string;
    limit: number;
    offset: number;
  }) => Promise<CrossAppRecordPage>;
  onSelect: (record: CrossAppRecordOption | null) => void;
};

/**
 * Shared cross-GeniApp record picker. The provider remains responsible for
 * row/field authorization; consumers only receive display-safe snapshots.
 */
export function CrossAppRecordPicker({
  label,
  description,
  placeholder = "",
  emptyText,
  unavailableText,
  forbiddenText,
  selected = null,
  pageSize = 10,
  disabled = false,
  providerState = "ready",
  loadPage,
  onSelect,
}: CrossAppRecordPickerProps) {
  const id = useId();
  const request = useRef(0);
  const loadPageRef = useRef(loadPage);
  loadPageRef.current = loadPage;
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<CrossAppRecordOption[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const current = ++request.current;
    if (providerState !== "ready") {
      setRecords([]);
      setTotal(0);
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    void loadPageRef
      .current({
        search: appliedSearch,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      })
      .then((result) => {
        if (request.current !== current) return;
        setRecords(result.records);
        setTotal(Math.max(0, result.total));
      })
      .catch((reason: unknown) => {
        if (request.current !== current) return;
        setRecords([]);
        setTotal(0);
        setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (request.current === current) setLoading(false);
      });
    return () => {
      request.current += 1;
    };
  }, [appliedSearch, page, pageSize, providerState]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const stateMessage =
    providerState === "unavailable"
      ? unavailableText
      : providerState === "forbidden"
        ? forbiddenText
        : error;

  return (
    <section
      className="rounded-xl border border-border p-4"
      aria-labelledby={`${id}-label`}
    >
      <div>
        <label
          id={`${id}-label`}
          htmlFor={`${id}-search`}
          className="block text-sm font-medium"
        >
          {label}
        </label>
        {description && (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {selected && (
        <div className="mt-3 flex items-start justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{selected.primary}</p>
            {selected.secondary && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {selected.secondary}
              </p>
            )}
          </div>
          <button
            type="button"
            className="min-h-[44px] rounded-lg border border-border bg-background px-3 text-xs"
            disabled={disabled}
            onClick={() => onSelect(null)}
          >
            ×
          </button>
        </div>
      )}
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setAppliedSearch(search.trim());
        }}
      >
        <input
          id={`${id}-search`}
          className="h-[44px] min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          value={search}
          disabled={disabled || providerState !== "ready"}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={placeholder}
        />
        <button
          type="submit"
          className="min-h-[44px] rounded-lg border border-border bg-background px-4 text-sm font-medium disabled:opacity-50"
          disabled={disabled || providerState !== "ready" || loading}
        >
          ⌕
        </button>
      </form>
      {stateMessage && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground"
        >
          {stateMessage}
        </p>
      )}
      {providerState === "ready" && !stateMessage && (
        <div className="mt-3 space-y-2" aria-busy={loading}>
          {loading && (
            <p className="py-4 text-center text-xs text-muted-foreground">…</p>
          )}
          {!loading &&
            records.map((record) => (
              <button
                key={record.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(record)}
                className="flex min-h-[48px] w-full items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left hover:bg-accent disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {record.primary}
                  </span>
                  {record.secondary && (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {record.secondary}
                    </span>
                  )}
                </span>
                {record.status && (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                    {record.status}
                  </span>
                )}
              </button>
            ))}
          {!loading && !records.length && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              {emptyText}
            </p>
          )}
        </div>
      )}
      {providerState === "ready" &&
        !loading &&
        !stateMessage &&
        total > pageSize && (
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              {page}/{pageCount} · {total}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="min-h-[44px] rounded-lg border border-border px-3 disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                ‹
              </button>
              <button
                type="button"
                className="min-h-[44px] rounded-lg border border-border px-3 disabled:opacity-40"
                disabled={page >= pageCount}
                onClick={() =>
                  setPage((value) => Math.min(pageCount, value + 1))
                }
              >
                ›
              </button>
            </div>
          </div>
        )}
    </section>
  );
}
