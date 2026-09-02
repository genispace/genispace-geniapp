import type {
  SubscriptionPlan,
  UpgradePrompt,
  FeatureKey,
  ResourceType,
  SubscriptionLimits,
  ResourceRemaining,
} from './types';
import { 
  PLAN_HIERARCHY, 
  PLAN_DISPLAY_NAMES, 
  FEATURE_DISPLAY_NAMES, 
  RESOURCE_DISPLAY_NAMES 
} from './constants';

export function isPlanSufficient(
  currentPlan: SubscriptionPlan, 
  requiredPlan: SubscriptionPlan
): boolean {
  const currentIndex = PLAN_HIERARCHY.indexOf(currentPlan);
  const requiredIndex = PLAN_HIERARCHY.indexOf(requiredPlan);
  return currentIndex >= requiredIndex;
}

export function getUpgradePath(currentPlan: SubscriptionPlan): SubscriptionPlan[] {
  const currentIndex = PLAN_HIERARCHY.indexOf(currentPlan);
  if (currentIndex === -1) return PLAN_HIERARCHY.slice(1);
  return PLAN_HIERARCHY.slice(currentIndex + 1);
}

export function getNextPlan(currentPlan: SubscriptionPlan): SubscriptionPlan | null {
  const currentIndex = PLAN_HIERARCHY.indexOf(currentPlan);
  if (currentIndex === -1 || currentIndex >= PLAN_HIERARCHY.length - 1) {
    return null;
  }
  return PLAN_HIERARCHY[currentIndex + 1];
}

export function getPlanDisplayName(plan: SubscriptionPlan): string {
  return PLAN_DISPLAY_NAMES[plan] || plan;
}

export function getFeatureDisplayName(featureKey: FeatureKey): string {
  return FEATURE_DISPLAY_NAMES[featureKey] || featureKey;
}

export function getResourceDisplayName(resourceType: ResourceType): string {
  return RESOURCE_DISPLAY_NAMES[resourceType] || resourceType;
}

export function generateFeatureUpgradePrompt(
  currentPlan: SubscriptionPlan,
  featureKey: FeatureKey
): UpgradePrompt {
  const suggestedPlan = getNextPlan(currentPlan) || 'ENTERPRISE';
  const featureName = getFeatureDisplayName(featureKey);

  return {
    currentPlan,
    suggestedPlan,
    title: `Upgrade to use "${featureName}"`,
    description: `"${featureName}" requires ${getPlanDisplayName(suggestedPlan)} or higher. Upgrade to unlock this feature.`,
    blockedItem: featureKey,
  };
}

export function generateResourceUpgradePrompt(
  currentPlan: SubscriptionPlan,
  resourceType: ResourceType,
  limit: number
): UpgradePrompt {
  const suggestedPlan = getNextPlan(currentPlan) || 'ENTERPRISE';
  const resourceName = getResourceDisplayName(resourceType);

  return {
    currentPlan,
    suggestedPlan,
    title: `${resourceName} limit reached`,
    description: `Your current plan allows up to ${limit} ${resourceName}(s). Upgrade to ${getPlanDisplayName(suggestedPlan)} for a higher quota.`,
    blockedItem: resourceType,
  };
}

export function formatLimitValue(value: number): string {
  if (value === Infinity || value === Number.MAX_SAFE_INTEGER) {
    return 'Unlimited';
  }
  return value.toLocaleString();
}

export function isUnlimited(value: number): boolean {
  return value === -1 || value === Infinity || value === Number.MAX_SAFE_INTEGER || value > 999999;
}

/** Maps frontend ResourceType to plan limit field names (aligned with API RESOURCE_LIMIT_KEYS). */
export function getResourceLimitValue(
  limits: SubscriptionLimits,
  resourceType: ResourceType
): number | undefined {
  switch (resourceType) {
    case 'team':
      return limits.teamsLimit;
    case 'teamMember': {
      const extended = limits as SubscriptionLimits & { spaceMembersLimit?: number };
      return extended.teamMembersLimit ?? extended.spaceMembersLimit;
    }
    default:
      return limits[`${resourceType}Limit` as keyof SubscriptionLimits] as number | undefined;
  }
}

/** Maps frontend ResourceType to remaining usage keys (API uses spaceMember for teamMember). */
export function getResourceRemainingValue(
  remaining: ResourceRemaining,
  resourceType: ResourceType
): number | undefined {
  if (resourceType === 'teamMember') {
    const extended = remaining as ResourceRemaining & { spaceMember?: number };
    return extended.teamMember ?? extended.spaceMember;
  }
  return remaining[resourceType];
}

export function calculateUsagePercentage(current: number, limit: number): number {
  if (isUnlimited(limit)) return 0;
  if (limit === 0) return 100;
  return Math.min(100, Math.round((current / limit) * 100));
}

export function getUsageLevel(
  current: number, 
  limit: number
): 'low' | 'medium' | 'high' | 'full' {
  if (isUnlimited(limit)) return 'low';

  const percentage = calculateUsagePercentage(current, limit);

  if (percentage >= 100) return 'full';
  if (percentage >= 80) return 'high';
  if (percentage >= 50) return 'medium';
  return 'low';
}
