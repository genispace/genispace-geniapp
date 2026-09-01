import type { ReactNode } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@genispace/geniapp/kit';

export interface DimensionOption {
  value: string;
  label: string;
}

export interface DimensionSelectProps {
  /** Small caption shown above/inline. */
  label?: string;
  value: string;
  options: DimensionOption[];
  onChange: (value: string) => void;
  /** Sentinel value for "all" (no filter). Defaults to "__all__". */
  allValue?: string;
  allLabel?: string;
  className?: string;
}

/** A single dimension filter (channel / category / tier / store ...). */
export function DimensionSelect({
  label,
  value,
  options,
  onChange,
  allValue = '__all__',
  allLabel = 'All',
  className,
}: DimensionSelectProps) {
  return (
    <div className={`flex items-center gap-1.5 ${className ?? ''}`}>
      {label ? <span className="text-xs text-muted-foreground">{label}</span> : null}
      <Select value={value || allValue} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-[150px] text-xs">
          <SelectValue placeholder={allLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={allValue}>{allLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Horizontal toolbar that lays out time-range + dimension filters. */
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}
