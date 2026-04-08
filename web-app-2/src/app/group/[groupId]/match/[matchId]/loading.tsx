import { Skeleton } from '@/components/ui/skeleton'

export default function MatchLeaderboardLoading() {
  return (
    <div className="flex flex-col gap-[var(--sp-6)]">
      {/* Back link */}
      <Skeleton className="h-4 w-28" />

      {/* Match header */}
      <div className="flex flex-col gap-[var(--sp-2)]">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Leaderboard section */}
      <div className="flex flex-col gap-[var(--sp-3)]">
        <Skeleton className="h-5 w-28" />
        <div
          className="overflow-hidden rounded-[var(--radius-ds-lg)] border border-[var(--border-default)]"
          style={{ backgroundColor: 'var(--bg-raised)' }}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center gap-[var(--sp-3)] border-b border-[var(--border-default)] px-[var(--sp-4)] py-[var(--sp-3)]"
              style={{ minHeight: 56 }}
            >
              <Skeleton className="h-5 w-8" />
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-4 w-28" />
              <div className="ml-auto">
                <Skeleton className="h-5 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prediction reveal section */}
      <div className="flex flex-col gap-[var(--sp-3)]">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-48 w-full rounded-[var(--radius-ds-lg)]" />
      </div>
    </div>
  )
}
