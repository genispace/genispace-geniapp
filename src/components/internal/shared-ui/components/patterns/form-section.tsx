import * as React from 'react';
import { cn } from '@genispace/shared-utils';

export type FormSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * Grouped form block: title, optional description, and fields (design tokens).
 */
export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <section className={cn('space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm', className)}>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold leading-none tracking-tight text-foreground">{title}</h3>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
