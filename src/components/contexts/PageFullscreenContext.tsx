import React, { createContext, useContext } from 'react';

const PageFullscreenContext = createContext(false);

export const PageFullscreenProvider = PageFullscreenContext.Provider;

export function usePageFullscreen(): boolean {
  return useContext(PageFullscreenContext);
}
