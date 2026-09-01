import {
  useEffect,
  useState,
  useLayoutEffect,
  useRef,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { Z_INDEX_CLASSES } from '../../../styles/z-index-layers';
import { useNavigate } from 'react-router-dom';
import { isLogoutBroadcastInProgress, type SSOClient } from '@genispace/geniapp/utils';

type AuthState = 'initializing' | 'processing-sso' | 'processing-token' | 'validating-token' | 'checking-auth' | 'authenticated' | 'unauthenticated' | 'error';

interface ValidateTokenUserPayload {
  id: string;
  email: string;
  [key: string]: unknown;
}

interface ValidateTokenResponse {
  valid: boolean;
  user?: ValidateTokenUserPayload;
  message: string;
}

export type RequireAuthUser = {
  isLoggedIn: boolean;
  token?: string;
  refreshToken?: string;
  email?: string;
  name?: string;
  id?: string;
  avatarUrl?: string | null;
};

export type RequireAuthApiClient = {
  get: <T = unknown>(
    url: string,
    params?: Record<string, unknown>,
  ) => Promise<{ data?: T }>;
};

export interface RequireAuthProps {

  ssoClient: SSOClient;

  apiClient: RequireAuthApiClient;

  userContext: {
    user: RequireAuthUser | null;
    setUser: Dispatch<SetStateAction<RequireAuthUser | null>>;
  };

  defaultReturnPath?: string;

  safeReturnPath?: string;

  children: JSX.Element;

  t?: (key: string, defaultValue?: string) => string;

  supportUrlToken?: boolean;
}

export function RequireAuth({
  ssoClient,
  apiClient,
  userContext,
  defaultReturnPath = '/',
  safeReturnPath,
  children,
  t = (key: string, defaultValue?: string) => defaultValue || key,
  supportUrlToken = false,
}: RequireAuthProps) {
  const navigate = useNavigate();
  const { user, setUser } = userContext;
  const [authState, setAuthState] = useState<AuthState>('initializing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasProcessedTokenRef = useRef(false);
  const hasValidatedTokenRef = useRef(false);

  const finalSafeReturnPath = safeReturnPath || defaultReturnPath;

  const handleSSOCallback = useCallback(async (_code: string, state: string) => {
    try {
      const { token, refreshToken, user: userInfo } = await ssoClient.handleCallback();

      const stateData = ssoClient.parseState(state);

      const returnPath = stateData?.returnPath || defaultReturnPath;

      let cleanPath: string;
      if (returnPath === '/sso/callback' || returnPath.startsWith('/sso/callback')) {
        cleanPath = finalSafeReturnPath;
      } else {
        const [path, queryString] = returnPath.split('?');
        if (queryString) {
          const params = new URLSearchParams(queryString);
          const prompt = params.get('prompt');
          if (prompt) {
            cleanPath = `${path}?prompt=${encodeURIComponent(prompt)}`;
          } else {
            cleanPath = path;
          }
        } else {
          cleanPath = path;
        }
      }

      window.history.replaceState({}, '', cleanPath);

      localStorage.setItem('token', token);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      } else {
        console.warn(' RequireAuth: 未获取到 refreshToken');
      }

      const fullUserInfo: RequireAuthUser = {
        isLoggedIn: true,
        token,
        ...userInfo,
      };

      localStorage.setItem('user', JSON.stringify(fullUserInfo));

      setUser(fullUserInfo);

      await new Promise(resolve => setTimeout(resolve, 10));

      window.dispatchEvent(new CustomEvent('user-login-success'));

      hasValidatedTokenRef.current = false;

      navigate(cleanPath, { replace: true });

      setAuthState('validating-token');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('RequireAuth: SSO callback failed:', {
        error: errorMsg,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
        currentUrl: window.location.href,
        currentPath: window.location.pathname + window.location.search
      });

      setErrorMessage(errorMsg);
      setAuthState('error');

      hasValidatedTokenRef.current = false;

      const cleanPathErr = window.location.pathname.split('?')[0];
      if (cleanPathErr !== window.location.pathname) {
        window.history.replaceState({}, '', cleanPathErr);
      }
    }
  }, [ssoClient, navigate, setUser, defaultReturnPath, finalSafeReturnPath, setAuthState, setErrorMessage]);

  useLayoutEffect(() => {

    if (authState !== 'initializing') {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const urlToken = supportUrlToken ? urlParams.get('token') : null; 
    const localToken = localStorage.getItem('token');
    const currentPath = window.location.pathname + window.location.search;

    if (code && state && !hasProcessedTokenRef.current) {
      hasProcessedTokenRef.current = true;
      setAuthState('processing-sso');
      handleSSOCallback(code, state);
      return;
    }

    if (supportUrlToken && urlToken && !hasProcessedTokenRef.current) {
      console.warn(' Using deprecated URL token authentication. Please use SSO flow.');
      hasProcessedTokenRef.current = true;
      hasValidatedTokenRef.current = false; 
      setAuthState('processing-token');

      localStorage.setItem('token', urlToken);

      const newUrl = window.location.pathname + (window.location.search.replace(/[?&]token=[^&]*/g, '').replace(/^&/, '?') || '');
      window.history.replaceState({}, '', newUrl);

      setUser({
        isLoggedIn: true,
        token: urlToken,
      });

      return;
    }

    if (hasProcessedTokenRef.current && authState === 'initializing') {
      console.warn(' RequireAuth: 已处理过回调但仍在初始化状态，可能存在问题');

      if (localToken) {
        hasValidatedTokenRef.current = false;
        setAuthState('validating-token');
        return;
      }
    }

    if (localToken) {

      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser.isLoggedIn && user?.isLoggedIn) {

            if (!user.token) {
              setUser({ ...parsedUser, isLoggedIn: true, token: localToken } as RequireAuthUser);
            }
            setAuthState('authenticated');
            return;
          }
        } catch (e) {
          console.warn(' RequireAuth: 无法解析存储的用户信息，继续验证流程', e);
        }
      }

      hasValidatedTokenRef.current = false;
      setAuthState('validating-token');
      return;
    }

    const isProcessingCallback = currentPath.includes('/sso/callback') && code && state;

    if (isProcessingCallback) {
      return;
    }

    setAuthState('unauthenticated');
    const returnPath = window.location.pathname + window.location.search;

    const safePath = returnPath.includes('/sso/callback') ? finalSafeReturnPath : returnPath;
    ssoClient.startLogin(safePath);
  }, [
    authState,
    user?.isLoggedIn,
    user?.token,
    ssoClient,
    setUser,
    finalSafeReturnPath,
    supportUrlToken,
    handleSSOCallback,
  ]);

  useEffect(() => {
    if (authState === 'processing-token' && user?.isLoggedIn) {
      setAuthState('validating-token');
    }
  }, [authState, user?.isLoggedIn]);

  useEffect(() => {
    if (authState !== 'validating-token' || hasValidatedTokenRef.current) {
      return;
    }

    const validateTokenWithAPI = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setAuthState('unauthenticated');

        return;
      }

      hasValidatedTokenRef.current = true;

      try {
        const response = await apiClient.get<ValidateTokenResponse>('/auth/validate-token');

        if (response.data?.valid && response.data?.user) {
          setUser({
            isLoggedIn: true,
            token: token,
            ...response.data.user,
          } as RequireAuthUser);

          setAuthState('checking-auth');
        } else {
          console.error('RequireAuth: API 返回无效响应', response.data);
          throw new Error('API validation failed: ' + (response.data?.message || 'Invalid response'));
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('RequireAuth: API validation failed', {
          error: errorMsg,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          stack: error instanceof Error ? error.stack : undefined
        });

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);

        setErrorMessage(`${t('require_auth.token_validation_failed', 'Token validation failed')}: ${errorMsg}`);
        setAuthState('error');
      }
    };

    validateTokenWithAPI();
  }, [authState, setUser, apiClient, t]);

  // Front-channel logout / account switch: when another app clears this
  // origin's token (logout-notification receiver iframe, another tab, or the
  // in-app sign-out), restart the auth flow so the SSO login is re-triggered
  // with the identity provider's current session.
  useEffect(() => {
    if (authState !== 'authenticated') {
      return;
    }

    const restartIfLoggedOut = () => {
      // A local sign-out is still broadcasting to the other app origins.
      // Restarting now would redirect to SSO before the identity provider's
      // storage is cleared and silently log the user straight back in; the
      // sign-out flow itself redirects once the broadcast completes.
      if (isLogoutBroadcastInProgress()) return;
      let token: string | null = null;
      try {
        token = localStorage.getItem('token');
      } catch {
        return;
      }
      if (token) return;
      hasProcessedTokenRef.current = false;
      hasValidatedTokenRef.current = false;
      setUser(null);
      setAuthState('initializing');
    };

    const onStorage = (e: StorageEvent) => {
      // key === null means localStorage.clear(); token/user removals carry a null newValue.
      if ((e.key === null || e.key === 'token' || e.key === 'user') && !e.newValue) {
        restartIfLoggedOut();
      }
    };

    const timer = window.setInterval(restartIfLoggedOut, 1000);
    window.addEventListener('storage', onStorage);
    window.addEventListener('localStorageChange', restartIfLoggedOut);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('localStorageChange', restartIfLoggedOut);
    };
  }, [authState, setUser]);

  useEffect(() => {
    if (authState !== 'checking-auth') {
      return;
    }

    const token = localStorage.getItem('token');

    if (user?.isLoggedIn && token) {
      setAuthState('authenticated');
    } else {
      if (token && !user?.isLoggedIn) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser({ ...parsedUser, isLoggedIn: true, token } as RequireAuthUser);

            return;
          } catch (e) {
            console.error('RequireAuth: 无法解析存储的用户信息', e);
          }
        }
      }

      setErrorMessage(t('require_auth.auth_check_failed', 'Authentication check failed: invalid user state or token'));
      setAuthState('error');
    }
  }, [authState, user?.isLoggedIn, user, setUser, t]);

  switch (authState) {
    case 'initializing':
    case 'processing-sso':
    case 'processing-token':
    case 'validating-token':
    case 'checking-auth':
      return (
        <div className={`fixed inset-0 bg-white dark:bg-neutral-900 flex items-center justify-center ${Z_INDEX_CLASSES.MODAL_BACKDROP}`}>
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary dark:border-neutral-400 mb-4"></div>
            <div className="text-neutral-600 dark:text-neutral-400 text-sm">
              {authState === 'initializing' && t('require_auth.initializing', 'Initializing...')}
              {authState === 'processing-sso' && t('require_auth.processing_sso', 'Processing SSO login...')}
              {authState === 'processing-token' && t('require_auth.processing_token', 'Processing login credentials...')}
              {authState === 'validating-token' && t('require_auth.validating_token', 'Validating login credentials...')}
              {authState === 'checking-auth' && t('require_auth.checking_auth', 'Validating login status...')}
            </div>
          </div>
        </div>
      );

    case 'error':
      return (
        <div className={`fixed inset-0 bg-white dark:bg-neutral-900 flex items-center justify-center ${Z_INDEX_CLASSES.MODAL_BACKDROP}`}>
          <div className="text-center max-w-md mx-auto px-4">
            <div className="text-red-500 text-lg font-semibold mb-4">
              {t('require_auth.sso_error', 'SSO Login Failed')}
            </div>
            <div className="text-neutral-600 dark:text-neutral-400 text-sm mb-4 bg-neutral-100 dark:bg-neutral-800 p-4 rounded-lg font-mono text-left overflow-auto max-h-40">
              {errorMessage || 'Unknown error'}
            </div>
            <div className="text-neutral-500 dark:text-neutral-400 text-xs mb-4 p-2 bg-neutral-50 dark:bg-neutral-800 rounded">
              <div>{t('require_auth.current_url', 'Current URL')}: {window.location.href}</div>
              <div>{t('require_auth.current_path', 'Current path')}: {window.location.pathname + window.location.search}</div>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setErrorMessage(null);
                  hasProcessedTokenRef.current = false;
                  hasValidatedTokenRef.current = false;
                  setAuthState('initializing');
                }}
                className="px-4 py-2 bg-brand-primary-light text-white rounded hover:bg-brand-primary"
              >
                {t('require_auth.retry', 'Retry')}
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  setUser(null);
                  setErrorMessage(null);
                  hasProcessedTokenRef.current = false;
                  hasValidatedTokenRef.current = false;
                  setAuthState('initializing');
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                {t('require_auth.clear_and_retry', 'Clear cache and retry')}
              </button>
            </div>
          </div>
        </div>
      );

    case 'authenticated':
      return children;

    case 'unauthenticated':
      return (
        <div className={`fixed inset-0 bg-white dark:bg-neutral-900 flex items-center justify-center ${Z_INDEX_CLASSES.MODAL_BACKDROP}`}>
          <div className="text-center">
            <div className="text-neutral-600 dark:text-neutral-400 text-sm">
              {t('require_auth.redirecting_to_login', 'Redirecting to login page...')}
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className={`fixed inset-0 bg-white dark:bg-neutral-900 flex items-center justify-center ${Z_INDEX_CLASSES.MODAL_BACKDROP}`}>
          <div className="text-center">
            <div className="text-red-500 text-sm">{t('require_auth.auth_state_error', 'Authentication state error')}</div>
          </div>
        </div>
      );
  }
}

