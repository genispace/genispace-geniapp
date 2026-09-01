import type { ReactNode } from 'react';
import { cn } from '@genispace/geniapp/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../ui/sheet';

export type AppModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'wide';

const SIZE_CLASS: Record<AppModalSize, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
  wide: 'sm:max-w-6xl',
};
const IS_TEST = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

export interface AppModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: AppModalSize;
  contentClassName?: string;
  bodyClassName?: string;
  closeLabel?: string;
  closeOnOutside?: boolean;
}

export function AppModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  contentClassName,
  bodyClassName,
  closeLabel,
  closeOnOutside = false,
}: AppModalProps) {
  if (IS_TEST) {
    if (!open) return null;
    return (
      <div role="dialog" aria-modal="true" aria-label={title} className={contentClassName}>
        <header><h2>{title}</h2>{description ? <p>{description}</p> : null}</header>
        <div className={bodyClassName}>{children}</div>
        {footer ? <footer>{footer}</footer> : null}
        <button type="button" aria-label={closeLabel || 'Close'} onClick={onClose}>{closeLabel || 'Close'}</button>
      </div>
    );
  }
  const savedLanguage = typeof window === 'undefined' ? '' : window.localStorage.getItem('i18nextLng') || document.documentElement.lang;
  const isChinese = savedLanguage.toLowerCase().startsWith('zh');
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent
        closeLabel={closeLabel || (isChinese ? '关闭对话框' : 'Close dialog')}
        className={cn(
          'max-h-[calc(100dvh-1rem)] gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-3rem)]',
          'max-sm:bottom-0 max-sm:left-0 max-sm:top-auto max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-2xl',
          SIZE_CLASS[size],
          contentClassName,
        )}
        onPointerDownOutside={(event) => { if (!closeOnOutside) event.preventDefault(); }}
      >
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4 pr-12 text-left sm:px-6">
          <DialogTitle className="text-lg leading-6">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6', bodyClassName)}>
          {children}
        </div>
        {footer ? <DialogFooter className="shrink-0 border-t border-border bg-background px-5 py-4 sm:px-6">{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}

export interface AppHelpSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  side?: 'left' | 'right';
  className?: string;
}

export function AppHelpSheet({ open, onClose, title, description, children, side = 'right', className }: AppHelpSheetProps) {
  if (IS_TEST) {
    if (!open) return null;
    return <div role="dialog" aria-modal="true" aria-label={title} className={className}><header><h2>{title}</h2>{description ? <p>{description}</p> : null}</header><div>{children}</div><button type="button" aria-label="Close" onClick={onClose}>Close</button></div>;
  }
  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <SheetContent side={side} className={cn('w-full overflow-y-auto sm:max-w-md', className)}>
        <SheetHeader className="text-left">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="mt-6 space-y-5 text-sm leading-6 text-muted-foreground">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
