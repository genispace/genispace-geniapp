import type { VisibleWhen, VisibleWhenRule } from './visibleWhen';

/**
 * Editor-facing helpers for the navigation item visibleWhen condition.
 *
 * The sidebar editor offers a role multi-select only, serialized as
 * `{ rules: [{ source: 'role', field: 'app', op: 'in', value: [...codes] }] }`.
 * Existing conditions of any other shape (compound or/notIn rules, other fields/sources)
 * cannot map onto that whitelist: they are shown as a read-only "custom rule in place"
 * note and must round-trip untouched unless the user actually toggles a role — so
 * detection below is intentionally strict about which shapes count as simple.
 */

export type NavigationVisibleWhenEditState =
  | { kind: 'none' }
  | { kind: 'simple'; roleCodes: string[] }
  | { kind: 'custom' };

const isSimpleRoleRule = (rule: VisibleWhenRule): boolean => {
  const record = rule as unknown as Record<string, unknown>;
  const keys = Object.keys(record).filter((key) => record[key] !== undefined);
  return (
    rule.source === 'role' &&
    rule.field === 'app' &&
    rule.op === 'in' &&
    Array.isArray(rule.value) &&
    rule.value.length > 0 &&
    rule.value.every((code) => typeof code === 'string' && code.trim() !== '') &&
    keys.every((key) => ['source', 'field', 'op', 'value'].includes(key))
  );
};

/** Classify an existing condition: absent, exactly the simple role-gate shape, or custom. */
export const describeNavigationVisibleWhen = (
  cond: VisibleWhen | undefined | null
): NavigationVisibleWhenEditState => {
  if (!cond || typeof cond !== 'object') {
    return { kind: 'none' };
  }

  const keys = Object.keys(cond).filter((key) => (cond as Record<string, unknown>)[key] !== undefined);
  if (
    keys.length === 1 &&
    keys[0] === 'rules' &&
    Array.isArray(cond.rules) &&
    cond.rules.length === 1 &&
    isSimpleRoleRule(cond.rules[0])
  ) {
    return { kind: 'simple', roleCodes: (cond.rules[0].value as string[]).map(String) };
  }

  return { kind: 'custom' };
};

/** Whether the condition is a non-simple shape the role picker cannot represent. */
export const hasCustomNavigationVisibleWhen = (cond: VisibleWhen | undefined | null): boolean =>
  describeNavigationVisibleWhen(cond).kind === 'custom';

/** Serialize the role selection: empty selection means unrestricted (field removed). */
export const buildSimpleRoleVisibleWhen = (roleCodes: string[]): VisibleWhen | undefined => {
  const codes = Array.from(new Set(roleCodes.filter((code) => typeof code === 'string' && code.trim() !== '')));
  if (codes.length === 0) {
    return undefined;
  }
  return {
    rules: [{ source: 'role', field: 'app', op: 'in', value: codes }],
  };
};

/**
 * Resolve the visibleWhen to persist from the edit form; undefined removes the field.
 * An untouched custom condition (`visibleWhenOriginal` present, no role toggled) is
 * preserved verbatim; once any role checkbox is toggled the item follows the simple
 * role-selection semantics (empty selection removes the field).
 */
export const resolveEditFormVisibleWhen = (form: {
  visibleRoleCodes?: string[];
  visibleWhenOriginal?: VisibleWhen;
  visibleRolesTouched?: boolean;
}): VisibleWhen | undefined => {
  if (form.visibleWhenOriginal !== undefined && !form.visibleRolesTouched) {
    return form.visibleWhenOriginal;
  }
  return buildSimpleRoleVisibleWhen(form.visibleRoleCodes ?? []);
};
