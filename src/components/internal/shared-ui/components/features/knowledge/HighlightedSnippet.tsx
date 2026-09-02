import type { HTMLAttributes, ReactNode } from 'react';

export interface HighlightRange {
  start: number;
  end: number;
}

export interface HighlightedSnippetProps extends HTMLAttributes<HTMLSpanElement> {
  text: string;
  query?: string;
  ranges?: HighlightRange[];
  renderHighlight?: (value: string, index: number) => ReactNode;
}

function normalizedRanges({
  text,
  query,
  ranges,
}: Pick<HighlightedSnippetProps, 'text' | 'query' | 'ranges'>): HighlightRange[] {
  const candidates = [...(ranges || [])];
  const terms = [...new Set(String(query || '').trim().split(/\s+/u).filter(Boolean))];
  for (const term of terms) {
    const source = text.toLocaleLowerCase();
    const needle = term.toLocaleLowerCase();
    for (let offset = 0; offset < source.length;) {
      const index = source.indexOf(needle, offset);
      if (index < 0) break;
      candidates.push({ start: index, end: index + needle.length });
      offset = index + Math.max(needle.length, 1);
    }
  }
  return candidates
    .map((range) => ({
      start: Math.max(0, Math.min(text.length, range.start)),
      end: Math.max(0, Math.min(text.length, range.end)),
    }))
    .filter((range) => range.end > range.start)
    .sort((left, right) => left.start - right.start)
    .reduce<HighlightRange[]>((merged, range) => {
      const previous = merged[merged.length - 1];
      if (previous && range.start <= previous.end) {
        previous.end = Math.max(previous.end, range.end);
      } else {
        merged.push({ ...range });
      }
      return merged;
    }, []);
}

/** Render server/query highlights as React nodes, never as injected HTML. */
export function HighlightedSnippet({
  text,
  query,
  ranges,
  renderHighlight,
  className,
  ...props
}: HighlightedSnippetProps) {
  const resolved = normalizedRanges({ text, query, ranges });
  if (!resolved.length) {
    return <span {...props} className={className}>{text}</span>;
  }
  const nodes: ReactNode[] = [];
  let cursor = 0;
  resolved.forEach((range, index) => {
    if (range.start > cursor) nodes.push(text.slice(cursor, range.start));
    const value = text.slice(range.start, range.end);
    nodes.push(
      renderHighlight
        ? renderHighlight(value, index)
        : <mark key={`${range.start}-${range.end}`} className="rounded-sm bg-warning/25 px-0.5 text-inherit">{value}</mark>
    );
    cursor = range.end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <span {...props} className={className}>{nodes}</span>;
}
