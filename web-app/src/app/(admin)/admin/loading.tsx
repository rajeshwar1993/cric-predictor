import { Skeleton } from '@/components/ui/skeleton'

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Skeleton variant="block" className="size-6 rounded" />
        <Skeleton variant="heading" className="h-7 w-48" />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Skeleton variant="block" className="h-24 rounded-lg" />
        <Skeleton variant="block" className="h-24 rounded-lg" />
        <Skeleton variant="block" className="h-24 rounded-lg" />
        <Skeleton variant="block" className="h-24 rounded-lg" />
      </div>

      {/* Table rows */}
      <div className="rounded-lg border border-wire bg-dark-concrete">
        <div className="border-b border-wire p-4">
          <Skeleton variant="text" className="h-4 w-full" />
        </div>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-wire/50 p-4">
            <Skeleton variant="text" className="h-4 w-12" />
            <Skeleton variant="text" className="h-4 flex-1" />
            <Skeleton variant="text" className="h-4 w-20" />
            <Skeleton variant="text" className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
