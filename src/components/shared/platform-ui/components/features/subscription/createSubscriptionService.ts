import type {
  SubscriptionContext,
  SubscriptionLimits,
  SubscriptionFeatures,
  ResourceUsage,
  ResourceRemaining,
  SubscriptionContextResponse,
  SubscriptionLimitsResponse,
  SubscriptionFeaturesResponse,
  ResourceLimitCheckResponse,
  FeatureCheckResponse,
  ResourceType,
  FeatureKey,
  AllPlansDetails,
} from './types';
import { DEFAULT_SUBSCRIPTION_CONTEXT } from './constants';

export interface ApiClientInterface {
  get<T>(url: string, params?: unknown, config?: unknown): Promise<{
    success: boolean;
    data?: T;
    message?: string;
  }>;
}

export interface SubscriptionService {

  getSubscriptionContext(spaceId?: string): Promise<SubscriptionContext>;

  getSubscriptionLimits(spaceId?: string): Promise<{
    limits: SubscriptionLimits;
    usage: ResourceUsage;
    remaining: ResourceRemaining;
    isStandalone: boolean;
  }>;

  getSubscriptionFeatures(): Promise<{
    features: SubscriptionFeatures;
    isStandalone: boolean;
  }>;

  checkResourceLimit(resourceType: ResourceType, spaceId?: string): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    remaining: number;
  }>;

  checkFeatureAccess(featureKey: FeatureKey): Promise<{
    feature: string;
    enabled: boolean;
  }>;

  getPlanDetails(): Promise<AllPlansDetails>;
}

export function createSubscriptionService(apiClient: ApiClientInterface): SubscriptionService {
  return {
    async getSubscriptionContext(spaceId?: string): Promise<SubscriptionContext> {
      try {
        const params = spaceId ? { spaceId } : undefined;
        const response = await apiClient.get<SubscriptionContextResponse['data']>(
          '/subscriptions/me',
          params
        );

        if (response.success && response.data) {
          return response.data;
        }

        console.warn('获取订阅上下文失败:', response.message);
        return DEFAULT_SUBSCRIPTION_CONTEXT;
      } catch (error) {
        console.error('获取订阅上下文异常:', error);
        return DEFAULT_SUBSCRIPTION_CONTEXT;
      }
    },

    async getSubscriptionLimits(spaceId?: string) {
      try {
        const params = spaceId ? { spaceId } : undefined;
        const response = await apiClient.get<SubscriptionLimitsResponse['data']>(
          '/subscriptions/limits',
          params
        );

        if (response.success && response.data) {
          return response.data;
        }

        return {
          limits: DEFAULT_SUBSCRIPTION_CONTEXT.limits,
          usage: DEFAULT_SUBSCRIPTION_CONTEXT.usage,
          remaining: DEFAULT_SUBSCRIPTION_CONTEXT.remaining,
          isStandalone: false,
        };
      } catch (error) {
        console.error('获取订阅限制异常:', error);
        return {
          limits: DEFAULT_SUBSCRIPTION_CONTEXT.limits,
          usage: DEFAULT_SUBSCRIPTION_CONTEXT.usage,
          remaining: DEFAULT_SUBSCRIPTION_CONTEXT.remaining,
          isStandalone: false,
        };
      }
    },

    async getSubscriptionFeatures() {
      try {
        const response = await apiClient.get<SubscriptionFeaturesResponse['data']>(
          '/subscriptions/features'
        );

        if (response.success && response.data) {
          return response.data;
        }

        return {
          features: DEFAULT_SUBSCRIPTION_CONTEXT.features,
          isStandalone: false,
        };
      } catch (error) {
        console.error('获取功能开关异常:', error);
        return {
          features: DEFAULT_SUBSCRIPTION_CONTEXT.features,
          isStandalone: false,
        };
      }
    },

    async checkResourceLimit(resourceType: ResourceType, spaceId?: string) {
      try {
        const params = spaceId ? { spaceId } : undefined;
        const response = await apiClient.get<ResourceLimitCheckResponse['data']>(
          `/subscriptions/limits/${resourceType}`,
          params
        );

        if (response.success && response.data) {
          return response.data;
        }

        return {
          allowed: true,
          current: 0,
          limit: Infinity,
          remaining: Infinity,
        };
      } catch (error) {
        console.error('检查资源限制异常:', error);
        return {
          allowed: true,
          current: 0,
          limit: Infinity,
          remaining: Infinity,
        };
      }
    },

    async checkFeatureAccess(featureKey: FeatureKey) {
      try {
        const response = await apiClient.get<FeatureCheckResponse['data']>(
          `/subscriptions/features/${featureKey}`
        );

        if (response.success && response.data) {
          return response.data;
        }

        return {
          feature: featureKey,
          enabled: false,
        };
      } catch (error) {
        console.error('检查功能访问异常:', error);
        return {
          feature: featureKey,
          enabled: false,
        };
      }
    },

    async getPlanDetails() {
      try {
        const response = await apiClient.get<AllPlansDetails>(
          '/subscriptions/plans/details'
        );

        if (response.success && response.data) {
          return response.data;
        }

        throw new Error('Failed to fetch plan details');
      } catch (error) {
        console.error('Error fetching plan details:', error);
        throw error;
      }
    },
  };
}
