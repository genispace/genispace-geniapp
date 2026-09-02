import { ReactNode, useContext, useMemo } from 'react';
import { 
  SubscriptionProvider as BaseSubscriptionProvider,
  createSubscriptionService,
  type SubscriptionContext,
} from '@genispace/shared-ui';
import apiClient from '@/lib/api/apiClient';
import { getSpaceId } from '@genispace/shared-utils';
import { UserContext } from '@/app/context/UserContext';

const subscriptionService = createSubscriptionService(apiClient);

async function fetchSubscriptionContext(spaceId?: string): Promise<SubscriptionContext> {
  const effectiveTeamId = spaceId || getSpaceId() || undefined;
  return subscriptionService.getSubscriptionContext(effectiveTeamId);
}

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const userContext = useContext(UserContext);
  const spaceId = useMemo(() => getSpaceId() || undefined, []);
  const isLoggedIn = userContext?.user?.isLoggedIn || false;

  return (
    <BaseSubscriptionProvider
      fetchSubscriptionContext={fetchSubscriptionContext}
      spaceId={spaceId}
      isLoggedIn={isLoggedIn}
    >
      {children}
    </BaseSubscriptionProvider>
  );
}

export { 
  useSubscription, 
  useSubscriptionContext,
  SubscriptionGuard,
  ResourceLimitGuard,
  FeatureFlag,
  PlanRequired,
} from '@genispace/shared-ui';

export { subscriptionService };
