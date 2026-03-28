# Pending Security Issues

Issues identified during the Application Security audit that are not yet fixed. Ordered by priority.

---

## Medium Priority

### #8 — Member list exposes email addresses
- **File:** `web-app/src/lib/dal/members.ts` (lines 10-15)
- **Issue:** `getMembers()` selects `email` from the profiles join. Any approved group member can see all other members' email addresses.
- **Impact:** PII disclosure. Low sensitivity in a social game context, but violates privacy best practices.
- **Fix:** Remove `email` from the profile select in `getMembers()` and `getPendingRequests()`. Only include it on the admin page where it's needed for member management.

### #9 — Admin can reopen prediction deadline
- **File:** `supabase/migrations/003_rls_policies.sql` (admin_manage_settings policy)
- **Issue:** Admins can set `prediction_deadline` to a future time after it has already passed, effectively reopening predictions. They can then change their own picks and re-lock.
- **Impact:** Game fairness depends on admin honesty. A dishonest admin can cheat.
- **Fix:** Add an RLS check that prevents updating `prediction_deadline` once the match status is `live` or `completed`:
  ```sql
  CREATE POLICY "admin_manage_settings" ON match_group_settings FOR UPDATE USING (
    is_group_admin(match_group_settings.group_id, auth.uid())
    AND (SELECT status FROM matches WHERE id = match_group_settings.match_id) = 'upcoming'
  );
  ```

### #10 — No rate limiting on magic link requests
- **File:** `web-app/src/lib/actions/auth.ts`
- **Issue:** Supabase has a 60-second server-side throttle per email, but no per-IP rate limiting in the app. An attacker can send magic link requests for many different emails to enumerate valid accounts.
- **Impact:** Email enumeration via timing or error message differences.
- **Fix:** Implement per-IP rate limiting using Redis, Upstash, or Vercel KV:
  ```typescript
  const clientIp = headers().get("x-forwarded-for");
  // If > 5 magic link requests from this IP in 5 minutes, reject
  ```
- **Note:** Requires infrastructure (Redis/KV store). Not a quick code fix.

### #11 — Post-onboarding redirect not validated against allowlist
- **File:** `web-app/src/app/auth/callback/route.ts` (line 44), `web-app/src/lib/actions/onboarding.ts` (line 76)
- **Issue:** The `bragg_post_onboard_redirect` cookie stores a URL path used for redirect after onboarding. While httpOnly, the path is not validated against an allowlist. If an attacker sets the cookie (via XSS or MITM), they could redirect the user to a malicious path.
- **Impact:** Open redirect. Requires prior cookie tampering (low exploitability).
- **Fix:** Validate the redirect path in `completeOnboarding()`:
  ```typescript
  const postRedirect = cookieStore.get("bragg_post_onboard_redirect")?.value || "/dashboard";
  // Only allow known safe prefixes
  const safePrefixes = ["/dashboard", "/group/", "/join/"];
  const finalRedirect = safePrefixes.some(p => postRedirect.startsWith(p))
    ? postRedirect
    : "/dashboard";
  redirect(finalRedirect);
  ```

### #12 — Onboarding can be completed multiple times
- **File:** `web-app/src/lib/actions/onboarding.ts`
- **Issue:** No `WHERE onboarding_completed = false` guard on the profile update. A user can call `completeOnboarding()` repeatedly to change their display name after initial onboarding.
- **Impact:** Data integrity — users can change their name without restriction. Low severity but unexpected behavior.
- **Fix:** Add a condition to the update query:
  ```typescript
  const { error, count } = await supabase
    .from("profiles")
    .update({ display_name: ..., onboarding_completed: true, ... })
    .eq("id", user.id)
    .eq("onboarding_completed", false)  // Only update if not yet completed
    .select("id");

  if (!count || count === 0) {
    return { success: false, error: "Profile already completed" };
  }
  ```

---

## Low Priority

### #13 — Invite code not rate-limited
- **File:** `web-app/src/lib/actions/groups.ts` (`joinGroup()`)
- **Issue:** No per-IP rate limiting on invite code attempts. An attacker could brute-force codes.
- **Impact:** Invite code enumeration. Very low risk — 12-char hex codes have 48-bit entropy (281 trillion combinations).
- **Fix:** Add per-IP rate limiting (requires Redis/KV). Not urgent given the entropy.

### #14 — Analytics events include raw UUIDs
- **File:** All action files in `web-app/src/lib/actions/`
- **Issue:** PostHog events contain plaintext `group_id`, `user_id`, `scenario_id`. If PostHog is breached, activity can be correlated to specific users and groups.
- **Impact:** Privacy concern. Low severity — PostHog is a trusted third party.
- **Fix:** Hash IDs before sending to analytics:
  ```typescript
  captureServerEvent(user.id, EVENT, {
    group_id: hashForAnalytics(groupId),
    target_user_id: hashForAnalytics(userId),
  });
  ```
- **Note:** Reduces analytics debugging capability. Trade-off between privacy and observability.

---

## Already Fixed (This Session)

| # | Issue | Fix |
|---|-------|-----|
| 1 | Edge function has no auth | Added Bearer token check in `Deno.serve` handler |
| 2 | Middleware `getUser()` not try-caught | Wrapped in try-catch, fails closed |
| 3 | Timezone deadline calculation | Centralized in `prediction_deadline()` DB function with documentation |
| 4 | Cross-group scenario manipulation | Added `group_id` filter to all scenario DAL operations |
| 5 | No XSS sanitization on stored content | Added `safeText()` validator rejecting `<` and `>` in all user inputs |
| 6 | Mass assignment in `enterResults()` | Changed parameter from `Record<string, unknown>` to typed `Omit<EnterResultInput, "matchId">` |
| 7 | API data not validated before DB write | Added `safeName()` + strict `toCode()` in cron — rejects invalid names/teams |
