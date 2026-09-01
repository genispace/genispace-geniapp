import type { PublicUserProfile } from './userDirectoryTypes';
import { formatUserLabel } from '@genispace/geniapp/utils';

export type UserSelectProps = {
  value: string;
  onChange: (userId: string) => void;
  members: PublicUserProfile[];
  allowEmpty?: boolean;
  emptyLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
};

const defaultSelectClass =
  'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-50 disabled:cursor-not-allowed disabled:opacity-50';

export function UserSelect({
  value,
  onChange,
  members,
  allowEmpty = true,
  emptyLabel = '—',
  placeholder,
  disabled = false,
  className,
  id,
}: UserSelectProps) {
  return (
    <select
      id={id}
      className={className ?? defaultSelectClass}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {allowEmpty ? (
        <option value="">{placeholder ?? emptyLabel}</option>
      ) : null}
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {formatUserLabel(m)}
        </option>
      ))}
    </select>
  );
}
