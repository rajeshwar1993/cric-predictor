import { Skeleton } from "@/components/shared/skeleton";

export default function PredictLoading() {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <Skeleton className="h-4 w-28" />
      {/* Match header */}
      <Skeleton className="h-28 rounded-[20px]" />
      {/* Scenario cards */}
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-24 rounded-[14px]" />
      ))}
      {/* Submit button */}
      <Skeleton className="h-12 w-full rounded-[10px]" />
    </div>
  );
}
