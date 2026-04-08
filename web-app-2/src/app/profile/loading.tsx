import { Skeleton } from '@/components/ui/skeleton'

export default function ProfileLoading() {
  return (
    <div className="flex flex-col gap-[var(--sp-8)]">
      {/* Header */}
      <Skeleton className="h-9 w-24" />

      {/* Profile info section */}
      <div className="flex flex-col gap-[var(--sp-4)]">
        {/* Display name */}
        <div className="flex flex-col gap-[var(--sp-1)]">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-40" />
        </div>
        {/* Email */}
        <div className="flex flex-col gap-[var(--sp-1)]">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-48" />
        </div>
        {/* DOB */}
        <div className="flex flex-col gap-[var(--sp-1)]">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-6 w-36" />
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-col gap-[var(--sp-3)]">
        <Skeleton className="h-5 w-16" />
        <div className="grid grid-cols-2 gap-[var(--sp-3)]">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-[var(--sp-2)] rounded-[var(--radius-ds-lg)] border border-[var(--border-default)] p-[var(--sp-4)]"
              style={{ backgroundColor: 'var(--bg-raised)' }}
            >
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t" style={{ borderColor: 'var(--border-default)' }} />

      {/* Delete account */}
      <Skeleton className="h-12 w-36 rounded-[var(--radius-ds-md)]" />
    </div>
  )
}
