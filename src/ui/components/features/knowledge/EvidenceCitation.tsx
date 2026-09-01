import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@genispace/geniapp/utils';

export interface EvidenceLocator {
  type: string;
  clauseId?: string | null;
  headingAnchor?: string;
  page?: number | null;
  startOffset?: number | null;
  endOffset?: number | null;
}

export interface EvidenceReference {
  evidenceId: string;
  snippet: string;
  locator: EvidenceLocator;
  documentId?: string | null;
  revisionId?: string | null;
  documentTitle?: string;
  documentNumber?: string | null;
  lifecycleStatus?: string;
}

export interface EvidenceCitationProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onClick'> {
  evidence?: EvidenceReference | null;
  fallbackLabel?: ReactNode;
  onActivate?: (evidence: EvidenceReference) => void;
}

/**
 * Interactive only after the caller resolves the id against server evidence.
 * A model-authored or stale id therefore renders as a disabled citation.
 */
export function EvidenceCitation({
  evidence,
  fallbackLabel = 'Evidence',
  onActivate,
  className,
  ...props
}: EvidenceCitationProps) {
  const enabled = Boolean(evidence && onActivate);
  const label = evidence?.documentNumber
    || evidence?.documentTitle
    || fallbackLabel;
  return (
    <button
      type="button"
      {...props}
      disabled={!enabled || props.disabled}
      onClick={() => evidence && onActivate?.(evidence)}
      className={cn(
        'mx-0.5 inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium',
        enabled
          ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15'
          : 'cursor-not-allowed border-border text-muted-foreground',
        className
      )}
    >
      {label}
    </button>
  );
}
