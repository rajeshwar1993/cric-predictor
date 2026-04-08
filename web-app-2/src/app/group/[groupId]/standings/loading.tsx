import { Skeleton } from '@/components/ui/skeleton'

export default function StandingsLoading() {
  return (
    <div className="flex flex-col gap-[var(--sp-6)]">
      {/* Back link */}
      <Skeleton className="h-4 w-28" />

      {/* Header */}
      <div>
        <Skeleton className="h-9 w-32" />
        <Skeleton className="mt-[var(--sp-1)] h-4 w-44" />
      </div>

      {/* Standings table */}
      <div className="overflow-hidden rounded-[var(--radius-ds-lg)] border border-[var(--border-default)]">
        {/* Header row */}
        <div
          className="flex items-center gap-[var(--sp-3)] border-b border-[var(--border-default)] px-[var(--sp-4)] py-[var(--sp-2)]"
          style={{ backgroundColor: 'var(--bg-overlay)' }}
        >
          <Skeleton className="h-3 w-6" />
          <Skeleton className="h-3 w-20 flex-1" />
          <Skeleton className="h-3 w-12" />
        </div>

        {/* Rows */}
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex items-center gap-[var(--sp-3)] border-b border-[var(--border-default)] px-[var(--sp-4)] py-[var(--sp-3)]"
            style={{ minHeight: 56, backgroundColor: 'var(--bg-raised)' }}
          >
            <Skeleton className="h-5 w-8" />
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-4 w-28 flex-1" />
            <Skeleton className="h-5 w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}
