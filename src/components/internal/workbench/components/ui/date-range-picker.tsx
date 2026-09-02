import * as React from "react"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from '@genispace/shared-ui'
import { Calendar } from '@genispace/shared-ui'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@genispace/shared-ui'

export interface DateRange {
  from?: Date
  to?: Date
}

export interface DateRangePickerProps {
  dateRange?: DateRange
  onChange?: (dateRange: DateRange) => void
  placeholderText?: string
}

export function DateRangePicker({
  dateRange,
  onChange,
  placeholderText
}: DateRangePickerProps) {
  const { t } = useTranslation('common');
  const defaultPlaceholder = placeholderText || t('date_range_picker.select_date_range', 'Select date range');

  const formatDateRange = (range?: DateRange) => {
    if (!range?.from) return defaultPlaceholder
    if (!range?.to) return format(range.from, "PPP", { locale: zhCN })
    return `${format(range.from, "PPP", { locale: zhCN })} - ${format(range.to, "PPP", { locale: zhCN })}`
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !dateRange?.from && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span>{formatDateRange(dateRange)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={dateRange as never}
          onSelect={onChange}
          initialFocus
          locale={zhCN}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
} 