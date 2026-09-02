import * as React from "react";
import { ModalContainer, ModalSize } from "./modal-container";
import { Button } from "./button";

interface BaseModalProps {
  size?: ModalSize;
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  size = 'STANDARD',
  isOpen,
  onClose,
  title,
  className,
  children,
  footer,
  showCloseButton = true,
  closeOnOverlayClick = false
}) => {
  return (
    <ModalContainer
      size={size}
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      showCloseButton={showCloseButton}
      closeOnOverlayClick={closeOnOverlayClick}
      className={className}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
        {children}
      </div>

      {footer && (
        <div className="flex-shrink-0 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
          {footer}
        </div>
      )}
    </ModalContainer>
  );
};

interface FormModalProps extends Omit<BaseModalProps, 'footer'> {
  onSubmit?: () => void;
  onCancel?: () => void;
  submitText?: string;
  cancelText?: string;
  submitDisabled?: boolean;
  submitLoading?: boolean;
  showFooter?: boolean;
  customFooter?: React.ReactNode;
}

export const FormModal: React.FC<FormModalProps> = ({
  onSubmit,
  onCancel,
  submitText = "OK",
  cancelText = "Cancel", 
  submitDisabled = false,
  submitLoading = false,
  showFooter = true,
  customFooter,
  ...baseProps
}) => {
  const handleCancel = () => {
    onCancel?.();
    baseProps.onClose();
  };

  const handleSubmit = () => {
    onSubmit?.();
  };

  const footer = showFooter ? (
    customFooter || (
      <div className="flex items-center justify-end gap-3 p-6">
        <Button type="button" variant="secondary" onClick={handleCancel}>
          {cancelText}
        </Button>

        {onSubmit && (
          <Button
            type="button"
            variant="default"
            onClick={handleSubmit}
            disabled={submitDisabled || submitLoading}
            className="gap-2"
          >
            {submitLoading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {submitText}
          </Button>
        )}
      </div>
    )
  ) : undefined;

  return <BaseModal {...baseProps} footer={footer} />;
};

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: React.ReactNode;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
  loading = false
}) => {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <ModalContainer
      size="STANDARD"
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      contentClassName="max-w-4xl" 
    >
      <div className="p-6">
        <p className="text-neutral-700 dark:text-neutral-300 mb-6">
          {message}
        </p>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>

          <Button
            type="button"
            variant={danger ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={loading}
            className="gap-2"
          >
            {loading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {confirmText}
          </Button>
        </div>
      </div>
    </ModalContainer>
  );
};

interface ListModalProps extends BaseModalProps {
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (term: string) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export const ListModal: React.FC<ListModalProps> = ({
  searchable = false,
  searchPlaceholder = "Search...",
  onSearch,
  emptyMessage = "No data",
  loading = false,
  children,
  title,
  ...baseProps
}) => {
  const [searchTerm, setSearchTerm] = React.useState("");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearch?.(value);
  };

  return (
    <BaseModal {...baseProps} title={title}>
      {searchable && (
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
          />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-brand-primary/30 border-t-blue-600 rounded-full animate-spin" />
            <span className="ml-3 text-neutral-600 dark:text-neutral-400">Loading...</span>
          </div>
        ) : (
          children || (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-neutral-500 dark:text-neutral-400">{emptyMessage}</p>
            </div>
          )
        )}
      </div>
    </BaseModal>
  );
};
