import { ScenarioCard } from '@/components/predictions/scenario-card'
import { PageWrapper } from '@/components/layout/page-wrapper'

interface MockScenario {
  id: string
  title: string
  description: string
  pointsWeight: number
  inputLabel: string
}

const MOCK_SCENARIOS: readonly MockScenario[] = [
  {
    id: 'toss',
    title: 'Who wins the toss?',
    description: 'Team pick',
    pointsWeight: 5,
    inputLabel: 'CSK vs MI',
  },
  {
    id: 'match',
    title: 'Who wins the match?',
    description: 'Team pick',
    pointsWeight: 10,
    inputLabel: 'CSK vs MI',
  },
  {
    id: 'top-scorer',
    title: 'Top run scorer?',
    description: 'Player pick',
    pointsWeight: 15,
    inputLabel: 'Pick a player',
  },
  {
    id: 'csk-score',
    title: 'CSK innings score?',
    description: 'Range',
    pointsWeight: 10,
    inputLabel: '0-149  ·  150-174  ·  175+',
  },
  {
    id: 'fifty',
    title: 'Will anyone score 50+?',
    description: 'Yes / No',
    pointsWeight: 5,
    inputLabel: 'Yes  ·  No',
  },
] as const

/**
 * PredictionPreview — static mock of a predict page.
 *
 * Shows what a user will see when they hit a real match: a header
 * with match context, followed by 5 example scenarios rendered
 * with the real `ScenarioCard` component. The inputs are static
 * placeholders — no pickers, no API calls, no interactivity.
 *
 * Server Component.
 *
 * @see docs/stories/PUB-001-landing-page.md
 */
export function PredictionPreview() {
  return (
    <section
      aria-labelledby="prediction-preview-heading"
      className="bg-concrete-black py-16 md:py-20"
    >
      <PageWrapper>
        <h2
          id="prediction-preview-heading"
          className="text-h2 mb-10 text-text-primary"
        >
          What you&rsquo;ll predict
        </h2>

        {/* Mock match header */}
        <div className="mb-6 rounded-lg border border-wire bg-dark-concrete p-4">
          <p className="text-caption text-text-muted">Sample match</p>
          <p className="text-h3 mt-1 text-text-primary">CSK vs MI</p>
          <p className="text-body-sm mt-1 text-text-secondary">
            5 of 19 scenarios shown
          </p>
        </div>

        {/* Scenario list */}
        <div className="flex flex-col gap-3">
          {MOCK_SCENARIOS.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              title={scenario.title}
              description={scenario.description}
              pointsWeight={scenario.pointsWeight}
              isPicked={false}
            >
              <div
                className="rounded-md border border-wire bg-mid-concrete px-3 py-2 text-body-sm text-text-muted"
                aria-hidden="true"
              >
                {scenario.inputLabel}
              </div>
            </ScenarioCard>
          ))}
        </div>
      </PageWrapper>
    </section>
  )
}
