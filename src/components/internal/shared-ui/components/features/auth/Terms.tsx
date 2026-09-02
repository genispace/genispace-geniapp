import React from 'react';
import { Z_INDEX_CLASSES } from '../../../styles/z-index-layers';
import { Link } from 'react-router-dom';
import { Shield, Bot, Check, ArrowLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AuthControlButtons } from './AuthControlButtons';

export interface TermsProps {

  theme: 'light' | 'dark';

  onToggleTheme: () => void;

  className?: string;
}

export const Terms: React.FC<TermsProps> = ({
  theme,
  onToggleTheme,
  className = '',
}) => {
  const { t } = useTranslation('auth');

  const features = [
    {
      icon: <Bot className="w-5 h-5 text-accent" />,
      title: t('terms.features.automation.title'),
      description: t('terms.features.automation.description')
    },
    {
      icon: <Shield className="w-5 h-5 text-accent" />,
      title: t('terms.features.security.title'),
      description: t('terms.features.security.description')
    },
    {
      icon: <Check className="w-5 h-5 text-accent" />,
      title: t('terms.features.templates.title'),
      description: t('terms.features.templates.description')
    }
  ];

  return (
    <div className={`min-h-screen bg-surface dark:bg-surface-dark relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-purple-500/5">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px]" />
      </div>

      <AuthControlButtons
        theme={theme}
        onToggleTheme={onToggleTheme}
      />

      <div className={`relative ${Z_INDEX_CLASSES.STICKY_HEADER} flex min-h-screen`}>
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-3xl">
            <div className="text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-2 group">
                <div className="w-12 h-12 transform group-hover:rotate-12 transition-transform duration-300">
                  <img src="/logo.svg" alt="GeniSpace Logo" className="w-full h-full" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
                  GeniSpace
                </span>
              </Link>
            </div>

            <div className="card p-6 md:p-8 backdrop-blur-sm bg-surface/80 dark:bg-surface-dark/80 shadow-xl">
              <div className="flex items-center mb-6">
                <Link
                  to="/sign-up"
                  className="inline-flex items-center text-accent hover:text-accent-dark dark:hover:text-accent-light transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  {t('terms.backToSignUp')}
                </Link>
              </div>

              <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
                {t('terms.title')}
              </h1>

              <div className="prose dark:prose-invert max-w-none">
                <p className="text-content-muted dark:text-content-dark-muted mb-8 text-lg">
                  {t('terms.introduction')}
                </p>

                <div className="mb-12">
                  <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-accent" />
                    {t('terms.features.title')}
                  </h2>
                  <div className="grid gap-6">
                    {features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex gap-4 p-6 rounded-xl bg-surface-darker/5 dark:bg-surface/5 hover:bg-surface-darker/10 dark:hover:bg-surface/10 transition-colors"
                      >
                        <div className="p-3 rounded-lg bg-accent/10 flex items-center justify-center">
                          {feature.icon}
                        </div>
                        <div className="flex flex-col justify-center">
                          <h3 className="font-medium text-lg mb-2">{feature.title}</h3>
                          <p className="text-content-muted dark:text-content-dark-muted">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-12">
                  <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-accent" />
                    {t('terms.usage.title')}
                  </h2>
                  <div className="space-y-6">
                    <p className="text-lg">{t('terms.usage.description')}</p>
                    <ul className="space-y-4">
                      {Object.entries(t('terms.usage.rules', { returnObjects: true })).map(([key, rule]) => (
                        <li key={key} className="flex gap-3 items-start">
                          <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center mt-1 flex-shrink-0">
                            <span className="text-accent font-medium">{key}</span>
                          </div>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mb-12">
                  <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-accent" />
                    {t('terms.liability.title')}
                  </h2>
                  <p className="text-lg">{t('terms.liability.description')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-accent" />
                    {t('terms.changes.title')}
                  </h2>
                  <p className="text-lg">{t('terms.changes.description')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

