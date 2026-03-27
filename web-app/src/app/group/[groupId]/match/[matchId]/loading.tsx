import { Skeleton } from "@/components/shared/skeleton";

export default function MatchLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-28 rounded-[20px]" />
      {/* Leaderboard rows */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-14 rounded-[14px]" />
        ))}
      </div>
    </div>
  );
}
