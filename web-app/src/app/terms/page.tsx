import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-xs text-[var(--text-muted)]">Last updated: March 2026</p>

          <div className="space-y-4 text-sm leading-relaxed text-[var(--text-secondary)]">
            <section className="space-y-2">
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                About Bragg
              </h2>
              <p>
                Bragg is a free, social cricket prediction game for entertainment purposes only.
                No real money is involved in any aspect of the app. Bragg is not a gambling,
                betting, or fantasy sports platform.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                Eligibility
              </h2>
              <p>You must be 18 years or older to use Bragg.</p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                No Affiliation
              </h2>
              <p>
                Bragg is not affiliated with, endorsed by, or connected to the Board of Control
                for Cricket in India (BCCI), the Indian Premier League (IPL), or any IPL franchise.
                Team names and codes are used for identification purposes only.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                Data Accuracy
              </h2>
              <p>
                Match data is sourced from third-party APIs and may not always be perfectly
                accurate or timely. We make reasonable efforts to ensure correctness but
                cannot guarantee it. In case of data discrepancies, group admins can manually
                override results.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                User Conduct
              </h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Use your real or preferred display name</li>
                <li>Do not abuse the app to harass other users</li>
                <li>Do not attempt to manipulate predictions or leaderboards</li>
                <li>Group admins are responsible for managing their groups</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                Termination
              </h2>
              <p>
                We reserve the right to suspend or terminate accounts that violate these terms.
                You can delete your account at any time.
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
