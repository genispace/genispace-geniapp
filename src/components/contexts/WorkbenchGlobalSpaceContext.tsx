import React, { createContext, useContext, type ReactNode } from 'react';
import { useSpace } from '@genispace/shared-ui';

type WorkbenchGlobalSpaceContextValue = ReturnType<typeof useSpace>;

const WorkbenchGlobalSpaceContext =
  createContext<WorkbenchGlobalSpaceContextValue | null>(null);

export function WorkbenchGlobalSpaceProvider({ children }: { children: ReactNode }) {
  const space = useSpace();
  return (
    <WorkbenchGlobalSpaceContext.Provider value={space}>
      {children}
    </WorkbenchGlobalSpaceContext.Provider>
  );
}

export function useWorkbenchGlobalSpace(): WorkbenchGlobalSpaceContextValue {
  const context = useContext(WorkbenchGlobalSpaceContext);
  if (!context) {
    throw new Error('useWorkbenchGlobalSpace must be used within WorkbenchGlobalSpaceProvider');
  }
  return context;
}

export function useWorkbenchGlobalSpaceOptional(): WorkbenchGlobalSpaceContextValue | null {
  return useContext(WorkbenchGlobalSpaceContext);
}
