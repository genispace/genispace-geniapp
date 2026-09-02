import React from 'react';
import { Button } from '@genispace/shared-ui';
import { cn } from '@genispace/shared-utils';
import { useTranslation } from 'react-i18next';
import { BarChart3, Table2 } from 'lucide-react';
import { useMobileFlowLayout } from '@/mobile/mobileFlowLayoutContext';

export type ViewType = 'chart' | 'data';

interface ViewToggleButtonProps {
  viewType: ViewType;
  onToggle: () => void;
  className?: string;
  /** Desktop uses text labels; mobile defaults to a single icon toggle. */
  variant?: 'text' | 'icon' | 'auto';
}

/** Chart / List shared header toggle — matches ChartRenderer & EChartsChartRenderer. */
export const ViewToggleButton: React.FC<ViewToggleButtonProps> = ({
  viewType,
  onToggle,
  className,
  variant = 'auto',
}) => {
  const { t } = useTranslation('renderers');
  const isMobileFlow = useMobileFlowLayout();

  const targetLabel =
    viewType === 'chart'
      ? t('chart.view_data', 'View Data')
      : t('chart.view_chart', 'View Chart');

  const useIconVariant = variant === 'icon' || (variant === 'auto' && isMobileFlow);

  if (useIconVariant) {
    const Icon = viewType === 'chart' ? Table2 : BarChart3;
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn('view-toggle h-8 w-8 shrink-0', className)}
        onClick={onToggle}
        aria-label={targetLabel}
        title={targetLabel}
      >
        <Icon className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn('view-toggle h-8', className)}
      onClick={onToggle}
    >
      {targetLabel}
    </Button>
  );
};
