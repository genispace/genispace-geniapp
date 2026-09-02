import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Z_INDEX_CLASSES } from '../../../styles/z-index-layers';
import { ChevronDown, Users, User, Plus, Check, Building, Loader, Search, X } from 'lucide-react';
import { useSpace, getSpaceIconType, getSpaceIconStyle, type Space } from './SpaceContext';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { openExternal, resolveAbsoluteUrl } from '../../../platform';

export interface SpaceSwitcherProps {
  className?: string;
  manageSpaceUrl?: string;
  createSpaceUrl?: string;
  /** @deprecated Use manageSpaceUrl */
  manageTeamUrl?: string;
  /** @deprecated Use createSpaceUrl */
  createTeamUrl?: string;
  openSpaceLinksInExternalBrowser?: boolean;
  /** @deprecated Use openSpaceLinksInExternalBrowser */
  openTeamLinksInExternalBrowser?: boolean;
}

export function SpaceSwitcher({
  className = '',
  manageSpaceUrl,
  createSpaceUrl,
  manageTeamUrl,
  createTeamUrl,
  openSpaceLinksInExternalBrowser,
  openTeamLinksInExternalBrowser = false,
}: SpaceSwitcherProps) {
  const resolvedManageUrl = manageSpaceUrl ?? manageTeamUrl ?? '/space';
  const resolvedCreateUrl = createSpaceUrl ?? createTeamUrl ?? '/space?action=create';
  const openLinksExternally = openSpaceLinksInExternalBrowser ?? openTeamLinksInExternalBrowser;

  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const switchingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modalHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modalShowTimeRef = useRef<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation('common');

  const openSpaceLink = (href: string) => {
    openExternal(resolveAbsoluteUrl(href));
  };

  const {
    spaces,
    currentSpace,
    loading,
    isSwitchingSpace,
    switchSpace
  } = useSpace();

  const getRoleDisplayName = (role: string): string => {
    const normalizedRole = role.toLowerCase();
    return t(`space.roles.${normalizedRole}`, t(`team.roles.${normalizedRole}`, role));
  };

  const filteredSpaces = useMemo(() => {
    if (!searchQuery.trim()) {
      return spaces;
    }
    const query = searchQuery.toLowerCase().trim();
    return spaces.filter(space =>
      space.name.toLowerCase().includes(query)
    );
  }, [spaces, searchQuery]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (switchingTimeoutRef.current) {
        clearTimeout(switchingTimeoutRef.current);
      }
      if (modalHideTimeoutRef.current) {
        clearTimeout(modalHideTimeoutRef.current);
      }
    };
  }, []);

  const showModalWithDebounce = useCallback(() => {
    if (modalHideTimeoutRef.current) {
      clearTimeout(modalHideTimeoutRef.current);
      modalHideTimeoutRef.current = null;
    }

    setShowModal(prev => {
      if (!prev) {
        modalShowTimeRef.current = Date.now();
        return true;
      }
      return prev;
    });
  }, []);

  const hideModalWithDebounce = useCallback(() => {
    const hideModal = () => {
      const showDuration = Date.now() - modalShowTimeRef.current;
      const minShowTime = 500;

      if (showDuration < minShowTime) {
        setTimeout(() => setShowModal(false), minShowTime - showDuration);
      } else {
        setShowModal(false);
      }
    };

    modalHideTimeoutRef.current = setTimeout(hideModal, 200);
  }, []);

  useEffect(() => {
    if (isSwitchingSpace || isSwitching) {
      showModalWithDebounce();
    } else {
      hideModalWithDebounce();
    }
  }, [isSwitchingSpace, isSwitching, showModalWithDebounce, hideModalWithDebounce]);

  const handleSpaceSwitch = async (space: Space) => {
    if (isSwitching) return;

    try {
      setIsOpen(false);
      setIsSwitching(true);
      await switchSpace(space);
    } catch (error) {
      console.error('Failed to switch space:', error);
    } finally {
      if (switchingTimeoutRef.current) {
        clearTimeout(switchingTimeoutRef.current);
      }
      switchingTimeoutRef.current = setTimeout(() => {
        setIsSwitching(false);
      }, 300);
    }
  };

  if (!currentSpace) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="animate-pulse bg-neutral-200 dark:bg-neutral-700 h-8 w-32 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all duration-300 group text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
        disabled={loading}
      >
        <div className={`p-1 rounded ${getSpaceIconStyle(currentSpace)}`}>
          {(() => {
            const iconType = getSpaceIconType(currentSpace);
            switch (iconType) {
              case 'personal':
              case 'personal-pro':
                return <User className="w-3 h-3" />;
              case 'enterprise':
                return <Building className="w-3 h-3" />;
              default:
                return <Users className="w-3 h-3" />;
            }
          })()}
        </div>

        <span className="text-sm font-medium truncate max-w-[60px] sm:max-w-[100px] md:max-w-[120px]">
          {currentSpace.name}
        </span>

        <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {isOpen && (
        <div
          className={`genispace-dropdown-panel-surface absolute top-full right-0 left-auto mt-1 w-64 max-w-[min(18rem,calc(100vw-1rem))] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg sm:w-72 md:left-0 md:right-auto md:max-w-none ${Z_INDEX_CLASSES.DROPDOWN_MENU} overflow-hidden`}
        >
          <div className="p-2 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{t('header.switch_space', 'Switch Space')}</span>
              {openLinksExternally ? (
                <button
                  type="button"
                  className="text-xs text-brand-primary dark:text-neutral-400 hover:text-brand-primary-light dark:hover:text-neutral-300"
                  onClick={() => {
                    setIsOpen(false);
                    openSpaceLink(resolvedManageUrl);
                  }}
                >
                  {t('header.manage', 'Manage')}
                </button>
              ) : (
              <Link
                to={resolvedManageUrl}
                className="text-xs text-brand-primary dark:text-neutral-400 hover:text-brand-primary-light dark:hover:text-neutral-300"
                onClick={() => setIsOpen(false)}
              >
                {t('header.manage', 'Manage')}
              </Link>
              )}
            </div>
          </div>

          {spaces.length > 0 && (
            <div className="p-2 border-b border-neutral-100 dark:border-neutral-700">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('space.search.placeholder', 'Search spaces...')}
                  className="w-full pl-8 pr-8 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-primary text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors"
                  >
                    <X className="w-3 h-3 text-neutral-400" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {spaces.length === 0 ? (
              <div className="p-4 text-center text-neutral-500 dark:text-neutral-400">
                <Building className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('header.no_spaces', 'No spaces')}</p>
              </div>
            ) : filteredSpaces.length === 0 ? (
              <div className="p-4 text-center text-neutral-500 dark:text-neutral-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('space.search.no_match', 'No matching spaces found')}</p>
              </div>
            ) : (
              <div className="p-2">
                {filteredSpaces.map((space) => (
                  <button
                    key={space.id}
                    onClick={() => handleSpaceSwitch(space)}
                    className={`w-full p-2 rounded-md text-left transition-all duration-300 flex items-center gap-2.5 ${
                      currentSpace?.id === space.id
                        ? 'bg-neutral-50 dark:bg-neutral-900/20 text-ink-dark dark:text-neutral-100'
                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/50 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <div className={`p-1 rounded ${getSpaceIconStyle(space)}`}>
                      {(() => {
                        const iconType = getSpaceIconType(space);
                        switch (iconType) {
                          case 'personal':
                          case 'personal-pro':
                            return <User className="w-3 h-3" />;
                          case 'enterprise':
                            return <Building className="w-3 h-3" />;
                          default:
                            return <Users className="w-3 h-3" />;
                        }
                      })()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {space.name}
                        </span>
                        {currentSpace?.id === space.id && (
                          <Check className="w-3 h-3 text-brand-primary dark:text-neutral-400" />
                        )}
                      </div>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {space.type === 'personal' ? t('header.personal', 'Personal') : t('header.collaborative', 'Collaborative')} • {getRoleDisplayName(space.role || '')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-2 border-t border-neutral-100 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50">
            {openLinksExternally ? (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  openSpaceLink(resolvedCreateUrl);
                }}
                className="flex items-center gap-2 w-full p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 text-left"
              >
                <Plus className="w-3 h-3" />
                <span>{t('header.create_space', 'Create Space')}</span>
              </button>
            ) : (
            <Link
              to={resolvedCreateUrl}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 w-full p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              <Plus className="w-3 h-3" />
              <span>{t('header.create_space', 'Create Space')}</span>
            </Link>
            )}
          </div>
        </div>
      )}

      {showModal && createPortal(
        <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm ${Z_INDEX_CLASSES.MODAL_BACKDROP} flex items-center justify-center animate-in fade-in duration-300`}>
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-8 shadow-xl border border-neutral-200 dark:border-neutral-700 min-w-[300px] text-center animate-in zoom-in-95 duration-300">
            <div className="mb-4">
              <Loader className="w-8 h-8 animate-spin mx-auto text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
              {t('header.switching_space', 'Switching Space')}
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {t('header.switching_space_description', 'Switching space, please wait...')}
            </p>
            <div className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
              {t('header.please_wait', 'Please do not refresh the page or perform other operations')}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
