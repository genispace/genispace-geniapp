export const ROUTE_NEW_PLACEHOLDER = 'new';

export function isRouteNewPlaceholder(id?: string | null): boolean {
  return !id?.trim() || id === ROUTE_NEW_PLACEHOLDER;
}

export function isRouteEditMode(id?: string | null): boolean {
  return !isRouteNewPlaceholder(id);
}

/** For transaction saves: generate a client-side UUID when route id is invalid. */
export function resolveDraftEntityId(id?: string | null): string {
  const trimmed = id?.trim();
  if (!trimmed || trimmed === ROUTE_NEW_PLACEHOLDER) return crypto.randomUUID();
  return trimmed;
}
