import * as React from 'react';
import { ArrowUpRight, HelpCircle } from 'lucide-react';

import { cn } from '@genispace/geniapp/utils';

import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface HelpTipProps {
  /** Optional bold heading rendered above the content */
  title?: React.ReactNode;
  /** Explanation body — can be long-form (rendered in a Popover, not a Tooltip) */
  content: React.ReactNode;
  /** External/help-center URL for the "Learn more" row */
  moreHref?: string;
  /** Click handler alternative to `moreHref` for the "Learn more" row */
  onMore?: () => void;
  /** Label for the "Learn more" row (i18n override) */
  moreLabel?: string;
  /** Accessible label for the trigger button (i18n override) */
  label?: string;
  /** Popover placement side */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Popover alignment relative to the trigger */
  align?: 'start' | 'center' | 'end';
  /** Extra classes for the trigger button */
  className?: string;
  /** Extra classes for the popover content */
  contentClassName?: string;
}

/**
 * HelpTip — small circled "?" affordance that opens a Popover with contextual help.
 * Use next to field labels, section titles, and toolbar actions where the
 * explanation may be longer than a one-line tooltip.
 */
export function HelpTip({
  title,
  content,
  moreHref,
  onMore,
  moreLabel = 'Learn more',
  label = 'Help',
  side = 'top',
  align = 'center',
  className,
  contentClassName,
}: HelpTipProps) {
  const hasMore = Boolean(moreHref || onMore);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full align-middle',
            'text-muted-foreground transition-colors hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
            className
          )}
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className={cn('w-auto max-w-[20rem] p-3 text-sm', contentClassName)}
      >
        {title ? (
          <p className="mb-1 font-semibold text-foreground">{title}</p>
        ) : null}
        <div className="leading-relaxed text-muted-foreground">{content}</div>
        {hasMore ? (
          <div className="mt-2">
            {moreHref ? (
              <a
                href={moreHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onMore}
                className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
              >
                {moreLabel}
                <ArrowUpRight className="h-3 w-3" aria-hidden />
              </a>
            ) : (
              <button
                type="button"
                onClick={onMore}
                className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
              >
                {moreLabel}
                <ArrowUpRight className="h-3 w-3" aria-hidden />
              </button>
            )}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
