import React from 'react';
import * as Icons from 'lucide-react';
import i18n from '@/locales/i18n';

export const ICON_MAPPINGS: { [key: string]: React.ComponentType<{ className?: string }> } = {
  'dashboard': Icons.LayoutDashboard,
  'layout-dashboard': Icons.LayoutDashboard,
  'team': Icons.Users2,
  'solution': Icons.Briefcase,

  'dollar': Icons.DollarSign,
  'message': Icons.MessageSquare,
  'check-square': Icons.CheckSquare,
};

export const getLucideIcons = () => [
  { value: 'home', label: i18n.t('common:icons.home', 'Home') },
  { value: 'layout-dashboard', label: i18n.t('common:icons.layout_dashboard', 'Dashboard') },
  { value: 'dashboard', label: i18n.t('common:icons.dashboard', 'Dashboard (short)') },
  { value: 'users', label: i18n.t('common:icons.users', 'Users') },
  { value: 'team', label: i18n.t('common:icons.space', 'Space') },
  { value: 'user', label: i18n.t('common:icons.user', 'User') },
  { value: 'settings', label: i18n.t('common:icons.settings', 'Settings') },
  { value: 'cog', label: i18n.t('common:icons.cog', 'Gear') },
  { value: 'file', label: i18n.t('common:icons.file', 'File') },
  { value: 'folder', label: i18n.t('common:icons.folder', 'Folder') },
  { value: 'folder-open', label: i18n.t('common:icons.folder_open', 'Open Folder') },
  { value: 'bar-chart', label: i18n.t('common:icons.bar_chart', 'Bar Chart') },
  { value: 'line-chart', label: i18n.t('common:icons.line_chart', 'Line Chart') },
  { value: 'pie-chart', label: i18n.t('common:icons.pie_chart', 'Pie Chart') },
  { value: 'area-chart', label: i18n.t('common:icons.area_chart', 'Area Chart') },
  { value: 'scatter-chart', label: i18n.t('common:icons.scatter_chart', 'Scatter Chart') },
  { value: 'gantt-chart', label: i18n.t('common:icons.gantt_chart', 'Gantt Chart') },
  { value: 'candlestick-chart', label: i18n.t('common:icons.candlestick_chart', 'Candlestick Chart') },
  { value: 'bar-chart-2', label: i18n.t('common:icons.bar_chart_2', 'Bar Chart 2') },
  { value: 'bar-chart-3', label: i18n.t('common:icons.bar_chart_3', 'Bar Chart 3') },
  { value: 'bar-chart-horizontal', label: i18n.t('common:icons.bar_chart_horizontal', 'Bar Chart Horizontal') },
  { value: 'trending-up', label: i18n.t('common:icons.trending_up', 'Trending Up') },
  { value: 'trending-down', label: i18n.t('common:icons.trending_down', 'Trending Down') },
  { value: 'shopping-cart', label: i18n.t('common:icons.shopping_cart', 'Shopping Cart') },
  { value: 'package', label: i18n.t('common:icons.package', 'Package') },
  { value: 'truck', label: i18n.t('common:icons.truck', 'Truck') },
  { value: 'credit-card', label: i18n.t('common:icons.credit_card', 'Credit Card') },
  { value: 'dollar-sign', label: i18n.t('common:icons.dollar_sign', 'Dollar') },
  { value: 'calendar', label: i18n.t('common:icons.calendar', 'Calendar') },
  { value: 'clock', label: i18n.t('common:icons.clock', 'Clock') },
  { value: 'mail', label: i18n.t('common:icons.mail', 'Mail') },
  { value: 'phone', label: i18n.t('common:icons.phone', 'Phone') },
  { value: 'map', label: i18n.t('common:icons.map', 'Map') },
  { value: 'map-pin', label: i18n.t('common:icons.map_pin', 'Map Pin') },
  { value: 'star', label: i18n.t('common:icons.star', 'Star') },
  { value: 'heart', label: i18n.t('common:icons.heart', 'Heart') },
  { value: 'bookmark', label: i18n.t('common:icons.bookmark', 'Bookmark') },
  { value: 'tag', label: i18n.t('common:icons.tag', 'Tag') },
  { value: 'search', label: i18n.t('common:icons.search', 'Search') },
  { value: 'filter', label: i18n.t('common:icons.filter', 'Filter') },
  { value: 'edit', label: i18n.t('common:icons.edit', 'Edit') },
  { value: 'trash', label: i18n.t('common:icons.trash', 'Delete') },
  { value: 'plus', label: i18n.t('common:icons.plus', 'Add') },
  { value: 'minus', label: i18n.t('common:icons.minus', 'Decrease') },
  { value: 'check', label: i18n.t('common:icons.check', 'Check') },
  { value: 'x', label: i18n.t('common:icons.x', 'Close') },
  { value: 'alert-circle', label: i18n.t('common:icons.alert_circle', 'Warning') },
  { value: 'info', label: i18n.t('common:icons.info', 'Info') },
  { value: 'help-circle', label: i18n.t('common:icons.help_circle', 'Help') },
  { value: 'shield', label: i18n.t('common:icons.shield', 'Shield') },
  { value: 'lock', label: i18n.t('common:icons.lock', 'Lock') },
  { value: 'unlock', label: i18n.t('common:icons.unlock', 'Unlock') },
  { value: 'key', label: i18n.t('common:icons.key', 'Key') },
  { value: 'database', label: i18n.t('common:icons.database', 'Database') },
  { value: 'server', label: i18n.t('common:icons.server', 'Server') },
  { value: 'cloud', label: i18n.t('common:icons.cloud', 'Cloud') },
  { value: 'download', label: i18n.t('common:icons.download', 'Download') },
  { value: 'upload', label: i18n.t('common:icons.upload', 'Upload') },
  { value: 'link', label: i18n.t('common:icons.link', 'Link') },
  { value: 'external-link', label: i18n.t('common:icons.external_link', 'External Link') },
  { value: 'arrow-right', label: i18n.t('common:icons.arrow_right', 'Arrow Right') },
  { value: 'chevron-right', label: i18n.t('common:icons.chevron_right', 'Chevron Right') },
  { value: 'globe', label: i18n.t('common:icons.globe', 'Global') },
  { value: 'wifi', label: i18n.t('common:icons.wifi', 'WiFi') },
  { value: 'monitor', label: i18n.t('common:icons.monitor', 'Monitor') },
  { value: 'smartphone', label: i18n.t('common:icons.smartphone', 'Smartphone') },
  { value: 'tablet', label: i18n.t('common:icons.tablet', 'Tablet') },
  { value: 'camera', label: i18n.t('common:icons.camera', 'Camera') },
  { value: 'image', label: i18n.t('common:icons.image', 'Image') },
  { value: 'video', label: i18n.t('common:icons.video', 'Video') },
  { value: 'music', label: i18n.t('common:icons.music', 'Music') },
  { value: 'headphones', label: i18n.t('common:icons.headphones', 'Headphones') },
  { value: 'printer', label: i18n.t('common:icons.printer', 'Printer') },
  { value: 'layers', label: i18n.t('common:icons.layers', 'Layers') },
  { value: 'grid-3x3', label: i18n.t('common:icons.grid_3x3', 'Grid') },
  { value: 'list', label: i18n.t('common:icons.list', 'List') },
  { value: 'menu', label: i18n.t('common:icons.menu', 'Menu') },
  { value: 'more-horizontal', label: i18n.t('common:icons.more_horizontal', 'More') },
  { value: 'activity', label: i18n.t('common:icons.activity', 'Activity') },
  { value: 'zap', label: i18n.t('common:icons.zap', 'Lightning') },
  { value: 'target', label: i18n.t('common:icons.target', 'Target') },
  { value: 'flag', label: i18n.t('common:icons.flag', 'Flag') },
  { value: 'award', label: i18n.t('common:icons.award', 'Award') },
  { value: 'gift', label: i18n.t('common:icons.gift', 'Gift') },
  { value: 'wrench', label: i18n.t('common:icons.wrench', 'Wrench') },
  { value: 'hammer', label: i18n.t('common:icons.hammer', 'Hammer') },
  { value: 'building', label: i18n.t('common:icons.building', 'Building') },
  { value: 'warehouse', label: i18n.t('common:icons.warehouse', 'Warehouse') },
  { value: 'briefcase', label: i18n.t('common:icons.briefcase', 'Briefcase') },
  { value: 'solution', label: i18n.t('common:icons.solution', 'Solution') },
  { value: 'wallet', label: i18n.t('common:icons.wallet', 'Wallet') },
  { value: 'receipt', label: i18n.t('common:icons.receipt', 'Receipt') },
  { value: 'calculator', label: i18n.t('common:icons.calculator', 'Calculator') },
  { value: 'clipboard', label: i18n.t('common:icons.clipboard', 'Clipboard') },
  { value: 'archive', label: i18n.t('common:icons.archive', 'Archive') },
  { value: 'inbox', label: i18n.t('common:icons.inbox', 'Inbox') },
  { value: 'send', label: i18n.t('common:icons.send', 'Send') },
  { value: 'message-circle', label: i18n.t('common:icons.message_circle', 'Message') },
  { value: 'bell', label: i18n.t('common:icons.bell', 'Notification') },
  { value: 'eye', label: i18n.t('common:icons.eye', 'View') },
  { value: 'eye-off', label: i18n.t('common:icons.eye_off', 'Hide') },
  { value: 'refresh-cw', label: i18n.t('common:icons.refresh_cw', 'Refresh') },
  { value: 'history', label: i18n.t('common:icons.history', 'History') },
  { value: 'rotate-ccw', label: i18n.t('common:icons.rotate_ccw', 'Undo') },
  { value: 'save', label: i18n.t('common:icons.save', 'Save') },
  { value: 'share', label: i18n.t('common:icons.share', 'Share') },
  { value: 'copy', label: i18n.t('common:icons.copy', 'Copy') },
  { value: 'scissors', label: i18n.t('common:icons.scissors', 'Cut') },
  { value: 'paperclip', label: i18n.t('common:icons.paperclip', 'Attachment') },
  { value: 'book', label: i18n.t('common:icons.book', 'Book') },
  { value: 'bookmark-plus', label: i18n.t('common:icons.bookmark_plus', 'Add Bookmark') },
  { value: 'graduation-cap', label: i18n.t('common:icons.graduation_cap', 'Education') },
  { value: 'lightbulb', label: i18n.t('common:icons.lightbulb', 'Idea') },
  { value: 'rocket', label: i18n.t('common:icons.rocket', 'Rocket') },
  { value: 'puzzle', label: i18n.t('common:icons.puzzle', 'Puzzle') }
];

export const LUCIDE_ICONS = getLucideIcons();

export const renderLucideIcon = (iconName: string, className?: string): React.ReactNode => {
  if (!iconName) return null;

  const kebabCase = iconName
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
  const MappedIcon = ICON_MAPPINGS[iconName] ?? ICON_MAPPINGS[kebabCase];
  if (MappedIcon) {
    return <MappedIcon className={className} />;
  }

  const pascalCaseName = iconName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
    pascalCaseName
  ];

  if (!IconComponent) {
    console.warn(`Icon "${iconName}" not found in lucide-react`);
    return <Icons.File className={className} />;
  }

  return <IconComponent className={className} />;
};

export const getIconComponent = (icon: string, size: number = 4, className: string = ""): React.ReactNode => {
  if (!icon) return null;

  const sizeClass = `w-${size} h-${size}`;
  const fullClassName = `${sizeClass} ${className}`.trim();

  return renderLucideIcon(icon, fullClassName);
};

export const hasIcon = (iconName: string): boolean => {
  if (!iconName) return false;

  if (ICON_MAPPINGS[iconName]) return true;

  const pascalCaseName = iconName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  return !!(Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[pascalCaseName];
};

export const getAvailableIcons = () => getLucideIcons(); 