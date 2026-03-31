const scenarios = [
  { label: "Match Winner", points: 10, options: ["RCB", "CSK"] },
  { label: "Toss Winner", points: 5, options: ["RCB", "CSK"] },
  {
    label: "Top Scorer",
    points: 15,
    options: ["Kohli", "Gaikwad", "Faf", "..."],
  },
  {
    label: "First Innings Score",
    points: 10,
    options: ["<150", "150-169", "170-189", "190+"],
  },
];

export function PredictionPreview() {
  return (
    <section className="relative mx-auto w-full max-w-5xl px-4 py-24 sm:px-6">
      <div className="mb-12 text-center">
        <p className="font-stats text-xs font-medium uppercase tracking-[0.2em] text-[var(--cta-from)]">
          Preview
        </p>
        <h2 className="mt-3 font-display text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
          Your match. Your calls.
        </h2>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          16 scenarios per match. Pick your answers before the deadline.
        </p>
      </div>

      <div className="mx-auto max-w-md overflow-hidden rounded-xl border border-[var(--ghost-border)] bg-[var(--bg-card)]/60 backdrop-blur">
        {/* Match header */}
        <div className="flex items-center justify-between border-b border-[var(--ghost-border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-[var(--color-team-rcb)]" />
            <span className="font-display text-sm font-bold text-[var(--text-primary)]">
              RCB
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-stats text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              Match 1
            </span>
            <span className="font-display text-xs font-semibold text-[var(--text-secondary)]">
              vs
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-display text-sm font-bold text-[var(--text-primary)]">
              CSK
            </span>
            <span className="h-3 w-3 rounded-full bg-[var(--color-team-csk)]" />
          </div>
        </div>

        {/* Scenarios */}
        <div className="divide-y divide-[var(--ghost-border)]">
          {scenarios.map(({ label, points, options }) => (
            <div key={label} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {label}
                </span>
                <span className="font-stats text-xs text-[var(--cta-from)]">
                  {points} pts
                </span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {options.map((opt, j) => (
                  <span
                    key={opt}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      j === 0
                        ? "bg-[var(--cta-from)]/15 text-[var(--cta-from)] ring-1 ring-inset ring-[var(--cta-from)]/30"
                        : "bg-[var(--bg-elevated)]/60 text-[var(--text-secondary)]"
                    }`}
                  >
                    {opt}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--ghost-border)] px-6 py-3">
          <p className="text-center font-stats text-xs text-[var(--text-muted)]">
            + 12 more scenarios
          </p>
        </div>
      </div>
    </section>
  );
}
