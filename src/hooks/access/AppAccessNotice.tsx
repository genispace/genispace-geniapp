import type { AppAccess } from './useAppAccess';

type Props = {
  access: Pick<AppAccess, 'loading' | 'accessError' | 'reloadAccess'>;
};

/** Shown when RBAC access fetch fails so users see an error instead of a blank sidebar. */
export function AppAccessNotice({ access }: Props) {
  if (access.loading || !access.accessError) return null;
  return (
    <div
      role="alert"
      className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <p className="font-medium">Unable to load permissions</p>
      <p className="mt-1 text-amber-800 dark:text-amber-200">{access.accessError}</p>
      <button
        type="button"
        onClick={access.reloadAccess}
        className="mt-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-neutral-900 dark:text-amber-100 dark:hover:bg-amber-900/30"
      >
        Retry
      </button>
    </div>
  );
}
