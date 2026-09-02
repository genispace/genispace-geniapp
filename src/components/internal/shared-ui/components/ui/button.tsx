import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from '@genispace/shared-utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-blue-500 dark:bg-neutral-50 text-white dark:text-neutral-950 shadow-sm hover:shadow-md hover:bg-blue-600 dark:hover:bg-white active:bg-blue-700 dark:active:bg-neutral-100",
        destructive:
          "bg-red-600 dark:bg-red-700 text-white shadow-sm hover:shadow-md hover:bg-red-700 dark:hover:bg-red-600 active:bg-red-800 dark:active:bg-red-800",
        outline:
          "border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700",
        secondary:
          "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-50 shadow-sm hover:shadow-md hover:bg-neutral-200 dark:hover:bg-neutral-700 active:bg-neutral-300 dark:active:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-50 active:text-neutral-950 dark:active:text-neutral-50",
        ghost:
          "bg-transparent text-neutral-700 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-200 active:text-neutral-950 dark:active:text-neutral-100",
        subtle:
          "bg-transparent text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 active:bg-neutral-100 dark:active:bg-neutral-700/50",
        link:
          "bg-transparent text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-xl px-8",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
