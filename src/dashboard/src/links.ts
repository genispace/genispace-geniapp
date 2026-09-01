/** Build a `path?key=value` link-to-data URL, skipping null/empty params. */
export function buildDataLink(path: string, params: Record<string, string | number | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s === '') continue;
    sp.set(k, s);
  }
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}
