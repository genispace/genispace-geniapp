import { cn } from '@genispace/geniapp/utils';

export type StatusStep = { key: string; label: string };

export type StatusStepperProps = {
  steps: StatusStep[];
  currentKey: string;
  className?: string;
};

/**
 * Compact horizontal step indicator for workflows or record states.
 */
export function StatusStepper({ steps, currentKey, className }: StatusStepperProps) {
  const idx = Math.max(
    0,
    steps.findIndex((s) => s.key === currentKey)
  );
  return (
    <ol className={cn('flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1 text-xs', className)}>
      {steps.map((s, i) => {
        const active = i <= idx;
        return (
          <li
            key={s.key}
            className={cn(
              'rounded-md px-2 py-1 font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground'
            )}
          >
            {s.label}
          </li>
        );
      })}
    </ol>
  );
}
