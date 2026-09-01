import { cn } from '@genispace/geniapp/utils'

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-primary/10',
        "before:pointer-events-none before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:content-['']",
        'before:bg-gradient-to-r before:from-transparent before:via-white/50 before:to-transparent',
        'dark:before:via-white/[0.14]',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
