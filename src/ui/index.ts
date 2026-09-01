export { Z_INDEX_LAYERS, Z_INDEX_CLASSES } from './styles/z-index-layers';
export {
  CSS_VARS,
  BRAND_COLORS,
  TYPOGRAPHY,
  SPACING,
  SHADOWS,
  TRANSITIONS,
  MODAL_DIMENSIONS,
} from './styles/design-tokens';

// Re-export the canonical class-name helper so consumers don't need to import
// it from `@genispace/geniapp/utils` separately. Mirrors shadcn's `cn()`.
export { cn } from '@genispace/geniapp/utils';

export { Button, buttonVariants, type ButtonProps } from './components/ui/button';
export { Input } from './components/ui/input';
export { Label } from './components/ui/label';
export { Textarea } from './components/ui/textarea';
export { Checkbox } from './components/ui/checkbox';
export { Switch } from './components/ui/switch';
export { RadioGroup, RadioGroupItem } from './components/ui/radio-group';
export { RadioButtonGroup, type RadioButtonGroupProps, type RadioButtonOption } from './components/ui/radio-button-group';
export { Slider } from './components/ui/slider';
export { Progress } from './components/ui/progress';
export { Skeleton } from './components/ui/skeleton';
export { Separator, type SeparatorProps } from './components/ui/separator';
export { Badge, badgeVariants, type BadgeProps } from './components/ui/badge';
export { StripePaymentMark } from './components/icons/stripe-payment-mark';
export { WeChatPayMark } from './components/icons/wechat-pay-mark';
export { AlipayPayMark } from './components/icons/alipay-pay-mark';
export { BankTransferMark } from './components/icons/bank-transfer-mark';
export { Avatar, AvatarImage, AvatarFallback } from './components/ui/avatar';
export {
  UserAvatar,
  userInitials,
  resolveAvatarUrl,
  type UserAvatarProps,
  type UserAvatarVariant,
} from './components/features/user/UserAvatar';
export { UserDisplay, type UserDisplayProps } from './components/features/user/UserDisplay';
export { UserSelect, type UserSelectProps } from './components/features/user/UserSelect';
export { useUserDirectory, type UseUserDirectoryResult } from './components/features/user/useUserDirectory';
export type {
  PublicUserProfile,
  UserDirectoryClient,
} from './components/features/user/userDirectoryTypes';
export {
  AvatarPickerModal,
  AVATAR_STYLES,
  generateAvatarUrl,
  type AvatarPickerModalProps,
  type AvatarPickerLabels,
  type AvatarStyle,
} from './components/features/avatar';
export {
  AgentIdentity,
  agentIdentitySizeClass,
  getAgentIdentityInitials,
  getAgentIdentityTone,
  type AgentIdentityProps,
  type AgentIdentitySize,
} from './components/features/agent';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './components/ui/card';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
export {
  UnderlineTabs,
  UnderlineTabsList,
  UnderlineTabsTrigger,
  UnderlineTabsContent,
  underlineTabsTriggerVariants,
} from './components/ui/underline-tabs';
export { Toggle, toggleVariants } from './components/ui/toggle';
export { ToggleGroup, ToggleGroupItem } from './components/ui/toggle-group';
export {
  ViewModeToggle,
  type ViewModeToggleProps,
  type ViewMode,
} from './components/ui/view-mode-toggle';
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './components/ui/accordion';
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from './components/ui/collapsible';
export { ScrollArea, ScrollBar } from './components/ui/scroll-area';
export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './components/ui/sheet';
export { SidebarRail } from './components/ui/sidebar-rail';

// export * from './components/ui/sidebar';

export {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
  useFormField,
} from './components/ui/form';

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './components/ui/dialog';
export { DialogInput, type DialogInputProps } from './components/ui/dialog-input';

export {
  AlertDialog,
  AlertProvider,
  useAlert,
  useAlertDialog,
  type AlertType,
} from './components/ui/alert-dialog';

export {
  ModalContainer,
  useModal,
  MODAL_SIZES,
  type ModalSize,
} from './components/ui/modal-container';

export {
  BaseModal,
  FormModal,
  ConfirmModal,
  ListModal,
} from './components/ui/modal-templates';

export * from './components/ui/dialog-safe-select';

export * from './components/ui/dropdown-menu';
export * from './components/ui/select';
export { MultiSelect, type MultiSelectProps, type MultiSelectOption } from './components/ui/multi-select';
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from './components/ui/popover';
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './components/ui/tooltip';

export { Calendar, type CalendarProps } from './components/ui/calendar';
export { DatePicker, type DatePickerProps } from './components/ui/date-picker';
export { DateRangePicker, type DateRangePickerProps, type DateRange } from './components/ui/date-range-picker';
export {
  DateRangeFilter,
  type DateRangeFilterProps,
  type DateRange as DateRangeFilterDateRange,
  type DateRangeQuickSelectPresetKey
} from './components/ui/date-range-filter';

export { Alert, AlertTitle, AlertDescription } from './components/ui/alert';
export {
  HintNotice,
  type HintNoticeProps,
  type HintNoticeVariant,
} from './components/ui/hint-notice';
export { HelpTip, type HelpTipProps } from './components/ui/help-tip';
export {
  FeatureGuide,
  FeatureGuideTrigger,
  type FeatureGuideProps,
  type FeatureGuideStep,
  type FeatureGuideTriggerProps,
} from './components/ui/feature-guide';
export {
  AiDraftBanner,
  type AiDraftBannerProps,
  type AiDraftBannerTone,
} from './components/ui/ai-draft-banner';
export {
  useColumnConfig,
  ColumnConfigMenu,
  type ColumnConfigColumn,
  type ColumnConfigMenuProps,
  type UseColumnConfigResult,
} from './components/ui/column-config';
export * from './components/ui/toast';
export { Toaster, useToast, toast } from './components/primitives/feedback';
export { FilePreviewDialog, type FilePreviewDialogProps, ApiErrorState, type ApiErrorStateProps } from './components/primitives/data-display';

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from './components/ui/breadcrumb';

export * from './components/ui/table';

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  type ChartConfig,
} from './components/ui/chart';

export { AiSuggestion, AiSuggestionAction, AiMessage } from './components/ai';
/** Optional: import from `./components/features/rich-text/RichTextField` when @tiptap/* peers are installed. */

export * from './components/ui/pagination';

export {
  H1,
  H2,
  H3,
  H4,
  P,
  Blockquote,
  InlineCode,
  Lead,
  Large,
  Small,
  Muted,
} from './components/ui/typography';

// Re-export all components from the components directory
// This provides a unified entry point for all shared components
export * from './components';

// Home feature components - export through the home index
export { HomepageBackground } from './components/features/home';

// Feature namespaces - explicitly export to ensure TypeScript can resolve them
export * as Auth from './components/features/auth';
export * as Task from './components/features/task';
export * as Agent from './components/features/agent';
export * as Chat from './components/features/chat';
export * as Application from './components/features/auth/application';
export * as Operator from './components/features/operator';
export * as Data from './components/features/data';
export * as Team from './components/features/team';
export * as Space from './components/features/space';
export * as Rbac from './components/features/rbac';

export {
  SpaceContext,
  SpaceProvider,
  useSpace,
  SpaceSwitcher,
  type SpaceMember,
  type SpaceOwner,
  type SpaceApiClient,
  type SpaceProviderProps,
  type Space as SpaceModel,
  getSpaceIconType,
  getSpaceIconStyle,
  roleColors as spaceRoleColors,
  useRoleNames,
  getRoleName,
  getRoleNameEn,
  getRoleClass,
} from './components/features/space';

/** @deprecated Use SpaceContext / useSpace or `Team` namespace */
export {
  TeamContext,
  TeamProvider,
  useTeam,
  TeamSwitcher,
  type TeamMember,
  type TeamOwner,
  type TeamApiClient,
  type TeamProviderProps,
  getTeamIconType,
  getTeamIconStyle,
} from './components/features/team';

// Direct exports for commonly used components
export {
  RequireAuth,
  type RequireAuthApiClient,
  type RequireAuthProps,
  type RequireAuthUser,
} from './components/features/auth/RequireAuth';
export { LogoutNotificationPage } from './components/features/auth/LogoutNotificationPage';

// Hooks
export { useLockBodyScroll } from './hooks/useLockBodyScroll';
export { useIsMobile, MOBILE_BREAKPOINT } from './hooks/useIsMobile';
export { useTheme, type UseThemeOptions } from './hooks/useTheme';
export { useLanguage, type UseLanguageOptions } from './hooks/useLanguage';
export { useUserSettings, type UserSettings, type UserPreferences, type UserSettingsApiClient } from './hooks/useUserSettings';
export { useAppSettings, type UseAppSettingsOptions } from './hooks/useAppSettings';
export { useWorkflowCanvas, type UseWorkflowCanvasOptions, type UseWorkflowCanvasReturn } from './hooks/useWorkflowCanvas';
export { useAuthTokenSync } from './hooks/useAuthTokenSync';
export {
  BUILT_IN_APPS_QUERY_KEY,
  MOCK_BUILT_IN_APPS,
  fetchBuiltInApps,
  mapBuiltInAppsToHeaderItems,
  mapNavAppsToHeaderItems,
  pickBuiltInAppDisplayName,
  pickBuiltInAppDisplayDescription,
  type BuiltInApp,
  type BuiltInAppLocaleBlock,
  type BuiltInAppLocales,
  type AppNavigationItem,
  type BuiltInAppsApiClient,
  type BuiltInAppsPayload,
} from './hooks/builtInApps';
export { resolveShellNavLucideIcon } from './hooks/shellNavLucideIcon';
export { useBuiltInApps } from './hooks/useBuiltInApps';
export {
  usePinnedBuiltInNavApps,
  PINNED_BUILT_IN_NAV_APPS_CHANGED_EVENT,
  type UsePinnedBuiltInNavAppsOptions,
} from './hooks/pinnedBuiltInNavApps';
export {
  normalizePinnedBuiltInNavAppsMap,
  type PinnedBuiltInNavAppsMap,
} from './hooks/userPreferencesPinnedNav';
export {
  useChatEntryTarget,
  DEFAULT_CHAT_LANDING_PATH,
  type ChatEntryTarget,
  type UseChatEntryTargetOptions,
} from './hooks/useChatEntryTarget';
export { usePageState, type PageStateOptions, type PageStateReturn, type StorageType } from './hooks/usePageState';
export { UserSettingsProvider, useUserSettingsContext, type UserSettingsProviderProps } from './contexts/UserSettingsContext';
export {
  AppHostContext,
  AppHostProvider,
  useAppHost,
  type AppHostContextValue,
} from './context/AppHostContext';
// Platform abstraction (web vs desktop)
export {
  getPlatform,
  isDesktop,
  openExternal,
  navigateTo,
  resolveAbsoluteUrl,
  resolveNavigationHref,
  isAbsoluteUrl,
  isModifiedNavigationClick,
  openNavigationInNewTab,
  navigateHeaderLink,
  handleHeaderNavigationClick,
  handleHeaderAnchorClick,
  navigateExternalOrInApp,
} from './platform';
export type { Platform } from './platform/types';
export type { NavigateToOptions } from './platform';

export { AppSidebar, type AppSidebarProps, type AppSidebarNavGroup } from './components/features/app/Sidebar';
export { AppPage, type AppPageProps } from './components/features/app/Page';
export { AppPageStates, type AppPageStatesProps } from './components/features/app/AppPageStates';
export { AppDashboardSkeleton, type AppDashboardSkeletonProps } from './components/features/app/AppDashboardSkeleton';
export { QueryErrorAlert, type QueryErrorAlertProps } from './components/features/app/QueryErrorAlert';
export {
  AppModal,
  AppHelpSheet,
  type AppModalProps,
  type AppModalSize,
  type AppHelpSheetProps,
} from './components/features/app/AppModal';
export {
  AppConfirmDialog,
  type AppConfirmDialogProps,
} from './components/features/app/AppConfirmDialog';
export {
  AppDatePicker,
  AppDateRangePicker,
  AppDateTimePicker,
  AppTimePicker,
  temporalLabels,
  parseBusinessDate,
  formatBusinessDateValue,
  type AppDatePickerProps,
  type AppDateRangePickerProps,
  type AppDateTimePickerProps,
  type AppTimePickerProps,
  type AppTemporalLabels,
  type AppDatePickerPopoverLayer,
  type AppDateTimePickerPopoverLayer,
} from './components/features/app/AppDatePicker';
export {
  AppTemporalInput,
  isTemporalInputType,
  type AppTemporalInputProps,
  type TemporalInputType,
} from './components/features/app/AppTemporalInput';
export { AppSelectInput, type AppSelectInputProps } from './components/features/app/AppSelectInput';
export { AppCheckboxInput, type AppCheckboxInputProps } from './components/features/app/AppCheckboxInput';

// GeniApp / record UI primitives (cross-app; no domain coupling)
export {
  FormSection,
  RecordListFrame,
  StatusStepper,
  type FormSectionProps,
  type RecordListFrameProps,
  type StatusStep,
  type StatusStepperProps,
} from './components/patterns/entity-patterns';

// Layout primitives
export { ThemeToggle, type ThemeToggleProps } from './components/primitives/layout/ThemeToggle';
export { PublicHeader, type PublicHeaderProps, type NavigationConfig, type User as PublicHeaderUser } from './components/primitives/layout/PublicHeader';
export { PublicFooter } from './components/primitives/layout/PublicFooter';
export { PublicLayout, type PublicLayoutProps } from './components/primitives/layout/PublicLayout';
export { AppWatermark, WatermarkOverlay, type AppWatermarkProps, type WatermarkOverlayProps } from './components/primitives/layout/AppWatermark';

export {
  FormFieldSkeleton,
  PageHeaderSkeleton,
  TabsBarSkeleton,
  FormCardSkeleton,
  TablePageSkeleton,
  GridCardsSkeleton,
  SplitPaneSkeleton,
  ConfigEditorSkeleton,
  DetailTabsSkeleton,
  StatsRowSkeleton,
  FormPageSkeleton,
  PageLoadingSkeleton,
  ChartAreaSkeleton,
  ChartEmptyState,
  ListSkeleton,
  ComponentSkeletonShell,
  skeletonBarWidth,
  skeletonItemCount,
  type FormFieldSkeletonProps,
  type PageHeaderSkeletonProps,
  type TabsBarSkeletonProps,
  type FormCardSkeletonProps,
  type TablePageSkeletonProps,
  type GridCardsSkeletonProps,
  type SplitPaneSkeletonProps,
  type ConfigEditorSkeletonProps,
  type DetailTabsSkeletonProps,
  type StatsRowSkeletonProps,
  type FormPageSkeletonProps,
  type PageSkeletonPreset,
  type PageLoadingSkeletonProps,
  type ChartAreaSkeletonProps,
  type ChartEmptyStateProps,
  type ChartSkeletonType,
  type ListSkeletonProps,
  type ListSkeletonTemplate,
  type ComponentSkeletonShellProps,
} from './components/primitives/page-skeleton';
// Business components
// The following components reference application-specific paths and should not be in the shared package:
// - MarkdownEditor: references @/features/console/components/Markdown
// - TeamSwitchSuccess: references @/app/context/TeamContext
// - BankTransferModal: references @/app/services/billing
// - BillingRechargePayment: references @/app/services/billing
// These components should remain in their respective application projects
export * from './kit/ai';
