'use client'

import { Switch as SwitchPrimitive } from '@base-ui/react/switch'

import { cn } from '@/lib/utils'

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  'aria-label'?: string
  id?: string
  className?: string
}

function Switch({ checked, onCheckedChange, disabled, className, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        'group/switch inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-muted)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] disabled:cursor-not-allowed disabled:opacity-40',
        checked ? 'bg-[var(--brand)]' : 'bg-[var(--bg-overlay)]',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block size-5 rounded-full shadow-lg transition-transform',
          checked
            ? 'translate-x-5 bg-[var(--brand-on)]'
            : 'translate-x-0 bg-[var(--text-secondary)]',
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
