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
        <h2
          className="mb-[var(--sp-2)] text-center font-heading text-2xl font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          Every match. 19 scenarios.
        </h2>
        <p
          className="mb-[var(--sp-6)] text-center text-base"
          style={{ color: 'var(--text-secondary)' }}
        >
          From toss winner to total sixes — make your calls.
        </p>

        {/* Mock match card */}
        <div
          className="overflow-hidden rounded-[var(--radius-ds-lg)] border border-[var(--border-default)]"
          style={{ backgroundColor: 'var(--bg-raised)' }}
        >
          {/* Match header */}
          <div className="flex items-center justify-between border-b border-[var(--border-default)] px-[var(--sp-4)] py-[var(--sp-3)]">
            <div className="flex items-baseline gap-[var(--sp-2)]">
              <span
                className="font-heading text-lg font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                RCB vs CSK
              </span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Match 1
              </span>
            </div>
            <span
              className="rounded-[var(--radius-ds-sm)] px-2 py-1 text-xs font-medium uppercase tracking-[0.05em]"
              style={{
                backgroundColor: 'var(--warning-muted)',
                color: 'var(--warning)',
              }}
            >
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
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {scenario.label}
                </span>
                <div className="flex gap-[var(--sp-2)]">
                  <span
                    className="rounded-[var(--radius-ds-sm)] border border-[var(--border-default)] px-3 py-1 text-xs font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {scenario.optionA}
                  </span>
                  <span
                    className="rounded-[var(--radius-ds-sm)] border border-[var(--border-default)] px-3 py-1 text-xs font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {scenario.optionB}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* More scenarios indicator */}
          <div
            className="flex items-center justify-center px-[var(--sp-4)] py-[var(--sp-3)]"
            style={{
              backgroundColor: 'var(--bg-overlay)',
            }}
          >
            <span className="text-sm font-medium" style={{ color: 'var(--brand)' }}>
              +15 more scenarios
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
