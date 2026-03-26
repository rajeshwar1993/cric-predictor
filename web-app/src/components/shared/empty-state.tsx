import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-elevated)]">
        <Icon className="h-8 w-8 text-[var(--text-muted)]" />
      </div>
      <h3 className="mt-4 font-display text-base font-semibold text-[var(--text-primary)]">
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-[var(--text-secondary)]">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
