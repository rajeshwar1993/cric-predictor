import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  /** Size of the spinner. */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'size-4 border-2',
  md: 'size-6 border-2',
  lg: 'size-8 border-[3px]',
} as const

/**
 * Simple animated loading spinner using the brand color.
 *
 * Renders a spinning border circle. Respects prefers-reduced-motion
 * via the global CSS rule that caps animation duration.
 */
export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block animate-spin rounded-full border-solid border-current border-r-transparent',
        sizeClasses[size],
        className,
      )}
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}
