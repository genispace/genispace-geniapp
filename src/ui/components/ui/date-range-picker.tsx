import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from '@genispace/geniapp/utils'
import { Button } from "./button"
import { Calendar } from "./calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover"
import { DateRange } from "react-day-picker"

export type { DateRange }

export interface DateRangePickerProps {
  dateRange?: DateRange
  onChange?: (dateRange: DateRange | undefined) => void
  placeholderText?: string
  className?: string
  compact?: boolean
}

export function DateRangePicker({
  dateRange,
  onChange,
  placeholderText = "Select date range",
  className,
  compact = false
}: DateRangePickerProps) {
  const formatDateRange = (range?: DateRange) => {
    if (!range?.from) return placeholderText
    const formatString = compact ? "MM-dd" : "PPP"
    if (!range?.to) return format(range.from, formatString, { locale: zhCN })
    return `${format(range.from, formatString, { locale: zhCN })} - ${format(range.to, formatString, { locale: zhCN })}`
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            compact 
              ? "w-full h-8 text-sm bg-white dark:bg-gray-600 border rounded px-2 py-1 justify-start text-left font-normal hover:bg-gray-50 dark:hover:bg-gray-700" 
              : "w-[280px] justify-start text-left font-normal",
            !dateRange?.from && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className={cn("h-4 w-4", compact ? "mr-1" : "mr-2")} />
          <span>{formatDateRange(dateRange)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={onChange}
          initialFocus
          locale={zhCN}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
} 