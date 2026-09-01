import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, Lightbulb, RefreshCw } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@genispace/geniapp/kit';
import type { AppTableClient, WorkflowResultRow } from '../types';
import { sharedAiCopy } from '../locales/sharedAiCopy';
import {
  guidanceContentFromSummary,
  guidanceStatus,
  selectContextualWorkflowResults,
} from './guidanceContent';

interface BusinessGuidancePanelBaseProps {
  client: AppTableClient;
  resultsTable: string;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  unreadableText?: string;
  owners: readonly string[];
  limit?: number;
  className?: string;
  footer?: ReactNode;
  renderAction?: (row: WorkflowResultRow) => ReactNode;
}

export type BusinessGuidancePanelProps = BusinessGuidancePanelBaseProps &
  (
    | { scope: 'aggregate'; sourceRecordKey?: never }
    | { scope?: 'record'; sourceRecordKey: string }
  );

/**
 * A business-page feed for useful recommendations. It deliberately hides run
 * identifiers, model payloads and raw JSON; those remain available to platform
 * diagnostics without becoming part of the user's daily navigation.
 */
export function BusinessGuidancePanel({
  client,
  resultsTable,
  title,
  description,
  emptyTitle,
  emptyDescription,
  unreadableText,
  sourceRecordKey,
  owners,
  limit = 3,
  className = '',
  footer,
  renderAction,
}: BusinessGuidancePanelProps) {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  const copy = sharedAiCopy(language).businessGuidance;
  const [rows, setRows] = useState<WorkflowResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const ownerKey = owners?.join('\u0000') ?? '';

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const allowedOwners = ownerKey ? new Set(ownerKey.split('\u0000')) : null;
      const ownerCandidates = allowedOwners ? [...allowedOwners] : [];
      const responses = await Promise.all(
        ownerCandidates.map((owner) =>
          client.list<WorkflowResultRow>(resultsTable, {
            filters: {
              ...(sourceRecordKey ? { source_record_key: sourceRecordKey } : {}),
              ...(owner ? { owner } : {}),
            },
            limit: Math.max(limit * 4, 20),
          }),
        ),
      );
      setRows(
        selectContextualWorkflowResults(
          responses.flatMap((response) => response.items ?? []),
          {
            sourceRecordKey,
            owners: allowedOwners ? [...allowedOwners] : [],
            limit,
          },
        ),
      );
    } catch (reason) {
      console.error(`[GeniApp] ${resultsTable} guidance load failed`, reason);
      setRows([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [client, limit, ownerKey, resultsTable, sourceRecordKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const readableRows = useMemo(
    () => rows.map((row) => ({ row, content: guidanceContentFromSummary(row.summary, language) })),
    [language, rows],
  );

  return (
    <Card className={`border-border bg-card ${className}`} aria-label={title}>
      <CardHeader className="gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-foreground">
            <Lightbulb className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-1 max-w-3xl leading-5">{description}</CardDescription>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={() => void load()}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          {copy.refresh}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {loading ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
            <div>
              <p className="font-medium text-foreground">
                {copy.errorTitle}
              </p>
              <p className="mt-0.5 text-muted-foreground">
                {copy.errorDescription}
              </p>
            </div>
          </div>
        ) : readableRows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-5">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-success" aria-hidden />
              <div>
                <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{emptyDescription}</p>
              </div>
            </div>
          </div>
        ) : (
          readableRows.map(({ row, content }) => {
            const state = guidanceStatus(row.status);
            return (
              <article key={row.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant={state === 'attention' ? 'destructive' : 'secondary'}>
                        {state === 'applied'
                          ? copy.applied
                          : state === 'dismissed'
                            ? copy.dismissed
                            : state === 'attention'
                              ? copy.attention
                              : copy.ready}
                      </Badge>
                      {row.created_at ? (
                        <time className="text-xs text-muted-foreground" dateTime={row.created_at}>
                          {formatGuidanceDate(row.created_at, language)}
                        </time>
                      ) : null}
                    </div>
                    {content ? (
                      <>
                        <p className="text-sm font-medium leading-6 text-foreground">{content.summary}</p>
                        {content.details.length > 0 ? (
                          <ul className="mt-2 space-y-1.5 text-sm leading-5 text-muted-foreground">
                            {content.details.map((detail) => (
                              <li key={detail} className="flex gap-2">
                                <span aria-hidden>•</span>
                                <span>{detail}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {content.sources.length > 0 ? <span>{copy.sources}: {content.sources.join(' · ')}</span> : <span>{copy.noSources}</span>}
                          {content.confidence != null ? <span>{copy.confidence}: {Math.round(content.confidence * 100)}%</span> : null}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm leading-5 text-muted-foreground">
                        {unreadableText ?? copy.unreadable}
                      </p>
                    )}
                  </div>
                  {renderAction ? <div className="shrink-0">{renderAction(row)}</div> : null}
                </div>
              </article>
            );
          })
        )}
        {footer}
      </CardContent>
    </Card>
  );
}

function formatGuidanceDate(value: string, language: 'en' | 'zh'): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
