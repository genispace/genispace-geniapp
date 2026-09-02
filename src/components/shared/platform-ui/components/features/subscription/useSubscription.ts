import { useSubscriptionContext } from './SubscriptionContext';
import type { 
  SubscriptionInfo,
  SubscriptionLimits,
  SubscriptionFeatures,
  ResourceUsage,
  ResourceRemaining,
  FeatureKey,
  ResourceType,
  SubscriptionPlan,
  UpgradePrompt,
  SubscriptionDisplay,
} from './types';

export interface UseSubscriptionReturn {

  subscription: SubscriptionInfo;

  limits: SubscriptionLimits;

  features: SubscriptionFeatures;

  usage: ResourceUsage;

  remaining: ResourceRemaining;

  display?: SubscriptionDisplay;

  isLoading: boolean;

  isStandalone: boolean;

  error: Error | null;

  canAccess: (featureKey: FeatureKey) => boolean;

  hasPlan: (requiredPlan: SubscriptionPlan) => boolean;

  checkLimit: (resourceType: ResourceType, currentCount?: number) => boolean;

  getFeatureUpgradePrompt: (featureKey: FeatureKey) => UpgradePrompt | null;

  getResourceUpgradePrompt: (resourceType: ResourceType) => UpgradePrompt | null;

  refresh: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const {
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
  } = useSubscriptionContext();

  return {

    subscription: context.subscription,
    limits: context.limits,
    features: context.features,
    usage: context.usage,
    remaining: context.remaining,
    display: context.display,

    isLoading,
    isStandalone,
    error,

    canAccess,
    hasPlan,
    checkLimit,
    getFeatureUpgradePrompt,
    getResourceUpgradePrompt,

    refresh,
  };
}
