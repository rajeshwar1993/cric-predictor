// TODO: This file contains placeholder legal copy only. Before launch it
// MUST be replaced with real, lawyer-reviewed Terms & Conditions content.
// See docs/stories/PUB-002-privacy-terms.md for context.

import type { Metadata } from 'next'

import { PageWrapper } from '@/components/layout/page-wrapper'

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description:
    'The rules for using Bragg, the free social prediction game for IPL fans.',
}

/**
 * Terms & Conditions page — `/terms`.
 *
 * Pure static server component. No auth gate, no data fetching, no cookies
 * or headers reads — eligible for SSG. Lives in the `(app)` route group so
 * it inherits the global NavBar (renders null for logged-out users) and
 * Footer from `(app)/layout.tsx`. The `/terms` prefix is whitelisted as
 * public in `src/middleware.ts`, so unauthenticated visitors can reach it.
 *
 * @see docs/stories/PUB-002-privacy-terms.md
 */
export default function TermsPage() {
  return (
    <PageWrapper className="pt-8">
      <h1 className="text-h1 text-text-primary">TERMS &amp; CONDITIONS</h1>
      <p className="mt-2 text-body-sm text-text-muted">Last updated: April 2026</p>

      <section className="mt-8 space-y-4" aria-labelledby="terms-introduction">
        <h2 id="terms-introduction" className="text-h2 text-text-primary">
          Introduction
        </h2>
        <p className="text-body text-text-secondary">
          Welcome to Bragg. These Terms &amp; Conditions govern your access to and use of
          the Bragg app and any related services. By creating an account, joining a gang,
          or submitting a prediction, you agree to be bound by these terms.
        </p>
        <p className="text-body text-text-secondary">
          Bragg is a free prediction game for entertainment purposes only. It is not a
          betting or gambling service. No real money is wagered, no cash or physical prizes
          are awarded, and nothing in the app constitutes a wager or bet of any kind.
        </p>
      </section>

      <section className="mt-8 space-y-4" aria-labelledby="terms-data-collection">
        <h2 id="terms-data-collection" className="text-h2 text-text-primary">
          Data Collection
        </h2>
        <p className="text-body text-text-secondary">
          When you use Bragg we collect the account information you provide (such as your
          email, display name, and date of birth) together with the predictions and gang
          activity you generate. Full details of what we collect and why are described in
          our Privacy Policy, which forms part of these terms.
        </p>
        <p className="text-body text-text-secondary">
          You are responsible for making sure the information you give us is accurate and
          for keeping your login credentials confidential. You may not impersonate another
          person or create accounts on behalf of someone without their permission.
        </p>
      </section>

      <section className="mt-8 space-y-4" aria-labelledby="terms-how-we-use">
        <h2 id="terms-how-we-use" className="text-h2 text-text-primary">
          How We Use Your Data
        </h2>
        <p className="text-body text-text-secondary">
          We use the information you provide to operate the game, including authenticating
          your account, recording predictions, calculating scores and leaderboards,
          delivering notifications, and communicating with you about the service.
        </p>
        <p className="text-body text-text-secondary">
          We may also use aggregated, non-identifying analytics to improve reliability, ship
          new features, and understand how the app is used. We will never use your data to
          serve third-party advertising.
        </p>
      </section>

      <section className="mt-8 space-y-4" aria-labelledby="terms-data-sharing">
        <h2 id="terms-data-sharing" className="text-h2 text-text-primary">
          Data Sharing
        </h2>
        <p className="text-body text-text-secondary">
          Your display name, predictions, and scores are visible to other members of the
          gangs you join. This is how the social bragging-rights loop works. You should not
          join a gang with people you are unwilling to share this information with.
        </p>
        <p className="text-body text-text-secondary">
          We share data with service providers who help us run Bragg (for example, our
          authentication and database provider) under strict confidentiality terms. We may
          also disclose information to comply with the law, enforce these terms, or protect
          the rights and safety of our users.
        </p>
      </section>

      <section className="mt-8 space-y-4" aria-labelledby="terms-data-retention">
        <h2 id="terms-data-retention" className="text-h2 text-text-primary">
          Data Retention
        </h2>
        <p className="text-body text-text-secondary">
          We retain your account and gameplay data while your account remains active. When
          you delete your account, we remove your personal profile information and
          disassociate your historical predictions from you, typically within thirty days.
        </p>
        <p className="text-body text-text-secondary">
          We may keep limited data for longer where necessary for legal, accounting, or
          security purposes, or in routine backups that are overwritten on a regular cycle.
        </p>
      </section>

      <section className="mt-8 space-y-4" aria-labelledby="terms-your-rights">
        <h2 id="terms-your-rights" className="text-h2 text-text-primary">
          Your Rights
        </h2>
        <p className="text-body text-text-secondary">
          You may stop using Bragg at any time and you may delete your account from the
          profile page. Depending on your jurisdiction, you may also have additional rights
          over the data we hold about you, as described in the Privacy Policy.
        </p>
        <p className="text-body text-text-secondary">
          We provide Bragg on an &ldquo;as is&rdquo; basis. To the fullest extent permitted
          by law, we make no warranties about uninterrupted availability, match results, or
          scoring accuracy, and we are not liable for indirect or consequential losses
          arising from your use of the app.
        </p>
      </section>

      <section className="mt-8 space-y-4" aria-labelledby="terms-contact">
        <h2 id="terms-contact" className="text-h2 text-text-primary">
          Contact
        </h2>
        <p className="text-body text-text-secondary">
          If you have questions about these Terms &amp; Conditions, or if you need to
          report a problem with the app, please reach out to our support team. We will
          update this page whenever we make meaningful changes and will note the date of
          the most recent revision at the top.
        </p>
      </section>
    </PageWrapper>
  )
}
