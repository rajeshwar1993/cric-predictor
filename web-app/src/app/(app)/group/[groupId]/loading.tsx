import { Skeleton, MatchCardSkeleton, LeaderboardRowSkeleton } from '@/components/ui/skeleton'
import { PageWrapper } from '@/components/layout/page-wrapper'

export default function GangPageLoading() {
  return (
    <PageWrapper className="py-8">
      {/* Gang header skeleton */}
      <header className="flex flex-col gap-4">
        <Skeleton variant="heading" className="h-8 w-48" />
        <Skeleton variant="text" className="h-4 w-28" />
        <Skeleton variant="block" className="h-10 w-full rounded-md" />
        <Skeleton variant="text" className="h-4 w-32" />
      </header>

      {/* Upcoming matches */}
      <div className="mt-8 flex flex-col gap-4">
        <MatchCardSkeleton />
        <MatchCardSkeleton />
      </div>

      {/* Member list */}
      <div className="mt-8 flex flex-col">
        <LeaderboardRowSkeleton />
        <LeaderboardRowSkeleton />
        <LeaderboardRowSkeleton />
      </div>
    </PageWrapper>
  )
}
