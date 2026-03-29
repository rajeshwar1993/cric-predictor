# Technical Architecture: Prediction Reveal Table
**Author**: PSE Agent
**Date**: 2026-03-29
**Status**: Draft
**Feature**: Prediction Reveal Table

---

## 1. Data Model Changes

### 1.1 Schema Assessment

**No new tables, columns, or migrations are required.**

All data needed for the Prediction Reveal Table already exists:

| Table | Fields Used | Purpose |
|---|---|---|
| `predictions` | `user_id`, `scenario_id`, `value`, `is_correct`, `points_earned` | The prediction values and resolution state for each cell |
| `scenarios` | `id`, `group_id`, `match_id`, `title`, `system_category`, `points`, `is_removed`, `approval_status` | Column definitions (which scenarios to show) |
| `group_members` | `group_id`, `user_id`, `status` | Row definitions (which members to show) |
| `profiles` | `id`, `display_name` | Display names for member rows |
| `matches` | `id`, `status`, `date`, `time_ist`, `team_a`, `team_b`, `match_number` | Lock condition check, table caption |
| `match_group_settings` | `group_id`, `match_id`, `prediction_deadline`, `is_locked` | Custom deadline and manual lock state |

### 1.2 New DAL Function: `getAllPredictionsForMatch`

**Location**: `web-app/src/lib/dal/predictions.ts`

**Purpose**: Fetch all predictions for all approved scenarios in a group+match, across all group members, in a single query. This powers the full member-by-scenario matrix.

**Supabase Query**:

```ts
const { data, error } = await supabase
  .from("predictions")
  .select(`
    user_id,
    scenario_id,
    value,
    is_correct,
    points_earned
  `)
  .in("scenario_id", scenarioIds)
  .order("submitted_at", { ascending: true });
```

The query uses `.in("scenario_id", scenarioIds)` where `scenarioIds` is pre-fetched from the scenarios DAL. This is a two-step approach (fetch scenarios, then fetch predictions for those scenario IDs) matching the existing pattern in `getUserPredictionCount` and `hasAnyPredictionsForMatch`.

**Why not a join?** Supabase's PostgREST client does not support arbitrary JOINs across tables without a foreign key relationship defined in the schema. `predictions` references `scenarios` via `scenario_id`, but the Supabase JS client's `.select()` with embedded resources works bottom-up from the predictions table. Since we already have a DAL function `getScenariosForMatch` that returns the exact scenario list, it is cleaner and more maintainable to reuse that and pass the IDs to a predictions query. This avoids duplicating the scenario filter logic (`is_removed = false`, `approval_status IN (...)`) inside the predictions query.

**Full Function Signature**:

```ts
export interface RevealPrediction {
  user_id: string;
  scenario_id: string;
  value: string;
  is_correct: boolean | null;
  points_earned: number;
}

/**
 * Fetch all predictions for the given scenario IDs.
 * Used by the Prediction Reveal Table to build the full member x scenario matrix.
 * RLS enforces visibility: returns empty pre-deadline, full data post-deadline.
 */
export async function getAllPredictionsForMatch(
  scenarioIds: string[]
): Promise<RevealPrediction[]> {
  if (scenarioIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("predictions")
    .select("user_id, scenario_id, value, is_correct, points_earned")
    .in("scenario_id", scenarioIds);

  if (error || !data) {
    if (error)
      logError({
        layer: "dal",
        operation: "getAllPredictionsForMatch",
        metadata: { scenarioCount: scenarioIds.length },
      }, error);
    return [];
  }
  return data;
}
```

**Return Type**: Flat array of `RevealPrediction`. The transformation into the member-by-scenario matrix (nested `Record<userId, Record<scenarioId, prediction>>`) happens in the server component, not in the DAL. The DAL stays data-shape-agnostic, consistent with other DAL functions that return flat arrays.

**RLS Behavior**: The `read_others_after_deadline` policy on `predictions` automatically filters results. Pre-deadline, only the current user's own predictions are returned. Post-deadline, all group members' predictions for those scenarios are returned. No additional authorization logic is needed in the DAL.

---

## 2. API / Data Layer

### 2.1 Data Fetching Strategy

The Prediction Reveal Table uses a **server-side initial fetch + client-side polling** pattern, identical to the existing `LiveMatchScorecard` architecture.

**Server-side (SSR)**:
1. The match page server component already fetches `match` and `leaderboard`.
2. For the reveal table, it additionally fetches (in parallel):
   - `matchGroupSettings` via `matchesDal.getMatchGroupSettings(groupId, matchId)`
   - `scenarios` via `scenariosDal.getScenariosForMatch(groupId, matchId)`
   - `members` via `membersDal.getMembers(groupId)`
   - `predictions` via `predictionsDal.getAllPredictionsForMatch(scenarioIds)`

Note: `predictions` depends on `scenarios` (needs scenario IDs), so these two calls are sequential. But `members` and `matchGroupSettings` can be fetched in parallel with `scenarios`.

**Fetch flow in the server component**:

```ts
// Already fetched by existing code:
const [match, leaderboard] = await Promise.all([
  matchesDal.getMatchById(matchId),
  standingsDal.getMatchLeaderboard(groupId, matchId),
]);

// New fetches for reveal table (parallel where possible):
const [matchGroupSettings, scenarios, members] = await Promise.all([
  matchesDal.getMatchGroupSettings(groupId, matchId),
  scenariosDal.getScenariosForMatch(groupId, matchId),
  membersDal.getMembers(groupId),
]);

// Sequential: predictions depend on scenario IDs
const scenarioIds = scenarios.map((s) => s.id);
const predictions = await predictionsDal.getAllPredictionsForMatch(scenarioIds);
```

**Client-side (Polling)**:
During live matches, a `usePredictionPolling` hook polls the predictions table every 30 seconds to pick up `is_correct` changes as scenarios resolve. This is modeled on `useMatchPolling`.

### 2.2 RLS Policy Verification

The existing `read_others_after_deadline` RLS policy on `predictions` (defined in migration `003_rls_policies.sql`, hardened in `009_rls_audit_fixes.sql` and `017-019`) handles authorization.

**Policy logic** (paraphrased):
```sql
-- User can SELECT from predictions WHERE:
--   auth.uid() = user_id                              -- always see own
--   OR (
--     is_group_member(scenario.group_id, auth.uid())  -- must be in the group
--     AND (
--       match.status IN ('live','completed','abandoned','no_result')
--       OR mgs.is_locked = true
--       OR now() > computed_deadline
--     )
--   )
```

**No new RLS policies are needed.** The existing policies cover:
- `read_own_predictions`: User always sees their own predictions (used before deadline).
- `read_others_after_deadline`: After lock, all group members see all predictions for that group's scenarios.
- Scenarios are readable by group members via the `select_scenarios` policy.
- Group members and profiles are readable by authenticated group members.

**Verification checklist**:
- [x] Pre-deadline: RLS returns only the current user's predictions. The frontend shows the locked placeholder, never attempts to render others' predictions.
- [x] Post-deadline (match upcoming but locked): `mgs.is_locked = true` satisfies the policy. All predictions visible.
- [x] Match live: `match.status = 'live'` satisfies the policy.
- [x] Match completed: `match.status = 'completed'` satisfies the policy.
- [x] Removed member's predictions: The member is removed from `group_members` (status = 'removed'), so they won't appear in the `getMembers()` result. Their predictions still exist in the DB but their row won't render in the table.

### 2.3 Data Transformation: Building the Member x Scenario Matrix

The flat `RevealPrediction[]` array from the DAL must be transformed into a nested lookup structure for efficient rendering. This transformation happens in the `PredictionRevealSection` server component.

**Input**:
```ts
predictions: RevealPrediction[]
// e.g., [{ user_id: "a", scenario_id: "s1", value: "CSK", is_correct: true, points_earned: 10 }, ...]
```

**Output**:
```ts
type PredictionMatrix = Record<string, Record<string, { value: string; isCorrect: boolean | null }>>;
// predictionMatrix[userId][scenarioId] = { value, isCorrect }
```

**Transformation function** (pure, lives in the component file or a utility):
```ts
function buildPredictionMatrix(
  predictions: RevealPrediction[]
): Record<string, Record<string, { value: string; isCorrect: boolean | null }>> {
  const matrix: Record<string, Record<string, { value: string; isCorrect: boolean | null }>> = {};

  for (const p of predictions) {
    if (!matrix[p.user_id]) {
      matrix[p.user_id] = {};
    }
    matrix[p.user_id][p.scenario_id] = {
      value: p.value,
      isCorrect: p.is_correct,
    };
  }

  return matrix;
}
```

**Why `Record` instead of `Map`?** The data is serialized from server component to client component via props. `Map` is not serializable across the React Server Components boundary. `Record<string, ...>` (plain object) serializes cleanly. The UI/UX spec initially suggested `Map`, but the implementation must use plain objects for SSR compatibility.

---

## 3. Component Architecture

### 3.1 Component Hierarchy

```
MatchLeaderboardPage (server component, EXISTING — page.tsx)
|
+-- ... (back link, match header card, LiveMatchScorecard, MatchLeaderboard)
|
+-- PredictionRevealSection (server component, NEW)
    |
    +-- [if pre-lock] RevealLockedPlaceholder (client component, NEW)
    |   +-- uses useCountdown hook (EXISTING)
    |
    +-- [if post-lock, has scenarios + members]
    |   RevealTablePollingWrapper (client component, NEW)
    |   +-- uses usePredictionPolling hook (NEW)
    |   +-- PredictionRevealTable (presentational component, NEW)
    |   |   +-- <table> with <thead>, <tbody>
    |   |   +-- RevealCell (sub-component, inline or extracted)
    |   |   +-- RevealColorLegend (presentational component, NEW)
    |   |
    |   +-- [if 1 member] Solo squad nudge
    |
    +-- [if post-lock, no scenarios] null (does not render)
    +-- [if post-lock, no predictions at all] Empty state
```

### 3.2 Server vs. Client Component Decisions

| Component | Type | Rationale |
|---|---|---|
| `PredictionRevealSection` | **Server** | Performs all data fetching (DAL calls require server Supabase client). Computes the lock condition. Passes SSR data as props to client children. No interactivity needed at this level. |
| `RevealLockedPlaceholder` | **Client** | Needs `useCountdown` hook for live countdown timer (client-side `setInterval`). |
| `RevealTablePollingWrapper` | **Client** | Needs `usePredictionPolling` hook for live match polling (client-side `setInterval`, Page Visibility API, browser Supabase client). |
| `PredictionRevealTable` | **Presentational (no directive)** | Pure render component. Receives all data via props. No hooks, no state, no side effects. Can be rendered by either server or client parent. Since its parent (`RevealTablePollingWrapper`) is a client component, it will be a client component in practice but does not need its own `'use client'` directive. |
| `RevealColorLegend` | **Presentational (no directive)** | Same as above. Pure props-in, JSX-out. |

### 3.3 Props Interfaces

#### `PredictionRevealSection`

```ts
interface PredictionRevealSectionProps {
  groupId: string;
  matchId: number;
  currentUserId: string;
  matchStatus: MatchStatus;
  matchDate: string;         // match.date
  matchTimeIst: string;      // match.time_ist
  teamA: string;             // for table caption
  teamB: string;             // for table caption
  matchNumber: number;       // for table caption
}
```

This is a server component. It performs its own data fetching internally (scenarios, members, predictions, match group settings) rather than receiving data as props. This follows the codebase pattern where server components own their data fetching.

#### `RevealLockedPlaceholder`

```ts
interface RevealLockedPlaceholderProps {
  deadline: Date;
}
```

#### `RevealTablePollingWrapper`

```ts
interface RevealTablePollingWrapperProps {
  initialPredictions: Record<string, Record<string, { value: string; isCorrect: boolean | null }>>;
  members: { userId: string; displayName: string }[];
  scenarios: { id: string; title: string; systemCategory: string | null; points: number }[];
  currentUserId: string;
  matchStatus: MatchStatus;
  matchId: number;
  groupId: string;
  teamA: string;
  teamB: string;
  matchNumber: number;
}
```

#### `PredictionRevealTable`

```ts
interface PredictionRevealTableProps {
  members: { userId: string; displayName: string }[];
  scenarios: { id: string; title: string; systemCategory: string | null; points: number }[];
  predictions: Record<string, Record<string, { value: string; isCorrect: boolean | null }>>;
  currentUserId: string;
  teamA: string;
  teamB: string;
  matchNumber: number;
}
```

#### `RevealColorLegend`

```ts
// No props needed. Renders static content.
```

### 3.4 Polling Architecture

**New hook: `usePredictionPolling`**

Located at `web-app/src/hooks/use-prediction-polling.ts`. Modeled directly on `useMatchPolling` with these differences:

| Aspect | `useMatchPolling` | `usePredictionPolling` |
|---|---|---|
| **Table queried** | `matches` | `predictions` |
| **Query filter** | `.eq("id", matchId)` | `.in("scenario_id", scenarioIds)` |
| **Columns fetched** | Score, overs, batting team, status | `user_id`, `scenario_id`, `is_correct` (only resolution status, not `value` -- value does not change) |
| **Poll interval** | 120s (2 min) | 30s (matches live score refresh cadence from NFR-002) |
| **Active when** | `status === "live"` | `status === "live"` |
| **Stop condition** | `data.status !== "live"` | Externally signaled via `matchStatus` prop change |
| **Page Visibility** | Pause on hidden, fetch+resume on visible | Same |
| **Error handling** | Silent swallow, dev console warn | Same |
| **Concurrent fetch guard** | `isFetchingRef` | Same |

**Hook signature**:

```ts
interface UsePredictionPollingOptions {
  scenarioIds: string[];
  matchStatus: MatchStatus;
  initialData: Record<string, Record<string, { value: string; isCorrect: boolean | null }>>;
  intervalMs?: number; // default 30_000
}

interface UsePredictionPollingReturn {
  predictions: Record<string, Record<string, { value: string; isCorrect: boolean | null }>>;
  isPolling: boolean;
}

export function usePredictionPolling(options: UsePredictionPollingOptions): UsePredictionPollingReturn;
```

**Polling query** (client-side, using browser Supabase client):

```ts
const { data, error } = await supabase
  .from("predictions")
  .select("user_id, scenario_id, is_correct")
  .in("scenario_id", scenarioIds);
```

**Why only `is_correct`?** The `value` field never changes after submission. Only `is_correct` transitions from `null` to `true`/`false` as scenarios resolve. However, we still include `user_id` and `scenario_id` to map the results back to the matrix. The `value` field is excluded from the poll query to minimize payload. On poll response, the hook merges the updated `is_correct` values into the existing prediction matrix, preserving the original `value` from the SSR data.

**Merge strategy**:

```ts
function mergePollResults(
  current: Record<string, Record<string, { value: string; isCorrect: boolean | null }>>,
  pollData: { user_id: string; scenario_id: string; is_correct: boolean | null }[]
): Record<string, Record<string, { value: string; isCorrect: boolean | null }>> {
  // Shallow clone outer structure
  const updated = { ...current };

  for (const row of pollData) {
    const userPreds = updated[row.user_id];
    if (userPreds && userPreds[row.scenario_id]) {
      // Only update if is_correct actually changed
      if (userPreds[row.scenario_id].isCorrect !== row.is_correct) {
        updated[row.user_id] = {
          ...userPreds,
          [row.scenario_id]: {
            ...userPreds[row.scenario_id],
            isCorrect: row.is_correct,
          },
        };
      }
    }
  }

  return updated;
}
```

This immutable merge ensures React detects state changes and re-renders only when `is_correct` values actually change.

---

## 4. File-by-File Change Plan

### Overview

| # | File | Action | Purpose |
|---|---|---|---|
| 1 | `src/types/index.ts` | Modify | Add `RevealPrediction` and `RevealTableData` types |
| 2 | `src/lib/dal/predictions.ts` | Modify | Add `getAllPredictionsForMatch()` function |
| 3 | `src/lib/constants.ts` | Modify | Add `REVEAL_TABLE_COPY` and `SCENARIO_SHORT_LABELS` constants |
| 4 | `src/hooks/use-prediction-polling.ts` | Create | New polling hook for live prediction resolution updates |
| 5 | `src/components/leaderboard/reveal-color-legend.tsx` | Create | Color legend sub-component |
| 6 | `src/components/leaderboard/prediction-reveal-table.tsx` | Create | Core table component (presentational) |
| 7 | `src/components/leaderboard/reveal-locked-placeholder.tsx` | Create | Pre-lock placeholder with countdown |
| 8 | `src/components/leaderboard/reveal-table-polling-wrapper.tsx` | Create | Client wrapper with polling |
| 9 | `src/components/leaderboard/prediction-reveal-section.tsx` | Create | Server component: data fetching + visibility gate |
| 10 | `src/app/group/[groupId]/match/[matchId]/page.tsx` | Modify | Import and render `PredictionRevealSection` |

### Detailed Change Plan

---

#### File 1: `src/types/index.ts`
**Action**: Modify
**Dependencies**: None
**What changes**:

Add the following types after the existing `Prediction` interface:

```ts
/**
 * Lightweight prediction data for the Prediction Reveal Table.
 * Returned by getAllPredictionsForMatch() DAL function.
 */
export interface RevealPrediction {
  user_id: string;
  scenario_id: string;
  value: string;
  is_correct: boolean | null;
  points_earned: number;
}

/**
 * Cell data in the reveal table prediction matrix.
 */
export interface RevealCellData {
  value: string;
  isCorrect: boolean | null;
}

/**
 * Member info for the reveal table rows.
 */
export interface RevealMember {
  userId: string;
  displayName: string;
}

/**
 * Scenario info for the reveal table columns.
 */
export interface RevealScenario {
  id: string;
  title: string;
  systemCategory: string | null;
  points: number;
}
```

**Why**: Typed data contracts between the DAL, server component, and client components. Avoids inline type definitions scattered across files. Following the existing pattern where `types/index.ts` holds all application-level interfaces.

---

#### File 2: `src/lib/dal/predictions.ts`
**Action**: Modify
**Dependencies**: File 1 (types)
**What changes**:

Add `RevealPrediction` to the import from `@/types` and add the new function:

```ts
import type { Prediction, RevealPrediction } from "@/types";

/**
 * Fetch all predictions for the given scenario IDs (all users).
 * Used by the Prediction Reveal Table to build the member x scenario matrix.
 * RLS enforces visibility: returns only own predictions pre-deadline,
 * all group members' predictions post-deadline.
 */
export async function getAllPredictionsForMatch(
  scenarioIds: string[]
): Promise<RevealPrediction[]> {
  if (scenarioIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("predictions")
    .select("user_id, scenario_id, value, is_correct, points_earned")
    .in("scenario_id", scenarioIds);

  if (error || !data) {
    if (error)
      logError({
        layer: "dal",
        operation: "getAllPredictionsForMatch",
        metadata: { scenarioCount: scenarioIds.length },
      }, error);
    return [];
  }
  return data;
}
```

**Why**: Single query to fetch all predictions for a group+match. The existing `getPredictionsForUser` is scoped to one user and `getPredictionsForScenario` is scoped to one scenario. Neither is efficient for the full matrix. This avoids N+1 queries (one per user or one per scenario).

---

#### File 3: `src/lib/constants.ts`
**Action**: Modify
**Dependencies**: None
**What changes**:

Add two new constants at the end of the file:

```ts
// Prediction Reveal Table copy (from copy-spec.md)
export const REVEAL_TABLE_COPY = {
  SECTION_TITLE: "The Reveal",
  PRE_LOCK_MESSAGE: "Picks stay under wraps until lock-in. Sit tight.",
  PRE_LOCK_IMMINENT: "Almost time -- picks drop soon.",
  PRE_LOCK_GENERIC: "Everyone's picks will appear here once predictions lock.",
  EMPTY_NO_PREDICTIONS_TITLE: "No picks on the board",
  EMPTY_NO_PREDICTIONS_BODY:
    "Nobody made a call for this match. Next time, be the one to get things started.",
  EMPTY_SOLO_TITLE: "Just you here",
  EMPTY_SOLO_BODY:
    "Bragging's better with rivals. Share your invite link to fill the squad.",
  EMPTY_NO_SCENARIOS: "No scenarios for this match yet.",
  NO_PICK_CELL: "\u2014",
  LOADING: "Loading picks...",
  MATCH_ABANDONED: "Match called off -- unresolved picks stay as-is.",
  LEGEND_CORRECT: "Nailed It",
  LEGEND_INCORRECT: "Missed",
  LEGEND_PENDING: "In Play",
  LEGEND_NO_PICK: "No Pick",
} as const;

// Scenario column header abbreviations (keyed by system_category)
export const SCENARIO_SHORT_LABELS: Record<string, string> = {
  match_winner: "Winner",
  toss_winner: "Toss",
  top_scorer: "Top Bat",
  top_wicket_taker: "Top Bowl",
  player_of_match: "MoM",
  first_innings_score: "1st Inn",
  total_match_runs: "Runs",
  powerplay_score: "PP Score",
  powerplay_wickets: "PP Wkts",
  total_sixes: "Sixes",
  total_wickets: "Wkts",
  batsman_fifty: "Fifty?",
  bowler_three_wkt: "3-fer?",
  had_super_over: "SO?",
  most_sixes: "Six King",
  first_wicket_over: "1st Wkt",
};
```

**Why**: Single source of truth for all copy and abbreviation strings. Placed alongside `PREDICTION_STATUS` and `SYSTEM_SCENARIOS` for consistency. The copy spec agent specified these exact strings.

**Note on abbreviation style**: The copy spec uses descriptive abbreviations (e.g., "Winner", "Top Bat") rather than the ultra-short codes from the UI/UX spec (e.g., "MW", "TS"). The copy spec takes precedence for user-facing labels per the agent hierarchy. The descriptive abbreviations are more readable on mobile while still being compact enough for 64px columns.

---

#### File 4: `src/hooks/use-prediction-polling.ts`
**Action**: Create
**Dependencies**: File 1 (types), browser Supabase client
**What it does**:

A client-side polling hook modeled on `useMatchPolling`. Polls the `predictions` table every 30 seconds during live matches to pick up `is_correct` changes.

**Key behaviors**:
- Only polls when `matchStatus === "live"`
- Uses Page Visibility API to pause when tab is hidden, resume when visible
- Prevents concurrent fetches via `isFetchingRef`
- Merges poll results immutably into the prediction matrix (only updates `isCorrect`, preserves `value`)
- Silently swallows errors, logs in dev mode
- Returns the latest prediction matrix and a polling status boolean

**Full implementation specification**:

```ts
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MatchStatus } from "@/types/database";
import type { RevealCellData } from "@/types";

const DEFAULT_INTERVAL_MS = 30_000; // 30 seconds

type PredictionMatrix = Record<string, Record<string, RevealCellData>>;

interface UsePredictionPollingOptions {
  scenarioIds: string[];
  matchStatus: MatchStatus;
  initialData: PredictionMatrix;
  intervalMs?: number;
}

interface UsePredictionPollingReturn {
  predictions: PredictionMatrix;
  isPolling: boolean;
}

export function usePredictionPolling({
  scenarioIds,
  matchStatus,
  initialData,
  intervalMs = DEFAULT_INTERVAL_MS,
}: UsePredictionPollingOptions): UsePredictionPollingReturn {
  // ... implementation follows useMatchPolling pattern exactly
  // See useMatchPolling for the full pattern including:
  // - isFetchingRef, intervalIdRef, statusRef, mountedRef
  // - startInterval / stopInterval helpers
  // - fetchPredictions callback that queries predictions table
  // - Main polling effect gated on matchStatus === "live"
  // - Page Visibility API effect
  // - mergePollResults immutable merge
}
```

---

#### File 5: `src/components/leaderboard/reveal-color-legend.tsx`
**Action**: Create
**Dependencies**: File 3 (constants)
**What it does**:

Renders a compact horizontal legend below the table showing the four status indicators (Correct, Missed, In Play, No Pick) with colored squares and labels.

**Spec**:
- Positioned inside the card container, below `</table>`, above the closing `</div>`.
- `flex items-center justify-center gap-4 py-3 border-t border-[var(--border-light)]`
- Each item: 8x8 colored square + `text-[10px] font-display uppercase tracking-wider text-[var(--text-muted)]` label
- Color squares use the same `color-mix` formula as cells
- `role="note"` on container, `aria-hidden="true"` on color swatches

---

#### File 6: `src/components/leaderboard/prediction-reveal-table.tsx`
**Action**: Create
**Dependencies**: Files 1, 3, 5
**What it does**:

The core presentational table component. Receives all data via props. No state, no hooks, no data fetching.

**Key implementation details**:

1. **Semantic HTML**: `<table>`, `<caption>` (sr-only), `<thead>`, `<tbody>`, `<th scope="col">`, `<th scope="row">`, `<td>`.

2. **Scroll container**:
   ```html
   <div role="region" aria-label="Scroll to see more scenario columns" tabindex={0} class="overflow-x-auto">
     <table class="w-full" style={{ minWidth: `${120 + scenarios.length * 64}px` }}>
   ```

3. **Sticky first column**: Applied to the member name `<th scope="row">` and header `<th>`:
   ```
   sticky left-0 z-10 bg-[var(--bg-card)]
   ```
   With a subtle right-edge shadow: `box-shadow: 2px 0 4px -1px rgba(0,0,0,0.15)`.

4. **Column headers**: Use `SCENARIO_SHORT_LABELS[scenario.systemCategory]` for system scenarios, truncated `title` for custom scenarios. Full title in `aria-label` and `title` attribute for hover tooltip. Points badge below (`text-[9px] text-[var(--text-muted)]`).

5. **Row ordering**: Follows leaderboard ranking (by total match points descending). Members not on the leaderboard (zero predictions) are appended alphabetically. The server component passes members already sorted.

6. **Current user highlight**: `bg-[var(--cyan-soft)] border-l-2 border-l-[var(--cyan)]` with "(you)" suffix. `aria-current="true"` on the `<tr>`.

7. **Cell rendering**:
   - Has prediction + correct: Green bg tint + Check icon + value
   - Has prediction + incorrect: Red bg tint + X icon + value
   - Has prediction + pending: Muted slate bg tint + value (no icon)
   - No prediction: Transparent bg + em dash

8. **Cell background colors** (inline styles using `color-mix`):
   ```ts
   const CELL_STYLES = {
     correct: {
       background: "color-mix(in srgb, var(--success) 12%, transparent)",
       color: "var(--success)",
     },
     incorrect: {
       background: "color-mix(in srgb, var(--danger) 12%, transparent)",
       color: "var(--danger)",
     },
     pending: {
       background: "color-mix(in srgb, var(--pending) 8%, transparent)",
       color: "var(--text-secondary)",
     },
     noPick: {
       background: "transparent",
       color: "var(--text-muted)",
     },
   };
   ```

9. **Cell transition**: `transition: background-color 0.5s ease` on all `<td>` elements. Wrapped in `@media (prefers-reduced-motion: no-preference)` for accessibility.

10. **Accessibility icons**: `Check` (lucide, `h-3 w-3`) for correct, `X` (lucide, `h-3 w-3`) for incorrect. `aria-hidden="true"` on icons (the `aria-label` on the `<td>` provides the full description).

11. **Cell aria-labels**: Follow the copy spec pattern:
    - `"{displayName} predicted {value} for {scenarioTitle} -- Nailed It"`
    - `"{displayName} predicted {value} for {scenarioTitle} -- Missed"`
    - `"{displayName} predicted {value} for {scenarioTitle} -- In Play"`
    - `"{displayName} did not predict {scenarioTitle}"`

12. **RevealColorLegend** is rendered inside the card container, below the table.

---

#### File 7: `src/components/leaderboard/reveal-locked-placeholder.tsx`
**Action**: Create
**Dependencies**: File 3 (constants), `useCountdown` hook
**What it does**:

Client component (`'use client'`) that renders the pre-lock placeholder with a countdown timer.

**Spec**:
- Uses `useCountdown(deadline)` from `@/hooks/use-countdown` (existing hook)
- Container: `rounded-[14px] border border-[var(--border-light)] bg-[var(--bg-card)] p-8 text-center`
- Lock icon: `Lock` (lucide), `h-8 w-8 text-[var(--text-muted)]` inside `h-16 w-16 rounded-full bg-[var(--bg-elevated)]` circle
- Section title "The Reveal" as `<h2>` above the card (matching leaderboard heading style)
- Copy: `REVEAL_TABLE_COPY.PRE_LOCK_MESSAGE` or `.PRE_LOCK_IMMINENT` (if countdown < 1 hour)
- Countdown display: `font-stats text-sm text-[var(--cyan)]` showing "Reveal in {countdown}"
- `aria-live="polite"` on the countdown region
- When `isExpired === true` from `useCountdown`: show "Predictions revealed" with a subtle note to refresh

---

#### File 8: `src/components/leaderboard/reveal-table-polling-wrapper.tsx`
**Action**: Create
**Dependencies**: Files 1, 4, 6
**What it does**:

Client component (`'use client'`) that wraps `PredictionRevealTable` and manages the polling lifecycle.

**Implementation**:
```ts
"use client";

import { usePredictionPolling } from "@/hooks/use-prediction-polling";
import { PredictionRevealTable } from "./prediction-reveal-table";
import type { RevealMember, RevealScenario, RevealCellData } from "@/types";
import type { MatchStatus } from "@/types/database";

interface Props {
  initialPredictions: Record<string, Record<string, RevealCellData>>;
  members: RevealMember[];
  scenarios: RevealScenario[];
  currentUserId: string;
  matchStatus: MatchStatus;
  matchId: number;
  groupId: string;
  teamA: string;
  teamB: string;
  matchNumber: number;
}

export function RevealTablePollingWrapper({
  initialPredictions,
  members,
  scenarios,
  currentUserId,
  matchStatus,
  matchId,
  groupId,
  teamA,
  teamB,
  matchNumber,
}: Props) {
  const scenarioIds = scenarios.map((s) => s.id);

  const { predictions } = usePredictionPolling({
    scenarioIds,
    matchStatus,
    initialData: initialPredictions,
  });

  return (
    <PredictionRevealTable
      members={members}
      scenarios={scenarios}
      predictions={predictions}
      currentUserId={currentUserId}
      teamA={teamA}
      teamB={teamB}
      matchNumber={matchNumber}
    />
  );
}
```

---

#### File 9: `src/components/leaderboard/prediction-reveal-section.tsx`
**Action**: Create
**Dependencies**: Files 1, 2, 3, 7, 8; DAL functions; `computeDeadline` utility
**What it does**:

Server component (no `'use client'` directive). This is the top-level component added to the match page. It handles:

1. **Data fetching**: Scenarios, members, predictions, match group settings
2. **Lock condition computation**: Using `computeDeadline()` + `matchStatus` + `isLocked`
3. **Visibility gating**: Renders locked placeholder or table wrapper
4. **Data transformation**: Converts flat predictions array into the matrix
5. **Member ordering**: Sorts members by leaderboard rank, appends non-predictors alphabetically
6. **Empty state handling**: Solo squad, no predictions, no scenarios

**Lock condition logic**:
```ts
const isRevealed =
  matchStatus === "live" ||
  matchStatus === "completed" ||
  matchStatus === "abandoned" ||
  matchStatus === "no_result" ||
  isLocked ||
  new Date() > deadline;
```

**Member ordering logic**:
The `leaderboard` data is passed from the parent page (or fetched here). Members are ordered by their leaderboard rank (highest points first). Members not on the leaderboard are appended alphabetically by display name. This requires the leaderboard data to be available -- the simplest approach is to pass it as a prop from the page.

Updated props to include leaderboard:

```ts
interface PredictionRevealSectionProps {
  groupId: string;
  matchId: number;
  currentUserId: string;
  matchStatus: MatchStatus;
  matchDate: string;
  matchTimeIst: string;
  teamA: string;
  teamB: string;
  matchNumber: number;
  leaderboard: MatchLeaderboardEntry[];  // passed from page for ordering
}
```

---

#### File 10: `src/app/group/[groupId]/match/[matchId]/page.tsx`
**Action**: Modify
**Dependencies**: File 9
**What changes**:

1. Import `PredictionRevealSection`:
   ```ts
   import { PredictionRevealSection } from "@/components/leaderboard/prediction-reveal-section";
   ```

2. Add the component below `<MatchLeaderboard>` in the JSX:
   ```tsx
   {/* Leaderboard */}
   <MatchLeaderboard entries={leaderboard} currentUserId={user.id} />

   {/* Prediction Reveal Table */}
   <PredictionRevealSection
     groupId={groupId}
     matchId={matchId}
     currentUserId={user.id}
     matchStatus={match.status}
     matchDate={match.date}
     matchTimeIst={match.time_ist}
     teamA={match.team_a}
     teamB={match.team_b}
     matchNumber={match.match_number}
     leaderboard={leaderboard}
   />
   ```

**No other changes to the page**. The page already fetches `match` and `leaderboard`. The `PredictionRevealSection` server component handles its own additional data fetching (scenarios, members, predictions, match group settings).

---

### Implementation Order

The files should be implemented in this order based on dependency chain:

```
1. types/index.ts                           (types — no deps)
2. lib/constants.ts                         (constants — no deps)
3. lib/dal/predictions.ts                   (DAL function — depends on types)
4. hooks/use-prediction-polling.ts          (hook — depends on types, client supabase)
5. components/leaderboard/reveal-color-legend.tsx       (presentational — depends on constants)
6. components/leaderboard/prediction-reveal-table.tsx   (presentational — depends on types, constants, legend)
7. components/leaderboard/reveal-locked-placeholder.tsx (client — depends on constants, useCountdown)
8. components/leaderboard/reveal-table-polling-wrapper.tsx (client — depends on types, hook, table)
9. components/leaderboard/prediction-reveal-section.tsx (server — depends on DAL, types, wrapper, placeholder)
10. app/group/[groupId]/match/[matchId]/page.tsx        (integration — depends on section)
```

Steps 1-3 can be done by **PSE-Supabase/Backend**. Steps 4-10 can be done by **PSE-Frontend**. The handoff point is the `getAllPredictionsForMatch` DAL function signature and the types in `index.ts`.

---

## 5. Supabase Considerations

### 5.1 RLS Policy Verification

**No new RLS policies are needed.** Verified against all access patterns:

| Access Pattern | Policy | Status |
|---|---|---|
| Read own predictions (any time) | `read_own_predictions` | Existing, verified |
| Read others' predictions after lock | `read_others_after_deadline` | Existing, verified |
| Read scenarios for group+match | `select_scenarios` (on scenarios table) | Existing, verified |
| Read group members | `select_members` (on group_members table) | Existing, verified |
| Read profiles | `select_profiles` (on profiles table) | Existing, verified |
| Read match data | `select_matches` (on matches table) | Existing, verified |
| Read match_group_settings | `select_mgs` (on match_group_settings table) | Existing, verified |

### 5.2 No New Database Migrations

The feature requires zero schema changes:
- No new tables
- No new columns
- No new indexes (the existing index on `predictions(scenario_id)` is sufficient for the `.in()` query)
- No new database functions
- No new views

### 5.3 Type Generation

The project uses manually maintained types in `src/types/database.ts` (not auto-generated). The new `RevealPrediction` type is added to `src/types/index.ts` as an application-level type, not a database-level type. No changes to `database.ts` are needed.

If the project moves to auto-generated types in the future (`supabase gen types`), the `RevealPrediction` interface would be derived from `Database["public"]["Tables"]["predictions"]["Row"]` with `Pick<>`. For now, the manual type is sufficient and matches the existing pattern.

---

## 6. Integration Plan

### 6.1 Match Page Integration

The `PredictionRevealSection` server component is the only integration point with the existing codebase. It is rendered as a sibling of `MatchLeaderboard` inside the match page's `<div className="space-y-6">` wrapper.

**Before**:
```tsx
<div className="space-y-6">
  {/* Back link */}
  {/* Match header card */}
  <MatchLeaderboard entries={leaderboard} currentUserId={user.id} />
</div>
```

**After**:
```tsx
<div className="space-y-6">
  {/* Back link */}
  {/* Match header card */}
  <MatchLeaderboard entries={leaderboard} currentUserId={user.id} />
  <PredictionRevealSection
    groupId={groupId}
    matchId={matchId}
    currentUserId={user.id}
    matchStatus={match.status}
    matchDate={match.date}
    matchTimeIst={match.time_ist}
    teamA={match.team_a}
    teamB={match.team_b}
    matchNumber={match.match_number}
    leaderboard={leaderboard}
  />
</div>
```

The `space-y-6` on the parent provides the vertical gap between leaderboard and reveal table.

### 6.2 Data Flow

```
Match Page (server component)
  |
  |-- fetches: match, leaderboard (existing)
  |-- passes: groupId, matchId, user.id, match.status, etc. as props
  |
  v
PredictionRevealSection (server component)
  |
  |-- fetches: matchGroupSettings, scenarios, members, predictions (new)
  |-- computes: isRevealed (lock condition), deadline, prediction matrix
  |-- sorts: members by leaderboard rank
  |
  |-- [pre-lock] --> RevealLockedPlaceholder (client)
  |                    |-- uses: useCountdown(deadline)
  |                    |-- renders: lock icon, countdown, copy
  |
  |-- [post-lock] --> RevealTablePollingWrapper (client)
                       |-- uses: usePredictionPolling(scenarioIds, matchStatus, initialPredictions)
                       |-- renders: PredictionRevealTable (presentational)
                                     |-- renders: <table>, cells, legend
```

### 6.3 Interaction with Existing Leaderboard

The Prediction Reveal Table and the Match Leaderboard are **independent siblings**. They share no state, no data fetching, and no component hierarchy. They are rendered sequentially on the page.

The only shared data is the `leaderboard` array, which the page passes to both components:
- `MatchLeaderboard` uses it to render the ranking table.
- `PredictionRevealSection` uses it to determine member ordering in the reveal table rows.

The `ExpandablePicks` component (inside `MatchLeaderboard`) continues to work independently. It shows one user's picks in detail. The reveal table shows all users' picks in a matrix. They serve different but complementary purposes and do not conflict.

---

## 7. Performance Considerations

### 7.1 Query Efficiency

**Single query for all predictions**: The `getAllPredictionsForMatch` function executes one Supabase query with `.in("scenario_id", scenarioIds)`. For a typical match with 16 scenarios, this is a single `SELECT ... WHERE scenario_id IN (16 UUIDs)`. PostgreSQL handles this efficiently with the existing index on `predictions(scenario_id)`.

**Total queries for the reveal table section** (server-side):

| Query | Table | Rows Expected | Notes |
|---|---|---|---|
| `getMatchGroupSettings` | `match_group_settings` | 1 | PK lookup |
| `getScenariosForMatch` | `scenarios` | ~16 | Filtered by group_id + match_id + is_removed + approval_status |
| `getMembers` | `group_members` + `profiles` | ~10 | Join, filtered by group_id + status |
| `getAllPredictionsForMatch` | `predictions` | ~160 | 10 members x 16 scenarios |

Total: **4 queries**. Three run in parallel, one is sequential (predictions depends on scenario IDs). Total data transferred: approximately 10-15 KB JSON for 160 prediction rows. Well within the 200ms render target (NFR-001).

**Polling query** (client-side, every 30s during live matches):
- 1 query: `SELECT user_id, scenario_id, is_correct FROM predictions WHERE scenario_id IN (...)`.
- Returns ~160 rows with only 3 columns (no `value`, no `points_earned`).
- Payload: approximately 3-4 KB. Minimal network impact.

### 7.2 Rendering Performance

**Cell count**: 15 members x 16 scenarios = 240 cells maximum. This is trivial for React to render. No virtualization or pagination is needed.

**Re-renders during polling**: The `usePredictionPolling` hook uses immutable state updates. When `is_correct` changes for N cells, only those cells' enclosing rows re-render (React's reconciliation handles this via the `key` prop on `<tr>`). The `PredictionRevealTable` receives a new `predictions` object reference, but individual cell rendering is lightweight.

**CSS transitions**: `transition: background-color 0.5s ease` on `<td>` elements is GPU-accelerated (compositor-only property on most browsers). No layout or paint thrashing.

**Sticky column**: `position: sticky` with `z-index` is handled by the browser compositor. The shadow (`box-shadow`) on the sticky column is a paint operation but is applied to a single column (15 cells max), which is negligible.

### 7.3 Polling Strategy

| Match Status | Polling Behavior |
|---|---|
| `upcoming` (pre-lock) | No polling. Locked placeholder shown. |
| `upcoming` (post-lock) | No polling. Data is static (no scenarios resolving yet). |
| `live` | Poll every 30 seconds. Pause on tab hidden, resume + immediate fetch on tab visible. |
| `completed` | No polling. All scenarios resolved. Final state. |
| `abandoned` / `no_result` | No polling. No further resolutions expected. |

**Poll failure**: Silent swallow. The table retains its last-known state. Next poll attempt is on the regular 30-second interval. No exponential backoff is needed because the query is lightweight and failures are typically transient (network blip).

### 7.4 SSR Optimization

The table is server-rendered on initial page load. This means:
- No loading spinner for the reveal table (it appears as part of the HTML).
- First Contentful Paint includes the full table.
- The client-side `RevealTablePollingWrapper` hydrates and starts polling only for live matches.
- For completed matches, no client JavaScript runs for the reveal table (the polling hook short-circuits when `matchStatus !== "live"`).

---

## 8. Testing Strategy

### 8.1 Unit Tests

| Test | File | What to Test |
|---|---|---|
| `buildPredictionMatrix` | utility function test | Correct matrix from flat array; empty input; missing predictions |
| `mergePollResults` | utility function test | Correct merge; no-change detection; new predictions during poll |
| `usePredictionPolling` | hook test | Polls when live; stops when not live; pauses on hidden; merges correctly |
| `PredictionRevealTable` | component test | Correct cells rendered; current user highlighted; no-pick cells; aria labels |
| `RevealLockedPlaceholder` | component test | Countdown renders; expired state shows message |
| `RevealColorLegend` | component test | All four legend items rendered |

### 8.2 Integration Tests

| Test | What to Test |
|---|---|
| Match page pre-lock | Reveal section shows locked placeholder, not table |
| Match page post-lock | Reveal section shows table with all predictions |
| Match page completed | Table shows all cells resolved, no polling active |
| RLS enforcement | Pre-deadline API call returns only own predictions |

---

## 9. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **RLS policy doesn't cover edge case** | Low | High (data leak) | Verified against all 5 lock conditions. Add integration test. |
| **Polling causes excessive Supabase calls** | Low | Medium (cost) | 30s interval is standard; Page Visibility pauses when hidden; only polls during live. |
| **Large squad (15 members) + many scenarios (20+) causes slow render** | Very Low | Low | 300 cells is trivial. No virtualization needed. |
| **Sticky column background mismatch on row hover** | Medium | Low (visual glitch) | Explicitly set bg on sticky cells using `group-hover` pattern or inline conditional. |
| **`Map` vs `Record` serialization issue** | N/A | N/A | Avoided by using `Record<string, ...>` (plain objects) instead of `Map` for server-to-client data passing. |
| **Stale data after deadline crosses during page view** | Medium | Low (UX confusion) | `RevealLockedPlaceholder` shows "Predictions revealed -- refresh" when countdown expires. User refreshes to see the table. |

---

## 10. Summary of Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Pending cell color** | Muted slate (`var(--pending)` at 8%) | Reduces visual noise; green/red cells pop when they appear |
| **Column headers** | Descriptive abbreviations ("Winner", "Top Bat") | More readable than ultra-short codes ("MW", "TS") while still fitting 64px columns |
| **Data structure** | `Record<string, Record<string, RevealCellData>>` | Must be serializable across RSC boundary (Map is not) |
| **Polling interval** | 30 seconds | Matches NFR-002 requirement; balances freshness vs. cost |
| **Server vs. client rendering** | SSR initial + client polling | Matches existing LiveMatchScorecard pattern; fast initial paint |
| **Separate polling hook** | New `usePredictionPolling` (not reusing `useMatchPolling`) | Different table, different columns, different interval. Composition over configuration. |
| **Member ordering** | Leaderboard rank, then alphabetical | Rewards engagement (top predictors first); consistent with leaderboard above |
| **No new DB migrations** | Zero schema changes | All required data exists. Only a new DAL query function is needed. |
