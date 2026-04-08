# AUTH-001: Login Page + Magic Link

**Phase:** 4 — Auth Flow
**Dependencies:** LAY-001, FND-005, FND-006
**Estimated scope:** Login page with email input, magic link sending, confirmation state

---

## Description

Build the login page (`/login`) with magic link authentication. User enters their email, receives a magic link, and sees a confirmation state. Handles resend cooldown, error states, and redirect support.

---

## Acceptance Criteria

### Login Page (`src/app/(public)/login/page.tsx`)
- [ ] Standalone page (no nav bar, no footer)
- [ ] App logo + "BRAGG" heading centered at top
- [ ] Email input with label "Email address"
- [ ] "Send magic link" primary button
- [ ] Disclaimer text below form (same as footer disclaimer)
- [ ] Supports `?redirectTo=` query parameter (preserved through auth flow)
- [ ] Mobile-first layout, centered vertically on desktop

### Magic Link Flow
- [ ] Calls `signInWithOtp({ email })` via server action
- [ ] On success: transitions to confirmation state
- [ ] Confirmation state shows:
  - "Check your email" heading
  - "We sent a magic link to **{email}**" message
  - "Resend magic link" button with 60-second cooldown
  - "Use a different email" link to go back to input state
- [ ] Error handling:
  - Invalid email format → inline validation error
  - Rate limited → "Too many attempts. Please try again in X seconds."
  - Network error → generic error toast
  - Expired/failed magic link → error message with retry option

### Server Action (`src/lib/actions/auth.ts`)
- [ ] `sendMagicLink(email: string, redirectTo?: string)` → `ActionResult`
- [ ] Validates email format (Zod)
- [ ] Rate limit: uses Supabase's built-in email rate limiting
- [ ] Constructs callback URL: `{APP_URL}/auth/callback?redirectTo={redirectTo}`
- [ ] Fires `MAGIC_LINK_REQUESTED` analytics event

### Validation
- [ ] Client-side: email format check (immediate feedback)
- [ ] Server-side: Zod email validation (source of truth)
- [ ] Empty email → "Email is required"
- [ ] Invalid format → "Please enter a valid email address"

---

## Files to Create

```
web-app/src/
├── app/
│   └── (public)/
│       └── login/
│           └── page.tsx
├── components/
│   └── auth/
│       ├── login-form.tsx          # Client Component (form + states)
│       └── login-form.stories.tsx
├── lib/
│   └── actions/
│       └── auth.ts                 # Server actions for auth
```

---

## Technical Notes

### Login Form States
```
State 1: EMAIL_INPUT (default)
  → user enters email, clicks submit
  → transitions to SENDING

State 2: SENDING
  → shows loading spinner on button
  → on success → CONFIRMATION
  → on error → EMAIL_INPUT with error

State 3: CONFIRMATION
  → shows "check your email" message
  → resend button with countdown
  → "use different email" → EMAIL_INPUT
```

### Server Action
```typescript
'use server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const emailSchema = z.string().email('Please enter a valid email address')

export async function sendMagicLink(email: string, redirectTo?: string): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(email)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const supabase = await createServerClient()
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
  const params = new URLSearchParams()
  if (redirectTo) params.set('redirectTo', redirectTo)

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo: `${callbackUrl}?${params.toString()}`,
    },
  })

  if (error) {
    if (error.status === 429) return { success: false, error: 'Too many attempts. Please try again later.' }
    return { success: false, error: 'Failed to send magic link. Please try again.' }
  }

  return { success: true }
}
```

### Resend Cooldown
Use `useState` with `useEffect` and `setInterval` for a 60-second countdown timer. Display remaining seconds on the button: "Resend in 45s".

### Design
- Background: `#111111`
- Form card: `#1A1A1A` bg, `#333333` border, 16px radius, 24px padding
- Logo prominent at top, uppercase "BRAGG" in Space Grotesk 700
- Centered layout, max-width 400px

### Dependencies
```bash
npm install zod
```

---

## Storybook Requirements

### LoginForm Stories
- `Default` — email input state
- `Sending` — loading state
- `Confirmation` — check your email state
- `ResendCooldown` — countdown visible
- `Error` — inline validation error
- `RateLimited` — too many attempts message
