import { LegalPage } from '@/components/layout/legal-page'

export default function TermsAndConditionsPage() {
  return (
    <LegalPage>
      <h1>Terms and Conditions</h1>
      <p>
        <strong>Last updated:</strong> March 28, 2026
        <br />
        <strong>Effective date:</strong> March 28, 2026
      </p>

      <p>
        Welcome to Bragg (&quot;the App&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;). By
        accessing or using the App, you agree to be bound by these Terms and Conditions. If you do
        not agree, please do not use the App.
      </p>

      <h2>1. Nature of the Service</h2>
      <p>
        Bragg is a <strong>free, social prediction game</strong> for the Indian Premier League
        (IPL). No real money is wagered, won, or lost. Bragg is not a gambling, betting, or fantasy
        sports platform. Points and leaderboard positions have no monetary value.
      </p>

      <h2>2. Eligibility</h2>
      <ul>
        <li>You must be at least 18 years of age to use Bragg.</li>
        <li>By using the App, you represent that you meet this age requirement.</li>
        <li>
          We verify age via date of birth during onboarding but do not perform identity
          verification.
        </li>
      </ul>

      <h2>3. User Accounts</h2>
      <ul>
        <li>
          You sign in via a magic link sent to your email. You are responsible for maintaining
          access to your email account.
        </li>
        <li>
          You may delete your account at any time from within the App. Deletion is soft (your data
          is marked as deleted but retained for 30 days before permanent removal).
        </li>
        <li>If you re-sign-in after deletion, your account is restored.</li>
      </ul>

      <h2>4. Gangs and Predictions</h2>
      <ul>
        <li>Gangs are private groups created by users. Each gang has one admin (the creator).</li>
        <li>
          Predictions are your personal guesses about match outcomes. They are visible to gang
          members after the prediction deadline.
        </li>
        <li>Points are awarded based on correct predictions. Leaderboards reflect these points.</li>
      </ul>

      <h2>5. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the App for any illegal purpose</li>
        <li>Attempt to access other users&apos; accounts</li>
        <li>Use automated tools to interact with the App</li>
        <li>Harass, abuse, or threaten other users</li>
        <li>Interfere with the App&apos;s operation</li>
      </ul>

      <h2>6. Intellectual Property</h2>
      <p>
        All content, design, and code in Bragg is owned by us. IPL team names, logos, and match data
        are used under fair use for the purpose of running a prediction game. We are not affiliated
        with BCCI, IPL, or any franchise.
      </p>

      <h2>7. Disclaimer</h2>
      <p>
        Bragg is provided &quot;as is&quot; without warranties of any kind. We do not guarantee
        accuracy of match data, scores, or statistics. We are not responsible for any decisions you
        make based on information in the App.
      </p>

      <h2>8. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, we shall not be liable for any indirect, incidental,
        or consequential damages arising from your use of Bragg.
      </p>

      <h2>9. Changes to Terms</h2>
      <p>
        We may update these Terms from time to time. Major changes will require you to re-accept the
        terms before continuing to use the App. Minor changes take effect immediately.
      </p>

      <h2>10. Contact</h2>
      <p>
        For questions about these Terms, contact us at <strong>legal@bragg.app</strong>.
      </p>
    </LegalPage>
  )
}
