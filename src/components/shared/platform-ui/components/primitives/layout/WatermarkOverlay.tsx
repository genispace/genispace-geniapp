import { useMemo } from 'react';
import { cn } from '@genispace/shared-utils';

const ROTATE_DEG = -25;
const TILE_WIDTH = 300;
const TILE_HEIGHT = 160;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildWatermarkPattern(text: string): string {
  const safe = escapeXml(text);
  const cx = TILE_WIDTH / 2;
  const cy = TILE_HEIGHT / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_WIDTH}" height="${TILE_HEIGHT}" viewBox="0 0 ${TILE_WIDTH} ${TILE_HEIGHT}">
  <text x="${cx}" y="${cy}" fill="rgba(115,115,115,0.18)" font-size="14" font-weight="500" font-family="system-ui,-apple-system,sans-serif" text-anchor="middle" dominant-baseline="middle" transform="rotate(${ROTATE_DEG} ${cx} ${cy})">${safe}</text>
</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export interface WatermarkOverlayProps {
  text: string;
  className?: string;
}

/**
 * Non-interactive diagonal watermark. Uses a repeating SVG background (no DOM grid)
 * and sits above content with pointer-events-none so clicks/drag pass through.
 */
export function WatermarkOverlay({ text, className }: WatermarkOverlayProps) {
  const backgroundImage = useMemo(() => buildWatermarkPattern(text), [text]);

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-[1] overflow-hidden select-none',
        className,
      )}
      aria-hidden
      style={{
        backgroundImage,
        backgroundRepeat: 'repeat',
        backgroundSize: `${TILE_WIDTH}px ${TILE_HEIGHT}px`,
      }}
    />
  );
}
