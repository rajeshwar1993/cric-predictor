# FND-005: Middleware (Auth, Onboarding, Terms)

**Phase:** 1 — Foundation
**Dependencies:** FND-002
**Estimated scope:** Next.js middleware with 3 sequential gates

---

## Description

Implement the Next.js middleware that runs on every request and enforces three sequential gates: (1) auth session exists, (2) user has completed onboarding, (3) user has accepted the current terms version. Uses cookie-based checks only — no database queries in middleware for performance.

---

## Acceptance Criteria

- [ ] Middleware runs on all routes except public routes and static assets
- [ ] **Gate 1 — Auth:** If no valid Supabase session cookie → redirect to `/login` with `redirectTo` query param
- [ ] **Gate 2 — Onboarding:** If `bragg_onboarded` cookie is missing → redirect to `/onboarding`
- [ ] **Gate 3 — Terms:** If `bragg_terms_version` cookie's major version < `CURRENT_TERMS_VERSION` major version → redirect to `/accept-terms`
- [ ] Supabase session is refreshed on every request (via middleware client)
- [ ] `redirectTo` param sanitized to relative paths only (prevents open redirect)
- [ ] Public routes excluded: `/`, `/login`, `/auth/callback`, `/join/[code]`, `/privacy`, `/terms`
- [ ] Static assets excluded: `_next/static`, `_next/image`, `favicon.ico`
- [ ] `CURRENT_TERMS_VERSION` exported as a constant (e.g., `"2.0"`)
- [ ] Middleware does NOT make any database queries

---

## Files to Create

```
web-app/src/
├── middleware.ts                    # Main middleware
├── lib/
│   └── constants.ts                # CURRENT_TERMS_VERSION and other app constants
```

---

## Technical Notes

### Middleware Flow
```
Request arrives
  ↓
1. Skip if public route or static asset → next()
  ↓
2. Create middleware Supabase client → refresh session
  ↓
3. Check auth: supabase.auth.getUser()
   No user → redirect to /login?redirectTo={currentPath}
  ↓
4. Check onboarding: cookie "bragg_onboarded" exists?
   Missing → redirect to /onboarding (unless already on /onboarding)
  ↓
5. Check terms: cookie "bragg_terms_version" major version matches?
   Mismatch → redirect to /accept-terms (unless already on /accept-terms)
  ↓
6. next() — allow request through
```

### Route Matcher
```typescript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|auth|join|privacy|terms|api).*)',
  ],
}
```

**Important:** The landing page `/` is public but is NOT excluded by the matcher regex above (since it matches empty string after `/`). Handle it explicitly: if path is exactly `/`, skip auth check.

### Redirect Sanitization
```typescript
function sanitizeRedirect(url: string): string {
  // Only allow relative paths starting with /
  if (!url.startsWith('/') || url.startsWith('//')) return '/dashboard'
  return url
}
```

### Terms Version Comparison
Only compare major version numbers:
```typescript
function getMajorVersion(version: string): number {
  return parseInt(version.split('.')[0], 10)
}

// Major change (2.x → 3.0) → requires re-acceptance
// Minor change (2.0 → 2.1) → no re-acceptance required
```

### Constants (`constants.ts`)
```typescript
export const CURRENT_TERMS_VERSION = '2.0'
export const MAX_GANG_MEMBERS = 20
export const MAX_USER_GANGS = 40
export const PREDICTION_WINDOW_HOURS = 12
export const DEFAULT_DEADLINE_MINS = 45
export const COOKIE_NAMES = {
  ONBOARDED: 'bragg_onboarded',
  TERMS_VERSION: 'bragg_terms_version',
} as const
```

### Cookies Used (read-only in middleware)
| Cookie | Set by | Purpose |
|--------|--------|---------|
| Supabase auth cookies | Supabase SDK | Session management |
| `bragg_onboarded` | Auth callback / onboarding page | Fast onboarding check |
| `bragg_terms_version` | Onboarding / accept-terms page | Fast terms check |

---

## Edge Cases

- User on `/onboarding` should not be redirected to `/onboarding` (infinite loop)
- User on `/accept-terms` should not be redirected to `/accept-terms`
- User on `/join/ABC123` (public route) should NOT be redirected even if unauthenticated
- `redirectTo` must encode properly for URLs with query params
- If `bragg_onboarded` cookie exists but session is invalid → auth gate catches first

---

## Testing Requirements

- [ ] Unit test: `sanitizeRedirect()` rejects absolute URLs, protocol-relative URLs, and non-path strings
- [ ] Unit test: `getMajorVersion()` correctly parses version strings
- [ ] Integration test: middleware redirects unauthenticated requests to `/login`
- [ ] Integration test: middleware passes through public routes without auth
