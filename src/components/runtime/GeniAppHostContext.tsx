import { createContext, useContext, useMemo, type ReactNode } from 'react';

export interface GeniAppHostContextValue {
  /**
   * The raw `applicationId` prop handed to GeniAppComponentProvider by the host.
   * Export hosts pass the application IDENTIFIER (e.g. "my-app"), platform hosts
   * may pass the application instance UUID — consumers must distinguish.
   */
  applicationId?: string;
}

const EMPTY_HOST: GeniAppHostContextValue = {};

const GeniAppHostContext = createContext<GeniAppHostContextValue | undefined>(undefined);

export function GeniAppHostProvider({
  applicationId,
  children,
}: {
  applicationId?: string;
  children: ReactNode;
}) {
  const value = useMemo<GeniAppHostContextValue>(() => ({ applicationId }), [applicationId]);
  return <GeniAppHostContext.Provider value={value}>{children}</GeniAppHostContext.Provider>;
}

/** Host identity for the current GeniApp runtime tree (empty outside a provider). */
export function useGeniAppHost(): GeniAppHostContextValue {
  return useContext(GeniAppHostContext) ?? EMPTY_HOST;
}
