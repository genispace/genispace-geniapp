import * as React from 'react';
import { cn } from '@genispace/geniapp/utils';

/** Classic bank building glyph. Path from Material Design Icons (bank), Apache-2.0. */
const BANK_GLYPH =
  'M11.5 1L2 6v2h19V6m-5 4v7h3v-7M2 22h19v-3H2m8-9v7h3v-7m-9 0v7h3v-7z';

export function BankTransferMark({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn('shrink-0', className)}
      {...props}
    >
      <path fill="#475569" d={BANK_GLYPH} />
    </svg>
  );
}
