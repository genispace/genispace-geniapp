import * as React from "react"
import { cn } from '@genispace/shared-utils'

interface SliderProps {
  value?: number[]
  defaultValue?: number[]
  onValueChange?: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  className?: string
  disabled?: boolean
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ 
    value, 
    defaultValue = [0], 
    onValueChange, 
    min = 0, 
    max = 100, 
    step = 1, 
    className,
    disabled = false,
    ...props 
  }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue)
    const sliderRef = React.useRef<HTMLDivElement>(null)
    const thumbRef = React.useRef<HTMLDivElement>(null)

    const currentValue = value || internalValue
    const currentValuePercent = ((currentValue[0] - min) / (max - min)) * 100

    const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
      if (disabled) return

      const slider = sliderRef.current
      if (!slider) return

      const updateValue = (clientX: number) => {
        const rect = slider.getBoundingClientRect()
        const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
        const newValue = Math.round((min + percent * (max - min)) / step) * step
        const clampedValue = Math.max(min, Math.min(max, newValue))

        const newValueArray = [clampedValue]
        setInternalValue(newValueArray)
        onValueChange?.(newValueArray)
      }

      updateValue(e.clientX)

      const handleMouseMove = (e: MouseEvent) => {
        updateValue(e.clientX)
      }

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }, [disabled, min, max, step, onValueChange])

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
      if (disabled) return

      let newValue = currentValue[0]

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          newValue = Math.max(min, currentValue[0] - step)
          break
        case 'ArrowRight':
        case 'ArrowUp':
          newValue = Math.min(max, currentValue[0] + step)
          break
        case 'Home':
          newValue = min
          break
        case 'End':
          newValue = max
          break
        default:
          return
      }

      e.preventDefault()
      const newValueArray = [newValue]
      setInternalValue(newValueArray)
      onValueChange?.(newValueArray)
    }, [disabled, currentValue, min, max, step, onValueChange])

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          className
        )}
        {...props}
      >
        <div
          ref={sliderRef}
          className="relative h-2 w-full grow overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700 cursor-pointer"
          onMouseDown={handleMouseDown}
        >
          <div 
            className="absolute h-full bg-brand-primary-light dark:bg-brand-primary transition-all duration-150 ease-out"
            style={{ width: `${currentValuePercent}%` }}
          />
        </div>
        <div
          ref={thumbRef}
          className={cn(
            "absolute block h-5 w-5 rounded-full border-2 border-brand-primary bg-white shadow-md transition-colors cursor-pointer",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
            disabled && "pointer-events-none opacity-50"
          )}
          style={{ left: `calc(${currentValuePercent}% - 10px)` }}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={handleKeyDown}
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={currentValue[0]}
        />
      </div>
    )
  }
)

Slider.displayName = "Slider"

export { Slider } 