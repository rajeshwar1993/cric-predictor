import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-[var(--border-subtle)] py-4">
        <div className="mx-auto max-w-[720px] px-4">
          <Link href="/" className="font-display text-xl font-bold text-gradient">
            Bragg
          </Link>
        </div>
      </header>
      <main className="flex-1">
        <article className="mx-auto max-w-[720px] px-4 py-12 space-y-6">
          <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
            Privacy Policy
          </h1>
          <p className="text-xs text-[var(--text-muted)]">Last updated: March 2026</p>

          <div className="space-y-4 text-sm leading-relaxed text-[var(--text-secondary)]">
            <section className="space-y-2">
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                What We Collect
              </h2>
              <p>We collect the minimum data needed to run the app:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Display name</strong> — shown on leaderboards</li>
                <li><strong>Email address</strong> — used for magic link authentication</li>
                <li><strong>Predictions</strong> — your picks for each match scenario</li>
              </ul>
              <p>We do not collect passwords (magic link auth), payment information, location data, or device identifiers.</p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                How We Store It
              </h2>
              <p>
                All data is stored in Supabase (hosted on AWS). Data is encrypted at rest
                and in transit. We do not sell, share, or transfer your data to third parties.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                How We Use It
              </h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Authenticate you via email magic links</li>
                <li>Display your name and predictions to your group members</li>
                <li>Calculate leaderboard scores and standings</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                Your Rights
              </h2>
              <p>
                You can request deletion of your account and all associated data at any time
                by contacting us. Upon deletion, your display name on leaderboards will be
                anonymized.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                Cookies
              </h2>
              <p>
                We use essential cookies only for authentication session management.
                No tracking cookies, analytics, or third-party cookies are used.
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
