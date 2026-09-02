import { useState, useEffect, useRef } from 'react';
import { Z_INDEX_CLASSES } from '../../../styles/z-index-layers';
import { Link, useNavigate } from 'react-router-dom';
import { Globe, Menu, X, BarChart3, MessageSquare, User, LogOut, LayoutGrid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ThemeToggle } from './ThemeToggle';
import type { UserSettingsApiClient } from '../../../hooks/useUserSettings';
import { isDesktop, openExternal } from '../../../platform';

function isStandaloneEdition(): boolean {
  const runtimeEdition = (window as { __APP_CONFIG__?: { RELEASE_EDITION?: string } }).__APP_CONFIG__?.RELEASE_EDITION;
  return runtimeEdition === 'standalone';
}

export interface User {
  isLoggedIn?: boolean;
  name?: string;
  email?: string;
  token?: string;
  avatarUrl?: string | null;
}

export interface NavigationConfig {
  /** Console (management) base URL — used for the "Console" entry. */
  consoleUrl: string;
  /**
   * Hub (main site / home) base URL — used for the brand/logo home link and
   * public discovery pages (App Store / Explore). Falls back to
   * `window.__APP_CONFIG__.APP_URL` (Hub base) then `consoleUrl` when omitted.
   */
  appUrl?: string;
  workbenchUrl: string;
  chatUrl: string;
  partnerUrl: string;
  webUrl: string;
}

export interface PublicHeaderProps {

  user?: User | null;

  onSignOut: () => void | Promise<void>;

  navigationConfig: NavigationConfig;

  apiClient: UserSettingsApiClient;

  currentLanguage?: string;

  onToggleLanguage?: () => void;

  navigation?: Array<{ name: string; href: string }>;

  signInUrl?: string;

  profileUrl?: string;

  onLogin?: () => void;
}

export function PublicHeader({
  user,
  onSignOut,
  navigationConfig,
  apiClient,
  currentLanguage,
  onToggleLanguage,
  navigation,
  signInUrl = '/sign-in',
  profileUrl = '/profile',
  onLogin,
}: PublicHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleToggleLanguage = () => {
    if (onToggleLanguage) {
      onToggleLanguage();
    }
  };

  // Brand/home, the Workspace (launcher) entry and public discovery (App Store /
  // Explore) live on the Hub (main site), not the console. Prefer the explicit
  // appUrl (Hub), then runtime APP_URL, then consoleUrl.
  const runtimeAppUrl =
    (typeof window !== 'undefined' &&
      (window as Window & { __APP_CONFIG__?: { APP_URL?: string } }).__APP_CONFIG__?.APP_URL) ||
    '';
  const hubBase = navigationConfig.appUrl || runtimeAppUrl || navigationConfig.consoleUrl;

  const appNavigation = user?.isLoggedIn ? [
    {
      name: t('common:workspace', 'Workspace'),
      icon: LayoutGrid,
      url: () => {
        return `${hubBase.replace(/\/$/, '')}/workspace`;
      },
    },
    {
      name: t('common:chat', 'Chat'),
      icon: MessageSquare,
      url: () => {
        return `${navigationConfig.chatUrl.replace(/\/+$/, '')}/chat/assistant`;
      },
    },
    {
      name: t('common:console', 'Console'),
      icon: BarChart3,
      url: () => {
        return `${navigationConfig.consoleUrl}/dashboard`;
      },
    },
  ] : [];

  const isStandalone = isStandaloneEdition();
  const defaultNavigation = isStandalone ? [] : [
    { name: t('common:navigation.applications', 'App Store'), href: `${hubBase}/store` },
    { name: t('common:navigation.explore', 'Explore'), href: `${hubBase}/explore` },
  ];
  const navItems = navigation || defaultNavigation;

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrolled = window.scrollY > 10;
          setIsScrolled(prev => prev !== scrolled ? scrolled : prev);
          ticking = false;
        });
        ticking = true;
      }
    };

    setIsScrolled(window.scrollY > 10);

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 ${Z_INDEX_CLASSES.FIXED_HEADER} transition-all duration-500 ease-out ${
        isScrolled 
          ? 'bg-white/95 dark:bg-neutral-950/95 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800 shadow-md' 
          : 'bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm border-b border-neutral-200/50 dark:border-neutral-800/50'
      }`}
      style={{
        boxShadow: isScrolled ? '0 4px 12px rgba(10, 10, 10, 0.12)' : 'none',
      }}
    >
      <nav className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <button
              onClick={() => {
                if (isDesktop()) {
                  openExternal(`${hubBase}/`);
                } else {
                  window.location.href = `${hubBase}/`;
                }
              }}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <img 
                src="/logo.svg" 
                alt="GeniSpace Logo"
                className="h-5 w-auto"
              />
              <span className="font-display text-xl font-bold tracking-tight hidden sm:block text-neutral-900 dark:text-neutral-50">
                GeniSpace
              </span>
            </button>
          </div>

          <div className="flex-shrink-0 hidden md:flex items-center gap-4">
            {navItems.length > 0 && (
              <>
                <div className="flex items-center gap-6">
                  {navItems.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => {
                        if (isDesktop()) {
                          openExternal(item.href);
                        } else {
                          window.location.href = item.href;
                        }
                      }}
                      className="text-sm font-medium transition-all duration-300 relative group inline-block text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50"
                    >
                      {item.name}
                      <span 
                        className="absolute -bottom-1 left-0 h-0.5 transition-all duration-300 w-0 group-hover:w-full bg-gradient-to-r from-blue-400 to-purple-500"
                      />
                    </button>
                  ))}
                </div>

                <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800"></div>
              </>
            )}

            {appNavigation.length > 0 && (
              <div className="flex items-center gap-2">
                {appNavigation.map((app) => {
                  const Icon = app.icon;
                  const isChat = app.name === t('common:chat', 'Chat');
                  return (
                    <button
                      key={app.name}
                      onClick={() => {
                        if (isDesktop()) {
                          if (isChat) return; 
                          openExternal(app.url());
                        } else {
                          window.location.href = app.url();
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:bg-gradient-to-r dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 text-neutral-900 dark:text-neutral-50"
                      title={app.name}
                    >
                      <Icon className="w-4 h-4 text-neutral-900 dark:text-neutral-50" />
                      <span className="text-sm font-medium">{app.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {appNavigation.length > 0 && (
              <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800"></div>
            )}

            <ThemeToggle apiClient={apiClient} />

            <button
              onClick={handleToggleLanguage}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-300 flex items-center gap-1.5 text-neutral-900 dark:text-neutral-50"
              title={t('common:change_language', 'Change Language')}
            >
              <Globe className="w-5 h-5 text-neutral-900 dark:text-neutral-50" />
              <span className="text-sm">{currentLanguage === 'zh' ? 'EN' : t('common:language.zh_short', 'ZH')}</span>
            </button>

            {user && user.isLoggedIn ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-300"
                  title={t('common:header.profile', 'Profile')}
                >
                  <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                    <User className="w-5 h-5 text-neutral-900 dark:text-neutral-50" />
                  </div>
                </button>

                {showUserMenu && (
                  <div className={`absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg p-2 shadow-lg animate-fadeIn ${Z_INDEX_CLASSES.DROPDOWN_MENU}`}>
                    <Link
                      to={profileUrl}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-300 text-neutral-900 dark:text-neutral-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="w-4 h-4 text-neutral-900 dark:text-neutral-50" />
                      <span className="text-sm">{t('common:header.profile_menu', 'Profile')}</span>
                    </Link>

                    <hr className="my-2 border-neutral-200 dark:border-neutral-800" />
                    <button 
                      onClick={async () => {
                        await onSignOut();
                        navigate(signInUrl);
                        setShowUserMenu(false);
                      }}
                      className="block w-full text-left flex items-center gap-2 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-500 rounded-lg transition-colors duration-300"
                    >
                      <LogOut className="w-4 h-4 text-red-600 dark:text-red-500" />
                      <span className="text-sm">{t('common:header.logout', 'Logout')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              onLogin ? (
                <button 
                  onClick={onLogin}
                  className="px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-300 text-neutral-900 dark:text-neutral-50"
                >
                  <span className="text-sm">{t('common:header.login', 'Login')}</span>
                </button>
              ) : (
                <Link 
                  to={signInUrl} 
                  className="px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-300 text-neutral-900 dark:text-neutral-50"
                >
                  <span className="text-sm">{t('common:header.login', 'Login')}</span>
                </Link>
              )
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-3 md:hidden">
            <ThemeToggle apiClient={apiClient} />

            <button
              onClick={handleToggleLanguage}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-300 flex items-center gap-1.5 text-neutral-900 dark:text-neutral-50"
              title={t('common:change_language', 'Change Language')}
            >
              <Globe className="w-5 h-5 text-neutral-900 dark:text-neutral-50" />
              <span className="text-sm">{currentLanguage === 'zh' ? 'EN' : t('common:language.zh_short', 'ZH')}</span>
            </button>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-900 dark:text-neutral-50"
              title={t('common:header.menu', 'Menu')}
            >
              {isMenuOpen ? (
                <X className="w-5 h-5 text-neutral-900 dark:text-neutral-50" />
              ) : (
                <Menu className="w-5 h-5 text-neutral-900 dark:text-neutral-50" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-6 border-t border-neutral-200 dark:border-neutral-800 absolute left-0 right-0 w-full transition-all duration-300 ease-out bg-white dark:bg-neutral-950 shadow-xl">
            <div className="space-y-2 px-4">
              {navItems.length > 0 && navItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    window.location.href = item.href;
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-all duration-300 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-50 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  {item.name}
                </button>
              ))}

              {appNavigation.length > 0 && (
                <>
                  <hr className="my-4 border-neutral-200 dark:border-neutral-800" />
                  <div className="space-y-1">
                    {appNavigation.map((app) => {
                      const Icon = app.icon;
                      return (
                        <button
                          key={app.name}
                          onClick={() => {
                            window.location.href = app.url();
                            setIsMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded-lg transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:bg-gradient-to-r dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 text-neutral-900 dark:text-neutral-50"
                        >
                          <Icon className="w-4 h-4 text-neutral-900 dark:text-neutral-50" />
                          <span className="text-sm font-medium">{app.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="pt-4 space-y-3">
                {user && user.isLoggedIn ? (
                  <>
                    <Link
                      to={profileUrl}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-900 dark:text-neutral-50"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="w-4 h-4 text-neutral-900 dark:text-neutral-50" />
                      <span className="text-sm">{t('common:header.profile_menu', 'Profile')}</span>
                    </Link>

                    <hr className="my-2 border-neutral-200 dark:border-neutral-800" />

                    <button
                      onClick={async () => {
                        await onSignOut();
                        navigate(signInUrl);
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-500 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-red-600 dark:text-red-500" />
                      <span className="text-sm">{t('common:header.logout', 'Logout')}</span>
                    </button>
                  </>
                ) : (
                  onLogin ? (
                    <button
                      onClick={() => {
                        onLogin();
                        setIsMenuOpen(false);
                      }}
                      className="block w-full px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-800 text-sm font-medium text-center transition-all duration-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-50"
                    >
                      {t('common:header.login', 'Login')}
                    </button>
                  ) : (
                    <Link
                      to={signInUrl}
                      className="block w-full px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-800 text-sm font-medium text-center transition-all duration-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-50"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {t('common:header.login', 'Login')}
                    </Link>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
