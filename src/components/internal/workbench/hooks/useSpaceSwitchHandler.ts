import { useEffect, useCallback } from 'react';

interface UseSpaceSwitchHandlerOptions {

  onSpaceSwitch?: () => void;

  enabled?: boolean;
}

export const useSpaceSwitchHandler = (options: UseSpaceSwitchHandlerOptions = {}) => {
  const {
    onSpaceSwitch,
    enabled = true
  } = options;

  const handleSpaceSwitch = useCallback((event: CustomEvent) => {
    if (!enabled) return;

    if (onSpaceSwitch) {
      onSpaceSwitch();
    }
  }, [onSpaceSwitch, enabled]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('spaceSwitched', handleSpaceSwitch as EventListener);

    return () => {
      window.removeEventListener('spaceSwitched', handleSpaceSwitch as EventListener);
    };
  }, [handleSpaceSwitch, enabled]);
};

export const useSpaceSwitchRefresh = (refetchFn?: () => void) => {
  useSpaceSwitchHandler({
    onSpaceSwitch: refetchFn,
    enabled: !!refetchFn
  });
};

export default useSpaceSwitchHandler;
