import * as React from "react";
import { X } from "lucide-react";
import { cn } from '@genispace/geniapp/utils';
import { createPortal } from "react-dom";
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { MODAL_DIMENSIONS } from '../../styles/design-tokens';
import { Z_INDEX_CLASSES } from '../../styles/z-index-layers';

export const MODAL_SIZES = {
  sm: MODAL_DIMENSIONS.sm,
  md: MODAL_DIMENSIONS.md,
  lg: MODAL_DIMENSIONS.lg,
  xl: MODAL_DIMENSIONS.xl,
  wide: MODAL_DIMENSIONS.wide,
  full: MODAL_DIMENSIONS.full,
  STANDARD: MODAL_DIMENSIONS.lg,
  LARGE: MODAL_DIMENSIONS.wide,
} as const;

export type ModalSize = keyof typeof MODAL_SIZES;

interface ModalContainerProps {

  size?: ModalSize;

  isOpen: boolean;

  onClose: () => void;

  title?: React.ReactNode;

  showCloseButton?: boolean;

  closeOnOverlayClick?: boolean;

  className?: string;

  contentClassName?: string;

  usePortal?: boolean;

  children: React.ReactNode;
}

export const ModalContainer: React.FC<ModalContainerProps> = ({
  size = 'STANDARD',
  isOpen,
  onClose,
  title,
  showCloseButton = true,
  closeOnOverlayClick = false,
  className,
  contentClassName,
  usePortal = true,
  children
}) => {

  useLockBodyScroll(isOpen);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  const sizeDims = MODAL_SIZES[size];

  const modalContent = (
    <div 
      className={cn(
        "fixed inset-0 flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/50 backdrop-blur-sm",
        Z_INDEX_CLASSES.MODAL,
        className
      )}
      onClick={handleOverlayClick}
      style={{ 
        opacity: isOpen ? 1 : 0,
        visibility: isOpen ? 'visible' : 'hidden',
        transition: 'opacity 200ms ease-in-out, visibility 200ms ease-in-out'
      }}
    >
      <div 
        className={cn(
          "w-full rounded-lg shadow-xl border bg-white dark:bg-surface-darker flex flex-col overflow-hidden my-auto sm:my-4",
          "border-surface-darker/10 dark:border-surface/20",
          "animate-in fade-in-0 zoom-in-95 duration-300",
          "mx-auto sm:mx-4 md:mx-6 lg:mx-8",
          "max-h-[calc(100dvh-2rem)]",
          contentClassName
        )}
        style={{
          maxWidth: sizeDims.width,
          maxHeight: `min(${sizeDims.maxHeight}, calc(100dvh - 2rem))`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700 flex-shrink-0">
            {title && (
              <div className="flex-1 min-w-0">
                {typeof title === 'string' ? (
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                    {title}
                  </h2>
                ) : (
                  title
                )}
              </div>
            )}

            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
              </button>
            )}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  if (usePortal) {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};

export const useModal = (initialOpen = false) => {
  const [isOpen, setIsOpen] = React.useState(initialOpen);

  const openModal = React.useCallback(() => setIsOpen(true), []);
  const closeModal = React.useCallback(() => setIsOpen(false), []);
  const toggleModal = React.useCallback(() => setIsOpen(prev => !prev), []);

  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal
  };
};

export default ModalContainer;
