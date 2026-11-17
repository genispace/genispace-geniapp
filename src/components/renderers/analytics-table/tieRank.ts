// Tie-aware ranking ("1224" skip style) for AnalyticsTable (task #289, req-1109 #25追加).
// Rows sharing the same `valueField` value tie at one rank R; the next distinct value ranks R+N
// (N = size of the tied group). Within a tied group every row gets a stable sub-rank numbered by
// the fixed secondary key (`subKeyField` ascending, then `nameField`) — precomputed over the FULL
// row set so it never changes with the table's client-side sort.
//
// Pure + dependency-free so the workbench copy can be synced verbatim (parity check strips imports).

export interface TieRankConfig {
  /** Numeric field rows are ranked by, descending (e.g. 'sales_amt_cny'). */
  valueField: string;
  /** Fixed secondary key numbering ties inside a group, ascending (e.g. 'store_code'). */
  subKeyField?: string;
  /** Tertiary tie-breaker inside a group (e.g. the row label field). */
  nameField?: string;
}

export interface TieRankInfo {
  /** Shared rank of the row's tie group (1-based, "1224" skip numbering). */
  rank: number;
  /** Size of the tie group (1 = no tie). */
  tieCount: number;
  /** Position inside the tie group (1-based), numbered by the fixed secondary key. */
  subRank: number;
}

const num = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : NaN;
};

const collatorCompare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Compute tie-aware ranks for every row. Returns a Map keyed by row object identity so callers
 * can look rows up after client-side sorting without re-deriving anything.
 *
 * Rows with a non-numeric value rank after all numeric rows and tie together (deterministic),
 * matching the table's existing NaN → -Infinity sort convention.
 */
export const computeTieRanks = (
  rows: Record<string, unknown>[],
  cfg: TieRankConfig,
): Map<Record<string, unknown>, TieRankInfo> => {
  const out = new Map<Record<string, unknown>, TieRankInfo>();
  if (!cfg.valueField || rows.length === 0) return out;

  // Order by value desc (NaN last), stably, to find the distinct-value groups.
  const ordered = rows.slice().sort((a, b) => {
    const av = num(a[cfg.valueField]);
    const bv = num(b[cfg.valueField]);
    const an = Number.isFinite(av) ? av : -Infinity;
    const bn = Number.isFinite(bv) ? bv : -Infinity;
    return bn - an;
  });

  interface Group {
    value: number;
    members: Record<string, unknown>[];
    start: number; // rows before this group → rank = start + 1
  }
  const groups: Group[] = [];
  for (const r of ordered) {
    const v = num(r[cfg.valueField]);
    const key = Number.isFinite(v) ? v : -Infinity;
    const last = groups[groups.length - 1];
    if (last && last.value === key) {
      last.members.push(r);
    } else {
      const start = groups.reduce((s, g) => s + g.members.length, 0);
      groups.push({ value: key, members: [r], start });
    }
  }

  for (const g of groups) {
    const rank = g.start + 1;
    // Sub-rank inside the group: fixed secondary key asc, then name, then a stable fallback to the
    // value-desc order so equal secondary keys still number deterministically.
    const members = g.members.slice().sort((a, b) => {
      if (cfg.subKeyField) {
        const c = collatorCompare(String(a[cfg.subKeyField] ?? ''), String(b[cfg.subKeyField] ?? ''));
        if (c !== 0) return c;
      }
      if (cfg.nameField) {
        const c = collatorCompare(String(a[cfg.nameField] ?? ''), String(b[cfg.nameField] ?? ''));
        if (c !== 0) return c;
      }
      return g.members.indexOf(a) - g.members.indexOf(b);
    });
    members.forEach((r, i) => out.set(r, { rank, tieCount: g.members.length, subRank: i + 1 }));
  }
  return out;
};
