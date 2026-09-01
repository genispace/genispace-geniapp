/**
 * Kit/AI Message — adapted from shadcn.io/ai `message` (Vercel AI Elements
 * style). User/assistant bubbles via group markers.
 * Adaptations: decoupled from the Vercel AI SDK (`UIMessage`/`FileUIPart`
 * types replaced with a local role union); branching/attachment/actions
 * sub-components omitted (not used by GeniSpace panels yet).
 */
import type { HTMLAttributes } from 'react';
import { cn } from '@genispace/geniapp/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';

export type AiMessageRole = 'user' | 'assistant' | 'system';

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: AiMessageRole;
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      'group flex w-full min-w-0 max-w-[95%] flex-col gap-2',
      from === 'user' ? 'is-user ml-auto justify-end' : 'is-assistant',
      className
    )}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({ children, className, ...props }: MessageContentProps) => (
  <div
    className={cn(
      'flex w-fit min-w-0 max-w-full flex-col gap-2 overflow-hidden break-words text-sm',
      'group-[.is-user]:ml-auto group-[.is-user]:rounded-lg group-[.is-user]:bg-primary group-[.is-user]:px-3 group-[.is-user]:py-2 group-[.is-user]:text-primary-foreground',
      'group-[.is-assistant]:text-foreground',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export type MessageAvatarProps = HTMLAttributes<HTMLDivElement> & {
  src?: string;
  name?: string;
};

export const MessageAvatar = ({ src, name, className, ...props }: MessageAvatarProps) => (
  <div className={cn('ring-border size-8 rounded-full ring-1', className)} {...props}>
    <Avatar className="size-full">
      {src ? <AvatarImage alt="" src={src} /> : null}
      <AvatarFallback className="text-xs">{(name || '?').slice(0, 2)}</AvatarFallback>
    </Avatar>
  </div>
);
