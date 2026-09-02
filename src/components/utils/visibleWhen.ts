
//




//

//    visibleWhen: {

//      rules: [
//        { source: 'pageParam', field: 'view', op: 'eq', value: 'hq' },
//        { source: 'role', field: 'space', op: 'in', value: ['OWNER','ADMINISTRATOR'] },
//        { source: 'user', field: 'email', op: 'in', value: ['pilot@x.com'] },
//      ],
//    }

export type VisibleWhenSource = 'pageParam' | 'role' | 'user';
export type VisibleWhenOp =
  | 'eq' | 'ne' | 'in' | 'notIn'
  | 'exists' | 'notExists'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains';

export interface VisibleWhenRule {
  source?: VisibleWhenSource; 
  field: string;             
  op?: VisibleWhenOp;         
  value?: unknown;
}

export interface VisibleWhen {
  
  key?: string;
  value?: string | string[];
  notValue?: string | string[];
  all?: VisibleWhen[];
  
  logic?: 'and' | 'or';
  rules?: VisibleWhenRule[];
}


export interface VisibleWhenContext {
  pageParams?: Record<string, unknown>;
  user?: { id?: string; name?: string; email?: string } | null;
  roles?: { space?: string | null; platform?: string[]; app?: string[] };
}

function resolveActual(rule: VisibleWhenRule, ctx: VisibleWhenContext): unknown {
  switch (rule.source) {
    case 'role':
      // field 'app' = application-level role codes (e.g. store_manager), an array like platform.
      if (rule.field === 'app') return ctx.roles?.app ?? [];
      if (rule.field === 'platform') return ctx.roles?.platform ?? [];
      return ctx.roles?.space ?? null;
    case 'user':
      return ctx.user ? (ctx.user as Record<string, unknown>)[rule.field] : undefined;
    case 'pageParam':
    default:
      return ctx.pageParams?.[rule.field];
  }
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (v === null || v === undefined || v === '') return [];
  return [String(v)];
}

function applyOp(op: VisibleWhenOp, actual: unknown, value: unknown): boolean {
  const exists =
    actual !== null && actual !== undefined && actual !== '' &&
    !(Array.isArray(actual) && actual.length === 0);
  switch (op) {
    case 'exists':
      return exists;
    case 'notExists':
      return !exists;
    case 'in': {
      const want = asStringArray(value);
      const have = asStringArray(actual);
      return have.some((h) => want.includes(h));
    }
    case 'notIn': {
      const want = asStringArray(value);
      const have = asStringArray(actual);
      return !have.some((h) => want.includes(h));
    }
    case 'contains': {
      if (Array.isArray(actual)) return asStringArray(actual).includes(String(value));
      return String(actual ?? '').includes(String(value));
    }
    case 'ne':
      return String(actual ?? '') !== String(value ?? '');
    // Numeric comparisons: when `actual` is an array (e.g. a multi-select filter's
    // selected values), compare against its LENGTH — this enables conditions like
    // "visible when 2+ options are selected" ({ field: 'storeIds', op: 'gte', value: 2 }).
    case 'gt':
      return Number(Array.isArray(actual) ? actual.length : actual) > Number(value);
    case 'gte':
      return Number(Array.isArray(actual) ? actual.length : actual) >= Number(value);
    case 'lt':
      return Number(Array.isArray(actual) ? actual.length : actual) < Number(value);
    case 'lte':
      return Number(Array.isArray(actual) ? actual.length : actual) <= Number(value);
    case 'eq':
    default: {
      
      if (Array.isArray(actual)) return asStringArray(actual).includes(String(value));
      
      if (Array.isArray(value)) return asStringArray(value).includes(String(actual ?? ''));
      return String(actual ?? '') === String(value ?? '');
    }
  }
}

function evalRule(rule: VisibleWhenRule, ctx: VisibleWhenContext): boolean {
  return applyOp(rule.op ?? 'eq', resolveActual(rule, ctx), rule.value);
}


export function evaluateVisibleWhen(
  cond: VisibleWhen | undefined | null,
  ctx: VisibleWhenContext
): boolean {
  if (!cond) return true;
  if (Array.isArray(cond.all)) return cond.all.every((c) => evaluateVisibleWhen(c, ctx));
  if (Array.isArray(cond.rules) && cond.rules.length > 0) {
    return cond.logic === 'or'
      ? cond.rules.some((r) => evalRule(r, ctx))
      : cond.rules.every((r) => evalRule(r, ctx));
  }
  if (!cond.key) return true;
  const actual = String(ctx.pageParams?.[cond.key] ?? '');
  if (cond.value !== undefined) {
    const vals = (Array.isArray(cond.value) ? cond.value : [cond.value]).map(String);
    return vals.includes(actual);
  }
  if (cond.notValue !== undefined) {
    const vals = (Array.isArray(cond.notValue) ? cond.notValue : [cond.notValue]).map(String);
    return !vals.includes(actual);
  }
  return true;
}


export function isVisibleWhen(
  cond: VisibleWhen | undefined | null,
  pageParams: Record<string, unknown> | undefined
): boolean {
  return evaluateVisibleWhen(cond, { pageParams });
}
