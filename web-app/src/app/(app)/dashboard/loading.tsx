import { GangCardSkeleton } from '@/components/ui/skeleton'
import { PageWrapper } from '@/components/layout/page-wrapper'

export default function DashboardLoading() {
  return (
    <PageWrapper className="py-8">
      <div className="text-h1 mb-6 h-8 w-48 animate-shimmer rounded bg-[linear-gradient(90deg,var(--color-dark-concrete)_0%,var(--color-light-concrete)_50%,var(--color-dark-concrete)_100%)] bg-[length:200%_100%]" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <GangCardSkeleton />
        <GangCardSkeleton />
      </div>
    </PageWrapper>
  )
}
