// TODO: This file contains placeholder legal copy only. Before launch it
// MUST be replaced with real, lawyer-reviewed Privacy Policy content.
// See docs/stories/PUB-002-privacy-terms.md for context.

import type { Metadata } from 'next'

import { PageWrapper } from '@/components/layout/page-wrapper'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Bragg collects, uses, and protects your data when you play our free IPL prediction game.',
}

/**
 * Privacy Policy page — `/privacy`.
 *
 * Pure static server component. No auth gate, no data fetching, no cookies
 * or headers reads — eligible for SSG. Lives in the `(app)` route group so
 * it inherits the global NavBar (renders null for logged-out users) and
 * Footer from `(app)/layout.tsx`. The `/privacy` prefix is whitelisted as
 * public in `src/middleware.ts`, so unauthenticated visitors can reach it.
 *
 * @see docs/stories/PUB-002-privacy-terms.md
 */
export default function PrivacyPage() {
  return (
    <PageWrapper className="pt-8">
      <h1 className="text-h1 text-text-primary">PRIVACY POLICY</h1>
      <p className="mt-2 text-body-sm text-text-secondary">Last updated: April 2026</p>

      <section className="mt-8 space-y-4" aria-labelledby="privacy-introduction">
        <h2 id="privacy-introduction" className="text-h2 text-text-primary">
          Introduction
        </h2>
        <p className="text-body text-text-secondary">
          Bragg is a free, social prediction game built around the IPL cricket season. This
          Privacy Policy explains what information we collect when you use Bragg, how we use
          that information, and the choices you have about it.
        </p>
        <p className="text-body text-text-secondary">
          By creating an account or otherwise using Bragg, you agree to the collection and
          use of information as described in this policy. If you do not agree, please do not
          use the app.
        </p>
      </section>

      <section className="mt-8 space-y-4" aria-labelledby="privacy-data-collection">
        <h2 id="privacy-data-collection" className="text-h2 text-text-primary">
          Data Collection
        </h2>
        <p className="text-body text-text-secondary">
          When you sign up for Bragg we collect the information you provide directly,
          including your email address, display name, and date of birth. We also store the
          predictions you submit, the gangs you join, and the results of each match as they
          relate to your account.
        </p>
        <p className="text-body text-text-secondary">
          We automatically collect limited technical information to keep the service running,
          such as device type, browser, approximate location derived from your IP address,
          and the timestamps of your activity. We do not collect payment details because
          Bragg is free to play and contains no purchases.
        </p>
      </section>

      <section className="mt-8 space-y-4" aria-labelledby="privacy-how-we-use">
        <h2 id="privacy-how-we-use" className="text-h2 text-text-primary">
          How We Use Your Data
        </h2>
        <p className="text-body text-text-secondary">
          We use your information to run the game: to authenticate you, record your
          predictions, compute scores, surface leaderboards and notifications, and send
          you service-related messages such as password resets or important account
          updates.
        </p>
        <p className="text-body text-text-secondary">
          Aggregated, non-identifying usage data helps us understand which features are
          working, fix bugs, and plan new functionality. We do not sell your personal data,
          and we do not use it to serve third-party advertising.
        </p>
      </section>

      <section className="mt-8 space-y-4" aria-labelledby="privacy-data-sharing">
        <h2 id="privacy-data-sharing" className="text-h2 text-text-primary">
          Data Sharing
        </h2>
        <p className="text-body text-text-secondary">
          Inside a gang, other members can see your display name, predictions, and score.
          This is the core social loop of Bragg. Outside of a gang, your activity is not
          shared with other users.
        </p>
        <p className="text-body text-text-secondary">
          We use trusted third-party service providers (for example, our authentication and
          database provider) to operate the app. These providers only process data on our
          behalf and under contractual confidentiality obligations. We may also disclose
          information when required by law or to protect the rights and safety of our users.
        </p>
      </section>

      <section className="mt-8 space-y-4" aria-labelledby="privacy-data-retention">
        <h2 id="privacy-data-retention" className="text-h2 text-text-primary">
          Data Retention
        </h2>
        <p className="text-body text-text-secondary">
          We keep your account data for as long as your account is active. When you delete
          your account, we remove your personal profile information and disassociate your
          historical predictions from you, typically within thirty days.
        </p>
        <p className="text-body text-text-secondary">
          Some information may be retained for a limited period in backup systems or where
          required for legal, tax, or fraud-prevention purposes.
        </p>
      </section>

      <section className="mt-8 space-y-4" aria-labelledby="privacy-your-rights">
        <h2 id="privacy-your-rights" className="text-h2 text-text-primary">
          Your Rights
        </h2>
        <p className="text-body text-text-secondary">
          Depending on where you live, you may have rights to access, correct, export, or
          delete the personal information we hold about you. You can update your display
          name and other profile details at any time from your profile page, and you can
          delete your account from the account actions section.
        </p>
        <p className="text-body text-text-secondary">
          If you need help exercising any of these rights, or if you believe your
          information has been handled incorrectly, please contact us using the details
          below and we will respond within a reasonable timeframe.
        </p>
      </section>

      <section className="mt-8 space-y-4" aria-labelledby="privacy-contact">
        <h2 id="privacy-contact" className="text-h2 text-text-primary">
          Contact
        </h2>
        <p className="text-body text-text-secondary">
          Questions about this Privacy Policy or about how Bragg handles your data can be
          sent to our support team. We will update this page whenever we make meaningful
          changes and will note the date of the most recent revision at the top.
        </p>
      </section>
    </PageWrapper>
  )
}
