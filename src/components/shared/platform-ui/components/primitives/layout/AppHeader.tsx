import React, { useState, useEffect, useRef } from 'react';
import { Z_INDEX_CLASSES } from '../../../styles/z-index-layers';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu, User, LogOut, Globe, MessageSquare, BarChart3, LayoutGrid,
  X, AlertCircle, History as HistoryIcon, Sun, Moon, Bell, Layers, Pin,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SpaceSwitcher } from '../../features/space/SpaceSwitcher';
import { NotificationBell } from '../../features/notification/NotificationBell';
import { NotificationApiClient } from '../../features/notification/NotificationList';
import { FeedbackMenu } from '../../features/feedback/FeedbackMenu';
import { SpaceApiClient } from '../../features/space/SpaceContext';
import { isAbsoluteUrl, isDesktop, isModifiedNavigationClick, handleHeaderAnchorClick, handleHeaderNavigationClick, openExternal, openNavigationInNewTab, resolveNavigationHref } from '../../../platform';
import { UserAvatar } from '../../features/user/UserAvatar';
import { usePinnedBuiltInNavApps } from '../../../hooks/pinnedBuiltInNavApps';
import type { UserSettingsApiClient } from '../../../hooks/useUserSettings';
import { GENISPACE_LOGO_DATA_URI } from './brandAssets';

function readStoredUserAvatarUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const u = JSON.parse(raw) as { avatarUrl?: string | null };
    const s = u.avatarUrl != null ? String(u.avatarUrl).trim() : '';
    return s || null;
  } catch {
    return null;
  }
}

export interface User {
  isLoggedIn?: boolean;
  email?: string;
  name?: string;

  avatarUrl?: string | null;
  token?: string;
}

/**
 * One team-enabled built-in application shortcut (Odoo-style app bar).
 * Parent should resolve `href` (e.g. `${appOrigin}/${appSlug}`) from config + team context.
 */
export interface EnabledBuiltInAppItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface AppHeaderProps {

  currentApp?: 'console' | 'workbench' | 'chat' | 'workspace';

  /** Whether to show the Console entry. Gate this by the user's console access
   *  (e.g. in the Hub, application-only members have no console access). Default true. */
  showConsoleEntry?: boolean;

  /** Whether to show the Workspace (launcher) entry — the apps/agents home on the
   *  Hub. Default true; it's the universal "back to the launcher" affordance. */
  showWorkspaceEntry?: boolean;

  /** Whether to show the Chat entry. Gate this by whether the user has any usable
   *  chat target (the platform assistant or at least one accessible agent). When
   *  the user can open nothing, hide it rather than dead-ending on `/chat/assistant`.
   *  Use `useChatEntryTarget` to compute this consistently across planes. Default true. */
  showChatEntry?: boolean;

  /** In-app path the Chat entry opens, relative to `navigationConfig.chatUrl`.
   *  Defaults to `/chat/assistant`. Pass the resolved target from
   *  `useChatEntryTarget` so users without assistant access land on a usable agent. */
  chatLandingPath?: string;

  navigationConfig: {
    /** Console (management) base URL — used for the "Console" entry button. */
    consoleUrl: string;
    /**
     * Hub (main site / home) base URL — used for the brand/logo "home" link and
     * the "Workspace" (launcher) entry. Falls back to
     * `window.__APP_CONFIG__.APP_URL` (Hub base) then `consoleUrl` when omitted.
     */
    appUrl?: string;
    workbenchUrl: string;
    chatUrl: string;
  };

  /**
   * Built-in apps the current team has enabled (platform API). Shown after Console (desktop), before theme; in the mobile menu after Console.
   */
  enabledBuiltInApps?: EnabledBuiltInAppItem[];

  /** When the user is inside one of these apps, pass its `id` to highlight the matching shortcut.
   */
  activeBuiltInAppId?: string | null;

  /** Used to persist pinned built-in nav apps via `PUT /users/me/settings`. */
  userSettingsApiClient?: UserSettingsApiClient;

  user?: User | null;
  onSignOut: () => void | Promise<void>;
  profileUrl?: string;

  showSpaceSwitcher?: boolean;
  /** @deprecated Use showSpaceSwitcher */
  showTeamSwitcher?: boolean;
  showNotifications?: boolean;
  showFeedback?: boolean;

  notificationApiClient?: NotificationApiClient;
  spaceApiClient?: SpaceApiClient;
  /** @deprecated Use spaceApiClient */
  teamApiClient?: SpaceApiClient;
  getUnreadNotificationsCount?: () => Promise<{ success: boolean; data: { total: number } }>;
  onViewAllNotifications?: () => void;

  reportIssueUrl?: string;
  feedbackRecordsUrl?: string;
  onReportIssue?: () => void;
  onFeedbackRecords?: () => void;

  brandChannel?: string;

  /**
   * Optional host-provided brand logo URL (static config). The bundled
   * GeniSpace mark renders by default — and immediately — so the app identity
   * never depends on the hosting plane serving `/logo.svg`; a custom URL only
   * augments it and falls back to the bundled mark if it fails to load.
   */
  brandLogoUrl?: string;

  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  currentLanguage?: string;
  onToggleLanguage?: () => void;

  manageSpaceUrl?: string;
  createSpaceUrl?: string;
  /** @deprecated Use manageSpaceUrl */
  manageTeamUrl?: string;
  /** @deprecated Use createSpaceUrl */
  createTeamUrl?: string;

  signInUrl?: string;

  titleBarDrag?: boolean;

  trailingExtras?: React.ReactNode;

  compactHeight?: boolean;

  teamLinksOpenExternal?: boolean;

  userMenuBeforeLogout?: (closeMenu: () => void) => React.ReactNode;
}

export function AppHeader({
  currentApp,
  showConsoleEntry = true,
  showWorkspaceEntry = true,
  showChatEntry = true,
  chatLandingPath = '/chat/assistant',
  navigationConfig,
  user,
  onSignOut,
  profileUrl,
  showSpaceSwitcher,
  showTeamSwitcher = false,
  showNotifications = false,
  showFeedback = false,
  notificationApiClient,
  getUnreadNotificationsCount,
  onViewAllNotifications,
  reportIssueUrl,
  feedbackRecordsUrl,
  onReportIssue,
  onFeedbackRecords,
  theme,
  onToggleTheme,
  currentLanguage,
  onToggleLanguage,
  manageSpaceUrl,
  createSpaceUrl,
  manageTeamUrl = '/space',
  createTeamUrl = '/space?action=create',
  signInUrl = '/sign-in',
  titleBarDrag = false,
  trailingExtras,
  compactHeight = false,
  teamLinksOpenExternal = false,
  userMenuBeforeLogout,
  enabledBuiltInApps,
  activeBuiltInAppId = null,
  userSettingsApiClient,
  brandLogoUrl,
}: AppHeaderProps) {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const showSwitcher = showSpaceSwitcher ?? showTeamSwitcher;
  const resolvedManageSpaceUrl = manageSpaceUrl ?? manageTeamUrl;
  const resolvedCreateSpaceUrl = createSpaceUrl ?? createTeamUrl;
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showBuiltInAppsMenu, setShowBuiltInAppsMenu] = useState(false);
  // Deterministic app identity: the bundled mark renders immediately; a custom
  // brandLogoUrl (host config) only augments it and degrades back on load error.
  const [brandLogoFailed, setBrandLogoFailed] = useState(false);
  const brandLogoSrc =
    brandLogoUrl && !brandLogoFailed ? brandLogoUrl : GENISPACE_LOGO_DATA_URI;
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const builtInAppsMenuRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = user?.isLoggedIn ?? false;

  const displayAvatarUrl: string | null =
    (user?.avatarUrl != null ? String(user.avatarUrl).trim() || null : null) ??
    readStoredUserAvatarUrl();

  const isInConsole = currentApp === 'console';
  const isInChat = currentApp === 'chat';
  const isInWorkspace = currentApp === 'workspace';

  const profileIsAbsolute = Boolean(profileUrl && isAbsoluteUrl(profileUrl));

  const handleGoToProfile = () => {
    if (!profileUrl) return;
    const resolved = profileUrl.startsWith('//')
      ? `${window.location.protocol}${profileUrl}`
      : profileUrl;
    if (profileIsAbsolute) {
      if (isDesktop()) {
        openExternal(resolved);
      } else {
        window.location.href = resolved;
      }
    } else {
      navigate(profileUrl);
    }
    setShowUserMenu(false);
  };

  const consoleUrl = `${navigationConfig.consoleUrl}/dashboard`;
  const chatUrl = `${navigationConfig.chatUrl}${chatLandingPath}`;
  // Brand/logo links to the Hub (main site) home — NOT the console. Prefer the
  // explicit appUrl (Hub) prop, then the runtime config's APP_URL, then consoleUrl.
  const runtimeAppUrl =
    (typeof window !== 'undefined' &&
      (window as Window & { __APP_CONFIG__?: { APP_URL?: string } }).__APP_CONFIG__?.APP_URL) ||
    '';
  const brandUrl = navigationConfig.appUrl || runtimeAppUrl || navigationConfig.consoleUrl;
  // Workspace lives on the Hub home. Mirror the brand link's base; a missing
  // Hub base degrades to the in-app relative route.
  const workspaceUrl = `${brandUrl.replace(/\/$/, '')}/workspace`;

  const openInNewTabHint = t('header.open_in_new_tab_hint', '⌘/Ctrl+Click to open in new tab');

  const handleGoToWorkspace = (event: React.MouseEvent) => {
    handleHeaderNavigationClick(event, workspaceUrl);
  };

  const handleGoToConsole = (event: React.MouseEvent) => {
    handleHeaderNavigationClick(event, consoleUrl);
  };

  const handleGoToChat = (event: React.MouseEvent) => {
    if (isModifiedNavigationClick(event)) {
      openNavigationInNewTab(chatUrl);
      return;
    }
    if (isDesktop()) return;
    window.location.href = chatUrl;
  };

  const handleToggleLanguage = () => {
    if (onToggleLanguage) {
      onToggleLanguage();
    } else {
      const newLang = i18n.language === 'zh' ? 'en' : 'zh';
      i18n.changeLanguage(newLang);
    }
  };

  const handleToggleTheme = () => {
    if (onToggleTheme) {
      onToggleTheme();
    }
  };

  // Cross-origin logout linkage lives in each app's onSignOut (see
  // broadcastLogoutNotifications in shared-utils); here we only await it and
  // then leave for the sign-in page.
  const handleSignOut = async () => {
    try {
      await onSignOut();
    } catch (error) {
      console.error('退出登录失败:', error);
    } finally {
      if (signInUrl) {
        window.location.href = signInUrl;
      }
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }

      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }

      if (builtInAppsMenuRef.current && !builtInAppsMenuRef.current.contains(event.target as Node)) {
        setShowBuiltInAppsMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayLanguage = currentLanguage || i18n.language || 'zh';

  const builtInApps = enabledBuiltInApps ?? [];
  const { pinnedIds, pin, unpin } = usePinnedBuiltInNavApps({ apiClient: userSettingsApiClient });

  const pinnedNavApps = React.useMemo(() => {
    const byId = new Map(builtInApps.map((app) => [app.id, app]));
    return pinnedIds
      .map((id) => byId.get(id))
      .filter((app): app is EnabledBuiltInAppItem => app != null);
  }, [builtInApps, pinnedIds]);

  const dropdownBuiltInApps = React.useMemo(() => {
    const pinnedSet = new Set(pinnedIds);
    return builtInApps.filter((app) => !pinnedSet.has(app.id));
  }, [builtInApps, pinnedIds]);

  const hasDropdownBuiltInApps = dropdownBuiltInApps.length > 0;

  const builtInNavButtonClass = (isActive: boolean) =>
    `flex max-w-[10rem] items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 ${
      isActive
        ? 'bg-gradient-to-r from-blue-400 to-purple-500 dark:from-blue-400 dark:to-purple-500 text-white'
        : 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:bg-gradient-to-r dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 text-neutral-900 dark:text-neutral-50'
    }`;

  const renderPinnedBuiltInNavButton = (app: EnabledBuiltInAppItem) => {
    const IconCmp = app.icon ?? Layers;
    const isActive = activeBuiltInAppId != null && activeBuiltInAppId === app.id;
    const unpinHint = t('header.unpin_from_nav_hint', 'Shift+Click to unpin');
    return (
      <button
        key={app.id}
        type="button"
        onClick={(event) => {
          if (event.shiftKey && !event.metaKey && !event.ctrlKey) {
            void unpin(app.id);
            return;
          }
          handleHeaderNavigationClick(event, app.href, navigate);
        }}
        className={builtInNavButtonClass(isActive)}
        title={`${app.label} (${unpinHint})`}
      >
        <IconCmp className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-neutral-900 dark:text-neutral-50'}`} />
        <span className={`min-w-0 truncate text-sm font-medium ${isActive ? 'text-white' : ''}`}>{app.label}</span>
      </button>
    );
  };

  const renderBuiltInDropdownItem = (app: EnabledBuiltInAppItem, onNavigate: (event: React.MouseEvent) => void) => {
    const IconCmp = app.icon ?? Layers;
    const isActive = activeBuiltInAppId != null && activeBuiltInAppId === app.id;
    return (
      <div
        key={app.id}
        className={`flex w-full items-center gap-0.5 pr-1 text-neutral-900 dark:text-neutral-50 ${
          isActive ? 'bg-neutral-100 dark:bg-neutral-800' : ''
        }`}
      >
        <button
          type="button"
          role="menuitem"
          onClick={onNavigate}
          className={`flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800`}
        >
          <IconCmp className="h-4 w-4 shrink-0 text-neutral-900 dark:text-neutral-50" />
          <span className="min-w-0 flex-1 truncate font-medium">{app.label}</span>
        </button>
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-50"
          title={t('header.pin_app_to_nav', 'Pin to navigation')}
          aria-label={t('header.pin_app_to_nav', 'Pin to navigation')}
          onClick={(event) => {
            event.stopPropagation();
            void pin(app.id);
          }}
        >
          <Pin className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    );
  };

  const headerDragStyle = titleBarDrag
    ? ({ WebkitAppRegion: 'drag' } as React.CSSProperties)
    : undefined;
  const noDragStyle = titleBarDrag
    ? ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties)
    : undefined;
  const headerHeightClass = compactHeight ? 'h-12' : 'h-16';

  return (
    <header
      className={`fixed top-0 left-0 right-0 ${headerHeightClass} bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 ${Z_INDEX_CLASSES.FIXED_HEADER}`}
      style={headerDragStyle}
    >
      <div className="h-full px-4 flex items-center min-w-0">
        <div
          className="flex min-w-0 flex-shrink-0 items-center gap-2 sm:gap-3"
          style={noDragStyle}
        >
          <a
            href={resolveNavigationHref(brandUrl)}
            onClick={(event) => handleHeaderAnchorClick(event, brandUrl)}
            className="flex min-w-0 items-center gap-2 hover:opacity-80 transition-opacity"
            title={`${t('go_to_home', 'Go to Home')} (${openInNewTabHint})`}
          >
            <div className="h-9 w-9 shrink-0 sm:h-10 sm:w-10">
              <img
                src={brandLogoSrc}
                alt="GeniSpace"
                className="h-full w-full"
                onError={() => setBrandLogoFailed(true)}
              />
            </div>
            <div className="relative min-w-0">
              <span className="text-base font-bold text-neutral-900 dark:text-neutral-50 sm:text-xl">
                GeniSpace
              </span>
            </div>
          </a>
        </div>

        {titleBarDrag && (
          <div
            className="flex-1 min-h-[1rem] min-w-[2rem] self-stretch"
            aria-hidden
          />
        )}

        <div
          className={`flex min-w-0 items-center gap-2 lg:gap-4 ${titleBarDrag ? '' : 'flex-1'} justify-end`}
          style={noDragStyle}
        >
          <div className="min-w-0 flex-1 shrink lg:hidden" aria-hidden />

          {showSwitcher && (
            <div className="order-2 min-w-0 max-w-[min(52vw,10.5rem)] shrink lg:order-none lg:max-w-none lg:shrink-0">
              <SpaceSwitcher
                className="min-w-0"
                manageSpaceUrl={resolvedManageSpaceUrl}
                createSpaceUrl={resolvedCreateSpaceUrl}
                openSpaceLinksInExternalBrowser={teamLinksOpenExternal}
              />
            </div>
          )}

          {showSwitcher && (
            <div className="hidden h-6 w-px shrink-0 bg-neutral-200 dark:bg-neutral-800 lg:block" />
          )}

          <div className="hidden lg:flex items-center gap-2">
            {showWorkspaceEntry && (
              <button
                onClick={handleGoToWorkspace}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 ${
                  isInWorkspace
                    ? 'bg-gradient-to-r from-blue-400 to-purple-500 dark:from-blue-400 dark:to-purple-500 text-white'
                    : 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:bg-gradient-to-r dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 text-neutral-900 dark:text-neutral-50'
                }`}
                title={`${t('workspace', 'Workspace')} (${openInNewTabHint})`}
              >
                <LayoutGrid className={`w-4 h-4 ${isInWorkspace ? 'text-white' : 'text-neutral-900 dark:text-neutral-50'}`} />
                <span className="text-sm font-medium">{t('workspace', 'Workspace')}</span>
              </button>
            )}

            {pinnedNavApps.map(renderPinnedBuiltInNavButton)}

            {showChatEntry && (
              <button
                onClick={handleGoToChat}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 ${
                  isInChat
                    ? 'bg-gradient-to-r from-blue-400 to-purple-500 dark:from-blue-400 dark:to-purple-500 text-white'
                    : 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:bg-gradient-to-r dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 text-neutral-900 dark:text-neutral-50'
                }`}
                title={`${t('chat', 'Chat')} (${openInNewTabHint})`}
              >
                <MessageSquare className={`w-4 h-4 ${isInChat ? 'text-white' : 'text-neutral-900 dark:text-neutral-50'}`} />
                <span className="text-sm font-medium">{t('chat', 'Chat')}</span>
              </button>
            )}

            {showConsoleEntry && (
              <button
                onClick={handleGoToConsole}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 ${
                  isInConsole
                    ? 'bg-gradient-to-r from-blue-400 to-purple-500 dark:from-blue-400 dark:to-purple-500 text-white'
                    : 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:bg-gradient-to-r dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 text-neutral-900 dark:text-neutral-50'
                }`}
                title={`${t('console', 'Console')} (${openInNewTabHint})`}
              >
                <BarChart3 className={`w-4 h-4 ${isInConsole ? 'text-white' : 'text-neutral-900 dark:text-neutral-50'}`} />
                <span className="text-sm font-medium">{t('console', 'Console')}</span>
              </button>
            )}

            {hasDropdownBuiltInApps ? (
              <div className="flex items-center self-stretch">
                <div className="h-6 w-px shrink-0 self-center bg-neutral-200 dark:bg-neutral-800" aria-hidden />
                <div className="flex min-h-9 min-w-[2.75rem] items-center justify-center self-center px-3 sm:min-h-10 sm:min-w-[2.875rem]">
                  <div className="relative shrink-0" ref={builtInAppsMenuRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMobileMenu(false);
                        setShowBuiltInAppsMenu((o) => !o);
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-900 transition-colors hover:bg-neutral-100 dark:text-neutral-50 dark:hover:bg-neutral-800 sm:h-10 sm:w-10"
                      aria-expanded={showBuiltInAppsMenu}
                      aria-haspopup="menu"
                      title={t('header.enabled_built_in_apps', 'Team apps')}
                    >
                      <Layers className="h-5 w-5 shrink-0 text-neutral-900 dark:text-neutral-50 sm:h-[1.35rem] sm:w-[1.35rem]" />
                    </button>

                    {showBuiltInAppsMenu ? (
                      <div
                        className={`absolute left-1/2 z-50 mt-1.5 min-w-[12rem] max-w-[min(calc(100vw-2rem),18rem)] -translate-x-1/2 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-950 ${Z_INDEX_CLASSES.DROPDOWN_MENU}`}
                        role="menu"
                        aria-label={t('header.enabled_built_in_apps', 'Team apps')}
                      >
                        <div className="custom-scrollbar max-h-[min(22rem,calc(100vh-8rem))] overflow-y-auto py-1">
                          {dropdownBuiltInApps.map((app) =>
                            renderBuiltInDropdownItem(app, (event) => {
                              handleHeaderNavigationClick(event, app.href, navigate);
                              setShowBuiltInAppsMenu(false);
                            })
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="h-6 w-px shrink-0 self-center bg-neutral-200 dark:bg-neutral-800" aria-hidden />
              </div>
            ) : null}
          </div>

          {!hasDropdownBuiltInApps ? (
            <div className="h-6 w-px shrink-0 bg-neutral-200 dark:bg-neutral-800 hidden lg:block" aria-hidden />
          ) : null}

          {onToggleTheme && (
            <div className="hidden lg:block">
              <button
                type="button"
                onClick={handleToggleTheme}
                className="flex shrink-0 items-center gap-1 rounded-lg p-2 text-neutral-900 transition-all duration-300 hover:bg-neutral-100 dark:text-neutral-50 dark:hover:bg-neutral-800"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5 text-neutral-900 dark:text-neutral-50" />
                ) : (
                  <Moon className="h-5 w-5 text-neutral-900 dark:text-neutral-50" />
                )}
              </button>
            </div>
          )}

          <div className="hidden lg:block">
            <button
              onClick={handleToggleLanguage}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-300 flex items-center gap-1.5 text-neutral-900 dark:text-neutral-50"
              title={t('header.change_language', 'Change Language')}
            >
              <Globe className="w-5 h-5 text-neutral-900 dark:text-neutral-50" />
              <span className="text-sm">{displayLanguage === 'zh' ? 'EN' : t('language.zh_short', 'ZH')}</span>
            </button>
          </div>

          {showNotifications && notificationApiClient && (
            <div className="hidden lg:block">
              <NotificationBell
                apiClient={notificationApiClient}
                getUnreadCount={getUnreadNotificationsCount}
                onViewAll={onViewAllNotifications}
              />
            </div>
          )}

          {showFeedback && (
            <div className="hidden lg:block">
              <FeedbackMenu
                reportIssueUrl={reportIssueUrl}
                feedbackRecordsUrl={feedbackRecordsUrl}
                onReportIssue={onReportIssue}
                onFeedbackRecords={onFeedbackRecords}
              />
            </div>
          )}

          {trailingExtras ? (
            <div className="order-3 shrink-0 lg:order-none">{trailingExtras}</div>
          ) : null}

          {isLoggedIn ? (
            <div className="user-menu-container relative hidden lg:block" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-300"
                title={t('header.profile', 'Profile')}
              >
                <UserAvatar
                  name={user?.name || ''}
                  email={user?.email}
                  avatarUrl={displayAvatarUrl}
                  sizeClassName="h-8 w-8"
                />
              </button>

              {showUserMenu && (
                <div
                  className={`app-header-user-menu absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg p-2 shadow-lg animate-fadeIn ${Z_INDEX_CLASSES.DROPDOWN_MENU}`}
                >
                  {profileUrl ? (
                    profileIsAbsolute ? (
                      <button
                        type="button"
                        onClick={handleGoToProfile}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-300 text-neutral-900 dark:text-neutral-50 text-left"
                      >
                        <User className="w-4 h-4 text-neutral-900 dark:text-neutral-50" />
                        <span className="text-sm">{t('header.profile_menu', 'Profile')}</span>
                      </button>
                    ) : (
                    <Link
                      to={profileUrl}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-300 text-neutral-900 dark:text-neutral-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="w-4 h-4 text-neutral-900 dark:text-neutral-50" />
                      <span className="text-sm">{t('header.profile_menu', 'Profile')}</span>
                    </Link>
                    )
                  ) : (
                    <button
                      onClick={() => {
                        if (profileUrl) {
                          navigate(profileUrl);
                        }
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-300 text-neutral-900 dark:text-neutral-50"
                    >
                      <User className="w-4 h-4 text-neutral-900 dark:text-neutral-50" />
                      <span className="text-sm">{t('header.profile_menu', 'Profile')}</span>
                    </button>
                  )}

                  {userMenuBeforeLogout?.(() => setShowUserMenu(false))}

                  <hr className="my-2 border-neutral-200 dark:border-neutral-800" />
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 p-2 text-left hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-500 rounded-lg transition-colors duration-300"
                  >
                    <LogOut className="w-4 h-4 text-red-600 dark:text-red-500" />
                    <span className="text-sm">{t('header.logout', 'Logout')}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden lg:block">
              <Link 
                to={signInUrl || '/sign-in'} 
                className="px-4 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-300 text-neutral-900 dark:text-neutral-50"
              >
                <span className="text-sm">{t('header.login', 'Login')}</span>
              </Link>
            </div>
          )}

          <div className="relative order-4 lg:order-none lg:hidden" ref={mobileMenuRef}>
            <button 
              onClick={() => {
                setShowBuiltInAppsMenu(false);
                setShowMobileMenu(!showMobileMenu);
              }}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title={t('header.menu', 'Menu')}
            >
              {showMobileMenu ? <X className="w-5 h-5 text-neutral-900 dark:text-neutral-50" /> : <Menu className="w-5 h-5 text-neutral-900 dark:text-neutral-50" />}
            </button>

            {showMobileMenu && (
              <div className={`absolute right-0 mt-2 w-64 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl animate-fadeIn dark:border-neutral-800 dark:bg-neutral-950 ${Z_INDEX_CLASSES.DROPDOWN_MENU}`}>
                <div className="custom-scrollbar max-h-80 overflow-y-auto">
                  <div className="space-y-1 p-2">
                    {pinnedNavApps.length > 0 ? (
                      <div className="mb-2 space-y-1">
                        {pinnedNavApps.map((app) => {
                          const IconCmp = app.icon ?? Layers;
                          const isActive = activeBuiltInAppId != null && activeBuiltInAppId === app.id;
                          return (
                            <button
                              key={app.id}
                              type="button"
                              onClick={(event) => {
                                if (event.shiftKey && !event.metaKey && !event.ctrlKey) {
                                  void unpin(app.id);
                                  return;
                                }
                                handleHeaderNavigationClick(event, app.href, navigate);
                                setShowMobileMenu(false);
                              }}
                              className={`flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm transition-colors text-neutral-900 dark:text-neutral-50 ${
                                isActive
                                  ? 'bg-neutral-100 dark:bg-neutral-800'
                                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                              }`}
                              title={`${app.label} (${t('header.unpin_from_nav_hint', 'Shift+Click to unpin')})`}
                            >
                              <IconCmp className="h-4 w-4 shrink-0 text-neutral-900 dark:text-neutral-50" />
                              <span className="min-w-0 flex-1 truncate font-medium">{app.label}</span>
                            </button>
                          );
                        })}
                        <div className="my-2 h-px bg-neutral-200 dark:bg-neutral-800" aria-hidden />
                      </div>
                    ) : null}
                    <div className="mb-2 space-y-1">
                      {showWorkspaceEntry && (
                        <button
                          onClick={(event) => {
                            handleGoToWorkspace(event);
                            setShowMobileMenu(false);
                          }}
                          className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-neutral-900 dark:text-neutral-50 ${
                            isInWorkspace
                              ? 'bg-neutral-100 dark:bg-neutral-800'
                              : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <LayoutGrid className="w-4 h-4 text-neutral-900 dark:text-neutral-50" />
                          <span className="text-sm">{t('workspace', 'Workspace')}</span>
                        </button>
                      )}
                      {showChatEntry && (
                        <button
                          onClick={(event) => {
                            handleGoToChat(event);
                            setShowMobileMenu(false);
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-900 dark:text-neutral-50"
                        >
                          <MessageSquare className="w-4 h-4 text-neutral-900 dark:text-neutral-50" />
                          <span className="text-sm">{t('chat', 'Chat')}</span>
                        </button>
                      )}
                      {showConsoleEntry && (
                        <button
                          onClick={(event) => {
                            handleGoToConsole(event);
                            setShowMobileMenu(false);
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-900 dark:text-neutral-50"
                        >
                          <BarChart3 className="w-4 h-4 text-neutral-900 dark:text-neutral-50" />
                          <span className="text-sm">{t('console', 'Console')}</span>
                        </button>
                      )}
                    </div>

                    {hasDropdownBuiltInApps ? (
                      <>
                        <div className="my-2 h-px bg-neutral-200 dark:bg-neutral-800" aria-hidden />
                        <div className="space-y-1">
                          <div className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                            {t('header.enabled_built_in_apps', 'Team apps')}
                          </div>
                          {dropdownBuiltInApps.map((app) => {
                            const IconCmp = app.icon ?? Layers;
                            const isActive = activeBuiltInAppId != null && activeBuiltInAppId === app.id;
                            return (
                              <div
                                key={app.id}
                                className={`flex w-full items-center gap-0.5 ${
                                  isActive ? 'rounded-lg bg-neutral-100 dark:bg-neutral-800' : ''
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    handleHeaderNavigationClick(event, app.href, navigate);
                                    setShowMobileMenu(false);
                                  }}
                                  className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg p-2 text-left text-sm transition-colors text-neutral-900 dark:text-neutral-50 ${
                                    isActive
                                      ? ''
                                      : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                  }`}
                                >
                                  <IconCmp className="h-4 w-4 shrink-0 text-neutral-900 dark:text-neutral-50" />
                                  <span className="min-w-0 flex-1 truncate font-medium">{app.label}</span>
                                </button>
                                <button
                                  type="button"
                                  className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-50"
                                  title={t('header.pin_app_to_nav', 'Pin to navigation')}
                                  aria-label={t('header.pin_app_to_nav', 'Pin to navigation')}
                                  onClick={() => void pin(app.id)}
                                >
                                  <Pin className="h-3.5 w-3.5" aria-hidden />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : null}

                    <hr className="my-2 border-neutral-200 dark:border-neutral-800" />

                    {onToggleTheme && (
                      <button
                        type="button"
                        onClick={() => {
                          handleToggleTheme();
                          setShowMobileMenu(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-neutral-900 transition-colors hover:bg-neutral-100 dark:text-neutral-50 dark:hover:bg-neutral-800"
                      >
                        {theme === 'dark' ? (
                          <Sun className="h-4 w-4 shrink-0 text-neutral-900 dark:text-neutral-50" />
                        ) : (
                          <Moon className="h-4 w-4 shrink-0 text-neutral-900 dark:text-neutral-50" />
                        )}
                        <span className="text-sm">
                          {theme === 'dark'
                            ? t('header.switch_to_light_theme', 'Light mode')
                            : t('header.switch_to_dark_theme', 'Dark mode')}
                        </span>
                      </button>
                    )}

                    {showNotifications && onViewAllNotifications && (
                      <button
                        onClick={() => {
                          onViewAllNotifications();
                          setShowMobileMenu(false);
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-900 dark:text-neutral-50"
                      >
                        <Bell className="w-4 h-4 text-neutral-900 dark:text-neutral-50" />
                        <span className="text-sm">{t('header.notifications', 'Notifications')}</span>
                      </button>
                    )}

                    {showFeedback && reportIssueUrl && (
                      <button
                        onClick={(event) => {
                          handleHeaderNavigationClick(event, reportIssueUrl, navigate);
                          setShowMobileMenu(false);
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-900 dark:text-neutral-50"
                      >
                        <AlertCircle className="w-4 h-4 text-neutral-900 dark:text-neutral-50" />
                        <span className="text-sm">{t('header.report_issue_menu', 'Report Issue')}</span>
                      </button>
                    )}

                    {showFeedback && feedbackRecordsUrl && (
                      <button
                        onClick={(event) => {
                          handleHeaderNavigationClick(event, feedbackRecordsUrl, navigate);
                          setShowMobileMenu(false);
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-900 dark:text-neutral-50"
                      >
                        <HistoryIcon className="w-4 h-4 text-neutral-900 dark:text-neutral-50" />
                        <span className="text-sm">{t('header.feedback_records', 'Feedback Records')}</span>
                      </button>
                    )}

                    <hr className="my-2 border-neutral-200 dark:border-neutral-800" />

                    <button
                      onClick={() => {
                        handleToggleLanguage();
                        setShowMobileMenu(false);
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-900 dark:text-neutral-50"
                    >
                      <Globe className="w-4 h-4 text-neutral-900 dark:text-neutral-50" />
                      <span className="text-sm">{displayLanguage === 'zh' ? 'EN' : t('language.zh_short', 'ZH')}</span>
                    </button>

                    {isLoggedIn ? (
                      <>
                        {profileUrl && (
                          profileIsAbsolute ? (
                            <button
                              type="button"
                              onClick={() => {
                                handleGoToProfile();
                                setShowMobileMenu(false);
                              }}
                              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-900 dark:text-neutral-50 text-left"
                            >
                              <User className="w-4 h-4 text-neutral-900 dark:text-neutral-50" />
                              <span className="text-sm">{t('header.profile_menu', 'Profile')}</span>
                            </button>
                          ) : (
                          <Link 
                            to={profileUrl} 
                            className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-900 dark:text-neutral-50"
                            onClick={() => setShowMobileMenu(false)}
                          >
                            <User className="w-4 h-4 text-neutral-900 dark:text-neutral-50" />
                            <span className="text-sm">{t('header.profile_menu', 'Profile')}</span>
                          </Link>
                          )
                        )}

                        {userMenuBeforeLogout?.(() => setShowMobileMenu(false))}

                        <hr className="my-2 border-neutral-200 dark:border-neutral-800" />

                        <button
                          onClick={async () => {
                            setShowMobileMenu(false);
                            await handleSignOut();
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-500 transition-colors"
                        >
                          <LogOut className="w-4 h-4 text-red-600 dark:text-red-500" />
                          <span className="text-sm">{t('header.logout', 'Logout')}</span>
                        </button>
                      </>
                    ) : (

                      <Link 
                        to={signInUrl || '/sign-in'} 
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-900 dark:text-neutral-50"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        <span className="text-sm">{t('header.login', 'Login')}</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
