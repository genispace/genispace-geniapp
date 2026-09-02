import * as React from "react";
import { ModalContainer } from "./modal-container";
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from '@genispace/shared-utils';
import { useTranslation } from "react-i18next";

export type AlertType = 'success' | 'error' | 'warning' | 'info';

const AlertIcons: Record<AlertType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const AlertStyles: Record<AlertType, {
  iconColor: string;
  buttonColor: string;
}> = {
  success: {
    iconColor: "text-green-500 dark:text-green-400",
    buttonColor: "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600",
  },
  error: {
    iconColor: "text-red-500 dark:text-red-400", 
    buttonColor: "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600",
  },
  warning: {
    iconColor: "text-orange-500 dark:text-orange-400",
    buttonColor: "bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600",
  },
  info: {
    iconColor: "text-brand-primary dark:text-neutral-400",
    buttonColor: "bg-brand-primary-light hover:bg-brand-primary dark:bg-brand-primary dark:hover:bg-brand-primary-light",
  },
};

interface AlertDialogProps {

  isOpen: boolean;

  onClose: () => void;

  type?: AlertType;

  title?: string;

  message: string;

  confirmText?: string;

  onConfirm?: () => void;

  showCancel?: boolean;

  cancelText?: string;

  onCancel?: () => void;

  loading?: boolean;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  type = 'info',
  title,
  message,
  confirmText,
  onConfirm,
  showCancel = false,
  cancelText,
  onCancel,
  loading = false,
}) => {
  const { t } = useTranslation('common');
  const IconComponent = AlertIcons[type];
  const styles = AlertStyles[type];

  const defaultTitle = {
    success: t('dialog.title.success', 'Success'),
    error: t('dialog.title.error', 'Error'),
    warning: t('dialog.title.warning', 'Warning'),
    info: t('dialog.title.info', 'Information'),
  }[type];

  const defaultConfirmText = confirmText || t('dialog.button.confirm', 'OK');
  const defaultCancelText = cancelText || t('dialog.button.cancel', 'Cancel');

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  return (
    <ModalContainer
      size="STANDARD"
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={false}
      closeOnOverlayClick={!loading}
      contentClassName="max-w-md shadow-2xl" 
    >
      <div className="p-6 bg-white dark:bg-neutral-900 rounded-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className={cn("flex-shrink-0", styles.iconColor)}>
            <IconComponent className="w-8 h-8" />
          </div>
          <div className="flex-1">
            {(title || defaultTitle) && (
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                {title || defaultTitle}
              </h3>
            )}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-neutral-700 dark:text-neutral-200 whitespace-pre-line leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3">
          {showCancel && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {defaultCancelText}
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              "px-4 py-2 text-sm font-medium text-white dark:text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-neutral-900 shadow-sm",
              styles.buttonColor
            )}
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {defaultConfirmText}
          </button>
        </div>
      </div>
    </ModalContainer>
  );
};

interface AlertState {
  isOpen: boolean;
  type: AlertType;
  title?: string;
  message: string;
  confirmText?: string;
  onConfirm?: () => void | Promise<void>;
  showCancel?: boolean;
  cancelText?: string;
  onCancel?: () => void;
  loading?: boolean;
}

// Alert Context
interface AlertContextType {
  showAlert: (options: Omit<AlertState, 'isOpen'>) => void;
  hideAlert: () => void;
  setLoading: (loading: boolean) => void;
  state: AlertState;
}

const AlertContext = React.createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = React.useState<AlertState>({
    isOpen: false,
    type: 'info',
    message: '',
  });

  const showAlert = React.useCallback((options: Omit<AlertState, 'isOpen'>) => {
    setState({
      ...options,
      isOpen: true,
    });
  }, []);

  const hideAlert = React.useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const setLoading = React.useCallback((loading: boolean) => {
    setState(prev => ({
      ...prev,
      loading,
    }));
  }, []);

  const value = React.useMemo(() => ({
    showAlert,
    hideAlert,
    setLoading,
    state,
  }), [showAlert, hideAlert, setLoading, state]);

  return (
    <AlertContext.Provider value={value}>
      {children}
      <AlertDialog
        isOpen={state.isOpen}
        onClose={hideAlert}
        type={state.type}
        title={state.title}
        message={state.message}
        confirmText={state.confirmText}
        onConfirm={state.onConfirm}
        showCancel={state.showCancel}
        cancelText={state.cancelText}
        onCancel={state.onCancel}
        loading={state.loading}
      />
    </AlertContext.Provider>
  );
};

// Alert Hook
export const useAlert = () => {
  const context = React.useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
};

export const useAlertDialog = () => {
  const { showAlert, hideAlert, setLoading } = useAlert();
  const { t } = useTranslation('common');

  return React.useMemo(() => ({

    success: (message: string, options?: Partial<Omit<AlertState, 'isOpen' | 'type' | 'message'>>) => {
      showAlert({
        type: 'success',
        message,
        ...options,
      });
    },

    error: (message: string, options?: Partial<Omit<AlertState, 'isOpen' | 'type' | 'message'>>) => {
      showAlert({
        type: 'error',
        message,
        ...options,
      });
    },

    warning: (message: string, options?: Partial<Omit<AlertState, 'isOpen' | 'type' | 'message'>>) => {
      showAlert({
        type: 'warning',
        message,
        ...options,
      });
    },

    info: (message: string, options?: Partial<Omit<AlertState, 'isOpen' | 'type' | 'message'>>) => {
      showAlert({
        type: 'info',
        message,
        ...options,
      });
    },

    confirm: (
      message: string, 
      onConfirm: () => void | Promise<void>,
      options?: Partial<Omit<AlertState, 'isOpen' | 'message' | 'onConfirm' | 'showCancel'>>
    ) => {
      showAlert({
        type: options?.type || 'warning',
        title: options?.title || t('dialog.title.confirm', 'Confirm Operation'),
        message,
        onConfirm: async () => {

          const result = onConfirm();
          if (result instanceof Promise) {
            setLoading(true);

            try {
              await result;
              hideAlert();
            } catch (error) {
              setLoading(false);
              console.error('Confirm operation failed:', error);
              throw error;
            }
          } else {

            hideAlert();
          }
        },
        showCancel: true,
        confirmText: options?.confirmText || t('dialog.button.confirm', 'OK'),
        cancelText: options?.cancelText || t('dialog.button.cancel', 'Cancel'),
        ...options,
      });
    },

    confirmDelete: (
      message: string,
      onConfirm: () => Promise<void>,
      options?: Partial<Omit<AlertState, 'isOpen' | 'message' | 'onConfirm' | 'showCancel' | 'type'>>
    ) => {
      showAlert({
        type: 'error',
        title: options?.title || t('dialog.title.delete', 'Delete Confirmation'),
        message,
        onConfirm: async () => {

          setLoading(true);

          try {

            await onConfirm();

            hideAlert();
          } catch (error) {

            setLoading(false);

            console.error('Delete operation failed:', error);
            throw error; 
          }
        },
        showCancel: true,
        confirmText: options?.confirmText || t('dialog.button.delete', 'Delete'),
        cancelText: options?.cancelText || t('dialog.button.cancel', 'Cancel'),
        ...options,
      });
    },

    hide: hideAlert,
  }), [showAlert, hideAlert, setLoading, t]);
};

export default AlertDialog;
