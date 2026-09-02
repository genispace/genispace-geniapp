import React, { useState } from 'react';
import { Z_INDEX_CLASSES } from '../../../styles/z-index-layers';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AuthControlButtons } from './AuthControlButtons';
import { getApiErrorMessage } from '../../../utils/unknownError';

export interface ForgotPasswordProps {

  theme: 'light' | 'dark';

  onToggleTheme: () => void;

  onForgotPassword: (email: string) => Promise<void>;

  className?: string;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({
  theme,
  onToggleTheme,
  onForgotPassword,
  className = '',
}) => {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    try {
      await onForgotPassword(email);
      setSubmitted(true);
      setError('');
    } catch (err: unknown) {
      const errorMessage = getApiErrorMessage(err) || t('forgotPassword.errors.general');
      setError(errorMessage);
      setSubmitted(false);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={`min-h-screen bg-surface dark:bg-surface-dark relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-purple-500/5">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px]" />
      </div>

      <AuthControlButtons
        theme={theme}
        onToggleTheme={onToggleTheme}
      />

      <div className={`relative ${Z_INDEX_CLASSES.STICKY_HEADER} flex flex-col items-center justify-center min-h-screen p-4`}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-12 h-12 transform hover:rotate-12 transition-transform">
                <img src="/logo.svg" alt="GeniSpace Logo" className="w-full h-full" />
              </div>
              <span className="text-xl font-bold">GeniSpace</span>
            </Link>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">{t('forgotPassword.title')}</h1>
            <p className="text-content-muted dark:text-content-dark-muted">
              {t('forgotPassword.subtitle')}
            </p>
          </div>

          <div className="card p-8">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium">
                    {t('forgotPassword.email.label')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-content-muted dark:text-content-dark-muted" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input pl-10"
                      placeholder={t('forgotPassword.email.placeholder')}
                      required
                    />
                  </div>
                  {error && !submitted && (
                    <p className="text-sm text-red-500">{error}</p>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={isSending}
                  className="btn btn-primary w-full group"
                >
                  {isSending ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      {t('forgotPassword.submit.loading')}
                    </div>
                  ) : (
                    <>
                      {t('forgotPassword.submit.default')}
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 text-accent mb-4">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t('forgotPassword.success.title')}</h3>
                <p className="text-content-muted dark:text-content-dark-muted mb-6">
                  {t('forgotPassword.success.message')} {email}
                </p>
                {error && (
                  <p className="text-sm text-red-500 mb-4">{error}</p>
                )}
                <button
                  onClick={() => setSubmitted(false)}
                  className="btn btn-secondary w-full group"
                >
                  <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                  {t('forgotPassword.success.tryAnother')}
                </button>
              </div>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-content-muted dark:text-content-dark-muted">
                {t('forgotPassword.rememberPassword')}{' '}
                <Link
                  to="/sign-in"
                  className="text-accent hover:text-accent-dark dark:hover:text-accent-light font-medium"
                >
                  {t('forgotPassword.signIn')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

