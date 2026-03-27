import { Skeleton } from "@/components/shared/skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-32" />
      {/* Pending approvals */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-16 rounded-[14px]" />
        <Skeleton className="h-16 rounded-[14px]" />
      </div>
      {/* Members */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 rounded-[14px]" />
        ))}
      </div>
      {/* Result entry */}
      <Skeleton className="h-48 rounded-[20px]" />
    </div>
  );
}
