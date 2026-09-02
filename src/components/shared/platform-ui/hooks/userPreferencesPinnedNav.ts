export type PinnedBuiltInNavAppsMap = Record<string, string[]>;

export function normalizePinnedBuiltInNavAppsMap(raw: unknown): PinnedBuiltInNavAppsMap {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const out: PinnedBuiltInNavAppsMap = {};
  for (const [spaceId, appIds] of Object.entries(raw)) {
    if (typeof spaceId !== 'string' || spaceId.trim() === '') continue;
    if (!Array.isArray(appIds)) continue;
    const normalizedIds = appIds
      .filter((id): id is string => typeof id === 'string' && id.trim() !== '')
      .map((id) => id.trim());
    if (normalizedIds.length > 0) {
      out[spaceId] = normalizedIds;
    }
  }
  return out;
}
