import { type ReactNode, type ReactElement, useEffect, useRef } from 'react';
import { useSubscription } from './useSubscription';
import type { SubscriptionPlan, FeatureKey, ResourceType, UpgradePrompt } from './types';

// ================ SubscriptionGuard ================

interface SubscriptionGuardProps {

  feature?: FeatureKey;

  requiredPlan?: SubscriptionPlan;

  children: ReactNode;

  fallback?: ReactNode;

  showUpgradePrompt?: boolean;

  renderUpgradePrompt?: (prompt: UpgradePrompt) => ReactElement;
}

export function SubscriptionGuard({
  feature,
  requiredPlan,
  children,
  fallback,
  showUpgradePrompt = false,
  renderUpgradePrompt,
}: SubscriptionGuardProps): ReactElement | null {
  const { 
    isStandalone, 
    canAccess, 
    hasPlan, 
    getFeatureUpgradePrompt,
    isLoading,
  } = useSubscription();

  if (isLoading) {
    return <>{children}</>;
  }

  if (isStandalone) {
    return <>{children}</>;
  }

  let hasAccess = true;

  if (feature) {
    hasAccess = canAccess(feature);
  }

  if (requiredPlan && hasAccess) {
    hasAccess = hasPlan(requiredPlan);
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt || renderUpgradePrompt) {
    const prompt = feature ? getFeatureUpgradePrompt(feature) : null;

    if (prompt && renderUpgradePrompt) {
      return renderUpgradePrompt(prompt);
    }

    if (prompt && showUpgradePrompt) {
      return (
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffc107',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#856404' }}>{prompt.title}</h4>
          <p style={{ margin: 0, color: '#856404', fontSize: '14px' }}>{prompt.description}</p>
        </div>
      );
    }
  }

  return null;
}

// ================ ResourceLimitGuard ================

interface ResourceLimitGuardProps {

  resource: ResourceType;

  currentCount?: number;

  children: ReactNode;

  fallback?: ReactNode;

  onLimitReached?: () => void;

  showUpgradePrompt?: boolean;

  renderUpgradePrompt?: (prompt: UpgradePrompt) => ReactElement;
}

export function ResourceLimitGuard({
  resource,
  currentCount,
  children,
  fallback,
  onLimitReached,
  showUpgradePrompt = false,
  renderUpgradePrompt,
}: ResourceLimitGuardProps): ReactElement | null {
  const { 
    isStandalone, 
    checkLimit, 
    getResourceUpgradePrompt,
    isLoading,
  } = useSubscription();

  const limitNotifyRef = useRef(false);

  useEffect(() => {
    if (isLoading || isStandalone) {
      limitNotifyRef.current = false;
      return;
    }
    const allowed = checkLimit(resource, currentCount);
    if (allowed) {
      limitNotifyRef.current = false;
      return;
    }
    if (!onLimitReached || limitNotifyRef.current) return;
    limitNotifyRef.current = true;
    onLimitReached();
  }, [isLoading, isStandalone, resource, currentCount, onLimitReached, checkLimit]);

  if (isLoading) {
    return <>{children}</>;
  }

  if (isStandalone) {
    return <>{children}</>;
  }

  const allowed = checkLimit(resource, currentCount);

  if (allowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt || renderUpgradePrompt) {
    const prompt = getResourceUpgradePrompt(resource);

    if (prompt && renderUpgradePrompt) {
      return renderUpgradePrompt(prompt);
    }

    if (prompt && showUpgradePrompt) {
      return (
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#f8d7da', 
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#721c24' }}>{prompt.title}</h4>
          <p style={{ margin: 0, color: '#721c24', fontSize: '14px' }}>{prompt.description}</p>
        </div>
      );
    }
  }

  return null;
}

// ================ FeatureFlag ================

interface FeatureFlagProps {

  feature: FeatureKey;

  children: ReactNode;

  otherwise?: ReactNode;
}

export function FeatureFlag({
  feature,
  children,
  otherwise,
}: FeatureFlagProps): ReactElement | null {
  const { isStandalone, canAccess, isLoading } = useSubscription();

  if (isLoading) {
    return <>{children}</>;
  }

  if (isStandalone || canAccess(feature)) {
    return <>{children}</>;
  }

  return otherwise ? <>{otherwise}</> : null;
}

// ================ PlanRequired ================

interface PlanRequiredProps {

  plan: SubscriptionPlan;

  children: ReactNode;

  otherwise?: ReactNode;
}

export function PlanRequired({
  plan,
  children,
  otherwise,
}: PlanRequiredProps): ReactElement | null {
  const { isStandalone, hasPlan, isLoading } = useSubscription();

  if (isLoading) {
    return <>{children}</>;
  }

  if (isStandalone || hasPlan(plan)) {
    return <>{children}</>;
  }

  return otherwise ? <>{otherwise}</> : null;
}
