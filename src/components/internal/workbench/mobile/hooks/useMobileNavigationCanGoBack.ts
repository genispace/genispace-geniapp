import { useEffect, useState } from 'react';
import {
  getMobileNavigationCanGoBack,
  subscribeMobileNavigation,
} from '@/mobile/utils/mobileNavigationStore';

export function useMobileNavigationCanGoBack(): boolean {
  const [canGoBack, setCanGoBack] = useState(getMobileNavigationCanGoBack());

  useEffect(() => {
    return subscribeMobileNavigation(() => {
      setCanGoBack(getMobileNavigationCanGoBack());
    });
  }, []);

  return canGoBack;
}
