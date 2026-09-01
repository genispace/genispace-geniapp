import { useEffect, useState } from 'react';
import { cn } from '@genispace/geniapp/utils';
import {
  agentIdentitySizeClass,
  getAgentIdentityInitials,
  getAgentIdentityTone,
  type AgentIdentitySize,
} from './agentIdentityUtils';

export interface AgentIdentityProps {
  name: string;
  /** When set, prefer this image; fall back to initials on missing/failed load. */
  avatarUrl?: string | null;
  size?: AgentIdentitySize;
  className?: string;
}

export function AgentIdentity({ name, avatarUrl, size = 'md', className }: AgentIdentityProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  const showImage = Boolean(avatarUrl) && !imageFailed;

  if (showImage) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full border border-border bg-muted',
          agentIdentitySizeClass[size],
          className
        )}
      >
        <img
          src={avatarUrl!}
          alt=""
          className="size-full object-cover"
          onError={() => setImageFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full border font-semibold leading-none',
        agentIdentitySizeClass[size],
        getAgentIdentityTone(name),
        className
      )}
    >
      {getAgentIdentityInitials(name)}
    </span>
  );
}
