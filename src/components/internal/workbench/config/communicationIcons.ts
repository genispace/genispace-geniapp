import React from 'react';
import i18n from '@/locales/i18n';
import {

  CheckCircle,
  CheckCircle2,
  Check,

  AlertCircle,
  AlertTriangle,
  XCircle,

  Play,
  PlayCircle,
  Square,
  StopCircle,
  Pause,

  Edit,
  Edit3,
  RotateCcw,
  RefreshCw,

  Activity,
  TrendingUp,
  TrendingDown,
  BarChart,
  PieChart,

  MousePointer,
  MousePointer2,
  Hand,

  Download,
  Upload,
  Database,
  FileText,

  Filter,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,

  Grid,
  List,
  Table,
  Columns,

  Send,
  Radio,
  Zap,
  Wifi,

  Tag,
  Hash,
  Bookmark,

  Clock,
  Timer,
  Calendar,

  Settings,
  Wrench,

  Info,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';

export type IconName = keyof typeof COMMUNICATION_ICONS;

export type IconComponent = React.ComponentType<{ className?: string; size?: number | string }>;

export interface IconCategory {
  name: string;
  label: string;
  description: string;
  icons: IconName[];
}

export const COMMUNICATION_ICONS: Record<string, IconComponent> = {

  'check-circle': CheckCircle,
  'check-circle-2': CheckCircle2,
  'check': Check,

  'alert-circle': AlertCircle,
  'alert-triangle': AlertTriangle,
  'x-circle': XCircle,

  'play': Play,
  'play-circle': PlayCircle,
  'square': Square,
  'stop-circle': StopCircle,
  'pause': Pause,

  'edit': Edit,
  'edit-3': Edit3,
  'rotate-ccw': RotateCcw,
  'refresh-cw': RefreshCw,

  'activity': Activity,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'bar-chart': BarChart,
  'pie-chart': PieChart,

  'mouse-pointer': MousePointer,
  'mouse-pointer-2': MousePointer2,
  'touch': Hand,

  'download': Download,
  'upload': Upload,
  'database': Database,
  'file-text': FileText,

  'filter': Filter,
  'arrow-up-down': ArrowUpDown,
  'chevron-up': ChevronUp,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,

  'grid': Grid,
  'list': List,
  'table': Table,
  'columns': Columns,

  'send': Send,
  'radio': Radio,
  'zap': Zap,
  'wifi': Wifi,

  'tag': Tag,
  'hash': Hash,
  'bookmark': Bookmark,

  'clock': Clock,
  'timer': Timer,
  'calendar': Calendar,

  'settings': Settings,
  'tool': Wrench,
  'wrench': Wrench,

  'info': Info,
  'help-circle': HelpCircle,
  'eye': Eye,
  'eye-off': EyeOff
};

export const ICON_CATEGORIES: IconCategory[] = [
  {
    name: 'success',
    label: i18n.t('communication_icons.success_status', 'Success Status'),
    description: i18n.t('communication_icons.success_status_description', 'Icons representing success, completion, correctness'),
    icons: ['check-circle', 'check-circle-2', 'check']
  },
  {
    name: 'error',
    label: i18n.t('communication_icons.error_status', 'Error Status'),
    description: i18n.t('communication_icons.error_status_description', 'Icons representing errors, warnings, failures'),
    icons: ['alert-circle', 'alert-triangle', 'x-circle']
  },
  {
    name: 'lifecycle',
    label: i18n.t('communication_icons.lifecycle', 'Lifecycle'),
    description: i18n.t('communication_icons.lifecycle_description', 'Icons representing start, stop, pause and other states'),
    icons: ['play', 'play-circle', 'square', 'stop-circle', 'pause']
  },
  {
    name: 'change',
    label: i18n.t('communication_icons.change_operation', 'Change Operation'),
    description: i18n.t('communication_icons.change_operation_description', 'Icons representing editing, updating, refreshing and other changes'),
    icons: ['edit', 'edit-3', 'rotate-ccw', 'refresh-cw']
  },
  {
    name: 'activity',
    label: i18n.t('communication_icons.activity_trend', 'Activity Trend'),
    description: i18n.t('communication_icons.activity_trend_description', 'Icons representing activity, trends, statistics'),
    icons: ['activity', 'trending-up', 'trending-down', 'bar-chart', 'pie-chart']
  },
  {
    name: 'action',
    label: i18n.t('communication_icons.user_action', 'User Action'),
    description: i18n.t('communication_icons.user_action_description', 'Icons representing clicks, touches and other user interactions'),
    icons: ['mouse-pointer', 'mouse-pointer-2', 'touch']
  },
  {
    name: 'data',
    label: i18n.t('communication_icons.data_operation', 'Data Operation'),
    description: i18n.t('communication_icons.data_operation_description', 'Icons representing data transmission, storage and other operations'),
    icons: ['download', 'upload', 'database', 'file-text']
  },
  {
    name: 'filter',
    label: i18n.t('communication_icons.filter_sort', 'Filter & Sort'),
    description: i18n.t('communication_icons.filter_sort_description', 'Icons representing filtering, sorting, navigation'),
    icons: ['filter', 'arrow-up-down', 'chevron-up', 'chevron-down', 'chevron-left', 'chevron-right']
  },
  {
    name: 'layout',
    label: i18n.t('communication_icons.layout_view', 'Layout View'),
    description: i18n.t('communication_icons.layout_view_description', 'Icons representing different layouts and view modes'),
    icons: ['grid', 'list', 'table', 'columns']
  },
  {
    name: 'communication',
    label: i18n.t('communication_icons.communication_interaction', 'Communication Interaction'),
    description: i18n.t('communication_icons.communication_interaction_description', 'Icons representing sending, receiving, communication'),
    icons: ['send', 'radio', 'zap', 'wifi']
  }
];

export const getIcon = (iconName: string, defaultIcon: IconName = 'activity'): IconComponent => {
  return COMMUNICATION_ICONS[iconName] || COMMUNICATION_ICONS[defaultIcon];
};

export const getIconsByCategory = (categoryName: string): IconName[] => {
  const category = ICON_CATEGORIES.find(cat => cat.name === categoryName);
  return category?.icons || [];
};

export const getAllIconNames = (): IconName[] => {
  return Object.keys(COMMUNICATION_ICONS) as IconName[];
};

export const isValidIconName = (iconName: string): iconName is IconName => {
  return iconName in COMMUNICATION_ICONS;
};

export const getRecommendedIconsForTriggerCategory = (category: string): IconName[] => {
  switch (category) {
    case 'success':
      return ['check-circle', 'check-circle-2', 'check'];
    case 'error':
      return ['alert-circle', 'alert-triangle', 'x-circle'];
    case 'change':
      return ['edit', 'refresh-cw', 'rotate-ccw'];
    case 'action':
      return ['mouse-pointer', 'touch', 'play'];
    case 'lifecycle':
      return ['play-circle', 'stop-circle', 'activity'];
    default:
      return ['activity', 'zap', 'radio'];
  }
};

export const createIconComponent = (iconName: string, className: string = "w-4 h-4"): React.ReactElement => {
  const IconComponent = getIcon(iconName);
  return React.createElement(IconComponent, { className });
};

export const LEGACY_ICON_MAP: Record<string, IconName> = {
  'CheckCircle': 'check-circle',
  'AlertCircle': 'alert-circle',
  'Edit': 'edit',
  'AlertTriangle': 'alert-triangle',
  'CheckCircle2': 'check-circle-2',
  'RotateCcw': 'rotate-ccw',
  'Play': 'play',
  'Square': 'square',
  'Activity': 'activity',
  'TrendingUp': 'trending-up',
  'MousePointer': 'mouse-pointer',
  'MousePointer2': 'mouse-pointer-2',
  'Check': 'check',
  'Download': 'download',
  'Filter': 'filter',
  'ChevronRight': 'chevron-right',
  'ArrowUpDown': 'arrow-up-down',
  'BarChart': 'bar-chart',
  'Tag': 'tag'
};

export const convertLegacyIconName = (legacyName: string): IconName => {
  return LEGACY_ICON_MAP[legacyName] as IconName || 'activity';
};
