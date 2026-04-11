import Link from 'next/link'
import { BraggWordmark } from '@/components/ui/bragg-wordmark'
import { Button } from '@/components/ui/button'
import { PageWrapper } from '@/components/layout/page-wrapper'

/**
 * HeroSection — top-of-landing-page marketing block.
 *
 * Wordmark "BRAGG" heading, Display-style uppercase headline, a
 * Body Large subheadline, and two CTAs that both route into the
 * login flow with a `redirectTo=/dashboard` query parameter.
 *
 * Bold Electric Street poster feel: concrete-black background with
 * lime color block accents and offset shadow geometry.
 *
 * Server Component — no interactivity.
 *
 * @see docs/stories/PUB-001-landing-page.md
 * @see docs/design-systems/electric-street.md
 */
export function HeroSection() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28"
    >
      {/* Geometric accent — lime color block, sharp corners, offset shadow */}
      <div
        aria-hidden="true"
        className="absolute -top-12 -right-12 h-48 w-48 rotate-12 bg-bragg-lime opacity-90 shadow-[8px_8px_0_var(--color-lime-shade)] md:-top-16 md:-right-16 md:h-64 md:w-64"
      />
      {/* Geometric accent — secondary concrete block */}
      <div
        aria-hidden="true"
        className="absolute -bottom-16 -left-10 h-40 w-40 -rotate-6 bg-dark-concrete md:-bottom-24 md:-left-16 md:h-56 md:w-56"
      />

      <PageWrapper className="relative pt-8">
        {/* Wordmark — decorative; the <h1> below carries the page title */}
        <BraggWordmark decorative className="mb-6" />

        {/* Headline */}
        <h1
          id="hero-heading"
          className="text-display mb-6 max-w-[560px] text-text-primary"
        >
          Predict right.
          <br />
          Prove it.
          <br />
          <span className="text-bragg-lime">Bragg.</span>
        </h1>

        {/* Subheadline */}
        <p className="text-body-lg mb-10 max-w-[560px] text-text-secondary">
          The prediction game that settles debates in your group chat.
        </p>

        {/* CTAs */}
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Button asChild size="lg">
            <Link href="/login?redirectTo=/dashboard">Create a Gang</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/login?redirectTo=/dashboard">Join a Gang</Link>
          </Button>
        </div>
      </PageWrapper>
    </section>
  )
}
