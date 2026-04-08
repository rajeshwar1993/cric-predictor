import { Skeleton } from '@/components/ui/skeleton'

export default function GroupLoading() {
  return (
    <div className="flex flex-col gap-[var(--sp-6)]">
      {/* Gang name */}
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-[var(--sp-1)] h-4 w-28" />
      </div>

      {/* Invite share skeleton */}
      <div className="flex flex-col gap-[var(--sp-3)]">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-12 w-full rounded-[var(--radius-ds-md)]" />
      </div>

      {/* Match cards skeleton */}
      <div className="flex flex-col gap-[var(--sp-3)]">
        <Skeleton className="h-5 w-36" />
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-[var(--radius-ds-lg)] border border-[var(--border-default)] p-[var(--sp-4)] bg-[var(--bg-raised)]"
          >
            <div className="flex flex-col gap-[var(--sp-2)]">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        ))}
      </div>

      {/* Standings link skeleton */}
      <Skeleton className="h-11 w-full rounded-[var(--radius-ds-md)]" />

      {/* Members skeleton */}
      <div className="flex flex-col gap-[var(--sp-3)]">
        <Skeleton className="h-5 w-24" />
        <div className="overflow-hidden rounded-[var(--radius-ds-lg)] border border-[var(--border-default)] bg-[var(--bg-raised)]">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-[var(--sp-3)] border-b border-[var(--border-default)] px-[var(--sp-4)] py-[var(--sp-3)]"
              style={{ minHeight: 56 }}
            >
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-4 w-28" />
              <div className="ml-auto">
                <Skeleton className="h-5 w-10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
