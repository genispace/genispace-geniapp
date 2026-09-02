import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AuthControlButtons } from './AuthControlButtons';
import { getApiErrorMessage } from '../../../utils/unknownError';

export interface VerifyEmailProps {

  theme: 'light' | 'dark';

  onToggleTheme: () => void;

  onVerifyEmail: (token: string) => Promise<void>;

  className?: string;
}

export const VerifyEmail: React.FC<VerifyEmailProps> = ({
  theme,
  onToggleTheme,
  onVerifyEmail,
  className = '',
}) => {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isValidating, setIsValidating] = useState(true);

  const verificationSent = useRef(false);

  useEffect(() => {
    const verifyEmailToken = async () => {

      if (verificationSent.current) return;

      verificationSent.current = true;

      try {
        if (!token) {
          setError(t('verifyEmail.error.noToken'));
          setIsValidating(false);
          return;
        }

        await onVerifyEmail(token);
        setSuccess(true);

        setTimeout(() => {
          navigate('/sign-in');
        }, 3000);
      } catch (err: unknown) {
        console.error('Email verification failed:', err);
        setError(getApiErrorMessage(err) || t('verifyEmail.error.invalidToken'));
      } finally {
        setIsValidating(false);
      }
    };

    verifyEmailToken();
  }, [token, navigate, t, onVerifyEmail]);

  return (
    <div className={`min-h-screen flex items-center justify-center bg-surface dark:bg-surface-darker relative ${className}`}>
      <AuthControlButtons
        theme={theme}
        onToggleTheme={onToggleTheme}
      />
      <div className="max-w-md w-full p-8 bg-white dark:bg-surface-dark shadow-lg rounded-xl">
        <div className="text-center mb-6">
          <Mail className="w-12 h-12 text-accent mx-auto mb-4" />
          <h1 className="text-2xl font-bold">{t('verifyEmail.title')}</h1>
        </div>

        {isValidating ? (
          <div className="text-center p-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            <p className="mt-4 text-content-muted dark:text-content-dark-muted">
              {t('verifyEmail.validating')}
            </p>
          </div>
        ) : success ? (
          <div className="text-center p-4 space-y-4">
            <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-medium">{t('verifyEmail.success.title')}</h2>
            <p className="text-content-muted dark:text-content-dark-muted">
              {t('verifyEmail.success.message')}
            </p>
            <p className="text-sm text-content-muted dark:text-content-dark-muted">
              {t('verifyEmail.success.redirect')}
            </p>
            <button
              onClick={() => navigate('/sign-in')}
              className="btn btn-primary w-full"
            >
              {t('verifyEmail.success.button')}
            </button>
          </div>
        ) : (
          <div className="text-center p-4 space-y-4">
            <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-medium">{t('verifyEmail.error.title')}</h2>
            <p className="text-red-500">{error}</p>
            <p className="text-content-muted dark:text-content-dark-muted">
              {t('verifyEmail.error.message')}
            </p>
            <button
              onClick={() => navigate('/sign-in')}
              className="btn btn-secondary w-full"
            >
              {t('verifyEmail.error.button')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

