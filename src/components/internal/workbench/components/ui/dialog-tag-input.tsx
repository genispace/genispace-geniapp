import * as React from "react"
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./dialog"
import { Button, Input, Label, toast, MODAL_DIMENSIONS } from "@genispace/shared-ui"
import { TagInput } from "./tag-input"
import { cn } from '@genispace/shared-utils'

export interface DialogTagInputProps {

  value: string[]

  onChange: (value: string[]) => void

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

  maxTags?: number

  allowDuplicates?: boolean
}

export const DialogTagInput = React.forwardRef<HTMLInputElement, DialogTagInputProps>(
  (
    {
      value = [],
      onChange,
      placeholder,
      label,
      dialogTitle,
      dialogDescription,
      confirmText,
      cancelText,
      disabled = false,
      className,
      style,
      minWidth = '200px',
      maxTags,
      allowDuplicates = false,
      ...props
    },
    ref
  ) => {
    const { t } = useTranslation('common')
    const resolvedConfirmText = confirmText ?? t('common.confirm', 'Confirm')
    const resolvedCancelText = cancelText ?? t('common.cancel', 'Cancel')
    const resolvedPlaceholder =
      placeholder ?? t('tag_input.click_to_enter_tags', 'Click to enter tags…')
    const resolvedDialogTitle = dialogTitle ?? label ?? t('tag_input.enter_tags_title', 'Enter tags')
    const tagInputPlaceholder = t('tag_input.press_enter_to_add', 'Type and press Enter to add…')
    const [open, setOpen] = React.useState(false)
    const [tagValues, setTagValues] = React.useState<string[]>(value || [])
    const tagInputRef = React.useRef<HTMLInputElement>(null)

    const effectiveMaxTags = maxTags !== undefined ? maxTags : 5

    React.useEffect(() => {
      if (open) {
        setTagValues(value || [])

        setTimeout(() => {
          tagInputRef.current?.focus()
        }, 100)
      }
    }, [open, value])

    const handleConfirm = () => {
      onChange(tagValues)
      setOpen(false)
    }

    const handleCancel = () => {
      setTagValues(value || [])
      setOpen(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
      }
    }

    const displayValue = value && value.length > 0 
      ? value.join(', ') 
      : '';

    return (
      <>
        <div className={cn("flex flex-col gap-2", className)}>
          {label && <Label className="text-sm font-medium">{label}</Label>}
          <Input
            ref={ref}
            type="text"
            value={displayValue}
            readOnly
            placeholder={resolvedPlaceholder}
            disabled={disabled}
            onClick={() => !disabled && setOpen(true)}
            className={cn(
              "cursor-pointer dark:bg-[#262626] dark:border-[#404040]",
              disabled && "cursor-not-allowed"
            )}
            style={{ minWidth, ...style }}
            {...props}
          />
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent style={{ maxWidth: MODAL_DIMENSIONS.sm.width, maxHeight: MODAL_DIMENSIONS.sm.maxHeight }} className="overflow-y-auto" onKeyDown={handleKeyDown}>
            <DialogHeader>
              <DialogTitle>{resolvedDialogTitle}</DialogTitle>
              {dialogDescription ? (
                <DialogDescription>{dialogDescription}</DialogDescription>
              ) : (
                <DialogDescription className="sr-only">
                  {t('tag_input.dialog_description', 'Input tags, press Enter to add, click X to remove')}
                </DialogDescription>
              )}
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <TagInput
                  ref={tagInputRef}
                  value={tagValues}
                  onChange={(newTags) => {

                    if (newTags.length > effectiveMaxTags) {

                      toast({
                        variant: 'destructive',
                        title: t('tag_input.max_tags_reached_title', 'Maximum tags reached'),
                        description: t('tag_input.max_tags_reached_description', 'You can only add up to {{maxTags}} tags', { maxTags: effectiveMaxTags }),
                        duration: 3000,
                      });
                      return;
                    }

                    setTagValues(newTags);
                  }}
                  placeholder={tagInputPlaceholder}
                  allowDuplicates={allowDuplicates}
                  maxTags={effectiveMaxTags}
                  badgeVariant="secondary"
                  onBlurBehavior="ignore"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {t(
                    'tag_input.hint_enter_and_remove',
                    'Press Enter to confirm each tag; click × to remove a tag.'
                  )}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                {resolvedCancelText}
              </Button>
              <Button onClick={handleConfirm}>
                {resolvedConfirmText}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }
)

DialogTagInput.displayName = "DialogTagInput"
