import { formatUserLabel } from '@genispace/shared-utils';
import { UserAvatar } from './UserAvatar';
import type { PublicUserProfile } from './userDirectoryTypes';

export type UserDisplayProps = {
  userId?: string | null;
  profile?: PublicUserProfile | null;
  showAvatar?: boolean;
  className?: string;
  emptyLabel?: string;
};

export function UserDisplay({
  userId,
  profile,
  showAvatar = false,
  className = '',
  emptyLabel = '—',
}: UserDisplayProps) {
  const label = formatUserLabel(profile, userId, emptyLabel);
  if (!showAvatar) {
    return (
      <span className={className} title={userId || undefined}>
        {label}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
      <UserAvatar
        name={profile?.name || label}
        email={profile?.email}
        avatarUrl={profile?.avatarUrl}
        sizeClassName="size-6"
      />
      <span title={userId || undefined}>{label}</span>
    </span>
  );
}
