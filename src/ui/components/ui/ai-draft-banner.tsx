import * as React from 'react';
import { Sparkles, X } from 'lucide-react';

import { cn } from '@genispace/geniapp/utils';

export type AiDraftBannerTone = 'info' | 'warning';

export interface AiDraftBannerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Banner heading, e.g. "AI draft applied" */
  title: React.ReactNode;
  /** Secondary line under the title */
  description?: React.ReactNode;
  /** When provided, renders a dismiss button */
  onDismiss?: () => void;
  /** Accessible label for the dismiss button (i18n) */
  dismissLabel: string;
  /** Visual tone — maps to the platform status tokens */
  tone?: AiDraftBannerTone;
  /** Extra rows below the header (e.g. collapsible reasons, actions) */
  children?: React.ReactNode;
}

const toneStyles: Record<
  AiDraftBannerTone,
  { container: string; icon: string }
> = {
  info: {
    container: 'border-status-info/40 bg-status-info/10',
    icon: 'text-status-info',
  },
  warning: {
    container: 'border-status-warning/40 bg-status-warning/10',
    icon: 'text-status-warning',
  },
};

/**
 * AiDraftBanner — canonical presentation for "AI draft applied" surfaces.
 * Built on the platform status tokens, so it is dark-mode correct by construction.
 */
export const AiDraftBanner = React.forwardRef<HTMLDivElement, AiDraftBannerProps>(
  function AiDraftBanner(
    {
      title,
      description,
      onDismiss,
      dismissLabel,
      tone = 'info',
      children,
      className,
      ...props
    },
    ref
  ) {
    const styles = toneStyles[tone];

    return (
      <div
        ref={ref}
        role="status"
        className={cn('rounded-lg border p-3', styles.container, className)}
        {...props}
      >
        <div className="flex items-start gap-2.5">
          <Sparkles className={cn('mt-0.5 h-4 w-4 shrink-0', styles.icon)} aria-hidden />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm font-medium text-foreground">{title}</p>
            {description ? (
              <p className="text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {onDismiss ? (
            <button
              type="button"
              aria-label={dismissLabel}
              onClick={onDismiss}
              className={cn(
                'shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
        {children ? <div className="mt-2 pl-[26px]">{children}</div> : null}
      </div>
    );
  }
);
