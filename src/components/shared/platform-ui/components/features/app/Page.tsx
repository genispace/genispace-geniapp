import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface AppPageProps {
  title: string;
  icon?: LucideIcon;
  description?: string;
  /** Renders to the left of the title block (e.g. a back button). */
  leading?: ReactNode;
  /** Action buttons rendered top-right. */
  actions?: ReactNode;
  children: ReactNode;
}

export function AppPage({ title, icon: Icon, description, leading, actions, children }: AppPageProps) {
  // The title/description block. On mobile the description is hidden — under a
  // narrow header it wraps to several lines and reads awkwardly; the title alone
  // is enough there. Title always truncates so actions keep their right slot.
  const titleBlock = (
    <div className="min-w-0">
      <h1 className="flex min-w-0 items-center gap-2 text-xl font-bold sm:text-2xl">
        {Icon && <Icon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />}
        <span className="truncate">{title}</span>
      </h1>
      {description && (
        <p className="mt-1 hidden text-sm text-muted-foreground sm:block">{description}</p>
      )}
    </div>
  );

  return (
    <div className="relative w-full min-w-0 max-w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* Stack the actions below the title on narrow screens. Keeping every action
          in one row can shrink a long, translated title to zero width. */}
      <div className="mb-6 flex min-h-[52px] w-full min-w-0 flex-col items-stretch justify-between gap-3 sm:min-h-[60px] sm:flex-row sm:items-center sm:gap-4">
        {leading ? (
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            {leading}
            {titleBlock}
          </div>
        ) : (
          <div className="min-w-0 flex-1">{titleBlock}</div>
        )}
        {actions ? (
          <div className="flex w-full min-w-0 flex-wrap items-center justify-start gap-2 sm:w-auto sm:shrink-0 sm:justify-end sm:gap-3">
            {actions}
          </div>
        ) : null}
      </div>
      <div className="relative min-w-0 max-w-full">
        {children}
      </div>
    </div>
  );
}
