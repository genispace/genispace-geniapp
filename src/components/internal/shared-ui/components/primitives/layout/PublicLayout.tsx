import { Outlet } from 'react-router-dom';
import { PublicHeader, PublicHeaderProps } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

export interface PublicLayoutProps extends Omit<PublicHeaderProps, 'children'> {

  showFooter?: boolean;
}

export function PublicLayout({
  showFooter = true,
  ...headerProps
}: PublicLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-transparent">
      <PublicHeader {...headerProps} />
      <div className="flex flex-1 flex-col min-h-0 w-full pt-16">
        <main className="relative flex min-h-0 w-full flex-1 flex-col">
          <Outlet />
          <div className="min-h-0 flex-1" aria-hidden="true" />
        </main>
        {showFooter && headerProps.navigationConfig && (
          <div className="shrink-0">
            <PublicFooter navigationConfig={headerProps.navigationConfig} />
          </div>
        )}
      </div>
    </div>
  );
}
