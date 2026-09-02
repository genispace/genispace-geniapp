import type { PropsWithChildren, ReactNode } from 'react';

export function ComponentEditOverlay({ children }: PropsWithChildren<Record<string, unknown>>): ReactNode {
  return children;
}
