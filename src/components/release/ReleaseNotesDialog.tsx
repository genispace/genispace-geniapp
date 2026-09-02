import type { ReactNode } from 'react';

export type LocalizedReleaseNotes = {
  en?: string | string[];
  zh?: string | string[];
};

export interface ReleaseNotesDialogProps {
  open: boolean;
  version: string;
  notes: LocalizedReleaseNotes | string | string[] | null | undefined;
  locale?: string;
  title?: ReactNode;
  description?: ReactNode;
  acknowledgeLabel?: ReactNode;
  onAcknowledge: () => void;
  className?: string;
}

function noteLines(
  notes: ReleaseNotesDialogProps['notes'],
  locale: string,
): string[] {
  if (!notes) return [];
  if (typeof notes === 'string') return notes.split('\n').map((line) => line.trim()).filter(Boolean);
  if (Array.isArray(notes)) return notes.map(String).map((line) => line.trim()).filter(Boolean);
  const preferred = locale.toLowerCase().startsWith('zh') ? notes.zh : notes.en;
  const fallback = preferred ?? notes.en ?? notes.zh ?? [];
  return Array.isArray(fallback)
    ? fallback.map(String).map((line) => line.trim()).filter(Boolean)
    : String(fallback).split('\n').map((line) => line.trim()).filter(Boolean);
}

/** Accessible, host-controlled release note presentation with no platform side effects. */
export function ReleaseNotesDialog({
  open,
  version,
  notes,
  locale = 'en',
  title = 'Application updated',
  description,
  acknowledgeLabel = 'Got it',
  onAcknowledge,
  className = '',
}: ReleaseNotesDialogProps) {
  if (!open) return null;
  const lines = noteLines(notes, locale);

  return (
    <div
      className={`fixed inset-0 z-[100100] flex items-end justify-center bg-black/45 p-3 sm:items-center sm:p-6 ${className}`.trim()}
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onAcknowledge();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="geniapp-release-notes-title"
        className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-5 text-neutral-950 shadow-xl dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50 sm:p-6"
      >
        <div className="mb-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
            v{version}
          </p>
          <h2 id="geniapp-release-notes-title" className="text-xl font-semibold tracking-tight">
            {title}
          </h2>
          {description ? <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{description}</div> : null}
        </div>
        {lines.length ? (
          <ul className="max-h-[45vh] space-y-2 overflow-y-auto pr-1 text-sm leading-6 text-neutral-700 dark:text-neutral-200">
            {lines.map((line, index) => (
              <li key={`${line}-${index}`} className="flex gap-3">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400 dark:bg-neutral-500" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onAcknowledge}
            className="min-h-10 rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 dark:focus:ring-offset-neutral-950"
          >
            {acknowledgeLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export { noteLines as normalizeReleaseNotes };

