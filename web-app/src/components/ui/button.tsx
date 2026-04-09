import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-body text-sm font-bold uppercase tracking-[0.08em] transition-all duration-[150ms] ease-out outline-none focus-visible:ring-[3px] focus-visible:ring-bragg-lime/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-dark-concrete disabled:text-text-muted disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
  {
    variants: {
      variant: {
        default:
          'bg-bragg-lime text-text-on-primary hover:bg-hover-lime hover:shadow-[4px_4px_0_#A8C42A] active:translate-y-0.5 active:shadow-[2px_2px_0_#A8C42A]',
        secondary:
          'bg-mid-concrete text-text-primary border-2 border-wire hover:border-bragg-lime active:translate-y-[1px]',
        ghost:
          'text-text-secondary hover:text-text-primary hover:bg-dark-concrete',
        destructive:
          'bg-electric-coral text-text-on-primary hover:bg-[#FF5252] active:translate-y-0.5',
      },
      size: {
        default: 'h-12 px-6',
        sm: 'h-9 px-4 text-xs',
        lg: 'h-14 px-8',
        icon: 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
