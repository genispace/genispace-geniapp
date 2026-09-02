import { cn } from '@genispace/shared-utils';
import { Skeleton } from '../../ui/skeleton';

export interface FormFieldSkeletonProps {
  labelWidth?: string;
  inputHeight?: string;
  className?: string;
}

export function FormFieldSkeleton({
  labelWidth = 'w-24',
  inputHeight = 'h-10',
  className,
}: FormFieldSkeletonProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Skeleton className={cn('h-4', labelWidth)} />
      <Skeleton className={cn('w-full rounded-md', inputHeight)} />
    </div>
  );
}
