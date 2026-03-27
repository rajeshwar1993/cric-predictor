import { Skeleton } from "@/components/shared/skeleton";

export default function JoinLoading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-[440px] space-y-6 text-center">
        <Skeleton className="mx-auto h-14 w-14 rounded-lg" />
        <Skeleton className="mx-auto h-8 w-24" />
        <Skeleton className="mx-auto h-5 w-56" />
        <Skeleton className="mx-auto h-10 w-48 rounded-[10px]" />
        <Skeleton className="h-48 rounded-[20px]" />
      </div>
    </div>
  );
}
