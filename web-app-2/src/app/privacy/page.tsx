import { LegalPage } from '@/components/layout/legal-page'

export default function PrivacyPolicyPage() {
  return (
    <LegalPage>
      <h1>Privacy Policy</h1>
      <p>
        <strong>Last updated:</strong> March 28, 2026
        <br />
        <strong>Effective date:</strong> March 28, 2026
      </p>

      <p>
        Bragg (&quot;the App&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed to
        protecting your privacy. This Privacy Policy explains what data we collect, why we collect
        it, how we store and use it, and what rights you have over your data.
      </p>

      <h2>1. Data We Collect</h2>
      <ul>
        <li>
          <strong>Email address</strong> — for authentication via magic link sign-in
        </li>
        <li>
          <strong>Display name</strong> — chosen by you during onboarding
        </li>
        <li>
          <strong>Date of birth</strong> — to verify you are 18+ years old (age verification only,
          not stored beyond your profile)
        </li>
        <li>
          <strong>Prediction data</strong> — your match predictions within gangs
        </li>
        <li>
          <strong>Usage analytics</strong> — anonymous pageviews, clicks, and performance metrics
          via PostHog (no session recordings by default)
        </li>
      </ul>

      <h2>2. How We Use Your Data</h2>
      <p>
        We use your data solely to operate the prediction game: authenticating your identity,
        displaying your profile to gang members, recording predictions, computing leaderboards, and
        sending notifications.
      </p>

      <h2>3. Data Storage</h2>
      <p>
        Your data is stored in Supabase (hosted on AWS infrastructure). All data is encrypted at
        rest and in transit. We do not sell, share, or transfer your data to third parties except as
        required by law.
      </p>

      <h2>4. Your Rights</h2>
      <ul>
        <li>
          <strong>Access</strong> — you can view all your data within the app
        </li>
        <li>
          <strong>Correction</strong> — update your display name at any time
        </li>
        <li>
          <strong>Deletion</strong> — delete your account from the app, which soft-deletes your
          profile and removes you from all gangs
        </li>
        <li>
          <strong>Portability</strong> — contact us to request a copy of your data
        </li>
      </ul>

      <h2>5. Cookies</h2>
      <p>
        We use essential cookies for authentication session management and app preferences
        (onboarding status, terms acceptance). We do not use third-party advertising cookies.
      </p>

      <h2>6. Contact</h2>
      <p>
        For privacy-related questions or requests, contact us at <strong>privacy@bragg.app</strong>.
      </p>
    </LegalPage>
  )
}
