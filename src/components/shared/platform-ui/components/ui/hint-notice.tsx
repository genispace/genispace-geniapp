import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Info, AlertTriangle } from 'lucide-react';

import { cn } from '@genispace/shared-utils';

import { Card, CardContent } from './card';

const hintNoticeCardVariants = cva('rounded-xl border shadow-sm', {
  variants: {
    variant: {
      info: 'border-sky-200/80 dark:border-sky-900/45 bg-sky-50/70 dark:bg-sky-950/30',
      neutral:
        'border-neutral-200 dark:border-neutral-700 bg-neutral-50/70 dark:bg-neutral-900/35',
      warning:
        'border-amber-200/80 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/25',
    },
  },
  defaultVariants: {
    variant: 'info',
  },
});

const hintNoticeIconWrapVariants = cva('shrink-0 mt-0.5', {
  variants: {
    variant: {
      info: 'text-sky-600 dark:text-sky-400',
      neutral: 'text-neutral-500 dark:text-neutral-400',
      warning: 'text-amber-600 dark:text-amber-500',
    },
  },
  defaultVariants: {
    variant: 'info',
  },
});

export type HintNoticeVariant = NonNullable<VariantProps<typeof hintNoticeCardVariants>['variant']>;

export interface HintNoticeProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof hintNoticeCardVariants> {
  /** Optional heading above the body */
  title?: React.ReactNode;
  /** Body content */
  children: React.ReactNode;
  /** Extra classes for inner `CardContent` */
  contentClassName?: string;
  /** When false, hides the leading icon slot */
  showIcon?: boolean;
  /** Custom icon node; defaults to Info (or Warning triangle for `warning` variant) */
  icon?: React.ReactNode;
  /** Apply `whitespace-pre-line` to the body wrapper */
  preserveWhitespace?: boolean;
}

function DefaultIcon({ variant }: { variant: HintNoticeVariant }) {
  if (variant === 'warning') {
    return <AlertTriangle className="h-4 w-4" aria-hidden />;
  }
  return <Info className="h-4 w-4" aria-hidden />;
}

export const HintNotice = React.forwardRef<HTMLDivElement, HintNoticeProps>(
  function HintNotice(
    {
      className,
      variant,
      title,
      children,
      contentClassName,
      showIcon = true,
      icon,
      preserveWhitespace = false,
      ...props
    },
    ref
  ) {
    const v = variant ?? 'info';

    return (
      <Card ref={ref} className={cn(hintNoticeCardVariants({ variant: v }), className)} {...props}>
        <CardContent className={cn('pt-5 pb-4', contentClassName)}>
          <div className="flex gap-3">
            {showIcon ? (
              <div className={cn(hintNoticeIconWrapVariants({ variant: v }))}>
                {icon ?? <DefaultIcon variant={v} />}
              </div>
            ) : null}
            <div className="min-w-0 space-y-2">
              {title ? (
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{title}</p>
              ) : null}
              <div
                className={cn(
                  'text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed',
                  preserveWhitespace && 'whitespace-pre-line'
                )}
              >
                {children}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

HintNotice.displayName = 'HintNotice';
