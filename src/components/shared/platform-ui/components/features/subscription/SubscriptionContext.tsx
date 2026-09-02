import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { 
  SubscriptionContext as SubscriptionContextType,
  SubscriptionPlan,
  FeatureKey,
  ResourceType,
  UpgradePrompt,
} from './types';
import { DEFAULT_SUBSCRIPTION_CONTEXT } from './constants';
import { 
  isPlanSufficient,
  generateFeatureUpgradePrompt,
  generateResourceUpgradePrompt,
  isUnlimited,
  getResourceLimitValue,
  getResourceRemainingValue,
} from './utils';

interface SubscriptionContextValue {

  context: SubscriptionContextType;

  isLoading: boolean;

  error: Error | null;

  isStandalone: boolean;

  canAccess: (featureKey: FeatureKey) => boolean;

  hasPlan: (requiredPlan: SubscriptionPlan) => boolean;

  checkLimit: (resourceType: ResourceType, currentCount?: number) => boolean;

  getFeatureUpgradePrompt: (featureKey: FeatureKey) => UpgradePrompt | null;

  getResourceUpgradePrompt: (resourceType: ResourceType) => UpgradePrompt | null;

  refresh: () => Promise<void>;
}

const SubscriptionContextInstance = createContext<SubscriptionContextValue | null>(null);

// ================ Provider Props ================

interface SubscriptionProviderProps {
  children: ReactNode;

  fetchSubscriptionContext: (spaceId?: string) => Promise<SubscriptionContextType>;

  spaceId?: string;

  initialData?: SubscriptionContextType;

  isLoggedIn?: boolean;
}

export function SubscriptionProvider({
  children,
  fetchSubscriptionContext,
  spaceId,
  initialData,
  isLoggedIn = true,
}: SubscriptionProviderProps) {
  const [context, setContext] = useState<SubscriptionContextType>(
    initialData || DEFAULT_SUBSCRIPTION_CONTEXT
  );
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<Error | null>(null);

  const loadSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchSubscriptionContext(spaceId);
      setContext(data);
    } catch (err) {
      console.error('Failed to load subscription:', err);
      setError(err instanceof Error ? err : new Error('Failed to load subscription'));

      setContext(DEFAULT_SUBSCRIPTION_CONTEXT);
    } finally {
      setIsLoading(false);
    }
  }, [fetchSubscriptionContext, spaceId]);

  useEffect(() => {
    if (!initialData && isLoggedIn) {
      loadSubscription();
    }
    if (!isLoggedIn) {
      setContext(DEFAULT_SUBSCRIPTION_CONTEXT);
      setIsLoading(false);
    }
  }, [loadSubscription, initialData, isLoggedIn]);

  useEffect(() => {
    if (spaceId && !initialData && isLoggedIn) {
      loadSubscription();
    }
  }, [spaceId, loadSubscription, initialData, isLoggedIn]);

  const isStandalone = context.subscription.isStandalone;

  const canAccess = useCallback((featureKey: FeatureKey): boolean => {

    if (isStandalone) return true;
    return context.features[featureKey] === true;
  }, [context, isStandalone]);

  const hasPlan = useCallback((requiredPlan: SubscriptionPlan): boolean => {

    if (isStandalone) return true;
    return isPlanSufficient(context.subscription.plan, requiredPlan);
  }, [context, isStandalone]);

  const checkLimit = useCallback((resourceType: ResourceType, currentCount?: number): boolean => {

    if (isStandalone) return true;

    const remaining = getResourceRemainingValue(context.remaining, resourceType);
    const limit = getResourceLimitValue(context.limits, resourceType);

    if (limit != null && isUnlimited(limit)) return true;
    if (remaining != null && isUnlimited(remaining)) return true;

    if (currentCount !== undefined && limit != null) {
      return currentCount < limit;
    }
    return (remaining ?? 0) > 0;
  }, [context, isStandalone]);

  const getFeatureUpgradePrompt = useCallback((featureKey: FeatureKey): UpgradePrompt | null => {
    if (isStandalone || canAccess(featureKey)) return null;
    return generateFeatureUpgradePrompt(context.subscription.plan, featureKey);
  }, [context, canAccess, isStandalone]);

  const getResourceUpgradePrompt = useCallback((resourceType: ResourceType): UpgradePrompt | null => {
    if (isStandalone || checkLimit(resourceType)) return null;
    const limit = getResourceLimitValue(context.limits, resourceType) ?? 0;
    return generateResourceUpgradePrompt(context.subscription.plan, resourceType, limit);
  }, [context, checkLimit, isStandalone]);

  const refresh = useCallback(async () => {
    await loadSubscription();
  }, [loadSubscription]);

  const value = useMemo<SubscriptionContextValue>(() => ({
    context,
    isLoading,
    error,
    isStandalone,
    canAccess,
    hasPlan,
    checkLimit,
    getFeatureUpgradePrompt,
    getResourceUpgradePrompt,
    refresh,
  }), [
    context,
    isLoading,
    error,
    isStandalone,
    canAccess,
    hasPlan,
    checkLimit,
    getFeatureUpgradePrompt,
    getResourceUpgradePrompt,
    refresh,
  ]);

  return (
    <SubscriptionContextInstance.Provider value={value}>
      {children}
    </SubscriptionContextInstance.Provider>
  );
}

// ================ Hook ================

export function useSubscriptionContext(): SubscriptionContextValue {
  const context = useContext(SubscriptionContextInstance);
  if (!context) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
}

export { SubscriptionContextInstance };
