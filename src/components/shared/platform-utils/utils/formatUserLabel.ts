export type UserLabelSource = {
  name?: string | null;
  email?: string | null;
};

/**
 * Display label for a platform user: name, then email, then shortened id.
 */
export function formatUserLabel(
  profile?: UserLabelSource | null,
  userId?: string | null,
  emptyLabel = '—'
): string {
  const name = profile?.name?.trim();
  if (name) return name;
  const email = profile?.email?.trim();
  if (email) return email;
  const id = userId?.trim();
  if (id) {
    if (id.length <= 12) return id;
    return `${id.slice(0, 8)}…`;
  }
  return emptyLabel;
}
