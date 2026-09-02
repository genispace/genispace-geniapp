import * as React from 'react';
import { cn } from '@genispace/shared-utils';
import { Button } from '../ui/button';

/** shadcn.io AI–style field suggestion row (audit adopt, not chat). */
export function AiSuggestion({
  label,
  children,
  action,
  className,
}: {
  label: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-muted/30 p-3',
        className
      )}
    >
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
}: React.ComponentProps<typeof Button>) {
  return (
    <Button type="button" size="sm" variant="outline" {...props}>
      {children}
    </Button>
  );
}
