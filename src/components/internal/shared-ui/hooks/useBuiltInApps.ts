import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BUILT_IN_APPS_QUERY_KEY,
  fetchBuiltInApps,
  type BuiltInAppsApiClient,
} from './builtInApps';

/**
 * Cached list of enabled built-in GeniApps (invalidates on `spaceSwitched`).
 */
export function useBuiltInApps(apiClient: BuiltInAppsApiClient) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const onSpaceSwitched = () => {
      void queryClient.invalidateQueries({ queryKey: BUILT_IN_APPS_QUERY_KEY });
    };
    window.addEventListener('spaceSwitched', onSpaceSwitched as EventListener);
    return () => window.removeEventListener('spaceSwitched', onSpaceSwitched as EventListener);
  }, [queryClient]);

  return useQuery({
    queryKey: BUILT_IN_APPS_QUERY_KEY,
    queryFn: () => fetchBuiltInApps(apiClient),
    staleTime: 60_000,
  });
}
