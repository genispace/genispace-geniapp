import { cn } from '@genispace/shared-utils';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';

const CJK_UNIFIED_RE = /[\u4e00-\u9fff]/;

export function userInitials(name: string, email?: string): string {
  const n = (name || '').trim();
  const e = (email || '').trim();
  const primary = n || e;
  if (!primary) return '?';

  const cjkSource =
    n && CJK_UNIFIED_RE.test(n) ? n : e && CJK_UNIFIED_RE.test(e) ? e : '';
  if (cjkSource) {
    return Array.from(cjkSource.trim()).slice(0, 2).join('');
  }

  const parts = primary.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0].slice(0, 1) + parts[1].slice(0, 1)).toUpperCase();
  }
  return primary.slice(0, 2).toUpperCase();
}

export function resolveAvatarUrl(u: { avatarUrl?: string | null; avatar?: string | null }): string | null {
  const v = u.avatarUrl ?? u.avatar;
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

export type UserAvatarVariant = 'default' | 'chatUser';

export interface UserAvatarProps {
  name: string;
  email?: string;
  avatarUrl?: string | null;
  /** Tailwind size classes, e.g. size-5, size-6, size-20 */
  sizeClassName?: string;
  className?: string;
  variant?: UserAvatarVariant;

  shape?: 'circle' | 'rounded';
}

export function UserAvatar({
  name,
  email,
  avatarUrl,
  sizeClassName = 'size-6',
  className,
  variant = 'default',
  shape = 'circle',
}: UserAvatarProps) {
  const url = avatarUrl != null ? String(avatarUrl).trim() : '';
  const hasUrl = Boolean(url);
  const round = shape === 'rounded' ? 'rounded-lg' : 'rounded-full';

  return (
    <Avatar
      className={cn(
        'shrink-0 overflow-hidden',
        round,
        variant === 'default' && 'border border-border/50',
        variant === 'chatUser' &&
          'ring-1 ring-border/50 bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-semibold',
        sizeClassName,
        className,
      )}
    >
      {hasUrl ? (
        <AvatarImage src={url} alt="" className="object-cover" />
      ) : null}
      <AvatarFallback
        className={cn(
          round,
          'text-xs font-medium',
          variant === 'default' && 'bg-accent/10',
          variant === 'chatUser' && 'bg-transparent text-white font-semibold',
        )}
      >
        {userInitials(name, email)}
      </AvatarFallback>
    </Avatar>
  );
}
