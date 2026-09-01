import type { ReactNode } from 'react';
import { Toaster, TooltipProvider } from '@genispace/geniapp/kit';

/** Mount once at GeniApp root (enables kit toast, tooltips). */
export function AppUiProviders({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      {children}
      <Toaster />
    </TooltipProvider>
  );
}
