import { useState } from 'react';
import { CalendarRange } from 'lucide-react';
import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ToggleGroup,
  ToggleGroupItem,
} from '@genispace/geniapp/kit';
import { RANGE_PRESETS, type RangePreset, type DateRange } from './useDashboardRange';

/** Default preset labels (English). Override via `labels` for i18n. */
const DEFAULT_LABELS: Record<RangePreset, string> = {
  today: 'Today',
  '7d': '7D',
  '30d': '30D',
  mtd: 'MTD',
  qtd: 'QTD',
  ytd: 'YTD',
  '12m': '12M',
  custom: 'Custom',
};

export interface TimeRangePickerProps {
  range: DateRange;
  setPreset: (p: RangePreset) => void;
  setCustom: (from: string, to: string) => void;
  /** Optional i18n label overrides (per preset, plus `apply`). */
  labels?: Partial<Record<RangePreset, string>> & { apply?: string };
  /** Visible presets (defaults to all). */
  presets?: RangePreset[];
}

export function TimeRangePicker({ range, setPreset, setCustom, labels, presets = RANGE_PRESETS }: TimeRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(range.from);
  // The picker's custom `to` is inclusive; range.to is exclusive, so show the prior day by default.
  const [to, setTo] = useState(range.to);
  const label = (p: RangePreset) => labels?.[p] ?? DEFAULT_LABELS[p];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleGroup
        type="single"
        value={range.preset === 'custom' ? '' : range.preset}
        onValueChange={(v) => {
          if (v) setPreset(v as RangePreset);
        }}
        className="flex-wrap justify-start"
      >
        {presets.map((p) => (
          <ToggleGroupItem key={p} value={p} aria-label={label(p)} className="h-8 px-3 text-xs">
            {label(p)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={range.preset === 'custom' ? 'default' : 'outline'}
            size="sm"
            className="h-8 gap-1.5 text-xs"
          >
            <CalendarRange className="h-3.5 w-3.5" />
            {range.preset === 'custom' ? `${range.from} → ${range.to}` : (labels?.custom ?? DEFAULT_LABELS.custom)}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto space-y-3 p-3">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 w-[150px] text-xs"
            />
            <span className="text-muted-foreground">→</span>
            <Input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 w-[150px] text-xs"
            />
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={!from || !to || from > to}
              onClick={() => {
                setCustom(from, to);
                setOpen(false);
              }}
            >
              {labels?.apply ?? 'Apply'}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
