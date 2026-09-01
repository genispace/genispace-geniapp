import type { WorkflowResultRow } from '../types';
import { parseAiSummary } from './parseAiSummary';

export type GuidanceLanguage = 'en' | 'zh';

export interface GuidanceContent {
  summary: string;
  details: string[];
  sources: string[];
  confidence: number | null;
}

export interface ContextualWorkflowSelection {
  sourceRecordKey?: string;
  owners: readonly string[];
  limit: number;
}

const SUMMARY_KEYS = [
  'summary',
  'recommendation',
  'description',
  'conclusion',
  'diagnosis',
  'analysis_summary',
  'suggestion',
  'reason',
] as const;

const DETAIL_KEYS = [
  'nextSteps',
  'next_steps',
  'nextActions',
  'next_actions',
  'recommendations',
  'risks',
  'issues',
  'anomalies',
  'stockAlerts',
  'stock_alerts',
] as const;

function localizedString(value: unknown, language: GuidanceLanguage): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const record = value as Record<string, unknown>;
  const preferred = record[language];
  if (typeof preferred === 'string') return preferred.trim();
  const fallback = language === 'zh' ? record.en : record.zh;
  return typeof fallback === 'string' ? fallback.trim() : '';
}

function detailStrings(value: unknown, language: GuidanceLanguage): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        const direct = localizedString(item, language);
        if (direct) return [direct];
        if (!item || typeof item !== 'object') return [];
        const record = item as Record<string, unknown>;
        for (const key of ['message', 'title', 'description', 'reason', 'action', 'suggestion']) {
          const text = localizedString(record[key], language);
          if (text) return [text];
        }
        return [];
      })
      .filter(Boolean);
  }
  const direct = localizedString(value, language);
  return direct ? [direct] : [];
}

function unwrapOutput(record: Record<string, unknown>): Record<string, unknown> {
  const output = record.output;
  if (output && typeof output === 'object' && !Array.isArray(output)) {
    return output as Record<string, unknown>;
  }
  return record;
}

function sourceStrings(record: Record<string, unknown>, language: GuidanceLanguage): string[] {
  const candidates = [record.sources, record.source_refs, record.citations, record.references];
  return [...new Set(candidates.flatMap((value) => detailStrings(value, language)))].slice(0, 5);
}

function confidenceValue(record: Record<string, unknown>): number | null {
  const raw = record.confidence ?? record.confidence_score;
  const number = Number(raw);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(1, number > 1 ? number / 100 : number));
}

/**
 * Extract only business-readable copy from a workflow result. Unknown objects
 * intentionally return null: raw JSON belongs in platform diagnostics, not in
 * a business application.
 */
export function guidanceContentFromSummary(
  rawSummary: string | null | undefined,
  language: GuidanceLanguage,
): GuidanceContent | null {
  const parsed = parseAiSummary(rawSummary);
  if (!parsed) return null;
  const record = unwrapOutput(parsed);

  let summary = '';
  let summaryKey: (typeof SUMMARY_KEYS)[number] | null = null;
  for (const key of SUMMARY_KEYS) {
    summary = localizedString(record[key], language);
    if (summary) {
      summaryKey = key;
      break;
    }
  }

  const details: string[] = [];
  for (const key of SUMMARY_KEYS) {
    if (key !== summaryKey) details.push(...detailStrings(record[key], language));
  }
  for (const key of DETAIL_KEYS) {
    details.push(...detailStrings(record[key], language));
  }

  if (!summary && details.length > 0) summary = details.shift() ?? '';
  if (!summary) return null;
  return {
    summary,
    details: [...new Set(details)].filter((detail) => detail !== summary).slice(0, 5),
    sources: sourceStrings(record, language),
    confidence: confidenceValue(record),
  };
}

export function guidanceStatus(status: WorkflowResultRow['status']):
  | 'ready'
  | 'applied'
  | 'dismissed'
  | 'attention' {
  const normalized = String(status ?? '').toLowerCase();
  if (['adopted', 'accepted', 'applied'].includes(normalized)) return 'applied';
  if (['dismissed', 'rejected', 'ignored'].includes(normalized)) return 'dismissed';
  if (['failed', 'error', 'blocked'].includes(normalized)) return 'attention';
  return 'ready';
}

/**
 * Enforce the business context again after a datasource response. Some legacy
 * adapters ignore filters, so a server response is never trusted to isolate a
 * record or an Agent/workflow owner on its own.
 */
export function selectContextualWorkflowResults(
  rows: readonly WorkflowResultRow[],
  { sourceRecordKey, owners, limit }: ContextualWorkflowSelection,
): WorkflowResultRow[] {
  if (owners.length === 0 || limit <= 0) return [];
  const allowedOwners = new Set(owners);
  return [
    ...new Map(rows.map((row) => [row.id, row] as const)).values(),
  ]
    .filter(
      (row) =>
        !sourceRecordKey ||
        String(row.source_record_key ?? '') === String(sourceRecordKey),
    )
    .filter((row) => Boolean(row.owner) && allowedOwners.has(String(row.owner)))
    .sort((left, right) => {
      const leftTime = left.created_at ? Date.parse(left.created_at) : 0;
      const rightTime = right.created_at ? Date.parse(right.created_at) : 0;
      return (Number.isFinite(rightTime) ? rightTime : 0) -
        (Number.isFinite(leftTime) ? leftTime : 0);
    })
    .slice(0, limit);
}
