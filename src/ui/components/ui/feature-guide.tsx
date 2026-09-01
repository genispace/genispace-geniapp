import * as React from 'react';
import { BookOpen } from 'lucide-react';

import { cn } from '@genispace/geniapp/utils';

import { Button, type ButtonProps } from './button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './sheet';

export interface FeatureGuideStep {
  /** Step heading */
  title: React.ReactNode;
  /** Step body — free-form content */
  body: React.ReactNode;
  /** Optional illustration URL rendered below the body */
  image?: string;
  /** Alt text for the illustration (i18n) */
  imageAlt?: string;
}

export interface FeatureGuideProps {
  /** Controlled open state */
  open: boolean;
  /** Controlled open state change handler */
  onOpenChange: (open: boolean) => void;
  /** Guide title */
  title: React.ReactNode;
  /** Optional short description under the title */
  description?: React.ReactNode;
  /** Ordered walkthrough steps */
  steps: FeatureGuideStep[];
  /** Optional footer slot (e.g. docs link, "Got it" button) */
  footer?: React.ReactNode;
  /** Extra classes for the sheet content */
  className?: string;
}

/**
 * FeatureGuide — right-side sheet walking users through a feature in numbered steps.
 * Fully controlled: callers own the `open` state and wire their own trigger
 * (or use the `FeatureGuideTrigger` convenience button).
 */
export function FeatureGuide({
  open,
  onOpenChange,
  title,
  description,
  steps,
  footer,
  className,
}: FeatureGuideProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn('flex w-full flex-col sm:max-w-md', className)}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          <ol className="space-y-6 py-2">
            {steps.map((step, index) => (
              <li key={index} className="flex gap-3">
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground"
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-sm font-semibold leading-6 text-foreground">
                    {step.title}
                  </p>
                  <div className="text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </div>
                  {step.image ? (
                    <img
                      src={step.image}
                      alt={step.imageAlt ?? ''}
                      loading="lazy"
                      className="mt-2 w-full rounded-lg border object-cover"
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
        {footer ? <div className="border-t pt-4">{footer}</div> : null}
      </SheetContent>
    </Sheet>
  );
}

export interface FeatureGuideTriggerProps extends Omit<ButtonProps, 'asChild'> {
  /** Trigger label content */
  children?: React.ReactNode;
}

/**
 * FeatureGuideTrigger — convenience ghost button with a BookOpen icon.
 * Wire `onClick` to open the controlled `FeatureGuide`.
 */
export const FeatureGuideTrigger = React.forwardRef<
  HTMLButtonElement,
  FeatureGuideTriggerProps
>(function FeatureGuideTrigger({ children = 'Guide', className, ...props }, ref) {
  return (
    <Button ref={ref} type="button" variant="ghost" size="sm" className={className} {...props}>
      <BookOpen className="h-4 w-4" aria-hidden />
      {children}
    </Button>
  );
});
