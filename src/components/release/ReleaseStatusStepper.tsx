import type { ReactNode } from 'react';

export type ReleaseStepStatus = 'pending' | 'running' | 'done' | 'failed';

export interface ReleaseStatusStep {
  key: string;
  label: ReactNode;
  description?: ReactNode;
  status: ReleaseStepStatus;
}

export interface ReleaseStatusStepperProps {
  steps: ReleaseStatusStep[];
  className?: string;
}

export function ReleaseStatusStepper({ steps, className = '' }: ReleaseStatusStepperProps) {
  return (
    <ol className={`grid gap-3 ${className}`.trim()}>
      {steps.map((step, index) => (
        <li key={step.key} className="flex gap-3">
          <span
            aria-label={step.status}
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
              step.status === 'done'
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : step.status === 'running'
                  ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200'
                  : step.status === 'failed'
                    ? 'border-red-600 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200'
                    : 'border-neutral-300 bg-white text-neutral-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-400'
            }`}
          >
            {step.status === 'done' ? '✓' : index + 1}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-medium">{step.label}</div>
            {step.description ? <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{step.description}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

