export type BusinessFieldValue = string | number | boolean | null;

export type BusinessRecordDraft = {
  recordType: string;
  name: string;
  description: string;
  priority: string;
  dueAt: string;
  values: Record<string, BusinessFieldValue>;
};

export type TransitionMap = Record<string, string[]>;

export function validateTransition(
  currentState: string,
  targetState: string,
  transitions: TransitionMap,
) {
  const allowed = transitions[currentState] || [];
  return {
    allowed: allowed.includes(targetState),
    allowedTargets: allowed,
    reason: allowed.includes(targetState) ? null : "TRANSITION_NOT_ALLOWED",
  } as const;
}

export function validateRecordDraft(
  draft: BusinessRecordDraft,
  requiredFields: string[],
) {
  const missing: string[] = [];
  if (!draft.recordType.trim()) missing.push("recordType");
  if (draft.name.trim().length < 3) missing.push("name");
  if (draft.description.trim().length < 10) missing.push("description");
  for (const key of requiredFields) {
    const value = draft.values[key];
    if (value === null || value === undefined || String(value).trim() === "") {
      missing.push(key);
    }
  }
  return { valid: missing.length === 0, missing };
}

export function calculateReconciliation(
  expectedValue: number,
  actualValue: number,
  tolerance: number,
  resolution: string,
) {
  if (![expectedValue, actualValue, tolerance].every(Number.isFinite)) {
    throw new Error("RECONCILIATION_VALUE_INVALID");
  }
  if (tolerance < 0) throw new Error("RECONCILIATION_TOLERANCE_INVALID");
  const variance = Number((actualValue - expectedValue).toFixed(4));
  const withinTolerance = Math.abs(variance) <= tolerance;
  return {
    variance,
    withinTolerance,
    state: withinTolerance ? "closed" : resolution.trim().length >= 10 ? "explained" : "open",
  } as const;
}

export function createIdempotencyKey(
  operation: string,
  businessKey: string,
  revision: string,
) {
  const normalized = [operation, businessKey, revision]
    .map((value) => value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-"))
    .filter(Boolean);
  if (normalized.length !== 3) throw new Error("IDEMPOTENCY_INPUT_INVALID");
  return normalized.join(":");
}

export function filterBusinessRecords<T extends {
  name: string;
  number: string;
  record_type: string;
  state: string;
}>(
  rows: T[],
  filter: { search: string; recordType: string; state: string },
) {
  const search = filter.search.trim().toLocaleLowerCase();
  return rows.filter((row) => {
    if (filter.recordType && row.record_type !== filter.recordType) return false;
    if (filter.state && row.state !== filter.state) return false;
    if (!search) return true;
    return `${row.number} ${row.name}`.toLocaleLowerCase().includes(search);
  });
}
