import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive:
          'border-destructive/50 bg-destructive/10 dark:bg-destructive/30 text-destructive dark:text-destructive-foreground dark:border-destructive [&>svg]:text-destructive',
        informative:
          'border-informative/50 bg-informative/10 dark:bg-informative/30 text-informative dark:text-informative-foreground dark:border-informative [&>svg]:text-informative',
        success:
          'border-green-500 bg-green-500/10 dark:bg-green-700/20 text-green-500 dark:text-green-300 dark:border-green-500 [&>svg]:text-green-500 dark:[&>svg]:text-green-300',
        formSuccess:
          'border-green-600 bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 [&>svg]:text-green-600 dark:[&>svg]:text-green-300 [&>svg]:content-["✔️"]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot='alert'
      role='alert'
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='alert-title'
      className={cn(
        'col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight',
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='alert-description'
      className={cn(
        'text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed',
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
