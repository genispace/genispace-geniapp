import * as React from 'react';
import { cn } from '@genispace/shared-utils';

export type RecordListFrameProps = {
  title: string;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * List shell: title row, optional toolbar, scrollable body (table in `children`).
 */
export function RecordListFrame({ title, toolbar, footer, children, className }: RecordListFrameProps) {
  return (
    <section className={cn('rounded-xl border border-border bg-card shadow-sm', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
      </div>
      <div className="overflow-x-auto px-2 py-2">{children}</div>
      {footer ? <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">{footer}</div> : null}
    </section>
  );
}
