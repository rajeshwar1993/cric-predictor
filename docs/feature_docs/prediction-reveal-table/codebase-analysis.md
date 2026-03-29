# Codebase Analysis
**Date**: 2026-03-29
**Analyst**: PSE Agent
**Feature**: Prediction Reveal Table

---

## Project Structure

```
cric-predictor/
├── web-app/                          # Next.js 16 application
│   ├── src/
│   │   ├── app/                      # App Router pages
│   │   │   ├── auth/callback/        # Supabase auth callback
│   │   │   ├── dashboard/            # User dashboard (list of groups)
│   │   │   ├── group/[groupId]/      # Group root + layout (auth guard)
│   │   │   │   ├── admin/            # Admin panel (members, scenarios, results)
│   │   │   │   ├── match/[matchId]/  # ** MATCH LEADERBOARD PAGE **
│   │   │   │   ├── predict/[matchId]/# Prediction form page
│   │   │   │   ├── scenarios/[matchId]/ # Scenario management
│   │   │   │   └── standings/        # Season standings
│   │   │   ├── join/[code]/          # Invite-code join flow
│   │   │   ├── login/                # Magic link login
│   │   │   ├── onboarding/           # First-time user setup
│   │   │   └── layout.tsx            # Root layout (fonts, providers)
│   │   ├── components/
│   │   │   ├── admin/                # Admin-only components
│   │   │   ├── auth/                 # Login/onboarding forms
│   │   │   ├── group/                # Group cards, member list, invite
│   │   │   ├── layout/               # Header, footer, notification bell
│   │   │   ├── leaderboard/          # ** MATCH LEADERBOARD + EXPANDABLE PICKS **
│   │   │   ├── match/                # Match scorecard, live scores
│   │   │   ├── prediction/           # Scenario cards, pick inputs
│   │   │   ├── shared/               # Empty/error states, providers
│   │   │   └── ui/                   # Primitives (button, card, dialog, input)
│   │   ├── hooks/                    # Custom hooks (auth, countdown, polling, realtime)
│   │   ├── lib/
│   │   │   ├── actions/              # Server Actions (mutations)
│   │   │   ├── dal/                  # Data Access Layer (read queries)
│   │   │   ├── cricket-api/          # External cricket API integration
│   │   │   ├── posthog/              # Analytics
│   │   │   ├── supabase/             # Client/server Supabase setup
│   │   │   ├── constants.ts          # Routes, team data, scenario configs
│   │   │   ├── utils.ts              # cn(), deadline logic, formatters
│   │   │   └── on-track-logic.ts     # Live "on track" status computation
│   │   ├── types/
│   │   │   ├── database.ts           # Manual Supabase schema types
│   │   │   └── index.ts              # Application-level type interfaces
│   │   └── test/                     # Test helpers
│   └── package.json
├── supabase/
│   ├── migrations/                   # 001 through 035 SQL migrations
│   ├── migrations_squashed/          # Consolidated baseline
│   ├── functions/                    # Edge Functions (sync-data, match-cron, match-live)
│   ├── config.toml
│   └── seed.sql
├── api-tester/                       # Standalone API testing utility
├── docs/                             # Architecture docs, design specs
└── CLAUDE.md                         # Agent workflow config
```

## Tech Stack

| Layer              | Technology                                | Version      |
| ------------------ | ----------------------------------------- | ------------ |
| Framework          | Next.js (App Router)                      | 16.2.1       |
| React              | React                                     | 19.2.4       |
| Language           | TypeScript                                | ^5           |
| Database           | PostgreSQL via Supabase                   | (hosted)     |
| Auth               | Supabase Auth (magic link)                | via @supabase/ssr 0.9 |
| Styling            | Tailwind CSS v4 + CSS custom properties   | ^4           |
| UI Primitives      | Custom components + shadcn patterns       | -            |
| Icons              | lucide-react                              | ^1.7.0       |
| Validation         | zod                                       | ^4.3.6       |
| Analytics          | PostHog                                   | ^1.364.0     |
| Testing            | Vitest + Testing Library + Playwright     | vitest ^4.1.2|
| Storybook          | Storybook                                 | 8.6          |
| State Management   | Server-first (no client store); direct Supabase calls from client components |  |

**Key observation**: No React Query / SWR / Zustand. Data fetching is done:
- **Server components**: via DAL functions (`lib/dal/*.ts`) that call `createClient()` from `@supabase/ssr` server client.
- **Client components**: via direct Supabase browser client calls (e.g., `ExpandablePicks` creates a browser client and queries directly).

## Database Schema

### Core Tables (Feature-Relevant)

#### `predictions`
```sql
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  scenario_id UUID NOT NULL REFERENCES scenarios(id),
  value TEXT NOT NULL,               -- The user's pick (free text or option value)
  is_correct BOOLEAN,                -- NULL = pending, true = correct, false = wrong
  points_earned INT DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, scenario_id)      -- One prediction per user per scenario
);
```

#### `scenarios`
```sql
CREATE TABLE scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id),
  match_id INT NOT NULL REFERENCES matches(id),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type scenario_type NOT NULL DEFAULT 'custom',    -- 'system' | 'custom'
  system_category TEXT,              -- e.g. 'match_winner', 'toss_winner', etc.
  title TEXT NOT NULL,               -- Display question text
  description TEXT,
  options JSONB NOT NULL DEFAULT '[]', -- Array of option strings
  correct_answer TEXT,               -- Set when resolved
  points INT NOT NULL DEFAULT 10,    -- CHECK (points IN (5,10,15,20,25))
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  approval_status scenario_approval NOT NULL DEFAULT 'pending',
  is_removed BOOLEAN NOT NULL DEFAULT false,
  removed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Partial unique: one system scenario per category per group per match
CREATE UNIQUE INDEX uniq_system_scenario ON scenarios(group_id, match_id, system_category)
  WHERE system_category IS NOT NULL;
```

#### `group_members`
```sql
CREATE TABLE group_members (
  group_id UUID NOT NULL REFERENCES groups(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  status member_status NOT NULL DEFAULT 'pending',  -- 'pending'|'approved'|'rejected'|'removed'
  role member_role NOT NULL DEFAULT 'member',        -- 'owner'|'admin'|'member'
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  PRIMARY KEY (group_id, user_id)
);
```

#### `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `matches`
```sql
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  match_number INT NOT NULL UNIQUE,
  team_a TEXT NOT NULL REFERENCES teams(code),
  team_b TEXT NOT NULL REFERENCES teams(code),
  date DATE NOT NULL,
  time_ist TIME NOT NULL,
  venue TEXT NOT NULL,
  status match_status NOT NULL DEFAULT 'upcoming',  -- 'upcoming'|'live'|'completed'|'abandoned'|'no_result'
  -- ... result fields (toss_winner, match_winner, top_scorer, etc.)
  -- ... live score fields (current_score_a/b, current_overs_a/b, etc.)
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `match_group_settings`
```sql
CREATE TABLE match_group_settings (
  group_id UUID NOT NULL REFERENCES groups(id),
  match_id INT NOT NULL REFERENCES matches(id),
  prediction_deadline TIMESTAMPTZ,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  scenarios_published BOOLEAN NOT NULL DEFAULT false,   -- Added in migration 008
  PRIMARY KEY (group_id, match_id)
);
```

### Views

#### `match_leaderboard`
Aggregates predictions per user per match per group:
- `group_id`, `match_id`, `user_id`, `display_name`
- `predicted_count`, `correct_count`, `resolved_count`, `match_points`
- `rank` (window function ordered by points DESC, earliest_submission ASC)

#### `season_standings`
Aggregates across all matches for a group.

### Key Relationships

```
groups ─┬── group_members ──── profiles
        │
        ├── scenarios ──────── predictions (user_id → profiles)
        │       │
        │       └── match_id → matches
        │
        └── match_group_settings ── matches
```

**Scenario → Prediction path**: `scenarios.group_id + scenarios.match_id` scopes scenarios per group per match. Each prediction references a `scenario_id` and a `user_id`. The composite `UNIQUE(user_id, scenario_id)` constraint ensures one prediction per user per scenario.

## RLS Policies (Predictions Table — Critical for This Feature)

### Current Policies on `predictions`

1. **`read_own_predictions`**: `auth.uid() = user_id`
   - Users can always see their own predictions.

2. **`read_others_after_deadline`**: Complex check that allows reading OTHER users' predictions ONLY when:
   - The current user is a group member (`is_group_member(s.group_id, auth.uid())`)
   - AND one of:
     - Match status is `live`, `completed`, `abandoned`, or `no_result`
     - OR `match_group_settings.is_locked = true`
     - OR current time is past the prediction deadline (custom or default 45min before match)

3. **`insert_own_prediction`**: Auth + group membership + match upcoming + not locked + scenarios published + before deadline.

4. **`update_own_prediction`**: Auth + group membership + match upcoming + not locked + before deadline.

**Implication for Prediction Reveal Table**: The RLS already supports the feature. After the prediction deadline passes (or match goes live/completed), group members CAN read each other's predictions. No new RLS policies are needed for reading. The existing `read_others_after_deadline` policy covers the "reveal after lock" requirement.

## API Surface

### Server Actions (Mutations)
Located in `src/lib/actions/`:
- `predictions.ts` — `submitPredictions()`, validates + upserts via DAL
- `scenarios.ts` — Create/approve/reject/remove scenarios
- `groups.ts` — Create group, join group
- `admin.ts` — Approve/reject members, update results, resolve predictions
- `auth.ts` — Magic link login, signout
- `notifications.ts` — Mark as read

### Data Access Layer (Read Queries)
Located in `src/lib/dal/`:
- `predictions.ts` — `getPredictionsForUser()`, `getPredictionsForScenario()`, `getMembersWhoPredicted()`
- `scenarios.ts` — `getScenariosForMatch()`, `getScenarioCountForMatch()`
- `standings.ts` — `getMatchLeaderboard()`, `getSeasonStandings()`, `getUserMatchPredictionSummaries()`
- `members.ts` — `getMembers()`, `getMembershipStatus()`
- `matches.ts` — `getMatchById()`, `getMatchGroupSettings()`

### RPC Functions
- `seed_system_scenarios(p_group_id, p_match_id)` — Idempotent scenario creation
- `resolve_match_predictions(p_match_id)` — Sets `is_correct` and `points_earned`
- `get_members_who_predicted(p_group_id, p_match_id)` — Returns user IDs (SECURITY DEFINER)

## Architecture Patterns

### Data Fetching Pattern
- **Server components** use DAL functions which call `createClient()` (server). Data is fetched at render time and passed as props. No caching layer beyond React's request-level deduplication (`cache()`).
- **Client components** (when dynamic data is needed) create a Supabase browser client and query directly. Example: `ExpandablePicks` component fetches scenarios + predictions on click.
- **No React Query / SWR**. No global client state store.

### Component Pattern
- Server Components are the default. `'use client'` only where interactivity is needed.
- Components receive typed props. No context providers for data (only for theme, PostHog).
- Styling uses Tailwind CSS v4 utility classes with CSS custom properties for the design system ("Stadium Kinetic"). The `cn()` helper merges class names via `clsx` + `tailwind-merge`.

### Existing "Expandable Picks" Pattern
`ExpandablePicks` (client component in `components/leaderboard/`) already shows a single user's picks when expanded. It:
1. Takes `userId`, `groupId`, `matchId` as props
2. On toggle, fetches scenarios for the group+match, then fetches that user's predictions
3. Renders each scenario with the user's pick value and a `PredictionStatusPill` (correct/wrong/pending)

This is the closest existing pattern to the Prediction Reveal Table, but it shows **one user at a time**. The new feature needs to show **all users x all scenarios** in a matrix.

### Color Coding (Status)
`PredictionStatusPill` uses `TrackStatus` type: `"correct" | "wrong" | "on_track" | "in_danger" | "pending"`. For the reveal table:
- **Green** (`--success`, #34D399): `is_correct === true`
- **Red** (`--danger`, #F87171): `is_correct === false`
- **Yellow/Pending** (`--pending`, #64748B OR `--warning`, #ff7948): `is_correct === null`

### Auth & Authorization
- Auth via Supabase magic link (email-based, no password).
- Group layout (`group/[groupId]/layout.tsx`) verifies auth and approved membership before rendering any child page.
- RLS handles row-level data access. Server actions double-check via DAL.

## Match Page — Current Structure

**Route**: `/group/[groupId]/match/[matchId]/page.tsx`

**Current layout**:
```
┌─────────────────────────────────┐
│ ← Back to squad                 │
├─────────────────────────────────┤
│ Match Header Card               │
│ ┌─────────────────────────────┐ │
│ │ Match {n}                   │ │
│ │ LiveMatchScorecard          │ │
│ │ Date · Time · Venue         │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ Match Leaderboard               │
│ ┌─────────────────────────────┐ │
│ │ # | Player | Correct | Pts  │ │
│ │ 1 | Alice  | 5/8     | 45  │ │
│ │ 2 | Bob    | 4/8     | 35  │ │
│ └─────────────────────────────┘ │
│                                 │
│ ** PREDICTION REVEAL TABLE **   │
│ ** GOES HERE (below leaderboard)│
└─────────────────────────────────┘
```

The page is a **server component**. It fetches:
1. Match details via `matchesDal.getMatchById(matchId)`
2. Leaderboard via `standingsDal.getMatchLeaderboard(groupId, matchId)`

Then renders:
1. Back link
2. Match header card with `LiveMatchScorecard`
3. `<MatchLeaderboard entries={leaderboard} currentUserId={user.id} />`

**Integration point**: The Prediction Reveal Table should be added as a new component rendered AFTER the `<MatchLeaderboard>` in this page. The page already has `groupId`, `matchId`, and `user.id` available.

## Prediction Model — How Predictions Are Stored, Fetched, and Resolved

### Storage
- One row per `(user_id, scenario_id)` in `predictions` table.
- `value` is the user's selected option (text).
- `is_correct` is `NULL` until resolution, then `true` or `false`.
- `points_earned` is `0` until resolution, then scenario's `points` value if correct.

### Fetching
- `getPredictionsForUser(userId, scenarioIds)` — Gets one user's predictions for a list of scenarios.
- `getPredictionsForScenario(scenarioId)` — Gets all users' predictions for one scenario.
- For the reveal table, we need: **all predictions for all approved scenarios in a group+match** (all users). Neither existing DAL function directly provides this. A new query or approach is needed.

### Resolution
- `resolve_match_predictions(p_match_id)` — PL/pgSQL function (SECURITY DEFINER) that:
  1. Iterates all scenarios for the match
  2. Determines `correct_answer` from match result fields based on `system_category`
  3. Updates `scenarios.correct_answer` and `scenarios.is_resolved`
  4. Updates `predictions.is_correct` and `predictions.points_earned`
- Custom scenarios require manual resolution by admin (sets `correct_answer` directly).

### Visibility Timeline
1. **Before deadline**: Only the user can see their own predictions (`read_own_predictions` policy).
2. **After deadline / match live / match completed**: All group members can see all predictions (`read_others_after_deadline` policy).
3. This aligns perfectly with the "Prediction Reveal Table" visibility requirement.

## Scenario Model

### Scenario Types
- **System** (`type = 'system'`): Auto-created via `seed_system_scenarios()`. 16 categories (match_winner, toss_winner, top_scorer, etc.). Auto-approved.
- **Custom** (`type = 'custom'`): Created by members, require admin approval.

### Scenario Lifecycle
1. Admin publishes scenarios for a match (`match_group_settings.scenarios_published = true`)
2. System scenarios are seeded (idempotent)
3. Members submit predictions before deadline
4. Deadline passes / match goes live → predictions locked
5. Match completes → `resolve_match_predictions()` sets `correct_answer`, `is_correct`, `points_earned`

### Scenario-to-Match Mapping
Each scenario belongs to exactly one `(group_id, match_id)` pair. The partial unique index `uniq_system_scenario` prevents duplicate system scenarios per group per match.

## Supabase Configuration

### Migrations Directory
`supabase/migrations/` — 35 sequential SQL files (001 through 035). Key ones:
- `001_initial_schema.sql` — All tables, enums, indexes
- `002_views_functions.sql` — Views (season_standings, match_leaderboard), functions (resolve, seed, helpers)
- `003_rls_policies.sql` — All RLS policies
- `008_scenario_publishing.sql` — Added `scenarios_published` to match_group_settings
- `009_rls_audit_fixes.sql` — Hardened all RLS policies
- `017-019` — Prediction RLS fixes (group membership check, scenarios_published check)
- `035_prediction_status_function.sql` — `get_members_who_predicted()` RPC

### Types
`src/types/database.ts` — Manually maintained (not auto-generated). Contains full `Database` interface with `Tables`, `Views`, `Functions`, `Enums`.

### Client Setup
- **Server**: `src/lib/supabase/server.ts` — `createServerClient()` from `@supabase/ssr`, uses `cookies()`.
- **Browser**: `src/lib/supabase/client.ts` — `createBrowserClient()` from `@supabase/ssr`.
- **Auth caching**: `src/lib/supabase/get-user-cached.ts` — `React.cache()` wrapper around `supabase.auth.getUser()`.

### Edge Functions
- `sync-data/` — Syncs match and player data from external cricket API
- `match-cron/` — Periodic match status check
- `match-live/` — Live score polling

## Risks & Tech Debt

1. **No auto-generated types**: `database.ts` is manually maintained. Schema drift is possible. The `TODO` comments in both client files confirm this.
2. **No React Query / caching layer**: Client components make raw Supabase calls. For the reveal table, if implemented as a client component, there's no automatic caching or deduplication.
3. **ExpandablePicks queries per-user**: The existing pattern fetches predictions one user at a time. The reveal table should fetch ALL predictions in a single query to avoid N+1.
4. **match_leaderboard view only returns users who HAVE predictions**: Users who joined the group but made zero predictions for a match won't appear. The reveal table should include them (with empty cells).

## Relevant to Current Feature: Prediction Reveal Table

### What Needs to Happen

**Data requirements**:
- All approved group members (from `group_members` + `profiles`)
- All approved/auto-approved, non-removed scenarios for the group+match (from `scenarios`)
- All predictions for those scenarios (from `predictions`) — already visible after deadline via RLS
- Match status to determine if we should show the table (only after deadline/lock)

**New DAL function needed**:
A query that fetches all predictions for a group+match in one call:
```
SELECT p.user_id, p.scenario_id, p.value, p.is_correct, p.points_earned
FROM predictions p
JOIN scenarios s ON s.id = p.scenario_id
WHERE s.group_id = ? AND s.match_id = ?
  AND s.is_removed = false
  AND s.approval_status IN ('auto_approved', 'approved')
```
RLS will enforce visibility (returns empty for pre-deadline, full data post-deadline).

**No new RLS policies needed**: `read_others_after_deadline` already grants access to group members after the deadline.

**No new database tables or columns needed**: All required data exists.

**Component location**: New component in `src/components/leaderboard/` (alongside match-leaderboard and expandable-picks). Rendered in `/group/[groupId]/match/[matchId]/page.tsx` below `<MatchLeaderboard>`.

**Visibility condition**: Show the table only when:
- Match status is `live`, `completed`, `abandoned`, or `no_result`
- OR `match_group_settings.is_locked === true`
- OR current time is past the prediction deadline

**Color coding mapping**:
- `is_correct === true` → green (`--success`)
- `is_correct === false` → red (`--danger`)
- `is_correct === null` → yellow/amber (`--warning`) for pending/unresolved
- No prediction submitted → gray (`--text-muted`) or dash

### Files That Will Be Modified or Created

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/dal/predictions.ts` | Modify | Add `getAllPredictionsForMatch(groupId, matchId)` |
| `src/components/leaderboard/prediction-reveal-table.tsx` | Create | New matrix component |
| `src/app/group/[groupId]/match/[matchId]/page.tsx` | Modify | Import + render reveal table below leaderboard |
| `src/types/index.ts` | Modify (possibly) | Add type for reveal table data if needed |

### Architectural Considerations

1. **Server vs Client component**: The table can be a server component if we fetch all data at page render time. This is preferable since the data doesn't change frequently and avoids client-side Supabase calls. The match page is already a server component.

2. **Horizontal scrolling**: With 16 system scenarios as columns, the table will need horizontal scroll on mobile. Consider scenario grouping or abbreviations.

3. **Performance**: For 10 members x 16 scenarios = 160 cells. This is a small dataset. A single query joining scenarios + predictions is efficient. No pagination needed.

4. **Deadline check on server**: The page should compute whether the deadline has passed and conditionally render the table. The `computeDeadline()` utility in `utils.ts` and `match_group_settings` provide this.
