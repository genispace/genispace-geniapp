/** Parse workflow_results.summary (JSON string or plain text). */
export function parseAiSummary(summary: string | null | undefined): Record<string, unknown> | null {
  if (summary == null || String(summary).trim() === '') return null;
  const raw = String(summary).trim();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { summary: parsed };
  } catch {
    return { summary: raw };
  }
}

export function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/** Prefer the active language; English is the platform default. */
export function localizedText(value: unknown, lang: 'zh' | 'en' = 'en'): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map((v) => localizedText(v, lang)).filter(Boolean).join('\n');
  }
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (typeof o[lang] === 'string') return o[lang] as string;
    if (typeof o.zh === 'string') return o.zh;
    if (typeof o.en === 'string') return o.en;
    return '';
  }
  return String(value);
}

/** Convert structured values into readable lines without exposing raw JSON. */
export function formatDisplayValue(value: unknown, lang: 'zh' | 'en' = 'en'): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => formatDisplayValue(item, lang))
      .filter(Boolean)
      .join('\n• ');
  }
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if ('zh' in o || 'en' in o) return localizedText(o, lang);
    for (const key of [
      'summary',
      'recommendation',
      'description',
      'title',
      'message',
      'reason',
      'action',
      'suggestion',
    ]) {
      const display = localizedText(o[key], lang);
      if (display) return display;
    }
    return '';
  }
  return String(value);
}
