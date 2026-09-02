import { WatermarkOverlay } from './WatermarkOverlay';

export interface AppWatermarkProps {
  enabled?: boolean;
  text?: string | null;
}

/** Renders a non-interactive diagonal watermark when enabled and text is present. */
export function AppWatermark({ enabled = false, text }: AppWatermarkProps) {
  if (!enabled || !text) return null;
  return <WatermarkOverlay text={text} />;
}

export { WatermarkOverlay, type WatermarkOverlayProps } from './WatermarkOverlay';
