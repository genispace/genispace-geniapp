import type { ReactNode } from 'react';

export interface ReleaseChannelBannerProps {
  channel: 'stable' | 'preview';
  effectiveVersion?: string | null;
  stableVersion?: string | null;
  previewLabel?: ReactNode;
  stableLabel?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * Pure release-channel presentation shared by GeniApps. It deliberately owns
 * no API, storage, routing, or Workbench state so hosts can keep authorization
 * and version selection server-side.
 */
export function ReleaseChannelBanner({
  channel,
  effectiveVersion,
  stableVersion,
  previewLabel = 'Preview version',
  stableLabel = 'Stable version',
  action,
  className = '',
}: ReleaseChannelBannerProps) {
  if (channel !== 'preview') return null;

  return (
    <div
      role="status"
      data-release-channel={channel}
      className={`flex min-h-10 flex-wrap items-center justify-between gap-2 border-b border-amber-300/70 bg-amber-50 px-4 py-2 text-sm text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/60 dark:text-amber-100 ${className}`.trim()}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="rounded-full border border-amber-400/70 bg-white/70 px-2 py-0.5 text-xs font-semibold dark:border-amber-600/70 dark:bg-black/20">
          {previewLabel}
        </span>
        {effectiveVersion ? <span className="font-medium">v{effectiveVersion}</span> : null}
        {stableVersion ? (
          <span className="text-xs text-amber-800 dark:text-amber-200">
            {stableLabel}: v{stableVersion}
          </span>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

