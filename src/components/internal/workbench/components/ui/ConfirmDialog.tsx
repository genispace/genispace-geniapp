import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Card, Z_INDEX_CLASSES } from '@genispace/shared-ui';
import { Button } from '@genispace/shared-ui';
import { Label } from '@genispace/shared-ui';
import { renderLucideIcon } from '@/utils/iconUtils';

const COMPACT_MODE_MAX_HEIGHT_PX = 160;

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void; 
  title?: string;
  message?: string;
  details?: string[]; 
  buttonType?: 'default' | 'destructive' | 'outline' | 'secondary' | 'approve' | 'reject' | 'success' | 'warning' | 'info';
  buttonLabel?: string;
  actionType?: 'delete' | 'insert' | 'update' | 'custom' | 'error-general' | 'error-url' | 'error-file' | 'error-field';
  loading?: boolean;
  mode?: 'confirm' | 'alert'; 
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  details = [],
  buttonType = 'default',
  buttonLabel,
  actionType = 'custom',
  loading = false,
  mode = 'confirm'
}) => {
  const { t } = useTranslation('common');
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCompactMode, setIsCompactMode] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsCompactMode(false);
      return;
    }

    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      return;
    }

    const applyFromEntry = () => {
      const height = el.getBoundingClientRect().height;
      setIsCompactMode(height > 0 && height < COMPACT_MODE_MAX_HEIGHT_PX);
    };

    applyFromEntry();

    const ro = new ResizeObserver(() => {
      applyFromEntry();
    });

    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, [isOpen]);

  // Escape closes THIS dialog and must not leak to window-level shortcuts
  // (e.g. the studio's Esc-to-deselect would unmount the toolbar that renders
  // this dialog mid-flow). Capture phase runs before bubble listeners.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        if (!loading) onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const getDefaultContent = () => {
    const actionName = buttonLabel || t('confirm_dialog.default_action', 'This operation');

    switch (actionType) {
      case 'delete':
        return {
          title: t('confirm_dialog.delete.title', 'Confirm Delete'),
          message: t('confirm_dialog.delete.message', 'Are you sure you want to delete? This operation cannot be undone!'),
          iconName: 'trash-2',
          iconColor: 'text-red-600',
          confirmText: t('confirm_dialog.delete.confirm', 'Confirm Delete'),
          variant: 'destructive' as const
        };
      case 'insert':
        return {
          title: t('confirm_dialog.insert.title', 'Confirm Insert'),
          message: t('confirm_dialog.insert.message', 'Are you sure you want to insert a new record?'),
          iconName: 'plus',
          iconColor: 'text-green-600',
          confirmText: t('confirm_dialog.insert.confirm', 'Confirm Insert'),
          variant: 'default' as const
        };
      case 'update':
        return {
          title: t('confirm_dialog.update.title', 'Confirm Update'),
          message: t('confirm_dialog.update.message', 'Are you sure you want to update the record?'),
          iconName: 'edit',
          iconColor: 'text-blue-600',
          confirmText: t('confirm_dialog.update.confirm', 'Confirm Update'),
          variant: 'default' as const
        };
      case 'error-url':
        return {
          title: t('confirm_dialog.error_url.title', 'Invalid File URL'),
          message: message || t('confirm_dialog.error_url.message', 'Unable to download file'),
          iconName: 'link-2-off',
          iconColor: 'text-red-600',
          confirmText: t('confirm_dialog.ok', 'OK'),
          variant: 'default' as const
        };
      case 'error-file':
        return {
          title: t('confirm_dialog.error_file.title', 'File Download Failed'),
          message: message || t('confirm_dialog.error_file.message', 'An error occurred during file download'),
          iconName: 'file-x',
          iconColor: 'text-red-600',
          confirmText: t('confirm_dialog.ok', 'OK'),
          variant: 'default' as const
        };
      case 'error-field':
        return {
          title: t('confirm_dialog.error_field.title', 'Field Error'),
          message: message || t('confirm_dialog.error_field.message', 'Field configuration or data is incorrect'),
          iconName: 'alert-circle',
          iconColor: 'text-orange-600',
          confirmText: t('confirm_dialog.ok', 'OK'),
          variant: 'default' as const
        };
      case 'error-general':
        return {
          title: t('confirm_dialog.error_general.title', 'Operation Failed'),
          message: message || t('confirm_dialog.error_general.message', 'An error occurred during the operation'),
          iconName: 'alert-triangle',
          iconColor: 'text-red-600',
          confirmText: t('confirm_dialog.ok', 'OK'),
          variant: 'default' as const
        };
      default: {

        const getIconByButtonType = () => {
          switch (buttonType) {
            case 'approve':
              return { iconName: 'check-circle', iconColor: 'text-blue-600' };
            case 'reject':
              return { iconName: 'x-circle', iconColor: 'text-red-600' };
            case 'success':
              return { iconName: 'check-circle', iconColor: 'text-green-600' };
            case 'warning':
              return { iconName: 'alert-triangle', iconColor: 'text-orange-600' };
            case 'info':
              return { iconName: 'info', iconColor: 'text-blue-500' };
            default:
              return { iconName: 'info', iconColor: 'text-blue-600' };
          }
        };

        const buttonIcon = getIconByButtonType();

        return {
          title: t('confirm_dialog.default.title', 'Confirm Operation'),
          message: t('confirm_dialog.default.message', 'Are you sure you want to execute {{actionName}}?', { actionName }),
          iconName: buttonIcon.iconName,
          iconColor: buttonIcon.iconColor,
          confirmText: t('confirm_dialog.default.confirm', 'Confirm'),
          variant: buttonType as 'default' | 'destructive' | 'outline' | 'secondary'
        };
      }
    }
  };

  const getButtonVariant = (buttonType?: string) => {
    switch (buttonType) {
      case 'approve':
        return 'outline';
      case 'reject':
        return 'outline';
      case 'success':
        return 'outline';
      case 'warning':
        return 'outline';
      case 'info':
        return 'outline';
      default:
        return buttonType as 'default' | 'destructive' | 'outline' | 'secondary';
    }
  };

  const getButtonTextColor = (buttonType?: string) => {
    switch (buttonType) {
      case 'approve':
        return 'text-blue-600 hover:text-blue-700 hover:bg-blue-50';
      case 'reject':
        return 'text-red-600 hover:text-red-700 hover:bg-red-50';
      case 'success':
        return 'text-green-600 hover:text-green-700 hover:bg-green-50';
      case 'warning':
        return 'text-orange-600 hover:text-orange-700 hover:bg-orange-50';
      case 'info':
        return 'text-blue-500 hover:text-blue-600 hover:bg-blue-50';
      default:
        return '';
    }
  };

  const defaultContent = getDefaultContent();
  const finalTitle = title || defaultContent.title;
  const finalMessage = message || defaultContent.message;
  const finalIcon = renderLucideIcon(defaultContent.iconName, `w-6 h-6 ${defaultContent.iconColor}`);
  const finalIconCompact = renderLucideIcon(
    defaultContent.iconName,
    `w-5 h-5 flex-shrink-0 ${defaultContent.iconColor}`
  );
  const finalConfirmText = defaultContent.confirmText;
  const finalVariant = getButtonVariant(buttonType);
  const buttonTextColor = getButtonTextColor(buttonType);
  /** Compact row: prefer message (operational detail), fallback to title. */
  const compactPrimaryLine = finalMessage?.trim() ? finalMessage : finalTitle;
  const useCompactRow = isCompactMode && details.length === 0;

  const handleConfirm = () => {
    if (!loading && onConfirm) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (!loading) {
      onClose();
    }
  };

  // Portal to <body>: this fixed overlay is rendered from arbitrary hosts —
  // inside the studio's scaled device frame a transformed ancestor becomes the
  // containing block for fixed descendants, confining and shrinking the modal.
  return createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 bg-black/50 flex items-center justify-center ${Z_INDEX_CLASSES.MODAL_BACKDROP} p-4`}
    >
      <Card className="w-full max-w-4xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-lg min-w-0">
        {useCompactRow ? (
          <div className="flex items-center justify-between gap-3 p-3">
            <div className="flex items-center gap-2 min-w-0">
              {finalIconCompact}
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                {compactPrimaryLine}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {mode === 'confirm' && (
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={loading}>
                  {t('cancel', 'Cancel')}
                </Button>
              )}
              <Button
                variant={finalVariant}
                size="sm"
                onClick={mode === 'alert' ? handleCancel : handleConfirm}
                disabled={loading}
                className={buttonTextColor}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    {t('confirm_dialog.processing', 'Processing...')}
                  </>
                ) : (
                  finalConfirmText
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {finalIcon}
                <Label className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {finalTitle}
                </Label>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={loading}
                className="h-8 w-8 p-0 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                {renderLucideIcon('x', 'w-4 h-4')}
              </Button>
            </div>

            <div className="py-2">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {finalMessage}
              </p>
            </div>

            {details.length > 0 && (
              <div className="py-2">
                <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
                  {t('confirm_dialog.check_details', 'Please check the following:')}
                </Label>
                <ul className="space-y-1">
                  {details.map((detail, index) => (
                    <li key={index} className="text-sm text-neutral-600 dark:text-neutral-400 flex items-start">
                      <span className="text-red-500 mr-2 flex-shrink-0">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              {mode === 'confirm' && (
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                  className="min-w-[80px]"
                >
                  {t('cancel', 'Cancel')}
                </Button>
              )}
              <Button
                variant={finalVariant}
                onClick={mode === 'alert' ? handleCancel : handleConfirm}
                disabled={loading}
                className={`min-w-[80px] ${buttonTextColor}`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('confirm_dialog.processing', 'Processing...')}
                  </>
                ) : (
                  finalConfirmText
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>,
    document.body
  );
};
