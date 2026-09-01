import type { ReactNode } from 'react';
import type { AppAccess } from './useAppAccess';
import { AppAccessNotice } from './AppAccessNotice';

type Props = {
  access: Pick<AppAccess, 'loading' | 'accessError' | 'permissionCodes' | 'reloadAccess'>;
  children: ReactNode;
  /** Keep the final page geometry visible while permissions are loading. */
  showLoadingSkeleton?: boolean;
};

export type AppContentSkeletonVariant = 'table' | 'dashboard' | 'detail';

/**
 * Shared route fallback. It uses the same responsive page padding as AppPage so
 * switching from a skeleton to real content does not cause a horizontal jump.
 */
export function AppContentSkeleton({ variant = 'table' }: { variant?: AppContentSkeletonVariant }) {
  return (
    <div
      className="w-full min-w-0 max-w-full animate-pulse px-4 py-4 sm:px-6 sm:py-6 lg:px-8"
      role="status"
      aria-busy="true"
    >
      <div className="mb-6 flex min-h-[52px] items-center justify-between gap-4 sm:min-h-[60px]">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-7 w-48 max-w-full rounded-md bg-muted" />
          <div className="h-4 w-80 max-w-[70%] rounded bg-muted" />
        </div>
        <div className="h-10 w-28 shrink-0 rounded-md bg-muted" />
      </div>
      {variant === 'dashboard' ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 rounded-xl border border-border bg-card" />)}
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="h-72 rounded-xl border border-border bg-card" />
            <div className="h-72 rounded-xl border border-border bg-card" />
          </div>
        </>
      ) : variant === 'detail' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="h-[30rem] rounded-xl border border-border bg-card" />
          <div className="h-72 rounded-xl border border-border bg-card" />
        </div>
      ) : (
        <>
          <div className="mb-4 flex gap-3"><div className="h-10 flex-1 rounded-md bg-muted" /><div className="h-10 w-36 rounded-md bg-muted" /></div>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {Array.from({ length: 7 }).map((_, row) => (
              <div key={row} className="grid grid-cols-[minmax(12rem,2fr)_repeat(3,minmax(7rem,1fr))] gap-4 border-b border-border px-4 py-4 last:border-b-0">
                {Array.from({ length: 4 }).map((__, column) => <div key={column} className={`h-4 rounded bg-muted ${column === 0 ? 'w-3/4' : 'w-2/3'}`} />)}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Blocks page content when RBAC access fetch fails; keeps loading geometry stable. */
export function AppAccessGate({ access, children, showLoadingSkeleton = true }: Props) {
  if (access.accessError) {
    return <AppAccessNotice access={access} />;
  }
  if (showLoadingSkeleton && access.loading && access.permissionCodes.length === 0) {
    return <AppContentSkeleton />;
  }
  return <>{children}</>;
}
