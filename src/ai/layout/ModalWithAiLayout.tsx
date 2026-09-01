import type { ReactNode } from 'react';
import { AI_ADOPT_MODAL_MAX_HEIGHT, AI_ADOPT_MODAL_GRID_STYLE } from './layoutConstants';

/**
 * Two-column body for modals/dialogs with AiSuggestionPanel (DESIGN_GUIDELINE §16.1).
 * Uses inline grid columns so layout works even when Tailwind does not scan shared/ai/**.
 */
export function ModalWithAiLayout({
  children,
  sidebar,
  className = '',
}: {
  children: ReactNode;
  sidebar?: ReactNode | null;
  className?: string;
}) {
  if (!sidebar) {
    return <div className={className}>{children}</div>;
  }
  return (
    <div
      className={`grid gap-4 ${AI_ADOPT_MODAL_MAX_HEIGHT} min-h-0 ${className}`.trim()}
      style={AI_ADOPT_MODAL_GRID_STYLE}
    >
      <div className="min-h-0 min-w-0 overflow-y-auto pr-1">{children}</div>
      <div className="min-h-0 min-w-0 overflow-y-auto">{sidebar}</div>
    </div>
  );
}
