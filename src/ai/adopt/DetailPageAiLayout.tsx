import type { ReactNode } from 'react';
import { AI_ADOPT_PAGE_GRID_CLASS } from '../layout/layoutConstants';

/** Two-column layout: main form + optional sticky AI sidebar (full page). */
export function DetailPageAiLayout({ children, sidebar }: { children: ReactNode; sidebar?: ReactNode }) {
  if (!sidebar) {
    return <div className="space-y-6">{children}</div>;
  }
  return (
    <div className={AI_ADOPT_PAGE_GRID_CLASS}>
      <div className="min-w-0 space-y-6">{children}</div>
      <div className="lg:sticky lg:top-6 lg:self-start">{sidebar}</div>
    </div>
  );
}
