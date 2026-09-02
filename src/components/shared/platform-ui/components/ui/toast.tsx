import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from '@genispace/shared-utils'
import { Z_INDEX_CLASSES } from '../../styles/z-index-layers'

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(

      `fixed top-4 left-1/2 transform -translate-x-1/2 ${Z_INDEX_CLASSES.TOAST} flex max-h-screen w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 p-0`,

      "sm:top-auto sm:bottom-4 sm:left-auto sm:right-4 sm:transform-none sm:translate-x-0 sm:w-full sm:max-w-[420px] sm:flex-col",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-3 overflow-hidden rounded-lg border shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full p-3 pr-5 sm:p-4 sm:pr-6 sm:space-x-4",
  {
    variants: {
      variant: {
        default: "border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 text-foreground",
        destructive:
          "destructive group border-destructive/50 bg-destructive/95 backdrop-blur supports-[backdrop-filter]:bg-destructive/60 text-destructive-foreground",
        success:
          "success group border-green-500/50 bg-green-500/95 backdrop-blur supports-[backdrop-filter]:bg-green-500/60 text-green-50 dark:border-green-600/50 dark:bg-green-600/95 dark:supports-[backdrop-filter]:bg-green-600/60 dark:text-green-50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-1.5 top-1.5 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-1 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus-visible:ring-ring group-[.destructive]:focus:ring-offset-red-600 sm:right-2 sm:top-2",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold leading-tight [&+div]:text-xs sm:text-sm", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-xs opacity-90 mt-0.5 leading-relaxed sm:text-sm", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

interface ToastProgressBarProps {
  duration: number
  variant?: "default" | "destructive" | "success"
  onComplete?: () => void
}

const ToastProgressBar = React.forwardRef<
  HTMLDivElement,
  ToastProgressBarProps
>(({ duration, variant = "default", onComplete }, ref) => {
  const progressBarRef = React.useRef<HTMLDivElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>()

  React.useEffect(() => {

    const updateStyles = () => {
      if (containerRef.current) {
        const isDesktop = window.matchMedia("(min-width: 640px)").matches
        if (isDesktop) {

          containerRef.current.style.marginLeft = "-1rem"
          containerRef.current.style.marginRight = "-1.5rem"
          containerRef.current.style.width = "calc(100% + 1rem + 1.5rem)"
        } else {

          containerRef.current.style.marginLeft = "-0.75rem"
          containerRef.current.style.marginRight = "-1.25rem"
          containerRef.current.style.width = "calc(100% + 0.75rem + 1.25rem)"
        }
      }
    }

    updateStyles()
    const mediaQuery = window.matchMedia("(min-width: 640px)")
    mediaQuery.addEventListener("change", updateStyles)

    return () => {
      mediaQuery.removeEventListener("change", updateStyles)
    }
  }, [])

  React.useEffect(() => {

    if (progressBarRef.current) {

      progressBarRef.current.style.width = "100%"
      progressBarRef.current.style.transformOrigin = "right center"

      requestAnimationFrame(() => {
        if (progressBarRef.current) {
          progressBarRef.current.style.width = "0%"
          progressBarRef.current.style.transition = `width ${duration}ms linear`
        }
      })
    }

    timeoutRef.current = setTimeout(() => {
      onComplete?.()
    }, duration)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [duration, onComplete])

  const progressBarColor = React.useMemo(() => {
    switch (variant) {
      case "destructive":
        return "bg-destructive"
      case "success":
        return "bg-green-500 dark:bg-green-600"
      default:
        return "bg-primary"
    }
  }, [variant])

  return (
    <div
      ref={(node) => {
        ;(containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
        if (typeof ref === "function") {
          ref(node)
        } else if (ref) {
          ;(ref as React.MutableRefObject<HTMLDivElement | null>).current = node
        }
      }}
      className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 dark:bg-white/10 overflow-hidden rounded-b-lg"
    >
      <div
        ref={progressBarRef}
        className={cn(
          "h-full absolute right-0", 
          progressBarColor
        )}
        style={{
          width: "100%",
        }}
      />
    </div>
  )
})
ToastProgressBar.displayName = "ToastProgressBar"

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  ToastProgressBar,
}
