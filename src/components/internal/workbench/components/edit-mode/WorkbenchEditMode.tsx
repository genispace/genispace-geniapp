import type { PropsWithChildren, ReactNode } from 'react';

export function WorkbenchEditMode({ children }: PropsWithChildren<Record<string, unknown>>): ReactNode {
  return children;
}
