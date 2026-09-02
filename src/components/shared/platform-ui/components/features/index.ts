// Features - Business domain components organized by feature
// These components contain specific business logic for their respective domains

// Export features as namespaces for better organization
export * as Task from './task';
export * as Agent from './agent';
export * as Chat from './chat';
export * as Application from './auth/application';
export * as Operator from './operator';
export * as Data from './data';
export * as Team from './team';
export * as Space from './space';
export * as Rbac from './rbac';
export * as Auth from './auth';
export * as Subscription from './subscription';
export * as Knowledge from './knowledge';

// Direct exports for commonly used components
export * from './space';
/** @deprecated Import from `./space` or `Team` namespace */
export {
  TeamContext,
  TeamProvider,
  useTeam,
  TeamSwitcher,
  type TeamMember,
  type TeamOwner,
  type TeamApiClient,
  type TeamProviderProps,
  getTeamIconType,
  getTeamIconStyle,
} from './team';
export * from './notification';
export * from './feedback';
export * from './knowledge';

// Subscription exports (explicit to avoid conflict with team's SubscriptionPlan)
export {
  // Types
  type SubscriptionPlan,
  type SubscriptionSource,
  type SubscriptionInfo,
  type SubscriptionLimits,
  type ResourceUsage,
  type ResourceRemaining,
  type SubscriptionFeatures,
  type FeatureKey,
  type SubscriptionContext,
  type SubscriptionContextResponse,
  type SubscriptionLimitsResponse,
  type SubscriptionFeaturesResponse,
  type ResourceLimitCheckResponse,
  type FeatureCheckResponse,
  type UpgradePrompt,
  type ResourceType,
  type PlanDetails,
  type AllPlansDetails,
  type ApiClientInterface,
  type SubscriptionService,
  type UseSubscriptionReturn,
  // Constants
  PLAN_HIERARCHY,
  PLAN_DISPLAY_NAMES,
  FEATURE_DISPLAY_NAMES,
  RESOURCE_DISPLAY_NAMES,
  FEATURE_KEYS,
  RESOURCE_TYPES,
  DEFAULT_SUBSCRIPTION_CONTEXT,
  STANDALONE_SUBSCRIPTION_CONTEXT,
  // Utils
  isPlanSufficient,
  getUpgradePath,
  getNextPlan,
  getPlanDisplayName,
  getFeatureDisplayName,
  getResourceDisplayName,
  generateFeatureUpgradePrompt,
  generateResourceUpgradePrompt,
  formatLimitValue,
  isUnlimited,
  calculateUsagePercentage,
  getUsageLevel,
  // Context and Hooks
  SubscriptionProvider,
  useSubscriptionContext,
  SubscriptionContextInstance,
  useSubscription,
  // Components
  SubscriptionGuard,
  ResourceLimitGuard,
  FeatureFlag,
  PlanRequired,
  // Service factory
  createSubscriptionService,
} from './subscription';

// Home feature components (direct export, not namespace)
export * from './home';
export * from './avatar';
export {
  AgentIdentity,
  agentIdentitySizeClass,
  getAgentIdentityInitials,
  getAgentIdentityTone,
  type AgentIdentityProps,
  type AgentIdentitySize,
} from './agent';
