import { cn } from '@/lib/utils'

interface LogoProps {
  /** Size of the logo text in pixels. Minimum 32px per design system. */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'text-2xl',
  md: 'text-3xl',
  lg: 'text-5xl',
} as const

/**
 * Bragg app logo — bold "B" with brand gradient text.
 *
 * Uses Space Grotesk (heading font) with the brand chartreuse color.
 * Always render on dark backgrounds per design system rules.
 */
export function Logo({ size = 'md', className }: LogoProps) {
  return (
    <span
      className={cn(
        'font-heading font-bold tracking-tight select-none',
        sizeClasses[size],
        className,
      )}
      style={{
        background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-hover) 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
      aria-label="Bragg"
    >
      Bragg
    </span>
  )
}
