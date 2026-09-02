import type { CSSProperties } from 'react';

export interface FormHeightConfig {
  height?: number;
  heightMode?: 'auto' | 'fixed' | 'fullscreen';
}

/**
 * Resolves the form's outer height from exactly one owner.
 *
 * Grid24 owns height through rowSpan and always wins while the form is inside
 * an imposed cell. Standalone forms retain their explicit fixed/fullscreen
 * behavior for backward compatibility.
 */
export function resolveFormContainerStyle(
  config: FormHeightConfig,
  fillCell: boolean,
  formTopOffset: number
): CSSProperties {
  if (fillCell) return { height: '100%' };

  switch (config.heightMode || 'auto') {
    case 'fixed':
      return { height: config.height ? `${config.height}px` : 'auto' };
    case 'fullscreen':
      return {
        height: formTopOffset > 0 ? `calc(100vh - ${formTopOffset}px)` : '100vh',
        minHeight: '300px',
      };
    case 'auto':
    default:
      return { height: 'auto' };
  }
}
