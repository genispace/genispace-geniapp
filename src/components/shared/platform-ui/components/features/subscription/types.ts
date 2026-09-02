export type SubscriptionPlan = 'FREE' | 'PERSONAL' | 'TEAM' | 'ENTERPRISE';

export type SubscriptionSource = 'PERSONAL' | 'TEAM' | 'DEFAULT' | 'STANDALONE';

export interface SubscriptionInfo {

  plan: SubscriptionPlan;

  expiry: string | null;

  isActive: boolean;

  source: SubscriptionSource;

  isStandalone: boolean;

  spaceId?: string;
  spaceName?: string;
}

export interface SubscriptionLimits {

  teamsLimit: number;

  teamMembersLimit: number;

  canCreateCollaborativeTeams?: boolean;

  canInviteMembers?: boolean;

  agentLimit: number;

  taskLimit: number;

  knowledgeBaseLimit: number;

  datasetLimit: number;

  maxFileSize: number;

  quotasPerMonth?: number;

  quotasCarryOver?: boolean;

  quotasCarryOverMaxMonths?: number;

  vectorStorageGB?: number;

  fileStorageGB?: number;

  apiRequestsPerMonth: number;

  maxConcurrentTasks: number;
}

export interface ResourceUsage {

  agent: number;

  task: number;

  knowledgeBase: number;

  dataset: number;

  team: number;

  teamMember: number;
}

export interface ResourceRemaining {

  agent: number;

  task: number;

  knowledgeBase: number;

  dataset: number;

  team: number;

  teamMember: number;
}

export interface SubscriptionFeatures {

  advancedModels: boolean;

  customOperators: boolean;

  apiAccess: boolean;

  auditLogs: boolean;

  sso: boolean;

  prioritySupport: boolean;

  scheduledTasks: boolean;

  webhooks: boolean;

  dataExport: boolean;

  teamCollaboration: boolean;

  advancedAnalytics: boolean;

  customIntegrations?: boolean;

  slaGuarantee?: boolean;

  rbacControl?: boolean;
}

export type FeatureKey = keyof SubscriptionFeatures;

export interface TokenBalance {

  total: number;

  subscription: number;

  recharged: number;

  expiresAt?: string | null;
}

export interface DisplayLimit {
  key: string;
  label: string;
  value: string;
  rawValue: number;
}

export interface SubscriptionDisplay {

  planName: string;

  features: string[];

  limits: DisplayLimit[];
}

export interface SubscriptionContext {

  subscription: SubscriptionInfo;

  limits: SubscriptionLimits;

  features: SubscriptionFeatures;

  usage: ResourceUsage;

  remaining: ResourceRemaining;

  tokenBalance?: TokenBalance;

  display?: SubscriptionDisplay;
}

export interface SubscriptionContextResponse {
  success: boolean;
  data: SubscriptionContext;
}

export interface SubscriptionLimitsResponse {
  success: boolean;
  data: {
    limits: SubscriptionLimits;
    usage: ResourceUsage;
    remaining: ResourceRemaining;
    isStandalone: boolean;
  };
}

export interface SubscriptionFeaturesResponse {
  success: boolean;
  data: {
    features: SubscriptionFeatures;
    isStandalone: boolean;
  };
}

export interface ResourceLimitCheckResponse {
  success: boolean;
  data: {
    allowed: boolean;
    current: number;
    limit: number;
    remaining: number;
    isStandalone?: boolean;
  };
}

export interface FeatureCheckResponse {
  success: boolean;
  data: {
    feature: string;
    enabled: boolean;
    isStandalone?: boolean;
    reason?: string;
  };
}

export interface UpgradePrompt {

  currentPlan: SubscriptionPlan;

  suggestedPlan: SubscriptionPlan;

  title: string;

  description: string;

  blockedItem: string;
}

export type ResourceType = 'agent' | 'task' | 'knowledgeBase' | 'dataset' | 'team' | 'teamMember';

export interface PlanDetails {
  name: string;
  code: SubscriptionPlan;

  teamsLimit: number;
  teamMembersLimit: number;
  canCreateCollaborativeTeams: boolean;
  canInviteMembers: boolean;

  agentLimit: number;
  taskLimit: number;
  knowledgeBaseLimit: number;
  datasetLimit: number;
  maxFileSize: number;

  quotasPerMonth: number;
  quotasCarryOver: boolean;
  quotasCarryOverMaxMonths: number;

  vectorStorageGB: number;
  fileStorageGB: number;

  apiRequestsPerMonth: number;
  maxConcurrentTasks: number;

  features: SubscriptionFeatures;
}

export interface AllPlansDetails {
  plans: Record<SubscriptionPlan, PlanDetails>;
  hierarchy: SubscriptionPlan[];
  isStandalone: boolean;
}
