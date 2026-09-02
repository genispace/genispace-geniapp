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

export interface DatePickerProps {
  selected?: Date
  onChange?: (date: Date | null) => void
  placeholderText?: string
}

export function DatePicker({
  selected,
  onChange,
  placeholderText
}: DatePickerProps) {
  const { t } = useTranslation('common');
  const defaultPlaceholder = placeholderText || t('form_field_renderer.select_date', 'Select date');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[240px] justify-start text-left font-normal",
            !selected && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected ? format(selected, "PPP", { locale: zhCN }) : <span>{defaultPlaceholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={onChange}
          initialFocus
          locale={zhCN}
        />
      </PopoverContent>
    </Popover>
  )
} 