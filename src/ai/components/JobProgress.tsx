import { useCallback, useRef, useState } from 'react';
import { Button, Progress } from '@genispace/geniapp/kit';

export type JobStatus = 'idle' | 'running' | 'done' | 'error';

/** Progress snapshot reported by a running job. */
export interface JobProgressState {
  done: number;
  total: number;
  message?: string;
}

/** Terminal outcome of a job's `run` function. */
export interface JobResult {
  ok: boolean;
  /** Number of items that failed (for partial-success jobs). */
  failed?: number;
  /** Human-readable error (already localized by the caller, if any). */
  error?: string;
}

/** A job runner: invoked with a `report` callback to push progress updates. */
export type JobRunner = (
  report: (progress: JobProgressState) => void
) => Promise<JobResult>;

export interface UseAsyncJobResult {
  status: JobStatus;
  progress: JobProgressState;
  result: JobResult | null;
  /** Begin (or restart) the job. No-op while already running. */
  start: () => void;
  /** Return to the idle state, clearing progress and result. */
  reset: () => void;
}

const EMPTY_PROGRESS: JobProgressState = { done: 0, total: 0 };

/**
 * Drives a long-running, optionally batched async job: calls `run`, threading a
 * `report` callback that updates the live progress, and captures the terminal
 * result or a thrown error. Stale reports/results from a superseded run (e.g.
 * after a retry) are ignored via a monotonic run-id guard.
 */
export function useAsyncJob({ run }: { run: JobRunner }): UseAsyncJobResult {
  const [status, setStatus] = useState<JobStatus>('idle');
  const [progress, setProgress] = useState<JobProgressState>(EMPTY_PROGRESS);
  const [result, setResult] = useState<JobResult | null>(null);

  const runId = useRef(0);
  const runningRef = useRef(false);

  // Keep the latest runner without making `start` change identity each render.
  const runRef = useRef(run);
  runRef.current = run;

  const start = useCallback(() => {
    if (runningRef.current) return;
    const myId = ++runId.current;
    runningRef.current = true;
    setStatus('running');
    setProgress(EMPTY_PROGRESS);
    setResult(null);

    const report = (p: JobProgressState) => {
      if (myId !== runId.current) return;
      setProgress({ done: p.done, total: p.total, message: p.message });
    };

    void (async () => {
      try {
        const res = await runRef.current(report);
        if (myId !== runId.current) return;
        setResult(res);
        setStatus(res.ok ? 'done' : 'error');
      } catch (e) {
        if (myId !== runId.current) return;
        const message = e instanceof Error ? e.message : String(e);
        setResult({ ok: false, error: message });
        setStatus('error');
      } finally {
        if (myId === runId.current) runningRef.current = false;
      }
    })();
  }, []);

  const reset = useCallback(() => {
    // Invalidate any in-flight run so its late reports/results are dropped.
    runId.current += 1;
    runningRef.current = false;
    setStatus('idle');
    setProgress(EMPTY_PROGRESS);
    setResult(null);
  }, []);

  return { status, progress, result, start, reset };
}

export interface JobProgressLabels {
  /** Optional text shown in the idle state (before the job starts). */
  idle?: string;
  /** Localized "X of Y" running label; receives done and total counts. */
  running: (done: number, total: number) => string;
  /** Text shown when the job completes successfully. */
  done: string;
  /** Text shown when the job fails. */
  error: string;
  /** Retry button label. */
  retry: string;
}

export interface JobProgressProps {
  /** The return value of {@link useAsyncJob}. */
  job: UseAsyncJobResult;
  labels: JobProgressLabels;
  /**
   * Invoked when the retry button is pressed. Defaults to `job.start`, so a plain
   * retry re-runs the same job; pass a custom handler to retry only failures.
   */
  onRetry?: () => void;
  className?: string;
}

/**
 * Displays the state of a {@link useAsyncJob}: a progress bar while running, a
 * status line, and a retry button on error. i18n-agnostic — every string is
 * supplied via `labels`; only the bar and layout are hardcoded.
 */
export function JobProgress({ job, labels, onRetry, className }: JobProgressProps) {
  const { status, progress, result } = job;
  const { done, total, message } = progress;
  const handleRetry = onRetry ?? job.start;

  return (
    <div className={className ?? 'space-y-2'}>
      {status === 'idle' && labels.idle ? (
        <p className="text-sm text-muted-foreground">{labels.idle}</p>
      ) : null}

      {status === 'running' ? (
        <div className="space-y-1.5" aria-busy>
          <Progress value={done} max={total > 0 ? total : 1} />
          <p className="text-sm text-muted-foreground">
            {message ?? labels.running(done, total)}
          </p>
        </div>
      ) : null}

      {status === 'done' ? <p className="text-sm text-foreground">{labels.done}</p> : null}

      {status === 'error' ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{result?.error ?? labels.error}</p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            {labels.retry}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
