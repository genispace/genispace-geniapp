/**
 * Curated GeniApp component kit.
 *
 * This entry intentionally excludes platform-console components and private
 * frontend contexts. Additions are semver-governed public API decisions.
 */
export { cn } from './utils';
export * from './ui';

export { Button, buttonVariants, type ButtonProps } from './ui/components/ui/button';
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './ui/components/ui/card';
export { Badge, badgeVariants, type BadgeProps } from './ui/components/ui/badge';
export { Input } from './ui/components/ui/input';
export { Label } from './ui/components/ui/label';
export { Textarea } from './ui/components/ui/textarea';
export { Checkbox } from './ui/components/ui/checkbox';
export { Switch } from './ui/components/ui/switch';
export { Slider } from './ui/components/ui/slider';
export { Progress } from './ui/components/ui/progress';
export { Skeleton } from './ui/components/ui/skeleton';
export { Separator, type SeparatorProps } from './ui/components/ui/separator';

export { Alert, AlertTitle, AlertDescription } from './ui/components/ui/alert';
export { HintNotice, type HintNoticeProps, type HintNoticeVariant } from './ui/components/ui/hint-notice';
export { HelpTip, type HelpTipProps } from './ui/components/ui/help-tip';
export { AiDraftBanner, type AiDraftBannerProps, type AiDraftBannerTone } from './ui/components/ui/ai-draft-banner';

export { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/components/ui/tabs';
export {
  UnderlineTabs,
  UnderlineTabsList,
  UnderlineTabsTrigger,
  UnderlineTabsContent,
  underlineTabsTriggerVariants,
} from './ui/components/ui/underline-tabs';
export { Toggle, toggleVariants } from './ui/components/ui/toggle';
export { ToggleGroup, ToggleGroupItem } from './ui/components/ui/toggle-group';
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/components/ui/collapsible';
export { ScrollArea, ScrollBar } from './ui/components/ui/scroll-area';

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
} from './ui/components/ui/dialog';
export * from './ui/components/ui/dialog-safe-select';
export * from './ui/components/ui/dropdown-menu';
export * from './ui/components/ui/select';
export { MultiSelect, type MultiSelectProps, type MultiSelectOption } from './ui/components/ui/multi-select';
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from './ui/components/ui/popover';
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './ui/components/ui/tooltip';

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from './ui/components/ui/sheet';
export { RadioGroup, RadioGroupItem } from './ui/components/ui/radio-group';
export { Calendar, type CalendarProps } from './ui/components/ui/calendar';
export { DatePicker, type DatePickerProps } from './ui/components/ui/date-picker';

export {
  AlertDialog,
  AlertProvider,
  useAlert,
  useAlertDialog,
  type AlertType,
} from './ui/components/ui/alert-dialog';
export { BaseModal, FormModal, ConfirmModal, ListModal } from './ui/components/ui/modal-templates';

export * from './ui/components/ui/table';
export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  type ChartConfig,
} from './ui/components/ui/chart';
export {
  FeatureGuide,
  FeatureGuideTrigger,
  type FeatureGuideProps,
  type FeatureGuideStep,
  type FeatureGuideTriggerProps,
} from './ui/components/ui/feature-guide';
export {
  useColumnConfig,
  ColumnConfigMenu,
  type ColumnConfigColumn,
  type ColumnConfigMenuProps,
  type UseColumnConfigResult,
} from './ui/components/ui/column-config';

export { Toaster, useToast, toast } from './ui/components/primitives/feedback';
export { FormSection, type FormSectionProps } from './ui/components/patterns/form-section';
export { useIsMobile, MOBILE_BREAKPOINT } from './ui/hooks/useIsMobile';
