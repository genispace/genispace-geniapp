/**
 * Kit/AI Tool — adapted from shadcn.io/ai `tool` (Vercel AI Elements style).
 * Collapsible tool-call card: header with status badge, parameters and result.
 * Adaptations: decoupled from the Vercel AI SDK (`ToolUIPart` replaced with a
 * local state union matching GeniSpace's local-tool lifecycle); CodeBlock
 * registry dependency replaced with a plain <pre> JSON block.
 */
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Wrench,
  XCircle,
} from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@genispace/geniapp/utils';
import { Badge } from '../../components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../components/ui/collapsible';

export type AiToolState = 'running' | 'completed' | 'error';

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn('not-prose w-full min-w-0 max-w-full rounded-md border border-border', className)}
    {...props}
  />
);

const STATE_META: Record<AiToolState, { icon: ReactNode; labelKey: AiToolState }> = {
  running: { icon: <Clock className="size-3.5 animate-pulse" />, labelKey: 'running' },
  completed: { icon: <CheckCircle2 className="size-3.5 text-status-success" />, labelKey: 'completed' },
  error: { icon: <XCircle className="size-3.5 text-status-error" />, labelKey: 'error' },
};

export interface ToolHeaderProps {
  title: string;
  state: AiToolState;
  /** Localized state label (defaults to the raw state). */
  stateLabel?: string;
  className?: string;
}

export const ToolHeader = ({ className, title, state, stateLabel }: ToolHeaderProps) => (
  <CollapsibleTrigger
    className={cn('group flex w-full items-center justify-between gap-3 px-2.5 py-2', className)}
  >
    <div className="flex min-w-0 items-center gap-2">
      <Wrench className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate font-mono text-xs text-foreground">{title}</span>
      <Badge className="shrink-0 gap-1 rounded-full text-[10px]" variant="secondary">
        {STATE_META[state].icon}
        {stateLabel ?? state}
      </Badge>
    </div>
    <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
  </CollapsibleTrigger>
);

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      'data-[state=closed]:fade-out-0 data-[state=open]:slide-in-from-top-1 overflow-hidden data-[state=closed]:animate-out data-[state=open]:animate-in',
      className
    )}
    {...props}
  />
);

const JsonBlock = ({ value }: { value: unknown }) => (
  <pre className="max-h-48 max-w-full overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted/50 p-2 font-mono text-[11px] leading-relaxed text-foreground">
    {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
  </pre>
);

export type ToolInputProps = ComponentProps<'div'> & {
  input: unknown;
  label?: string;
};

export const ToolInput = ({ className, input, label = 'Parameters', ...props }: ToolInputProps) => (
  <div className={cn('space-y-1.5 px-2.5 pb-2', className)} {...props}>
    <h4 className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</h4>
    <JsonBlock value={input} />
  </div>
);

export type ToolOutputProps = ComponentProps<'div'> & {
  output?: unknown;
  errorText?: string;
  label?: string;
  errorLabel?: string;
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  label = 'Result',
  errorLabel = 'Error',
  ...props
}: ToolOutputProps) => {
  if (output === undefined && !errorText) return null;
  return (
    <div className={cn('space-y-1.5 px-2.5 pb-2', className)} {...props}>
      <h4 className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {errorText ? errorLabel : label}
      </h4>
      {errorText ? (
        <div className="rounded-md bg-destructive/10 p-2 text-[11px] text-destructive">{errorText}</div>
      ) : (
        <JsonBlock value={output} />
      )}
    </div>
  );
};
