# Feature: FCM Push Notifications

## What We're Building

A web push notification system powered by Firebase Cloud Messaging (FCM) that mirrors the existing in-app notification system. Every notification that currently appears in the bell panel should also be delivered as a push notification to users who have granted permission — even when Bragg is not open in the browser.

### Why

In-app notifications only reach users who are actively on the site. For time-sensitive events like prediction deadlines and match results, users need to be reached when they're away. Push notifications drive re-engagement and create urgency around deadlines — which directly impacts prediction participation rates.

### How It Relates to Existing System

The in-app notification system (`v2_notifications` table, Supabase Realtime, bell panel) stays unchanged. FCM push is an additional delivery channel — every INSERT into `v2_notifications` should also trigger a push notification to the user's registered devices. The in-app system remains the source of truth for notification state (read/unread, history).

## Key Requirements

### Notification Types to Push

All 8 existing notification types should be delivered as push notifications:

| Type | Push Title | Push Body (example) | Click Action |
|------|-----------|---------------------|--------------|
| `deadline_reminder` | "Predictions closing soon" | "Predictions close in 1 hour for MI vs CSK" | `/group/{gangId}/predict/{fixtureId}` |
| `results_available` | "Match results are in" | "Results are ready for MI vs CSK — check your score!" | `/group/{gangId}/match/{fixtureId}` |
| `join_request` | "New join request" | "{displayName} wants to join {gangName}" | `/group/{gangId}` |
| `join_approved` | "You're in!" | "Your request to join {gangName} was approved" | `/group/{gangId}` |
| `join_rejected` | "Request declined" | "Your request to join {gangName} was declined" | `/group/{gangId}` |
| `new_member` | "New member joined" | "{displayName} joined {gangName}" | `/group/{gangId}` |
| `gang_deleted` | "Gang deleted" | "{gangName} has been deleted" | `/dashboard` |
| `admin_promoted` | "You're now admin" | "You've been promoted to admin of {gangName}" | `/group/{gangId}` |

### FCM Token Management

- **Token storage:** New table `v2_push_tokens` to store FCM device tokens per user. A user can have multiple tokens (multiple browsers/devices).
- **Token registration:** After the user grants notification permission, the client sends the FCM token to the server for storage.
- **Token refresh:** FCM tokens can rotate. The client should detect token changes and update the stored token.
- **Token cleanup:** Remove stale tokens when FCM returns `messaging/registration-token-not-registered` or equivalent errors. Tokens should also be removed when a user explicitly revokes permission or deletes their account.
- **Deduplication:** Same token should not be stored twice for the same user. Unique constraint on `(user_id, token)`.

#### `v2_push_tokens` Table Schema

```sql
CREATE TABLE v2_push_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES v2_profiles(id) ON DELETE CASCADE,
  token       TEXT        NOT NULL,
  device_label TEXT,      -- optional: browser/device identifier for user's settings UI
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

CREATE INDEX idx_push_tokens_user ON v2_push_tokens(user_id);
```

- RLS: Users can only read/insert/delete their own tokens. No UPDATE needed (delete + re-insert on refresh).

### Service Worker

- A Firebase Messaging service worker (`firebase-messaging-sw.js`) must be registered in the Next.js app.
- The service worker handles background push events (when the app is not in the foreground).
- Foreground pushes should be suppressed if the user is actively viewing the app (the in-app bell already handles this). Alternatively, show a brief toast — but never double-notify in both the bell panel and a browser notification simultaneously.
- Click handling: clicking a push notification opens or focuses the Bragg tab and navigates to the click action URL.

### Permission Flow

- **Prompt trigger:** Do not prompt on first visit. Prompt after the user has completed a meaningful action — e.g., after joining their first gang or submitting their first prediction. Show a soft prompt (in-app UI) before triggering the browser's native permission dialog.
- **Soft prompt UI:** A dismissible banner or card explaining the value ("Get notified when predictions are closing or results drop"). Two buttons: "Enable notifications" (triggers browser prompt) and "Not now" (dismisses, sets a cooldown).
- **Cooldown:** If the user dismisses the soft prompt, don't re-show for 7 days. Store dismissal timestamp in `localStorage`.
- **Denied state:** If the browser permission is `denied`, do not show the soft prompt. Optionally show a hint in Settings explaining how to re-enable via browser settings.
- **Settings toggle:** Users should be able to disable push notifications from their Bragg profile/settings page, even if browser permission is still granted. This controls the server-side delivery — toggling off should delete their push tokens.

### Push Delivery Architecture

Two viable approaches — choose one during implementation:

#### Option A: Supabase Database Webhook + Edge Function

1. A Supabase Database Webhook fires on every INSERT into `v2_notifications`.
2. The webhook calls a Supabase Edge Function (`send-push-notification`).
3. The Edge Function looks up the user's FCM tokens from `v2_push_tokens`.
4. The Edge Function calls the FCM HTTP v1 API (`https://fcm.googleapis.com/v1/projects/{project}/messages:send`) with a Google service account.
5. On token errors, the Edge Function deletes the stale token from `v2_push_tokens`.

#### Option B: Postgres Trigger + `pg_net`

1. A Postgres `AFTER INSERT` trigger on `v2_notifications` calls `pg_net` to invoke the Edge Function.
2. Same Edge Function logic as Option A.

**Recommendation:** Option A (Database Webhook) is simpler to debug, doesn't add trigger overhead, and can be paused/retried via the Supabase dashboard.

### Firebase Project Setup

- A Firebase project is required for FCM credentials.
- **Client-side:** Firebase config (API key, project ID, messaging sender ID, app ID) goes in environment variables. These are public values.
- **Server-side:** A Google service account JSON (with `firebase.messaging` permissions) is stored as a Supabase Edge Function secret. Used to mint OAuth2 tokens for the FCM HTTP v1 API.
- The `web-app` must include a `firebase-messaging-sw.js` in the `public/` directory.
- A VAPID key is generated in the Firebase console and used client-side for `getToken()`.

### Analytics

- `PUSH_PERMISSION_PROMPTED` — soft prompt shown to user
- `PUSH_PERMISSION_GRANTED` — user granted browser permission
- `PUSH_PERMISSION_DENIED` — user denied browser permission
- `PUSH_PERMISSION_DISMISSED` — user clicked "Not now" on soft prompt
- `PUSH_NOTIFICATION_SENT` — server successfully sent a push (log in Edge Function)
- `PUSH_NOTIFICATION_CLICKED` — user clicked a push notification (log in service worker)
- `PUSH_NOTIFICATION_DISABLED` — user disabled push from Bragg settings

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| User has no push tokens registered | Skip push delivery silently, in-app notification still created |
| FCM token is stale/invalid | Delete token from `v2_push_tokens`, skip that device |
| User has multiple devices | Send push to all registered tokens |
| User is actively on the app (foreground) | Suppress browser notification (in-app bell handles it) OR show a toast instead |
| Browser doesn't support Push API | Don't show permission prompt. No error. |
| User deletes account | `ON DELETE CASCADE` removes all tokens |
| User leaves/is removed from gang | They may still receive the notification (already inserted). This is acceptable — the notification message is still meaningful. |
| Edge Function fails | Log error. In-app notification still exists. Push is best-effort — no retry queue for v1. |
| Rate limiting by FCM | FCM allows ~1000 messages/sec per project. Not a concern at current scale. |
| Multiple tabs open | Service worker deduplicates — only one notification shown per push event |
| Notification permission reset by browser | Next `getToken()` call will fail. Client detects and removes stored token. |

## Key Decisions to Make

These need discussion before implementation:

1. **Foreground behavior:** Suppress push entirely when app is open, or show a toast? (Recommendation: suppress — the bell already handles it.)
2. **Granular notification preferences:** Should users be able to opt out of specific notification types for push (e.g., "push me deadlines but not join requests")? (Recommendation: not for v1 — all-or-nothing toggle. Granular control in v2.)
3. **Batch vs. individual push:** For `results_available` where many users get notified at once, should pushes be batched via FCM's batch API? (Recommendation: yes, use batch sending in the Edge Function for `results_available` and `deadline_reminder` types.)
4. **iOS PWA support:** Safari on iOS supports web push as of iOS 16.4, but requires the app to be added to home screen. Should we guide users to "Add to Home Screen"? (Recommendation: nice-to-have, not blocking for v1.)

## Out of Scope (v2)

- Per-notification-type push preferences (granular opt-in/opt-out)
- Email notifications
- Quiet hours / Do Not Disturb scheduling
- Push notification history (separate from in-app history)
- Rich media in push notifications (images, action buttons)
- Retry queue for failed push deliveries
- Native mobile app (iOS/Android) push — this is web push only
- "Add to Home Screen" prompts for iOS PWA push support
- Push notification A/B testing (message variants)

## Implementation Notes

### Client-Side Dependencies

- `firebase` npm package (modular imports: `firebase/app`, `firebase/messaging`)
- Service worker: `firebase-messaging-sw.js` using compat SDK or importScripts

### Server-Side Dependencies

- `google-auth-library` (for minting OAuth2 tokens from service account in the Edge Function)
- Or manually implement JWT → access token exchange for a lighter dependency

### Environment Variables

**Web App (public, in `.env.local`):**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`

**Supabase Edge Function (secrets):**
- `FIREBASE_SERVICE_ACCOUNT_JSON` — the full service account JSON, stored as a secret

### Files to Create/Modify

- `web-app/public/firebase-messaging-sw.js` — service worker
- `web-app/src/lib/firebase.ts` — Firebase client init
- `web-app/src/hooks/use-push-notifications.ts` — permission flow, token management
- `web-app/src/components/push-prompt.tsx` — soft prompt banner/card
- `web-app/src/lib/actions/push-tokens.ts` — server actions for token CRUD
- `web-app/src/lib/dal/push-tokens.ts` — DAL functions for token queries
- `supabase/supabase/migrations/YYYYMMDD_push_tokens.sql` — new table + RLS
- `supabase/supabase/functions/send-push-notification/index.ts` — Edge Function
- Supabase Dashboard: Database Webhook on `v2_notifications` INSERT
