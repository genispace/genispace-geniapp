/**
 * Kit/AI PromptInput — slim adaptation of shadcn.io/ai `prompt-input` (Vercel
 * AI Elements style). Form shell + auto-growing textarea + toolbar row +
 * status-aware submit button.
 * Adaptations: the upstream 38KB component is coupled to the Vercel AI SDK
 * (attachments, model select, nanoid); GeniSpace panels need the form/textarea/
 * toolbar/submit core only, so this is a from-scratch slim port keeping the
 * upstream visual language and component API names.
 */
import { ArrowUp, Square } from 'lucide-react';
import type { ComponentProps, KeyboardEventHandler } from 'react';
import { cn } from '@genispace/shared-utils';
import { Button } from '../../components/ui/button';

export type PromptInputStatus = 'ready' | 'streaming' | 'disabled';

export type PromptInputProps = ComponentProps<'form'>;

export const PromptInput = ({ className, ...props }: PromptInputProps) => (
  <form
    className={cn(
      'w-full divide-y divide-border overflow-hidden rounded-xl border border-border bg-background shadow-sm',
      className
    )}
    {...props}
  />
);

export type PromptInputTextareaProps = ComponentProps<'textarea'> & {
  onSubmitShortcut?: () => void;
};

export const PromptInputTextarea = ({
  className,
  onSubmitShortcut,
  onKeyDown,
  rows = 2,
  ...props
}: PromptInputTextareaProps) => {
  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      onSubmitShortcut?.();
    }
  };

  return (
    <textarea
      className={cn(
        'w-full resize-none border-0 bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      onKeyDown={handleKeyDown}
      rows={rows}
      {...props}
    />
  );
};

export type PromptInputToolbarProps = ComponentProps<'div'>;

export const PromptInputToolbar = ({ className, ...props }: PromptInputToolbarProps) => (
  <div className={cn('flex items-center justify-between gap-2 px-2 py-1.5', className)} {...props} />
);

export type PromptInputToolsProps = ComponentProps<'div'>;

export const PromptInputTools = ({ className, ...props }: PromptInputToolsProps) => (
  <div className={cn('flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground', className)} {...props} />
);

export type PromptInputSubmitProps = ComponentProps<typeof Button> & {
  status?: PromptInputStatus;
};

export const PromptInputSubmit = ({
  className,
  status = 'ready',
  children,
  ...props
}: PromptInputSubmitProps) => (
  <Button
    className={cn('h-8 w-8 shrink-0 rounded-lg p-0', className)}
    size="sm"
    type="submit"
    variant={status === 'streaming' ? 'outline' : 'default'}
    {...props}
  >
    {children ?? (status === 'streaming' ? <Square className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />)}
  </Button>
);
