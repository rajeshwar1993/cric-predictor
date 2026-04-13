import { Skeleton, LeaderboardRowSkeleton } from '@/components/ui/skeleton'
import { PageWrapper } from '@/components/layout/page-wrapper'

export default function StandingsLoading() {
  return (
    <PageWrapper className="py-8">
      <Skeleton variant="heading" className="mb-6 h-8 w-72" />
      <div className="flex flex-col">
        <LeaderboardRowSkeleton />
        <LeaderboardRowSkeleton />
        <LeaderboardRowSkeleton />
        <LeaderboardRowSkeleton />
        <LeaderboardRowSkeleton />
      </div>
    </PageWrapper>
  )
}
