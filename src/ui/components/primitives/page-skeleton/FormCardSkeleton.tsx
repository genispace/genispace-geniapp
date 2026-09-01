import { cn } from '@genispace/geniapp/utils';
import { Skeleton } from '../../ui/skeleton';
import { FormFieldSkeleton } from './FormFieldSkeleton';

export interface FormCardSkeletonProps {
  titleWidth?: string;
  fieldCount?: number;
  showTextarea?: boolean;
  className?: string;
}

export function FormCardSkeleton({
  titleWidth = 'w-36',
  fieldCount = 2,
  showTextarea = false,
  className,
}: FormCardSkeletonProps) {
  return (
    <div className={cn('card p-6 space-y-6', className)}>
      <Skeleton className={cn('h-6', titleWidth)} />
      {Array.from({ length: fieldCount }).map((_, index) => (
        <FormFieldSkeleton
          key={index}
          labelWidth={index === 0 ? 'w-24' : 'w-28'}
          inputHeight={showTextarea && index === fieldCount - 1 ? 'h-[120px]' : 'h-10'}
        />
      ))}
    </div>
  );
}
