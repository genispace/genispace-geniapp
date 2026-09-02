// Shared read/write helpers for component-level `visibleWhen`:
// summary text (edit-mode badge + property editor preview), empty detection,
// legacy-shape → rules normalization for the editor UI, and save-time cleanup.
// Evaluation itself stays in `visibleWhen.ts`.

import type {
  VisibleWhen,
  VisibleWhenOp,
  VisibleWhenRule,
  VisibleWhenSource,
} from './visibleWhen';

export interface NormalizedVisibleWhenRules {
  logic: 'and' | 'or';
  rules: VisibleWhenRule[];
}

const OP_SYMBOLS: Record<VisibleWhenOp, string> = {
  eq: '=',
  ne: '≠',
  in: 'in',
  notIn: 'not in',
  exists: 'exists',
  notExists: 'not exists',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  contains: 'contains',
};

/** Ops whose rules are complete without a value */
export const VALUELESS_OPS: ReadonlyArray<VisibleWhenOp> = ['exists', 'notExists'];

/**
 * True when the config carries no effective condition — component is visible to all.
 * Mirrors `evaluateVisibleWhen`'s "default true" branches.
 */
export function isEmptyVisibleWhen(cond: VisibleWhen | null | undefined): boolean {
  if (!cond || typeof cond !== 'object') return true;
  if (Array.isArray(cond.all)) {
    if (cond.all.some((c) => !isEmptyVisibleWhen(c))) return false;
  }
  if (Array.isArray(cond.rules) && cond.rules.length > 0) return false;
  if (cond.key && (cond.value !== undefined || cond.notValue !== undefined)) return false;
  return true;
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join(', ');
  if (value === null || value === undefined) return '';
  return String(value);
}

function ruleLabel(rule: VisibleWhenRule): string {
  const source = rule.source ?? 'pageParam';
  if (source === 'pageParam') return rule.field;
  if (source === 'role') return rule.field === 'space' || !rule.field ? 'role' : `role.${rule.field}`;
  return `user.${rule.field}`;
}

function formatRule(rule: VisibleWhenRule): string {
  const op = rule.op ?? 'eq';
  const label = ruleLabel(rule);
  if (VALUELESS_OPS.includes(op)) return `${label} ${OP_SYMBOLS[op]}`;
  return `${label} ${OP_SYMBOLS[op]} ${formatValue(rule.value)}`;
}

/**
 * Human-readable one-line summary, e.g. `view = store` / `view ≠ store · period ≠ day`
 * / `role in OWNER, ADMINISTRATOR`. Returns '' for empty configs.
 */
export function formatVisibleWhenSummary(cond: VisibleWhen | null | undefined): string {
  if (!cond || isEmptyVisibleWhen(cond)) return '';
  if (Array.isArray(cond.all)) {
    return cond.all
      .map((c) => formatVisibleWhenSummary(c))
      .filter(Boolean)
      .join(' · ');
  }
  if (Array.isArray(cond.rules) && cond.rules.length > 0) {
    const sep = cond.logic === 'or' ? ' | ' : ' · ';
    return cond.rules.map(formatRule).join(sep);
  }
  if (cond.key) {
    if (cond.value !== undefined) {
      return Array.isArray(cond.value)
        ? `${cond.key} in ${formatValue(cond.value)}`
        : `${cond.key} = ${formatValue(cond.value)}`;
    }
    if (cond.notValue !== undefined) {
      return Array.isArray(cond.notValue)
        ? `${cond.key} not in ${formatValue(cond.notValue)}`
        : `${cond.key} ≠ ${formatValue(cond.notValue)}`;
    }
  }
  return '';
}

function legacyKeyToRules(cond: VisibleWhen): VisibleWhenRule[] {
  if (!cond.key) return [];
  if (cond.value !== undefined) {
    return [
      {
        source: 'pageParam',
        field: cond.key,
        op: Array.isArray(cond.value) ? 'in' : 'eq',
        value: cond.value,
      },
    ];
  }
  if (cond.notValue !== undefined) {
    return [
      {
        source: 'pageParam',
        field: cond.key,
        op: Array.isArray(cond.notValue) ? 'notIn' : 'ne',
        value: cond.notValue,
      },
    ];
  }
  return [];
}

/**
 * Convert any supported `visibleWhen` shape into the flat `{ logic, rules }` form the
 * editor UI operates on. Returns `null` when the config cannot be represented without
 * loss (e.g. nested `all` mixing OR groups) — the editor then falls back to JSON-only.
 */
export function normalizeVisibleWhenToRules(
  cond: VisibleWhen | null | undefined
): NormalizedVisibleWhenRules | null {
  if (!cond || isEmptyVisibleWhen(cond)) return { logic: 'and', rules: [] };

  const hasAll = Array.isArray(cond.all) && cond.all.length > 0;
  const hasRules = Array.isArray(cond.rules) && cond.rules.length > 0;
  const hasKey = Boolean(cond.key) && (cond.value !== undefined || cond.notValue !== undefined);

  // Mixed shapes evaluate with a priority order (all > rules > key); flattening them
  // into one rule list would change semantics — leave to JSON editing.
  if ([hasAll, hasRules, hasKey].filter(Boolean).length > 1) return null;

  if (hasAll) {
    const rules: VisibleWhenRule[] = [];
    for (const entry of cond.all as VisibleWhen[]) {
      if (isEmptyVisibleWhen(entry)) continue;
      const nested = normalizeVisibleWhenToRules(entry);
      if (!nested) return null;
      // An OR group inside `all` cannot be flattened into a single AND list.
      if (nested.logic === 'or' && nested.rules.length > 1) return null;
      rules.push(...nested.rules);
    }
    return { logic: 'and', rules };
  }

  if (hasRules) {
    return {
      logic: cond.logic === 'or' ? 'or' : 'and',
      rules: (cond.rules as VisibleWhenRule[]).map((r) => ({
        source: r.source ?? 'pageParam',
        field: r.field,
        op: r.op ?? 'eq',
        value: r.value,
      })),
    };
  }

  return { logic: 'and', rules: legacyKeyToRules(cond) };
}

function isCompleteRule(rule: VisibleWhenRule): boolean {
  if (!rule.field || !String(rule.field).trim()) return false;
  const op = rule.op ?? 'eq';
  if (VALUELESS_OPS.includes(op)) return true;
  if (rule.value === undefined || rule.value === null) return false;
  if (Array.isArray(rule.value)) return rule.value.length > 0;
  return String(rule.value).trim() !== '';
}

/**
 * Save-time cleanup: drop incomplete rules, collapse empty configs to `undefined`
 * (serialized sw.json then omits the field entirely). Legacy shapes pass through
 * untouched when still meaningful.
 */
export function normalizeVisibleWhenForSave(
  cond: VisibleWhen | null | undefined
): VisibleWhen | undefined {
  if (!cond || isEmptyVisibleWhen(cond)) return undefined;

  if (Array.isArray(cond.rules)) {
    const rules = cond.rules.filter(isCompleteRule);
    if (rules.length === 0) return undefined;
    const out: VisibleWhen = { rules };
    if (cond.logic === 'or') out.logic = 'or';
    return out;
  }

  return cond;
}

/** Build a fresh empty rule for the editor's "add rule" action. */
export function createEmptyVisibleWhenRule(source: VisibleWhenSource = 'pageParam'): VisibleWhenRule {
  return { source, field: '', op: 'eq', value: '' };
}
