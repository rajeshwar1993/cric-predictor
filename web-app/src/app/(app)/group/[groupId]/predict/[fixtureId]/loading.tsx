import { Skeleton, ScenarioCardSkeleton } from '@/components/ui/skeleton'
import { PageWrapper } from '@/components/layout/page-wrapper'

export default function PredictLoading() {
  return (
    <PageWrapper className="py-8">
      {/* Predict page header skeleton */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex w-full items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <Skeleton variant="block" className="size-12 rounded-md" />
            <Skeleton variant="text" className="h-4 w-10" />
          </div>
          <Skeleton variant="text" className="h-5 w-8" />
          <div className="flex flex-col items-center gap-2">
            <Skeleton variant="block" className="size-12 rounded-md" />
            <Skeleton variant="text" className="h-4 w-10" />
          </div>
        </div>
        <Skeleton variant="text" className="h-3 w-48" />
      </div>

      {/* Scenario cards */}
      <div className="mt-8 flex flex-col gap-8">
        <ScenarioCardSkeleton />
        <ScenarioCardSkeleton />
        <ScenarioCardSkeleton />
      </div>
    </PageWrapper>
  )
}
