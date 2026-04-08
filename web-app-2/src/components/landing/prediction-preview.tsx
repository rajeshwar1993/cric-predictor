const mockScenarios = [
  { label: 'Match Winner', optionA: 'RCB', optionB: 'CSK' },
  { label: 'Top Run Scorer', optionA: 'Virat Kohli', optionB: 'Ruturaj Gaikwad' },
  { label: 'Total Sixes', optionA: '8-12', optionB: '13+' },
  { label: 'Toss Winner', optionA: 'RCB', optionB: 'CSK' },
] as const

export function PredictionPreview() {
  return (
    <section className="px-[var(--sp-5)] py-[var(--sp-12)]" aria-label="Prediction preview">
      <div className="mx-auto max-w-[480px]">
        <h2 className="mb-[var(--sp-2)] text-center font-heading text-2xl font-bold text-[var(--text-primary)]">
          Every match. 19 scenarios.
        </h2>
        <p className="mb-[var(--sp-6)] text-center text-base text-[var(--text-secondary)]">
          From toss winner to total sixes — make your calls.
        </p>

        {/* Mock match card */}
        <div className="overflow-hidden rounded-[var(--radius-ds-lg)] border border-[var(--border-default)] bg-[var(--bg-raised)]">
          {/* Match header */}
          <div className="flex items-center justify-between border-b border-[var(--border-default)] px-[var(--sp-4)] py-[var(--sp-3)]">
            <div className="flex items-baseline gap-[var(--sp-2)]">
              <span className="font-heading text-lg font-bold text-[var(--text-primary)]">
                RCB vs CSK
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">Match 1</span>
            </div>
            <span className="rounded-[var(--radius-ds-sm)] px-2 py-1 text-xs font-medium uppercase tracking-[0.05em] bg-[var(--warning-muted)] text-[var(--warning)]">
              Upcoming
            </span>
          </div>

          {/* Scenario rows */}
          <div className="flex flex-col">
            {mockScenarios.map((scenario) => (
              <div
                key={scenario.label}
                className="flex items-center justify-between border-b border-[var(--border-default)] px-[var(--sp-4)] py-[var(--sp-3)] last:border-b-0"
              >
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  {scenario.label}
                </span>
                <div className="flex gap-[var(--sp-2)]">
                  <span className="rounded-[var(--radius-ds-sm)] border border-[var(--border-default)] px-3 py-1 text-xs font-medium text-[var(--text-primary)]">
                    {scenario.optionA}
                  </span>
                  <span className="rounded-[var(--radius-ds-sm)] border border-[var(--border-default)] px-3 py-1 text-xs font-medium text-[var(--text-primary)]">
                    {scenario.optionB}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* More scenarios indicator */}
          <div className="flex items-center justify-center bg-[var(--bg-overlay)] px-[var(--sp-4)] py-[var(--sp-3)]">
            <span className="text-sm font-medium text-[var(--brand)]">+15 more scenarios</span>
          </div>
        </div>
      </div>
    </section>
  )
}
