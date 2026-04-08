# PERF-001: PostHog Events + Error Capture

**Phase:** 15 — Analytics & Polish
**Dependencies:** FND-006, all feature stories
**Estimated scope:** Wire up all analytics events across the app, finalize error capture

---

## Description

Wire up all PostHog custom events defined in the PRD across every server action and client interaction. Ensure every error is captured with context. This is a cross-cutting concern that touches all feature code.

---

## Acceptance Criteria

### Server Action Events (via `trackEvent` in `analytics/server.ts`)
- [ ] All auth actions fire their events (magic_link_requested, onboarding_completed, signed_out, account_deleted)
- [ ] All gang actions fire events (gang_created, join_requested, invite_copied, member_approved/rejected/removed/left, gang_deleted)
- [ ] All prediction actions fire events (prediction_submitted with count, predict_page_viewed/revisited)
- [ ] All notification actions fire events (notification_clicked, marked_read, all_marked_read)
- [ ] Rate limit hits fire `rate_limit_hit` with user_id, action, count, window

### Client Events (via `trackEvent` in `analytics/client.ts`)
- [ ] `invite_copied` — when copy button clicked
- [ ] `invite_shared` — when native share used
- [ ] `bell_opened` — when notification panel opens
- [ ] `pick_changed` — when user changes a prediction pick (debounced)

### Error Capture
- [ ] All server action errors captured via `captureError()`
- [ ] Error boundaries log to PostHog
- [ ] Unhandled client errors captured (global error handler)
- [ ] Context included: user ID (if available), page path, action name, stack trace

### User Identity
- [ ] After auth callback: `posthog.identify(userId)` on client
- [ ] Pre-auth events use anonymous ID (PostHog default)
- [ ] On sign out: `posthog.reset()` to clear identity

### Server Action Timing
- [ ] All server actions wrapped with `withTiming()` — fires `server_action_duration` event with action name and duration

---

## Files to Modify

All server action files in `src/lib/actions/` and all client components with trackable interactions.

---

## Technical Notes

### Server-Side Tracking
```typescript
// analytics/server.ts
import { PostHog } from 'posthog-node'

const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  flushAt: 1,
  flushInterval: 0,
})

export function trackEvent(userId: string, event: string, properties?: Record<string, unknown>) {
  posthog.capture({ distinctId: userId, event, properties })
}
```

### Client-Side Tracking
```typescript
// analytics/client.ts
import posthog from 'posthog-js'

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  posthog.capture(event, properties)
}
```

### PostHog Identity Setup
In the auth callback success path, pass user ID to the client. The PostHog provider or a dedicated client component should call `posthog.identify()` once auth is confirmed.

---

## Testing Requirements

- [ ] Verify events fire in PostHog dashboard (manual testing)
- [ ] Unit tests: `withTiming` fires duration event
- [ ] Unit tests: `captureError` sends error with context
