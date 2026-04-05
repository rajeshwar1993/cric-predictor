# Phase 1 — Auth & Onboarding

**Goal:** Users can sign in via magic link, complete onboarding (display name, DOB, terms acceptance), and land on an empty dashboard. Terms re-acceptance flow works. Profile re-signin after soft-delete restores the account. Global nav, footer, and destructive action dialog are reusable components.

**Exit criteria:**
- Visitor can enter email on `/login`, receive magic link, click it, and complete onboarding
- New user lands on `/dashboard` after onboarding (placeholder empty state)
- Returning user with completed onboarding skips onboarding and goes directly to `/dashboard`
- Signed-out user hitting protected routes is redirected to `/login`
- Terms version bump triggers `/accept-terms` gate
- User can delete account (soft-delete) and re-sign-in to restore
- Global Nav, Footer, and Destructive Action Dialog components exist and are reusable

---

## AUTH-DB-001: delete_account RPC

**Phase:** Phase 1 — Auth & Onboarding
**Priority:** P1
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As the developer,
> I want a Postgres RPC that handles account deletion in a single transaction including admin auto-promotion,
> So that the `deleteAccount` server action has a clean atomic operation to call.

**Context / Why:**
Per PRD, account deletion must handle the case where the user is admin of one or more gangs — auto-promoting the earliest-joined approved member, or auto-deleting the gang if no eligible candidate. All in one transaction so nothing is half-applied.

**Acceptance criteria:**
- [ ] Migration file: `supabase-2/migrations/012_delete_account_rpc.sql`
- [ ] Function: `delete_account(p_user_id UUID) RETURNS VOID` marked `SECURITY DEFINER`
- [ ] Implementation (all in one transaction):
  1. Find all gangs where the user has `role = 'admin'` via `v2_gang_members`
  2. For each admin gang:
     - Find the earliest-joined approved member with `is_deleted = false` on their profile, order by `approved_at ASC`, excluding the user being deleted
     - If a candidate is found:
       - Promote them: set `v2_gang_members.role = 'admin'` for the candidate
       - Update `v2_gangs.created_by` to the new admin's user_id
       - **Insert `admin_promoted` notification** for the promoted user, one row per gang they were promoted to:
         - `user_id` = promoted user
         - `type` = `'admin_promoted'`
         - `gang_id` = the gang they were promoted to
         - `fixture_id` = NULL
         - `message` = `'You''ve been promoted to admin of ' || gang.name || ' because the previous admin left Bragg.'`
         - `is_read` = false
     - If no candidate: soft-delete the gang (`is_deleted = true`, `deleted_at = now()`), insert `gang_deleted` notifications for all remaining approved members whose profile is not deleted
  3. Mark the user's profile as deleted: `v2_profiles.is_deleted = true`, `deleted_at = now()`
  4. Any failure → automatic rollback of all changes
- [ ] Raises exception with SQLSTATE `P0001` if user_id not found
- [ ] Notification inserts use the unique `uniq_notifications_dedup` index to prevent duplicates (note: `admin_promoted` is not in the dedup index predicate, which is correct — one promotion is a unique event)

**Out of scope:**
- Server action wrapper (AUTH-API-006)
- Sign-out flow (AUTH-API-003)

**Dependencies:** FND-DB-001, FND-DB-002, FND-DB-003, FND-DB-004
**Blocks:** AUTH-API-006

**PRD references:**
- [Authentication § Admin account deletion](../PRD.V2.md#authentication)
- [v2_profiles § is_deleted](../PRD.V2.md#v2_profiles--user-accounts)

**Technical notes:**
- Use advisory lock on user_id to prevent concurrent deletion races
- Filter out deleted profiles from both candidate search and notification recipient list
- `is_gang_admin` helper from FND-DB-002 can verify caller but isn't strictly needed inside a SECURITY DEFINER function

**Analytics events:** None (DB function; event fires from server action)

**Unit tests:**
- [ ] User with no gangs → profile deleted, no gang changes, no notifications
- [ ] User is admin of 1 gang with 2 other approved members → earliest one promoted, 1 `admin_promoted` notification inserted for the promoted user with correct message and `gang_id`
- [ ] User is admin of 3 gangs → 3 `admin_promoted` notifications inserted (one per gang, possibly to different users)
- [ ] User is admin of gang where all other members are deleted → gang soft-deleted, `gang_deleted` notifications inserted, no `admin_promoted` notification
- [ ] User is admin of gang with mix of deleted and non-deleted members → promoted to first non-deleted member, `admin_promoted` notification sent to that member
- [ ] Non-existent user_id → exception, no side effects (transaction rollback)
- [ ] Concurrent calls don't double-promote (advisory lock holds)

**Test plan:**
- [ ] Create test scenarios for each branch
- [ ] Run RPC, verify expected state

**Open questions:** None

---

## AUTH-API-001: signInWithMagicLink server action

**Phase:** Phase 1 — Auth & Onboarding
**Priority:** P0
**Estimated effort:** Small (2–4 hours)
**Status:** Not started

**User story:**
> As a visitor,
> I want to enter my email and receive a magic link,
> So that I can sign in without a password.

**Context / Why:**
The entry point to the app. Bragg uses passwordless auth via Supabase magic links. This server action wraps `supabase.auth.signInWithOtp` and handles rate limits, redirect sanitization, and error mapping.

**Acceptance criteria:**
- [ ] Server action `signInWithMagicLink(email: string, redirectTo?: string)` in `src/lib/actions/auth.ts`
- [ ] Validates email format server-side (contains `@`, length ≤ 254 chars)
- [ ] Sanitizes `redirectTo` — only allows relative paths starting with `/` (prevents open redirect attacks per PRD Security)
- [ ] Calls `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: '{APP_URL}/auth/callback?redirectTo=...' } })`
- [ ] Returns `{ success: true }` on success, `{ success: false, error: string }` on failure
- [ ] Maps Supabase errors to user-friendly messages:
  - Rate limit errors → "Please wait a moment and try again"
  - 60-second cooldown → "Please wait 60 seconds before requesting another link"
- [ ] Fires PostHog event `AUTH_MAGIC_LINK_REQUESTED` with hashed email as distinct_id
- [ ] Logs errors with context (error type, hashed email)
- [ ] Magic link expires in 1 hour (Supabase default)

**Out of scope:**
- Auth callback handling (AUTH-API-002)
- Login page UI (AUTH-UI-001)

**Dependencies:** FND-004 (Supabase client), FND-005 (PostHog)
**Blocks:** AUTH-UI-001

**PRD references:**
- [Login Page](../PRD.V2.md#login-page-login)
- [Authentication](../PRD.V2.md#authentication)
- [Security § Redirect protection](../PRD.V2.md#security)
- [Security § Rate limiting](../PRD.V2.md#security)
- [Analytics § Auth events](../PRD.V2.md#analytics)

**Technical notes:**
- Use `"use server"` directive at the top of the file
- `APP_URL` from environment variable
- Helper function `sanitizeRedirect(path?: string): string | undefined` — returns path if it starts with `/` and does not start with `//`, else undefined
- Hash email with `crypto.subtle.digest('SHA-256', ...)` for pre-auth distinct_id (matches `hashIdentifier` from FND-005)

**Analytics events:**
- `AUTH_MAGIC_LINK_REQUESTED` — fired on successful send, properties: `{ has_redirect: boolean }`, distinct_id: hashed email

**Unit tests:**
- [ ] Valid email + no redirect → success
- [ ] Invalid email → error "Please enter a valid email address"
- [ ] Relative redirect `/dashboard` → sanitized and used
- [ ] Protocol-relative redirect `//evil.com` → sanitized to undefined
- [ ] External URL `https://evil.com` → sanitized to undefined
- [ ] Rate limit error from Supabase → mapped to user-friendly message
- [ ] Mock PostHog capture and verify event fires with correct distinct_id

**Test plan:**
- [ ] Manual: enter valid email on login form (after AUTH-UI-001), confirm magic link arrives
- [ ] Manual: enter invalid email, confirm server-side rejection
- [ ] Manual: verify PostHog dashboard shows the event

**Open questions:** None

---

## AUTH-API-002: Auth callback route handler

**Phase:** Phase 1 — Auth & Onboarding
**Priority:** P0
**Estimated effort:** Small (2–4 hours)
**Status:** Not started

**User story:**
> As a user who clicked a magic link in my email,
> I want to be signed in and routed to the correct page,
> So that I can use the app after authentication.

**Context / Why:**
The auth callback exchanges the code from the magic link for a session, checks if the user needs onboarding, and routes accordingly.

**Acceptance criteria:**
- [ ] Route: `src/app/auth/callback/route.ts` (GET handler)
- [ ] Reads `code` and `redirectTo` from query params
- [ ] Sanitizes `redirectTo` (same helper as AUTH-API-001) — default to `/dashboard`
- [ ] Calls `supabase.auth.exchangeCodeForSession(code)`
- [ ] On success:
  - Fetches the user's `v2_profiles` row
  - If `is_deleted = true` → restore the profile (set `is_deleted = false`, clear `deleted_at`), per PRD
  - If `onboarding_completed = false` → redirect to `/onboarding`, pass through `redirectTo` via cookie `bragg_post_onboard_redirect`
  - If `onboarding_completed = true` → set `bragg_onboarded` cookie (1 year), redirect to `redirectTo`
- [ ] On failure → redirect to `/login?error=auth_callback_failed`
- [ ] Fires `AUTH_CALLBACK_SUCCESS` or `AUTH_CALLBACK_FAILED` PostHog events
- [ ] Cookies (`bragg_onboarded`, `bragg_post_onboard_redirect`) set with correct attributes: `httpOnly`, `secure` (in prod), `sameSite: lax`

**Out of scope:**
- Onboarding page rendering (AUTH-UI-002)
- Terms re-acceptance check (AUTH-MW-001)

**Dependencies:** FND-DB-001 (v2_profiles), FND-DB-004 (profile trigger), AUTH-API-001, FND-005
**Blocks:** AUTH-UI-002, AUTH-UI-001 (login success state)

**PRD references:**
- [Authentication § Post-auth routing](../PRD.V2.md#authentication)
- [Authentication § Deleted account re-signin](../PRD.V2.md#authentication)
- [Onboarding § Onboarded cookie](../PRD.V2.md#onboarding)

**Technical notes:**
- Use Next.js route handler with `export async function GET(request: Request)`
- Cookie options: `httpOnly: true, secure: NODE_ENV === 'production', sameSite: 'lax', path: '/'`
- `bragg_onboarded`: maxAge = 1 year
- `bragg_post_onboard_redirect`: maxAge = 1 hour
- Profile restore: `UPDATE v2_profiles SET is_deleted = false, deleted_at = null WHERE id = user.id`
- Anon identifier for failed callbacks: hash the URL + timestamp (so failures don't all collapse into one distinct_id)

**Analytics events:**
- `AUTH_CALLBACK_SUCCESS` — properties: `{ is_new_user: boolean }`, distinct_id: user.id
- `AUTH_CALLBACK_FAILED` — distinct_id: hashed URL

**Unit tests:**
- [ ] Valid code + onboarded user → redirect to dashboard
- [ ] Valid code + not-onboarded user → redirect to onboarding
- [ ] Valid code + deleted user → profile restored, redirect accordingly
- [ ] Invalid code → redirect to login with error
- [ ] `redirectTo=/group/abc` is honored after onboarding completion

**Test plan:**
- [ ] Complete full flow: request magic link → click link → land on onboarding or dashboard
- [ ] Test with soft-deleted account: verify restoration works

**Open questions:** None

---

## AUTH-API-003: signOut server action

**Phase:** Phase 1 — Auth & Onboarding
**Priority:** P0
**Estimated effort:** Small (< 1 hour)
**Status:** Not started

**User story:**
> As an authenticated user,
> I want to sign out,
> So that my session is cleared on this device.

**Context / Why:**
Simple but important. Must clear Supabase session AND the app cookies (`bragg_onboarded`, `bragg_terms_version`), then redirect to the landing page.

**Acceptance criteria:**
- [ ] Server action `signOut()` in `src/lib/actions/auth.ts`
- [ ] Calls `supabase.auth.signOut()`
- [ ] Deletes `bragg_onboarded` and `bragg_terms_version` cookies
- [ ] Fires `AUTH_SIGNED_OUT` PostHog event
- [ ] Redirects to `/` (landing page)

**Out of scope:** UI trigger (AUTH-UI-004)

**Dependencies:** FND-004, FND-005
**Blocks:** AUTH-UI-004 (user menu sign out option)

**PRD references:**
- [Authentication](../PRD.V2.md#authentication)
- [Onboarding § Cookie cleared on sign out](../PRD.V2.md#onboarding)

**Technical notes:**
- Use `cookies()` from `next/headers` to delete cookies
- Use `redirect()` from `next/navigation` at the end

**Analytics events:**
- `AUTH_SIGNED_OUT` — distinct_id: user.id

**Unit tests:**
- [ ] Calls `supabase.auth.signOut`
- [ ] Deletes both cookies
- [ ] Fires analytics event
- [ ] Returns redirect

**Test plan:**
- [ ] Sign in, click sign out in user menu, verify redirect to `/` and cookies cleared

**Open questions:** None

---

## AUTH-API-004: completeOnboarding server action

**Phase:** Phase 1 — Auth & Onboarding
**Priority:** P0
**Estimated effort:** Small (3–5 hours)
**Status:** Not started

**User story:**
> As a new user who just signed in,
> I want to provide my display name, date of birth, and accept the terms,
> So that I can start using the app.

**Context / Why:**
After first sign-in, the profile row exists (created by trigger) but `display_name` and `date_of_birth` are NULL. This action populates them and marks onboarding complete.

**Acceptance criteria:**
- [ ] Server action `completeOnboarding(displayName: string, dateOfBirth: string, acceptedTerms: boolean)` in `src/lib/actions/onboarding.ts`
- [ ] Validates:
  - User is authenticated (redirect to `/login` if not)
  - `displayName` is 2–30 characters after trim
  - `dateOfBirth` is a valid date, user is 18+ years old (server-side age calc)
  - `acceptedTerms` is true
- [ ] Updates `v2_profiles`:
  - `display_name = trimmed input`
  - `date_of_birth = parsed date`
  - `terms_version = CURRENT_TERMS_VERSION constant`
  - `terms_accepted_at = now()`
  - `onboarding_completed = true`
- [ ] Sets cookies:
  - `bragg_onboarded = '1'` (1 year)
  - `bragg_terms_version = CURRENT_TERMS_VERSION` (1 year)
- [ ] Fires `AUTH_ONBOARDING_COMPLETED` PostHog event
- [ ] Reads `bragg_post_onboard_redirect` cookie — if present, redirects there; else redirects to `/dashboard`
- [ ] Clears the `bragg_post_onboard_redirect` cookie after redirect
- [ ] Returns `{ success: false, error: string }` on validation failure

**Out of scope:** UI form (AUTH-UI-002)

**Dependencies:** FND-DB-001 (v2_profiles), FND-DB-004 (profile trigger — row must exist), FND-004, FND-005
**Blocks:** AUTH-UI-002

**PRD references:**
- [Onboarding Page](../PRD.V2.md#onboarding-page-onboarding)
- [Onboarding](../PRD.V2.md#onboarding) — business logic
- [Terms & Privacy Re-Acceptance](../PRD.V2.md#terms--privacy-re-acceptance)

**Technical notes:**
- Age calculation: `(today - dob) / 365.25 >= 18`, use date-fns for reliability
- Must use `CURRENT_TERMS_VERSION` constant from `src/lib/constants.ts` (create this file if it doesn't exist)
- Use `revalidatePath('/dashboard')` after update

**Analytics events:**
- `AUTH_ONBOARDING_COMPLETED` — distinct_id: user.id

**Unit tests:**
- [ ] Display name 2 chars → success
- [ ] Display name 1 char or 31 chars → rejected
- [ ] Age exactly 18 → success
- [ ] Age 17 → rejected
- [ ] `acceptedTerms = false` → rejected
- [ ] Valid input updates profile and sets cookies
- [ ] Redirect honors `bragg_post_onboard_redirect` cookie

**Test plan:**
- [ ] Complete onboarding from UI, verify profile row updated and cookies set
- [ ] Verify redirect respects cached intent (sign in via `/join/[code]` flow)

**Open questions:**
- Should display name uniqueness be checked globally? (Per PRD, it's unique per gang, not globally)

---

## AUTH-API-005: acceptTerms server action (re-acceptance flow)

**Phase:** Phase 1 — Auth & Onboarding
**Priority:** P0
**Estimated effort:** Small (2–3 hours)
**Status:** Not started

**User story:**
> As an existing user whose terms have changed (major version bump),
> I want to see the new terms and accept them,
> So that I can continue using the app.

**Context / Why:**
Per PRD Terms & Privacy Re-Acceptance: major version changes gate the user behind `/accept-terms`. This action updates the profile and cookie.

**Acceptance criteria:**
- [ ] Server action `acceptUpdatedTerms()` in `src/lib/actions/onboarding.ts`
- [ ] Requires authenticated user
- [ ] Updates `v2_profiles`:
  - `terms_version = CURRENT_TERMS_VERSION`
  - `terms_accepted_at = now()`
- [ ] Sets `bragg_terms_version` cookie (1 year)
- [ ] Redirects to `/dashboard` (or honor `redirectTo` from cookie if set)
- [ ] Returns error if user is not authenticated

**Out of scope:**
- Accept Terms page UI (AUTH-UI-003)
- Middleware check (AUTH-MW-001)

**Dependencies:** FND-004, FND-DB-001, FND-005
**Blocks:** AUTH-UI-003

**PRD references:**
- [Terms & Privacy Re-Acceptance](../PRD.V2.md#terms--privacy-re-acceptance)
- [Accept Terms Page](../PRD.V2.md#accept-terms-page-accept-terms)

**Technical notes:**
- `CURRENT_TERMS_VERSION` constant in `src/lib/constants.ts`
- Uses the `v2_profiles` UPDATE RLS policy (own row only)
- Cookie options: same as onboarded cookie

**Analytics events:**
- Consider adding `AUTH_TERMS_REACCEPTED` event (not in PRD but useful)

**Unit tests:**
- [ ] Updates terms_version to current version
- [ ] Sets cookie
- [ ] Rejects unauthenticated requests

**Test plan:**
- [ ] Manually bump `CURRENT_TERMS_VERSION` to a new major version
- [ ] Sign in, see `/accept-terms` gate
- [ ] Accept, verify redirect and cookie

**Open questions:** None

---

## AUTH-API-006: deleteAccount server action

**Phase:** Phase 1 — Auth & Onboarding
**Priority:** P1
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As a user,
> I want to delete my account,
> So that my profile is marked deleted and I'm signed out.

**Context / Why:**
Per PRD, account deletion is soft-delete. If the user is admin of any gangs, auto-promote the earliest-joined approved member (or auto-delete gang if no eligible candidate). All in one transaction.

**Acceptance criteria:**
- [ ] Server action `deleteAccount()` in `src/lib/actions/account.ts`
- [ ] Requires authenticated user
- [ ] Calls the `delete_account(user_id UUID)` RPC from AUTH-DB-001 (single transaction handles gangs, notifications, profile soft-delete)
- [ ] After RPC succeeds, sign out the user (clear Supabase session + cookies + redirect to `/`)
- [ ] Sign-out should share the core logic with `signOut` server action (AUTH-API-003) — extract into a helper to avoid calling one server action from another
- [ ] Fires `AUTH_ACCOUNT_DELETED` PostHog event before sign-out (so distinct_id is still set)
- [ ] Returns error if RPC fails (rolls back all changes)

**Out of scope:**
- The RPC itself (AUTH-DB-001)
- UI trigger — delete account button on Profile page (covered in Phase 6)

**Dependencies:** AUTH-DB-001, AUTH-API-003, FND-004, FND-005
**Blocks:** LB-UI-005 (Profile page uses this)

**PRD references:**
- [Authentication § Account deletion](../PRD.V2.md#authentication)
- [Authentication § Admin account deletion](../PRD.V2.md#authentication)

**Technical notes:**
- RPC implementation must be atomic — any failure rolls back
- Notification insert uses service role within the RPC
- Consider adding a lock or advisory lock to prevent concurrent deletion + promotion race

**Analytics events:**
- `AUTH_ACCOUNT_DELETED` — distinct_id: user.id (before sign-out)

**Unit tests:**
- [ ] User with no gangs → profile marked deleted
- [ ] User is admin of 1 gang with 2 other members → member promoted, profile deleted
- [ ] User is admin of 1 gang with 0 other eligible members → gang soft-deleted
- [ ] User is admin of 1 gang where all other members are also deleted → gang soft-deleted
- [ ] RPC failure → all changes rolled back, profile still intact
- [ ] Concurrent deletion handled (race conditions)

**Test plan:**
- [ ] Create test user, test gangs, run deletion in each scenario
- [ ] Verify notifications land in recipient's inbox

**Open questions:** None (decided: `admin_promoted` notification type is in-scope for launch; emitted by `delete_account` RPC in AUTH-DB-001; notification renderer handled in NOTIF-UI-002)

---

## AUTH-MW-001: Auth + onboarding + terms middleware

**Phase:** Phase 1 — Auth & Onboarding
**Priority:** P0
**Estimated effort:** Medium (4–8 hours)
**Status:** Not started

**User story:**
> As the developer,
> I want Next.js middleware that enforces auth, onboarding completion, and terms acceptance on all protected routes,
> So that users can't access features they shouldn't and get routed to the correct gate page.

**Context / Why:**
Middleware is the authoritative gate for "can this user access this page". It reads cookies (fast) and only hits the DB when necessary.

**Acceptance criteria:**
- [ ] `src/middleware.ts` at project root
- [ ] `src/lib/supabase/middleware.ts` — Supabase client for middleware (from FND-004)
- [ ] Runs on all routes except static assets and public paths (`/`, `/login`, `/auth/callback`, `/join/[code]`, `/privacy`, `/terms`, `_next`, favicon)
- [ ] For protected routes:
  1. Refresh session cookie via Supabase middleware client
  2. Check if user is authenticated — if not, redirect to `/login?redirectTo={currentPath}`
  3. Check `bragg_onboarded` cookie — if missing, redirect to `/onboarding`
  4. Check `bragg_terms_version` cookie — if missing OR major version differs from `CURRENT_TERMS_VERSION`, redirect to `/accept-terms`
- [ ] Major version check: parse both cookie and constant, compare only the integer part before `.`
- [ ] Middleware does NOT query the DB for profile state (cookie-only checks for speed)
- [ ] Includes a matcher config in the middleware file to scope its execution

**Out of scope:**
- Authentication itself (AUTH-API-001, AUTH-API-002)
- Page rendering (UI stories)

**Dependencies:** FND-004, AUTH-API-002, AUTH-API-004, AUTH-API-005
**Blocks:** All authenticated page stories

**PRD references:**
- [Authentication](../PRD.V2.md#authentication)
- [Onboarding § Onboarded cookie](../PRD.V2.md#onboarding)
- [Terms & Privacy Re-Acceptance](../PRD.V2.md#terms--privacy-re-acceptance)
- [Security § Authentication](../PRD.V2.md#security)

**Technical notes:**
- Middleware matcher example:
  ```
  export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|login|auth|join|privacy|terms|$).*)']
  }
  ```
- Cookie check is a simple string read — no DB query
- Use `NextResponse.redirect(new URL('/login', request.url))` for redirects
- Preserve query string on redirect to login via `redirectTo` param

**Analytics events:** None (middleware shouldn't fire analytics)

**Unit tests:**
- [ ] Unauthenticated user on `/dashboard` → redirected to `/login?redirectTo=/dashboard`
- [ ] Authenticated user without onboarded cookie → redirected to `/onboarding`
- [ ] Authenticated + onboarded user without terms cookie → redirected to `/accept-terms`
- [ ] Authenticated + onboarded + current terms → passes through
- [ ] Authenticated user with outdated major terms version → redirected to `/accept-terms`
- [ ] Authenticated user with minor terms version difference (2.0 → 2.1) → passes through
- [ ] Public paths (`/login`, `/auth/callback`, `/`) → always pass through

**Test plan:**
- [ ] Test full flow: visit `/dashboard` while logged out → login → onboarding → dashboard
- [ ] Bump `CURRENT_TERMS_VERSION` major, verify gate triggers

**Open questions:** None

---

## AUTH-UI-001: Login page

**Phase:** Phase 1 — Auth & Onboarding
**Priority:** P0
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As a visitor,
> I want to see a clean login page where I can enter my email to receive a magic link,
> So that I can sign in without creating a password.

**Context / Why:**
The first screen most users will see after the landing page. Mobile-first, dark mode, matches Bragg's punchy voice.

**Acceptance criteria:**
- [ ] Page: `src/app/login/page.tsx`
- [ ] Standalone layout — no global nav or footer (per PRD standalone pages list)
- [ ] Contains:
  - App logo + "Bragg" wordmark
  - Tagline copy
  - Email input (with label, placeholder, autofocus)
  - "Send Magic Link" button
  - Disclaimer text (gambling disclaimer per PRD)
- [ ] Uses shadcn `Input` and `Button` components
- [ ] Form calls `signInWithMagicLink` server action (from AUTH-API-001)
- [ ] Three states:
  - **Input state** — show form
  - **Sent state** — "Magic link sent to {email}" + resend button (disabled 60s) + "Use different email" link
  - **Error state** — show error message inline
- [ ] Resend cooldown uses client-side timer
- [ ] Supports `?redirectTo=/path` query param (forwarded to server action)
- [ ] Handles `?error=auth_callback_failed` query param (shows "That link expired. Let's get you a fresh one.")
- [ ] Uses `useTransition` for loading state on submit
- [ ] Fully keyboard-navigable, accessible labels
- [ ] Mobile-responsive (form fits on 375px wide screen)
- [ ] If user is already authenticated and onboarded, middleware redirects them away from `/login` (handled in AUTH-MW-001)

**Out of scope:**
- Server action logic (AUTH-API-001)
- Callback handling (AUTH-API-002)

**Dependencies:** AUTH-API-001, FND-006 (design system)
**Blocks:** None (landing page CTAs link here but can be stubbed)

**PRD references:**
- [Login Page](../PRD.V2.md#login-page-login)
- [Product feel § Tone of voice](../PRD.V2.md#product-feel)
- [Non-Functional Requirements § Gambling disclaimer](../PRD.V2.md#non-functional-requirements)

**Technical notes:**
- Dark mode by default
- Background: subtle gradient or ambient glow effect matching design system
- Use `useSearchParams()` for `redirectTo` and `error` query params
- Timer: `useEffect` + `setInterval` for countdown; `lastSentAt` state
- Hash emoji / punchy copy ("Call it. Prove it. Bragg." tagline)
- Component split:
  - `src/app/login/page.tsx` — page shell
  - `src/components/auth/login-form.tsx` — client component with form logic

**Analytics events:**
- PostHog autocapture handles pageviews automatically
- `AUTH_MAGIC_LINK_REQUESTED` fires via server action

**Unit tests:**
- [ ] Render shows form in input state
- [ ] Submit valid email → switches to sent state
- [ ] Submit invalid email → shows inline error
- [ ] Resend button disabled for 60s after send
- [ ] "Use different email" returns to input state
- [ ] `?error=auth_callback_failed` shows expiry message

**Test plan:**
- [ ] Desktop + mobile visual check
- [ ] Keyboard navigation (tab through form, enter to submit)
- [ ] Accessibility: axe-core scan

**Open questions:** None

---

## AUTH-UI-002: Onboarding page

**Phase:** Phase 1 — Auth & Onboarding
**Priority:** P0
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As a new user who just signed in,
> I want to fill out my display name, date of birth, and accept terms,
> So that I can start using Bragg.

**Context / Why:**
Required gate for all new users. Must be 18+. Standalone page (no nav).

**Acceptance criteria:**
- [ ] Page: `src/app/onboarding/page.tsx`
- [ ] Standalone layout (no global nav/footer)
- [ ] Server component: fetches `v2_profiles` for current user; if `onboarding_completed = true` → redirect to `/dashboard`; if not authenticated → redirect to `/login`
- [ ] Contains:
  - App logo
  - Heading: "One last step before you're in"
  - Display name input (2–30 chars, autofocus, maxLength)
  - Date of birth input (`type="date"`, `max` attribute set to today)
  - Terms acceptance checkbox with links to `/privacy` and `/terms` (open in new tab)
  - Submit button (disabled until all fields valid)
  - Disclaimer text
- [ ] Client-side validation:
  - Display name: 2–30 chars after trim
  - DOB: must be 18+ years old (shown as error text if younger)
  - Terms: required
- [ ] On submit → calls `completeOnboarding` server action (AUTH-API-004)
- [ ] Handles server errors by displaying them inline
- [ ] Loading state during submission
- [ ] Fully mobile-responsive and accessible

**Out of scope:** Server action logic (AUTH-API-004)

**Dependencies:** AUTH-API-004, FND-006
**Blocks:** All authenticated feature stories

**PRD references:**
- [Onboarding Page](../PRD.V2.md#onboarding-page-onboarding)
- [Onboarding](../PRD.V2.md#onboarding)

**Technical notes:**
- Component split:
  - `src/app/onboarding/page.tsx` — server component, auth check
  - `src/components/auth/onboarding-form.tsx` — client form
- DOB validation: both client-side (instant feedback) and server-side (trust)
- Max DOB: `new Date().toISOString().split('T')[0]`

**Analytics events:**
- `AUTH_ONBOARDING_COMPLETED` fires from server action

**Unit tests:**
- [ ] Form renders all fields
- [ ] Display name validation (2–30 chars)
- [ ] DOB validation (18+)
- [ ] Terms checkbox required
- [ ] Submit disabled until valid
- [ ] Submit calls server action with correct args

**Test plan:**
- [ ] Complete onboarding as new user → lands on dashboard
- [ ] Try to submit with age 17 → see error
- [ ] Try to submit without accepting terms → submit disabled

**Open questions:** None

---

## AUTH-UI-003: Accept Terms page

**Phase:** Phase 1 — Auth & Onboarding
**Priority:** P0
**Estimated effort:** Small (4–6 hours)
**Status:** Not started

**User story:**
> As an existing user whose terms have changed,
> I want to see the updated terms and accept them,
> So that I can continue using the app.

**Context / Why:**
Blocker page for users whose cookie/profile terms_version is outdated (major change).

**Acceptance criteria:**
- [ ] Page: `src/app/accept-terms/page.tsx`
- [ ] Standalone layout
- [ ] Contains:
  - App logo
  - Heading: "Updated Terms & Privacy"
  - Summary of what changed (placeholder for now — actual copy per release)
  - Links to full `/privacy` and `/terms` pages
  - Acceptance checkbox
  - "Continue" button (disabled until checked)
- [ ] On submit → calls `acceptUpdatedTerms` server action (AUTH-API-005)
- [ ] On success → redirect to `/dashboard` (or stored redirect)
- [ ] Blocking: user cannot navigate elsewhere (middleware enforces)
- [ ] If user not authenticated → redirect to `/login`

**Out of scope:** Server action (AUTH-API-005)

**Dependencies:** AUTH-API-005, FND-006
**Blocks:** None (only triggered when terms version bumps)

**PRD references:**
- [Accept Terms Page](../PRD.V2.md#accept-terms-page-accept-terms)
- [Terms & Privacy Re-Acceptance](../PRD.V2.md#terms--privacy-re-acceptance)

**Technical notes:**
- Page should be generic — copy updates with each version bump via the changelog
- Consider a config file that maps terms version to a "what changed" summary

**Analytics events:**
- Optional: `AUTH_TERMS_REACCEPTED` — if we add to the PRD

**Unit tests:**
- [ ] Renders with checkbox unchecked and button disabled
- [ ] Checking the box enables the button
- [ ] Submit calls the server action

**Test plan:**
- [ ] Bump `CURRENT_TERMS_VERSION` major version, verify gate appears, accept, verify redirect

**Open questions:** None

---

## AUTH-UI-004: Global Nav Bar component

**Phase:** Phase 1 — Auth & Onboarding
**Priority:** P0
**Estimated effort:** Medium (1 day)
**Status:** Not started

**User story:**
> As an authenticated user,
> I want a persistent nav bar with my avatar, notifications bell, and quick access to dashboard/profile/sign-out,
> So that I can navigate the app from anywhere.

**Context / Why:**
Shared component shown on all authenticated pages. Per PRD, includes notification bell (right side panel) and user menu (left side panel).

**Acceptance criteria:**
- [ ] Component: `src/components/layout/global-nav-bar.tsx`
- [ ] Server component wrapper + client subcomponents for interactive parts
- [ ] Shows:
  - App logo + "Bragg" wordmark (left, links to `/dashboard`)
  - Notification bell icon + unread count badge (right)
  - User menu avatar with initials (right)
- [ ] Notification bell: placeholder in this phase (clicks open an empty side panel "No notifications yet")
  - Full notification functionality in Phase 7
- [ ] User menu: click opens side panel animating from left, containing:
  - User's display name and email
  - "Dashboard" link (closes panel, navigates)
  - "Profile" link (closes panel, navigates)
  - Separator
  - "Sign out" button (calls AUTH-API-003)
- [ ] Sticky top header, backdrop blur
- [ ] Responsive: icons only on mobile, full text on desktop
- [ ] Uses shadcn `Sheet` (from FND-006) for side panels
- [ ] Fetches user profile via `createClient` server helper
- [ ] Accessible: labels for icon buttons, keyboard-navigable
- [ ] Renders unread count badge ("9+" if > 9)

**Out of scope:**
- Actual notification content (Phase 7)
- Profile page (Phase 6)
- Dashboard content (Phase 2+)

**Dependencies:** FND-006, AUTH-API-003, FND-DB-001 (to fetch profile)
**Blocks:** All authenticated page stories (they include the nav)

**PRD references:**
- [Global Nav Bar](../PRD.V2.md#global-nav-bar-shown-on-all-authenticated-pages)

**Technical notes:**
- Bell animates from **right**, user menu from **left** (per PRD)
- Avatar initials: compute from display_name (first letter of first and last word, uppercase)
- `NotificationBell` component: client component, receives `userId` as prop, placeholder panel for now
- `UserMenu` component: client component, receives `displayName`, `email` as props

**Analytics events:**
- `NOTIFICATION_BELL_OPENED` — on opening the bell panel (future, placeholder now)
- Sign out triggers `AUTH_SIGNED_OUT` from server action

**Unit tests:**
- [ ] Renders with user display name
- [ ] Initials computed correctly (single word, two words, empty name fallback)
- [ ] Clicking bell opens right panel
- [ ] Clicking avatar opens left panel
- [ ] Sign out button calls the action

**Test plan:**
- [ ] Render on any authenticated page
- [ ] Test open/close of both side panels
- [ ] Verify sign out flow

**Open questions:**
- Where does the user's avatar initial come from if `display_name` is null (edge case where profile exists but onboarding incomplete)? (Fallback to email initial)

---

## AUTH-UI-005: Global Footer component

**Phase:** Phase 1 — Auth & Onboarding
**Priority:** P0
**Estimated effort:** Small (1–2 hours)
**Status:** Not started

**User story:**
> As a user,
> I want a consistent footer with legal links and a disclaimer,
> So that the app looks professional and is compliant with non-gambling messaging.

**Context / Why:**
Shown on all pages except standalone pages (per PRD).

**Acceptance criteria:**
- [ ] Component: `src/components/layout/global-footer.tsx`
- [ ] Contains:
  - Gambling disclaimer text ("Not affiliated with BCCI, IPL, or any franchise. Bragg is a free prediction game...")
  - Link to `/privacy`
  - Link to `/terms`
- [ ] Centered, muted text, subtle border-top
- [ ] Responsive: stacks on mobile if needed

**Out of scope:** Privacy and Terms pages (AUTH-UI-008, AUTH-UI-009)

**Dependencies:** FND-006
**Blocks:** None (used by feature pages but pages can render without it if needed)

**PRD references:**
- [Global Footer](../PRD.V2.md#global-footer-shown-on-all-pages-except-standalone-pages-login-onboarding-accept-terms-404-error)

**Technical notes:**
- Server component (no interactivity)
- Uses `<Link>` for internal navigation

**Analytics events:** None
**Unit tests:**
- [ ] Renders disclaimer and both links

**Test plan:**
- [ ] Render on dashboard, gang page, etc. — verify appears
- [ ] Verify not rendered on login, onboarding, accept-terms, 404, 500

**Open questions:** None

---

## AUTH-UI-006: Destructive Action Dialog component

**Phase:** Phase 1 — Auth & Onboarding
**Priority:** P0
**Estimated effort:** Medium (4–6 hours)
**Status:** Not started

**User story:**
> As the developer,
> I want a reusable type-to-confirm dialog component,
> So that all destructive actions (delete gang, delete account, leave gang, remove member) share the same safety pattern.

**Context / Why:**
Per PRD, all destructive actions require type-to-confirm. Centralizing this as a reusable component prevents duplication and inconsistency.

**Acceptance criteria:**
- [ ] Component: `src/components/ui/destructive-action-dialog.tsx`
- [ ] Props:
  - `title: string` — dialog heading
  - `description: string` — warning message explaining consequences
  - `confirmValue: string` — the text the user must type (shown as input placeholder)
  - `confirmLabel: string` — button label (e.g., "Delete Gang", "Leave Gang")
  - `onConfirm: () => Promise<void>` — callback on confirm
  - `open: boolean`, `onOpenChange: (open: boolean) => void`
- [ ] Renders a modal (shadcn `Dialog`) with:
  - Title
  - Warning description (strong/colored text)
  - Text input (placeholder is `confirmValue`)
  - Cancel button (closes dialog)
  - Confirm button (disabled unless typed value EXACTLY matches `confirmValue`, case-sensitive)
- [ ] Loading state on confirm button during action
- [ ] Resets input on close
- [ ] Keyboard: Escape closes, Enter submits (if enabled)
- [ ] Accessible: focus trap, ARIA labels

**Out of scope:** Specific destructive actions (per PRD: delete gang, delete account, etc. — each built in its own story)

**Dependencies:** FND-006
**Blocks:** Any story involving a destructive action

**PRD references:**
- [Destructive Action Confirmation](../PRD.V2.md#destructive-action-confirmation)

**Technical notes:**
- Use shadcn `Dialog` as base
- Focus the input on open for fast typing
- Confirm value comparison is case-sensitive and whitespace-sensitive (trim the input first, then compare)
- Consider making the confirm button red/danger variant

**Analytics events:** None (caller fires events if needed)

**Unit tests:**
- [ ] Renders with given title, description, input
- [ ] Confirm button disabled when input is empty
- [ ] Confirm button disabled when input doesn't match
- [ ] Confirm button enabled when input matches exactly
- [ ] Cancel button closes dialog
- [ ] Confirm triggers `onConfirm`
- [ ] Input resets on close

**Test plan:**
- [ ] Use in a test harness, try all match/mismatch cases
- [ ] Keyboard accessibility check

**Open questions:** None

---

## AUTH-UI-007: Privacy Policy page

**Phase:** Phase 1 — Auth & Onboarding
**Priority:** P1
**Estimated effort:** Small (2–4 hours)
**Status:** Not started

**User story:**
> As a user,
> I want to read the privacy policy,
> So that I know how my data is used.

**Context / Why:**
Legal requirement. Content lives in `docs/privacy-policy.md` — render as a static page.

**Acceptance criteria:**
- [ ] Page: `src/app/privacy/page.tsx`
- [ ] Renders the content of `docs/privacy-policy.md` (either imported at build time as MDX, or statically copied into the component)
- [ ] Includes Global Footer
- [ ] Readable typography, max-width for text readability
- [ ] Mobile-responsive
- [ ] Accessible by unauthenticated users (public route)

**Out of scope:** Writing the policy content (already in `docs/privacy-policy.md`)

**Dependencies:** FND-006, AUTH-UI-005 (footer)
**Blocks:** None (footer links here)

**PRD references:**
- [Privacy Policy Page](../PRD.V2.md#privacy-policy-page-privacy)

**Technical notes:**
- Could use `@next/mdx` to import markdown directly, or hand-code a React component from the markdown content
- Recommendation: hand-code a simple component since content is relatively small and rarely changes

**Analytics events:** None (autocapture handles pageview)
**Unit tests:**
- [ ] Renders title and content sections

**Test plan:**
- [ ] Navigate from footer link
- [ ] Read on mobile and desktop

**Open questions:** None

---

## AUTH-UI-008: Terms & Conditions page

**Phase:** Phase 1 — Auth & Onboarding
**Priority:** P1
**Estimated effort:** Small (2–4 hours)
**Status:** Not started

**User story:**
> As a user,
> I want to read the terms and conditions,
> So that I understand the rules of using the app.

**Context / Why:**
Same pattern as Privacy page. Content lives in `docs/terms-and-conditions.md`.

**Acceptance criteria:**
- [ ] Page: `src/app/terms/page.tsx`
- [ ] Renders the content of `docs/terms-and-conditions.md`
- [ ] Includes Global Footer
- [ ] Readable typography, max-width
- [ ] Mobile-responsive
- [ ] Public route

**Out of scope:** Writing the content

**Dependencies:** FND-006, AUTH-UI-005
**Blocks:** None

**PRD references:**
- [Terms & Conditions Page](../PRD.V2.md#terms--conditions-page-terms)

**Technical notes:** Same as AUTH-UI-007

**Analytics events:** None
**Unit tests:**
- [ ] Renders title and content sections

**Test plan:**
- [ ] Navigate from footer link or from onboarding form
- [ ] Read on mobile and desktop

**Open questions:** None

---

## AUTH-UI-009: Not Found (404) page

**Phase:** Phase 1 — Auth & Onboarding
**Priority:** P1
**Estimated effort:** Small (1–2 hours)
**Status:** Not started

**User story:**
> As a user who hits a broken or nonexistent URL,
> I want to see a friendly 404 page,
> So that I know what happened and can navigate away.

**Context / Why:**
Basic error handling UX.

**Acceptance criteria:**
- [ ] Page: `src/app/not-found.tsx` (Next.js convention)
- [ ] Standalone layout (no nav, no footer — per PRD)
- [ ] Shows:
  - "Page not found" heading
  - Brief copy in Bragg's voice (punchy, not corporate)
  - Link back to `/dashboard` (if authenticated) or `/` (if not)
- [ ] Accessible

**Out of scope:** None

**Dependencies:** FND-006
**Blocks:** None

**PRD references:**
- [Not Found Page (404)](../PRD.V2.md#not-found-page-404)

**Technical notes:**
- Detect auth state to choose which link to show (via `createClient` in a server component)

**Analytics events:**
- `PAGE_NOT_FOUND` (optional custom event)

**Unit tests:**
- [ ] Renders with heading and link

**Test plan:**
- [ ] Visit `/nonexistent-route` — verify 404 shown

**Open questions:** None

---

## AUTH-UI-010: Error (500) page

**Phase:** Phase 1 — Auth & Onboarding
**Priority:** P1
**Estimated effort:** Small (1–2 hours)
**Status:** Not started

**User story:**
> As a user when the app has a server error,
> I want to see a friendly error page with retry/dashboard options,
> So that I'm not stuck.

**Context / Why:**
Next.js provides a global error boundary via `error.tsx`. Wrap it to match brand voice and capture errors in PostHog.

**Acceptance criteria:**
- [ ] Page: `src/app/error.tsx` (client component, Next.js convention)
- [ ] Also `src/app/global-error.tsx` for root-level errors
- [ ] Standalone layout
- [ ] Shows:
  - Generic error message
  - "Retry" button (calls `reset` function from Next.js)
  - "Go to dashboard" link
- [ ] On mount, captures the error in PostHog via `ERROR_BOUNDARY_CAUGHT` event
- [ ] Does not leak stack trace or internal error details to the user
- [ ] Accessible

**Out of scope:** None

**Dependencies:** FND-005, FND-006
**Blocks:** None

**PRD references:**
- [Error Page (500)](../PRD.V2.md#error-page-500)
- [Analytics § Error Reporting](../PRD.V2.md#analytics)

**Technical notes:**
- `error.tsx` must be a client component ("use client")
- `global-error.tsx` must include `<html>` and `<body>` tags (top-level)
- PostHog capture in `useEffect`

**Analytics events:**
- `ERROR_BOUNDARY_CAUGHT` — properties: `{ error_message, error_stack, digest }`

**Unit tests:**
- [ ] Renders with error message and buttons
- [ ] Retry button calls reset
- [ ] PostHog event fires on mount

**Test plan:**
- [ ] Throw an error in a test page, verify error boundary catches and shows UI
- [ ] Verify PostHog receives the event

**Open questions:** None

---

## Summary

Phase 1 delivers the full auth + onboarding experience. After this phase, you can sign in, complete onboarding, see a blank dashboard page, sign out, and all the shared UI components (nav, footer, destructive dialog) are ready for use in later phases.

**Story count:** 17 stories (6 API, 1 middleware, 10 UI)
**Estimated total effort:** ~15–25 working days

**Ship readiness:**
- ✅ Empty dashboard placeholder — user can sign in and see "no gangs yet"
- ✅ Sign out works
- ✅ Cookies/middleware protect routes
- ✅ Terms re-acceptance gate works
- ⏳ Dashboard content comes in Phase 2 (gangs)
