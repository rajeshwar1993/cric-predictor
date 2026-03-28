# Codebase Analysis
**Date**: 2026-03-28
**Analyst**: PSE Agent
**Feature Context**: Completed Matches Section on Group Page

---

## 1. Project Structure

```
cric-predictor/
├── web-app/                          # Next.js 16 application
│   ├── src/
│   │   ├── app/                      # App Router pages
│   │   │   ├── auth/callback/        # OAuth callback
│   │   │   ├── dashboard/            # User's group list (post-login home)
│   │   │   ├── group/[groupId]/      # Group pages (layout enforces auth+membership)
│   │   │   │   ├── page.tsx          # ** GROUP HOME — primary target for this feature **
│   │   │   │   ├── admin/            # Admin panel (result entry, approvals)
│   │   │   │   ├── match/[matchId]/  # Match leaderboard page
│   │   │   │   ├── predict/[matchId]/# Prediction form page
│   │   │   │   ├── scenarios/[matchId]/ # Scenario editor (admin)
│   │   │   │   └── standings/        # Season standings
│   │   │   ├── join/[code]/          # Invite link handler
│   │   │   ├── login/                # Magic link login
│   │   │   └── onboarding/           # Profile setup
│   │   ├── components/
│   │   │   ├── admin/                # AdminMemberList, PendingApprovals, ResultEntryForm, ScenarioEditor
│   │   │   ├── auth/                 # LoginForm, OnboardingForm
│   │   │   ├── group/                # GroupCard, CreateGroupForm, InviteLink, JoinGroupForm, MemberList
│   │   │   ├── layout/               # Header, Footer, NotificationBell, UserMenu
│   │   │   ├── leaderboard/          # MatchLeaderboard, SeasonStandings, ExpandablePicks, PredictionStatusPill
│   │   │   ├── match/                # MatchScorecard, LiveScoreTicker
│   │   │   ├── prediction/           # PredictionForm, ScenarioCard, TeamPick, PlayerPick, RangePick, YesNoPick
│   │   │   ├── shared/               # EmptyState, ErrorState, TeamBadge, Skeleton, ThemeProvider, PosthogProvider
│   │   │   └── ui/                   # shadcn primitives (Avatar, Button, Card, Dialog, DropdownMenu, Input, Label, Sonner)
│   │   ├── hooks/                    # useAuth, useCountdown, useFeatureFlag, usePosthogIdentify, useRealtime
│   │   ├── lib/
│   │   │   ├── actions/              # Server Actions (admin, auth, groups, notifications, predictions, scenarios, onboarding)
│   │   │   ├── dal/                  # Data Access Layer (groups, matches, members, notifications, players, predictions, scenarios, standings, teams)
│   │   │   ├── cricket-api/          # External API client, parsers, types
│   │   │   ├── posthog/              # Analytics (client, server, events, transport)
│   │   │   ├── supabase/             # Supabase clients (server, client, middleware, get-user-cached)
│   │   │   ├── mock-data/            # Dev mock data (matches.json, scorecards)
│   │   │   ├── constants.ts          # Routes, IPL teams, system scenarios, limits
│   │   │   ├── utils.ts              # cn(), computeDeadline, formatMatchDate, formatMatchTime, etc.
│   │   │   ├── validators.ts         # Zod schemas
│   │   │   ├── on-track-logic.ts     # Live match prediction tracking
│   │   │   ├── scorecard-parser.ts   # Cricket API scorecard parser
│   │   │   ├── logger.ts             # Structured logging
│   │   │   └── env.ts                # Environment variable validation
│   │   ├── test/                     # Test helpers (mock-supabase, setup)
│   │   ├── __mocks__/                # Mock data + handlers for tests/stories
│   │   └── types/                    # database.ts (manual Supabase types), index.ts (app types), cricket-api.ts
│   ├── e2e/                          # Playwright E2E tests
│   ├── .storybook/                   # Storybook config
│   └── public/                       # Static assets (team logos, icons)
├── supabase/
│   ├── migrations/                   # 35 SQL migrations (001-035)
│   ├── migrations_squashed/          # Squashed versions (001-005)
│   ├── functions/                    # Edge Functions (match-cron, match-live, sync-data)
│   ├── seed.sql                      # Seed data
│   └── config.toml                   # Supabase project config
├── api-tester/                       # Cricket API test harness (polling, response samples)
├── docs/                             # Project docs (architecture, requirements, design system, etc.)
└── CLAUDE.md                         # Agent workflow instructions
```

---

## 2. Tech Stack

| Layer              | Technology                  | Version     |
|--------------------|-----------------------------|-------------|
| Framework          | Next.js (App Router)        | 16.2.1      |
| Runtime            | React                       | 19.2.4      |
| Language           | TypeScript                  | ^5          |
| Database           | PostgreSQL via Supabase      | —           |
| Auth               | Supabase Auth (magic link)  | ^2.100.1    |
| SSR Auth           | @supabase/ssr               | ^0.9.0      |
| Styling            | Tailwind CSS v4 + CSS vars  | ^4          |
| Component Library  | shadcn/ui                   | ^4.1.0      |
| Icons              | Lucide React                | ^1.7.0      |
| Validation         | Zod                         | ^4.3.6      |
| Analytics          | PostHog (client + server)   | ^1.364.0    |
| Testing (unit)     | Vitest + Testing Library     | ^4.1.2      |
| Testing (E2E)      | Playwright                  | ^1.58.2     |
| Testing (visual)   | Storybook                   | 8.6         |
| Deploy             | Vercel                      | via vercel.json |
| Dark Mode          | Dark-only design system ("Stadium Kinetic") | — |

**Key Observations**:
- No React Query / TanStack Query. Data fetching is 100% server-side via async Server Components + DAL functions.
- No global state management library. State is either server-rendered or local component state (`useState`).
- Client components are used sparingly, only when interactivity is required (forms, realtime, expandable sections).
- The `useRealtime` hook is the only client-side data fetching pattern — it subscribes to Supabase Realtime Postgres changes.

---

## 3. Database Schema

### 3.1 Core Tables (relevant to this feature)

#### `matches`
The central table. Contains both match metadata and result data in a single wide row.

| Column                    | Type        | Notes                                     |
|---------------------------|-------------|-------------------------------------------|
| `id`                      | SERIAL PK   | Auto-increment                            |
| `match_number`            | INT UNIQUE  | IPL match number                          |
| `team_a`, `team_b`        | TEXT FK→teams| Team codes (e.g., "CSK", "MI")           |
| `date`                    | DATE        | Match date                                |
| `time_ist`                | TIME        | Start time in IST                         |
| `venue`                   | TEXT        | Stadium name                              |
| `status`                  | ENUM        | `upcoming`, `live`, `completed`, `abandoned`, `no_result` |
| `toss_winner`             | TEXT        | Result fields (null until completed)      |
| `match_winner`            | TEXT        |                                           |
| `top_scorer`              | TEXT        |                                           |
| `top_scorer_runs`         | INT         |                                           |
| `top_wicket_taker`        | TEXT        |                                           |
| `top_wicket_taker_wickets`| INT         |                                           |
| `player_of_match`         | TEXT        |                                           |
| `first_innings_score`     | INT         |                                           |
| `total_match_runs`        | INT         |                                           |
| `total_match_sixes`       | INT         |                                           |
| `powerplay_score`         | INT         |                                           |
| `powerplay_wickets`       | INT         |                                           |
| `had_super_over`          | BOOLEAN     |                                           |
| `current_score_a/b`       | TEXT        | Live score text (e.g., "145/3")           |
| `current_overs_a/b`       | DECIMAL     | Current overs                             |
| `current_batting_team`    | TEXT        | Which team is batting                     |
| `live_scorecard_json`     | JSONB       | Full scorecard from API                   |
| `resolved_at`             | TIMESTAMPTZ | Set when results are entered              |

**RLS**: Public read (`USING (true)`) — everyone can see all matches.

**Key for this feature**: The `status` column and the result fields (`match_winner`, scores, etc.) are already populated when a match is marked `completed`. We have everything we need to display completed match results.

#### `scenarios`
Prediction questions (system-generated + custom).

| Column             | Type        | Notes                                    |
|--------------------|-------------|------------------------------------------|
| `id`               | UUID PK     |                                          |
| `group_id`         | UUID FK     | Scoped to a group                        |
| `match_id`         | INT FK      | Linked to a match                        |
| `type`             | ENUM        | `system` or `custom`                     |
| `system_category`  | TEXT        | e.g., `match_winner`, `toss_winner`      |
| `title`            | TEXT        | The question text                        |
| `options`          | JSONB       | Possible answers                         |
| `correct_answer`   | TEXT        | Set during resolution                    |
| `points`           | INT         | 5, 10, 15, 20, or 25                    |
| `is_resolved`      | BOOLEAN     | True after resolution                    |
| `approval_status`  | ENUM        | `auto_approved`, `pending`, `approved`, `rejected` |

#### `predictions`
User predictions against scenarios.

| Column          | Type        | Notes                                    |
|-----------------|-------------|------------------------------------------|
| `id`            | UUID PK     |                                          |
| `user_id`       | UUID FK     |                                          |
| `scenario_id`   | UUID FK     |                                          |
| `value`         | TEXT        | The user's pick                          |
| `is_correct`    | BOOLEAN     | Null until resolved, then true/false     |
| `points_earned` | INT         | 0 until resolved, then scenario.points if correct |
| UNIQUE          |             | `(user_id, scenario_id)`                 |

#### `match_group_settings`
Per-group, per-match settings.

| Column                | Type        | Notes                          |
|-----------------------|-------------|--------------------------------|
| `group_id`            | UUID FK     | Composite PK with match_id    |
| `match_id`            | INT FK      |                                |
| `prediction_deadline`  | TIMESTAMPTZ | Custom deadline override       |
| `is_locked`           | BOOLEAN     | Admin manual lock              |
| `scenarios_published` | BOOLEAN     | Whether scenarios are published|

#### `groups`, `group_members`, `profiles`
Standard group/membership tables. `group_members` has composite PK `(group_id, user_id)` with `status` (pending/approved/rejected/removed) and `role` (owner/admin/member).

### 3.2 Views

#### `season_standings`
Aggregates per-user season totals: `total_points`, `matches_predicted`, `accuracy_pct`, `rank`. Partitioned by `group_id`.

#### `match_leaderboard`
Aggregates per-user per-match totals: `match_points`, `correct_count`, `resolved_count`, `predicted_count`, `rank`. Partitioned by `(group_id, match_id)`.

**Key for this feature**: The `match_leaderboard` view already computes everything needed to show a user's match performance summary — we can query it for completed matches to show "Your Score: X pts, Y/Z correct".

### 3.3 Key Functions

| Function                        | Purpose                                                |
|---------------------------------|--------------------------------------------------------|
| `resolve_match_predictions`     | Auto-scores all predictions for a match based on results |
| `seed_system_scenarios`         | Creates 16 system scenarios for a group+match          |
| `void_abandoned_match`          | Zeros out unresolved predictions for abandoned matches |
| `get_members_who_predicted`     | Returns user IDs who predicted (no value leak)         |
| `is_group_member` / `is_group_admin` | SECURITY DEFINER helpers for RLS policies        |

---

## 4. Current Group Page Implementation

**File**: `web-app/src/app/group/[groupId]/page.tsx`

### 4.1 Data Fetching

The group page is a **Server Component**. It fetches data in parallel using `Promise.all`:

```typescript
const [group, members, membership, upcomingMatches] = await Promise.all([
  groupsDal.getGroupById(groupId),
  membersDal.getMembers(groupId),
  membersDal.getMembershipStatus(groupId, user.id),
  matchesDal.getUpcomingMatches(3),  // <-- Only fetches upcoming+live matches
]);
```

It then conditionally fetches prediction status for the first match:
```typescript
const predictedUserIds = upcomingMatches.length > 0
  ? await predictionsDal.getMembersWhoPredicted(groupId, upcomingMatches[0].id)
  : [];
```

### 4.2 What Gets Rendered

The page renders three sections:
1. **Group header** — name, member count, invite link, admin button
2. **Matches section** — upcoming + live only (no completed matches)
3. **Member list** — "The Squad"

### 4.3 Match Card Rendering (Inline, Not a Separate Component)

Match cards are rendered inline inside the page using a `.map()` over `upcomingMatches`. There is **no reusable `<MatchCard>` component** — the card UI is embedded directly in the page.

Each card shows:
- **Status indicator**: "Live" (with animated pulse dot) or "Next Match" / "Match N"
- **Match info**: For live matches, a `<MatchScorecard>` component is used. For upcoming, it shows team names, match number, date, time, venue as text.
- **CTA button**: "View Leaderboard" (live) or "Make Your Calls" / "Predict Early" (upcoming)
- **Deadline text**: "Predictions close at X IST" (upcoming) or "Match is live" (live)
- **Prediction status pills**: For the primary match, shows which members have/haven't predicted

### 4.4 Key Pattern: `getUpcomingMatches()`

The DAL function `getUpcomingMatches()` explicitly filters to `status IN ('upcoming', 'live')` and `date >= today`. This means **completed matches are never fetched** for the group page.

---

## 5. How Match Status Is Determined

### 5.1 Status Enum Values
```sql
CREATE TYPE match_status AS ENUM ('upcoming', 'live', 'completed', 'abandoned', 'no_result');
```

### 5.2 Status Transitions
1. **upcoming -> live**: Set by the `match-cron` edge function when match start time arrives (or manually via admin API polling).
2. **live -> completed**: Set by `matchesDal.updateMatchResults()` when admin enters results. This also sets `resolved_at`.
3. **live -> abandoned**: Set by `void_abandoned_match()` DB function.

### 5.3 Status Checks in Code
- `match.status === "live"` — used in group page for live card rendering
- `match.status === "upcoming"` — used in predict page for seed + lock logic
- `match.status === "completed"` — used in `MatchScorecard` component for result display header, and in `getLastCompletedMatch()` DAL function
- Status check for predictions RLS: `m.status IN ('live', 'completed', 'abandoned', 'no_result')` allows reading others' predictions

---

## 6. Data Fetching Patterns

### 6.1 Server-Side (Primary Pattern)
All page data is fetched in Server Components using the DAL layer:

```
Page (Server Component)
  └── calls DAL function (e.g., matchesDal.getUpcomingMatches)
        └── uses createClient() from @/lib/supabase/server
              └── creates Supabase server client with cookie-based auth
```

**Auth caching**: `getAuthUser()` is wrapped in `React.cache()` — deduplicates auth calls within a single request.

**Parallel fetching**: Pages consistently use `Promise.all()` for independent queries.

### 6.2 Server Actions (Mutations)
All mutations go through Server Actions in `src/lib/actions/`:
- Marked with `"use server"`
- Validate input with Zod
- Check auth + authorization
- Call DAL functions
- Call `revalidatePath()` to refresh server-rendered data
- Return `ActionResponse<T>` type

### 6.3 Client-Side (Minimal)
Only two patterns exist:
1. **`useRealtime` hook**: Subscribes to Supabase Postgres changes for live updates (used in `LiveScoreTicker`).
2. **`ExpandablePicks` component**: On-demand client-side fetch via Supabase browser client when user expands a picks section (used in match leaderboard).

### 6.4 No React Query
The project does not use React Query or any client-side caching library. This is a deliberate architectural choice — the app relies on Server Component streaming and `revalidatePath()` for data freshness.

---

## 7. Existing UI Component Patterns for Match Display

### 7.1 `MatchScorecard` (Server Component)
**File**: `src/components/match/match-scorecard.tsx`

Already handles `completed` status. Props:
```typescript
interface MatchScorecardProps {
  teamA: string; teamB: string;
  scoreA: string | null; scoreB: string | null;
  oversA: number | null; oversB: number | null;
  battingTeam: string | null;
  tossWinner: string | null;
  matchWinner: string | null;
  statusInfo: string | null;  // Result text for completed matches
  status: string;
  compact?: boolean;
}
```

Has a `compact` mode (used in group page inline cards). For `status === "completed"`, it shows `statusInfo` in success color and the final scores via `ScoreRow` sub-component.

**Currently used in**: Group page (live matches), Match leaderboard page (any status).

### 7.2 `TeamBadge`
Renders a colored circle with team code. Sizes: `sm` (32px), `md` (44px), `lg` (56px). Used throughout the app.

### 7.3 `PredictionStatusPill`
Status indicator pill showing "Nailed It", "Missed", "On Track", "Sweating", "In Play". Has `compact` mode that hides label text.

### 7.4 `ExpandablePicks`
Client component that lazily loads a user's predictions for a match when toggled open. Shows each scenario with the user's pick, correct answer, and status pill.

### 7.5 `MatchLeaderboard`
Table component showing per-match rankings with rank, name, correct/resolved ratio, predicted count, and points.

### 7.6 Design System Notes
- Dark-only theme ("Stadium Kinetic")
- Card backgrounds: `bg-card-gradient` or `bg-[var(--bg-card)]`
- Rounded corners: `rounded-xl` (12px) for cards, `rounded-[14px]` or `rounded-[20px]` for larger containers
- Font families: `font-display` (Space Grotesk for headings), `font-stats` (for numbers), default sans (Manrope)
- Status colors: `--success` (green #34D399), `--danger` (red #F87171), `--cyan` (lime #f3ffca), `--gold`/`--tertiary` (orange #ff7948)
- Border style: `border-[var(--border-light)]` (transparent by default, ghost borders)

---

## 8. Existing Scoring / Results Display Logic

### 8.1 Result Entry Flow
1. Admin navigates to `/group/[groupId]/admin`
2. `ResultEntryForm` client component renders a form with all result fields
3. On submit, calls `enterResults()` server action
4. Server action: validates with Zod, updates match row via `matchesDal.updateMatchResults()` (sets status to "completed", populates result fields, sets `resolved_at`)
5. Then calls `matchesDal.resolveMatchPredictions()` which invokes the `resolve_match_predictions` DB function
6. The DB function iterates all scenarios for the match, determines correct answers from match result data, and updates `predictions.is_correct` and `predictions.points_earned`

### 8.2 Results Viewing (Existing)
- **Match leaderboard page** (`/group/[groupId]/match/[matchId]`): Shows `MatchScorecard` + `MatchLeaderboard`. Works for any match status.
- **Expandable picks**: On the match leaderboard, users can expand each entry to see individual predictions with results.
- **Season standings** (`/group/[groupId]/standings`): Aggregated view across all matches.

### 8.3 What's Missing
The group home page currently shows **zero information about completed matches**. Once a match moves to `completed`, it disappears from the group page entirely. Users must navigate to the standings page or manually construct a match leaderboard URL to see past results.

---

## 9. Existing Relevant DAL Functions

### Already Available
| Function | File | What It Returns |
|----------|------|-----------------|
| `getUpcomingMatches(limit)` | `dal/matches.ts` | Matches with status `upcoming` or `live`, date >= today |
| `getLastCompletedMatch()` | `dal/matches.ts` | Single most recent completed match (all fields) |
| `getMatchById(matchId)` | `dal/matches.ts` | Full match row including all result fields |
| `getMatchLeaderboard(groupId, matchId)` | `dal/standings.ts` | Per-user match points, correct counts, rank |
| `getSeasonStandings(groupId)` | `dal/standings.ts` | Aggregated season standings |
| `getMembersWhoPredicted(groupId, matchId)` | `dal/predictions.ts` | User IDs who have predictions |

### Will Need to Be Created
| Function | Purpose |
|----------|---------|
| `getCompletedMatches(limit)` or `getRecentCompletedMatches(limit)` | Fetch N most recently completed matches with result data |

---

## 10. API Surface (Routes)

All data flows through Server Components and Server Actions. No traditional REST API routes exist in the app (except the auth callback).

| Route Pattern | Type | Purpose |
|---------------|------|---------|
| `/auth/callback` | Route Handler | OAuth callback |
| `/dashboard` | Server Page | Group list |
| `/group/[groupId]` | Server Page | **Group home (target for this feature)** |
| `/group/[groupId]/match/[matchId]` | Server Page | Match leaderboard |
| `/group/[groupId]/predict/[matchId]` | Server Page | Prediction form |
| `/group/[groupId]/scenarios/[matchId]` | Server Page | Scenario editor (admin) |
| `/group/[groupId]/standings` | Server Page | Season standings |
| `/group/[groupId]/admin` | Server Page | Admin panel |
| `lib/actions/admin.ts` | Server Actions | `enterResults()`, `updateGroupSettings()` |
| `lib/actions/predictions.ts` | Server Actions | `submitPredictions()` |
| `lib/actions/groups.ts` | Server Actions | `createGroup()`, `joinGroup()` |

---

## 11. Architecture Patterns Summary

1. **Server-first rendering**: Pages are async Server Components. Client components are used only for interactivity.
2. **DAL pattern**: All database access goes through `src/lib/dal/` modules. No direct Supabase calls from components or pages.
3. **Server Actions for mutations**: All writes use `"use server"` actions with Zod validation, auth checks, and `revalidatePath()`.
4. **Supabase clients**: Server components use `createServerClient` (cookie-based), client components use `createBrowserClient`. Auth is cached per-request via `React.cache()`.
5. **No client caching**: No React Query, no SWR. Data freshness relies on server re-rendering and `revalidatePath()`.
6. **RLS everywhere**: Every table has RLS policies. Matches are publicly readable; predictions are scoped by group membership and deadline logic.
7. **Parallel data fetching**: Consistent use of `Promise.all()` for independent queries.

---

## 12. Risks & Tech Debt

1. **Match cards are inline, not componentized**: The group page embeds match card markup directly in the `.map()` loop. This will need to be refactored if we add different card variants (upcoming vs completed) — or we build a new component.
2. **No `getCompletedMatches()` DAL function exists**: The closest is `getLastCompletedMatch()` which returns only one. A new function is needed.
3. **TypeScript types are manual**: The `database.ts` types are hand-written, not generated from Supabase. The `MatchWithResults` type in `types/index.ts` already models a match with result fields but is not used anywhere in the group page.
4. **`MatchScorecard` only partially supports completed state**: It handles `isCompleted` but never receives a meaningful `statusInfo` prop (always passed as `null` in current code). The `matchWinner` prop is used for the completed state but the win message is not rendered.
5. **No match-specific result summary component**: There's no component that shows a compact "CSK won by 5 wickets" style result badge — this would need to be created.

---

## 13. Code Areas to Modify for Completed Matches Feature

### Must Modify

| File | What Needs to Change |
|------|---------------------|
| `src/app/group/[groupId]/page.tsx` | Add data fetching for completed matches. Add a "Past Matches" / "Results" section below the upcoming matches section. |
| `src/lib/dal/matches.ts` | Add `getRecentCompletedMatches(limit)` function that queries matches with `status = 'completed'`, ordered by date DESC. |

### Should Create

| File | Purpose |
|------|---------|
| `src/components/match/completed-match-card.tsx` (or similar) | Reusable card component for displaying a completed match result with winner, score summary, and link to match leaderboard. Alternatively, refactor the existing inline card into a generic `<MatchCard>` with variants. |

### May Modify

| File | What Might Change |
|------|-------------------|
| `src/components/match/match-scorecard.tsx` | May need to pass `statusInfo` properly (e.g., "CSK won by 5 wickets") for completed state, or add a result summary mode. |
| `src/lib/dal/standings.ts` | If we want to show the current user's score/rank for each completed match on the group page, we may need a batch leaderboard query (fetch leaderboard entries for multiple matches at once to avoid N+1). |
| `src/types/index.ts` | The `MatchWithResults` type exists but may need extensions (e.g., adding `current_score_a/b` for displaying final scores). |
| `src/lib/constants.ts` | May need to add new route helpers if completed matches get their own sub-route. |

### Will NOT Need to Modify

| Area | Reason |
|------|--------|
| Database schema | All result data is already stored in the `matches` table. The `match_leaderboard` view already computes per-match scores. No new tables or columns needed. |
| RLS policies | Matches are publicly readable. Predictions for completed matches are already visible to group members (deadline has passed). |
| Server Actions | No new mutations are needed for displaying results. |
| Auth flow | No changes needed. |
| Supabase Edge Functions | No changes needed. |

---

## 14. Data Available for Completed Match Display

When a match has `status = 'completed'`, the following fields are populated:

**From `matches` table**:
- `match_winner` — winning team code
- `toss_winner` — toss winning team
- `current_score_a`, `current_score_b` — final score text (e.g., "186/4")
- `current_overs_a`, `current_overs_b` — final overs (20.0 typically)
- `top_scorer`, `top_scorer_runs` — best batsman
- `top_wicket_taker`, `top_wicket_taker_wickets` — best bowler
- `player_of_match` — MoM
- `first_innings_score`, `total_match_runs`, `total_match_sixes` — aggregate stats
- `resolved_at` — when results were entered

**From `match_leaderboard` view** (per group):
- Each user's `match_points`, `correct_count`, `resolved_count`, `rank`

**From `predictions` table** (per user per scenario):
- `value` — what they predicted
- `is_correct` — whether it was right
- `points_earned` — points won

This data is sufficient to build a rich completed match card showing: winner, final scores, user's rank + points, and optionally a breakdown of their picks.
