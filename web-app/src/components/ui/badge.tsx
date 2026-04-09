import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-sm px-3 py-1.5 font-body text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap select-none [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border border-wire bg-dark-concrete text-text-secondary',
        lime: 'bg-bragg-lime text-text-on-primary',
        coral: 'bg-electric-coral text-text-on-primary',
        yellow: 'bg-sunburst-yellow text-text-on-primary',
        purple: 'bg-ultraviolet text-text-primary',
        blue: 'bg-vivid-blue text-text-primary',
        outline: 'border border-wire bg-transparent text-inherit',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span'

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
