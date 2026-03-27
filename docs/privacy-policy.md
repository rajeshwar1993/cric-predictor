# Privacy Policy

**Last updated:** March 28, 2026
**Effective date:** March 28, 2026

Bragg ("the App", "we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains what data we collect, why we collect it, how we store and use it, and what rights you have over your data.

This policy is written in compliance with the Digital Personal Data Protection Act, 2023 (DPDPA) of India and applicable information technology laws.

---

## 1. Data We Collect

We collect only the minimum data necessary to provide the service:

| Data Point | Collected When | Purpose |
|-----------|---------------|---------|
| **Display name** | Onboarding (mandatory) | Identifying you within squads and on leaderboards |
| **Email address** | Account creation | Authentication via magic link (login) |
| **Date of birth** | Onboarding (mandatory) | Age verification (18+ requirement). Never displayed to other users. |
| **Predictions** | Submitting picks for a match | Gameplay — scoring, leaderboards, match results |
| **Squad membership** | Creating or joining a squad | Associating you with your squads and their leaderboards |
| **Custom scenarios** | Proposing a prediction scenario | Displaying in the squad for other members to predict |
| **Terms acceptance timestamp** | Completing onboarding | Recording that you consented to our Terms and Privacy Policy |
| **App usage timestamps** | Interacting with the app | Account creation date, prediction submission time, login time |

**We do NOT collect:**
- Passwords (magic link authentication eliminates the need for passwords)
- Phone numbers
- Physical addresses or precise location
- Payment or financial information (the App is entirely free)
- Government IDs (Aadhaar, PAN, passport)
- Photos, camera, or microphone data
- Contacts or address book data

---

## 2. How We Use Your Data

| Data | Usage | Legal Basis |
|------|-------|-------------|
| Email | Sending a magic link for login. We do not send marketing emails, newsletters, or promotional content. | Necessary for service delivery |
| Display name | Shown to other members within your squads on leaderboards, predictions, and member lists | Necessary for service delivery |
| Date of birth | Verified once during onboarding to confirm you are 18 or older. Stored but never displayed to any user, including squad admins. | Necessary for legal compliance (age restriction) |
| Predictions | Used to compute points, leaderboard rankings, and match results. Visible to other squad members after the prediction deadline passes. | Necessary for service delivery |
| Usage timestamps | Used to enforce deadlines (prediction lockout) and for tiebreaking (earlier submission ranks higher) | Necessary for service delivery |

**We do not:**
- Sell, rent, or trade your personal data with third parties for marketing or advertising
- Use your data for profiling, targeted advertising, or automated decision-making
- Use your email for any purpose other than authentication
- Share your data with any third party beyond what is described in Section 5

---

## 3. Data Visibility Within the App

Your data is visible to other users only within the context of your squads:

| Data | Who Can See It | When |
|------|---------------|------|
| Display name | All approved members of your squads | Always |
| Email address | Squad admins/owners only | When viewing pending join requests (for identification) |
| Date of birth | No one (not displayed in the app) | Never |
| Predictions (your picks) | Other squad members | After the prediction deadline passes for that match |
| Prediction count (e.g., "12/16 picked") | Other squad members | Before deadline (picks themselves are hidden) |
| Leaderboard rank and points | Other squad members | After predictions are resolved |

Users outside your squads cannot see any of your data. There are no public profiles, public leaderboards, or public activity feeds.

---

## 4. Analytics and Usage Tracking

We use **PostHog** to understand how the App is used and to improve the experience. PostHog is a product analytics service.

### What PostHog collects:

| Data | Purpose |
|------|---------|
| Page views | Understanding which pages are visited and navigation patterns |
| Feature usage events | Knowing which features are used (e.g., predictions submitted, squads created) |
| Error events | Detecting and fixing bugs and crashes |
| User identifier (your Bragg user ID) | Associating analytics events with identified users only |
| Display name | Included in user identification for analytics context |

### What PostHog does NOT collect:
- Email address (not sent to PostHog)
- Date of birth
- Your actual prediction values or picks
- Any financial or payment data

### PostHog data storage:
- PostHog servers are located in the **United States** (us.i.posthog.com)
- PostHog's privacy policy: [posthog.com/privacy](https://posthog.com/privacy)

### Automatic opt-out:
Analytics tracking is **automatically disabled** when you visit the Privacy Policy or Terms of Service pages within the App.

### Person profiles:
PostHog creates person profiles only for **identified users** (users who have logged in). Anonymous visitors are not tracked.

---

## 5. Third-Party Services

We use the following third-party services to operate the App:

| Service | Purpose | Data Shared | Location | Privacy Policy |
|---------|---------|------------|----------|----------------|
| **Supabase** | Authentication, database, real-time updates | Email, display name, date of birth, all app data | AWS (cloud infrastructure) | [supabase.com/privacy](https://supabase.com/privacy) |
| **PostHog** | Product analytics and error tracking | User ID, display name, usage events, page views, error details | United States | [posthog.com/privacy](https://posthog.com/privacy) |
| **Vercel** | App hosting and delivery | IP address (standard server logs), page requests | Global CDN | [vercel.com/legal/privacy-policy](https://vercel.com/legal/privacy-policy) |
| **api-cricket.com** | Cricket match data (scores, results, squads) | No user data is shared — we only fetch match data from this service | N/A | [api-cricket.com](https://api-cricket.com) |

We do not use advertising networks, retargeting services, or data brokers.

---

## 6. Cookies and Local Storage

The App uses cookies and browser local storage for the following purposes:

| Storage Type | Name/Purpose | Duration | Essential? |
|-------------|-------------|----------|-----------|
| **Supabase auth cookies** | Maintain your login session | Session-based (refreshed on use) | Yes |
| **bragg_onboarded** | Remember that you completed onboarding (avoids re-asking) | 1 year | Yes |
| **PostHog cookies** | Analytics session and user identification | Long-lived | No (analytics) |
| **PostHog localStorage** | Analytics session persistence, feature flags | Until cleared | No (analytics) |

**We do not use:**
- Advertising cookies
- Cross-site tracking cookies
- Third-party marketing cookies

---

## 7. Data Retention

| Scenario | Retention Period |
|----------|-----------------|
| Active account | Data retained for as long as your account exists |
| Account deletion requested | All personal data deleted within **30 days** of request |
| Inactive account (no login for 12+ months) | We may send a reminder email; if no response, account may be deleted after an additional 30 days notice |
| Analytics data (PostHog) | Retained per PostHog's data retention policy (configurable, typically 12 months) |

When an account is deleted:
- Your profile (name, email, date of birth) is permanently removed
- Your predictions are anonymised (disassociated from your identity) to preserve squad leaderboard integrity, or deleted entirely if the squad is also deleted
- Your custom scenarios are retained in anonymised form (creator shown as "Deleted User") or removed
- Analytics data associated with your user ID in PostHog is not automatically deleted (contact us if you want this removed)

---

## 8. Your Rights Under DPDPA

As a user in India, you have the following rights under the Digital Personal Data Protection Act, 2023:

**Right to Access:** You can request a copy of all personal data we hold about you. We will provide this in a machine-readable format within 30 days.

**Right to Correction:** You can update your display name directly within the App at any time. For email changes, contact us at the email below.

**Right to Erasure (Deletion):** You can request deletion of your account and all associated personal data at any time. Contact us at the email below. We will complete the deletion within 30 days.

**Right to Withdraw Consent:** You can withdraw consent for data processing at any time by deleting your account. Note that withdrawing consent means you will no longer be able to use the App.

**Right to Grievance Redressal:** If you have a complaint about how your data is handled, contact us first. If we do not resolve your concern within 30 days, you may escalate to the Data Protection Board of India once it is constituted.

To exercise any of these rights, contact us at the email address in Section 12.

---

## 9. Children's Privacy

The App is not intended for anyone under 18 years of age. We verify age during the onboarding process by requiring your date of birth and checking that you are at least 18 years old.

We do not knowingly collect personal data from children under 18. If we become aware that we have collected data from a person under 18, we will take immediate steps to delete that data and terminate the associated account.

If you are a parent or guardian and believe your child has provided us with personal data, please contact us at the email below.

---

## 10. Data Security

We implement the following security measures to protect your data:

- All data transmitted between your device and our servers is encrypted using HTTPS/TLS
- Database access is controlled by Row Level Security (RLS) policies — users can only query data they are authorised to see
- Authentication is handled by Supabase Auth with industry-standard security practices
- No passwords are stored (magic link authentication eliminates password-related vulnerabilities)
- Admin functions (member management, scenario resolution) are restricted by role-based access control
- Predictions are hidden from other users until the prediction deadline passes (preventing copying)
- We do not process or store any payment or financial data

While we take reasonable measures to protect your data, no system is 100% secure. In the unlikely event of a data breach, we will notify affected users and relevant authorities as required by applicable law within 72 hours of becoming aware of the breach.

---

## 11. Changes to This Policy

We may update this Privacy Policy from time to time. When we make changes:

- The "Last updated" date at the top will be revised
- For significant changes affecting how your data is used, we will notify you via an in-app notification
- Your continued use of the App after changes are posted constitutes acceptance of the revised policy

We encourage you to review this policy periodically.

---

## 12. Contact Us

If you have any questions, concerns, or requests related to this Privacy Policy or your personal data, please contact us at:

**Email:** privacy@bragg.app

We aim to respond to all enquiries within 7 working days.

---

## 13. Grievance Officer

In accordance with the DPDPA and the Information Technology Act, 2000, the designated grievance officer for data protection matters is:

**Name:** Rajeshwar Rudra
**Email:** privacy@bragg.app
**Response time:** Within 30 days of receiving a complaint

---

*By using Bragg, you acknowledge that you have read and understood this Privacy Policy and consent to the collection and use of your data as described herein.*
