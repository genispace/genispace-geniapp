import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Circle, Loader2 } from 'lucide-react';
import { Button } from '@genispace/geniapp/kit';

/**
 * Async agent-invoke progress UX v1.
 *
 * `useAgentJobRunner` drives a background AGENT_INVOKE job (SDK
 * `agents.invokeAsync`) through an explicit state machine and exposes a live
 * elapsed ticker + server phase; `AgentJobProgressInline` renders it as a
 * rounded card in the same visual family as AiDraftBanner. Both are
 * i18n-agnostic — every user-facing string comes in via label props with
 * sensible English defaults; apps pass t() values.
 */

export type AgentRunState = 'idle' | 'starting' | 'running' | 'succeeded' | 'failed' | 'cancelled';

/** Structural subset of the SDK AgentJob DTO the runner needs. */
export interface AgentJobLike {
  id: string;
  status?: string;
  phase?: string | null;
  cancelRequested?: boolean;
  createdAt?: string;
  error?: string | null;
}

/** Context handed to the task function passed to {@link UseAgentJobRunnerResult.start}. */
export interface AgentTaskContext {
  /** Thread as BOTH `onCreated` and `onProgress` of `agents.invokeAsync`. */
  onJob: (job: AgentJobLike) => void;
  /** Report an app-level retry (e.g. schema-invalid re-invoke): call with 2, 3, ... */
  onAttempt: (n: number) => void;
  /** Thread as `invokeAsync({ signal })`; aborted automatically on unmount. */
  signal: AbortSignal;
}

export interface AgentJobStartOptions {
  /**
   * Cooperative server-side cancel, e.g. `(id) => client.agentJobs.cancel(id)`.
   * Called by {@link UseAgentJobRunnerResult.cancel} once a job id is known;
   * without it (or before a job exists) cancel falls back to aborting the
   * polling signal locally.
   */
  cancel?: (jobId: string) => Promise<unknown> | unknown;
}

export interface UseAgentJobRunnerResult {
  state: AgentRunState;
  /** Latest server phase ('resolve' | 'invoke' | 'finalize' | ...), null before the first snapshot. */
  phase: string | null;
  /** Wall-clock since job.createdAt (when parseable) or the local start; ticks every second. */
  elapsedMs: number;
  /** Latest observed job snapshot (null until the 202 create lands). */
  job: AgentJobLike | null;
  /** Raw error message of a failed run (apps usually map their typed errors instead). */
  error: string | null;
  /** Current attempt number (1-based); >1 after noteAttempt/onAttempt. */
  attempt: number;
  /** True once cancel() was called or the server echoed job.cancelRequested. */
  cancelRequested: boolean;
  /**
   * Run `task`. Resolves with the task result on success, resolves `null` when
   * the run was cancelled/superseded, and REJECTS with the task's error on
   * failure (after moving the state machine to 'failed') so callers keep their
   * typed-error handling. No-op (resolves null) while a run is in flight.
   */
  start: <T>(task: (ctx: AgentTaskContext) => Promise<T>, opts?: AgentJobStartOptions) => Promise<T | null>;
  /** Request cooperative cancellation of the in-flight run. */
  cancel: () => void;
  /** Back to 'idle', invalidating any in-flight run (its late updates are dropped). */
  reset: () => void;
  /** Feed a job snapshot into the runner (what the task ctx.onJob does). */
  observe: (job: AgentJobLike) => void;
  /** Mark an app-level retry attempt (what the task ctx.onAttempt does). */
  noteAttempt: (n: number) => void;
}

/**
 * State machine + 1s elapsed ticker for one background agent invoke at a time.
 * Stale updates from a superseded run are dropped via a monotonic run-id guard
 * (mirrors JobProgress.tsx); the AbortController wired into the task signal is
 * aborted on unmount so polling never outlives the component — the job itself
 * keeps running server-side unless cancel() reached the platform.
 */
export function useAgentJobRunner(): UseAgentJobRunnerResult {
  const [state, setState] = useState<AgentRunState>('idle');
  const [phase, setPhase] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [job, setJob] = useState<AgentJobLike | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(1);
  const [cancelRequested, setCancelRequested] = useState(false);

  const runId = useRef(0);
  const runningRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const jobRef = useRef<AgentJobLike | null>(null);
  const cancelFnRef = useRef<AgentJobStartOptions['cancel']>(undefined);
  const cancelRequestedRef = useRef(false);
  /** Elapsed baseline: job.createdAt when parseable, else the local start. */
  const baselineRef = useRef<number | null>(null);

  // Abort in-flight polling when the component unmounts.
  useEffect(() => {
    return () => {
      runId.current += 1;
      abortRef.current?.abort();
    };
  }, []);

  // 1s ticker while a run is active.
  const ticking = state === 'starting' || state === 'running';
  useEffect(() => {
    if (!ticking) return;
    const tick = () => {
      const base = baselineRef.current;
      if (base != null) setElapsedMs(Math.max(0, Date.now() - base));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [ticking]);

  const observe = useCallback((snapshot: AgentJobLike) => {
    if (!runningRef.current) return;
    jobRef.current = snapshot;
    setJob(snapshot);
    setState((s) => (s === 'starting' ? 'running' : s));
    setPhase(snapshot.phase ?? null);
    if (snapshot.cancelRequested) setCancelRequested(true);
    if (snapshot.createdAt) {
      const created = Date.parse(snapshot.createdAt);
      // Guard against clock skew: never move the baseline into the future.
      if (Number.isFinite(created) && baselineRef.current != null && created < baselineRef.current) {
        baselineRef.current = created;
      }
    }
  }, []);

  const noteAttempt = useCallback((n: number) => {
    if (!runningRef.current) return;
    setAttempt(n);
  }, []);

  const start = useCallback(
    async <T,>(task: (ctx: AgentTaskContext) => Promise<T>, opts?: AgentJobStartOptions): Promise<T | null> => {
      if (runningRef.current) return null;
      const myId = ++runId.current;
      runningRef.current = true;
      cancelRequestedRef.current = false;
      cancelFnRef.current = opts?.cancel;
      jobRef.current = null;
      baselineRef.current = Date.now();
      const controller = new AbortController();
      abortRef.current = controller;

      setState('starting');
      setPhase(null);
      setElapsedMs(0);
      setJob(null);
      setError(null);
      setAttempt(1);
      setCancelRequested(false);

      const guard = <A extends unknown[]>(fn: (...args: A) => void) => (...args: A) => {
        if (myId === runId.current) fn(...args);
      };

      try {
        const result = await task({
          onJob: guard(observe),
          onAttempt: guard(noteAttempt),
          signal: controller.signal,
        });
        if (myId !== runId.current) return null;
        setState('succeeded');
        return result;
      } catch (e) {
        if (myId !== runId.current) return null;
        const aborted =
          cancelRequestedRef.current ||
          controller.signal.aborted ||
          (e instanceof Error && e.name === 'AbortError');
        if (aborted) {
          setState('cancelled');
          return null;
        }
        setState('failed');
        setError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        if (myId === runId.current) runningRef.current = false;
      }
    },
    [observe, noteAttempt]
  );

  const cancel = useCallback(() => {
    if (!runningRef.current || cancelRequestedRef.current) return;
    cancelRequestedRef.current = true;
    setCancelRequested(true);
    const jobId = jobRef.current?.id;
    const fn = cancelFnRef.current;
    if (jobId && fn) {
      // Cooperative: keep polling so the UI can show "cancelling…" until the
      // server flips the job to CANCELLED. Fall back to a local abort when the
      // cancel endpoint is unreachable (older platforms).
      Promise.resolve()
        .then(() => fn(jobId))
        .catch(() => abortRef.current?.abort());
    } else {
      abortRef.current?.abort();
    }
  }, []);

  const reset = useCallback(() => {
    runId.current += 1;
    runningRef.current = false;
    abortRef.current?.abort();
    abortRef.current = null;
    jobRef.current = null;
    baselineRef.current = null;
    cancelRequestedRef.current = false;
    setState('idle');
    setPhase(null);
    setElapsedMs(0);
    setJob(null);
    setError(null);
    setAttempt(1);
    setCancelRequested(false);
  }, []);

  return { state, phase, elapsedMs, job, error, attempt, cancelRequested, start, cancel, reset, observe, noteAttempt };
}

export interface AgentJobProgressLabels {
  /** Primary action line, e.g. "AI is generating the draft". */
  title?: string;
  /** "Elapsed Xs" fragment appended to the title. */
  elapsed?: (seconds: number) => string;
  /** Expected-duration fragment after the elapsed one, e.g. " (usually ~30s)". */
  expectedNote?: string;
  /** Swapped in for expectedNote once elapsed exceeds 1.5x expectedSeconds. */
  slow?: string;
  /** Step-list labels (server phases queued -> resolve -> invoke -> finalize). */
  queued?: string;
  resolve?: string;
  invoke?: string;
  finalize?: string;
  /** Notice line shown when attempt > 1 (app-level schema retry). */
  retryNotice?: string;
  cancel?: string;
  cancelling?: string;
  /** Fallback failed line when no `error` prop is passed. */
  failed?: string;
  retry?: string;
  cancelled?: string;
}

const DEFAULT_LABELS: Required<Pick<
  AgentJobProgressLabels,
  'title' | 'expectedNote' | 'slow' | 'queued' | 'resolve' | 'invoke' | 'finalize' | 'retryNotice' | 'cancel' | 'cancelling' | 'failed' | 'retry' | 'cancelled'
>> & { elapsed: (seconds: number) => string } = {
  title: 'Working…',
  elapsed: (seconds: number) => `${seconds}s elapsed`,
  expectedNote: '',
  slow: 'Taking longer than usual — still working…',
  queued: 'Queued',
  resolve: 'Locating agent',
  invoke: 'Running',
  finalize: 'Finalizing',
  retryNotice: 'First result was invalid — retrying once…',
  cancel: 'Cancel',
  cancelling: 'Cancelling…',
  failed: 'The AI task failed.',
  retry: 'Retry',
  cancelled: 'Cancelled.',
};

const STEP_KEYS = ['queued', 'resolve', 'invoke', 'finalize'] as const;

/** Map runner state + server phase to the active step index. Unknown/missing phases count as 'invoke'. */
function activeStepIndex(state: AgentRunState, phase: string | null | undefined): number {
  if (state === 'starting') return 0;
  if (phase === 'resolve') return 1;
  if (phase === 'finalize') return 3;
  return 2; // 'invoke', missing, or unknown
}

export interface AgentJobProgressInlineProps {
  state: AgentRunState;
  phase?: string | null;
  elapsedMs: number;
  /** Typical duration; drives the slow-hint swap (elapsed > 1.5x expected). */
  expectedSeconds?: number;
  /** 1-based attempt count; >1 renders the retry notice line. */
  attempt?: number;
  /** True once cancellation was requested (button flips to a disabled "cancelling"). */
  cancelRequested?: boolean;
  /** Localized error text supplied by the app for the failed state. */
  error?: string | null;
  onCancel?: () => void;
  onRetry?: () => void;
  labels?: AgentJobProgressLabels;
  className?: string;
}

/**
 * Inline progress card for a background agent invoke — spinner + elapsed
 * primary line, queued→resolve→invoke→finalize step list, indeterminate pulse
 * bar and a cooperative cancel button while running; destructive line + retry
 * when failed; muted line + retry when cancelled; nothing when idle/succeeded.
 * Same visual family as AiDraftBanner (status-info tokens while running).
 */
export function AgentJobProgressInline({
  state,
  phase,
  elapsedMs,
  expectedSeconds,
  attempt = 1,
  cancelRequested = false,
  error,
  onCancel,
  onRetry,
  labels,
  className,
}: AgentJobProgressInlineProps) {
  const l = { ...DEFAULT_LABELS, ...labels };

  if (state === 'idle' || state === 'succeeded') return null;

  if (state === 'failed') {
    return (
      <div role="alert" className={`space-y-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 ${className ?? ''}`}>
        <p className="text-sm text-destructive">{error || l.failed}</p>
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            {l.retry}
          </Button>
        ) : null}
      </div>
    );
  }

  if (state === 'cancelled') {
    return (
      <div role="status" className={`space-y-2 rounded-lg border border-border bg-muted/40 p-3 ${className ?? ''}`}>
        <p className="text-sm text-muted-foreground">{l.cancelled}</p>
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            {l.retry}
          </Button>
        ) : null}
      </div>
    );
  }

  // starting | running
  const seconds = Math.floor(elapsedMs / 1000);
  const slow = expectedSeconds != null && elapsedMs > expectedSeconds * 1500;
  const note = slow ? l.slow : l.expectedNote;
  const stepIdx = activeStepIndex(state, phase);

  return (
    <div
      role="status"
      aria-busy
      className={`space-y-2.5 rounded-lg border border-status-info/40 bg-status-info/10 p-3 ${className ?? ''}`}
    >
      <div className="flex items-start gap-2.5">
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-status-info" aria-hidden />
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-medium text-foreground">
            {l.title} · {l.elapsed(seconds)}
            {note ? <span className={slow ? 'text-status-warning' : 'text-muted-foreground'}>{note}</span> : null}
          </p>
          {attempt > 1 ? <p className="text-xs text-muted-foreground">{l.retryNotice}</p> : null}
        </div>
        {onCancel ? (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={cancelRequested}>
            {cancelRequested ? l.cancelling : l.cancel}
          </Button>
        ) : null}
      </div>

      <ul className="space-y-1 pl-[26px]">
        {STEP_KEYS.map((key, i) => {
          const isDone = i < stepIdx;
          const isCurrent = i === stepIdx;
          return (
            <li
              key={key}
              className={`flex items-center gap-1.5 text-xs ${
                isCurrent ? 'font-medium text-foreground' : isDone ? 'text-muted-foreground' : 'text-muted-foreground/60'
              }`}
            >
              {isDone ? (
                <Check className="h-3 w-3 shrink-0 text-status-info" aria-hidden />
              ) : isCurrent ? (
                <Loader2 className="h-3 w-3 shrink-0 animate-spin text-status-info" aria-hidden />
              ) : (
                <Circle className="h-3 w-3 shrink-0 text-muted-foreground/45" aria-hidden />
              )}
              {l[key]}
            </li>
          );
        })}
      </ul>

      <div className="ml-[26px] h-1 overflow-hidden rounded-full bg-status-info/20">
        <div className="h-full w-full animate-pulse rounded-full bg-status-info/60" />
      </div>
    </div>
  );
}
