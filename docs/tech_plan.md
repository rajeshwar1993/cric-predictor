# Bragg — Technical Plan

**Stack:** Next.js 16.2 + React 19.2 + TypeScript 5.8+ + Tailwind CSS v4 + Supabase + api-cricket.com API
**Hosting:** Vercel (free tier) + Supabase (free → Pro if needed)

---

## 1. Next.js 16.2 — Project Structure & File Map

### 1.1 Complete File Structure

```
web-app/
├── proxy.ts                         # Auth session management (replaces middleware.ts in Next.js 16)
├── next.config.ts                   # Next.js config (viewTransition, turbopack)
├── package.json
├── tsconfig.json
├── postcss.config.mjs
├── .env.local                       # Environment variables (gitignored)
├── .env.local.example               # Template for env vars
├── components.json                  # shadcn/ui config
│
├── public/
│   ├── favicon.ico
│   ├── og-image.png                 # Default Open Graph image
│   └── fonts/                       # Self-hosted fonts (optional, can use Google Fonts CDN)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout — fonts, metadata, ThemeProvider, global styles
│   │   ├── globals.css              # Tailwind v4 + design tokens (CSS variables)
│   │   ├── page.tsx                 # Landing page (/)
│   │   │
│   │   ├── login/
│   │   │   └── page.tsx             # Login page (/login)
│   │   │
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts         # Magic link callback handler (/auth/callback)
│   │   │
│   │   ├── join/
│   │   │   └── [code]/
│   │   │       └── page.tsx         # Invite page (/join/[code])
│   │   │
│   │   ├── dashboard/
│   │   │   └── page.tsx             # User dashboard (/dashboard)
│   │   │
│   │   ├── group/
│   │   │   └── [groupId]/
│   │   │       ├── layout.tsx       # Group layout — group context provider, nav
│   │   │       ├── page.tsx         # Group home (/group/[groupId])
│   │   │       ├── predict/
│   │   │       │   └── [matchId]/
│   │   │       │       └── page.tsx # Prediction form (/group/[groupId]/predict/[matchId])
│   │   │       ├── match/
│   │   │       │   └── [matchId]/
│   │   │       │       └── page.tsx # Match leaderboard (/group/[groupId]/match/[matchId])
│   │   │       ├── standings/
│   │   │       │   └── page.tsx     # Season standings (/group/[groupId]/standings)
│   │   │       └── admin/
│   │   │           └── page.tsx     # Admin panel (/group/[groupId]/admin)
│   │   │
│   │   ├── privacy/
│   │   │   └── page.tsx             # Privacy policy (/privacy)
│   │   │
│   │   └── terms/
│   │       └── page.tsx             # Terms of service (/terms)
│   │
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components (auto-generated)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── select.tsx
│   │   │   ├── command.tsx          # For searchable player dropdowns
│   │   │   └── ...
│   │   │
│   │   ├── auth/
│   │   │   └── login-form.tsx       # Magic link form (client component)
│   │   │
│   │   ├── layout/
│   │   │   ├── header.tsx           # App header with logo, nav, notification bell, user menu
│   │   │   ├── footer.tsx           # Disclaimer footer
│   │   │   ├── nav-group.tsx        # Group-level navigation
│   │   │   └── notification-bell.tsx # Bell icon with unread count
│   │   │
│   │   ├── group/
│   │   │   ├── group-card.tsx       # Group card for dashboard
│   │   │   ├── create-group-form.tsx
│   │   │   ├── join-group-form.tsx
│   │   │   ├── member-list.tsx
│   │   │   ├── group-switcher.tsx   # Multi-group tab switcher
│   │   │   └── invite-link.tsx      # Copy invite link component
│   │   │
│   │   ├── match/
│   │   │   ├── match-card.tsx       # Match card (team badges, countdown, CTA)
│   │   │   ├── live-score-ticker.tsx # Live score display
│   │   │   ├── countdown-timer.tsx  # Deadline/match countdown
│   │   │   └── match-recap-card.tsx # Post-match summary card
│   │   │
│   │   ├── prediction/
│   │   │   ├── prediction-form.tsx  # Main prediction form container
│   │   │   ├── scenario-card.tsx    # Individual scenario card
│   │   │   ├── team-pick.tsx        # Team selection input
│   │   │   ├── player-pick.tsx      # Player searchable dropdown
│   │   │   ├── range-pick.tsx       # Range bracket buttons
│   │   │   ├── yes-no-pick.tsx      # Yes/No toggle
│   │   │   ├── over-pick.tsx        # Over 1-6 selector
│   │   │   ├── custom-scenario-form.tsx # Create custom scenario
│   │   │   ├── quick-predict-toggle.tsx
│   │   │   └── submit-bar.tsx       # Bottom sticky submit bar
│   │   │
│   │   ├── leaderboard/
│   │   │   ├── match-leaderboard.tsx     # Full match leaderboard table
│   │   │   ├── leaderboard-row.tsx       # Individual row with indicators
│   │   │   ├── prediction-status-pill.tsx # ✅ ❌ 🟡 🔴 ⏳ pills
│   │   │   ├── season-standings.tsx      # Season standings table
│   │   │   ├── points-badge.tsx          # Points display badge
│   │   │   └── expandable-picks.tsx      # Expanded picks view
│   │   │
│   │   ├── admin/
│   │   │   ├── pending-approvals.tsx
│   │   │   ├── scenario-management.tsx
│   │   │   ├── result-entry-form.tsx
│   │   │   └── settings-form.tsx
│   │   │
│   │   └── shared/
│   │       ├── team-badge.tsx       # 44px circle with team color + code
│   │       ├── role-badge.tsx       # Owner/admin/member badge
│   │       ├── empty-state.tsx      # Reusable empty state component
│   │       ├── error-state.tsx      # Reusable error state component
│   │       └── theme-provider.tsx   # Dark theme provider
│   │
│   ├── hooks/
│   │   ├── use-auth.ts             # Auth state + profile hook
│   │   ├── use-realtime.ts         # Generic Supabase Realtime subscription hook
│   │   ├── use-predictions.ts      # Predictions state + Realtime
│   │   ├── use-leaderboard.ts      # Leaderboard data + Realtime updates
│   │   ├── use-notifications.ts    # Notifications + unread count
│   │   └── use-countdown.ts        # Countdown timer hook
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts           # Browser Supabase client (createBrowserClient)
│   │   │   ├── server.ts           # Server Supabase client (createServerClient + cookies)
│   │   │   └── middleware.ts        # Session update utility for proxy.ts
│   │   │
│   │   ├── actions/                 # Server Actions (thin layer — validate, auth, delegate to DAL)
│   │   │   ├── auth.ts             # signIn, signOut
│   │   │   ├── groups.ts           # createGroup, joinGroup, approveJoin, etc.
│   │   │   ├── predictions.ts      # submitPredictions, editPredictions
│   │   │   ├── scenarios.ts        # createCustomScenario, approveScenario, removeScenario
│   │   │   ├── admin.ts            # enterResults, resolveScenario, setDeadline, lockPredictions
│   │   │   └── notifications.ts    # markRead, markAllRead
│   │   │
│   │   ├── dal/                     # Data Access Layer — ALL DB reads/writes go through here
│   │   │   ├── groups.ts           # getGroupById, getGroupsByUser, createGroup, etc.
│   │   │   ├── members.ts          # getMembers, getPendingRequests, updateMemberStatus, etc.
│   │   │   ├── matches.ts          # getUpcomingMatches, getMatchById, updateMatchResults, etc.
│   │   │   ├── scenarios.ts        # getScenariosForMatch, seedSystemScenarios, resolveScenario, etc.
│   │   │   ├── predictions.ts      # getPredictions, upsertPrediction, getLeaderboard, etc.
│   │   │   ├── standings.ts        # getSeasonStandings, getMatchLeaderboard
│   │   │   ├── notifications.ts    # getUnreadCount, getNotifications, markRead, etc.
│   │   │   ├── players.ts          # getPlayersForTeam, getMatchSquad, upsertPlayers, etc.
│   │   │   └── teams.ts            # getAllTeams, getTeamByCode
│   │   │
│   │   ├── cricket-api/             # CricketData.org API — abstracted with mock support
│   │   │   ├── client.ts           # Real API client (HTTP calls to api.cricapi.com)
│   │   │   ├── mock.ts             # Mock client (reads from local JSON fixtures)
│   │   │   ├── index.ts            # Exports the active client based on MOCK_MODE env
│   │   │   └── types.ts            # Shared request/response types for both clients
│   │   │
│   │   ├── mock-data/               # Static JSON fixtures for mock cricket API
│   │   │   ├── matches.json        # IPL 2026 fixture list (series_info + matches response)
│   │   │   ├── squads/             # Per-match squad responses
│   │   │   │   ├── match-1.json
│   │   │   │   └── match-2.json
│   │   │   ├── scorecards/         # Per-match scorecard snapshots (multiple phases per match)
│   │   │   │   ├── match-1/
│   │   │   │   │   ├── toss.json           # After toss — tossWinner populated
│   │   │   │   │   ├── powerplay.json      # After 6 overs — batting/bowling/FOW data
│   │   │   │   │   ├── innings-break.json  # End of first innings
│   │   │   │   │   ├── mid-match.json      # During second innings
│   │   │   │   │   └── completed.json      # Final scorecard — all results
│   │   │   │   └── match-2/
│   │   │   │       └── ...
│   │   │   └── README.md           # How to use and extend mock data
│   │   │
│   │   ├── scorecard-parser.ts     # Parse scorecard → match result fields (works with both real + mock)
│   │   ├── on-track-logic.ts       # "On track" / "In danger" computation
│   │   ├── constants.ts            # Teams, routes, app config, scenario categories
│   │   ├── utils.ts                # Shared utilities
│   │   └── validators.ts           # Zod schemas for input validation
│   │
│   └── types/
│       ├── index.ts                # All TypeScript interfaces
│       ├── database.ts             # Supabase-generated database types
│       └── cricket-api.ts          # CricketData.org API response types
│
└── supabase/                        # (symlink or copy to root /supabase)
    ├── config.toml                  # Supabase local dev config
    ├── migrations/
    │   ├── 001_initial_schema.sql   # Tables, enums, extensions
    │   ├── 002_views_functions.sql  # Views + DB functions
    │   ├── 003_rls_policies.sql     # All RLS policies
    │   ├── 004_seed_data.sql        # Points config, teams, fixtures, players
    │   └── 005_realtime.sql         # Realtime publication config
    ├── seed.sql                     # Dev-only seed: test users, groups, predictions (loaded by `supabase db reset`)
    └── functions/
        └── match-cron/
            └── index.ts             # Edge Function for match polling + resolution
```

### 1.2 Rendering Strategy Per Route

| Route | Rendering | Caching | Reason |
|-------|-----------|---------|--------|
| `/` (Landing) | SSR | `"use cache"` with `cacheLife('days')` | SEO critical, rarely changes, can be cached aggressively |
| `/login` | SSR | Dynamic (no cache) | Has form state, needs fresh CSRF |
| `/auth/callback` | Route Handler | N/A | API route, exchanges auth tokens |
| `/join/[code]` | SSR | Dynamic | Needs fresh group name for OG tags; auth-gated logic |
| `/dashboard` | SSR | Dynamic | User-specific content (their groups), protected |
| `/group/[groupId]` | SSR (shell) + Client (dynamic parts) | Dynamic shell, client-side Realtime | Group home has 3 states based on live data; shell loads group info server-side, live parts are client components with Realtime |
| `/group/[groupId]/predict/[matchId]` | SSR (initial load) + Client (form) | Dynamic | Load scenarios server-side, form interaction is client-side |
| `/group/[groupId]/match/[matchId]` | SSR (initial) + Client (Realtime) | Dynamic | Initial leaderboard server-rendered, then live updates via Realtime client components |
| `/group/[groupId]/standings` | SSR | Dynamic | User-specific highlighting, protected |
| `/group/[groupId]/admin` | SSR | Dynamic | Admin-only, protected, fresh data needed |
| `/privacy` | SSR | `"use cache"` with `cacheLife('max')` | Static content, cache forever |
| `/terms` | SSR | `"use cache"` with `cacheLife('max')` | Static content, cache forever |

### 1.3 Next.js 16 Specific Configuration

**`next.config.ts`:**
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable React 19.2 View Transitions for smooth page navigation
  viewTransition: true,

  // Turbopack is default in Next.js 16, no config needed

  // Image optimization domains (for team logos if we host them)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

export default nextConfig;
```

**`proxy.ts`** (replaces `middleware.ts` in Next.js 16):
```typescript
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Next.js 16: middleware.ts is renamed to proxy.ts
// Runs on Node.js runtime (not Edge) — has access to Node.js APIs
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Match all routes except static assets and API routes
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

**Key Next.js 16 changes applied throughout:**
- `proxy.ts` instead of `middleware.ts` — runs on Node.js runtime
- `"use cache"` directive for static/cached pages (landing, legal pages)
- `cookies()`, `headers()`, `params`, `searchParams` are all async (must `await`)
- React 19.2 `useActionState` for form state management
- View Transitions enabled for smooth route changes

### 1.4 Server Actions Architecture

Server Actions are thin wrappers that validate, authenticate, authorize, and **delegate to the DAL** (see Section 9). They never contain Supabase queries directly.

Each action:
1. Validates input with Zod schemas
2. Checks authentication via `supabase.auth.getUser()`
3. Checks authorization (role, membership) via DAL
4. Delegates the mutation to a DAL function
5. Returns `{ success, error, data }` — never throws

See Section 9.2 for the full Server Action + DAL example pattern.

---

## 2. Supabase — Complete Database Schema

> **IMPORTANT — Authoritative Schema Reference:**
> This tech_plan.md is the **authoritative schema reference** for development. It extends and supersedes `ipl-predict-technical-architecture.md` in these areas:
> - Three additional tables: `teams`, `players`, `match_squads`
> - Updated RLS policies: deadline-aware prediction visibility (the architecture doc has an insecure `USING (true)` policy on predictions — do NOT use it)
> - View security: `security_invoker = true` on views
> - Range bracket boundary documentation
> - Corrected cron activation window timezone logic
>
> **When writing migration SQL, use the schema and policies from THIS document, not the architecture doc.**

### 2.1 Extensions & Enums

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE match_status AS ENUM ('upcoming', 'live', 'completed', 'abandoned', 'no_result');
CREATE TYPE member_status AS ENUM ('pending', 'approved', 'rejected', 'removed');
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE scenario_type AS ENUM ('system', 'custom');
CREATE TYPE scenario_approval AS ENUM ('auto_approved', 'pending', 'approved', 'rejected');
```

### 2.2 Tables

**`profiles`** — User profiles (auto-created on signup)
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK, FK → auth.users(id) ON DELETE CASCADE | |
| display_name | TEXT | NOT NULL, 2-30 chars | |
| email | TEXT | NOT NULL | |
| avatar_url | TEXT | Nullable | Future use |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**`groups`** — Prediction groups
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| name | TEXT | NOT NULL, 2-50 chars | |
| invite_code | TEXT | NOT NULL, UNIQUE, DEFAULT encode(gen_random_bytes(6), 'hex') | 12-char hex |
| created_by | UUID | NOT NULL, FK → profiles(id) | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**`group_members`** — Membership with roles + approval
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| group_id | UUID | PK (composite), FK → groups(id) | |
| user_id | UUID | PK (composite), FK → profiles(id) | |
| status | member_status | NOT NULL, DEFAULT 'pending' | |
| role | member_role | NOT NULL, DEFAULT 'member' | |
| joined_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| approved_at | TIMESTAMPTZ | Nullable | Set when approved |

**`matches`** — IPL fixtures + live data
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | SERIAL | PK | |
| match_number | INT | NOT NULL, UNIQUE | IPL match number |
| team_a | TEXT | NOT NULL | Team code (e.g., "CSK") |
| team_b | TEXT | NOT NULL | Team code |
| date | DATE | NOT NULL | Match date |
| time_ist | TIME | NOT NULL | Match start time IST |
| venue | TEXT | NOT NULL | Stadium name |
| status | match_status | NOT NULL, DEFAULT 'upcoming' | |
| toss_winner | TEXT | Nullable | Populated during/after match |
| match_winner | TEXT | Nullable | |
| top_scorer | TEXT | Nullable | Player name |
| top_scorer_runs | INT | Nullable | |
| top_wicket_taker | TEXT | Nullable | Player name |
| top_wicket_taker_wickets | INT | Nullable | |
| player_of_match | TEXT | Nullable | |
| first_innings_score | INT | Nullable | |
| first_innings_wickets | INT | Nullable | |
| total_match_runs | INT | Nullable | |
| total_match_wickets | INT | Nullable | |
| total_match_sixes | INT | Nullable | |
| powerplay_score | INT | Nullable | |
| powerplay_wickets | INT | Nullable | |
| had_super_over | BOOLEAN | Nullable | |
| most_sixes_player | TEXT | Nullable | |
| first_wicket_over | INT | Nullable | |
| batsman_scored_fifty | BOOLEAN | Nullable | |
| bowler_took_three | BOOLEAN | Nullable | |
| current_score_a | TEXT | Nullable | e.g., "172/4" |
| current_score_b | TEXT | Nullable | |
| current_overs_a | DECIMAL(4,1) | Nullable | |
| current_overs_b | DECIMAL(4,1) | Nullable | |
| current_batting_team | TEXT | Nullable | |
| live_scorecard_json | JSONB | Nullable | Full cached scorecard |
| last_polled_at | TIMESTAMPTZ | Nullable | |
| api_match_id | TEXT | Nullable | CricketData.org match GUID |
| resolved_at | TIMESTAMPTZ | Nullable | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**`match_group_settings`** — Per-group overrides per match
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| group_id | UUID | PK (composite), FK → groups(id) | |
| match_id | INT | PK (composite), FK → matches(id) | |
| prediction_deadline | TIMESTAMPTZ | Nullable | Override default deadline |
| is_locked | BOOLEAN | NOT NULL, DEFAULT false | Manual lock |

**`scenarios`** — System + custom scenarios (unified table)
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| group_id | UUID | NOT NULL, FK → groups(id) | |
| match_id | INT | NOT NULL, FK → matches(id) | |
| created_by | UUID | FK → profiles(id), ON DELETE SET NULL | NULL for system scenarios |
| type | scenario_type | NOT NULL, DEFAULT 'custom' | |
| system_category | TEXT | Nullable | 'match_winner', 'toss_winner', etc. |
| title | TEXT | NOT NULL, 2-200 chars | |
| description | TEXT | Nullable | |
| options | JSONB | NOT NULL, DEFAULT '[]' | e.g., ["CSK","MI"] or ["<150","150-169",...] |
| correct_answer | TEXT | Nullable | Set when resolved |
| points | INT | NOT NULL, DEFAULT 10, CHECK IN (5,10,15,20,25) | |
| is_resolved | BOOLEAN | NOT NULL, DEFAULT false | |
| approval_status | scenario_approval | NOT NULL, DEFAULT 'pending' | system = auto_approved |
| is_removed | BOOLEAN | NOT NULL, DEFAULT false | Soft delete |
| removed_by | UUID | FK → profiles(id) | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| **UNIQUE** | (group_id, match_id, system_category) NULLS NOT DISTINCT | | Prevents duplicate system scenarios |

**`predictions`** — User picks
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL, FK → profiles(id) | |
| scenario_id | UUID | NOT NULL, FK → scenarios(id) | |
| value | TEXT | NOT NULL | The user's pick |
| is_correct | BOOLEAN | Nullable | NULL = unresolved |
| points_earned | INT | DEFAULT 0 | |
| submitted_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Updated on edit (for tiebreaking) |
| **UNIQUE** | (user_id, scenario_id) | | One pick per user per scenario |

**`teams`** — IPL team reference data
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| code | TEXT | PK | e.g., "CSK", "MI" |
| name | TEXT | NOT NULL | Full name: "Chennai Super Kings" |
| short_name | TEXT | NOT NULL | Display name: "Chennai" |
| color | TEXT | NOT NULL | Hex color: "#F9CD05" |
| text_on_color | TEXT | NOT NULL, DEFAULT 'dark' | 'dark' or 'light' — text color on team badge |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**`players`** — Player squads (seeded per team, updated with playing XI)
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| api_player_id | TEXT | Nullable, UNIQUE | CricketData.org player GUID |
| name | TEXT | NOT NULL | |
| team_code | TEXT | NOT NULL, FK → teams(code) | |
| role | TEXT | Nullable | 'Batsman', 'Bowler', 'All-Rounder', 'WK-Batsman' |
| batting_style | TEXT | Nullable | |
| bowling_style | TEXT | Nullable | |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Set false if released/injured |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**`match_squads`** — Playing XI per match (populated by cron ~30 min before match)
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| match_id | INT | PK (composite), FK → matches(id) | |
| player_id | UUID | PK (composite), FK → players(id) | |
| team_code | TEXT | NOT NULL, FK → teams(code) | |
| is_playing_xi | BOOLEAN | NOT NULL, DEFAULT false | True when confirmed in playing XI |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**`notifications`** — In-app notifications
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL, FK → profiles(id) | |
| type | TEXT | NOT NULL | 'join_request', 'approved', etc. |
| message | TEXT | NOT NULL | |
| group_id | UUID | FK → groups(id) | |
| match_id | INT | FK → matches(id) | |
| is_read | BOOLEAN | NOT NULL, DEFAULT false | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**`points_config`** — System scenario definitions (reference table)
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| system_category | TEXT | PK | e.g., 'match_winner' |
| label | TEXT | NOT NULL | Display name |
| description | TEXT | Nullable | |
| default_options | JSONB | NOT NULL, DEFAULT '[]' | Default bracket options |
| points | INT | NOT NULL | |
| is_auto_scorable | BOOLEAN | NOT NULL, DEFAULT true | |
| resolution_phase | TEXT | Nullable | 'toss', 'powerplay', etc. |

### 2.3 Indexes

```sql
-- Groups
CREATE INDEX idx_groups_invite_code ON public.groups(invite_code);

-- Group Members
CREATE INDEX idx_group_members_status ON public.group_members(group_id, status);
CREATE INDEX idx_group_members_user ON public.group_members(user_id, status);

-- Matches
CREATE INDEX idx_matches_status ON public.matches(status);
CREATE INDEX idx_matches_date ON public.matches(date);

-- Scenarios
CREATE INDEX idx_scenarios_group_match ON public.scenarios(group_id, match_id);
CREATE INDEX idx_scenarios_approval ON public.scenarios(group_id, approval_status);

-- Predictions
CREATE INDEX idx_predictions_scenario ON public.predictions(scenario_id);
CREATE INDEX idx_predictions_user ON public.predictions(user_id);

-- Notifications
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);

-- Players
CREATE INDEX idx_players_team ON public.players(team_code);
CREATE INDEX idx_players_api_id ON public.players(api_player_id);

-- Match Squads
CREATE INDEX idx_match_squads_match ON public.match_squads(match_id);
```

### 2.4 Views

**`season_standings`** — Aggregated season standings per group
- **Must be created with `WITH (security_invoker = true)`** — see Section 13
- Joins: predictions → scenarios → profiles → group_members
- Computes: total_points, matches_predicted, correct_predictions, total_resolved, accuracy_pct, points_per_match, rank
- Filters: only approved scenarios, only approved members, excludes removed scenarios
- Partitioned rank by group_id, ordered by total_points DESC

**`match_leaderboard`** — Per-match leaderboard
- **Must be created with `WITH (security_invoker = true)`** — see Section 13
- Joins: predictions → scenarios → profiles
- Computes: match_points, correct_count, resolved_count, predicted_count, rank
- Rank tiebreaker: earliest `submitted_at` wins
- Partitioned by group_id + match_id

**"Last 10 Matches" filter (US-5.5, P2):**
The `season_standings` view computes stats across ALL matches. For the "Last 10 Matches" filter, we cannot parameterize a view. Options:
- **Preferred:** Create a Postgres function `get_season_standings(p_group_id UUID, p_last_n INT DEFAULT NULL)` that accepts an optional match count filter. When `p_last_n` is provided, it filters to only the N most recent completed matches for that group before aggregating.
- **Alternative:** Compute client-side by fetching per-match leaderboard data for the last 10 matches and aggregating in JS. Simpler but slower for large groups.
The function approach is recommended. Implementation deferred to P2.

### 2.5 Database Functions

**`handle_new_user()`** — Trigger: auto-create profile on auth.users INSERT
**`seed_system_scenarios(p_group_id, p_match_id)`** — Creates 16 system scenarios, idempotent
**`resolve_match_predictions(p_match_id)`** — Scores all auto-scorable system scenarios using match result fields
**`void_abandoned_match(p_match_id)`** — Voids unresolved predictions, marks unresolved scenarios as removed

**Range Bracket Resolution Rules (IMPORTANT):**
Brackets use inclusive-start, exclusive-end convention. A value falls into the bracket whose lower bound it matches:

| Bracket | SQL Condition | Edge: value = lower bound |
|---------|--------------|--------------------------|
| `<150` | `score < 150` | 149 → `<150` |
| `150-169` | `score >= 150 AND score <= 169` | 150 → `150-169` |
| `170-189` | `score >= 170 AND score <= 189` | 170 → `170-189` |
| `190+` | `score >= 190` | 190 → `190+` |
| `<40` | `score < 40` | 39 → `<40` |
| `40-55` | `score >= 40 AND score <= 55` | 40 → `40-55`, 55 → `40-55` |
| `55-70` | `score >= 56 AND score <= 70` | 56 → `55-70` |
| `70+` | `score >= 71` | 71 → `70+` |

**NOTE:** The bracket label `"55-70"` is a display label; the actual range is 56-70 to avoid overlap with `"40-55"`. Same pattern applies to all brackets:
- `"15-25"` sixes = 15 to 25 inclusive; `"25-35"` = 26 to 35
- `"12-15"` wickets = 12 to 15 inclusive; `"15-18"` = 16 to 18
- `"300-349"` runs = 300 to 349; `"350-399"` = 350 to 399

The `resolve_match_predictions()` function in the original architecture doc uses this convention. The boundary values (55, 25, 15) always resolve to the LOWER bracket (e.g., 55 → `"40-55"`, not `"55-70"`). This must be consistent between the resolution function and the UI labels to avoid user confusion. Consider renaming ambiguous brackets in the UI: `"40-55"` / `"56-70"` / `"71+"` — or add tooltip text clarifying the exact range.

### 2.6 Row Level Security (RLS)

All tables have RLS enabled. Policy summary:

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | All authenticated | — (trigger) | Own row only | — |
| groups | All authenticated | Own rows (created_by = auth.uid()) | — | — |
| group_members | All authenticated | Own rows (user_id = auth.uid()) | Admin/owner of the group | — |
| matches | All (public read) | — (service role) | — (service role / cron) | — |
| match_group_settings | All authenticated | Admin/owner | Admin/owner | — |
| scenarios | Approved + own pending | Approved group members | Admin/owner of the group | — |
| predictions | Own rows OR post-deadline (see note below) | Own rows | Own rows | — |
| notifications | Own rows only | — (server actions) | Own rows (mark read) | — |
| points_config | All (public read) | — | — | — |
| teams | All (public read) | — | — | — |
| players | All (public read) | — (service role) | — (service role) | — |
| match_squads | All (public read) | — (service role / cron) | — (service role / cron) | — |

**Prediction Visibility RLS (IMPORTANT):**
The PRD requires picks to be hidden before the deadline. A naive `USING (true)` policy on predictions is a security hole — users could query the Supabase API directly to see others' picks. The policy must enforce deadline awareness:

```sql
CREATE POLICY "read predictions" ON public.predictions FOR SELECT USING (
  -- Always allow reading own predictions
  (SELECT auth.uid()) = user_id
  OR
  -- Allow reading others' predictions only after deadline has passed
  EXISTS (
    SELECT 1 FROM public.scenarios s
    JOIN public.matches m ON m.id = s.match_id
    LEFT JOIN public.match_group_settings mgs
      ON mgs.group_id = s.group_id AND mgs.match_id = s.match_id
    WHERE s.id = predictions.scenario_id
      AND (
        -- Match is live or completed (auto-locked)
        m.status IN ('live', 'completed', 'abandoned', 'no_result')
        -- OR manual lock is set
        OR mgs.is_locked = true
        -- OR past the deadline (default: 45 min before match)
        OR now() > COALESCE(
          mgs.prediction_deadline,
          (m.date + m.time_ist - interval '45 minutes') AT TIME ZONE 'Asia/Kolkata'
        )
      )
  )
);
```

This ensures that before the deadline, only the prediction owner can see their own picks. After the deadline (or when locked/live), all group members can see everyone's picks. The service role key (used by the cron) bypasses RLS entirely, so the cron can always read/write predictions.

**Key security pattern:** All Server Actions double-check authorization (role + membership) before mutations, even with RLS. RLS is the last line of defense, not the only line.

### 2.7 Realtime Configuration

Tables enabled for Supabase Realtime:

| Table | Events | Use Case |
|-------|--------|----------|
| predictions | UPDATE | Live leaderboard — points_earned, is_correct changes |
| scenarios | UPDATE, INSERT | Resolution updates, new custom scenarios |
| matches | UPDATE | Live score snapshot, status changes |
| group_members | UPDATE, INSERT | New join requests (admin), approval status changes |
| notifications | INSERT | New notification badge count |

**Client subscription pattern:** Filter by `group_id` and/or `match_id` to avoid receiving updates from other groups.

---

## 3. CricketData.org API — Integration Plan

### 3.1 API Overview

**Base URL:** `https://api.cricapi.com/v1/`
**Auth:** API key as query parameter: `?apikey=YOUR_KEY`
**Plan:** S tier ($5.99/month, 2,000 hits/day)
**Response format:** JSON with standard envelope: `{ status, data, info: { hitsToday, hitsLimit, ... } }`
**Pagination:** Default 25 records/page, use `offset` parameter

### 3.2 Endpoints We Use

| Endpoint | URL | When Called | Frequency | Purpose |
|----------|-----|------------|-----------|---------|
| **Series Info** | `GET /v1/series_info?id={series_id}` | Once at setup | 1 call total | Get IPL 2026 series ID + all match IDs |
| **Matches List** | `GET /v1/matches?offset=N` | Daily at 8 AM IST | 1-3 calls/day | Refresh fixture list, detect schedule changes, map match IDs |
| **Match Info** | `GET /v1/match_info?id={match_id}` | Pre-match (when status is upcoming) | 1-5 calls/match | Check if match has gone live, get toss info |
| **Match Scorecard** | `GET /v1/match_scorecard?id={match_id}` | Every 1 min during live match | ~210 calls/match | Full batting + bowling stats for scenario resolution |
| **Match Squad** | `GET /v1/match_squad?id={match_id}` | 30 min before match | 1 call/match | Get playing XI for player-pick dropdowns |
| **Cricket Score** | `GET /v1/cricScore` | Fallback / quick check | As needed | Quick score check (lighter than scorecard) |

### 3.3 API Response Structures

**`/v1/series_info` Response:**
```typescript
interface SeriesInfoResponse {
  status: string;
  data: {
    info: {
      id: string;
      name: string; // "Indian Premier League 2026"
      startDate: string;
      endDate: string;
      odi: number;
      t20: number;
      test: number;
      squads: number;
      matches: number;
    };
    matchList: Array<{
      id: string;        // Match GUID — this is what we map to our matches.api_match_id
      name: string;      // "Mumbai Indians vs Chennai Super Kings, 1st Match"
      matchType: string; // "t20"
      status: string;    // "Match not started" | "Mumbai Indians won by 5 wickets" | etc.
      venue: string;
      date: string;
      dateTimeGMT: string;
      teams: string[];   // ["Mumbai Indians", "Chennai Super Kings"]
      fantasyEnabled: boolean;
      bbbEnabled: boolean;
    }>;
  };
  info: { hitsToday: number; hitsLimit: number; /* ... */ };
}
```

**`/v1/match_info` Response:**
```typescript
interface MatchInfoResponse {
  status: string;
  data: {
    id: string;
    name: string;
    matchType: string;
    status: string;       // Human-readable result or "Match not started"
    venue: string;
    date: string;
    dateTimeGMT: string;
    teams: string[];
    tossWinner: string;   // Team name
    tossChoice: string;   // "bat" | "field"
    matchWinner: string;  // Team name
    score: Array<{
      r: number;          // Runs
      w: number;          // Wickets
      o: number;          // Overs (decimal: 19.4 = 19 overs 4 balls)
      inning: string;     // "Mumbai Indians Inning 1"
    }>;
    series_id: string;
    fantasyEnabled: boolean;
  };
}
```

**`/v1/match_scorecard` Response (THE PRIMARY ENDPOINT):**
```typescript
interface ScorecardResponse {
  status: string;
  data: {
    id: string;
    name: string;
    matchType: string;
    status: string;
    venue: string;
    date: string;
    dateTimeGMT: string;
    teams: string[];
    tossWinner: string;
    tossChoice: string;
    matchWinner: string;
    teamInfo: Array<{
      name: string;      // Full name: "Mumbai Indians"
      shortname: string; // "MI"
      img: string;       // Team image URL
    }>;
    score: Array<{
      r: number;
      w: number;
      o: number;
      inning: string;
    }>;
    scorecard: Array<{
      inning: string;     // "Mumbai Indians Inning 1"
      batting: Array<{
        batsman: { id: string; name: string };
        dismissal: string;    // "c Kohli b Bumrah" | "not out" | "run out"
        r: number;            // Runs scored
        b: number;            // Balls faced
        '4s': number;         // Fours
        '6s': number;         // Sixes
        sr: number;           // Strike rate
      }>;
      bowling: Array<{
        bowler: { id: string; name: string };
        o: number;            // Overs (decimal)
        m: number;            // Maidens
        r: number;            // Runs conceded
        w: number;            // Wickets
        eco: number;          // Economy rate
      }>;
      extras: {
        r: number; b: number; lb: number; w: number; nb: number;
      };
      totals: {
        R: number;            // Total runs
        W: number;            // Total wickets
        O: number;            // Total overs
      };
      catching?: Array<{
        name: string;
        catches: number;
      }>;
      fow?: Array<{           // Fall of wickets
        batsman: { id: string; name: string };
        wkt_nbr: number;
        score_at_dismissal: number;
        overs_at_dismissal: number;  // Decimal: 3.2 = over 3, ball 2
      }>;
    }>;
  };
}
```

**`/v1/match_squad` Response:**
```typescript
interface SquadResponse {
  status: string;
  data: Array<{
    teamName: string;    // "Mumbai Indians"
    shortname: string;   // "MI"
    players: Array<{
      id: string;
      name: string;
      role: string;          // "Batsman" | "Bowler" | "All-Rounder" | "WK-Batsman"
      battingStyle: string;  // "Right Handed Bat"
      bowlingStyle: string;  // "Right-arm fast"
      country: string;
      playerImg: string;     // May not always be available
    }>;
  }>;
}
```

### 3.4 Scorecard → Match Table Mapping

The cron parses each scorecard response and extracts:

| Match Column | Extracted From | Logic |
|-------------|---------------|-------|
| toss_winner | `data.tossWinner` | Direct (convert full name → team code) |
| match_winner | `data.matchWinner` | Direct (convert full name → team code) |
| top_scorer | `scorecard[*].batting` | Sort all batsmen by `r` DESC, take first `.name` |
| top_scorer_runs | `scorecard[*].batting` | Highest `r` value |
| top_wicket_taker | `scorecard[*].bowling` | Sort all bowlers by `w` DESC, take first `.name` |
| top_wicket_taker_wickets | `scorecard[*].bowling` | Highest `w` value |
| player_of_match | `data.matchWinner` context or fantasy | May need manual entry; not always in scorecard |
| first_innings_score | `scorecard[0].totals.R` | First innings total runs |
| first_innings_wickets | `scorecard[0].totals.W` | First innings total wickets |
| total_match_runs | `SUM(scorecard[*].totals.R)` | Both innings combined |
| total_match_wickets | `SUM(scorecard[*].bowling[*].w)` | Both innings bowler wickets |
| total_match_sixes | `SUM(scorecard[*].batting[*]['6s'])` | All batsmen sixes across both innings |
| powerplay_score | `scorecard[0].fow` + batting data | Score at end of over 6 from first innings |
| powerplay_wickets | `scorecard[0].fow.filter(f => f.overs_at_dismissal <= 6).length` | FOW entries where over ≤ 6 |
| had_super_over | Infer from `scorecard.length > 2` | If 3+ innings exist, likely super over |
| most_sixes_player | `scorecard[*].batting` sorted by `'6s'` DESC | Highest individual sixes count |
| first_wicket_over | `scorecard[0].fow[0].overs_at_dismissal` | First FOW entry, ceil the over |
| batsman_scored_fifty | `scorecard[*].batting.some(b => b.r >= 50)` | Boolean check |
| bowler_took_three | `scorecard[*].bowling.some(b => b.w >= 3)` | Boolean check |
| current_score_a | `data.score[0]` | Format: "{r}/{w}" |
| current_score_b | `data.score[1]` | Format: "{r}/{w}" |
| current_overs_a | `data.score[0].o` | |
| current_overs_b | `data.score[1].o` | |
| live_scorecard_json | `data.scorecard` | Full cached response |

### 3.5 Scenario Auto-Resolution Mapping

| System Category | Auto-Scorable | Data Source | Resolution Phase | Resolution Logic |
|----------------|--------------|-------------|-----------------|-----------------|
| match_winner | Yes | `data.matchWinner` | end_of_match | Direct team name match |
| toss_winner | Yes | `data.tossWinner` | toss | Direct team name match |
| top_scorer | Yes | batting stats | end_of_match | Highest `r` across all batsmen |
| top_wicket_taker | Yes | bowling stats | end_of_match | Highest `w` across all bowlers |
| total_match_runs | Yes | both innings totals | end_of_match | Sum → bracket match |
| first_innings_score | Yes | 1st innings total | innings_break | Direct → bracket match |
| player_of_match | Partial | Not always in scorecard | post_match | Auto if available, else manual |
| powerplay_score | Yes | FOW data + batting | powerplay | Score at over 6 → bracket |
| powerplay_wickets | Yes | FOW data | powerplay | Count FOW where over ≤ 6 |
| batsman_fifty | Yes | batting stats | mid_match | `any(r >= 50)` → Yes/No |
| total_sixes | Yes | batting stats | end_of_match | Sum all '6s' → bracket |
| total_wickets | Yes | bowling stats | end_of_match | Sum all 'w' → bracket |
| bowler_three_wkt | Yes | bowling stats | mid_match | `any(w >= 3)` → Yes/No |
| super_over | No | Infer from innings count | end_of_match | Manual (unreliable inference) |
| most_sixes | Likely | batting stats sorted by '6s' | end_of_match | Auto if '6s' data available per player |
| first_wicket_over | Likely | FOW data | powerplay | Auto if FOW includes over numbers |

**Result: 13 fully auto-scorable, 2 likely auto-scorable, 1 manual (super over).**

### 3.6 API Quota Budget

| Scenario | Calls | Notes |
|----------|-------|-------|
| Daily fixture refresh | 1-3 | Paginated, 25 matches/page |
| Squad fetch per match | 1 | Cached, called once |
| Pre-match status checks | 5-10 | match_info to detect if live |
| Live polling (1/min × ~210 min) | ~210 | Per T20 match |
| Double-header day | ~420 | Two matches |
| Post-match final pass | 1-2 | Final scorecard |
| **Daily peak (double header)** | **~450** | Well within 2,000 limit |

Comfortable headroom. 2,000 daily limit supports even aggressive polling.

### 3.7 Team Name Mapping

CricketData.org uses full team names. We use codes. Mapping needed:

```typescript
const TEAM_NAME_TO_CODE: Record<string, string> = {
  'Chennai Super Kings': 'CSK',
  'Mumbai Indians': 'MI',
  'Royal Challengers Bengaluru': 'RCB',  // Note: may also appear as "Bangalore"
  'Royal Challengers Bangalore': 'RCB',
  'Kolkata Knight Riders': 'KKR',
  'Delhi Capitals': 'DC',
  'Sunrisers Hyderabad': 'SRH',
  'Rajasthan Royals': 'RR',
  'Punjab Kings': 'PBKS',
  'Gujarat Titans': 'GT',
  'Lucknow Super Giants': 'LSG',
};
```

### 3.8 Known API Limitations

1. **Data delay:** ~30 seconds behind live for registered users (not real-time)
2. **Ball-by-ball endpoint:** Still in testing, not reliable — we don't need it (scorecard is sufficient)
3. **Player images:** Not always available — we won't use them
4. **No WebSocket:** Polling only — we use our own Supabase Realtime layer on top
5. **No SLA:** No uptime guarantee — fallback is admin manual entry
6. **Image hotlinking forbidden:** Download and host images ourselves (we use team color circles instead)
7. **Fixtures appear 1-2 weeks ahead:** Must refresh match IDs periodically
8. **POTM not always in scorecard:** May need manual entry for Player of the Match

---

## 4. Cron — Edge Function Architecture

### 4.1 State Machine

```
                    ┌──────────────┐
                    │   UPCOMING   │
                    │              │
                    │ • Check if   │
                    │   30 min to  │
                    │   match:     │
                    │   fetch squad│
                    │              │
                    │ • Check      │
                    │   match_info │
                    │   for status │
                    │   change     │
                    └──────┬───────┘
                           │ status changes to live
                           ▼
                    ┌──────────────┐
                    │     LIVE     │
                    │              │
                    │ • Poll       │
                    │   scorecard  │
                    │   every 1min │
                    │              │
                    │ • Write live │
                    │   snapshot   │
                    │              │
                    │ • Progressive│
                    │   resolve    │
                    │   scenarios  │
                    │              │
                    │ • Auto-lock  │
                    │   predictions│
                    └──────┬───────┘
                           │ match completed/abandoned
                           ▼
                    ┌──────────────┐
                    │  COMPLETED   │
                    │              │
                    │ • Final      │
                    │   resolution │
                    │   pass       │
                    │              │
                    │ • Call       │
                    │   resolve_   │
                    │   match_     │
                    │   predictions│
                    │              │
                    │ • Stop       │
                    │   polling    │
                    └──────────────┘
```

### 4.2 Activation Window

```typescript
// See Section 11 (Timezone Strategy) for full derivation.
// Active window: 2 PM IST to 1 AM IST = 08:30 UTC to 19:30 UTC
function shouldActivate(): boolean {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const utcDecimal = utcHour + utcMin / 60;

  // INACTIVE from 19:30 UTC (1 AM IST) to 08:30 UTC (2 PM IST)
  const isInactive = utcDecimal >= 19.5 || utcDecimal < 8.5;
  return !isInactive;
}
```

### 4.3 Progressive Resolution Order

The cron resolves scenarios in this order as data becomes available:

| Phase | When | Scenarios Resolved |
|-------|------|-------------------|
| 1. Toss | Match goes live, toss data available | `toss_winner` |
| 2. First Wicket | FOW data appears with first entry | `first_wicket_over` |
| 3. Powerplay | Over count reaches 6+ in first innings | `powerplay_score`, `powerplay_wickets` |
| 4. Mid-Match | As batting/bowling milestones are reached | `batsman_fifty` (when any batsman hits 50 or all out below), `bowler_three_wkt` (when any bowler takes 3+ or innings ends) |
| 5. Innings Break | Second innings data appears | `first_innings_score` |
| 6. End of Match | Status shows completed | `match_winner`, `top_scorer`, `top_wicket_taker`, `total_match_runs`, `total_sixes`, `total_wickets`, `most_sixes` |
| 7. Post-Match | POTM data available | `player_of_match` |
| Manual | Admin enters | `super_over` (always), `player_of_match` (if not in API) |

### 4.4 Edge Function Setup (pg_cron)

```sql
-- Store the Edge Function URL and key in Vault
-- IMPORTANT: Must use service_role_key (not anon_key) because the cron
-- writes to matches, scenarios, and predictions tables which have RLS
-- preventing writes from the anon role.
SELECT vault.create_secret(
  'https://YOUR_PROJECT.supabase.co',
  'project_url'
);
SELECT vault.create_secret(
  'YOUR_SERVICE_ROLE_KEY',
  'service_role_key'
);

-- Schedule the cron to run every minute
SELECT cron.schedule(
  'match-cron',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/match-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' ||
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('time', now())
  ) AS request_id;
  $$
);
```

---

## 5. Realtime Subscription Architecture

### 5.1 Subscription Map

| Page | Channel | Tables | Filter | Updates |
|------|---------|--------|--------|---------|
| Match Leaderboard | `match-{matchId}-group-{groupId}` | predictions, scenarios, matches | `scenario_id IN (...)`, `match_id = X` | Prediction scores, scenario resolution, live score |
| Group Home | `group-{groupId}` | group_members, matches | `group_id = X` | New members, match status changes |
| Notification Bell | `notifications-{userId}` | notifications | `user_id = X` | New notifications, badge count |
| Admin Panel | `admin-{groupId}` | group_members, scenarios | `group_id = X` | Pending requests, pending scenarios |

### 5.2 Client-Side Pattern

```typescript
// hooks/use-leaderboard.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useLeaderboard(groupId: string, matchId: number) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [matchData, setMatchData] = useState<MatchSnapshot | null>(null);
  const supabase = createClient();

  // Initial fetch
  useEffect(() => {
    fetchLeaderboard();
    fetchMatchData();
  }, [groupId, matchId]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel(`match-${matchId}-group-${groupId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'predictions',
      }, (payload) => {
        updatePredictionInLeaderboard(payload.new);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${matchId}`,
      }, (payload) => {
        setMatchData(payload.new as MatchSnapshot);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'scenarios',
      }, (payload) => {
        updateScenarioResolution(payload.new);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [groupId, matchId]);

  return { leaderboard, matchData };
}
```

---

## 6. Design System Implementation

### 6.1 CSS Custom Properties (`globals.css`)

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root, .dark {
  /* Surfaces */
  --bg-deep: #06080F;
  --bg-primary: #0B0F1A;
  --bg-card: #111827;
  --bg-elevated: #1A2236;
  --bg-hover: #1F2A40;
  --bg-input: #0F1525;

  /* Accent */
  --accent: #00E5FF;
  --accent-soft: rgba(0, 229, 255, 0.1);
  --accent-medium: rgba(0, 229, 255, 0.2);

  /* Gold */
  --gold: #FFB800;
  --gold-soft: rgba(255, 184, 0, 0.08);

  /* Semantic */
  --success: #34D399;
  --danger: #F87171;
  --warning: #FBBF24;
  --pending: #64748B;

  /* Text */
  --text-primary: #F1F5F9;
  --text-secondary: #94A3B8;
  --text-muted: #475569;
  --text-inverse: #0B0F1A;

  /* Borders */
  --border-subtle: rgba(255, 255, 255, 0.03);
  --border-light: rgba(255, 255, 255, 0.07);
  --border-medium: rgba(255, 255, 255, 0.12);
  --border-focus: rgba(0, 229, 255, 0.31);

  /* Radii */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
  --radius-full: 9999px;

  /* Shadows */
  --accent-glow: 0 0 20px rgba(0, 229, 255, 0.25), 0 0 60px rgba(0, 229, 255, 0.08);

  /* shadcn/ui overrides */
  --background: var(--bg-deep);
  --foreground: var(--text-primary);
  --card: var(--bg-card);
  --card-foreground: var(--text-primary);
  --popover: var(--bg-elevated);
  --popover-foreground: var(--text-primary);
  --primary: var(--accent);
  --primary-foreground: var(--text-inverse);
  --secondary: var(--bg-elevated);
  --secondary-foreground: var(--text-secondary);
  --muted: var(--bg-elevated);
  --muted-foreground: var(--text-muted);
  --accent-background: var(--accent-soft);
  --accent-foreground: var(--accent);
  --destructive: var(--danger);
  --destructive-foreground: var(--text-primary);
  --border: var(--border-light);
  --input: var(--border-medium);
  --ring: var(--border-focus);
  --radius: var(--radius-md);
}
```

### 6.2 Font Loading (`layout.tsx`)

```typescript
import { Chakra_Petch, DM_Sans, JetBrains_Mono } from 'next/font/google';

const chakraPetch = Chakra_Petch({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});
```

### 6.3 shadcn/ui Components Needed

| Component | Usage |
|-----------|-------|
| Button | Primary (gradient), secondary (outline), ghost |
| Input | Form fields |
| Dialog | Modals (create group, custom scenario) |
| DropdownMenu | User menu, actions menus |
| Tabs | Admin panel tabs, group switcher |
| Badge | Role badges, status badges |
| Toast | Success/error notifications |
| Tooltip | Info hover tips |
| Select | Dropdowns |
| Command | Searchable player picker (combobox) |
| Popover | Notification bell dropdown |
| Skeleton | Loading states |

All components will be customized with the Stadium Nightscape tokens via the CSS variable overrides.

---

## 7. Environment Variables

### 7.1 Production (`.env.local` on Vercel)

```env
# Supabase (cloud)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cricket API (real)
CRICKET_API_KEY=your-cricketdata-api-key
CRICKET_API_BASE_URL=https://api.cricapi.com/v1

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME=Bragg

# Mock mode — OFF in production
NEXT_PUBLIC_MOCK_MODE=false
```

### 7.2 Local Development (`.env.local` on dev machine)

```env
# Supabase (local — started via `supabase start`)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key-from-supabase-start-output>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key-from-supabase-start-output>

# Cricket API — not needed when mock mode is on
CRICKET_API_KEY=
CRICKET_API_BASE_URL=https://api.cricapi.com/v1

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Bragg

# Mock mode — ON for local dev (mocks only the cricket API, DB/Auth/Realtime use Supabase local)
NEXT_PUBLIC_MOCK_MODE=true
```

---

## 8. Deployment Architecture

```
GitHub (main branch)
    │
    ├── push → Vercel auto-deploy (Next.js 16.2)
    │          ├── SSR routes → Vercel Serverless Functions
    │          ├── Static routes → Vercel CDN Edge
    │          └── proxy.ts → Vercel Edge Middleware
    │
    └── supabase/ migrations → Supabase CLI push
                   ├── Postgres DB (tables, views, functions, RLS)
                   ├── Auth (magic link email)
                   ├── Realtime (WebSocket subscriptions)
                   └── Edge Functions (match-cron)
                       └── pg_cron → calls Edge Function every 1 min
                           └── CricketData.org API (scorecard polling)
```

---

## 9. Data Access Layer (DAL)

### 9.1 Architecture Overview

**Rule: No component or Server Action touches Supabase or any external API directly.** All data access goes through the DAL (`src/lib/dal/`) and the cricket API abstraction (`src/lib/cricket-api/`).

```
┌─────────────────────────────────────────────────────────────────┐
│                     COMPONENTS (React)                          │
│   Client Components (hooks) ←→ Server Components (async)       │
└────────────────┬──────────────────────┬─────────────────────────┘
                 │                      │
                 ▼                      ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│     SERVER ACTIONS       │  │    SERVER COMPONENTS     │
│   src/lib/actions/       │  │    (direct DAL calls)    │
│   Validate → Auth →     │  │                          │
│   Authorize → DAL call  │  │                          │
└────────────┬────────────┘  └────────────┬────────────┘
             │                            │
             ▼                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA ACCESS LAYER (DAL)                       │
│                    src/lib/dal/                                   │
│                                                                  │
│   groups.ts │ members.ts │ matches.ts │ scenarios.ts │ ...      │
│                                                                  │
│   • All Supabase queries live here                               │
│   • Typed inputs and outputs                                     │
│   • Handles error wrapping                                       │
│   • Single source of truth for query logic                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE CLIENT                               │
│   src/lib/supabase/server.ts (server) / client.ts (browser)     │
│                                                                  │
│   Connects to Supabase Cloud (prod) or Supabase Local (dev)     │
│   — determined by NEXT_PUBLIC_SUPABASE_URL env var               │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                    CRON EDGE FUNCTION                            │
│                    supabase/functions/match-cron/                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CRICKET API ABSTRACTION                       │
│                    src/lib/cricket-api/                           │
│                                                                  │
│   index.ts ── checks NEXT_PUBLIC_MOCK_MODE                      │
│       ├── MOCK_MODE=false → client.ts (real HTTP to cricapi.com)│
│       └── MOCK_MODE=true  → mock.ts (reads from mock-data/)    │
│                                                                  │
│   Both implement the same CricketApiClient interface             │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 DAL Pattern

Every DAL function:
1. Accepts typed parameters
2. Creates the Supabase client (server or browser depending on context)
3. Executes the query
4. Returns typed results or null/error

```typescript
// src/lib/dal/groups.ts
import { createClient } from '@/lib/supabase/server';
import type { Group, GroupWithMembers } from '@/types';

export async function getGroupsByUser(userId: string): Promise<Group[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('group_members')
    .select('group:groups(*), role, status')
    .eq('user_id', userId)
    .eq('status', 'approved');

  if (error) throw error;
  return data.map(row => ({ ...row.group, role: row.role }));
}

export async function getGroupByInviteCode(code: string): Promise<Group | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('invite_code', code)
    .single();

  if (error) return null;
  return data;
}

export async function createGroup(name: string, userId: string): Promise<Group> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('groups')
    .insert({ name, created_by: userId })
    .select()
    .single();

  if (error) throw error;

  // Auto-add creator as owner
  await supabase.from('group_members').insert({
    group_id: data.id,
    user_id: userId,
    role: 'owner',
    status: 'approved',
    approved_at: new Date().toISOString(),
  });

  return data;
}
```

Server Actions become thin wrappers that validate, authenticate, authorize, and delegate:

```typescript
// src/lib/actions/groups.ts
'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import * as groupsDal from '@/lib/dal/groups';

const createGroupSchema = z.object({ name: z.string().min(2).max(50) });

export async function createGroupAction(formData: FormData) {
  // 1. Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // 2. Validate
  const parsed = createGroupSchema.safeParse({ name: formData.get('name') });
  if (!parsed.success) return { error: parsed.error.flatten() };

  // 3. Rate limit check (via DAL)
  const existingGroups = await groupsDal.getGroupsByUser(user.id);
  if (existingGroups.length >= 10) return { error: 'Max 10 groups per user' };

  // 4. Delegate to DAL
  try {
    const group = await groupsDal.createGroup(parsed.data.name, user.id);
    return { success: true, data: group };
  } catch (err) {
    return { error: 'Failed to create group' };
  }
}
```

### 9.3 DAL Module Responsibilities

| DAL Module | Key Functions | Used By |
|-----------|---------------|---------|
| `groups.ts` | getGroupById, getGroupsByUser, getGroupByInviteCode, createGroup | actions/groups, dashboard page, join page |
| `members.ts` | getMembers, getPendingRequests, updateMemberStatus, updateMemberRole | actions/groups, admin panel, group home |
| `matches.ts` | getUpcomingMatches, getMatchById, getMatchesForDate, updateMatchResults, updateLiveSnapshot | actions/admin, group home, prediction page, cron |
| `scenarios.ts` | getScenariosForMatch, seedSystemScenarios, createCustomScenario, resolveScenario, removeScenario | actions/scenarios, actions/admin, prediction page, cron |
| `predictions.ts` | getPredictionsForUser, getPredictionsForScenario, upsertPrediction, isDeadlinePassed | actions/predictions, prediction page, leaderboard |
| `standings.ts` | getSeasonStandings, getMatchLeaderboard | standings page, match leaderboard page |
| `notifications.ts` | getNotifications, getUnreadCount, markRead, markAllRead, createNotification | actions/notifications, notification bell, actions/* |
| `players.ts` | getPlayersForTeam, getMatchSquad, upsertPlayersFromApi | prediction page (dropdowns), cron |
| `teams.ts` | getAllTeams, getTeamByCode | constants, match card, team badges |

### 9.4 Cricket API Abstraction (Mock Mode)

The cricket API uses an interface pattern. Both the real and mock clients implement the same contract:

```typescript
// src/lib/cricket-api/types.ts
export interface CricketApiClient {
  getMatches(offset?: number): Promise<MatchesResponse | null>;
  getMatchInfo(matchId: string): Promise<MatchInfoResponse | null>;
  getScorecard(matchId: string): Promise<ScorecardResponse | null>;
  getSquad(matchId: string): Promise<SquadResponse | null>;
  getSeriesInfo(seriesId: string): Promise<SeriesInfoResponse | null>;
}
```

```typescript
// src/lib/cricket-api/index.ts
import { RealCricketApiClient } from './client';
import { MockCricketApiClient } from './mock';
import type { CricketApiClient } from './types';

const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

export const cricketApi: CricketApiClient = isMockMode
  ? new MockCricketApiClient()
  : new RealCricketApiClient();
```

```typescript
// src/lib/cricket-api/client.ts — Real API
export class RealCricketApiClient implements CricketApiClient {
  private baseUrl = process.env.CRICKET_API_BASE_URL!;
  private apiKey = process.env.CRICKET_API_KEY!;

  async getScorecard(matchId: string): Promise<ScorecardResponse | null> {
    try {
      const res = await fetch(
        `${this.baseUrl}/match_scorecard?apikey=${this.apiKey}&id=${matchId}`
      );
      if (!res.ok) return null;
      const json = await res.json();
      return json.status === 'success' ? json : null;
    } catch {
      return null;
    }
  }
  // ... other methods follow the same pattern
}
```

```typescript
// src/lib/cricket-api/mock.ts — Mock API (reads local JSON)
import type { CricketApiClient, ScorecardResponse } from './types';
import matchesData from '@/lib/mock-data/matches.json';

export class MockCricketApiClient implements CricketApiClient {
  // Track simulated match phase for progressive resolution testing
  private matchPhase: Record<string, string> = {};

  async getScorecard(matchId: string): Promise<ScorecardResponse | null> {
    const phase = this.matchPhase[matchId] || 'completed';
    try {
      // Dynamic import from mock-data/scorecards/match-{N}/{phase}.json
      const data = await import(`@/lib/mock-data/scorecards/${matchId}/${phase}.json`);
      return data.default;
    } catch {
      return null;
    }
  }

  // Advance the simulated match phase (called by mock cron or test harness)
  advancePhase(matchId: string, phase: string) {
    this.matchPhase[matchId] = phase;
  }

  async getMatches(): Promise<MatchesResponse | null> {
    return matchesData as MatchesResponse;
  }

  // ... other methods read from corresponding mock-data/ files
}
```

### 9.5 Mock Data Structure

Mock data files simulate real CricketData.org API responses, recorded from actual matches or hand-crafted:

```
src/lib/mock-data/
├── matches.json              # /matches response — 5-10 IPL fixtures
├── squads/
│   ├── match-1.json          # /match_squad response — CSK vs MI playing XI
│   └── match-2.json          # /match_squad response — RCB vs SRH
├── scorecards/
│   ├── match-1/
│   │   ├── toss.json         # Scorecard after toss (tossWinner set, no batting data)
│   │   ├── powerplay.json    # After 6 overs (partial batting/bowling, FOW data)
│   │   ├── innings-break.json # End of first innings (full 1st innings data)
│   │   ├── mid-match.json    # During 2nd innings (partial 2nd innings)
│   │   └── completed.json    # Match complete (full scorecard, winner, POTM)
│   └── match-2/
│       └── completed.json    # Simpler — just the final result
└── README.md                 # How to add new mock matches
```

Each scorecard JSON is a full `ScorecardResponse` matching the types in `src/lib/cricket-api/types.ts`. The `scorecard-parser.ts` processes these identically to real API responses — no special mock parsing needed.

**Creating mock data:** Record real API responses during a live non-IPL T20 match using the CricketData.org free tier (100 calls/day). Save the JSON at each match phase. This gives us realistic test data.

---

## 10. Local Development Setup

### 10.1 Prerequisites

- Node.js 20+
- Docker (required for Supabase local)
- Supabase CLI (`npm install -g supabase`)

### 10.2 First-Time Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd cric-predictor/web-app
npm install

# 2. Start Supabase local (Docker must be running)
cd ../supabase
supabase start
# Output shows: API URL, anon key, service_role key — copy these

# 3. Create .env.local from template
cd ../web-app
cp .env.local.example .env.local
# Edit .env.local — paste the Supabase local keys, set MOCK_MODE=true

# 4. Reset DB with migrations + seed data
cd ../supabase
supabase db reset
# This runs all migrations (001-005) + seed.sql (test data)

# 5. Start dev server
cd ../web-app
npm run dev
# App runs at http://localhost:3000
```

### 10.3 What Supabase Local Gives You

| Feature | Local Behavior |
|---------|---------------|
| **Postgres** | Full local database, same as cloud. All tables, views, functions, RLS. |
| **Auth** | Works locally. Magic link emails are captured by Inbucket at `http://127.0.0.1:54324` — no real email sent. |
| **Realtime** | Full WebSocket support locally. Live leaderboard works. |
| **Edge Functions** | Can be run locally with `supabase functions serve`. |
| **Studio** | Supabase dashboard at `http://127.0.0.1:54323` for browsing tables, running SQL. |

### 10.4 Seed Data (`supabase/seed.sql`)

The seed file creates a complete local test environment:

```sql
-- Test users (created via auth.users, triggers auto-create profiles)
-- User 1: "Test Admin" — testadmin@bragg.local
-- User 2: "Test Member" — testmember@bragg.local
-- User 3: "Test Member 2" — testmember2@bragg.local

-- Test group: "Office Cricket Gang"
-- Test Admin is owner, both Test Members are approved

-- First 3 IPL matches seeded with api_match_id pointing to mock data files
-- Match 1: CSK vs MI (upcoming, tomorrow)
-- Match 2: RCB vs SRH (upcoming, day after)
-- Match 3: KKR vs DC (completed, with results populated)

-- System scenarios seeded for all 3 matches in the test group
-- Sample predictions for Match 3 (the completed match) for all 3 users
-- Sample resolved predictions with points — leaderboard shows real data
```

This means after `supabase db reset`, you can:
- Log in as any test user (check Inbucket for magic link)
- See the test group with members
- See upcoming matches with prediction forms
- See a completed match with a populated leaderboard and standings

### 10.5 Mock Mode vs Production — What Changes

| Component | `MOCK_MODE=true` (local dev) | `MOCK_MODE=false` (production) |
|-----------|------------------------------|-------------------------------|
| **DB queries (DAL)** | Supabase Local (real Postgres) | Supabase Cloud (real Postgres) |
| **Auth** | Supabase Local (Inbucket for emails) | Supabase Cloud (real email delivery) |
| **Realtime** | Supabase Local (real WebSocket) | Supabase Cloud (real WebSocket) |
| **RLS policies** | Same policies, fully enforced | Same policies, fully enforced |
| **CricketData.org API** | Mock client → reads local JSON | Real client → HTTP to cricapi.com |
| **Cron Edge Function** | Can run locally via `supabase functions serve`, uses mock API | Runs on Supabase cloud, uses real API |

**Key point:** The DAL code is identical in both modes. Only the cricket API client is swapped. This means any bug found in local dev exists in production too — high test fidelity.

### 10.6 Testing a Full Match Lifecycle Locally

To simulate a live match from start to finish using mock data:

```bash
# 1. Ensure mock data exists for match-1 (all phases: toss → completed)
# 2. Start the app with MOCK_MODE=true
# 3. Log in as Test Admin, navigate to the test group
# 4. Submit predictions for Match 1

# 5. Simulate the cron manually (or run the Edge Function locally):
#    - Update match status to 'live' in Supabase Studio
#    - The mock cricket API will return toss.json, then powerplay.json, etc.
#    - Each call to the scorecard parser triggers progressive resolution
#    - The leaderboard updates in real-time via Supabase Local Realtime

# 6. To advance the match phase, either:
#    a. Call the mock client's advancePhase() from a test script
#    b. Or manually update the match status in Supabase Studio and re-run cron
```

---

## 11. Timezone Strategy

All match scheduling is in IST (Indian Standard Time, UTC+5:30). Strategy:

**Storage:**
- `matches.date` — stored as `DATE` (no timezone, represents the IST date)
- `matches.time_ist` — stored as `TIME` (no timezone, represents IST time)
- All `TIMESTAMPTZ` columns (deadlines, submitted_at, etc.) — stored as UTC internally by Postgres, displayed in IST on the client

**Default Deadline Computation:**
```typescript
function getDefaultDeadline(matchDate: string, matchTimeIST: string): Date {
  // Combine date + time in IST, subtract 45 minutes
  const matchMoment = new Date(`${matchDate}T${matchTimeIST}+05:30`);
  return new Date(matchMoment.getTime() - 45 * 60 * 1000);
}
```

**Client Display:**
- All dates/times displayed in IST using `Intl.DateTimeFormat` with `timeZone: 'Asia/Kolkata'`
- Countdown timers use the user's local clock but compare against UTC-stored deadlines

**Cron Activation Window:**
```typescript
// IST = UTC + 5:30.
// Active window: 2 PM IST (= 08:30 UTC) to 1 AM IST next day (= 19:30 UTC)
const utcHour = now.getUTCHours();
const utcMin = now.getUTCMinutes();
const utcDecimal = utcHour + utcMin / 60;

// Active if UTC time is between 08:30 (2 PM IST) and 19:30 (1 AM IST next day)
const isActive = utcDecimal >= 8.5 || utcDecimal < 19.5;
// Note: this wraps past midnight UTC.
// 08:30 UTC = 14:00 IST (2 PM), 19:30 UTC = 01:00 IST next day (1 AM)
// BUT this means the window is 08:30 to 24:00 + 00:00 to 19:30 = almost 24h.
// The correct non-active window is 19:30 UTC to 08:30 UTC (1 AM IST to 2 PM IST).
// Simplified: INACTIVE if utcDecimal >= 19.5 AND utcDecimal < 8.5
// Which means: ACTIVE if NOT (utcDecimal >= 19.5 AND utcDecimal < 8.5)
// Since 19.5 > 8.5, this wraps: INACTIVE = (utcDecimal >= 19.5 || utcDecimal < 8.5)
const isInactive = utcDecimal >= 19.5 || utcDecimal < 8.5;
if (isInactive) return; // Skip — outside match hours
```

---

## 12. Notification Creation Mechanism

Notifications are created at specific application events. Each mechanism:

| Event | Created By | Trigger Point | Available From |
|-------|-----------|--------------|----------------|
| New join request | Server Action (`joinGroup`) | After inserting `group_members` row with `status = 'pending'` | Phase 2 |
| Request approved/rejected | Server Action (`approveJoin` / `rejectJoin`) | After updating `group_members.status` | Phase 2 |
| Results in | Server Action (`enterResults`) or Cron | After `resolve_match_predictions()` completes | Phase 2 (manual) / Phase 3 (auto) |
| Custom scenario proposed | Server Action (`createCustomScenario`) | After inserting scenario with `approval_status = 'pending'` | Phase 2 |
| Custom scenario approved | Server Action (`approveScenario`) | After updating scenario's `approval_status` | Phase 2 |
| Predictions open | Cron Edge Function | When match status is upcoming and current time is within deadline window (first time only) | Phase 3 only |
| Deadline approaching | Cron Edge Function | 30 min before deadline, for members who haven't predicted (checked via LEFT JOIN on predictions) | Phase 3 only |

**Phase dependency note:** "Predictions open" and "Deadline approaching" notifications require the cron (Phase 3). During Phase 2 (manual-only), these notifications will not fire. This is an acceptable limitation — users will rely on group chat to remind each other before Match 1.

**Consolidation rule (per PRD):** "Predictions open" and "Deadline approaching" notifications for the same match must be consolidated across groups. A user in 3 groups watching the same match gets ONE notification listing all groups (e.g., "Predictions open for CSK vs MI in Office Gang, College Boys, Family"), NOT 3 separate notifications. Implementation: the cron groups all of a user's groups for a given match and creates a single notification row with a message listing all group names.

**Implementation:** Each Server Action / cron handler creates notification rows directly via INSERT. No DB triggers — this keeps notification logic explicit and testable. The notification creation is the last step in each action, after the primary mutation succeeds.

**Batch notifications:** "Predictions open" and "deadline approaching" notifications are batch-created by the cron for all members across all groups for a given match, with `group_id` set per notification so the message can say "Predictions open in [Group Name]".

---

## 13. View Security

The `season_standings` and `match_leaderboard` views bypass RLS by default in Postgres. Fix:

```sql
-- Create views with security_invoker to respect RLS of underlying tables
CREATE OR REPLACE VIEW public.season_standings
WITH (security_invoker = true)
AS
SELECT ... ;

CREATE OR REPLACE VIEW public.match_leaderboard
WITH (security_invoker = true)
AS
SELECT ... ;
```

Since the underlying tables (`predictions`, `scenarios`, `profiles`) all have `SELECT` policies allowing authenticated users, this works correctly — authenticated users can read the views, anonymous cannot.

---

## 14. Prediction Upsert Pattern

Predictions use `UNIQUE (user_id, scenario_id)`. Submitting and editing use the same upsert. This logic lives in the DAL (`src/lib/dal/predictions.ts`), not in Server Actions:

```typescript
// src/lib/dal/predictions.ts
import { createClient } from '@/lib/supabase/server';

export async function upsertPrediction(
  userId: string,
  scenarioId: string,
  value: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('predictions')
    .upsert(
      {
        user_id: userId,
        scenario_id: scenarioId,
        value,
        submitted_at: new Date().toISOString(), // Always update for tiebreaking
      },
      { onConflict: 'user_id,scenario_id' }
    );
  if (error) throw error;
}

// Called from Server Action: actions/predictions.ts
// The action validates input, checks auth, checks deadline, then calls:
//   for (const pick of picks) {
//     await upsertPrediction(user.id, pick.scenarioId, pick.value);
//   }
```

**Key behavior:** `submitted_at` is always set to `now()` on both insert and update. This means editing a prediction resets the tiebreaker timestamp — intentional per PRD ("All edits update `submitted_at` timestamp").

---

## 15. Known Limitations & Fallbacks

### Powerplay Score Extraction
The CricketData.org scorecard API provides fall-of-wickets (FOW) data with over numbers, but does NOT provide a direct "score at end of over 6" field. Options:

1. **Primary:** Use FOW data — if a wicket fell at/after over 6, we know the score at that dismissal. Work backwards: `score_at_dismissal` for the last wicket before over 6, plus estimated runs.
2. **Fallback:** If no wicket falls in the powerplay (0 wickets in first 6 overs), we cannot determine powerplay score from FOW data. In this case, mark `powerplay_score` as NULL and flag for admin manual entry.
3. **Future:** If ball-by-ball (`/match_bbb`) endpoint becomes stable, we can compute exact powerplay scores.

### Player of the Match
Not always present in the scorecard response. The cron should check for it, but POTM resolution may require admin manual entry for most matches.

### Display Name in Magic Link Flow
Supabase `signInWithOtp` supports `options.data` for user metadata:
```typescript
await supabase.auth.signInWithOtp({
  email,
  options: {
    shouldCreateUser: true,
    data: { display_name: displayName }, // Stored in raw_user_meta_data
    emailRedirectTo: `${origin}/auth/callback`,
  },
});
```
The `handle_new_user()` trigger reads `raw_user_meta_data->>'display_name'` to populate `profiles.display_name`.

**UX flow:** The login page always shows both display name and email fields. For returning users, display name is ignored (profile already exists). For new users, both are used. No need to differentiate — Supabase handles `shouldCreateUser` automatically.

---

## 16. Testing Strategy

### 16.1 Critical Path Tests (Manual for MVP)

1. **Auth flow:** Sign up → magic link → login → session persist → sign out
2. **Group flow:** Create → share link → join in incognito → pending → approve → access
3. **Prediction flow:** Open prediction page → select picks → submit → edit → verify deadline lock
4. **Results flow:** Admin enters results → leaderboard scores correctly → standings update
5. **Live flow (once API is integrated):** Match goes live → cron polls → scenarios resolve → leaderboard updates

### 16.2 Edge Cases to Test

- User in 3 groups predicting the same match with different picks
- Double-header day (two matches, both showing correctly)
- Abandoned match (predictions voided correctly)
- Mid-season joiner (starts at 0, "Joined in Match X" badge shows)
- Magic link on mobile Gmail app (in-app browser issues)
- Concurrent submissions from same user (race condition on upsert)

---

*Last updated: March 26, 2026*
