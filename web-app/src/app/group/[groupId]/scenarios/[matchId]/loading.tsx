import { Skeleton } from "@/components/shared/skeleton";

export default function ScenariosLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-28" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      {/* Scenario list */}
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Skeleton key={i} className="h-16 rounded-[14px]" />
      ))}
    </div>
  );
}
