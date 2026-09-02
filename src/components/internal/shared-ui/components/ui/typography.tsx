import { cn } from '@genispace/shared-utils'

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode
}

export function H1({ children, className, ...props }: TypographyProps) {
  return (
    <h1
      className={cn(
        "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
        className
      )}
      {...props}
    >
      {children}
    </h1>
  )
}

export function H2({ children, className, ...props }: TypographyProps) {
  return (
    <h2
      className={cn(
        "scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0",
        className
      )}
      {...props}
    >
      {children}
    </h2>
  )
}

export function H3({ children, className, ...props }: TypographyProps) {
  return (
    <h3
      className={cn(
        "scroll-m-20 text-2xl font-semibold tracking-tight",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
}

export function H4({ children, className, ...props }: TypographyProps) {
  return (
    <h4
      className={cn(
        "scroll-m-20 text-xl font-semibold tracking-tight",
        className
      )}
      {...props}
    >
      {children}
    </h4>
  )
}

export function P({ children, className, ...props }: TypographyProps) {
  return (
    <p
      className={cn("leading-7 [&:not(:first-child)]:mt-6", className)}
      {...props}
    >
      {children}
    </p>
  )
}

export function Blockquote({ children, className, ...props }: TypographyProps) {
  return (
    <blockquote
      className={cn("mt-6 border-l-2 border-neutral-200 dark:border-neutral-700 pl-6 italic", className)}
      {...props}
    >
      {children}
    </blockquote>
  )
}

export function InlineCode({ children, className, ...props }: TypographyProps) {
  return (
    <code
      className={cn(
        "relative rounded bg-neutral-100 dark:bg-neutral-800 px-[0.3rem] py-[0.2rem] font-mono text-sm",
        className
      )}
      {...props}
    >
      {children}
    </code>
  )
}

export function Lead({ children, className, ...props }: TypographyProps) {
  return (
    <p className={cn("text-xl text-neutral-700 dark:text-neutral-300", className)} {...props}>
      {children}
    </p>
  )
}

export function Large({ children, className, ...props }: TypographyProps) {
  return (
    <div className={cn("text-lg font-semibold", className)} {...props}>
      {children}
    </div>
  )
}

export function Small({ children, className, ...props }: TypographyProps) {
  return (
    <small className={cn("text-sm font-medium leading-none", className)} {...props}>
      {children}
    </small>
  )
}

export function Muted({ children, className, ...props }: TypographyProps) {
  return (
    <p className={cn("text-sm text-neutral-500 dark:text-neutral-400", className)} {...props}>
      {children}
    </p>
  )
} 