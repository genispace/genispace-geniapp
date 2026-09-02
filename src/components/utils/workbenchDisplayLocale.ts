/**
 * Runtime display translation for API / datasource strings (store names, product titles, etc.)
 * Config UI strings use `metadata.locales` component patches; dynamic row labels use `labels` map.
 */

export type LocaleLabelMap = Record<string, string>;

/** Inline bilingual config: `{ zh, en }` or plain string from workbench JSON. */
export type BilingualText = string | { zh?: string; en?: string };

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Resolve workbench inline bilingual text (`{ zh, en }`) to a display string.
 * Safe to pass through plain strings; returns '' for null/undefined.
 */
export const resolveBilingualText = (text: unknown, language: string): string => {
  if (text == null) return '';
  if (typeof text === 'string' || typeof text === 'number' || typeof text === 'boolean') {
    return String(text);
  }
  if (isPlainObject(text)) {
    const lang = language.startsWith('zh') ? 'zh' : 'en';
    const o = text as { zh?: string; en?: string };
    const picked = o[lang] ?? o.zh ?? o.en;
    if (picked != null && typeof picked !== 'object') return String(picked);
    return '';
  }
  return String(text);
};

const isChineseText = (text: string): boolean => /[\u4e00-\u9fff]/.test(text);

const sortKeysByLengthDesc = (keys: string[]): string[] =>
  [...keys].sort((a, b) => b.length - a.length);

/** Apply longest-first embedded replacements within composite field values (longest key match first). */
export const applyEmbeddedLabelReplacements = (
  text: string,
  labels: LocaleLabelMap
): string => {
  let out = text;
  for (const key of sortKeysByLengthDesc(Object.keys(labels))) {
    if (key && out.includes(key)) {
      out = out.split(key).join(labels[key]!);
    }
  }
  return out;
};

export const localizeDisplayText = (
  text: string | null | undefined,
  labels: LocaleLabelMap | undefined,
  language: string
): string => {
  if (text == null) return '';
  const raw = String(text);
  if (!raw || language.startsWith('zh') || !labels) {
    return raw;
  }

  const trimmed = raw.trim();
  if (labels[raw]) return labels[raw]!;
  if (labels[trimmed]) return labels[trimmed]!;

  const embedded = applyEmbeddedLabelReplacements(raw, labels);
  if (embedded !== raw) {
    return embedded;
  }

  return raw;
};

export const localizeRecordValues = (
  record: Record<string, unknown>,
  labels: LocaleLabelMap | undefined,
  language: string
): Record<string, unknown> => {
  if (language.startsWith('zh') || !labels) {
    return record;
  }

  const out: Record<string, unknown> = { ...record };
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string' && isChineseText(value)) {
      out[key] = localizeDisplayText(value, labels, language);
    }
  }
  return out;
};

export const localizeDataRows = <T extends Record<string, unknown>>(
  rows: T[] | undefined | null,
  labels: LocaleLabelMap | undefined,
  language: string
): T[] => {
  if (!rows?.length || language.startsWith('zh') || !labels) {
    return rows ?? [];
  }
  return rows.map((row) => localizeRecordValues(row, labels, language) as T);
};

export const getLocaleLabelMap = (
  metadata: { locales?: Record<string, { labels?: LocaleLabelMap }> } | undefined,
  language: string
): LocaleLabelMap | undefined => metadata?.locales?.[language]?.labels;

/**
 * Map a locale-patched field label (e.g. "Region") back to the canonical datasource key.
 * Config locale patches may translate `nameField` for display while API/mock rows keep source keys.
 */
export const resolveCanonicalFieldKey = (
  field: string | undefined,
  labels: LocaleLabelMap | undefined,
  language: string
): string => {
  const keys = resolveCanonicalFieldKeys(field, labels, language);
  return keys[0] ?? 'name';
};

/** All datasource keys that map to the same localized field label (e.g. region_key + area_key → Region). */
export const resolveCanonicalFieldKeys = (
  field: string | undefined,
  labels: LocaleLabelMap | undefined,
  language: string
): string[] => {
  const raw = field?.trim() ?? '';
  if (!raw || language.startsWith('zh') || !labels) {
    return raw ? [raw] : ['name'];
  }
  if (Object.prototype.hasOwnProperty.call(labels, raw)) {
    return [raw];
  }
  const matches = Object.entries(labels)
    .filter(([, localizedValue]) => localizedValue === raw)
    .map(([canonicalKey]) => canonicalKey);
  return matches.length > 0 ? matches : [raw];
};

export const readRowFieldValue = (
  row: Record<string, unknown> | undefined | null,
  field: string,
  ...fallbackFields: string[]
): unknown => {
  if (!row) {
    return undefined;
  }
  for (const key of [field, ...fallbackFields]) {
    if (!key) {
      continue;
    }
    const value = row[key];
    if (value != null && String(value).trim() !== '') {
      return value;
    }
  }
  return undefined;
};
