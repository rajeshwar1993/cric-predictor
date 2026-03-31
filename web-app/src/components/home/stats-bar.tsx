const stats = [
  { num: "16", label: "scenarios per match" },
  { num: "10", label: "friends per squad" },
  { num: "\u221E", label: "bragging rights" },
];

export function StatsBar() {
  return (
    <section className="relative border-y border-[var(--ghost-border)] py-16">
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-10 px-4 sm:flex-row sm:gap-16">
        {stats.map(({ num, label }) => (
          <div key={label} className="text-center">
            <span className="font-display text-5xl font-extrabold text-gradient sm:text-6xl">
              {num}
            </span>
            <p className="mt-1 font-stats text-xs uppercase tracking-widest text-[var(--text-muted)]">
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
