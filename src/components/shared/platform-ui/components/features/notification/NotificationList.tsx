import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  AlertCircle, Bell, Check, Clock, Info, MessageSquare, 
  Archive, AlertTriangle, Zap, ExternalLink, MailOpen 
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { Badge } from '../../ui/badge';
import { Skeleton } from '../../ui/skeleton';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';
import { toast } from '../../primitives/feedback';

export interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'ALERT' | 'SYSTEM';
  scope: 'USER' | 'TEAM' | 'PLATFORM';
  status: 'UNREAD' | 'READ' | 'ARCHIVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  createdAt: string;
  readAt: string | null;
  relatedUrl: string | null;
  senderUser?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  actions?: {
    id: string;
    label: string;
    url: string | null;
    action: string | null;
  }[];
}

// API Client interface
export interface NotificationApiClient {
  get: (url: string, config?: unknown) => Promise<{ data: unknown}>;
  patch: (url: string, data?: unknown) => Promise<{ data: unknown}>;
}

interface NotificationListProps {
  apiClient: NotificationApiClient;
  onClose?: () => void;
  onViewAll?: () => void;
  maxHeight?: string;
  showHeader?: boolean;
  isPopover?: boolean;
}

export function NotificationList({
  apiClient,
  onViewAll,
  maxHeight = '400px',
  showHeader = true,
  isPopover = false
}: NotificationListProps) {
  const { t, i18n } = useTranslation(['common']);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/notifications', {
        params: {
          limit: isPopover ? 5 : 20,
          includeTeam: true,
          status: isPopover ? 'UNREAD' : 'UNREAD,READ'
        }
      });
      const data = response.data as { items: Notification[] };
      if (data && Array.isArray(data.items)) {
        const filteredItems = data.items.filter(
          (notification: Notification) => notification.status !== 'ARCHIVED'
        );
        setNotifications(filteredItems);

        const unread = filteredItems.filter(
          (notification: Notification) => notification.status === 'UNREAD'
        ).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('获取通知失败:', error);
      toast({
        variant: "destructive",
        title: t('notifications.fetch_error', 'Failed to fetch notifications'),
        description: t('notifications.fetch_error_message', 'An error occurred while fetching notifications')
      });
    } finally {
      setLoading(false);
    }
  }, [apiClient, isPopover, t]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`, {});

      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, status: 'READ', readAt: new Date().toISOString() } 
            : notification
        )
      );

      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('标记通知为已读失败:', error);
      toast({
        variant: "destructive",
        title: t('notifications.mark_read_error', 'Failed to mark as read'),
        description: t('notifications.mark_read_error_message', 'An error occurred while marking notification as read')
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.patch('/notifications/all/read', {});

      setNotifications(prev => 
        prev.map(notification => ({
          ...notification, 
          status: 'READ',
          readAt: notification.readAt || new Date().toISOString()
        }))
      );

      setUnreadCount(0);

      toast({
        title: t('notifications.all_marked_read', 'All notifications marked as read'),
        description: t('notifications.all_marked_read_message', 'All notifications have been marked as read')
      });
    } catch (error) {
      console.error('标记所有通知为已读失败:', error);
      toast({
        variant: "destructive",
        title: t('notifications.mark_all_read_error', 'Failed to mark all as read'),
        description: t('notifications.mark_all_read_error_message', 'An error occurred while marking all notifications as read')
      });
    }
  };

  const archiveNotification = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/archive`, {});

      setNotifications(prev => prev.filter(notification => notification.id !== id));

      const notification = notifications.find(n => n.id === id);
      if (notification && notification.status === 'UNREAD') {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      toast({
        title: t('notifications.archived', 'Notification archived'),
        description: t('notifications.archived_message', 'Notification has been archived')
      });
    } catch (error) {
      console.error('归档通知失败:', error);
      toast({
        variant: "destructive",
        title: t('notifications.archive_error', 'Failed to archive'),
        description: t('notifications.archive_error_message', 'An error occurred while archiving notification')
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const locale = i18n.language === 'zh' ? zhCN : enUS;

    if (date.toDateString() === now.toDateString()) {
      return formatDistanceToNow(date, { addSuffix: true, locale });
    }

    return format(date, 'PPp', { locale });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ERROR':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'WARN':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'SUCCESS':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'ALERT':
        return <Zap className="w-5 h-5 text-brand-primary" />;
      case 'SYSTEM':
        return <Bell className="w-5 h-5 text-brand-primary" />;
      case 'INFO':
      default:
        return <Info className="w-5 h-5 text-brand-primary" />;
    }
  };

  return (
    <div className="flex flex-col w-full">
      {showHeader && (
        <div className="flex items-center justify-between mb-2 px-3 py-2 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <h3 className="font-medium">{t('notifications.title', 'Notifications')}</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-accent/20 text-accent hover:bg-accent/30 animate-pulse">
                {unreadCount} {t('notifications.unread', 'unread')}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead} 
              className="text-xs text-accent hover:text-accent-dark hover:bg-accent/10"
            >
              <MailOpen className="w-3.5 h-3.5 mr-1" />
              {t('notifications.mark_all_read', 'Mark all as read')}
            </Button>
          )}
        </div>
      )}

      <ScrollArea className={`w-full overflow-y-auto custom-scrollbar`} style={{ maxHeight }}>
        {loading ? (
          <div className="space-y-4 p-3">
            {[1, 2, 3].map((_, index) => (
              <div key={index} className="flex gap-3 p-2">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-0.5">
            {notifications.map(notification => (
              <div 
                key={notification.id} 
                className={`p-3 transition-all duration-300 ${
                  notification.status === 'UNREAD' 
                    ? 'bg-accent/5 hover:bg-accent/10 dark:bg-accent/10 dark:hover:bg-accent/20' 
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className={`font-medium text-sm ${notification.status === 'UNREAD' ? 'font-semibold' : ''}`}>
                        {notification.title}
                      </h4>
                      <div className="flex items-center gap-1">
                        <TooltipProvider>
                          {notification.status === 'UNREAD' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-7 h-7 text-neutral-500 hover:text-accent hover:bg-accent/10"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  <MailOpen className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t('notifications.mark_read', 'Mark as read')}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7 text-neutral-500 hover:text-accent hover:bg-accent/10"
                                onClick={() => archiveNotification(notification.id)}
                              >
                                <Archive className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('notifications.archive', 'Archive')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 line-clamp-2 mt-0.5">
                      {notification.content}
                    </p>
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(notification.createdAt)}
                      </div>
                      <div className="flex gap-2">
                        {notification.relatedUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs rounded-full px-3"
                            onClick={() => {
                              window.open(notification.relatedUrl ?? '', '_blank');
                              markAsRead(notification.id);
                            }}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            {t('notifications.view', 'View')}
                          </Button>
                        )}
                        {notification.actions && notification.actions.length > 0 && (
                          notification.actions.map(action => (
                            <Button
                              key={action.id}
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs rounded-full px-3"
                              onClick={() => {
                                if (action.url) {
                                  window.open(action.url, '_blank');
                                }
                                markAsRead(notification.id);
                              }}
                            >
                              {action.label}
                            </Button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <div className="bg-neutral-50 dark:bg-neutral-900 p-4 rounded-full mb-3">
              <MessageSquare className="w-12 h-12 text-neutral-300 dark:text-neutral-600" />
            </div>
            <p className="text-neutral-500 dark:text-neutral-400 mb-1 font-medium">
              {t('notifications.no_notifications_title', 'No notifications')}
            </p>
            <p className="text-neutral-400 dark:text-neutral-500 text-sm">
              {t('notifications.no_notifications', 'You have no notifications at this time')}
            </p>
          </div>
        )}
      </ScrollArea>

      {isPopover && onViewAll && (
        <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <Button 
            variant="ghost" 
            className="w-full justify-center text-accent hover:bg-accent/10 hover:text-accent-dark transition-colors"
            onClick={onViewAll}
          >
            {t('notifications.view_all', 'View all')}
          </Button>
        </div>
      )}
    </div>
  );
}
