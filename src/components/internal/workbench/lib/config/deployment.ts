export type ReleaseEdition = 'cn' | 'global' | 'standalone';

export function getReleaseEdition(): ReleaseEdition {

  const runtimeEdition = (window as { __APP_CONFIG__?: { RELEASE_EDITION?: string } }).__APP_CONFIG__?.RELEASE_EDITION;
  if (runtimeEdition === 'cn' || runtimeEdition === 'global' || runtimeEdition === 'standalone') {
    return runtimeEdition;
  }

  if (runtimeEdition !== undefined) {
    console.warn(`Invalid RELEASE_EDITION in __APP_CONFIG__: ${runtimeEdition}, defaulting to 'standalone'`);
  }
  return 'global';
}

export function isStandaloneDeployment(): boolean {
  return getReleaseEdition() === 'standalone';
}

export function isCnEdition(): boolean {
  return getReleaseEdition() === 'cn';
}

export function isGlobalEdition(): boolean {
  return getReleaseEdition() === 'global';
}

export function isSaaSDeployment(): boolean {
  const edition = getReleaseEdition();
  return edition === 'cn' || edition === 'global';
}

export function getDeploymentConfig() {
  const edition = getReleaseEdition();

  const configs = {
    cn: {
      edition: 'cn' as const,
      showSignUp: true,
      showPricing: true,
      showMarketplace: true,
      enableBilling: true,
      homeRoute: '/',
      homeComponent: 'website'
    },
    global: {
      edition: 'global' as const,
      showSignUp: true,
      showPricing: true,
      showMarketplace: true,
      enableBilling: true,
      homeRoute: '/',
      homeComponent: 'website'
    },
    standalone: {
      edition: 'standalone' as const,
      showSignUp: false,
      showPricing: false,
      showMarketplace: false,
      enableBilling: false,
      homeRoute: '/',
      homeComponent: 'standalone'
    }
  };

  return configs[edition];
}

export type DeploymentMode = 'saas' | 'standalone';
export function getDeploymentMode(): DeploymentMode {
  return isStandaloneDeployment() ? 'standalone' : 'saas';
}
