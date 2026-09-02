import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from '@genispace/shared-utils'
import { Popover, PopoverTrigger, PopoverContent } from './popover'
import { Checkbox } from './checkbox'
import { Button } from './button'

export interface MultiSelectOption {
  label: string
  value: string
  disabled?: boolean
}

export interface MultiSelectProps {
  options: MultiSelectOption[]
  value?: string[]
  onChange?: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
  contentClassName?: string
  maxDisplayCount?: number 
  showClearButton?: boolean 
  emptyText?: string 
}

export const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectProps>(
  (
    {
      options,
      value = [],
      onChange,
      placeholder = "Please select",
      disabled = false,
      className,
      triggerClassName,
      contentClassName,
      maxDisplayCount = 3,
      showClearButton = true,
      emptyText = "No options",
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)
    const selectedValues = React.useMemo(
      () => (Array.isArray(value) ? value : []),
      [value]
    )

    const selectedOptions = React.useMemo(() => {
      return options.filter(opt => selectedValues.includes(opt.value))
    }, [options, selectedValues])

    const getDisplayText = () => {
      if (selectedOptions.length === 0) {
        return placeholder
      }

      if (selectedOptions.length <= maxDisplayCount) {
        return selectedOptions.map(opt => opt.label).join(', ')
      }

      const displayed = selectedOptions.slice(0, maxDisplayCount)
      const remaining = selectedOptions.length - maxDisplayCount
      return `${displayed.map(opt => opt.label).join(', ')} +${remaining}`
    }

    const handleToggleOption = (optionValue: string) => {
      if (disabled) return

      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter(v => v !== optionValue)
        : [...selectedValues, optionValue]

      onChange?.(newValues)
    }

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation()
      onChange?.([])
    }

    const handleSelectAll = () => {
      const allValues = options.filter(opt => !opt.disabled).map(opt => opt.value)
      if (selectedValues.length === allValues.length) {
        onChange?.([])
      } else {
        onChange?.(allValues)
      }
    }

    const allSelected = options.filter(opt => !opt.disabled).length > 0 && 
                       selectedValues.length === options.filter(opt => !opt.disabled).length

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "h-9 w-full justify-between text-left font-normal",
              !selectedOptions.length && "text-muted-foreground",
              triggerClassName,
              className
            )}
          >
            <span className="truncate flex-1 text-left">
              {getDisplayText()}
            </span>
            <div className="flex items-center gap-1 ml-2 shrink-0">
              {showClearButton && selectedOptions.length > 0 && (
                <X
                  className="h-4 w-4 opacity-50 hover:opacity-100 transition-opacity"
                  onClick={handleClear}
                />
              )}
              <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className={cn("w-[var(--radix-popover-trigger-width)] p-0", contentClassName)}
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="max-h-[300px] overflow-y-auto">
            {options.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              <>
                {options.filter(opt => !opt.disabled).length > 0 && (
                  <div className="px-2 py-1.5 border-b">
                    <div
                      className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer"
                      onClick={handleSelectAll}
                    >
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-sm font-medium">
                        {allSelected ? 'Deselect all' : 'Select all'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-1">
                  {options.map((option) => {
                    const isSelected = selectedValues.includes(option.value)
                    return (
                      <div
                        key={option.value}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-accent transition-colors",
                          option.disabled && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => !option.disabled && handleToggleOption(option.value)}
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled={option.disabled}
                          onCheckedChange={() => !option.disabled && handleToggleOption(option.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-sm flex-1">{option.label}</span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    )
  }
)

MultiSelect.displayName = "MultiSelect"

