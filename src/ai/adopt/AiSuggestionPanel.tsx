import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbulb, Check, Loader2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  toast,
  AlertDialog,
} from '@genispace/geniapp/kit';
import { AiMessage, AiSuggestion, AiSuggestionAction } from '../layout/aiUi';
import { sharedAiCopy } from '../locales/sharedAiCopy';
import { guidanceContentFromSummary, selectContextualWorkflowResults } from './guidanceContent';
import { parseAiSummary, getByPath, formatDisplayValue, localizedText } from './parseAiSummary';
import type { AdoptFieldConfig, AppTableClient, WorkflowResultRow } from '../types';

export interface AiSuggestionPanelProps {
  recordId: string | undefined;
  resultsTable: string;
  businessTable: string;
  client: AppTableClient;
  fields: AdoptFieldConfig[];
  sourceRecordKey?: string;
  disabled?: boolean;
  className?: string;
  onAdopted?: (patch: Record<string, unknown>) => void;
  lang?: 'zh' | 'en';
  owners: readonly string[];
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  applyLabel?: string;
  applyAllLabel?: string;
  successMessage?: string;
  allowEditing?: boolean;
}

export function AiSuggestionPanel({
  recordId,
  resultsTable,
  businessTable,
  client,
  fields,
  sourceRecordKey,
  disabled,
  className = '',
  onAdopted,
  lang,
  owners,
  title,
  description,
  emptyTitle,
  emptyDescription,
  applyLabel,
  applyAllLabel,
  successMessage,
  allowEditing = true,
}: AiSuggestionPanelProps) {
  const { i18n } = useTranslation();
  const resolvedLanguage =
    lang ?? (i18n.resolvedLanguage?.toLowerCase().startsWith('zh') ? 'zh' : 'en');
  const copy = suggestionCopy(resolvedLanguage);
  const [loading, setLoading] = useState(false);
  const [adopting, setAdopting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WorkflowResultRow | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [appliedFields, setAppliedFields] = useState<Set<string>>(new Set());
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);

  const key = sourceRecordKey ?? recordId;
  const parsed = useMemo(() => parseAiSummary(result?.summary), [result?.summary]);
  const evidence = useMemo(() => guidanceContentFromSummary(result?.summary, resolvedLanguage), [resolvedLanguage, result?.summary]);
  const ownerKey = owners?.join('\u0000') ?? '';
  const fieldSignature = fields.map((field) => `${field.targetField}:${field.summaryPath}`).join('|');

  const load = useCallback(async () => {
    if (!key) {
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const allowedOwners = ownerKey ? new Set(ownerKey.split('\u0000')) : null;
      const ownerCandidates = allowedOwners ? [...allowedOwners] : [];
      const responses = await Promise.all(
        ownerCandidates.map((owner) =>
          client.list<WorkflowResultRow>(resultsTable, {
            filters: {
              source_record_key: key,
              ...(owner ? { owner } : {}),
            },
            limit: 20,
          }),
        ),
      );
      const items = selectContextualWorkflowResults(
        responses.flatMap((response) => response.items ?? []),
        {
          sourceRecordKey: key,
          owners: allowedOwners ? [...allowedOwners] : [],
          limit: 1,
        },
      );
      setResult(items[0] ?? null);
    } catch (e) {
      console.error(`[GeniApp] ${resultsTable} record guidance load failed`, e);
      setError(copy.loadError);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [client, copy.loadError, key, ownerKey, resultsTable]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!parsed) {
      setDrafts({});
      return;
    }
    const next: Record<string, string> = {};
    for (const field of fields) {
      const raw = getByPath(parsed, field.summaryPath);
      const value = field.toValue ? field.toValue(raw, parsed, resolvedLanguage) : raw;
      const display = formatDisplayValue(value, resolvedLanguage);
      if (display) next[field.targetField] = display;
    }
    setDrafts(next);
    setAppliedFields(new Set());
  }, [fieldSignature, parsed, resolvedLanguage]);

  const adoptField = async (field: AdoptFieldConfig) => {
    if (!recordId || !parsed) return;
    const raw = getByPath(parsed, field.summaryPath);
    const transformed = field.toValue ? field.toValue(raw, parsed, resolvedLanguage) : raw;
    const edited = drafts[field.targetField];
    const value = allowEditing && typeof edited === 'string' ? edited.trim() : transformed;
    if (value == null || (typeof value === 'string' && value.trim() === '')) {
      setError(copy.emptyField);
      return;
    }
    setAdopting(field.targetField);
    setError(null);
    try {
      const patch = { [field.targetField]: value };
      await client.update(businessTable, recordId, patch);
      onAdopted?.(patch);
      setAppliedFields((current) => new Set(current).add(field.targetField));
      toast({
        title: successMessage ?? copy.adopted,
        variant: 'success',
      });
    } catch (e) {
      console.error(`[GeniApp] ${businessTable} suggestion apply failed`, e);
      setError(copy.applyError);
    } finally {
      setAdopting(null);
    }
  };

  const adoptAll = async () => {
    if (!recordId || !parsed) return;
    setAdopting('__all__');
    setError(null);
    try {
      const patch: Record<string, unknown> = {};
      for (const field of fields) {
        const raw = getByPath(parsed, field.summaryPath);
        const transformed = field.toValue ? field.toValue(raw, parsed, resolvedLanguage) : raw;
        const edited = drafts[field.targetField];
        const value = allowEditing && typeof edited === 'string' ? edited.trim() : transformed;
        if (value != null && !(typeof value === 'string' && value.trim() === '')) {
          patch[field.targetField] = value;
        }
      }
      if (Object.keys(patch).length === 0) {
        setError(copy.emptyField);
        return;
      }
      await client.update(businessTable, recordId, patch);
      onAdopted?.(patch);
      setAppliedFields(new Set(Object.keys(patch)));
      toast({
        title: successMessage ?? copy.adoptedAll,
        variant: 'success',
      });
    } catch (e) {
      console.error(`[GeniApp] ${businessTable} suggestions apply failed`, e);
      setError(copy.applyAllError);
    } finally {
      setAdopting(null);
    }
  };

  if (!recordId) return null;

  return (
    <Card
      className={`border-accent/30 bg-card ${className}`}
      aria-label={title ?? copy.panelTitle}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Lightbulb className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm">
              {title ?? copy.panelTitle}
            </CardTitle>
            <CardDescription>
              {description ?? copy.panelHint}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {loading && (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {!loading && !result && (
          <div className="rounded-lg border border-dashed border-border px-3 py-4">
            <p className="text-sm font-medium text-foreground">
              {emptyTitle ?? copy.emptyTitle}
            </p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {emptyDescription ?? copy.noResults}
            </p>
          </div>
        )}

        {!loading && result && (
          <>
            <ResultMeta result={result} language={resolvedLanguage} />
            {parsed?.summary != null && typeof parsed.summary === 'string' && fields.length === 0 && (
              <AiMessage>
                <p className="whitespace-pre-wrap">{parsed.summary}</p>
              </AiMessage>
            )}
            {fields.map((field) => {
              const raw = parsed ? getByPath(parsed, field.summaryPath) : undefined;
              const transformed = field.toValue ? field.toValue(raw, parsed, resolvedLanguage) : raw;
              const display = formatDisplayValue(transformed, resolvedLanguage);
              if (!display) return null;
              const applied = appliedFields.has(field.targetField);
              return (
                <AiSuggestion
                  key={field.targetField}
                  label={field.label}
                  action={
                    <AiSuggestionAction
                      disabled={disabled || adopting != null || applied}
                      onClick={() => setPendingTarget(field.targetField)}
                    >
                      {adopting === field.targetField ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      {applied
                        ? copy.added
                        : applyLabel ?? copy.adopt}
                    </AiSuggestionAction>
                  }
                >
                  {allowEditing ? (
                    <textarea
                      value={drafts[field.targetField] ?? display}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [field.targetField]: event.target.value,
                        }))
                      }
                      rows={Math.min(6, Math.max(2, (drafts[field.targetField] ?? display).split('\n').length))}
                      className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-5 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={field.label}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap leading-5">{display}</p>
                  )}
                </AiSuggestion>
              );
            })}
            {fields.length > 1 && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={disabled || adopting != null}
                onClick={() => setPendingTarget('__all__')}
              >
                {adopting === '__all__'
                  ? copy.adopting
                  : applyAllLabel ?? copy.adoptAll}
              </Button>
            )}
          </>
        )}

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {result ? <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground"><p className="font-medium text-foreground">{copy.sources}</p><p className="mt-1">{evidence?.sources.length ? evidence.sources.join(' · ') : copy.noSources}</p>{evidence?.confidence != null ? <p className="mt-1">{copy.confidence}: {Math.round(evidence.confidence * 100)}%</p> : null}</div> : null}
      </CardContent>
      <AlertDialog
        isOpen={pendingTarget != null}
        type="info"
        title={copy.confirmTitle}
        message={pendingTarget === '__all__' ? copy.confirmAll.replace('{{count}}', String(fields.length)) : copy.confirmOne.replace('{{field}}', fields.find((field) => field.targetField === pendingTarget)?.label ?? '')}
        confirmText={copy.confirmAction}
        cancelText={copy.cancelAction}
        showCancel
        loading={adopting != null}
        onClose={() => setPendingTarget(null)}
        onCancel={() => setPendingTarget(null)}
        onConfirm={() => {
          const target = pendingTarget;
          setPendingTarget(null);
          if (target === '__all__') void adoptAll();
          else {
            const field = fields.find((candidate) => candidate.targetField === target);
            if (field) void adoptField(field);
          }
        }}
      />
    </Card>
  );
}

function ResultMeta({ result, language }: { result: WorkflowResultRow; language: 'en' | 'zh' }) {
  const copy = suggestionCopy(language);
  const normalizedStatus = String(result.status ?? '').toLowerCase();
  const statusLabel = ['adopted', 'accepted', 'applied'].includes(normalizedStatus)
    ? copy.statusApplied
    : ['failed', 'error', 'blocked'].includes(normalizedStatus)
      ? copy.statusAttention
      : copy.statusReady;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Badge variant="secondary">{statusLabel}</Badge>
      {result.created_at && formatSuggestionDate(result.created_at, language) && (
        <time dateTime={result.created_at}>
          {formatSuggestionDate(result.created_at, language)}
        </time>
      )}
    </div>
  );
}

function formatSuggestionDate(value: string, language: 'en' | 'zh'): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function suggestionCopy(language: 'en' | 'zh') {
  return sharedAiCopy(language).suggestion;
}

/** Common field mappers for product description agent output */
export const productDescriptionAdoptFields = (labels: {
  description: string;
  descriptionSale: string;
  name?: string;
}): AdoptFieldConfig[] => {
  const fields: AdoptFieldConfig[] = [
    {
      label: labels.description,
      summaryPath: 'description',
      targetField: 'description',
      toValue: (raw, _parsed, language) => localizedText(raw, language ?? 'en'),
    },
    {
      label: labels.descriptionSale,
      summaryPath: 'highlights',
      targetField: 'description_sale',
      toValue: (raw, _parsed, language) => {
        if (Array.isArray(raw)) return raw.map(String).join('\n• ');
        return localizedText(raw, language ?? 'en');
      },
    },
  ];
  if (labels.name) {
    fields.unshift({
      label: labels.name,
      summaryPath: 'title',
      targetField: 'name',
      toValue: (raw, _parsed, language) => localizedText(raw, language ?? 'en'),
    });
  }
  return fields;
};
