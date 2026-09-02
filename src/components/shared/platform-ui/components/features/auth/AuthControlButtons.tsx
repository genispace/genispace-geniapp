import React from 'react';
import { Z_INDEX_CLASSES } from '../../../styles/z-index-layers';
import { Globe, Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface AuthControlButtonsProps {

  theme: 'light' | 'dark';

  onToggleTheme: () => void;

  className?: string;
}

export const AuthControlButtons: React.FC<AuthControlButtonsProps> = ({
  theme,
  onToggleTheme,
  className = '',
}) => {
  const { t, i18n } = useTranslation('auth');

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
  };

  return (
    <div className={`fixed top-4 right-4 ${Z_INDEX_CLASSES.FLOATING_PANEL} flex items-center gap-2 ${className}`}>
      <button
        onClick={toggleLanguage}
        className="flex items-center gap-2 py-2 px-3 rounded-lg text-sm font-medium bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm hover:bg-white dark:hover:bg-neutral-900 border border-surface-darker/20 dark:border-surface-darker/30 shadow-lg transition-all duration-300"
        title={t('signIn.changeLanguage', 'Change Language')}
      >
        <Globe className="w-4 h-4" />
        <span>{i18n.language === 'zh' ? 'EN' : t('language.zh_short', 'ZH')}</span>
      </button>

      <button
        onClick={onToggleTheme}
        className="flex items-center gap-2 py-2 px-3 rounded-lg text-sm font-medium bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm hover:bg-white dark:hover:bg-neutral-900 border border-surface-darker/20 dark:border-surface-darker/30 shadow-lg transition-all duration-300"
        title={t('signIn.changeTheme', 'Toggle Theme')}
      >
        {theme === 'dark' ? (
          <Sun className="w-4 h-4" />
        ) : (
          <Moon className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};

