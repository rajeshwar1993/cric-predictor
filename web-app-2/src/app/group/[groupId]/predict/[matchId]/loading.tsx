import { Skeleton } from '@/components/ui/skeleton'

export default function PredictLoading() {
  return (
    <div className="flex flex-col gap-[var(--sp-6)]">
      {/* Back link */}
      <Skeleton className="h-4 w-28" />

      {/* Match header */}
      <div className="flex flex-col gap-[var(--sp-2)]">
        <div className="flex items-baseline gap-[var(--sp-2)]">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-44" />
      </div>

      {/* Scenario card skeletons */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex flex-col gap-[var(--sp-3)] rounded-[var(--radius-ds-lg)] border border-[var(--border-default)] p-[var(--sp-4)] bg-[var(--bg-raised)]"
        >
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
          <div className="flex gap-[var(--sp-2)]">
            <Skeleton className="h-12 flex-1 rounded-[var(--radius-ds-md)]" />
            <Skeleton className="h-12 flex-1 rounded-[var(--radius-ds-md)]" />
          </div>
        </div>
      ))}

      {/* Submit bar skeleton */}
      <div className="h-20" />
    </div>
  )
}
