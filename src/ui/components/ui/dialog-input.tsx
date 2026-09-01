import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./dialog"
import { MODAL_DIMENSIONS } from '../../styles/design-tokens'
import { Button } from "./button"
import { Input } from "./input"
import { Label } from "./label"
import { cn } from '@genispace/geniapp/utils'

export interface DialogInputProps {

  value: string | number

  onChange: (value: string | number) => void

  type?: 'text' | 'number'

  placeholder?: string

  label?: string

  dialogTitle?: string

  dialogDescription?: string

  confirmText?: string

  cancelText?: string

  disabled?: boolean

  className?: string

  style?: React.CSSProperties

  minWidth?: string
}

export const DialogInput = React.forwardRef<HTMLInputElement, DialogInputProps>(
  (
    {
      value,
      onChange,
      type = 'text',
      placeholder,
      label,
      dialogTitle,
      dialogDescription,
      confirmText = 'OK',
      cancelText = 'Cancel',
      disabled = false,
      className,
      style,
      minWidth = '200px',
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState<string>(String(value || ''))
    const inputRef = React.useRef<HTMLInputElement>(null)

    React.useEffect(() => {
      if (open) {
        setInputValue(String(value || ''))

        setTimeout(() => {
          inputRef.current?.focus()
          inputRef.current?.select()
        }, 100)
      }
    }, [open, value])

    const handleConfirm = () => {
      if (type === 'number') {
        const numValue = inputValue === '' ? '' : (isNaN(Number(inputValue)) ? '' : Number(inputValue))
        onChange(numValue)
      } else {
        onChange(inputValue)
      }
      setOpen(false)
    }

    const handleCancel = () => {
      setInputValue(String(value || ''))
      setOpen(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleConfirm()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
      }
    }

    const displayValue = value === '' || value === null || value === undefined ? '' : String(value);

    return (
      <>
        <div className={cn("flex flex-col gap-2", className)}>
          {label && <Label className="text-sm font-medium">{label}</Label>}
            <Input
              ref={ref}
              type={type}
              value={displayValue}
              readOnly
              placeholder={placeholder}
              disabled={disabled}
              onClick={() => !disabled && setOpen(true)}
              className={cn(
                "cursor-pointer",
                disabled && "cursor-not-allowed"
              )}
              style={{ minWidth, ...style }}
              {...props}
            />
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent style={{ maxWidth: MODAL_DIMENSIONS.sm.width, maxHeight: MODAL_DIMENSIONS.sm.maxHeight }} className="overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{dialogTitle || label || 'Input value'}</DialogTitle>
              {dialogDescription && (
                <p className="text-sm text-muted-foreground">{dialogDescription}</p>
              )}
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="dialog-input">{label || 'Value'}</Label>
                <Input
                  ref={inputRef}
                  id="dialog-input"
                  type={type}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                {cancelText}
              </Button>
              <Button onClick={handleConfirm}>
                {confirmText}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }
)

DialogInput.displayName = "DialogInput"

