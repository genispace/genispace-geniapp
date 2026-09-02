import type { ReactNode } from 'react';
import { PageLoadingSkeleton, type PageSkeletonPreset } from '../../primitives/page-skeleton';
import { QueryErrorAlert } from './QueryErrorAlert';

export interface AppPageStatesProps {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  retryLabel?: string;
  /** Used when `loadingFallback` is not provided. Default: `table-page`. */
  preset?: PageSkeletonPreset;
  /** Custom skeleton for pages whose layout does not match a preset. */
  loadingFallback?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Standard GeniApp page body: loading skeleton, query error, or main content. */
export function AppPageStates({
  loading,
  error,
  onRetry,
  retryLabel,
  preset = 'table-page',
  loadingFallback,
  className,
  children,
}: AppPageStatesProps) {
  if (loading) {
    return (
      <div className={className} role="status" aria-busy="true">
        {loadingFallback ?? <PageLoadingSkeleton preset={preset} />}
      </div>
    );
  }

  if (error) {
    return (
      <QueryErrorAlert
        message={error}
        onRetry={onRetry}
        retryLabel={retryLabel}
        className={className}
      />
    );
  }

  return <>{children}</>;
}
