import { useViewport } from '@/contexts/ViewportContext';
import { isWeComEnvironment } from '@/mobile/utils/wecomDetector';
import type { ViewportSource } from '@/mobile/utils/getMobileViewportState';

interface UseMobileViewportOptions {
  wecom?: boolean;
  debug?: boolean;
}

interface UseMobileViewportReturn {
  mode: 'mobile' | 'desktop';
  isMobile: boolean;
  canReturnToDesktop: boolean;
  viewportSource: ViewportSource;
  isWeCom: boolean;
  forceMobile: () => void;
  forceDesktop: () => void;
  reset: () => void;
}

export function useMobileViewport(
  options?: UseMobileViewportOptions
): UseMobileViewportReturn {
  const viewport = useViewport();

  if (options?.wecom && !isWeComEnvironment()) {
    console.warn(
      '[useMobileViewport] Not in WeCom environment, wecom option ignored'
    );
  }

  return viewport;
}
