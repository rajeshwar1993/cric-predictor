# AUTH-003: Onboarding Page

**Phase:** 4 — Auth Flow
**Dependencies:** AUTH-002, LAY-001
**Estimated scope:** Onboarding form with display name, date of birth, terms acceptance

---

## Description

Build the onboarding page (`/onboarding`) shown to first-time users after magic link authentication. Collects display name, date of birth (age verification), and terms acceptance. Sets profile as onboarded and redirects to dashboard.

---

## Acceptance Criteria

### Onboarding Page (`src/app/(standalone)/onboarding/page.tsx`)
- [ ] Standalone page (no nav bar, no footer)
- [ ] Redirects to `/login` if unauthenticated
- [ ] Redirects to `/dashboard` if already onboarded (checks DB, not just cookie)
- [ ] App logo + "BRAGG" heading at top
- [ ] "Complete your profile" subheading

### Onboarding Form
- [ ] **Display name** input: 2–30 characters, trimmed
- [ ] **Date of birth** input: date picker or manual entry (YYYY-MM-DD)
- [ ] **Age verification:** Must be 18+ (validated client-side and server-side)
  - If under 18: "You must be 18 or older to use Bragg"
- [ ] **Terms checkbox:** "I agree to the [Terms of Service](/terms) and [Privacy Policy](/privacy)"
  - Links open in new tab
  - Must be checked to submit
- [ ] **Submit button:** "Get Started" (primary variant)
- [ ] Loading state on submit
- [ ] Error feedback via inline messages and/or toast

### Server Action (`src/lib/actions/auth.ts` — add to existing)
- [ ] `completeOnboarding(data: { displayName, dateOfBirth, termsAccepted })` → `ActionResult`
- [ ] Auth check: user must be authenticated
- [ ] Validates:
  - Display name: 2–30 chars after trim (Zod)
  - Date of birth: valid date, user is 18+ today
  - Terms accepted: must be true
- [ ] Updates `v2_profiles`:
  - `display_name`, `date_of_birth`, `terms_version` = CURRENT_TERMS_VERSION
  - `terms_accepted_at` = now, `onboarding_completed` = true
- [ ] Sets `bragg_onboarded` cookie
- [ ] Sets `bragg_terms_version` cookie
- [ ] Fires `ONBOARDING_COMPLETED` analytics event
- [ ] Redirects to `redirectTo` (from query param) or `/dashboard`

---

## Files to Create

```
web-app/src/
├── app/
│   └── (standalone)/
│       └── onboarding/
│           └── page.tsx
├── components/
│   └── auth/
│       ├── onboarding-form.tsx     # Client Component
│       └── onboarding-form.stories.tsx
├── lib/
│   └── actions/
│       └── auth.ts                 # UPDATE — add completeOnboarding
```

---

## Technical Notes

### Age Verification
```typescript
function isAtLeast18(dateOfBirth: Date): boolean {
  const today = new Date()
  const age = today.getFullYear() - dateOfBirth.getFullYear()
  const monthDiff = today.getMonth() - dateOfBirth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    return age - 1 >= 18
  }
  return age >= 18
}
```

### Zod Schema
```typescript
const onboardingSchema = z.object({
  displayName: z.string()
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(30, 'Display name must be at most 30 characters'),
  dateOfBirth: z.string()
    .refine(val => !isNaN(Date.parse(val)), 'Invalid date')
    .refine(val => isAtLeast18(new Date(val)), 'You must be 18 or older to use Bragg'),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Terms of Service and Privacy Policy' }),
  }),
})
```

### Cookie Setting in Server Action
Server actions can set cookies using `cookies()` from `next/headers`:
```typescript
import { cookies } from 'next/headers'

const cookieStore = await cookies()
cookieStore.set(COOKIE_NAMES.ONBOARDED, 'true', { maxAge: 365 * 24 * 60 * 60, path: '/' })
cookieStore.set(COOKIE_NAMES.TERMS_VERSION, CURRENT_TERMS_VERSION, { maxAge: 365 * 24 * 60 * 60, path: '/' })
```

### Design
- Background: `#111111`
- Form card: same styling as login form
- Centered, max-width 400px
- Date input: may use native date input or a shadcn date picker

### Post-Onboarding Redirect
If the user arrived via an invite link:
1. They went to `/join/ABC` → stored invite in localStorage → redirected to `/login`
2. After magic link → callback → `/onboarding?redirectTo=/dashboard`
3. After onboarding → redirect to `/dashboard`
4. On dashboard, the pending invite banner checks localStorage and shows the join prompt

---

## Storybook Requirements

### OnboardingForm Stories
- `Default` — empty form
- `Filled` — all fields populated
- `ValidationErrors` — display name too short, date too young, terms unchecked
- `Loading` — submitting state
- `UnderAge` — shows age restriction error
