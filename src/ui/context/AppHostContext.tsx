import { createContext, useContext, type ReactNode } from 'react';

/**
 * Optional context for GeniApps in non-iframe test harnesses. Iframe apps receive session/token
 * and platform API host via `GENISPACE_SHELL_INIT` from the Shell (`API_BASE_URL`).
 */
export type AppHostContextValue = {
  identifier: string | null;
  pinnedVersion: string | null;
};

const defaultValue: AppHostContextValue = {
  identifier: null,
  pinnedVersion: null,
};

export const AppHostContext = createContext<AppHostContextValue>(defaultValue);

export function AppHostProvider({
  value,
  children,
}: {
  value: AppHostContextValue;
  children: ReactNode;
}) {
  return <AppHostContext.Provider value={value}>{children}</AppHostContext.Provider>;
}

export function useAppHost(): AppHostContextValue {
  return useContext(AppHostContext);
}
