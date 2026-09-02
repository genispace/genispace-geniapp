import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from '@genispace/shared-utils'

const UnderlineTabs = TabsPrimitive.Root

const UnderlineTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-auto items-stretch justify-start gap-0 rounded-none border-0 border-b border-border bg-transparent p-0 text-muted-foreground",
      className
    )}
    {...props}
  />
))
UnderlineTabsList.displayName = "UnderlineTabsList"

const underlineTabsTriggerVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 text-sm font-medium text-muted-foreground ring-offset-background transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "data-[state=active]:border-primary data-[state=active]:text-foreground",
        brand:
          "data-[state=active]:border-brand-primary data-[state=active]:text-brand-primary dark:data-[state=active]:border-blue-400 dark:data-[state=active]:text-blue-400 data-[state=active]:font-medium",
        orange:
          "data-[state=active]:border-orange-500 data-[state=active]:text-orange-700 dark:data-[state=active]:text-orange-300 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const UnderlineTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> &
    VariantProps<typeof underlineTabsTriggerVariants>
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(underlineTabsTriggerVariants({ variant, className }))}
    {...props}
  />
))
UnderlineTabsTrigger.displayName = "UnderlineTabsTrigger"

const UnderlineTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-0 outline-none ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=inactive]:hidden",
      className
    )}
    {...props}
  />
))
UnderlineTabsContent.displayName = TabsPrimitive.Content.displayName

export {
  UnderlineTabs,
  UnderlineTabsList,
  UnderlineTabsTrigger,
  UnderlineTabsContent,
  underlineTabsTriggerVariants,
}
