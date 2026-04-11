import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageWrapper } from '@/components/layout/page-wrapper'

/**
 * CtaSection — bottom-of-page call-to-action.
 *
 * Sits above the global footer, repeats the create/join CTAs,
 * and restates the entertainment-only disclaimer to satisfy the
 * PRD's gambling disclaimer NFR on the landing page.
 *
 * Server Component.
 *
 * @see docs/stories/PUB-001-landing-page.md
 */
export function CtaSection() {
  return (
    <section
      aria-labelledby="cta-section-heading"
      className="bg-dark-concrete py-16 md:py-20"
    >
      <PageWrapper className="text-center">
        <h2
          id="cta-section-heading"
          className="text-h2 mb-4 text-text-primary"
        >
          Ready to prove your cricket brain?
        </h2>
        <p className="text-body-lg mx-auto mb-10 max-w-[480px] text-text-secondary">
          Start a gang, pull your friends in, and bragg your way to #1.
        </p>

        <div className="mb-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Button asChild size="lg">
            <Link href="/login?redirectTo=/dashboard">Create a Gang</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/login?redirectTo=/dashboard">Join a Gang</Link>
          </Button>
        </div>

        <p className="text-caption mx-auto max-w-[560px] text-text-muted">
          Bragg is a free prediction game for entertainment purposes only. No
          real money. No betting. No prizes.
        </p>
      </PageWrapper>
    </section>
  )
}
