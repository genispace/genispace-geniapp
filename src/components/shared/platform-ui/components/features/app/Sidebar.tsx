import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { cn } from '@genispace/shared-utils';
import type { ReactNode } from 'react';

const Z = {
  SIDEBAR: 'z-20',
  STICKY_HEADER: 'z-10',
  BACKDROP: 'z-[300]',
  DRAWER: 'z-[400]',
} as const;

export interface AppSidebarProps {
  children: ReactNode;
  sidebarHeader: ReactNode | ((collapsed: boolean) => ReactNode);
  /**
   * Legacy single-level navigation. Existing GeniApps can keep passing this
   * prop without any behavioural or visual changes.
   */
  sidebarNav?: ReactNode | ((collapsed: boolean) => ReactNode);
  /**
   * Optional grouped navigation for applications with a second information
   * level. When supplied it takes precedence over `sidebarNav`.
   */
  sidebarNavGroups?: AppSidebarNavGroup[] | ((collapsed: boolean) => AppSidebarNavGroup[]);
  /**
   * Optional navigation pinned below the scrollable navigation area. A render
   * function can adapt the item to the desktop collapsed state. Returning
   * `null` removes both the footer content and its separator.
   */
  sidebarFooter?: ReactNode | ((collapsed: boolean) => ReactNode);
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  withMobileDrawer?: boolean;
  mobileTitle?: string;
  navAriaLabel?: string;
  expandLabel?: string;
  collapseLabel?: string;
  openLabel?: string;
  closeLabel?: string;
  storageKey?: string;
}

export interface AppSidebarNavGroup {
  /** Stable key used for expansion state and rendering. */
  id: string;
  /** Business-facing section label, for example "智能审核". */
  label: ReactNode;
  /** Optional compact symbol shown when the sidebar is collapsed. */
  icon?: ReactNode;
  /** Navigation links or buttons. Callers retain routing and RBAC control. */
  items: ReactNode[];
  /** Groups default to expandable. Set false for a permanent section. */
  collapsible?: boolean;
  /** Initial state for expandable groups. */
  defaultOpen?: boolean;
}

function GroupedSidebarNav({
  groups,
  collapsed,
}: {
  groups: AppSidebarNavGroup[];
  collapsed: boolean;
}) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((group) => [group.id, group.defaultOpen !== false]))
  );

  useEffect(() => {
    setOpenGroups((current) => {
      const next = { ...current };
      let changed = false;
      groups.forEach((group) => {
        if (!(group.id in next)) {
          next[group.id] = group.defaultOpen !== false;
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [groups]);

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const expandable = group.collapsible !== false;
        const open = collapsed || !expandable || openGroups[group.id] !== false;
        return (
          <section key={group.id} className="min-w-0" aria-label={typeof group.label === 'string' ? group.label : undefined}>
            {collapsed ? (
              <div
                className="mx-auto mb-1 flex h-7 w-10 items-center justify-center text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                title={typeof group.label === 'string' ? group.label : undefined}
                aria-hidden="true"
              >
                {group.icon ?? <span className="h-px w-5 bg-border" />}
              </div>
            ) : expandable ? (
              <button
                type="button"
                className="mb-1 flex min-h-9 w-full items-center justify-between rounded-lg px-2 text-left text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => setOpenGroups((current) => ({ ...current, [group.id]: !open }))}
                aria-expanded={open}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {group.icon}
                  <span className="truncate">{group.label}</span>
                </span>
                <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${open ? '' : '-rotate-90'}`} />
              </button>
            ) : (
              <div className="mb-1 flex min-h-9 items-center gap-2 px-2 text-xs font-semibold text-muted-foreground">
                {group.icon}
                <span className="truncate">{group.label}</span>
              </div>
            )}

            {open && <div className="space-y-1">{group.items}</div>}
          </section>
        );
      })}
    </div>
  );
}

export function AppSidebar({
  children,
  sidebarHeader,
  sidebarNav,
  sidebarNavGroups,
  sidebarFooter,
  collapsible = false,
  defaultCollapsed = false,
  withMobileDrawer = false,
  mobileTitle: _mobileTitle,
  navAriaLabel = 'Application navigation',
  expandLabel = 'Expand sidebar',
  collapseLabel = 'Collapse sidebar',
  openLabel = 'Open navigation',
  closeLabel = 'Close navigation',
  storageKey = 'app_sidebar_collapsed',
}: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (!collapsible) return false;
    const saved = localStorage.getItem(storageKey);
    return saved !== null ? (JSON.parse(saved) as boolean) : defaultCollapsed;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showRail, setShowRail] = useState(false);

  useEffect(() => {
    if (collapsible) {
      localStorage.setItem(storageKey, JSON.stringify(collapsed));
    }
  }, [collapsed, collapsible, storageKey]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, closeMobile]);

  const renderPanel = (isDrawer: boolean, panelCollapsed: boolean) => {
    const resolvedHeader =
      typeof sidebarHeader === 'function' ? sidebarHeader(panelCollapsed) : sidebarHeader;
    const resolvedGroups =
      typeof sidebarNavGroups === 'function' ? sidebarNavGroups(panelCollapsed) : sidebarNavGroups;
    const resolvedNav = resolvedGroups
      ? <GroupedSidebarNav groups={resolvedGroups} collapsed={panelCollapsed} />
      : typeof sidebarNav === 'function'
        ? sidebarNav(panelCollapsed)
        : sidebarNav;
    const resolvedFooter =
      typeof sidebarFooter === 'function' ? sidebarFooter(panelCollapsed) : sidebarFooter;

    return (
      <>
        {isDrawer && (
          <div className="flex-shrink-0 flex items-center justify-end border-b border-border bg-muted/70 px-3 py-2.5">
            <button
              type="button"
              onClick={closeMobile}
              className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-200/80 hover:text-neutral-900 active:scale-95 dark:text-neutral-300 dark:hover:bg-neutral-600/60 dark:hover:text-white"
              aria-label={closeLabel}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div
          className={cn(
            'flex-shrink-0 flex h-[69px] items-center border-b border-neutral-200 dark:border-neutral-700',
            panelCollapsed ? 'px-2 justify-center' : 'px-4'
          )}
        >
          {resolvedHeader}
        </div>

        <nav
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-3 space-y-1"
          aria-label={navAriaLabel}
          onClick={isDrawer ? (event) => {
            const target = event.target;
            if (target instanceof Element && target.closest('a')) closeMobile();
          } : undefined}
        >
          {resolvedNav}
        </nav>

        {resolvedFooter && (
          <div
            className="flex-shrink-0 border-t border-neutral-200 dark:border-neutral-700 p-3"
            onClick={isDrawer ? closeMobile : undefined}
          >
            {resolvedFooter}
          </div>
        )}
      </>
    );
  };

  const sidebarWidth = collapsible ? (collapsed ? 'w-20' : 'w-64') : 'w-64';

  const desktopSidebar = (
    <aside
      className={cn(
        'fixed left-0 top-0 bottom-0',
        Z.SIDEBAR,
        'hidden bg-neutral-100 dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700',
        'transition-all duration-300 overflow-visible lg:flex lg:flex-col',
        sidebarWidth
      )}
      onMouseEnter={() => setShowRail(true)}
      onMouseLeave={() => setShowRail(false)}
    >
      {collapsible && (
        <div
          className={cn(
            'absolute -right-2 inset-y-0 z-10 w-4 flex items-center justify-center transition-opacity duration-300',
            showRail ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setCollapsed((c) => !c)}
          role="button"
          tabIndex={-1}
          aria-label={collapsed ? expandLabel : collapseLabel}
          style={{ cursor: collapsed ? 'e-resize' : 'w-resize' }}
        >
          <div className="absolute inset-y-0 left-1/2 w-[2px] bg-neutral-300 dark:bg-neutral-600" />
        </div>
      )}

      {collapsible && (
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            'absolute -right-3 top-[69px] -translate-y-1/2',
            'flex h-6 w-6 items-center justify-center rounded-full',
            'border border-neutral-200 dark:border-neutral-700',
            'bg-neutral-100 dark:bg-neutral-800 shadow-sm',
            Z.STICKY_HEADER
          )}
          aria-label={collapsed ? expandLabel : collapseLabel}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
          )}
        </button>
      )}

      {renderPanel(false, collapsed)}
    </aside>
  );

  const mainOffset = collapsible
    ? collapsed
      ? 'lg:pl-20'
      : 'lg:pl-64'
    : 'lg:pl-64';

  const mainContent = (
    <main
      className={cn(
        'flex-1 min-h-screen min-w-0 relative z-0 transition-all duration-300 pl-0',
        mainOffset
      )}
    >
      <div className="w-full h-full min-h-0 overflow-auto">
        {children}
      </div>
    </main>
  );

  if (withMobileDrawer) {
    return (
      <div className="flex min-h-screen w-full min-w-0 max-w-full overflow-x-hidden bg-neutral-50 dark:bg-neutral-950">
        {desktopSidebar}

        <button
          type="button"
          className={cn(
            'fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] left-4 z-10',
            'flex h-12 w-12 items-center justify-center rounded-full',
            'border border-neutral-200/80 bg-white/95 text-neutral-800',
            'shadow-lg shadow-neutral-900/10 ring-1 ring-neutral-900/5 backdrop-blur-sm',
            'transition-all duration-200 hover:bg-neutral-50 hover:shadow-xl active:scale-95',
            'dark:border-neutral-600/60 dark:bg-neutral-800/95 dark:text-neutral-100',
            'dark:shadow-black/30 dark:ring-white/10 dark:hover:bg-neutral-700/90 lg:hidden',
            mobileOpen ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100'
          )}
          onClick={() => setMobileOpen(true)}
          aria-label={openLabel}
          aria-expanded={mobileOpen}
        >
          <Menu className="h-5 w-5" />
        </button>

        {mobileOpen && (
          <div className="lg:hidden">
            <div
              role="presentation"
              className={cn(
                'fixed inset-0',
                Z.BACKDROP,
                'animate-in fade-in duration-200 bg-neutral-950/45 backdrop-blur-[3px] dark:bg-black/55'
              )}
              onClick={closeMobile}
              aria-hidden
            />
            <aside
              className={cn(
                'fixed left-0 top-0 bottom-0 flex w-[min(19rem,88vw)] max-w-[88vw] flex-col overflow-hidden',
                'rounded-r-2xl border-y border-r border-l-0 border-neutral-200/70',
                'bg-neutral-50/95 shadow-[0_12px_48px_-12px_rgba(0,0,0,0.22)] backdrop-blur-md',
                'animate-in slide-in-from-left-5 duration-300 ease-out',
                'dark:border-neutral-600/45 dark:bg-neutral-900/95 dark:shadow-black/40',
                Z.DRAWER
              )}
            >
              {renderPanel(true, false)}
            </aside>
          </div>
        )}

        {mainContent}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full min-w-0 max-w-full overflow-x-hidden bg-neutral-50 dark:bg-neutral-950">
      {desktopSidebar}
      {mainContent}
    </div>
  );
}
