import * as React from 'react'
import { Input as InputPrimitive } from '@base-ui/react/input'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        'h-12 w-full min-w-0 rounded-[length:var(--radius-ds-md)] border border-[var(--border-default)] bg-[var(--bg-inset)] px-4 py-3 text-base text-[var(--text-primary)] transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:border-[var(--border-focus)] focus-visible:ring-2 focus-visible:ring-[var(--brand-muted)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-[var(--error)] aria-invalid:ring-2 aria-invalid:ring-[var(--error-muted)] md:text-base',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
