import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-12 w-full min-w-0 rounded-md border-2 border-wire bg-dark-concrete px-4 font-body text-base text-text-primary transition-[color,border-color,box-shadow] duration-[var(--duration-exit)] ease-out outline-none',
        'placeholder:text-text-muted',
        'focus-visible:border-bragg-lime focus-visible:ring-[3px] focus-visible:ring-bragg-lime/50 focus-visible:ring-offset-0',
        'aria-invalid:border-electric-coral aria-invalid:ring-electric-coral/20',
        'data-[error=true]:border-electric-coral data-[error=true]:ring-electric-coral/20',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text-primary',
        className
      )}
      {...props}
    />
  )
}

export { Input }
