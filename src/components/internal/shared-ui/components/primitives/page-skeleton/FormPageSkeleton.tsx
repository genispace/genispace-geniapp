import { cn } from '@genispace/shared-utils';
import { FormCardSkeleton } from './FormCardSkeleton';
import { PageHeaderSkeleton } from './PageHeaderSkeleton';

export interface FormPageSkeletonProps {
  fieldCount?: number;
  showSecondCard?: boolean;
  className?: string;
}

export function FormPageSkeleton({
  fieldCount = 4,
  showSecondCard = false,
  className,
}: FormPageSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <PageHeaderSkeleton showBack showActions={false} />
      <FormCardSkeleton fieldCount={fieldCount} />
      {showSecondCard ? <FormCardSkeleton fieldCount={Math.max(2, fieldCount - 2)} /> : null}
    </div>
  );
}
