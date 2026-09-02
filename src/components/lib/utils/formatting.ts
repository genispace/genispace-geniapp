import i18n from '@/locales/i18n';

export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = (seconds % 60).toFixed(2);
  return `${minutes}m ${remainingSeconds}s`;
};

export const formatDurationFromMs = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  return formatDuration(seconds);
};

export const formatDateTime = (dateString: string | null): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString();
};

export const formatRelativeTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    // 'common:time.*' — the time group sits at the top level of common.json
    // (the old 'common.time.*' keys resolved to nothing and always fell back to English)
    if (diffInSeconds < 60) {
      return i18n.t('common:time.just_now', 'Just now');
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return i18n.t('common:time.minutes_ago', '{{minutes}} minutes ago', { minutes });
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return i18n.t('common:time.hours_ago', '{{hours}} hours ago', { hours });
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return i18n.t('common:time.days_ago', '{{days}} days ago', { days });
    } else if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2592000);
      return i18n.t('common:time.months_ago', '{{months}} months ago', { months });
    } else {
      const years = Math.floor(diffInSeconds / 31536000);
      return i18n.t('common:time.years_ago', '{{years}} years ago', { years });
    }
  } catch (error) {
    console.warn('时间格式化失败:', error);
    return i18n.t('common:time.unknown', 'Unknown time');
  }
}; 