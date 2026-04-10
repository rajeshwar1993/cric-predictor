'use client'

import * as React from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

/**
 * Switch — a toggle primitive built on Radix Switch.
 *
 * Used for on/off settings (e.g. auto-accept join requests). Follows the
 * Electric Street design system: Bragg Lime for the "on" track, dark concrete
 * surfaces for "off", thick wire borders to match the rest of the form
 * primitives, and a bold lime focus ring.
 *
 * @see docs/design-systems/electric-street.md — Color Palette, Focus states
 */
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-wire bg-dark-concrete transition-[color,background-color,border-color,box-shadow] duration-[150ms] ease-out outline-none',
        'focus-visible:ring-[3px] focus-visible:ring-bragg-lime/50 focus-visible:ring-offset-0',
        'disabled:cursor-not-allowed disabled:opacity-50',
        // Color-independent state cue: the border thickness stays the
        // same but the border color jumps from the muted `wire` token
        // all the way to the vivid lime track. Combined with the
        // aria-checked attribute (from Radix) and the parent's visible
        // "On"/"Off" label (added at the call site), this gives both
        // sighted and assistive users a non-color-dependent signal.
        'data-[state=checked]:border-bragg-lime data-[state=checked]:bg-bragg-lime',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block size-4 rounded-full bg-text-primary shadow-[0_2px_4px_rgba(0,0,0,0.3)] ring-0 transition-transform duration-[150ms] ease-out',
          'translate-x-0.5 data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-text-on-primary',
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
