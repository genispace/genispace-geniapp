import type { SubscriptionPlan, FeatureKey, ResourceType } from './types';

export const PLAN_HIERARCHY: SubscriptionPlan[] = ['FREE', 'PERSONAL', 'TEAM', 'ENTERPRISE'];

export const PLAN_DISPLAY_NAMES: Record<SubscriptionPlan, string> = {
  FREE: 'Free',
  PERSONAL: 'Personal Pro',
  TEAM: 'Team',
  ENTERPRISE: 'Enterprise',
};

export const FEATURE_DISPLAY_NAMES: Record<FeatureKey, string> = {
  advancedModels: 'Advanced models',
  customOperators: 'Custom operators',
  apiAccess: 'API access',
  auditLogs: 'Audit logs',
  sso: 'Single sign-on',
  prioritySupport: 'Priority support',
  scheduledTasks: 'Scheduled tasks',
  webhooks: 'Webhooks',
  dataExport: 'Data export',
  teamCollaboration: 'Team collaboration',
  advancedAnalytics: 'Advanced analytics',
  customIntegrations: 'Custom integrations',
  slaGuarantee: 'SLA guarantee',
  rbacControl: 'RBAC',
};

export const RESOURCE_DISPLAY_NAMES: Record<ResourceType, string> = {
  agent: 'Agent',
  task: 'Task',
  knowledgeBase: 'Knowledge base',
  dataset: 'Dataset',
  team: 'Team',
  teamMember: 'Team member',
};

export const FEATURE_KEYS: FeatureKey[] = [
  'advancedModels',
  'customOperators',
  'apiAccess',
  'auditLogs',
  'sso',
  'prioritySupport',
  'scheduledTasks',
  'webhooks',
  'dataExport',
  'teamCollaboration',
  'advancedAnalytics',
  'customIntegrations',
  'slaGuarantee',
  'rbacControl',
];

export const RESOURCE_TYPES: ResourceType[] = [
  'agent',
  'task',
  'knowledgeBase',
  'dataset',
  'team',
  'teamMember',
];

export const DEFAULT_SUBSCRIPTION_CONTEXT = {
  subscription: {
    plan: 'FREE' as SubscriptionPlan,
    expiry: null,
    isActive: true,
    source: 'DEFAULT' as const,
    isStandalone: false,
  },
  limits: {

    teamsLimit: 1,
    teamMembersLimit: 1,
    canCreateCollaborativeTeams: false,
    canInviteMembers: false,

    agentLimit: 2,
    taskLimit: 1,
    knowledgeBaseLimit: 1,
    datasetLimit: 1,
    maxFileSize: 5,

    quotasPerMonth: 100000,
    quotasCarryOver: false,
    quotasCarryOverMaxMonths: 0,

    vectorStorageGB: 1,
    fileStorageGB: 1,

    apiRequestsPerMonth: 0,
    maxConcurrentTasks: 1,
  },
  features: {
    advancedModels: false,
    customOperators: false,
    apiAccess: false,
    auditLogs: false,
    sso: false,
    prioritySupport: false,
    scheduledTasks: false,
    webhooks: false,
    dataExport: false,
    teamCollaboration: false,
    advancedAnalytics: false,
    customIntegrations: false,
    slaGuarantee: false,
    rbacControl: false,
  },
  usage: {
    agent: 0,
    task: 0,
    knowledgeBase: 0,
    dataset: 0,
    team: 0,
    teamMember: 0,
  },
  remaining: {
    agent: 2,
    task: 1,
    knowledgeBase: 1,
    dataset: 1,
    team: 1,
    teamMember: 1,
  },
};

export const STANDALONE_SUBSCRIPTION_CONTEXT = {
  subscription: {
    plan: 'ENTERPRISE' as SubscriptionPlan,
    expiry: null,
    isActive: true,
    source: 'STANDALONE' as const,
    isStandalone: true,
  },
  limits: {

    teamsLimit: Infinity,
    teamMembersLimit: Infinity,
    canCreateCollaborativeTeams: true,
    canInviteMembers: true,

    agentLimit: Infinity,
    taskLimit: Infinity,
    knowledgeBaseLimit: Infinity,
    datasetLimit: Infinity,
    maxFileSize: Infinity,

    quotasPerMonth: Infinity,
    quotasCarryOver: true,
    quotasCarryOverMaxMonths: Infinity,

    vectorStorageGB: Infinity,
    fileStorageGB: Infinity,

    apiRequestsPerMonth: Infinity,
    maxConcurrentTasks: Infinity,
  },
  features: {
    advancedModels: true,
    customOperators: true,
    apiAccess: true,
    auditLogs: true,
    sso: true,
    prioritySupport: true,
    scheduledTasks: true,
    webhooks: true,
    dataExport: true,
    teamCollaboration: true,
    advancedAnalytics: true,
    customIntegrations: true,
    slaGuarantee: true,
    rbacControl: true,
  },
  usage: {
    agent: 0,
    task: 0,
    knowledgeBase: 0,
    dataset: 0,
    team: 0,
    teamMember: 0,
  },
  remaining: {
    agent: Infinity,
    task: Infinity,
    knowledgeBase: Infinity,
    dataset: Infinity,
    team: Infinity,
    teamMember: Infinity,
  },
};
