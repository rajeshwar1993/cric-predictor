import { REVEAL_TABLE_COPY } from "@/lib/constants";

const LEGEND_ITEMS = [
  {
    label: REVEAL_TABLE_COPY.LEGEND_CORRECT,
    background: "color-mix(in srgb, var(--success) 12%, transparent)",
  },
  {
    label: REVEAL_TABLE_COPY.LEGEND_INCORRECT,
    background: "color-mix(in srgb, var(--danger) 12%, transparent)",
  },
  {
    label: REVEAL_TABLE_COPY.LEGEND_PENDING,
    background: "color-mix(in srgb, var(--pending) 8%, transparent)",
  },
  {
    label: REVEAL_TABLE_COPY.LEGEND_NO_PICK,
    background: "var(--bg-elevated)",
  },
] as const;

/**
 * Compact color legend for the Prediction Reveal Table.
 * Renders below the table to explain the cell color-coding system.
 */
export function RevealColorLegend() {
  return (
    <div
      role="note"
      className="flex flex-wrap items-center justify-center gap-4 border-t border-[var(--border-light)] px-4 py-3"
    >
      {LEGEND_ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-[2px] shrink-0"
            style={{ background: item.background }}
          />
          <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
