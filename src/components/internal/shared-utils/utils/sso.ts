const OAUTH_REDIRECT_URI_STORAGE_KEY = 'genispace_sso_oauth_redirect_uri';

export interface ApplicationConfig {
  client_id: string;
  app_type: string;
  app_name: string;
  redirect_uris: string[];
  scope: string;
  is_platform_core: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface SSOCallbackResult {
  token: string;
  refreshToken?: string;
  expiresIn?: number;
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified?: boolean;
  };
}

export interface StateData {
  nonce: string;
  returnPath: string;
  timestamp: number;
}

export interface SSOClientConfig {

  getConfig: () => {
    API_BASE_URL: string;
    APP_URL?: string;
  };

  appType: string;

  defaultReturnPath?: string;

  identifyApp?: () => string;

  getOAuthRedirectUri?: () => string | undefined | Promise<string | undefined>;

  openLoginUrl?: (url: string) => void | Promise<void>;
}

export interface SSOClient {
  startLogin: (returnPath?: string) => Promise<void>;
  handleCallback: () => Promise<SSOCallbackResult>;
  parseState: (state: string) => StateData | null;
  clearCache: () => void;
}

export function createSSOClient(config: SSOClientConfig): SSOClient {
  const {
    getConfig: getConfigFn,
    appType,
    defaultReturnPath = '/',
    identifyApp = () => {
      const hostname = window.location.hostname;
      if (hostname.includes('ebook')) return 'ebook';
      if (hostname.includes('workbench')) return 'workbench';
      return 'app';
    },
    getOAuthRedirectUri,
    openLoginUrl,
  } = config;

  let activeOAuthRedirectUri = `${window.location.origin}/sso/callback`;
  try {
    const stored = sessionStorage.getItem(OAUTH_REDIRECT_URI_STORAGE_KEY);
    if (stored) activeOAuthRedirectUri = stored;
  } catch {
    /* private mode / no sessionStorage */
  }
  const SCOPE = 'openid profile email';

  let appConfigCache: ApplicationConfig | null = null;

  let pendingRequest: Promise<ApplicationConfig> | null = null;

  async function getApplicationConfig(): Promise<ApplicationConfig> {

    if (appConfigCache) {
      return appConfigCache;
    }

    if (pendingRequest) {
      return pendingRequest;
    }

    const currentDomain = window.location.origin;
    const apiBaseUrl = getConfigFn().API_BASE_URL;

    pendingRequest = (async () => {
      try {
        const response = await fetch(
          `${apiBaseUrl}/sso/applications/by-domain?domain=${encodeURIComponent(currentDomain)}`
        );

        if (!response.ok) {

          if (response.status === 429) {
            console.warn('[SSO] Too many requests; waiting before retry...');
            await new Promise(resolve => setTimeout(resolve, 1000));

            pendingRequest = null;
            return getApplicationConfig();
          }
          throw new Error(`Failed to get application config: ${response.status}`);
        }

        const result = await response.json() as ApiResponse<ApplicationConfig>;

        if (!result.success || !result.data) {
          throw new Error('Invalid response from application config endpoint');
        }

        const config: ApplicationConfig = result.data;
        appConfigCache = config;
        return config;
      } catch (error) {
        console.error('Failed to get application config:', error);
        throw new Error('Failed to get application config. Please check your network connection.');
      } finally {

        pendingRequest = null;
      }
    })();

    return pendingRequest;
  }

  async function startLogin(returnPath?: string): Promise<void> {
    try {
      const state = generateState(returnPath);
      const appConfig = await getApplicationConfig();
      const clientId = appConfig.client_id;

      // The OAuth authorize page (`/sso/login`) is served by the Hub (the IdP),
      // i.e. the main site (www.*). `APP_URL` is the Hub/platform base.
      const runtimeHubUrl =
        (typeof window !== 'undefined' &&
          (window as Window & { __APP_CONFIG__?: { APP_URL?: string } }).__APP_CONFIG__?.APP_URL) ||
        '';
      const appUrl = runtimeHubUrl || getConfigFn().APP_URL || 'http://localhost:5018';

      const defaultRedirect = `${window.location.origin}/sso/callback`;
      let oauthRedirectUri = defaultRedirect;
      try {
        const override = await getOAuthRedirectUri?.();
        if (override) oauthRedirectUri = override;
      } catch (e) {
        console.warn('[SSO] getOAuthRedirectUri failed; using default redirect_uri', e);
      }
      activeOAuthRedirectUri = oauthRedirectUri;
      try {
        sessionStorage.setItem(OAUTH_REDIRECT_URI_STORAGE_KEY, oauthRedirectUri);
      } catch {
        /* pass */
      }

      const appAuthUrl = new URL(`${appUrl}/sso/login`);
      appAuthUrl.searchParams.set('client_id', clientId);
      appAuthUrl.searchParams.set('redirect_uri', oauthRedirectUri);
      appAuthUrl.searchParams.set('response_type', 'code');
      appAuthUrl.searchParams.set('scope', SCOPE);
      appAuthUrl.searchParams.set('state', state);

      // Platform core (built-in) apps use silent auth when Hub session exists.
      appAuthUrl.searchParams.set('prompt', appConfig.is_platform_core ? 'none' : 'consent');

      const from = identifyApp();
      appAuthUrl.searchParams.set('from', from);

      const loginUrl = appAuthUrl.toString();

      if (openLoginUrl) {
        await Promise.resolve(openLoginUrl(loginUrl));
      } else {
        window.location.href = loginUrl;
      }
    } catch (error) {
      console.error('Failed to start SSO login:', error);
      throw error;
    }
  }

  async function handleCallback(): Promise<SSOCallbackResult> {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      console.error('[SSO] handleCallback: OAuth error', error);
      throw new Error(`OAuth error: ${error}`);
    }

    if (!code) {
      console.error('[SSO] handleCallback: authorization code not found');
      throw new Error('Authorization code not found');
    }

    try {

      const appConfig = await getApplicationConfig();
      const appTypeValue = appConfig.app_type || appType;

      const apiBaseUrl = getConfigFn().API_BASE_URL;
      const callbackUrl = `${apiBaseUrl}/sso/platform/${appTypeValue}/callback`;

      const response = await fetch(callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          redirectUri: activeOAuthRedirectUri,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SSO] handleCallback: callback proxy failed', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });

        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || 'Unknown error' };
        }

        throw new Error(errorData.message || `Token exchange failed: ${response.status}`);
      }

      const data = await response.json() as ApiResponse<SSOCallbackResult>;

      if (!data.success || !data.data) {
        console.error('[SSO] handleCallback: invalid response data', data);
        throw new Error(data.message || 'Invalid response from callback endpoint');
      }

      try {
        sessionStorage.removeItem(OAUTH_REDIRECT_URI_STORAGE_KEY);
      } catch {
        /* pass */
      }
      return {
        token: data.data.token,
        refreshToken: data.data.refreshToken,
        expiresIn: data.data.expiresIn,
        user: data.data.user
      };
    } catch (error) {
      console.error('[SSO] handleCallback: error while handling callback', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  function generateState(returnPath?: string): string {
    const state: StateData = {
      nonce: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      returnPath:
        returnPath || defaultReturnPath || window.location.pathname + window.location.search,
      timestamp: Date.now()
    };

    sessionStorage.setItem('oauth_state', JSON.stringify(state));

    return btoa(JSON.stringify(state));
  }

  function parseState(state: string): StateData | null {
    try {
      const decoded = JSON.parse(atob(state));

      const storedState = sessionStorage.getItem('oauth_state');
      if (storedState) {
        const stored = JSON.parse(storedState);
        if (stored.nonce === decoded.nonce) {

          sessionStorage.removeItem('oauth_state');
          return decoded;
        }
      }

      return decoded;
    } catch (error) {
      console.error('Failed to parse state:', error);
      return null;
    }
  }

  function clearCache(): void {
    appConfigCache = null;
    try {
      sessionStorage.removeItem(OAUTH_REDIRECT_URI_STORAGE_KEY);
    } catch {
      /* pass */
    }
  }

  return {
    startLogin,
    handleCallback,
    parseState,
    clearCache
  };
}

