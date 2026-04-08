import { cn } from '@/lib/utils'

interface LogoProps {
  /** Size variant. Minimum 32px per design system. */
  size?: 'sm' | 'md' | 'lg'
  /** Show the "Bragg" wordmark alongside the logo image. */
  showWordmark?: boolean
  className?: string
}

const imageSize = {
  sm: 32,
  md: 40,
  lg: 56,
} as const

const textClasses = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-4xl',
} as const

/**
 * Bragg app logo — shattered "B" image with optional "Bragg" wordmark.
 *
 * Always render on dark backgrounds per design system rules.
 * Minimum display size: 32px height.
 */
export function Logo({ size = 'md', showWordmark = true, className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2 select-none', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- small static logo, no optimization needed */}
      <img src="/logo.png" alt="Bragg" width={imageSize[size]} height={imageSize[size]} />
      {showWordmark && (
        <span
          className={cn('font-heading font-bold tracking-tight', textClasses[size])}
          style={{
            background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-hover) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
          aria-hidden="true"
        >
          Bragg
        </span>
      )}
    </span>
  )
}
