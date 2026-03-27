import { Skeleton } from "@/components/shared/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-[960px] px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-48 rounded-[10px]" />
      </div>
      {/* Group cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-32 rounded-[20px]" />
        ))}
      </div>
      {/* Create form */}
      <Skeleton className="h-28 rounded-[14px]" />
    </div>
  );
}
