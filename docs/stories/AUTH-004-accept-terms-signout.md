# AUTH-004: Accept Terms Page + Sign Out

**Phase:** 4 — Auth Flow
**Dependencies:** AUTH-002, LAY-001
**Estimated scope:** Accept terms page for re-acceptance + sign out action

---

## Description

Build the accept-terms page (`/accept-terms`) shown when the terms version has a major update, and the sign-out server action that clears all cookies and session.

---

## Acceptance Criteria

### Accept Terms Page (`src/app/(standalone)/accept-terms/page.tsx`)
- [ ] Standalone page (no nav bar, no footer)
- [ ] Blocking: user cannot access any other page until they accept
- [ ] App logo + "BRAGG" heading
- [ ] "We've updated our terms" heading
- [ ] Links to full Privacy Policy and Terms & Conditions pages (open in new tab)
- [ ] Acceptance checkbox: "I accept the updated Terms of Service and Privacy Policy"
- [ ] Submit button: "Continue" (primary variant), disabled until checkbox checked
- [ ] Redirects to `/dashboard` after acceptance

### Accept Terms Server Action (`src/lib/actions/auth.ts` — add to existing)
- [ ] `acceptTerms()` → `ActionResult`
- [ ] Auth check: user must be authenticated
- [ ] Updates `v2_profiles`: `terms_version` = CURRENT_TERMS_VERSION, `terms_accepted_at` = now
- [ ] Sets `bragg_terms_version` cookie to new version
- [ ] Fires analytics event

### Sign Out Action (`src/lib/actions/auth.ts` — add to existing)
- [ ] `signOut()` → void
- [ ] Calls `supabase.auth.signOut()`
- [ ] Clears cookies: Supabase auth cookies, `bragg_onboarded`, `bragg_terms_version`
- [ ] Fires `SIGNED_OUT` analytics event
- [ ] Redirects to `/` (landing page)

---

## Files to Create

```
web-app/src/
├── app/
│   └── (standalone)/
│       └── accept-terms/
│           └── page.tsx
├── components/
│   └── auth/
│       ├── accept-terms-form.tsx   # Client Component
│       └── accept-terms-form.stories.tsx
├── lib/
│   └── actions/
│       └── auth.ts                 # UPDATE — add acceptTerms, signOut
```

---

## Technical Notes

### Accept Terms Flow
```
Middleware detects bragg_terms_version cookie major version < CURRENT_TERMS_VERSION
  ↓ Redirects to /accept-terms
  ↓
User sees accept-terms page
  ↓ Checks the checkbox
  ↓ Clicks "Continue"
  ↓
acceptTerms() server action
  ↓ Updates v2_profiles (terms_version, terms_accepted_at)
  ↓ Sets bragg_terms_version cookie
  ↓ Redirects to /dashboard
```

### Sign Out Implementation
```typescript
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_NAMES } from '@/lib/constants'

export async function signOut() {
  const supabase = await createServerClient()
  await supabase.auth.signOut()

  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAMES.ONBOARDED)
  cookieStore.delete(COOKIE_NAMES.TERMS_VERSION)

  // Supabase auth cookies are cleared by the SDK

  redirect('/')
}
```

### When Accept-Terms Is Triggered
Only triggered when major version changes:
- `2.0` → `2.1`: no re-acceptance (minor version)
- `2.0` → `3.0`: requires re-acceptance (major version)

The middleware checks this by comparing `Math.floor(parseFloat(cookieVersion))` vs `Math.floor(parseFloat(CURRENT_TERMS_VERSION))`.

---

## Storybook Requirements

### AcceptTermsForm Stories
- `Default` — checkbox unchecked, button disabled
- `Checked` — checkbox checked, button enabled
- `Loading` — submitting state
