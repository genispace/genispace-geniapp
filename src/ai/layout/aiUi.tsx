import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@genispace/geniapp/utils';
import { Button } from '@genispace/geniapp/kit';

/** Read-only AI/workflow text block (matches shared-ui AiMessage; kept here for CI kit compatibility). */
export function AiMessage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Field suggestion row for audit adopt (matches shared-ui AiSuggestion). */
export function AiSuggestion({
  label,
  children,
  action,
  className,
}: {
  label: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border border-border bg-muted/30 p-3', className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {action}
      </div>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

export function AiSuggestionAction({
  children,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button type="button" size="sm" variant="outline" {...props}>
      {children}
    </Button>
  );
}
