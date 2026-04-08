# FND-006: Core Utilities (Date, Rate Limit, Helpers, Analytics)

**Phase:** 1 — Foundation
**Dependencies:** FND-002
**Estimated scope:** Date formatting, rate limiting, helper functions, PostHog setup

---

## Description

Implement shared utility functions used across the app: date/time formatting (client-side), per-user rate limiting (server-side), common helpers (avatar initials, etc.), and PostHog analytics initialization with event constants.

---

## Acceptance Criteria

### Date Formatting (`src/lib/format-date.ts`)
- [ ] `formatMatchTime(date)` → "Sat, 28 Mar . 7:30 PM IST" or "Today . 7:30 PM IST" or "Tomorrow . 7:30 PM IST"
- [ ] `formatDeadline(date)` → "6:45 PM IST" (time only with timezone)
- [ ] `formatTimeAgo(date)` → "Just now", "2m ago", "2h ago", "3d ago", or falls back to `formatDate()`
- [ ] `formatDate(date)` → "28 Mar 2026"
- [ ] All formatters use `Intl.DateTimeFormat` with `timeZoneName: 'short'`
- [ ] "Today" / "Tomorrow" detection uses user's local calendar date
- [ ] 12h/24h format follows user's system locale (no hardcoding)
- [ ] Accepts both `Date` objects and ISO strings

### Rate Limiting (`src/lib/rate-limit.ts`)
- [ ] `rateLimit(userId, action, { max, windowSeconds })` → `{ allowed: boolean; remaining: number }`
- [ ] Uses `v2_rate_limits` table for persistence (server-only)
- [ ] Window-based: counts requests within a rolling time window
- [ ] Returns `allowed: false` when limit exceeded
- [ ] Fires `RATE_LIMIT_HIT` analytics event when exceeded

### Common Helpers (`src/lib/utils.ts`)
- [ ] `cn()` — class name merger (already from shadcn/ui init)
- [ ] `getAvatarInitials(displayName)` → "RK" (first letter of first two words, uppercase)
- [ ] `generateInviteMessage(gangName, inviterName, inviteCode, appUrl)` → share message string
- [ ] `truncate(str, maxLength)` → truncated string with ellipsis
- [ ] `pluralize(count, singular, plural?)` → "1 member" / "5 members"

### PostHog Analytics Setup
- [ ] `src/lib/analytics/client.ts` — `trackEvent()` for client components
- [ ] `src/lib/analytics/server.ts` — `trackEvent()` for server actions
- [ ] `src/lib/analytics/events.ts` — all event name constants (as const object)
- [ ] `src/lib/analytics/error-handler.ts` — `captureError()` utility
- [ ] `src/lib/analytics/timing.ts` — `withTiming()` wrapper for server actions
- [ ] PostHog provider component for client-side initialization

---

## Files to Create

```
web-app/src/lib/
├── format-date.ts                  # Date formatting (client-side helpers)
├── rate-limit.ts                   # Per-user rate limiting (server-side)
├── utils.ts                        # UPDATE — add helper functions
├── analytics/
│   ├── events.ts                   # Event name constants
│   ├── client.ts                   # Client-side trackEvent()
│   ├── server.ts                   # Server-side trackEvent()
│   ├── error-handler.ts            # Error capture
│   └── timing.ts                   # withTiming() wrapper
web-app/src/components/
└── analytics/
    └── posthog-provider.tsx        # PostHog React provider (client component)
```

---

## Technical Notes

### Date Formatting

These are **Client Component helpers** — they depend on the browser's timezone. Server Components pass raw ISO strings as props.

```typescript
// formatTimeAgo thresholds:
// < 1 min → "Just now"
// < 60 min → "Xm ago"
// < 24h → "Xh ago"
// < 7d → "Xd ago"
// older → formatDate()
```

### Rate Limiting

```typescript
'use server' // or import 'server-only'

import { createServerClient } from '@/lib/supabase/server'

export async function rateLimit(
  userId: string,
  action: string,
  { max, windowSeconds }: { max: number; windowSeconds: number }
): Promise<{ allowed: boolean; remaining: number }> {
  const supabase = await createServerClient()
  const windowStart = new Date(
    Math.floor(Date.now() / (windowSeconds * 1000)) * (windowSeconds * 1000)
  )

  // Upsert rate limit counter
  const { data } = await supabase
    .from('v2_rate_limits')
    .upsert(
      { user_id: userId, action, window_start: windowStart.toISOString(), count: 1 },
      { onConflict: 'user_id,action,window_start', count: 'exact' }
    )
    .select('count')
    .single()

  // If row already existed, increment
  // ... (use RPC or raw SQL for atomic increment)

  const count = data?.count ?? 1
  return {
    allowed: count <= max,
    remaining: Math.max(0, max - count),
  }
}
```

**Note:** The rate limit implementation should use an atomic increment (not read-then-write) to prevent race conditions. Consider using a Supabase RPC or raw SQL query for the increment.

### Analytics Event Constants (`events.ts`)
```typescript
export const ANALYTICS_EVENTS = {
  // Auth
  MAGIC_LINK_REQUESTED: 'magic_link_requested',
  MAGIC_LINK_RESENT: 'magic_link_resent',
  AUTH_CALLBACK_SUCCESS: 'auth_callback_success',
  AUTH_CALLBACK_FAILURE: 'auth_callback_failure',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  SIGNED_OUT: 'signed_out',
  ACCOUNT_DELETED: 'account_deleted',

  // Gangs
  GANG_CREATED: 'gang_created',
  JOIN_REQUESTED: 'join_requested',
  INVITE_COPIED: 'invite_copied',
  INVITE_SHARED: 'invite_shared',
  MEMBER_APPROVED: 'member_approved',
  MEMBER_REJECTED: 'member_rejected',
  MEMBER_REMOVED: 'member_removed',
  MEMBER_LEFT: 'member_left',
  GANG_DELETED: 'gang_deleted',

  // Predictions
  PREDICTION_SUBMITTED: 'prediction_submitted',
  PICK_CHANGED: 'pick_changed',
  PREDICT_PAGE_VIEWED: 'predict_page_viewed',
  PREDICT_PAGE_REVISITED: 'predict_page_revisited',

  // Notifications
  BELL_OPENED: 'bell_opened',
  NOTIFICATION_CLICKED: 'notification_clicked',
  NOTIFICATION_MARKED_READ: 'notification_marked_read',
  ALL_NOTIFICATIONS_MARKED_READ: 'all_notifications_marked_read',

  // Performance
  WEB_VITALS: 'web_vitals',
  PAGE_LOAD: 'page_load',
  SERVER_ACTION_DURATION: 'server_action_duration',

  // Security
  RATE_LIMIT_HIT: 'rate_limit_hit',

  // Errors
  ERROR_LOGGED: 'error_logged',
} as const
```

### PostHog Provider
```typescript
'use client'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      capture_pageview: true,
      capture_pageleave: true,
      // Session recording OFF by default — gated behind feature flag
      disable_session_recording: true,
    })
  }, [])

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
```

### withTiming Wrapper
```typescript
export async function withTiming<T>(
  actionName: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now()
  try {
    return await fn()
  } finally {
    const duration = Date.now() - start
    // Fire analytics event with duration
  }
}
```

### Dependencies to Install
```bash
npm install posthog-js posthog-node
```

---

## Testing Requirements

- [ ] Unit tests for `formatMatchTime` — handles today, tomorrow, future dates
- [ ] Unit tests for `formatTimeAgo` — handles just now, minutes, hours, days
- [ ] Unit tests for `getAvatarInitials` — single word, two words, empty string
- [ ] Unit tests for `generateInviteMessage` — produces expected message format
- [ ] Unit tests for `rateLimit` — allowed when under limit, denied when over
- [ ] Unit tests for `sanitizeRedirect` (from FND-005, can be tested here)
