import { cn } from '@genispace/geniapp/utils';

export interface QueryErrorAlertProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function QueryErrorAlert({
  message,
  onRetry,
  retryLabel = 'Retry',
  className,
}: QueryErrorAlertProps) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive dark:border-destructive/50 dark:bg-destructive/20 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
      role="alert"
    >
      <span className="min-w-0 break-words">{message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-lg border border-destructive/50 bg-background px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/30"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
