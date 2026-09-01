import { ConfirmModal } from '../../ui/modal-templates';

export interface AppConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  loading?: boolean;
}

export function AppConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
  loading = false,
}: AppConfirmDialogProps) {
  return (
    <ConfirmModal
      isOpen={open}
      onClose={onCancel}
      onConfirm={onConfirm}
      title={title}
      message={message}
      confirmText={confirmLabel}
      cancelText={cancelLabel}
      danger={danger}
      loading={loading}
    />
  );
}
