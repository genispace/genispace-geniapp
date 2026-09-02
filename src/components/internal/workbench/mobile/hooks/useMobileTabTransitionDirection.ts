import { useSyncExternalStore } from 'react';
import {
  getMobileTabTransitionDirection,
  subscribeMobileTabTransition,
} from '@/mobile/utils/mobileNavigationStore';

export function useMobileTabTransitionDirection(): -1 | 0 | 1 {
  return useSyncExternalStore(
    subscribeMobileTabTransition,
    getMobileTabTransitionDirection,
    () => 0
  );
}
