import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

/**
 * Skeleton loader primitive.
 *
 * Uses animate-pulse with design-system surface color (--bg-raised).
 * Apply width/height/radius via className to match the shape of the
 * real content being loaded.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-[var(--radius-ds-md)]', className)}
      style={{ backgroundColor: 'var(--bg-raised)' }}
      aria-hidden="true"
    />
  )
}
