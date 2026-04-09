'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const statBlockVariants = cva(
  'inline-flex flex-col items-center justify-center font-display font-bold text-text-on-primary',
  {
    variants: {
      size: {
        default: 'px-4 py-3 min-w-[88px]',
        sm: 'px-3 py-2 min-w-[72px]',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
)

interface StatBlockProps
  extends React.ComponentProps<'div'>,
    VariantProps<typeof statBlockVariants> {
  /** The primary value displayed (score, rank, count, etc.) */
  value: string | number
  /** The label below the value */
  label: string
  /** Override the background color (e.g., team color, coral for errors) */
  color?: string
}

function StatBlock({
  value,
  label,
  color,
  size = 'default',
  className,
  ...props
}: StatBlockProps) {
  const prevValueRef = React.useRef(value)
  const [animating, setAnimating] = React.useState(false)

  React.useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value
      setAnimating(true)
      const timeout = setTimeout(() => setAnimating(false), 300)
      return () => clearTimeout(timeout)
    }
  }, [value])

  return (
    <div
      data-slot="stat-block"
      data-size={size}
      className={cn(
        statBlockVariants({ size }),
        'shadow-[4px_4px_0_var(--color-lime-shade)]',
        className
      )}
      style={{ backgroundColor: color ?? 'var(--color-bragg-lime)' }}
      {...props}
    >
      <span
        className={cn(
          'text-stat',
          size === 'sm' && 'text-xl',
          animating && 'motion-safe:animate-[score-pop_300ms_var(--ease-overshoot)]'
        )}
      >
        {value}
      </span>
      <span className="text-[11px] uppercase tracking-[0.1em] opacity-80">
        {label}
      </span>
    </div>
  )
}

export { StatBlock, statBlockVariants }
export type { StatBlockProps }
