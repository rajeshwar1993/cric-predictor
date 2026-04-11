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
 * Renders inline static lime number blocks (sharp corners, offset
 * shadow) so the entire section stays in the server-component subtree
 * — the landing page is the LCP-critical surface and shouldn't ship
 * client JS for static numbers.
 *
 * @see docs/stories/PUB-001-landing-page.md
 */
export function HowItWorks() {
  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="py-16 md:py-20"
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
              <div
                aria-hidden="true"
                className="flex min-w-[72px] shrink-0 items-center justify-center bg-bragg-lime px-4 py-3 font-display text-stat font-bold text-text-on-primary shadow-[4px_4px_0_var(--color-lime-shade)]"
              >
                {step.number}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
                <h3 className="text-h3 text-text-primary">
                  <span className="sr-only">Step {step.number}: </span>
                  {step.title}
                </h3>
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
