import { Skeleton } from "@/components/shared/skeleton";

export default function StandingsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-48" />
      {/* Standings table */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 rounded-[10px]" />
        ))}
      </div>
    </div>
  );
}
