import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../ui/button';
import { cn } from '@genispace/shared-utils';

export interface ApiErrorStateProps {

  title: string;

  detailMessage?: string;

  showDetail?: boolean;

  onRetry?: () => void;

  retryLabel?: string;

  className?: string;

  compact?: boolean;
}

export function ApiErrorState({
  title,
  detailMessage,
  showDetail = false,
  onRetry,
  retryLabel = 'Retry',
  className,
  compact = false,
}: ApiErrorStateProps) {
  const shouldShowDetail = showDetail && detailMessage;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-12 px-4',
        className
      )}
    >
      <div
        className={cn(
          'rounded-full flex items-center justify-center mb-4',
          compact ? 'w-12 h-12' : 'w-16 h-16',
          'bg-status-error/10 dark:bg-status-error/15'
        )}
      >
        <AlertCircle
          className={cn('text-status-error', compact ? 'w-6 h-6' : 'w-8 h-8')}
          aria-hidden
        />
      </div>
      <h3
        className={cn(
          'font-bold text-content-primary dark:text-content-dark-primary',
          compact ? 'text-base mb-1' : 'text-xl mb-2',
          onRetry && !shouldShowDetail && 'mb-6'
        )}
      >
        {title}
      </h3>
      {shouldShowDetail && (
        <p className="text-content-muted dark:text-content-dark-muted max-w-md mb-6 text-sm">
          {detailMessage}
        </p>
      )}
      {onRetry && (
        <Button
          variant="secondary"
          size={compact ? 'sm' : 'default'}
          onClick={onRetry}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
