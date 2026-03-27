import { Skeleton } from "@/components/shared/skeleton";

export default function GroupLoading() {
  return (
    <div className="space-y-8">
      {/* Group header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-28 rounded-[10px]" />
          <Skeleton className="h-10 w-28 rounded-[10px]" />
        </div>
      </div>
      {/* Next match card */}
      <Skeleton className="h-36 rounded-[20px]" />
      {/* Member list */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-24" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 rounded-[14px]" />
        ))}
      </div>
    </div>
  );
}
