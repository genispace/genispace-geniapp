import { createContext, useContext } from 'react';

/**
 * True when the surrounding grid-24 cell imposes an EXACT height on the
 * component (fill-mode view cells, every edit-canvas cell, page fullscreen).
 * Renderers with inline px sizing (ECharts and friends) consume this to switch
 * to a flexible 100%-height layout instead of their fixed px prop — CSS child
 * stretching cannot reach inline style heights.
 */
const Grid24FillCellContext = createContext(false);

export const Grid24FillCellProvider = Grid24FillCellContext.Provider;

export const useGrid24FillCell = () => useContext(Grid24FillCellContext);
