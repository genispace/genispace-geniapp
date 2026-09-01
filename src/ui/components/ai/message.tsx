import * as React from 'react';
import { cn } from '@genispace/geniapp/utils';

/** Read-only AI/workflow text block (shadcn.io AI Message pattern, non-chat). */
export function AiMessage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground',
        className
      )}
    >
      {children}
    </div>
  );
}
