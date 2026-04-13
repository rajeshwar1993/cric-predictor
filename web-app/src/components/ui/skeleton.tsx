import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/* --------------------------------------------------------------------------
 * Base Skeleton
 * -------------------------------------------------------------------------- */

const skeletonVariants = cva(
  [
    'motion-safe:animate-shimmer',
    'bg-[linear-gradient(90deg,var(--color-dark-concrete)_0%,var(--color-light-concrete)_50%,var(--color-dark-concrete)_100%)]',
    'bg-[length:200%_100%]',
    'motion-reduce:bg-dark-concrete',
    'motion-reduce:animate-none',
  ].join(' '),
  {
    variants: {
      variant: {
        text: 'h-4 w-full rounded',
        heading: 'h-6 w-full rounded',
        card: 'h-[120px] w-full rounded-lg',
        avatar: 'size-10 rounded-full',
        block: '', // custom h/w via className
      },
    },
    defaultVariants: {
      variant: 'text',
    },
  }
)

interface SkeletonProps
  extends React.ComponentProps<'div'>,
    VariantProps<typeof skeletonVariants> {}

function Skeleton({ variant = 'text', className, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      data-variant={variant}
      role="status"
      aria-label="Loading"
      className={cn(skeletonVariants({ variant }), className)}
      {...props}
    />
  )
}

/* --------------------------------------------------------------------------
 * Pre-built Skeleton Compositions
 * -------------------------------------------------------------------------- */

function MatchCardSkeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="match-card-skeleton"
      className={cn(
        'flex flex-col gap-4 rounded-lg border border-wire bg-dark-concrete p-6',
        className
      )}
      {...props}
    >
      {/* Header: badge + match info */}
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="h-4 w-24" />
        <Skeleton variant="text" className="h-5 w-12 rounded-sm" />
      </div>
      {/* Teams */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton variant="heading" className="w-20" />
          <Skeleton variant="text" className="w-16" />
        </div>
        <Skeleton variant="text" className="h-5 w-8" />
        <div className="flex flex-col items-end gap-2">
          <Skeleton variant="heading" className="w-20" />
          <Skeleton variant="text" className="w-16" />
        </div>
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="h-4 w-32" />
        <Skeleton variant="block" className="h-9 w-20 rounded-md" />
      </div>
    </div>
  )
}

function LeaderboardRowSkeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="leaderboard-row-skeleton"
      className={cn(
        'flex h-[72px] items-center gap-4 border-b-2 border-mid-concrete px-4',
        className
      )}
      {...props}
    >
      {/* Rank */}
      <Skeleton variant="block" className="h-8 w-8 rounded-sm" />
      {/* Avatar */}
      <Skeleton variant="avatar" />
      {/* Name + meta */}
      <div className="flex flex-1 flex-col gap-1">
        <Skeleton variant="text" className="h-4 w-28" />
        <Skeleton variant="text" className="h-3 w-16" />
      </div>
      {/* Score */}
      <Skeleton variant="block" className="h-6 w-12 rounded-sm" />
    </div>
  )
}

function ScenarioCardSkeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="scenario-card-skeleton"
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-wire bg-dark-concrete p-6',
        className
      )}
      {...props}
    >
      {/* Question */}
      <Skeleton variant="heading" className="w-3/4" />
      {/* Options */}
      <div className="flex flex-col gap-2">
        <Skeleton variant="block" className="h-12 w-full rounded-md" />
        <Skeleton variant="block" className="h-12 w-full rounded-md" />
        <Skeleton variant="block" className="h-12 w-full rounded-md" />
      </div>
      {/* Points indicator */}
      <Skeleton variant="text" className="h-4 w-20" />
    </div>
  )
}

function GangCardSkeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="gang-card-skeleton"
      className={cn(
        'flex flex-col gap-6 rounded-lg border border-wire border-l-4 border-l-bragg-lime bg-dark-concrete p-6',
        className
      )}
      {...props}
    >
      {/* Name + role badge */}
      <div className="flex items-start justify-between gap-3">
        <Skeleton variant="heading" className="w-32" />
        <Skeleton variant="block" className="h-6 w-16 rounded-full" />
      </div>
      {/* Member count */}
      <Skeleton variant="text" className="h-3 w-24" />
    </div>
  )
}

function PageSkeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="page-skeleton"
      className={cn('flex flex-col gap-8 p-4 md:p-8', className)}
      {...props}
    >
      {/* Page heading */}
      <div className="flex flex-col gap-2">
        <Skeleton variant="heading" className="h-8 w-48" />
        <Skeleton variant="text" className="w-64" />
      </div>
      {/* Content cards */}
      <div className="flex flex-col gap-4">
        <MatchCardSkeleton />
        <MatchCardSkeleton />
      </div>
      {/* Leaderboard rows */}
      <div className="flex flex-col">
        <LeaderboardRowSkeleton />
        <LeaderboardRowSkeleton />
        <LeaderboardRowSkeleton />
      </div>
    </div>
  )
}

export {
  Skeleton,
  skeletonVariants,
  MatchCardSkeleton,
  LeaderboardRowSkeleton,
  ScenarioCardSkeleton,
  GangCardSkeleton,
  PageSkeleton,
}
export type { SkeletonProps }
