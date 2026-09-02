import { createContext, useContext } from 'react';

// Keep-alive tabs stay mounted when inactive (opacity 0 + pointer-events none in
// MultiPageRenderer), which does NOT hide UI portaled to document.body. Components that
// render fixed/portal overlays (e.g. the floating table empty-state badge) must gate on
// this flag so overlays from hidden tabs don't leak onto the active page.
// Defaults to true so usage outside the tab host behaves as before.
const TabActivityContext = createContext(true);

export const TabActivityProvider = TabActivityContext.Provider;

export function useTabActivity(): boolean {
  return useContext(TabActivityContext);
}
