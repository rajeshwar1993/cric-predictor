export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[10px] bg-[var(--bg-elevated)] ${className}`}
    />
  );
}
