import type {
  FormAction,
  FormActionVisibility,
  FormActionVisibilityClause,
  FormActionVisibilityOperator,
  VisibilityCondition,
} from '../types';

/** Minimal shape required by visibility-clause helpers. FormAction and TableAction both satisfy it. */
type FormActionLike = {
  actionVisibility?: FormActionVisibility;
  visibilityCondition?: VisibilityCondition;
};

export function normalizeFormActionVisibilityClauses(
  action: FormActionLike
): FormActionVisibilityClause[] {
  if (action.actionVisibility?.clauses?.length) {
    return action.actionVisibility.clauses;
  }
  const legacy = action.visibilityCondition;
  if (legacy?.field) {
    return [
      {
        source: 'formField',
        key: legacy.field,
        operator: legacy.operator,
        value: legacy.value,
      },
    ];
  }
  return [];
}

export function collectFormFieldKeysFromFormActionVisibility(
  actions: (FormActionLike & { id?: string })[] | undefined
): Set<string> {
  const set = new Set<string>();
  if (!Array.isArray(actions)) return set;
  for (const action of actions) {
    for (const c of normalizeFormActionVisibilityClauses(action)) {
      if (c.source === 'formField' && c.key) set.add(c.key);
    }
  }
  return set;
}

export function hasFormActionParameterVisibilityClauses(
  actions: FormActionLike[] | undefined
): boolean {
  if (!Array.isArray(actions)) return false;
  return actions.some((a) =>
    normalizeFormActionVisibilityClauses(a).some((c) => c.source === 'parameter')
  );
}

function compareClause(
  left: unknown,
  operator: FormActionVisibilityOperator,
  value: unknown
): boolean {
  switch (operator) {
    case 'equals':
      return left === value;
    case 'not_equals':
      return left !== value;
    case 'in':
      return Array.isArray(value) && value.includes(left);
    case 'gt':
      return Number(left) > Number(value);
    case 'lt':
      return Number(left) < Number(value);
    case 'contains':
      return String(left ?? '')
        .toLowerCase()
        .includes(String(value ?? '').toLowerCase());
    default:
      return true;
  }
}

export function evaluateFormActionVisibility(
  action: FormActionLike,
  context: {
    formValues: Record<string, unknown>;
    parameters: Record<string, unknown>;
  }
): boolean {
  const clauses = normalizeFormActionVisibilityClauses(action);
  if (clauses.length === 0) return true;

  return clauses.every((c) => {
    const left =
      c.source === 'formField'
        ? context.formValues[c.key]
        : context.parameters[c.key];
    return compareClause(left, c.operator, c.value);
  });
}

export function stableSerializePageParams(
  pageParams: Record<string, unknown> | undefined
): string {
  if (!pageParams || typeof pageParams !== 'object') return '{}';
  const keys = Object.keys(pageParams).sort();
  const sorted: Record<string, unknown> = {};
  for (const k of keys) sorted[k] = pageParams[k];
  try {
    return JSON.stringify(sorted);
  } catch {
    return keys.join(',');
  }
}

/** Parse compare value for editor: IN uses JSON array or comma-separated tokens. */
export function parseVisibilityCompareValue(
  operator: FormActionVisibilityOperator,
  raw: string
): unknown {
  if (operator !== 'in') {
    return raw;
  }
  const t = raw.trim();
  if (!t) return [];
  if (t.startsWith('[')) {
    try {
      const parsed = JSON.parse(t);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return t.split(',').map((s) => s.trim()).filter(Boolean);
}

export function formatVisibilityCompareValueForEditor(
  operator: FormActionVisibilityOperator,
  value: unknown
): string {
  if (operator !== 'in') {
    if (value === undefined || value === null) return '';
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).join(', ');
  }
  if (typeof value === 'string') return value;
  return '';
}
