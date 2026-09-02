import { createContext, useContext, ReactNode } from 'react';
import { getDeploymentConfig, getDeploymentMode, isStandaloneDeployment, isSaaSDeployment } from '@/lib/config/deployment';
import type { DeploymentMode } from '@/lib/config/deployment';

interface DeploymentConfig {
  edition: 'cn' | 'global' | 'standalone';
  showSignUp: boolean;
  showPricing: boolean;
  showMarketplace: boolean;
  enableBilling: boolean;
  homeRoute: string;
  homeComponent: string;
}

interface DeploymentContextType {
  config: DeploymentConfig;
  mode: DeploymentMode;
  isStandalone: boolean;
  isSaaS: boolean;
}

const DeploymentContext = createContext<DeploymentContextType | undefined>(undefined);

interface DeploymentProviderProps {
  children: ReactNode;
}

export function DeploymentProvider({ children }: DeploymentProviderProps) {
  const config = getDeploymentConfig();
  const mode = getDeploymentMode();
  const isStandalone = isStandaloneDeployment();
  const isSaaS = isSaaSDeployment();

  const value: DeploymentContextType = {
    config,
    mode,
    isStandalone,
    isSaaS,
  };

  return (
    <DeploymentContext.Provider value={value}>
      {children}
    </DeploymentContext.Provider>
  );
}

export function useDeployment(): DeploymentContextType {
  const context = useContext(DeploymentContext);
  if (context === undefined) {
    throw new Error('useDeployment must be used within a DeploymentProvider');
  }
  return context;
}
