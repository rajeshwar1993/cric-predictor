'use client'

import * as React from 'react'
import { CheckIcon } from 'lucide-react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer size-4 shrink-0 rounded-[4px] border-2 border-wire bg-dark-concrete transition-shadow duration-[var(--duration-exit)] ease-out outline-none',
        'focus-visible:border-bragg-lime focus-visible:ring-[3px] focus-visible:ring-bragg-lime/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-electric-coral aria-invalid:ring-electric-coral/20',
        'data-[state=checked]:border-bragg-lime data-[state=checked]:bg-bragg-lime data-[state=checked]:text-text-on-primary',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
