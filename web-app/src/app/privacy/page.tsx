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
        <article className="mx-auto max-w-[720px] px-4 py-12 space-y-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
              Privacy Policy
            </h1>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Last updated: March 28, 2026 &middot; Effective: March 28, 2026
            </p>
          </div>

          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            Bragg (&ldquo;the App&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;)
            is committed to protecting your privacy. This policy explains what data we collect, why
            we collect it, how we store and use it, and what rights you have. It is written in
            compliance with the Digital Personal Data Protection Act, 2023 (DPDPA), the Information
            Technology Act, 2000, and the IT (Reasonable Security Practices) Rules, 2011.
          </p>

          <div className="space-y-8 text-sm leading-relaxed text-[var(--text-secondary)]">
            {/* 1. Consent */}
            <Section title="1. Consent">
              <p>
                By completing the onboarding process &mdash; which requires you to check a box
                confirming that you have read and agree to this Privacy Policy and our{" "}
                <Link href="/terms" className="text-[var(--cyan)] underline">Terms and Conditions</Link>
                {" "}&mdash; you provide free, specific, informed, unconditional, and unambiguous
                consent to the collection and processing of your personal data as described herein.
              </p>
              <p>
                You may withdraw consent at any time by requesting account deletion (see Section 8).
                Withdrawing consent means you will no longer be able to use the App.
              </p>
            </Section>

            {/* 2. Data We Collect */}
            <Section title="2. Data We Collect">
              <p>We collect only the minimum data necessary to provide the service:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Display name</strong> &mdash; identifying you within squads and on leaderboards</li>
                <li><strong>Email address</strong> &mdash; authentication via magic link</li>
                <li><strong>Date of birth</strong> &mdash; age verification (18+). Never displayed to other users.</li>
                <li><strong>Predictions</strong> &mdash; your picks for each match scenario</li>
                <li><strong>Squad membership</strong> &mdash; associating you with your squads</li>
                <li><strong>Custom scenarios</strong> &mdash; prediction questions you propose</li>
                <li><strong>Terms acceptance timestamp</strong> &mdash; recording your consent</li>
                <li><strong>App usage timestamps</strong> &mdash; account creation, prediction submission, login times</li>
              </ul>
              <p className="font-medium text-[var(--text-primary)]">We do NOT collect:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Passwords (magic link auth eliminates the need)</li>
                <li>Phone numbers, physical addresses, or precise location</li>
                <li>Payment or financial information (the App is entirely free)</li>
                <li>Government IDs (Aadhaar, PAN, passport)</li>
                <li>Photos, camera, microphone, or contact data</li>
              </ul>
            </Section>

            {/* 3. How We Use Your Data */}
            <Section title="3. How We Use Your Data">
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Email</strong> &mdash; sending magic links for login. No marketing emails.</li>
                <li><strong>Display name</strong> &mdash; shown to squad members on leaderboards and predictions</li>
                <li><strong>Date of birth</strong> &mdash; verified once during onboarding. Stored but never shown to any user, including admins.</li>
                <li><strong>Predictions</strong> &mdash; computing points, rankings, and results. Visible to squad members after the deadline.</li>
                <li><strong>Timestamps</strong> &mdash; enforcing deadlines and tiebreaking (earlier submission ranks higher)</li>
              </ul>
              <p>
                Legal basis for all processing: <strong>Consent</strong> (Section 6, DPDPA), provided
                during onboarding.
              </p>
              <p>We do not sell, rent, or trade your personal data. We do not use your data for
                profiling, targeted advertising, or automated decision-making.</p>
            </Section>

            {/* 4. Data Visibility */}
            <Section title="4. Data Visibility Within the App">
              <p>Your data is visible to other users only within your squads:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Display name</strong> &mdash; visible to all approved squad members, always</li>
                <li><strong>Email</strong> &mdash; visible to squad admins/owners only, for identifying pending join requests</li>
                <li><strong>Date of birth</strong> &mdash; visible to no one. Never displayed in the App.</li>
                <li><strong>Your picks</strong> &mdash; visible to squad members only after the prediction deadline</li>
                <li><strong>Pick count</strong> (e.g., &ldquo;12/16 picked&rdquo;) &mdash; visible before deadline; picks themselves are hidden</li>
                <li><strong>Leaderboard rank &amp; points</strong> &mdash; visible to squad members after results resolve</li>
              </ul>
              <p>Users outside your squads cannot see any of your data. There are no public profiles or public leaderboards.</p>
            </Section>

            {/* 5. Analytics */}
            <Section title="5. Analytics and Usage Tracking">
              <p>
                We use <strong>PostHog</strong> (PostHog, Inc.) to understand how the App is used and
                to improve the experience.
              </p>
              <p className="font-medium text-[var(--text-primary)]">What PostHog receives:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Page views and navigation patterns</li>
                <li>Feature usage events (e.g., predictions submitted, squads created)</li>
                <li>Error events (for bug detection)</li>
                <li>Your Bragg user ID, display name, and email address (for user identification)</li>
              </ul>
              <p className="font-medium text-[var(--text-primary)]">What PostHog does NOT receive:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Date of birth</li>
                <li>Your actual prediction values or picks</li>
                <li>Any financial or payment data</li>
              </ul>
              <p>
                PostHog servers are located in the <strong>United States</strong>. By consenting to
                this Privacy Policy, you consent to the transfer of analytics data to PostHog&apos;s
                US servers. PostHog&apos;s privacy policy:{" "}
                <a href="https://posthog.com/privacy" className="text-[var(--cyan)] underline" target="_blank" rel="noopener noreferrer">
                  posthog.com/privacy
                </a>
              </p>
              <p>
                Analytics tracking is <strong>automatically disabled</strong> on the Privacy Policy
                and Terms of Service pages. PostHog only tracks identified (logged-in) users &mdash;
                anonymous visitors are not tracked.
              </p>
            </Section>

            {/* 6. Third-Party Services */}
            <Section title="6. Third-Party Services">
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-light)]">
                      <th className="py-2 pr-3 text-left font-display font-semibold text-[var(--text-primary)]">Service</th>
                      <th className="py-2 pr-3 text-left font-display font-semibold text-[var(--text-primary)]">Purpose</th>
                      <th className="py-2 pr-3 text-left font-display font-semibold text-[var(--text-primary)]">Data Shared</th>
                      <th className="py-2 text-left font-display font-semibold text-[var(--text-primary)]">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    <tr>
                      <td className="py-2 pr-3 font-medium text-[var(--text-primary)]">Supabase</td>
                      <td className="py-2 pr-3">Auth, database, real-time</td>
                      <td className="py-2 pr-3">Email, name, DOB, all app data</td>
                      <td className="py-2">AWS</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-medium text-[var(--text-primary)]">PostHog</td>
                      <td className="py-2 pr-3">Analytics &amp; error tracking</td>
                      <td className="py-2 pr-3">User ID, email, name, events</td>
                      <td className="py-2">United States</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-medium text-[var(--text-primary)]">Vercel</td>
                      <td className="py-2 pr-3">App hosting</td>
                      <td className="py-2 pr-3">IP address (server logs)</td>
                      <td className="py-2">Global CDN</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-medium text-[var(--text-primary)]">api-cricket.com</td>
                      <td className="py-2 pr-3">Cricket match data</td>
                      <td className="py-2 pr-3">No user data shared</td>
                      <td className="py-2">N/A</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>We do not use advertising networks, retargeting services, or data brokers.</p>
            </Section>

            {/* 7. Cookies */}
            <Section title="7. Cookies and Local Storage">
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Supabase auth cookies</strong> (essential) &mdash; maintain your login session</li>
                <li><strong>bragg_onboarded cookie</strong> (essential) &mdash; remembers onboarding completion, 1 year</li>
                <li><strong>PostHog cookies</strong> (analytics) &mdash; session and user identification, long-lived</li>
                <li><strong>PostHog localStorage</strong> (analytics) &mdash; session persistence and feature flags</li>
              </ul>
              <p>
                By consenting to this Privacy Policy during onboarding, you consent to the use of all
                cookies listed above, including non-essential analytics cookies. We do not use
                advertising, cross-site tracking, or marketing cookies.
              </p>
            </Section>

            {/* 8. Data Retention */}
            <Section title="8. Data Retention">
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Active account</strong> &mdash; data retained as long as your account exists</li>
                <li><strong>Deletion requested</strong> &mdash; all personal data deleted within 30 days</li>
                <li><strong>Inactive 12+ months</strong> &mdash; we may send a service email about pending deactivation; if no response in 30 days, the account may be deactivated</li>
                <li><strong>Analytics data</strong> &mdash; retained per PostHog&apos;s retention policy</li>
              </ul>
              <p>When deleted: your profile is permanently removed. Predictions are anonymised to
                preserve leaderboard integrity. Custom scenarios show &ldquo;Deleted User.&rdquo;
                PostHog data is not automatically deleted &mdash; contact us if you want it removed.</p>
            </Section>

            {/* 9. Your Rights */}
            <Section title="9. Your Rights Under DPDPA">
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Right to Access</strong> (Section 11(1)(a)) &mdash; request a summary of all personal data we hold. Provided within 30 days in machine-readable format.</li>
                <li><strong>Right to Correction &amp; Erasure</strong> (Section 11(1)(b)&ndash;(c)) &mdash; update your display name in-app anytime. For email changes or full deletion, contact us.</li>
                <li><strong>Right to Withdraw Consent</strong> (Section 6(5)) &mdash; request account deletion at any time. Prior processing remains lawful.</li>
                <li><strong>Right to Grievance Redressal</strong> (Section 13) &mdash; contact our Grievance Officer. If unresolved in 30 days, escalate to the Data Protection Board of India.</li>
                <li><strong>Right to Nominate</strong> (Section 14) &mdash; nominate someone to exercise your rights in the event of your death or incapacity.</li>
              </ul>
              <p>To exercise any right, contact us at the email in Section 13.</p>
            </Section>

            {/* 10. Children */}
            <Section title="10. Children&rsquo;s Privacy">
              <p>
                The App is not intended for anyone under 18. We verify age during onboarding. If we
                learn we have collected data from someone under 18, we will immediately delete it and
                terminate the account.
              </p>
            </Section>

            {/* 11. Security */}
            <Section title="11. Data Security">
              <ul className="list-disc pl-5 space-y-1">
                <li>All data encrypted in transit (HTTPS/TLS)</li>
                <li>Row Level Security (RLS) &mdash; users only access authorised data</li>
                <li>Supabase Auth with industry-standard practices</li>
                <li>No passwords stored (magic link auth)</li>
                <li>Role-based access control for admin functions</li>
                <li>Predictions hidden until deadline passes</li>
                <li>No payment or financial data processed</li>
              </ul>
              <p>
                In the event of a data breach, we will notify the Data Protection Board of India as
                required under DPDPA Section 8(6) and notify affected users without unreasonable delay.
              </p>
            </Section>

            {/* 12. Changes */}
            <Section title="12. Changes to This Policy">
              <p>
                We may update this policy. The &ldquo;Last updated&rdquo; date will be revised.
                For significant changes, we will notify you in-app and may request renewed consent
                where required under DPDPA. Continued use after changes constitutes acceptance,
                except where renewed consent is needed.
              </p>
            </Section>

            {/* 13. Contact & Grievance */}
            <Section title="13. Contact Us and Grievance Officer">
              <p>
                For questions, concerns, or requests about this Privacy Policy or your personal data:
              </p>
              <p className="font-medium text-[var(--text-primary)]">
                Email: [INSERT_CONTACT_EMAIL]
              </p>
              <p>We respond within 7 working days.</p>
              <div className="mt-4 rounded-[10px] border border-[var(--border-light)] bg-[var(--bg-card)] p-4">
                <p className="font-display text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Grievance Officer
                </p>
                <p className="mt-2">
                  <strong>Name:</strong> [INSERT_GRIEVANCE_OFFICER_NAME]<br />
                  <strong>Email:</strong> [INSERT_GRIEVANCE_OFFICER_EMAIL]<br />
                  <strong>Response:</strong> Acknowledgement within 24 hours; resolution within 30 days
                </p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Per DPDPA Section 13 and IT (Intermediary Guidelines) Rules, 2021
                </p>
              </div>
            </Section>
          </div>

          <p className="text-xs text-[var(--text-muted)] italic">
            By completing the onboarding process and checking the consent box, you acknowledge that
            you have read and understood this Privacy Policy and provide your consent to the
            collection, use, storage, and transfer of your personal data as described herein.
          </p>
        </article>
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
      {children}
    </section>
  );
}
