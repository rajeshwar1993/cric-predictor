import { Users, Target, Trophy } from 'lucide-react'

const steps = [
  {
    number: 1,
    icon: Users,
    title: 'Rally Your Squad',
    description:
      'Create a gang or join one with an invite code. Grab your cricket crew — predictions are better with rivals.',
  },
  {
    number: 2,
    icon: Target,
    title: 'Lock In Your Picks',
    description:
      "19 scenarios per match. Who'll win? Top scorer? Total sixes? Make your calls before the deadline.",
  },
  {
    number: 3,
    icon: Trophy,
    title: 'Own the Leaderboard',
    description:
      'Points drop live as the match unfolds. Climb the standings, talk trash, and earn your bragging rights.',
  },
] as const

export function HowItWorks() {
  return (
    <section className="px-[var(--sp-5)] py-[var(--sp-12)]" aria-label="How it works">
      <div className="mx-auto max-w-[480px]">
        <h2
          className="mb-[var(--sp-8)] text-center font-heading text-2xl font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          How it works
        </h2>

        <div className="flex flex-col gap-[var(--sp-4)]">
          {steps.map((step) => {
            const Icon = step.icon
            return (
              <div
                key={step.number}
                className="flex gap-[var(--sp-4)] rounded-[var(--radius-ds-lg)] border border-[var(--border-default)] p-[var(--sp-4)] transition-colors hover:border-[var(--border-strong)]"
                style={{ backgroundColor: 'var(--bg-raised)' }}
              >
                {/* Step number + icon */}
                <div className="flex shrink-0 flex-col items-center gap-[var(--sp-2)]">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-ds-full)] text-sm font-bold"
                    style={{
                      backgroundColor: 'var(--brand-muted)',
                      color: 'var(--brand)',
                    }}
                  >
                    {step.number}
                  </span>
                  <Icon
                    size={20}
                    strokeWidth={1.5}
                    style={{ color: 'var(--text-tertiary)' }}
                    aria-hidden="true"
                  />
                </div>

                {/* Text */}
                <div className="flex flex-col gap-[var(--sp-1)]">
                  <h3
                    className="font-heading text-lg font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
