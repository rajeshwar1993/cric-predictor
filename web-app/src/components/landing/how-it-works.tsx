import { StatBlock } from '@/components/ui/stat-block'
import { PageWrapper } from '@/components/layout/page-wrapper'

interface Step {
  number: number
  title: string
  description: string
}

const STEPS: readonly Step[] = [
  {
    number: 1,
    title: 'Form a Gang',
    description:
      'Create a private group, share the invite link, get your crew in.',
  },
  {
    number: 2,
    title: 'Make Predictions',
    description:
      '19 scenarios per match. Pick winners, top scorers, powerplay runs, and more.',
  },
  {
    number: 3,
    title: 'Compete & Bragg',
    description: 'Live leaderboards. Season standings. Screenshot your #1 spot.',
  },
] as const

/**
 * HowItWorks — three-step explainer section.
 *
 * Uses the `StatBlock` primitive (lime, sharp-cornered, offset shadow)
 * to number each step, giving the section a strong graphic rhythm.
 *
 * Server Component — no interactivity.
 *
 * @see docs/stories/PUB-001-landing-page.md
 */
export function HowItWorks() {
  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="bg-concrete-black py-16 md:py-20"
    >
      <PageWrapper>
        <h2
          id="how-it-works-heading"
          className="text-h2 mb-10 text-text-primary"
        >
          How it works
        </h2>

        <ol className="flex flex-col gap-8">
          {STEPS.map((step) => (
            <li key={step.number} className="flex items-start gap-5">
              <StatBlock
                value={step.number}
                label={`Step ${step.number}`}
                aria-hidden="true"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
                <h3 className="text-h3 text-text-primary">{step.title}</h3>
                <p className="text-body text-text-secondary">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </PageWrapper>
    </section>
  )
}
