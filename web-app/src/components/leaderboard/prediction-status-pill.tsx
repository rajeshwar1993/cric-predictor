import type { TrackStatus } from "@/lib/on-track-logic";

const STATUS_CONFIG: Record<TrackStatus, { label: string; dotColor: string; bgColor: string; borderColor: string; textColor: string }> = {
  correct: {
    label: "Correct",
    dotColor: "var(--success)",
    bgColor: "color-mix(in srgb, var(--success) 9%, transparent)",
    borderColor: "color-mix(in srgb, var(--success) 25%, transparent)",
    textColor: "var(--success)",
  },
  wrong: {
    label: "Wrong",
    dotColor: "var(--danger)",
    bgColor: "color-mix(in srgb, var(--danger) 9%, transparent)",
    borderColor: "color-mix(in srgb, var(--danger) 25%, transparent)",
    textColor: "var(--danger)",
  },
  on_track: {
    label: "On Track",
    dotColor: "var(--cyan)",
    bgColor: "color-mix(in srgb, var(--cyan) 9%, transparent)",
    borderColor: "color-mix(in srgb, var(--cyan) 25%, transparent)",
    textColor: "var(--cyan)",
  },
  in_danger: {
    label: "In Danger",
    dotColor: "var(--warning)",
    bgColor: "color-mix(in srgb, var(--warning) 9%, transparent)",
    borderColor: "color-mix(in srgb, var(--warning) 25%, transparent)",
    textColor: "var(--warning)",
  },
  pending: {
    label: "Pending",
    dotColor: "var(--pending)",
    bgColor: "color-mix(in srgb, var(--pending) 9%, transparent)",
    borderColor: "color-mix(in srgb, var(--pending) 25%, transparent)",
    textColor: "var(--pending)",
  },
};

interface PredictionStatusPillProps {
  status: TrackStatus;
  compact?: boolean;
}

export function PredictionStatusPill({ status, compact = false }: PredictionStatusPillProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-stats text-[11px] font-medium"
      style={{
        backgroundColor: config.bgColor,
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: config.borderColor,
        color: config.textColor,
        padding: compact ? "3px 8px" : "7px 14px",
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: config.dotColor }}
      />
      {!compact && config.label}
    </span>
  );
}
