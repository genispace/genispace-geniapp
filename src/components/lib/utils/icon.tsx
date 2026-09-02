import React from 'react';
import { 
  Bot,
  Brain,
  MessageSquare,
  Database,
  FileText,
  Code,
  Cloud,
  Settings,
  Languages,
  Lightbulb,
  Boxes,
  Zap,
  Headset,
  Megaphone,
  ThumbsUp,
  Shield,
  Flag,
  TrendingUp,
  Mic,
  Eye,
  Package,
  Scale,
  Search,
  Filter,
  Plus,
  Sparkles,
  ArrowRight, ChevronDown, Upload, Activity, AlertTriangle, CheckCircle, CheckCircle2, XCircle, Edit, Archive, Link as LinkIcon, Check, Copy,
  BarChart3, Target, Clock, ArrowUpRight, ArrowDownRight, ChevronRight, 
  Calendar, Play, Pause, Loader, User, Tag,
  Workflow, 
  Mail, 
  Globe, 
  ArrowLeft,
  Save,
  Trash2,
  Download,
  X,
  BrainCircuit,
  ArrowRightLeft,
  Repeat,
  SplitSquareHorizontal,
  HelpCircle,
  BarChart2,
  Sliders,
  RefreshCw,
  History,
  Lock,
  EyeOff,
  Book,
  Wrench,
  Film,
  Briefcase,
  School,
  PenTool,
  Banknote,
  Sun,
  Video,
  Plane,
  Users,
  Newspaper,
  Heart,
  Image,
  UploadCloud,
  BookOpen,
  CalendarPlus,
  Clipboard,
  ClipboardList,
  TrendingDown,
  TableProperties,
  Server,
  ServerOff,
  Cpu,
  UserSearch,
  LayoutDashboard,
  Users2,
  BarChart,
  ChevronUp,
  Loader2,
  Key,
  ArrowDownLeft,
  ArrowUpLeft,
  List,
  Grid,
  MessageCircle,
  Stars,
  Paperclip,
  Info,
  Square,
  Send,
  PanelRight,
  PanelLeft,
  PlayCircle,
  GitBranch,
  ShieldCheck,
  AlertCircle,
  Radio,
  ImagePlus,
  ExternalLink,
  MoreHorizontal,
  Share,
  MoreVertical,
  Quote
} from 'lucide-react';

type IconName = 
  | 'arrow-right'
  | 'boxes'
  | 'chevron-up'
  | 'chevron-down'
  | 'upload'
  | 'activity'
  | 'alert-triangle'
  | 'check-circle'
  | 'x-circle'
  | 'edit'
  | 'list'
  | 'grid'
  | 'archive'
  | 'link'
  | 'check'
  | 'copy'
  | 'search'
  | 'filter'
  | 'key'
  | 'plus'
  | 'message'
  | 'brain'
  | 'bot'
  | 'database'
  | 'file'
  | 'text'
  | 'audio'
  | 'mic'
  | 'code'
  | 'cloud'
  | 'assistant'
  | 'classifier'
  | 'analyzer'
  | 'translator'
  | 'automation'
  | 'square'
  | 'settings'
  | 'integration'
  | 'custom'
  | 'generator'
  | 'customer-service'
  | 'customer-support'
  | 'marketing'
  | 'recommendation'
  | 'risk-control'
  | 'content-moderation'
  | 'forecast'
  | 'document'
  | 'voice'
  | 'vision'
  | 'logistics'
  | 'lightbulb'
  | 'custom-config'
  | 'legal'
  | 'sales'
  | 'sparkles'
  | 'bar-chart-2'
  | 'bar-chart-3'
  | 'target'
  | 'clock'
  | 'arrow-up-right'
  | 'arrow-down-right'
  | 'arrow-up-left'
  | 'arrow-down-left'
  | 'chevron-right'
  | 'calendar'
  | 'play'
  | 'pause'
  | 'tool'
  | 'loader'
  | 'loader-2'
  | 'user'
  | 'tag'
  | 'workflow'
  | 'database'
  | 'mail'
  | 'globe'
  | 'arrow-left'
  | 'save'
  | 'trash2'
  | 'download'
  | 'x'
  | 'brain-circuit'
  | 'arrow-right-left'
  | 'repeat'
  | 'history'
  | 'refresh'
  | 'refresh-cw'
  | 'split-square-horizontal'
  | 'help-circle'
  | 'sliders'
  | 'lock'
  | 'eye'
  | 'eye-off'
  | 'book'
  | 'image'
  | 'video'
  | 'weather'
  | 'finance'
  | 'design'
  | 'travel'
  | 'social'
  | 'stars'
  | 'news'
  | 'medical'
  | 'productivity'
  | 'education'
  | 'business'
  | 'entertainment'
  | 'utilities'
  | 'security'
  | 'other'
  | 'chat'
  | 'email'
  | 'communication'
  | 'data'
  | 'http'
  | 'code-branch'
  | 'trash'
  | 'upload-cloud'
  | 'all'
  | 'book-open'
  | 'zap'
  | 'clipboard'
  | 'clipboard-list'
  | 'calendar-plus'
  | 'trending-up'
  | 'trending-down'
  | 'database-search'
  | 'database-plus'
  | 'database-edit'
  | 'database-remove'
  | 'vector-polygon'
  | 'dashboard'
  | 'team'
  | 'solution'
  | 'bar-chart'
  | 'message-circle'
  | 'message-square'
  | 'paperclip'
  | 'trash-2'
  | 'info'
  | 'send'
  | 'panel-right'
  | 'panel-left'
  | 'timeline'
  | 'play-circle'
  | 'git-branch'
  | 'shield-check'
  | 'alert-circle'
  | 'radio'
  | 'file-text'
  | 'image-plus'
  | 'external-link'
  | 'more-horizontal'
  | 'cpu'
  | 'check-circle-2'
  | 'share'
  | 'type'
  | 'more-vertical'
  | 'quote';

const iconMap: Record<IconName, JSX.Element> = {
  'arrow-right': <ArrowRight />,
  'boxes': <Boxes />,
  'chevron-down': <ChevronDown />,
  'chevron-up': <ChevronUp />,
  'upload': <Upload />,
  'activity': <Activity />,
  'alert-triangle': <AlertTriangle />,
  'check-circle': <CheckCircle />,
  'x-circle': <XCircle />,
  'edit': <Edit />,
  'list': <List />,
  'grid': <Grid />,
  'archive': <Archive />,
  'link': <LinkIcon />,
  'check': <Check />,
  'copy': <Copy />,
  'search': <Search />,
  'filter': <Filter />,
  'key': <Key />,
  'plus': <Plus />,
  'message': <MessageSquare />,
  'brain': <Brain />,
  'bot': <Bot />,
  'database': <Database />,
  'file': <FileText />,
  'text': <FileText />,
  'audio': <Mic />,
  'mic': <Mic />,
  'code': <Code />,
  'cloud': <Cloud />,
  'assistant': <MessageSquare />,
  'classifier': <Brain />,
  'analyzer': <Settings />,
  'translator': <Languages />,
  'automation': <Settings />,
  'square': <Square />,
  'settings': <Settings />,
  'integration': <Code />,
  'custom': <Boxes />,
  'generator': <Zap />,
  'customer-service': <Headset />,
  'customer-support': <Headset />,
  'marketing': <Megaphone />,
  'recommendation': <ThumbsUp />,
  'risk-control': <Shield />,
  'content-moderation': <Flag />,
  'forecast': <TrendingUp />,
  'document': <FileText />,
  'voice': <Mic />,
  'vision': <Eye />,
  'logistics': <Package />,
  'custom-config': <Boxes />,
  'legal': <Scale />,
  'sales': <TrendingUp />,
  'sparkles': <Sparkles />,
  'lightbulb': <Lightbulb />,
  'bar-chart-2': <BarChart2 />,
  'bar-chart-3': <BarChart3 />,
  'target': <Target />,
  'clock': <Clock />,
  'arrow-up-right': <ArrowUpRight />,
  'arrow-down-right': <ArrowDownRight />,
  'arrow-up-left' : <ArrowUpLeft />,
  'arrow-down-left': <ArrowDownLeft />,
  'chevron-right': <ChevronRight />,
  'calendar': <Calendar />,
  'play': <Play />,
  'pause': <Pause />,
  'loader': <Loader />,
  'loader-2': <Loader2 />,
  'user': <User />,
  'tag': <Tag />,
  'workflow': <Workflow />,
  'mail': <Mail />,
  'globe': <Globe />,
  'arrow-left': <ArrowLeft />,
  'save': <Save />,
  'sliders': <Sliders />,
  'trash2': <Trash2 />,
  'download': <Download />,
  'x': <X />,
  'brain-circuit': <BrainCircuit />,
  'arrow-right-left': <ArrowRightLeft />,
  'repeat': <Repeat />,
  'history': <History />,
  'refresh': <RefreshCw />,
  'refresh-cw': <RefreshCw />,
  'split-square-horizontal': <SplitSquareHorizontal />,
  'help-circle': <HelpCircle />,
  'lock': <Lock />,
  'eye': <Eye />,
  'eye-off': <EyeOff />,
  'book': <Book />,
  'image': <Image />,
  'video': <Video />,
  'weather': <Sun />,
  'finance': <Banknote />,
  'design': <PenTool />,
  'tool': <Boxes />,
  'travel': <Plane />,
  'social': <Users />,
  'stars': <Stars />,
  'news': <Newspaper />,
  'medical': <Heart />,
  'productivity': <Calendar />,
  'education': <School />,
  'business': <Briefcase />,
  'entertainment': <Film />,
  'utilities': <Wrench />,
  'security': <Shield />,
  'other': <Bot />,
  'chat': <MessageSquare />,
  'email': <Mail />,
  'communication': <MessageSquare />,
  'http': <Globe />,
  'data': <Database />,
  'code-branch': <ArrowRightLeft />,
  'trash': <Trash2 />,
  'upload-cloud': <UploadCloud />,
  'all': <Boxes />,
  'book-open': <BookOpen />,
  'zap': <Zap />,
  'clipboard': <Clipboard />,
  'clipboard-list': <ClipboardList />,
  'calendar-plus': <CalendarPlus />,
  'trending-up': <TrendingUp />,
  'trending-down': <TrendingDown />,
  'database-search': <UserSearch />,
  'database-plus': <Server />,
  'database-edit': <TableProperties />,
  'database-remove': <ServerOff />,
  'vector-polygon': <Cpu />,
  'dashboard': <LayoutDashboard />,
  'team': <Users2 />,
  'solution': <Briefcase />,
  'bar-chart': <BarChart />,
  'message-circle': <MessageCircle />,
  'message-square': <MessageSquare />,
  'paperclip': <Paperclip />,
  'trash-2': <Trash2 />,
  'info': <Info />,
  'send': <Send />,
  'panel-right': <PanelRight />,
  'panel-left': <PanelLeft />,
  'timeline': <Activity />,
  'play-circle': <PlayCircle />,
  'git-branch': <GitBranch />,
  'shield-check': <ShieldCheck />,
  'alert-circle': <AlertCircle />,
  'radio': <Radio />,
  'file-text': <FileText />,
  'image-plus': <ImagePlus />,
  'external-link': <ExternalLink />,
  'more-horizontal': <MoreHorizontal />,
  'cpu': <Cpu />,
  'check-circle-2': <CheckCircle />,
  'share': <Share />,
  'type': <FileText />,
  'more-vertical': <MoreVertical />,
  'quote': <Quote />
};

const pascalCaseIconMap: Record<string, JSX.Element> = {

  'FileText': <FileText />,
  'Brain': <Brain />,
  'Shield': <Shield />,
  'Check': <Check />,
  'Edit': <Edit />,
  'AlertTriangle': <AlertTriangle />,
  'Calendar': <Calendar />,
  'TrendingUp': <TrendingUp />,
  'CheckCircle': <CheckCircle />,
  'CheckCircle2': <CheckCircle2 />,
  'XCircle': <XCircle />,
  'Upload': <Upload />,
  'Activity': <Activity />,
  'Archive': <Archive />,
  'Copy': <Copy />,
  'Search': <Search />,
  'Filter': <Filter />,
  'Plus': <Plus />,
  'MessageSquare': <MessageSquare />,
  'Bot': <Bot />,
  'Database': <Database />,
  'Code': <Code />,
  'Cloud': <Cloud />,
  'Settings': <Settings />,
  'Languages': <Languages />,
  'Lightbulb': <Lightbulb />,
  'Boxes': <Boxes />,
  'Zap': <Zap />,
  'Headset': <Headset />,
  'Megaphone': <Megaphone />,
  'ThumbsUp': <ThumbsUp />,
  'Flag': <Flag />,
  'Mic': <Mic />,
  'Eye': <Eye />,
  'Package': <Package />,
  'Scale': <Scale />,
  'Sparkles': <Sparkles />,
  'BarChart2': <BarChart2 />,
  'BarChart3': <BarChart3 />,
  'Target': <Target />,
  'Clock': <Clock />,
  'ArrowUpRight': <ArrowUpRight />,
  'ArrowDownRight': <ArrowDownRight />,
  'ArrowUpLeft': <ArrowUpLeft />,
  'ArrowDownLeft': <ArrowDownLeft />,
  'ChevronRight': <ChevronRight />,
  'ChevronDown': <ChevronDown />,
  'ChevronUp': <ChevronUp />,
  'Play': <Play />,
  'Pause': <Pause />,
  'Loader': <Loader />,
  'Loader2': <Loader2 />,
  'User': <User />,
  'Tag': <Tag />,
  'Workflow': <Workflow />,
  'Mail': <Mail />,
  'Globe': <Globe />,
  'ArrowLeft': <ArrowLeft />,
  'ArrowRight': <ArrowRight />,
  'Save': <Save />,
  'Trash2': <Trash2 />,
  'Download': <Download />,
  'X': <X />,
  'BrainCircuit': <BrainCircuit />,
  'ArrowRightLeft': <ArrowRightLeft />,
  'Repeat': <Repeat />,
  'SplitSquareHorizontal': <SplitSquareHorizontal />,
  'HelpCircle': <HelpCircle />,
  'Sliders': <Sliders />,
  'History': <History />,
  'RefreshCw': <RefreshCw />,
  'Lock': <Lock />,
  'EyeOff': <EyeOff />,
  'Book': <Book />,
  'Wrench': <Wrench />,
  'Film': <Film />,
  'Briefcase': <Briefcase />,
  'School': <School />,
  'PenTool': <PenTool />,
  'Banknote': <Banknote />,
  'Sun': <Sun />,
  'Video': <Video />,
  'Plane': <Plane />,
  'Users': <Users />,
  'Newspaper': <Newspaper />,
  'Heart': <Heart />,
  'Image': <Image />,
  'UploadCloud': <UploadCloud />,
  'BookOpen': <BookOpen />,
  'CalendarPlus': <CalendarPlus />,
  'Clipboard': <Clipboard />,
  'ClipboardList': <ClipboardList />,
  'TrendingDown': <TrendingDown />,
  'TableProperties': <TableProperties />,
  'Server': <Server />,
  'ServerOff': <ServerOff />,
  'Cpu': <Cpu />,
  'UserSearch': <UserSearch />,
  'LayoutDashboard': <LayoutDashboard />,
  'Users2': <Users2 />,
  'BarChart': <BarChart />,
  'MessageCircle': <MessageCircle />,
  'Paperclip': <Paperclip />,
  'Info': <Info />,
  'Send': <Send />,
  'PanelRight': <PanelRight />,
  'PanelLeft': <PanelLeft />,
  'PlayCircle': <PlayCircle />,
  'GitBranch': <GitBranch />,
  'ShieldCheck': <ShieldCheck />,
  'AlertCircle': <AlertCircle />,
  'Radio': <Radio />,
  'ImagePlus': <ImagePlus />,
  'ExternalLink': <ExternalLink />,
  'MoreHorizontal': <MoreHorizontal />,
  'Share': <Share />,
  'MoreVertical': <MoreVertical />,
  'Quote': <Quote />,
  'List': <List />,
  'Grid': <Grid />,
  'Square': <Square />
};

function pascalToKebab(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

export const getIconComponent = (iconName: string, size: number = 6, className?: string): JSX.Element => {

  let Icon = iconMap[iconName as IconName];

  if (!Icon) {
    Icon = pascalCaseIconMap[iconName];
  }

  if (!Icon) {
    const kebabCase = pascalToKebab(iconName);
    Icon = iconMap[kebabCase as IconName];
  }

  if (!Icon) {
    Icon = <Bot />;
  }

  return React.cloneElement(Icon, {
    className: `w-${size} h-${size} ${className || ''}`
  });
};
