import React, { useState, useRef, useEffect, KeyboardEvent, FocusEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Badge, toast } from '@genispace/shared-ui';
import { Input } from '@genispace/shared-ui';
import { cn } from '@genispace/shared-utils';

export interface TagInputProps {

  value: string[];

  onChange: (tags: string[]) => void;

  placeholder?: string;

  disabled?: boolean;

  maxTags?: number;

  allowDuplicates?: boolean;

  validateTag?: (tag: string) => boolean | string;

  separator?: string | RegExp;

  className?: string;

  inputClassName?: string;

  tagsContainerClassName?: string;

  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';

  onBlurBehavior?: 'add' | 'ignore';

  onTagAdd?: (tag: string) => void;

  onTagRemove?: (tag: string, index: number) => void;

  inputProps?: React.ComponentProps<typeof Input>;
}

export const TagInput = React.forwardRef<HTMLInputElement, TagInputProps>(
  (
    {
      value = [],
      onChange,
      placeholder,
      disabled = false,
      maxTags,
      allowDuplicates = false,
      validateTag,
      separator = /[,\s]+/,
      className,
      inputClassName,
      tagsContainerClassName,
      badgeVariant = 'secondary',
      onBlurBehavior = 'ignore',
      onTagAdd,
      onTagRemove,
      inputProps,
    },
    ref
  ) => {
    const { t } = useTranslation('common');
    const defaultPlaceholder = placeholder || t('tag_input.placeholder', 'Enter value, press Enter to add...');
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const combinedRef = ref || inputRef;

    const valueRef = useRef(value);

    useEffect(() => {
      valueRef.current = value;
    }, [value]);

    const addTag = (tag: string) => {
      const trimmedTag = tag.trim();

      if (!trimmedTag) {
        return false;
      }

      const currentValueLength = valueRef.current.length;
      if (maxTags !== undefined && currentValueLength >= maxTags) {

        toast({
          variant: 'destructive',
          title: t('tag_input.max_tags_reached_title', 'Maximum tags reached'),
          description: t('tag_input.max_tags_reached_description', 'You can only add up to {{maxTags}} tags', { maxTags }),
          duration: 3000,
        });
        return false;
      }

      if (!allowDuplicates && valueRef.current.includes(trimmedTag)) {
        return false;
      }

      if (validateTag) {
        const validationResult = validateTag(trimmedTag);
        if (validationResult === false) {
          return false;
        }
        if (typeof validationResult === 'string') {

          console.warn(validationResult);
          return false;
        }
      }

      const newTags = [...valueRef.current, trimmedTag];

      if (maxTags !== undefined && newTags.length > maxTags) {

        toast({
          variant: 'destructive',
          title: t('tag_input.max_tags_reached_title', 'Maximum tags reached'),
          description: t('tag_input.max_tags_reached_description', 'You can only add up to {{maxTags}} tags', { maxTags }),
          duration: 3000,
        });
        return false;
      }

      valueRef.current = newTags;
      onChange(newTags);
      onTagAdd?.(trimmedTag);
      setInputValue('');
      return true;
    };

    const removeTag = (index: number) => {
      const tag = value[index];
      const newTags = value.filter((_, i) => i !== index);
      onChange(newTags);
      onTagRemove?.(tag, index);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        if (inputValue.trim()) {
          addTag(inputValue);
        }
        return;
      }

      if (e.key === 'Backspace') {

        if (!inputValue && valueRef.current.length > 0) {
          e.preventDefault();
          removeTag(valueRef.current.length - 1);
          return;
        }
      }

      inputProps?.onKeyDown?.(e);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      if (disabled) return;

      const pastedText = e.clipboardData.getData('text');

      const tags = typeof separator === 'string' 
        ? pastedText.split(separator).map(tag => tag.trim()).filter(tag => tag)
        : pastedText.split(separator).map(tag => tag.trim()).filter(tag => tag);

      if (tags.length > 1) {
        e.preventDefault();

        const currentCount = valueRef.current.length;
        const availableSlots = maxTags !== undefined 
          ? Math.max(0, maxTags - currentCount) 
          : tags.length;

        const tagsToAdd = tags.slice(0, availableSlots);

        tagsToAdd.forEach(tag => {
          addTag(tag);
        });
      }

      inputProps?.onPaste?.(e);
    };

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
      if (onBlurBehavior === 'add' && inputValue.trim()) {
        addTag(inputValue);
      }
      inputProps?.onBlur?.(e);
    };

    return (
      <div
        className={cn(
          'flex flex-wrap items-center gap-1 min-h-9 w-full rounded-md border border-input bg-transparent px-1 py-0.5 text-sm',
          value.length === 0 && 'h-9',
          'focus-within:ring-1 focus-within:ring-ring',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        onClick={() => {
          if (!disabled && combinedRef && 'current' in combinedRef) {
            combinedRef.current?.focus();
          }
        }}
      >
        {value.length > 0 && (
          <div
            className={cn(
              'flex flex-wrap items-center gap-1',
              tagsContainerClassName
            )}
          >
            {value.map((tag, index) => (
              <Badge
                key={`${tag}-${index}`}
                variant={badgeVariant}
                className="inline-flex items-center gap-0.5 px-1 py-0 text-xs h-4"
              >
                <span>{tag}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTag(index);
                    }}
                    className="btn btn-ghost btn-icon ml-0.5 rounded-full"
                    aria-label={t('tag_input.remove_tag', 'Remove tag {{tag}}', { tag })}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}

        <Input
          ref={combinedRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            inputProps?.onChange?.(e);
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={handleBlur}
          placeholder={defaultPlaceholder}
          disabled={disabled}
          className={cn(
            'flex-1 w-full border-0 bg-transparent p-0 m-0.1 focus-visible:ring-0 focus-visible:ring-offset-0 leading-[1.5] h-auto align-middle placeholder:leading-[1.5] placeholder:translate-y-[1px] placeholder:translate-x-[5px]',
            inputClassName
          )}
          {...inputProps}
        />
      </div>
    );
  }
);

TagInput.displayName = 'TagInput';

export default TagInput;

