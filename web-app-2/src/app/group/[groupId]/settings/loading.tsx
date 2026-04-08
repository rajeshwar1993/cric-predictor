import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-[var(--sp-8)]">
      {/* Back link */}
      <Skeleton className="h-4 w-24" />

      {/* Page title */}
      <div>
        <Skeleton className="h-7 w-36" />
        <Skeleton className="mt-[var(--sp-1)] h-4 w-28" />
      </div>

      {/* Gang name editor */}
      <div className="flex flex-col gap-[var(--sp-3)]">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-12 w-full rounded-[var(--radius-ds-md)]" />
      </div>

      <div className="border-t border-[var(--border-default)]" />

      {/* Auto-accept toggle */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-[var(--sp-1)]">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-6 w-11 rounded-full" />
      </div>

      <div className="border-t border-[var(--border-default)]" />

      {/* Prediction deadline */}
      <div className="flex flex-col gap-[var(--sp-3)]">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-12 w-full rounded-[var(--radius-ds-md)]" />
      </div>

      <div className="border-t border-[var(--border-default)]" />

      {/* Member management */}
      <div className="flex flex-col gap-[var(--sp-3)]">
        <Skeleton className="h-5 w-24" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-[var(--radius-ds-md)]" />
        ))}
      </div>

      <div className="border-t border-[var(--border-default)]" />

      {/* Delete gang */}
      <Skeleton className="h-12 w-36 rounded-[var(--radius-ds-md)]" />
    </div>
  )
}
