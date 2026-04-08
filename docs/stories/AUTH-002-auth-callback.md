# AUTH-002: Auth Callback + Session Setup

**Phase:** 4 — Auth Flow
**Dependencies:** FND-002, FND-005
**Estimated scope:** Route handler that exchanges magic link code for session, sets cookies, redirects

---

## Description

Implement the auth callback route handler (`/auth/callback`) that Supabase redirects to after the user clicks the magic link. It exchanges the auth code for a session, sets app cookies, and redirects appropriately.

---

## Acceptance Criteria

- [ ] Route handler at `src/app/(public)/auth/callback/route.ts` (GET)
- [ ] Extracts `code` from URL query params
- [ ] Exchanges code for session via `supabase.auth.exchangeCodeForSession(code)`
- [ ] On success:
  - Fetches user profile to check `onboarding_completed`
  - If profile has `is_deleted = true`: restores profile (sets `is_deleted = false`, clears `deleted_at`)
  - If `onboarding_completed = true`:
    - Sets `bragg_onboarded` cookie (1 year max age, httpOnly, path `/`)
    - Sets `bragg_terms_version` cookie to profile's `terms_version`
    - Redirects to `redirectTo` param (default: `/dashboard`)
  - If `onboarding_completed = false`:
    - Clears `bragg_onboarded` cookie if it exists (prevents stale cookie from previous user)
    - Redirects to `/onboarding` with original `redirectTo` preserved as query param
- [ ] On failure (no code, invalid code, expired):
  - Redirects to `/login?error=auth_callback_failed`
- [ ] `redirectTo` param sanitized (relative paths only)
- [ ] Fires `AUTH_CALLBACK_SUCCESS` or `AUTH_CALLBACK_FAILURE` analytics event

---

## Files to Create

```
web-app/src/app/(public)/auth/callback/
└── route.ts
```

---

## Technical Notes

### Route Handler
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { COOKIE_NAMES, CURRENT_TERMS_VERSION } from '@/lib/constants'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const redirectTo = sanitizeRedirect(searchParams.get('redirectTo') || '/dashboard')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url))
  }

  const supabase = await createServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url))
  }

  // Fetch profile to check onboarding status
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login?error=no_user', request.url))
  }

  const { data: profile } = await supabase
    .from('v2_profiles')
    .select('onboarding_completed, terms_version, is_deleted')
    .eq('id', user.id)
    .single()

  // Handle deleted account restoration
  if (profile?.is_deleted) {
    await supabase
      .from('v2_profiles')
      .update({ is_deleted: false, deleted_at: null })
      .eq('id', user.id)
  }

  const response = NextResponse.redirect(new URL(
    profile?.onboarding_completed ? redirectTo : `/onboarding?redirectTo=${encodeURIComponent(redirectTo)}`,
    request.url
  ))

  if (profile?.onboarding_completed) {
    response.cookies.set(COOKIE_NAMES.ONBOARDED, 'true', {
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: '/',
    })
    if (profile.terms_version) {
      response.cookies.set(COOKIE_NAMES.TERMS_VERSION, profile.terms_version, {
        maxAge: 365 * 24 * 60 * 60,
        path: '/',
      })
    }
  } else {
    // Clear stale cookie from previous user
    response.cookies.delete(COOKIE_NAMES.ONBOARDED)
  }

  return response
}
```

### Edge Cases
- **Expired magic link:** Supabase returns an error; redirect to login with error param
- **Already used code:** Same as expired — Supabase rejects
- **Deleted account re-signin:** Restore profile before checking onboarding
- **Missing profile:** Should never happen (trigger auto-creates), but handle gracefully

---

## Testing Requirements

- [ ] Unit test: callback with valid code → sets cookies, redirects to dashboard
- [ ] Unit test: callback with no code → redirects to login with error
- [ ] Unit test: callback for new user → redirects to onboarding, no bragg_onboarded cookie
- [ ] Unit test: callback for deleted user → restores profile
- [ ] Unit test: redirectTo sanitization prevents open redirects
