import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Terms and Conditions",
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
        <article className="mx-auto max-w-[720px] px-4 py-12 space-y-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
              Terms and Conditions
            </h1>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Last updated: March 28, 2026 &middot; Effective: March 28, 2026
            </p>
          </div>

          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            Welcome to Bragg. By accessing or using the App, you agree to be bound by these Terms
            and Conditions. If you do not agree, please do not use the App.
          </p>

          <div className="space-y-8 text-sm leading-relaxed text-[var(--text-secondary)]">
            {/* 1. Nature of Service */}
            <Section title="1. Nature of the Service">
              <p>
                Bragg is a <strong>free entertainment platform</strong> that allows users to make
                predictions about cricket match outcomes within private squads of friends. The App is
                designed for fun and bragging rights only.
              </p>
              <p>
                <strong>The App does not involve real money in any form.</strong> There are no entry
                fees, cash prizes, monetary stakes, wagering, or betting of any kind. Points and
                leaderboard positions carry no monetary value and cannot be exchanged, transferred,
                redeemed, or converted into cash, credits, or any other form of consideration.
              </p>
              <p>
                The App is <strong>not</strong> a gambling, betting, wagering, or fantasy sports
                platform. It is a social game of skill and knowledge where users demonstrate their
                understanding of cricket by making predictions within private squads.
              </p>
            </Section>

            {/* 2. Eligibility */}
            <Section title="2. Eligibility">
              <p>
                You must be <strong>18 years of age or older</strong> to use the App. During
                onboarding, you are required to provide your date of birth. We verify that you meet
                the age requirement before granting access.
              </p>
              <p>By creating an account, you confirm and represent that:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>You are at least 18 years old</li>
                <li>The date of birth you provided is accurate</li>
                <li>You have the legal capacity to enter into these terms</li>
              </ul>
              <p>
                If we become aware that a user is under 18 or has provided a false date of birth, we
                will terminate their account and delete their data.
              </p>
            </Section>

            {/* 3. No Affiliation */}
            <Section title="3. No Affiliation">
              <p>
                Bragg is an <strong>independent platform</strong> and is not affiliated with, endorsed
                by, sponsored by, or associated with the Board of Control for Cricket in India (BCCI),
                the Indian Premier League (IPL), any IPL franchise, any cricket board, any
                broadcaster, or any player.
              </p>
              <p>
                Team names, team codes, match schedules, and cricket data are sourced from publicly
                available third-party APIs for informational and entertainment purposes only. No
                official logos, trademarks, or copyrighted imagery of any cricket organisation are
                used.
              </p>
            </Section>

            {/* 4. Accounts & Consent */}
            <Section title="4. Accounts and Consent">
              <p>
                To use the App, you must create an account by providing an email address and completing
                the onboarding process (display name, date of birth, and explicit acceptance of these
                Terms and our{" "}
                <Link href="/privacy" className="text-[var(--cyan)] underline">Privacy Policy</Link>
                {" "}by checking the consent checkbox).
              </p>
              <p>
                By completing onboarding, you confirm that you have read, understood, and agree to
                both these Terms and our Privacy Policy. This constitutes your informed consent under
                the Digital Personal Data Protection Act, 2023 for the collection and processing of
                your personal data.
              </p>
              <p>You are responsible for:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Maintaining the security of the email account linked to your Bragg account</li>
                <li>All activity that occurs under your account</li>
                <li>Keeping your account information accurate</li>
              </ul>
              <p>You agree not to create multiple accounts, share your account, impersonate another
                person, or use disposable email addresses to circumvent restrictions.</p>
            </Section>

            {/* 5. User Conduct */}
            <Section title="5. User Conduct">
              <p>When using the App, you agree not to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Use the App for any unlawful purpose</li>
                <li>Create custom scenarios that are offensive, abusive, discriminatory, defamatory, sexually explicit, or hateful</li>
                <li>Use display names that are offensive, impersonate others, or are misleading</li>
                <li>Harass, abuse, threaten, or intimidate other users</li>
                <li>Manipulate leaderboards through fake accounts, collusion, or exploiting bugs</li>
                <li>Scrape, reverse-engineer, or extract data from the App</li>
                <li>Use bots, scripts, or automated tools to interact with the App</li>
                <li>Attempt unauthorised access to other accounts or App infrastructure</li>
                <li>Interfere with or disrupt the App or its servers</li>
              </ul>
              <p>
                We may remove any user-generated content that violates these terms, at our sole
                discretion and without prior notice.
              </p>
            </Section>

            {/* 6. Squads */}
            <Section title="6. Squads and Squad Administration">
              <p className="font-medium text-[var(--text-primary)]">Creating and Joining Squads</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Create squads and invite others via invite codes or links</li>
                <li>Joining requires admin approval</li>
                <li>Squad size and per-user limits are as specified in the App</li>
              </ul>
              <p className="mt-3 font-medium text-[var(--text-primary)]">Squad Administrators</p>
              <p>
                Squad creators (&ldquo;owners&rdquo;) and designated administrators can: approve or
                reject members, remove members, promote/demote roles, create and manage scenarios,
                resolve outcomes, enter match results, set deadlines, and lock predictions.
              </p>
              <p>
                Administrators exercise these powers at their own discretion.{" "}
                <strong>
                  We are not responsible for administrative decisions made within squads
                </strong>
                , including unfair scoring, biased approvals, arbitrary removals, or incorrect results.
                If you disagree with an admin&apos;s decisions, your recourse is to leave the squad.
              </p>
            </Section>

            {/* 7. Predictions & Scoring */}
            <Section title="7. Predictions and Scoring">
              <p className="font-medium text-[var(--text-primary)]">How Scoring Works</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Submit predictions before the deadline (shown in-app, typically 45 minutes before match start, adjustable by admins)</li>
                <li>After deadline, predictions are locked and visible to squad members</li>
                <li>Outcomes resolved via third-party cricket APIs or manually by admins</li>
                <li>Points awarded for correct predictions</li>
                <li>Tiebreaker: earlier submission ranks higher</li>
              </ul>
              <p className="mt-3 font-medium text-[var(--text-primary)]">You Acknowledge That:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Match data may be delayed compared to live broadcasts</li>
                <li>Data may be incomplete or inaccurate due to third-party limitations</li>
                <li>Automated and manual scoring decisions are final</li>
                <li>We do not guarantee accuracy of any match data</li>
                <li>
                  <strong>
                    No prediction outcome, leaderboard position, or award entitles you to any
                    compensation, reward, prize, or monetary consideration
                  </strong>
                </li>
                <li>Points and ranks exist solely for entertainment and bragging rights</li>
              </ul>
            </Section>

            {/* 8. UGC */}
            <Section title="8. User-Generated Content">
              <p>By creating a custom scenario, you:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Grant us a non-exclusive, royalty-free licence to display it within the App</li>
                <li>Confirm the content does not violate third-party intellectual property rights</li>
                <li>Confirm the content complies with the User Conduct rules (Section 5)</li>
                <li>Accept that admins may approve, reject, adjust points for, or remove your scenario</li>
              </ul>
              <p>
                We do not pre-screen all content. Admins are primarily responsible for moderation.
                We reserve the right to remove any content we deem inappropriate.
              </p>
            </Section>

            {/* 9. IP */}
            <Section title="9. Intellectual Property">
              <p>
                All App design, branding (including &ldquo;Bragg&rdquo;), UI, code, and content we
                create is our intellectual property. You may not copy, modify, distribute, sell, or
                create derivative works without written permission.
              </p>
              <p>
                Users retain ownership of their display names and custom scenarios but grant us a
                licence to display them within the App.
              </p>
            </Section>

            {/* 10. Privacy */}
            <Section title="10. Privacy and Data">
              <p>
                Your use of the App is governed by our{" "}
                <Link href="/privacy" className="text-[var(--cyan)] underline">Privacy Policy</Link>.
                Key points:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>We collect display name, email, date of birth, and prediction data</li>
                <li>We use PostHog for product analytics (usage events, error tracking)</li>
                <li>Analytics data, including your email and user ID, is transferred to PostHog&apos;s servers in the United States</li>
                <li>We do not sell your data</li>
                <li>You can request account deletion at any time</li>
              </ul>
            </Section>

            {/* 11. Liability */}
            <Section title="11. Limitation of Liability">
              <p>
                The App is provided on an <strong>&ldquo;as is&rdquo; and &ldquo;as available&rdquo;</strong>{" "}
                basis. We make no warranties of any kind, express or implied.
              </p>
              <p>To the maximum extent permitted by applicable law, we shall not be liable for:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Loss of data (predictions, leaderboard history, account info)</li>
                <li>Downtime, service interruptions, or unavailability</li>
                <li>Incorrect scoring, delayed data, or processing errors</li>
                <li>Decisions made by users or admins based on App data</li>
                <li>Disputes between users or between users and admins</li>
                <li>Emotional distress or reputational harm from leaderboard outcomes</li>
                <li>Unauthorised account access due to your failure to secure your email</li>
              </ul>
              <p>
                <strong>
                  Since the App is a free service with no monetary transactions, our maximum aggregate
                  liability shall not exceed INR 100 (Indian Rupees One Hundred).
                </strong>{" "}
                Nothing in this section excludes liability for fraud, wilful misconduct, or any
                liability that cannot be excluded under applicable Indian law.
              </p>
            </Section>

            {/* 12. Indemnification */}
            <Section title="12. Indemnification">
              <p>You agree to indemnify and hold us harmless from claims, damages, losses, or
                expenses arising from:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Your violation of these Terms</li>
                <li>Your content that infringes third-party rights or violates law</li>
                <li>Any misrepresentation by you (including regarding age or identity)</li>
              </ul>
            </Section>

            {/* 13. Termination */}
            <Section title="13. Account Termination">
              <p>
                <strong>By us:</strong> We may suspend or terminate your account for violation of
                these Terms, suspected fraud, abusive behaviour, leaderboard manipulation, or as
                required by law. We will provide reasonable notice where practicable, except for
                serious violations warranting immediate action.
              </p>
              <p>
                <strong>By you:</strong> Request account deletion anytime by contacting us at the
                email in Section 19. Your data will be removed per our Privacy Policy.
              </p>
            </Section>

            {/* 14. Force Majeure */}
            <Section title="14. Force Majeure">
              <p>
                We are not liable for failures or delays caused by circumstances beyond our reasonable
                control, including: natural disasters, government actions, internet or telecom
                failures, third-party API outages, power failures, cyberattacks, or pandemics.
              </p>
            </Section>

            {/* 15. Availability */}
            <Section title="15. Availability and Modifications">
              <p>
                We do not guarantee the App will always be available. We may modify, suspend, or
                discontinue it at any time. For significant Terms changes, we will notify you in-app
                and may request renewed consent. Continued use after changes constitutes acceptance.
              </p>
            </Section>

            {/* 16. Dispute Resolution */}
            <Section title="16. Dispute Resolution">
              <p>
                <strong>Informal resolution:</strong> First, contact us at the email in Section 19.
                We will attempt to resolve the matter within 30 days.
              </p>
              <p>
                <strong>Arbitration:</strong> If unresolved, either party may refer the dispute to
                binding arbitration under the Arbitration and Conciliation Act, 1996. A sole
                arbitrator, mutually agreed, shall conduct proceedings in New Delhi, India, in English.
                The decision is final and binding.
              </p>
              <p>
                <strong>Jurisdiction:</strong> Either party may seek injunctive relief from the courts
                of New Delhi, India, for matters requiring immediate judicial intervention.
              </p>
            </Section>

            {/* 17. Governing Law */}
            <Section title="17. Governing Law">
              <p>These Terms are governed by Indian law, including:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Information Technology Act, 2000</li>
                <li>IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</li>
                <li>Digital Personal Data Protection Act, 2023</li>
                <li>Indian Contract Act, 1872</li>
                <li>Consumer Protection Act, 2019</li>
              </ul>
            </Section>

            {/* 18. General */}
            <Section title="18. General Provisions">
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Severability:</strong> If any provision is found invalid, the rest remain in effect.</li>
                <li><strong>Waiver:</strong> Failure to enforce a right does not waive it. Any waiver must be written.</li>
                <li><strong>Entire Agreement:</strong> These Terms and the Privacy Policy are the full agreement between us.</li>
                <li><strong>Assignment:</strong> You may not assign your rights without our consent. We may assign ours freely.</li>
              </ul>
            </Section>

            {/* 19. Contact */}
            <Section title="19. Contact">
              <p>Questions about these Terms:</p>
              <p className="font-medium text-[var(--text-primary)]">
                Email: [INSERT_CONTACT_EMAIL]
              </p>
            </Section>
          </div>

          <p className="text-xs text-[var(--text-muted)] italic">
            By completing the onboarding process and checking the consent box, you acknowledge that
            you have read, understood, and agree to be bound by these Terms and Conditions.
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
