# Bragg — Architecture Document

> Reference this document during development for all architecture decisions. It covers rendering strategy, data flow, component boundaries, state management, and patterns that apply across all 94 stories.

---

## 1. System Overview

```
                    +------------------+
                    |     Vercel       |
                    |   Next.js 16     |
                    |   App Router     |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
     +--------v--------+          +--------v--------+
     | Server Actions   |          | React Server    |
     | (mutations)      |          | Components      |
     | src/lib/actions/  |          | (reads via DAL) |
     +--------+---------+          +--------+--------+
              |                             |
              +-------+-----+------+--------+
                      |     |      |
               +------v-+ +-v----+ +v-----------+
               |Supabase| |Post  | |Supabase    |
               |Postgres| |Hog   | |Realtime    |
               |+ RLS   | |      | |(notif only)|
               +---+----+ +------+ +------------+
                   |
          +--------+--------+
          |                 |
   +------v------+  +------v------+
   | Edge Funcs  |  | pg_cron     |
   | (Deno)      |  | (DB-only    |
   | sync, poll  |  |  jobs)      |
   +------+------+  +-------------+
          |
   +------v------+
   | Sportmonks  |
   | Cricket API |
   +-------------+
```

---

## 2. Rendering Strategy — Server vs Client

### Decision Tree

```
Is this component interactive (click handlers, forms, state, effects)?
  YES → Client Component ('use client')
  NO  → Does it need browser APIs (window, navigator, localStorage)?
    YES → Client Component
    NO  → Server Component (default)
```

### Component Boundaries

| Layer | Rendering | Why |
|-------|-----------|-----|
| **Pages** (`page.tsx`) | Server | Fetch data, pass to children |
| **Layouts** (`layout.tsx`) | Server | Static shell, no re-render on navigation |
| **Data sections** (match list, leaderboard table) | Server | Fetch and render on server, stream in |
| **Interactive forms** (predict form, create gang) | Client | User input, local state, submit handlers |
| **Real-time components** (notification bell, live scorecard) | Client | `useEffect` for polling/subscriptions |
| **Nav bar wrapper** | Server | Fetches user profile |
| **Nav bar interactive parts** (bell, menu panels) | Client | Sheet open/close, click handlers |
| **Static content** (footer, empty states, error pages) | Server | No interactivity |

### Pattern: Server Wrapper + Client Island

Most pages follow this pattern:

```tsx
// page.tsx (Server Component — fetches data)
export default async function GangPage({ params }) {
  const gang = await getGangDetails(params.groupId)
  const fixtures = await getUpcomingFixtures(params.groupId)
  return (
    <PageWrapper>
      <GangHeader gang={gang} />                    {/* Server */}
      <Suspense fallback={<MatchListSkeleton />}>
        <UpcomingMatches fixtures={fixtures} />      {/* Server */}
      </Suspense>
      <LiveMatchesSection gangId={gang.id} />        {/* Client — polls */}
      <MemberList members={gang.members} />          {/* Server */}
    </PageWrapper>
  )
}
```

```tsx
// LiveMatchesSection.tsx (Client Component — needs polling)
'use client'
export function LiveMatchesSection({ gangId }: { gangId: string }) {
  const { data, isLoading } = useLiveScores(gangId)  // custom hook with setInterval
  if (isLoading) return <LiveMatchSkeleton />
  return <LiveScorecard data={data} />
}
```

### Rules

1. **Default to Server Components.** Only add `'use client'` when you need interactivity, browser APIs, or React hooks.
2. **Push client boundaries down.** Don't make a whole page client — make the smallest interactive piece client.
3. **Never fetch data in Client Components.** Pass data as props from Server Components, or use server actions for mutations.
4. **Exception: real-time data.** Live scores and notification subscriptions need client-side fetching (polling or Supabase Realtime).

---

## 3. Folder Structure

```
web-app-2/
├── src/
│   ├── app/                          # Routes (App Router)
│   │   ├── layout.tsx                # Root layout (fonts, PostHog provider, dark mode)
│   │   ├── page.tsx                  # Landing page (/)
│   │   ├── not-found.tsx             # 404
│   │   ├── error.tsx                 # Global error boundary
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts          # Auth callback (route handler, not page)
│   │   ├── onboarding/
│   │   │   └── page.tsx
│   │   ├── accept-terms/
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── join/
│   │   │   └── [code]/
│   │   │       └── page.tsx
│   │   ├── group/
│   │   │   └── [groupId]/
│   │   │       ├── page.tsx          # Gang page
│   │   │       ├── predict/
│   │   │       │   └── [fixtureId]/
│   │   │       │       └── page.tsx
│   │   │       ├── match/
│   │   │       │   └── [fixtureId]/
│   │   │       │       └── page.tsx
│   │   │       ├── standings/
│   │   │       │   └── page.tsx
│   │   │       └── settings/
│   │   │           └── page.tsx
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   ├── privacy/
│   │   │   └── page.tsx
│   │   └── terms/
│   │       └── page.tsx
│   │
│   ├── components/                   # Reusable UI
│   │   ├── ui/                       # shadcn/ui primitives (Button, Card, Input, etc.)
│   │   ├── layout/                   # Shared layout (NavBar, Footer, PageWrapper, SidePanel)
│   │   ├── auth/                     # Login form, onboarding form, terms form
│   │   ├── gangs/                    # Gang card, member list, invite share, settings
│   │   ├── matches/                  # Match card, live scorecard, upcoming section
│   │   ├── predictions/              # Scenario card, input types, prediction form
│   │   ├── leaderboards/             # Leaderboard table, prediction reveal, standings
│   │   ├── notifications/            # Notification bell, item, panel
│   │   └── analytics/                # WebVitalsReporter
│   │
│   ├── lib/                          # Non-UI logic
│   │   ├── supabase/                 # Supabase clients
│   │   │   ├── server.ts             # Server Component client (reads cookies, RLS)
│   │   │   ├── client.ts             # Browser client
│   │   │   ├── middleware.ts          # Middleware client (refreshes session)
│   │   │   └── service-role.ts        # Service role (server-only + ESLint restricted)
│   │   ├── actions/                   # Server actions (mutations)
│   │   │   ├── auth.ts
│   │   │   ├── gangs.ts
│   │   │   ├── predictions.ts
│   │   │   ├── notifications.ts
│   │   │   └── profile.ts
│   │   ├── dal/                       # Data Access Layer (reads)
│   │   │   ├── gangs.ts
│   │   │   ├── fixtures.ts
│   │   │   ├── predictions.ts
│   │   │   ├── leaderboards.ts
│   │   │   └── notifications.ts
│   │   ├── analytics/                 # PostHog helpers
│   │   │   ├── events.ts             # Event name constants (as const)
│   │   │   ├── client.ts             # trackEvent() for client
│   │   │   ├── server.ts             # trackEvent() for server actions
│   │   │   ├── error-handler.ts      # Error capture
│   │   │   └── timing.ts             # withTiming() wrapper
│   │   ├── utils.ts                   # Shared helpers (getAvatarInitials, formatTimeAgo, etc.)
│   │   ├── env.ts                     # Environment variable validation
│   │   └── rate-limit.ts             # Per-user rate limiting
│   │
│   ├── hooks/                         # Custom React hooks
│   │   ├── use-live-scores.ts         # Polls v2_fixture_live_scores
│   │   └── use-notifications.ts       # Supabase Realtime subscription
│   │
│   ├── types/                         # TypeScript types
│   │   ├── database.ts               # Auto-generated from Supabase schema
│   │   └── index.ts                   # App-specific types
│   │
│   └── middleware.ts                  # Auth + onboarding + terms gate
│
├── e2e/                               # Playwright E2E tests
├── .storybook/                        # Storybook config
├── public/                            # Static assets
├── .nvmrc                             # Node 20
└── package.json
```

### File Colocation Rules

- **Stories live next to components:** `Button.tsx` → `Button.stories.tsx`
- **Tests live next to source:** `gangs.ts` → `gangs.test.ts`
- **Mock data for stories:** `Button.mocks.ts` (or inline for trivial cases)
- **One component per file.** No multi-export component files.
- **Pages are thin shells.** Fetch data, compose components, return JSX. No business logic in `page.tsx`.

---

## 4. Data Fetching Patterns

### Which Supabase Client Where

| Context | Client | File | Auth | RLS |
|---------|--------|------|------|-----|
| Server Component (reading data) | `createServerClient()` | `server.ts` | Reads cookies → user session | Yes, as user |
| Client Component (browser) | `createBrowserClient()` | `client.ts` | Browser cookies | Yes, as user |
| Server Action (mutation) | `createServerClient()` | `server.ts` | Reads cookies → user session | Yes, as user |
| Server Action (elevated) | `createServiceRoleClient()` | `service-role.ts` | Service role key | **Bypasses RLS** |
| Middleware | `createMiddlewareClient()` | `middleware.ts` | Refreshes session cookies | N/A |
| Edge Function (cron) | Service role (Deno) | Inline | Service role key | **Bypasses RLS** |

### DAL Pattern (Data Access Layer)

All reads go through DAL functions in `src/lib/dal/`. Each DAL function:
1. Creates a server Supabase client
2. Runs a typed query
3. Returns typed data (or throws)

```tsx
// src/lib/dal/gangs.ts
import { createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

export async function getGangDetails(gangId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('v2_gangs')
    .select(`
      *,
      v2_gang_members(*, v2_profiles(display_name, email)),
      v2_gang_league_seasons(prediction_deadline_mins)
    `)
    .eq('id', gangId)
    .eq('is_deleted', false)
    .single()

  if (error) throw error
  return data
}
```

```tsx
// src/app/group/[groupId]/page.tsx (Server Component)
import { getGangDetails } from '@/lib/dal/gangs'

export default async function GangPage({ params }) {
  const gang = await getGangDetails(params.groupId)
  // ... render
}
```

### Server Action Pattern (Mutations)

All writes go through server actions in `src/lib/actions/`. Each action:
1. Validates input (zod or manual)
2. Authenticates the user
3. Checks rate limit
4. Calls DAL or Supabase directly
5. Fires analytics event
6. Revalidates affected paths
7. Returns `{ success, error? }`

```tsx
// src/lib/actions/predictions.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { trackEvent } from '@/lib/analytics/server'
import { withTiming } from '@/lib/analytics/timing'
import { revalidatePath } from 'next/cache'

export async function submitPredictions(
  gangId: string,
  fixtureId: string,
  picks: Array<{ scenarioId: string; value: string }>
) {
  return withTiming('submitPredictions', async () => {
    const supabase = await createServerClient()

    // 1. Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // 2. Rate limit
    const rl = await rateLimit(user.id, 'submit_predictions', { max: 60, windowSeconds: 3600 })
    if (!rl.allowed) return { success: false, error: 'Too many requests. Try again later.' }

    // 3. Validate membership, window, fixture status
    // ... (business logic)

    // 4. Upsert predictions
    const { error } = await supabase.from('v2_predictions').upsert(/* ... */)
    if (error) return { success: false, error: 'Failed to save predictions' }

    // 5. Analytics
    await trackEvent('PREDICTION_SUBMITTED', { gang_id: gangId, fixture_id: fixtureId, count: picks.length })

    // 6. Revalidate
    revalidatePath(`/group/${gangId}`)
    revalidatePath(`/group/${gangId}/predict/${fixtureId}`)

    return { success: true }
  })
}
```

---

## 5. Component Architecture

### Page Composition Pattern

Pages are thin Server Component shells that:
1. Receive route params
2. Fetch data via DAL
3. Compose section components
4. Wrap interactive sections in `<Suspense>`

```
Page (Server)
├── PageWrapper (Server — max-width, padding)
│   ├── SectionA (Server — static data)
│   ├── Suspense fallback={<SectionBSkeleton />}
│   │   └── SectionB (Server — async data fetch)
│   ├── InteractiveSection (Client — needs state/effects)
│   └── SectionC (Server)
```

### Section → Component Hierarchy

```
GangPage (page.tsx — Server, thin shell)
├── GangHeader (Server — gang name, member count, invite link)
│   ├── InviteShareButton (Client — clipboard API, share API)
│   └── AdminSettingsLink (Server — conditional render)
├── PendingInviteBanner (Server — shown if user has pending requests)
├── Suspense fallback={<MatchListSkeleton />}
│   └── UpcomingMatches (Server — fetches fixtures)
│       └── MatchCard (Server — per match)
│           ├── TeamNames (Server)
│           ├── MatchTime (Client — relative time, countdown)
│           └── PredictionStatusBadge (Server)
├── LiveMatchesSection (Client — polls every 15s)
│   └── LiveScorecard (Client)
│       ├── ScoreDisplay (Client — animated counter)
│       ├── BatsmenInfo (Client)
│       └── Last6Balls (Client — colored pills)
├── RecentResults (Server — fetches resolved fixtures)
│   └── ResultCard (Server)
├── MemberList (Server — fetches members + standings)
│   └── MemberRow (Server — rank, avatar, name, points)
└── LeaveGangButton (Client — confirmation dialog)
```

### Rules

1. **One section = one file.** `GangHeader.tsx`, `UpcomingMatches.tsx`, `LiveMatchesSection.tsx` — never a single 500-line page file.
2. **Section components live in feature folders.** `src/components/gangs/gang-header.tsx`, `src/components/matches/live-scorecard.tsx`.
3. **Shared primitives in `ui/` or `layout/`.** Button, Card, Avatar, PageWrapper, EmptyState.
4. **Props down, actions up.** Server Components pass data as props. Client Components call server actions for mutations.

---

## 6. Suspense & Loading Strategy

### Where Suspense Boundaries Go

| Boundary | What it wraps | Fallback | Why |
|----------|--------------|----------|-----|
| **Root layout** | Entire app | Full-page spinner | Catch-all during initial load |
| **Page-level** | Page content below nav | Page skeleton | Shows nav instantly while content streams |
| **Section-level** | Async data sections | Section skeleton | Stream each section independently |
| **Component-level** | Heavy components (leaderboard table) | Component skeleton | Don't block the whole section |

### Skeleton Pattern

```tsx
// Skeleton components match the shape of real content
function MatchListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-[120px] rounded-lg bg-[--bg-raised] animate-shimmer" />
      ))}
    </div>
  )
}

// Used in page
<Suspense fallback={<MatchListSkeleton />}>
  <UpcomingMatches gangId={gangId} />
</Suspense>
```

### Loading Priority

```
1. Nav bar renders instantly (layout, no Suspense)
2. Page header streams (gang name, member count — fast query)
3. Match sections stream independently (3 separate Suspense boundaries)
4. Member list streams last (larger query)
```

### Loading States for Client Components

Client Components that poll or subscribe use local loading state:

```tsx
'use client'
function LiveScorecard({ fixtureId }: { fixtureId: string }) {
  const { data, isLoading, error } = useLiveScores(fixtureId)

  if (isLoading) return <LiveScorecardSkeleton />
  if (error) return <ErrorCard message="Couldn't load live scores" />
  if (!data) return null

  return (/* render scorecard */)
}
```

### Rules

1. **Never show a blank white screen.** Every async boundary has a skeleton.
2. **Skeletons match the real content shape** — same height, same border radius, same spacing (per design system).
3. **Use shimmer animation** (1.5s ease-in-out infinite, `--bg-overlay` to `--bg-raised` gradient).
4. **Fixed heights on skeletons** to prevent CLS (Cumulative Layout Shift).
5. **Respect `prefers-reduced-motion`** — disable shimmer, keep static gray placeholder.

---

## 7. State Management

### Where State Lives

| State type | Where | How |
|-----------|-------|-----|
| **Database state** (gangs, predictions, standings) | Supabase Postgres | Fetched via DAL in Server Components |
| **Auth state** (session, user) | Supabase Auth + cookies | Read in middleware and Server Components |
| **Form state** (prediction picks, gang name input) | React `useState` in Client Components | Local, not persisted until submit |
| **Optimistic UI** (mark notification as read) | React `useOptimistic` | Update UI immediately, server action in background |
| **Real-time state** (notification count, live scores) | Client-side hooks | Supabase Realtime or `setInterval` polling |
| **URL state** (current gang, current fixture) | Route params | `params.groupId`, `params.fixtureId` |
| **UI state** (panel open/closed, tab selection) | React `useState` in Client Components | Local, ephemeral |

### No Global State Store

Bragg does **not** use Redux, Zustand, or any global state manager. Reasons:
- Server Components handle most data fetching — no need to cache client-side.
- Forms are local (prediction picks are local until submit).
- Real-time updates are scoped to specific components (notifications bell, live scorecard).
- URL is the source of truth for navigation state.

### Optimistic Updates

For actions that need instant feedback (e.g., marking a notification as read):

```tsx
'use client'
import { useOptimistic } from 'react'
import { markNotificationAsRead } from '@/lib/actions/notifications'

function NotificationItem({ notification }) {
  const [optimisticRead, setOptimisticRead] = useOptimistic(notification.is_read)

  async function handleClick() {
    setOptimisticRead(true)                          // Instant UI update
    await markNotificationAsRead(notification.id)    // Server action in background
  }

  return (
    <button onClick={handleClick} className={optimisticRead ? 'opacity-60' : ''}>
      {notification.message}
    </button>
  )
}
```

---

## 8. Real-time & Polling Strategy

### Two Patterns, Two Use Cases

| Data | Pattern | Why |
|------|---------|-----|
| **Notifications** | Supabase Realtime (WebSocket) | Instant delivery, low frequency, `v2_notifications` has Realtime enabled |
| **Live scores** | Client-side polling (15s interval) | High frequency during matches, Realtime would be noisy, cron already writes to `v2_fixture_live_scores` every 15s |

### Notifications (Realtime)

```tsx
// src/hooks/use-notifications.ts
'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'

export function useNotifications(userId: string) {
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createBrowserClient()

  useEffect(() => {
    // Initial fetch
    fetchUnreadCount()

    // Realtime subscription
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'v2_notifications',
        filter: `user_id=eq.${userId}`,
      }, () => {
        fetchUnreadCount() // Re-fetch on any change
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  async function fetchUnreadCount() {
    const { count } = await supabase
      .from('v2_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    setUnreadCount(count ?? 0)
  }

  return { unreadCount }
}
```

### Live Scores (Polling)

```tsx
// src/hooks/use-live-scores.ts
'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'

export function useLiveScores(fixtureId: string) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    let active = true

    async function poll() {
      const { data } = await supabase
        .from('v2_fixture_live_scores')
        .select('*')
        .eq('fixture_id', fixtureId)
        .single()
      if (active) {
        setData(data)
        setIsLoading(false)
      }
    }

    poll()
    const interval = setInterval(poll, 15_000)  // 15s
    return () => { active = false; clearInterval(interval) }
  }, [fixtureId])

  return { data, isLoading }
}
```

### Stale Data Handling

- Live scorecard shows "Last updated X ago" badge in `--warning` when data is >1 minute old (per design system).
- Use `last_polled_at` from `v2_fixture_live_scores` for staleness detection.

---

## 9. Caching & Revalidation

### Next.js Caching Behavior

| Fetch type | Caching | Revalidation |
|-----------|---------|-------------|
| DAL in Server Component | Dynamic (no cache) | On each request |
| Server Action mutation | N/A (writes) | `revalidatePath()` after mutation |
| Static pages (landing, privacy, terms) | Static at build time | On deploy |

### Revalidation After Mutations

| Action | Paths to revalidate |
|--------|-------------------|
| `createGang` | `/dashboard` |
| `joinGang` | `/dashboard`, `/group/{gangId}` |
| `submitPredictions` | `/group/{gangId}`, `/group/{gangId}/predict/{fixtureId}` |
| `approveJoinRequest` | `/group/{gangId}`, `/group/{gangId}/settings` |
| `leaveGang` | `/dashboard`, `/group/{gangId}` |
| `deleteGang` | `/dashboard` |
| `updateProfile` | `/profile`, `/group/{gangId}` (for all user's gangs) |
| `markNotificationAsRead` | None (optimistic UI handles it) |

### Rules

1. **No aggressive caching for authenticated data.** Gang members, predictions, and standings change frequently. Fetch fresh on each Server Component render.
2. **Use `revalidatePath`** after every mutation to ensure the next page load sees updated data.
3. **Static pages** (`/`, `/privacy`, `/terms`) can be statically generated — they don't depend on user data.
4. **Do not use `revalidateTag`** unless we need fine-grained cache invalidation. `revalidatePath` is simpler and sufficient for our scale.

---

## 10. Auth Flow & Middleware

### Cookie Lifecycle

```
Login (/login)
  ↓ signInWithMagicLink()
  ↓ Email sent with magic link
  ↓ User clicks link
  ↓
Callback (/auth/callback)
  ↓ Exchange code for session
  ↓ Set cookies: auth (Supabase session), bragg_onboarded, bragg_terms_version
  ↓ Redirect to: /onboarding (if new) or /dashboard (if returning)
  ↓
Middleware (every authenticated request)
  ↓ Check 1: auth cookie → if missing, redirect to /login
  ↓ Check 2: bragg_onboarded cookie → if missing, redirect to /onboarding
  ↓ Check 3: bragg_terms_version cookie → if major version mismatch, redirect to /accept-terms
  ↓ Pass through to page
  ↓
Sign Out
  ↓ Clear all cookies (auth, bragg_onboarded, bragg_terms_version)
  ↓ Redirect to /login
```

### Middleware Configuration

```tsx
// src/middleware.ts
export const config = {
  matcher: [
    // Match all routes EXCEPT:
    '/((?!_next/static|_next/image|favicon.ico|login|auth|join|privacy|terms|api).*)',
  ],
}
```

**Public routes (no auth required):** `/`, `/login`, `/auth/callback`, `/join/[code]`, `/privacy`, `/terms`

**Protected routes (auth required):** Everything else (`/dashboard`, `/group/*`, `/profile`, `/onboarding`, `/accept-terms`)

### How Auth State Reaches Components

| Component type | How to get user |
|---------------|----------------|
| Server Component | `const supabase = await createServerClient(); const { data: { user } } = await supabase.auth.getUser()` |
| Server Action | Same as above |
| Client Component | Receive `userId` as prop from parent Server Component. Never call `getUser()` from client. |
| Middleware | `const supabase = createMiddlewareClient(request, response); await supabase.auth.getUser()` |

---

## 11. Error Handling

### Three Layers

```
Layer 1: Server Action errors     → Return { success: false, error: "message" }
Layer 2: Component error boundary → Catch render errors, show fallback UI
Layer 3: Global error page        → src/app/error.tsx, catch-all
```

### Server Action Error Pattern

```tsx
// Every server action returns this shape:
type ActionResult = { success: true } | { success: false; error: string }

// Client Component consumes it:
const result = await submitPredictions(gangId, fixtureId, picks)
if (!result.success) {
  toast.error(result.error)  // Show error in toast
} else {
  toast.success('Predictions saved!')
}
```

### Error Boundary Pattern

```tsx
// src/app/group/[groupId]/error.tsx
'use client'
export default function GangError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    captureError(error)  // Log to PostHog
  }, [error])

  return (
    <EmptyState
      icon="alert-triangle"
      headline="Something went wrong"
      description="We couldn't load this page. Try again."
      action={<Button onClick={reset}>Try again</Button>}
    />
  )
}
```

### Toast Pattern

- **Success:** green left accent, auto-dismiss 4s
- **Error:** red left accent, stays until dismissed (user needs to read it)
- **Warning:** yellow left accent, auto-dismiss 4s
- Position: fixed bottom center, 20px from bottom (per design system)

### PostHog Error Capture

```tsx
// src/lib/analytics/error-handler.ts
export function captureError(error: Error, context?: Record<string, any>) {
  posthog.capture('ERROR_LOGGED', {
    message: error.message,
    stack: error.stack,
    ...context,
  })
}
```

---

## 12. Key Data Flows

### Flow 1: Prediction Submission

```
User fills out prediction form (Client Component)
  ↓ Local state: picks = [{ scenarioId, value }, ...]
  ↓ Clicks "Submit Predictions"
  ↓
submitPredictions() server action
  ↓ Auth check (getUser from cookie)
  ↓ Rate limit check (60/hour)
  ↓ Validate: membership, fixture status, prediction window
  ↓ Upsert v2_predictions (RLS ensures user can only write own)
  ↓ Postgres trigger: update v2_gang_fixture_standings (recalc rank)
  ↓ revalidatePath('/group/{gangId}')
  ↓ Fire PREDICTION_SUBMITTED event
  ↓ Return { success: true }
  ↓
Client receives result → toast success/error
```

### Flow 2: Live Match Resolution

```
pg_cron fires every 15 seconds
  ↓
live-poll-resolve-fixtures Edge Function
  ↓ Query: fixtures WHERE status IN ('upcoming', 'live', 'completed')
  ↓     AND (status != 'completed' OR status_changed_at > now() - 120 min)
  ↓
For each fixture:
  ↓ Fetch from Sportmonks: /fixtures/{id}?include=batting,bowling,runs,manofmatch
  ↓
  ↓ Status transitions:
  ↓   upcoming → live     (API says in-progress)
  ↓   live → completed    (API says Finished)
  ↓   completed → resolved (all scenarios resolved)
  ↓
  ↓ Update v2_fixture_live_scores (scorecard data)
  ↓ Track max_overs_seen (defensive against cache anomalies)
  ↓ Capture powerplay snapshot at 6.0 overs
  ↓
  ↓ Progressive scenario resolution:
  ↓   For each scenario WHERE is_resolved = false:
  ↓     Check if resolution_phase conditions are met
  ↓     If yes: set correct_answer, is_resolved = true
  ↓     Update v2_predictions: is_correct, points_earned
  ↓     Postgres trigger: update standings
  ↓
  ↓ When all scenarios resolved:
  ↓   Set fixture status = 'resolved'
  ↓   Create results_available notification for all members
  ↓
Client polling (15s interval) picks up new v2_fixture_live_scores
  → UI updates automatically
```

### Flow 3: Gang Creation

```
User fills Create Gang form (Client Component)
  ↓ Clicks "Create Gang"
  ↓
createGang() server action
  ↓ Auth check
  ↓ Rate limit check (10/hour)
  ↓ Validate: name 3-50 chars
  ↓
  ↓ Call Postgres RPC: create_gang(name, user_id)
  ↓   BEGIN TRANSACTION
  ↓   1. Insert v2_gangs (generate invite code, retry on collision)
  ↓   2. Insert v2_gang_members (user as admin, status=approved)
  ↓   3. Insert v2_gang_league_seasons (enroll in active season)
  ↓   4. Call seed_scenarios_for_gang() — copies active templates for upcoming fixtures
  ↓   COMMIT
  ↓
  ↓ revalidatePath('/dashboard')
  ↓ Fire GANG_CREATED event
  ↓ Return { success: true, gangId, inviteCode }
  ↓
Client receives result → redirect to /group/{gangId}
```

### Flow 4: Notification Delivery (Real-time)

```
Trigger event (e.g., admin approves join request)
  ↓
Server action inserts row into v2_notifications
  ↓
Supabase Realtime detects INSERT on v2_notifications
  ↓ Fires postgres_changes event to channel notifications:{userId}
  ↓
Client hook (useNotifications) receives event
  ↓ Re-fetches unread count
  ↓ Updates notification bell badge
  ↓
User clicks bell → opens side panel
  ↓ Fetches latest 20 notifications via DAL
  ↓ Renders notification items
  ↓
User clicks a notification
  ↓ Optimistic: mark as read locally
  ↓ Server action: markNotificationAsRead(id)
  ↓ Navigate to destination based on type
```

---

## 13. Testing Strategy

### Unit Tests (Jest + React Testing Library)

| What to test | Where | Examples |
|-------------|-------|---------|
| Server actions | `src/lib/actions/*.test.ts` | Validation, auth checks, error cases, DB writes |
| DAL functions | `src/lib/dal/*.test.ts` | Query correctness, empty state, error handling |
| Utility helpers | `src/lib/*.test.ts` | `getAvatarInitials`, `formatTimeAgo`, rate limiter |
| Postgres functions | `supabase-2/tests/` | `create_gang` RPC, `delete_account` RPC, triggers |
| Components | `src/components/**/*.test.tsx` | Render with props, click handlers, accessibility |

### Storybook (Component Showcase)

Every UI component ships with `*.stories.tsx`:
- `Default` story (happy path)
- Key variant stories: `Loading`, `Empty`, `Error`, `WithData`, `Admin`, `Member`
- Storybook Controls for toggling props
- Accessibility checks via `@storybook/addon-a11y`

### E2E Tests (Playwright)

Critical-path smoke tests in `web-app-2/e2e/`:
1. Signup → onboarding → dashboard
2. Create gang → invite link → join
3. Predict → submit → verify
4. Live resolution → leaderboard
5. Admin approve → member management
6. Delete gang → sign out

### Test Data Strategy

- **Unit tests:** Mock Supabase client, inline test data
- **Storybook:** Hardcoded props / `.mocks.ts` files, no real API calls
- **E2E:** Dedicated Supabase test project with seeded data, magic-link bypass via admin API

---

## 14. Performance Targets

| Metric | Target | How |
|--------|--------|-----|
| **LCP** | < 2.5s | Server Components stream content, fonts preloaded, no client-side data fetching on initial load |
| **INP** | < 200ms | Minimal client JS, event handlers are lightweight, heavy work in server actions |
| **CLS** | < 0.1 | Fixed-height skeletons, no layout shift from async content, `font-display: swap` |
| **Page load** | < 2s on 4G | Server-render critical content, lazy-load below-fold sections |

### Performance Rules

1. **No `useEffect` for initial data fetching.** Use Server Components.
2. **No large client bundles.** Keep `'use client'` components small. Heavy logic stays on the server.
3. **Lazy-load below-fold.** Live scores section, member list — wrap in Suspense.
4. **Preload critical fonts.** Space Grotesk (heading) via `next/font`. Inter is often cached.
5. **Use `tabular-nums`** on all numeric data to prevent layout shift during counter animations.

---

## 15. Security Checklist

| Layer | Protection | Implementation |
|-------|-----------|----------------|
| **Database** | RLS on all tables | FND-DB-002 — every query scoped to user |
| **Service role** | Two-layer defense | `server-only` package + ESLint rule (FND-004) |
| **Auth** | Magic link (no passwords) | Supabase Auth, 60s cooldown |
| **Middleware** | Cookie-based gates | No DB query — fast, runs on every request |
| **Server actions** | Auth + membership + rate limit | Checked at top of every action |
| **Destructive actions** | Type-to-confirm dialog | AUTH-UI-006 component |
| **Predictions** | RLS deadline enforcement | `prediction_deadline()` helper in RLS policy |
| **Rate limiting** | Per-user per-action | POL-SEC-001 — 6 protected actions |
| **XSS** | React auto-escapes | No `dangerouslySetInnerHTML` |
| **CSRF** | Server actions use POST | Built into Next.js server actions |

---

## 16. Date & Time Formatting

### Storage

All timestamps stored as `TIMESTAMPTZ` in Postgres (UTC internally). Sportmonks API returns UTC. Never store local times — always UTC in the database.

### Display

All times displayed in the **user's local timezone** using `Intl.DateTimeFormat` on the client. The timezone abbreviation is always shown after the time (per PRD NFR).

12h/24h format follows the user's system locale automatically — do not hardcode.

### Format Reference

| Context | Format | Example |
|---------|--------|---------|
| Match card (upcoming, >1 day away) | `Day, DD Mon · h:mm A TZ` | `Sat, 28 Mar · 7:30 PM IST` |
| Match card (today) | `Today · h:mm A TZ` | `Today · 7:30 PM IST` |
| Match card (tomorrow) | `Tomorrow · h:mm A TZ` | `Tomorrow · 7:30 PM IST` |
| Prediction deadline | `h:mm A TZ` (time only) | `6:45 PM IST` |
| Notification timestamp | Relative | `Just now`, `2h ago`, `3d ago` |
| Profile (joined date) | `DD Mon YYYY` | `28 Mar 2026` |
| Match leaderboard header | `DD Mon YYYY` | `28 Mar 2026` |
| Last updated (stale data) | Relative | `Last updated 2m ago` |

### Implementation

Create a shared utility `src/lib/format-date.ts` with these helpers:

```tsx
// All accept a Date or ISO string and format in user's local timezone

formatMatchTime(date)       // → "Sat, 28 Mar · 7:30 PM IST" or "Today · 7:30 PM IST"
formatDeadline(date)        // → "6:45 PM IST"
formatTimeAgo(date)         // → "Just now", "2h ago", "3d ago"
formatDate(date)            // → "28 Mar 2026"
```

**Key rules:**
- Use `Intl.DateTimeFormat` with `{ timeZoneName: 'short' }` for the timezone abbreviation
- "Today" / "Tomorrow" detection: compare against user's local calendar date, not UTC
- `formatTimeAgo` thresholds: <1 min = "Just now", <60 min = "Xm ago", <24h = "Xh ago", <7d = "Xd ago", older = `formatDate()`
- **These are Client Component helpers** (they need the browser's timezone). Server Components should pass raw ISO strings as props and let Client Components format them.
- For Server-rendered static text (e.g., SEO meta tags), use UTC with explicit label: `"28 Mar 2026, 14:00 UTC"`

---

## 17. Conventions Quick Reference

| Convention | Rule |
|-----------|------|
| File naming | kebab-case: `live-scorecard.tsx`, `gang-header.tsx` |
| Component naming | PascalCase: `LiveScorecard`, `GangHeader` |
| Server action naming | camelCase verb-first: `createGang`, `submitPredictions` |
| DAL function naming | camelCase get-prefix: `getGangDetails`, `getUpcomingFixtures` |
| Route params | camelCase: `groupId`, `fixtureId` (Next.js convention) |
| CSS tokens | kebab-case with `--` prefix: `--brand`, `--bg-raised` |
| Event constants | SCREAMING_SNAKE: `PREDICTION_SUBMITTED`, `GANG_CREATED` |
| Branch naming | `feature/[short-description]` |
| Commit style | Past tense, lowercase: "resolve all open questions, fix story counts" |
| TypeScript | `strict: true`, `noUncheckedIndexedAccess: true` — no `any`, no `@ts-ignore` |
| ESLint | Zero errors, zero warnings (`--max-warnings 0`). See FND-002 for full rule list |
| Types | No `any`. Use proper types, generics, or `unknown` with type guards. Cast at boundaries only |
| Imports | Use `import type` for type-only imports (`consistent-type-imports` rule enforced) |
| Promises | All awaited or explicitly voided (`no-floating-promises` enforced) |
| Pre-commit | `husky` + `lint-staged` runs ESLint + Prettier on staged files. Lint failures block commit |

---

## 18. Decision Log

Key architecture decisions and their rationale:

| Decision | Choice | Why |
|----------|--------|-----|
| No global state store | Server Components + local state | RSC handles most data; no need for client-side cache |
| Notifications via Realtime, scores via polling | Two different patterns | Notifications are low-frequency push; scores are high-frequency pull |
| DAL layer between components and Supabase | Typed, testable, reusable | Avoids inline queries in components; single place to change query logic |
| RLS as primary access control | Defense in depth | Even if server action has a bug, Postgres blocks unauthorized access |
| Materialized standings (not computed views) | Performance | Standings queries are frequent; recomputing on every read is expensive |
| `server-only` + ESLint for service-role | Two-layer defense | Runtime guarantee (can't leak to client) + lint-time restriction (can't use in wrong server files) |
| Soft deletes for profiles and gangs | Data preservation | Standings and predictions reference deleted users; hard delete would break FK integrity |
| Fixed 15s polling interval | Matches Sportmonks update rate | API updates every ~15s during live matches; faster polling wastes quota |
| No SSG for authenticated pages | Dynamic data | Gang membership, predictions, standings change constantly; static generation not useful |
| Storybook over custom dev route | Industry standard | Better DX, addon ecosystem (a11y, controls), CI-compatible static builds |
