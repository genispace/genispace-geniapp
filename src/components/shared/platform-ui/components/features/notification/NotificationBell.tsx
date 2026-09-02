import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { NotificationList, NotificationApiClient } from './NotificationList';

interface NotificationBellProps {
  apiClient: NotificationApiClient;
  onViewAll?: () => void;
  getUnreadCount?: () => Promise<{ success: boolean; data: { total: number } }>;
}

export function NotificationBell({ 
  apiClient, 
  onViewAll,
  getUnreadCount
}: NotificationBellProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const notificationsInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchUnreadNotificationsCount = useCallback(async () => {
    if (!getUnreadCount) return;

    try {
      const response = await getUnreadCount();
      if (response && response.success && response.data) {
        setUnreadNotificationsCount(response.data.total);
      }
    } catch (error) {
      console.error('Failed to fetch unread notifications count', error);
    }
  }, [getUnreadCount]);

  useEffect(() => {
    if (getUnreadCount) {
      void fetchUnreadNotificationsCount();

      notificationsInterval.current = setInterval(() => {
        void fetchUnreadNotificationsCount();
      }, 60000);
    }

    return () => {
      if (notificationsInterval.current) {
        clearInterval(notificationsInterval.current);
      }
    };
  }, [getUnreadCount, fetchUnreadNotificationsCount]);

  const handleViewAllNotifications = () => {
    setShowNotifications(false);
    if (onViewAll) {
      onViewAll();
    }
  };

  return (
    <div className="relative">
      <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
        <DropdownMenuTrigger asChild>
          <button
            className="p-2 rounded-lg hover:bg-surface-darker/10 dark:hover:bg-surface/10 relative transition-colors duration-300"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] px-1">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-[380px] p-0 shadow-lg"
          sideOffset={10}
        >
          <div className="py-2 px-3">
            <NotificationList 
              apiClient={apiClient}
              onClose={() => setShowNotifications(false)} 
              onViewAll={handleViewAllNotifications} 
              maxHeight="400px"
              isPopover={true}
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
