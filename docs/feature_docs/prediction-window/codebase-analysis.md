# Codebase Analysis: Prediction Window Feature

**Date**: 2026-03-29
**Analyst**: PSE Agent
**Feature**: Restrict predictions to 8 AM IST on match day through 45 minutes before match start

---

## 1. Project Structure

```
cric-predictor/
  web-app/                         # Next.js 16 frontend (App Router)
    src/
      app/                         # Route segments
        auth/callback/route.ts     # OAuth callback
        dashboard/page.tsx         # User dashboard — lists squads
        group/[groupId]/
          page.tsx                 # Group home — match cards, "Make Your Calls" / "Predict Early" buttons
          layout.tsx               # Auth + membership guard for all /group routes
          admin/page.tsx           # Admin panel
          match/[matchId]/page.tsx # Match leaderboard + Prediction Reveal Table
          predict/[matchId]/page.tsx # <<< Prediction form page >>>
          scenarios/[matchId]/page.tsx # Scenario management
          standings/page.tsx       # Season standings
        login/page.tsx
        onboarding/page.tsx
      components/
        prediction/                # <<< Core prediction UI >>>
          prediction-form.tsx      # Client component — orchestrates all scenario picks
          scenario-card.tsx        # Individual scenario pick card
          team-pick.tsx            # Team selection input
          player-pick.tsx          # Player selection input
          range-pick.tsx           # Range bracket input
          yes-no-pick.tsx          # Yes/No toggle input
          custom-scenario-form.tsx # Custom scenario creation
        leaderboard/
          prediction-reveal-section.tsx  # Server component — gates reveal by deadline
          reveal-locked-placeholder.tsx  # Pre-lock placeholder with countdown
          reveal-table-polling-wrapper.tsx
          prediction-reveal-table.tsx
          match-leaderboard.tsx
          prediction-status-pill.tsx
        match/
          live-match-card.tsx      # Client wrapper with polling
          live-match-scorecard.tsx
          match-scorecard.tsx
          completed-match-card.tsx
          completed-matches-section.tsx
        shared/
          team-badge.tsx
          empty-state.tsx
          error-state.tsx
      hooks/
        use-countdown.ts           # <<< Live countdown timer hook >>>
        use-match-polling.ts       # Polling for live match scores
        use-prediction-polling.ts
        use-auth.ts
        use-realtime.ts
      lib/
        actions/
          predictions.ts           # <<< Server action: submitPredictions >>>
          scenarios.ts
          admin.ts
          auth.ts
          groups.ts
          notifications.ts
        dal/                       # Data Access Layer (server-side)
          predictions.ts           # <<< DAL for prediction CRUD >>>
          matches.ts               # <<< DAL for match + deadline queries >>>
          scenarios.ts
          groups.ts
          members.ts
          players.ts
          standings.ts
          teams.ts
          notifications.ts
        constants.ts               # <<< LIMITS.PREDICTION_DEADLINE_MINUTES_BEFORE_MATCH = 45 >>>
        utils.ts                   # <<< computeDeadline(), isDeadlinePassed(), formatCountdown() >>>
        validators.ts              # Zod schemas
        supabase/
          client.ts                # Browser Supabase client
          server.ts                # Server Supabase client
          middleware.ts
          get-user-cached.ts
      types/
        database.ts                # <<< Hand-maintained DB types (mirrors schema) >>>
        index.ts                   # Application-level types

  supabase/
    migrations/                    # 35 sequential SQL migration files
      001_initial_schema.sql       # Core tables: matches, predictions, scenarios, match_group_settings
      003_rls_policies.sql         # <<< Deadline-aware RLS on predictions table >>>
      011_auto_match_group_settings.sql  # Auto-create settings rows for new groups
      017_fix_prediction_update_rls.sql  # Adds group membership check to UPDATE policy
      019_enforce_scenarios_published_rls.sql  # Requires scenarios_published = true for INSERT
      020_document_deadline_timezone.sql  # <<< prediction_deadline() SQL helper function >>>
      035_prediction_status_function.sql  # get_members_who_predicted() SECURITY DEFINER function
    functions/
      match-cron/index.ts          # <<< Edge Function: auto-locks predictions when match goes live >>>
      match-live/index.ts
      sync-data/index.ts
    seed.sql
```

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.1 |
| Language | TypeScript | ^5 |
| Runtime | React | 19.2.4 |
| Database | PostgreSQL via Supabase | `@supabase/supabase-js` ^2.100.1 |
| Auth | Supabase Auth (Magic Link) | `@supabase/ssr` ^0.9.0 |
| Styling | Tailwind CSS v4 | `tailwindcss` ^4, CSS custom properties |
| UI Components | shadcn/ui + custom | `shadcn` ^4.1.0 |
| Validation | Zod v4 | `zod` ^4.3.6 |
| Analytics | PostHog | `posthog-js` ^1.364.0, `posthog-node` ^5.28.7 |
| Icons | Lucide React | `lucide-react` ^1.7.0 |
| Testing | Vitest + Testing Library + Playwright | `vitest` ^4.1.2 |
| State Management | React hooks (`useState`, `useTransition`), no global store | -- |

## 3. Database Schema (Prediction-Relevant Tables)

### `matches`
| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | Auto-increment |
| match_number | INT UNIQUE | e.g., 1, 2, 3... |
| team_a / team_b | TEXT FK teams(code) | "CSK", "MI", etc. |
| **date** | **DATE** | **e.g., '2026-03-28' -- match day** |
| **time_ist** | **TIME** | **e.g., '19:30:00' -- IST, never UTC** |
| venue | TEXT | |
| **status** | **match_status ENUM** | **'upcoming', 'live', 'completed', 'abandoned', 'no_result'** |
| toss_winner, match_winner, etc. | TEXT/INT/BOOL | Result fields populated post-match |
| current_score_a/b, current_overs_a/b | TEXT/DECIMAL | Live score fields |
| api_match_id | TEXT | External API reference |
| resolved_at | TIMESTAMPTZ | When results were finalized |

**Key insight**: Match time is stored as a naive `TIME` column (`time_ist`) which is always interpreted as IST (UTC+05:30). There is no `TIMESTAMPTZ` for match start. The deadline is computed at query time.

### `match_group_settings`
| Column | Type | Notes |
|---|---|---|
| group_id | UUID PK (composite) | FK groups(id) |
| match_id | INT PK (composite) | FK matches(id) |
| **prediction_deadline** | **TIMESTAMPTZ** | **Admin-configurable override; NULL = use default 45-min formula** |
| **is_locked** | **BOOLEAN DEFAULT false** | **Admin or auto-lock (match goes live)** |
| scenarios_published | BOOLEAN DEFAULT false | Must be true for predictions to be submittable |

**Key insight**: This is a per-group, per-match settings table. A row must exist for predictions to work (RLS JOIN requires it). Auto-created when a group is created (migration 011).

### `predictions`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK profiles(id) | |
| scenario_id | UUID FK scenarios(id) | |
| value | TEXT | The user's pick |
| is_correct | BOOLEAN | NULL until resolved |
| points_earned | INT DEFAULT 0 | |
| submitted_at | TIMESTAMPTZ | Updated on each upsert |
| UNIQUE(user_id, scenario_id) | | Enables upsert pattern |

### `scenarios`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| group_id | UUID FK | |
| match_id | INT FK | |
| type | scenario_type ENUM | 'system' or 'custom' |
| system_category | TEXT | e.g., 'match_winner', 'toss_winner' |
| title | TEXT | Display label |
| options | JSONB | Available choices |
| correct_answer | TEXT | Set on resolution |
| points | INT | 5, 10, 15, 20, or 25 |
| is_resolved | BOOLEAN | |
| approval_status | scenario_approval ENUM | 'auto_approved', 'pending', 'approved', 'rejected' |
| is_removed | BOOLEAN | Soft delete |

## 4. Current Prediction Flow (End-to-End)

### 4.1 User Journey

1. **Group page** (`/group/[groupId]`) lists upcoming matches as cards.
2. Each match card has a CTA button:
   - First match: **"Make Your Calls"** (primary CTA gradient style)
   - Subsequent matches: **"Predict Early"** (muted secondary style)
   - Live matches: **"View Leaderboard"** (no prediction CTA)
3. Clicking CTA navigates to **Predict page** (`/group/[groupId]/predict/[matchId]`).
4. On the Predict page:
   - System scenarios are auto-seeded (via `seedSystemScenarios` RPC call).
   - Scenarios are grouped by resolution phase (Toss, Powerplay, Mid-Innings, etc.).
   - User selects picks via scenario-type-specific inputs (TeamPick, PlayerPick, RangePick, YesNoPick).
   - A sticky bottom bar shows `X/Y picked` counter and **"Lock It In"** submit button.
   - On submit, `submitPredictions` server action is called.
5. After submission, user is redirected back to the group page.

### 4.2 Server Action: `submitPredictions` (predictions.ts)

The server action performs these checks **in order**:

1. **Zod validation** of input via `submitPredictionsSchema`.
2. **Authentication**: Verify `supabase.auth.getUser()`.
3. **Group membership**: `membersDal.getMembershipStatus()` -- must be `'approved'`.
4. **Match status**: `matchesDal.getMatchDeadlineInfo()` -- must be `'upcoming'`.
5. **Admin lock**: `matchesDal.getMatchGroupSettings()` -- `is_locked` must be `false`.
6. **Deadline check**: `isDeadlinePassed(match.date, match.time_ist, settings?.prediction_deadline)`.
7. **Scenario validation**: Verifies scenario IDs belong to this group+match.
8. **Upsert**: `predictionsDal.upsertPredictions()` -- bulk upsert with `onConflict: "user_id,scenario_id"`.

**There is NO "prediction window open" check (i.e., no earliest-allowed-time check).** The only temporal restriction is the deadline (latest allowed time).

### 4.3 RLS Enforcement (Defense-in-Depth)

The database has its own deadline enforcement via RLS policies:

**INSERT policy** (`insert_own_prediction`):
```sql
auth.uid() = user_id
AND is_group_member(s.group_id, auth.uid())
AND m.status = 'upcoming'
AND COALESCE(mgs.is_locked, false) = false
AND COALESCE(mgs.scenarios_published, false) = true
AND now() < prediction_deadline(m.date, m.time_ist, mgs.prediction_deadline)
```

**UPDATE policy** (`update_own_prediction`):
```sql
auth.uid() = user_id
AND is_group_member(s.group_id, auth.uid())
AND m.status = 'upcoming'
AND COALESCE(mgs.is_locked, false) = false
AND now() < prediction_deadline(m.date, m.time_ist, mgs.prediction_deadline)
```

**SELECT policy** (`read_others_after_deadline`):
Other users' predictions become visible when:
```sql
m.status IN ('live', 'completed', 'abandoned', 'no_result')
OR mgs.is_locked = true
OR now() > prediction_deadline(m.date, m.time_ist, mgs.prediction_deadline)
```

**Again: RLS only enforces the upper bound (deadline). There is no lower bound (window open time).**

## 5. The "Early Prediction" Button

### Where It Lives

**File**: `web-app/src/app/group/[groupId]/page.tsx` (lines 163-173)

### What It Does

The group page renders up to 3 upcoming/live matches. The CTA button text varies based on position:

```tsx
{isPrimary
  ? "Make Your Calls"      // First (next) match — prominent CTA
  : "Predict Early"}        // 2nd and 3rd matches — secondary style
```

Both buttons link to the exact same route: `ROUTES.PREDICT(groupId, match.id)` = `/group/[groupId]/predict/[matchId]`.

### How It Works

- `isPrimary` is `index === 0` in the `upcomingMatches.map()` loop.
- The "Predict Early" label is purely cosmetic copy -- there is no functional difference.
- Both the primary and secondary matches allow prediction immediately. **There is no gate preventing predictions days before the match.**
- The only restriction is the deadline (45 min before match) and the admin lock.

### Current Behavior

Users can predict for **any upcoming match at any time**, regardless of how far in the future it is. A match scheduled for April 15 can be predicted on March 29. The "Predict Early" button label implicitly acknowledges this by naming the action, but does nothing to restrict it.

## 6. Match Timing / Scheduling

### How Match Times Are Stored

- `matches.date` = `DATE` column (e.g., `'2026-04-01'`)
- `matches.time_ist` = `TIME` column (e.g., `'19:30:00'`)
- These are **always IST**. India does not observe DST, so IST = UTC+05:30 always.

### Timezone Handling

**In SQL** (migration 020):
```sql
-- Naive timestamp → TIMESTAMPTZ via AT TIME ZONE
(m.date + m.time_ist - interval '45 minutes') AT TIME ZONE 'Asia/Kolkata'
```
This means: "interpret `date + time_ist` as IST, convert to UTC". The `prediction_deadline()` SQL function centralizes this.

**In JavaScript** (`lib/utils.ts`):
```typescript
const istDatetime = new Date(`${matchDate}T${matchTimeIst}+05:30`);
return new Date(istDatetime.getTime() - LIMITS.PREDICTION_DEADLINE_MINUTES_BEFORE_MATCH * 60 * 1000);
```
Constructs a Date with explicit `+05:30` offset. Well-documented, matches the SQL logic.

### Critical Observation

The match start datetime is never stored as a single `TIMESTAMPTZ` column. It is always recomputed from `date` + `time_ist` at runtime. This pattern works but requires careful coordination between JS and SQL to avoid timezone bugs.

## 7. Current Prediction Lock Logic

Predictions are locked by **three independent mechanisms**:

### 7.1 Time-Based Deadline (Default)

- **Formula**: match start time (IST) minus 45 minutes.
- **Constant**: `LIMITS.PREDICTION_DEADLINE_MINUTES_BEFORE_MATCH = 45`
- **Computed in JS**: `computeDeadline()` in `lib/utils.ts`
- **Computed in SQL**: `prediction_deadline()` function in migration 020
- **Example**: Match at 7:30 PM IST => deadline at 6:45 PM IST

### 7.2 Admin Override (Custom Deadline / Manual Lock)

- Admins can set `match_group_settings.prediction_deadline` to any `TIMESTAMPTZ`.
- Admins can toggle `match_group_settings.is_locked` to `true`.
- Both are per-group, per-match.

### 7.3 Auto-Lock on Match Go-Live

- The `match-cron` Edge Function detects when a match transitions to `live` (toss detected or `event_live === "1"`).
- It then: (a) sets `matches.status = 'live'`, and (b) runs `UPDATE match_group_settings SET is_locked = true WHERE match_id = ?` for **all groups**.

### Lock Check Stack

When a prediction is submitted, locks are checked at **three layers**:

| Layer | Check | File |
|---|---|---|
| **UI** | `locked` boolean disables form | `predict/[matchId]/page.tsx` line 60-63 |
| **Server Action** | `match.status !== "upcoming"`, `settings?.is_locked`, `isDeadlinePassed()` | `actions/predictions.ts` lines 40-52 |
| **RLS** | SQL policy checks status, is_locked, deadline | `003_rls_policies.sql` / `020_document_deadline_timezone.sql` |

### What Is NOT Checked (The Gap)

**No "window open" check exists anywhere.** There is no lower bound. The current system allows predictions from the moment scenarios are seeded until the deadline. This is the exact gap the prediction window feature needs to fill.

## 8. Group Page Structure

**File**: `web-app/src/app/group/[groupId]/page.tsx`

The group page fetches:
- Group details, members, membership
- `matchesDal.getUpcomingMatches(3)` -- up to 3 upcoming/live matches
- `matchesDal.getRecentCompletedMatches(3)` -- up to 3 completed matches
- `predictionsDal.getMembersWhoPredicted(groupId, firstMatch.id)` -- who predicted for next match

Renders:
1. Group header (name, member count, invite link, admin button)
2. Match cards (up to 3), each showing:
   - Live indicator or "Next Match" / "Match N" label
   - Team names, date/time/venue
   - CTA button ("Make Your Calls" / "Predict Early" / "View Leaderboard")
   - Deadline text: `"Predictions close at {deadlineStr}"` or `"Match is live -- predictions are locked"`
   - Prediction status pills (who has predicted, first match only)
3. Completed matches section
4. Member list ("The Squad")

**Key observation**: The deadline string is currently computed as:
```tsx
const deadline = computeDeadline(match.date, match.time_ist);
const deadlineStr = deadline.toLocaleTimeString("en-IN", {
  hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata"
}) + " IST";
```
This only shows the close time. There is no "opens at" messaging.

## 9. Predict Page Structure

**File**: `web-app/src/app/group/[groupId]/predict/[matchId]/page.tsx`

Server component that:
1. Fetches match details and group settings
2. Auto-seeds system scenarios (`seedSystemScenarios`)
3. Fetches scenarios, players, existing predictions
4. Computes `locked` boolean:
   ```typescript
   const locked =
     match.status !== "upcoming" ||
     settings?.is_locked === true ||
     isDeadlinePassed(match.date, match.time_ist, settings?.prediction_deadline);
   ```
5. Renders:
   - Back link to group
   - Match header card (team badges, date/time/venue, "Locked" or "Closes at X" badge)
   - `<PredictionForm>` client component

**Key observation**: The predict page renders for any match status. If `locked === true`, the form is disabled but still visible (shows "Predictions Locked" banner). **There is no concept of "too early" -- the page always renders the form.**

## 10. Prediction Form Component

**File**: `web-app/src/components/prediction/prediction-form.tsx`

Client component that:
- Maintains local state of picks (`Record<string, string>`)
- Groups scenarios by resolution phase (Toss, Powerplay, etc.)
- Renders `ScenarioCard` for each scenario
- Shows sticky bottom bar with pick count and "Lock It In" button
- On submit, calls `submitPredictions` server action
- On success, redirects to group page

Receives `isLocked` as a prop. When locked:
- Shows "Predictions Locked" banner
- All ScenarioCard inputs are `disabled`
- Submit button is disabled

## 11. Existing Countdown/Timer Components

### `useCountdown` Hook

**File**: `web-app/src/hooks/use-countdown.ts`

```typescript
function useCountdown(targetDate: Date | null): { display: string; isExpired: boolean }
```

- Accepts a target `Date`, runs a 1-second `setInterval`.
- Returns formatted countdown string (e.g., "2h 15m", "45m", "3d 6h") and expired boolean.
- Uses `formatCountdown()` from utils.
- Currently used only by `RevealLockedPlaceholder`.

### `RevealLockedPlaceholder`

**File**: `web-app/src/components/leaderboard/reveal-locked-placeholder.tsx`

- Shows lock icon, message, and countdown to deadline.
- Has "imminent" state (< 1 hour) that changes copy.
- **This component is NOT on the predict page -- it's on the match leaderboard page.**

### `formatCountdown` Utility

**File**: `web-app/src/lib/utils.ts`

```typescript
function formatCountdown(targetDate: Date): string
// Returns: "3d 6h", "2h 15m", "45m", or "Expired"
```

Well-tested with 6 test cases in `utils.test.ts`.

## 12. Constants and Copy Related to Predictions

### Timing Constants

```typescript
// lib/constants.ts
LIMITS.PREDICTION_DEADLINE_MINUTES_BEFORE_MATCH = 45
```

**No constant exists for prediction window open time.** This will need to be added (e.g., `PREDICTION_WINDOW_OPEN_HOUR_IST = 8`).

### Prediction Status Copy

```typescript
PREDICTION_STATUS = {
  CORRECT: { label: "Nailed It", ... },
  WRONG: { label: "Missed", ... },
  ON_TRACK: { label: "On Track", ... },
  IN_DANGER: { label: "Sweating", ... },
  PENDING: { label: "In Play", ... },
}
```

### Reveal Table Copy

```typescript
REVEAL_TABLE_COPY = {
  SECTION_TITLE: "The Reveal",
  PRE_LOCK_MESSAGE: "Picks stay under wraps until lock-in. Sit tight.",
  PRE_LOCK_IMMINENT: "Almost time -- picks drop soon.",
  PRE_LOCK_GENERIC: "Everyone's picks will appear here once predictions lock.",
  ...
}
```

### Analytics Events

```typescript
PREDICTION_SUBMITTED: "prediction_submitted"
PREDICTION_PICK_CHANGED: "prediction_pick_changed"
```

**No events exist for window-open, window-closed, or early-prediction-attempt.**

## 13. Existing Window/Timing Logic Patterns

### Pattern: `computeDeadline` / `isDeadlinePassed`

The codebase already has a clean pattern for computing and checking time boundaries:

```typescript
// Compute a boundary date
function computeDeadline(matchDate, matchTimeIst, customDeadline?): Date

// Boolean check against now()
function isDeadlinePassed(matchDate, matchTimeIst, customDeadline?): boolean
```

This pattern can be extended for the window open time:

```typescript
// New (proposed)
function computeWindowOpen(matchDate): Date
function isWindowOpen(matchDate, matchTimeIst, customDeadline?): boolean
```

### Pattern: SQL `prediction_deadline()` Function

```sql
CREATE OR REPLACE FUNCTION prediction_deadline(
  p_match_date DATE, p_match_time TIME, p_custom_deadline TIMESTAMPTZ DEFAULT NULL
) RETURNS TIMESTAMPTZ
```

A similar `prediction_window_open()` function could be created for the lower bound.

### Pattern: Triple-Layer Enforcement

Every restriction is enforced at three layers: UI (disabled state), Server Action (validation), RLS (database policy). The prediction window must follow this same pattern.

## 14. Risks and Tech Debt

### Relevant to This Feature

1. **No single match start TIMESTAMPTZ column**: The `date` + `time_ist` pattern requires reconstruction everywhere. A computed/generated column or view column would centralize this.

2. **`match_group_settings` row must exist**: The RLS INSERT policy does a `LEFT JOIN` on `match_group_settings`, but the `COALESCE(mgs.scenarios_published, false) = true` check means a missing row blocks inserts. Migration 011 auto-creates rows, but new matches added after group creation need a separate mechanism.

3. **Predict page always renders**: Even for matches days away, the predict page loads and auto-seeds scenarios. With a prediction window, we need to decide: (a) render the page with a "window not open" message, or (b) redirect to group page, or (c) show a countdown.

4. **"Predict Early" button has no guard**: The group page currently links to the predict route for all upcoming matches. With a prediction window, non-match-day matches should either hide the CTA or show a different state.

5. **Custom deadline override**: The `match_group_settings.prediction_deadline` overrides the default deadline but there is no equivalent override for the window open time. We need to decide if admins can also override the window open time.

6. **RLS does not enforce window open**: Adding a window-open check to the INSERT/UPDATE RLS policies requires modifying the `prediction_deadline` function or creating a new one, plus updating 2 policies.

## 15. Summary: What Needs to Change for Prediction Window

### Files That Need Modification

| File | Change |
|---|---|
| `lib/constants.ts` | Add `PREDICTION_WINDOW_OPEN_HOUR_IST` constant |
| `lib/utils.ts` | Add `computeWindowOpen()`, `isWindowOpen()`, modify `isDeadlinePassed()` or add `isPredictionWindowActive()` |
| `lib/utils.test.ts` | Tests for new window functions |
| `lib/actions/predictions.ts` | Add window-open check before accepting predictions |
| `app/group/[groupId]/page.tsx` | Change "Predict Early" button behavior for non-match-day matches; add "opens at" messaging |
| `app/group/[groupId]/predict/[matchId]/page.tsx` | Add window-not-open state alongside locked state |
| `components/prediction/prediction-form.tsx` | Handle new `isWindowNotOpen` prop (or expand `isLocked` semantics) |
| `types/database.ts` | Add `prediction_window_open` to `match_group_settings` if admin override is supported |
| RLS policies (migration) | Add `now() > prediction_window_open(...)` check to INSERT and UPDATE policies |
| `supabase/migrations/` | New migration for `prediction_window_open()` SQL function + RLS updates |
| `lib/posthog/events.ts` | Add window-related analytics events |
| `lib/constants.ts` | Add copy for window states ("Predictions open at 8 AM IST", etc.) |

### Key Design Decisions Required

1. **Window open time source of truth**: Hard-coded constant (8 AM IST) or per-match-group setting in `match_group_settings`?
2. **Non-match-day behavior**: Should the predict page render at all for matches not on today's date? Should the "Predict Early" button be hidden or show a disabled state?
3. **Window transition UX**: When the window opens at 8 AM IST, should users on the page see it auto-enable (via countdown + client-side timer), or do they need to refresh?
4. **Match day definition**: Is "match day" strictly `matches.date`, or should it account for late-night matches (e.g., a match starting at 11:30 PM IST)?
5. **Admin override**: Can admins open the prediction window earlier (e.g., for special matches)?
