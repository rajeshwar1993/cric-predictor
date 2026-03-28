# Technical Architecture: Completed Matches Section
**Author**: PSE Agent
**Date**: 2026-03-28
**Status**: Draft
**Mode**: Architecture Design

---

## 1. Overview

This document is the implementation blueprint for adding a "Recent Results" section to the group home page (`/group/[groupId]`). It shows the 3 most recently completed matches with final scores, winner identification, and the current user's prediction performance summary. Tapping a card navigates to the existing match leaderboard page.

**Key constraints**:
- No database migrations required. All data already exists.
- No new API routes. Data is fetched server-side in the RSC.
- No new RLS policies. Existing policies are sufficient.
- No new Server Actions. This is read-only.

---

## 2. Data Layer Changes

### 2.1 New DAL Function: `getRecentCompletedMatches`

**File**: `web-app/src/lib/dal/matches.ts`

```typescript
/**
 * Fetch the N most recently completed matches, ordered by date DESC, time DESC.
 * Returns all match row fields (including result fields like match_winner, scores).
 * Returns [] on error (fail-silent, matching existing DAL pattern).
 */
export async function getRecentCompletedMatches(limit = 3): Promise<Match[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("status", "completed")
    .order("date", { ascending: false })
    .order("time_ist", { ascending: false })
    .limit(limit);

  if (error || !data) {
    if (error) logError({ layer: "dal", operation: "getRecentCompletedMatches", metadata: { limit } }, error);
    return [];
  }
  return data;
}
```

**Query analysis**:
- Uses the existing `status` column which has an index (`idx_matches_status`).
- Ordering by `date DESC, time_ist DESC` handles double-headers correctly (later match appears first).
- Returns `Match[]` (the full `matches` Row type from `database.ts`), which includes `match_winner`, `current_score_a`, `current_score_b`, and all other result fields. No need for a separate type -- the existing Row type covers everything.
- `limit = 3` is hardcoded at the call site (FR-008), but the function accepts a parameter for testability.
- Pattern mirrors `getLastCompletedMatch()` exactly, but returns N rows instead of `.single()`.

### 2.2 New DAL Function: `getUserMatchPredictionSummaries`

**File**: `web-app/src/lib/dal/standings.ts`

This function fetches the current user's prediction summary for multiple completed matches in a **single query**, avoiding N+1.

```typescript
/**
 * Fetch the current user's prediction summary for multiple matches within a group.
 * Returns one entry per match where the user has predictions.
 * Uses the match_leaderboard view which already aggregates predicted_count,
 * correct_count, resolved_count, and match_points.
 *
 * Returns a Map keyed by match_id for O(1) lookup in the component layer.
 */
export async function getUserMatchPredictionSummaries(
  groupId: string,
  userId: string,
  matchIds: number[]
): Promise<Map<number, MatchLeaderboardEntry>> {
  if (matchIds.length === 0) return new Map();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("match_leaderboard")
    .select("*")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .in("match_id", matchIds);

  if (error || !data) {
    if (error) logError({ layer: "dal", operation: "getUserMatchPredictionSummaries", metadata: { groupId, userId, matchIds } }, error);
    return new Map();
  }

  const map = new Map<number, MatchLeaderboardEntry>();
  for (const entry of data) {
    map.set(entry.match_id, entry);
  }
  return map;
}
```

**Query analysis**:
- Queries the `match_leaderboard` view which already aggregates `predicted_count`, `correct_count`, `resolved_count`, and `match_points` per user per group per match. No need to build this aggregation manually.
- The `.in("match_id", matchIds)` filter ensures we fetch summaries for exactly the completed matches we're displaying (max 3), not all matches.
- The `.eq("user_id", userId)` ensures we only get the current user's data. RLS on the underlying `predictions` table enforces this as well, but the explicit filter is defense-in-depth and avoids returning other users' rows.
- Returns a `Map<number, MatchLeaderboardEntry>` for O(1) lookup when rendering cards. The alternative (returning an array and doing `.find()` per card) is fine for 3 items, but a Map is cleaner.
- This is a **single query** regardless of how many matches are displayed. No N+1 problem.

### 2.3 Why Not a Separate `getUserMatchPredictionSummary` (Singular)?

The requirements doc suggested a per-match function `getUserMatchPredictionSummary(userId, groupId, matchId)`. This would require calling it once per completed match (3 calls for 3 matches), creating an N+1 pattern. Instead, the batch function `getUserMatchPredictionSummaries` (plural) fetches all summaries in one query using `.in("match_id", matchIds)`.

### 2.4 Determining "Results Pending" State

A match can be `status = 'completed'` but have predictions that are not yet resolved (e.g., admin entered the match result but `resolve_match_predictions` hasn't run, or custom scenarios are unresolved). This is detected by checking the `resolved_count` field from the `match_leaderboard` view:

- If the user has a leaderboard entry AND `resolved_count < predicted_count`: some predictions are still pending resolution.
- If the user has NO leaderboard entry: they made no predictions for this match.
- If `resolved_count === predicted_count` and `predicted_count > 0`: all predictions are resolved.

More precisely, the `resultsPending` flag passed to the card component should be determined by checking whether the match has `resolved_at` set. If `resolved_at IS NULL`, the match is completed but results have not been entered/resolved. This is simpler and more accurate than comparing counts:

```typescript
const resultsPending = match.resolved_at === null;
```

This covers the edge case where a user made no predictions but the match itself isn't resolved yet -- the card should still show "Results pending" rather than "No predictions" in that state.

---

## 3. No Database Migrations Needed

Confirmed. All required data already exists:

| Data Point | Source |
|---|---|
| Completed matches with results | `matches` table, `status = 'completed'` |
| Match winner | `matches.match_winner` |
| Final scores | `matches.current_score_a`, `matches.current_score_b` |
| User prediction summary | `match_leaderboard` view (aggregates `predicted_count`, `correct_count`, `match_points`) |
| Resolution status | `matches.resolved_at` (null = not yet resolved) |

No new tables, columns, indexes, views, or database functions are needed.

---

## 4. Type Definitions

### 4.1 New Types

**File**: `web-app/src/types/index.ts`

```typescript
/**
 * Data shape for a completed match card.
 * Derived from the full Match row but narrowed to only the fields
 * the CompletedMatchCard component needs.
 */
export interface CompletedMatchCardData {
  id: number;
  match_number: number;
  team_a: string;
  team_b: string;
  date: string;
  time_ist: string;
  venue: string;
  match_winner: string | null;
  current_score_a: string | null;
  current_score_b: string | null;
  resolved_at: string | null;
}

/**
 * User's prediction performance summary for a single match.
 * Derived from MatchLeaderboardEntry but narrowed to display fields.
 */
export interface UserPredictionSummary {
  predicted_count: number;
  correct_count: number;
  points_earned: number;
}
```

**Rationale for `CompletedMatchCardData`**: The full `Match` row type (`Database["public"]["Tables"]["matches"]["Row"]`) contains ~30 fields. The card component only needs 10. Defining a narrower interface:
1. Documents exactly what data the component consumes.
2. Enables the PSE-Frontend agent to build the component without depending on the full database type.
3. Is satisfied by the full Match row (since TypeScript uses structural typing), so no explicit mapping is needed -- you can pass a full Match row where `CompletedMatchCardData` is expected.

**Rationale for `UserPredictionSummary`**: The `MatchLeaderboardEntry` type has 10 fields. The card only needs 3. A narrower type clarifies the component's data contract.

### 4.2 Existing Types Reused (No Changes)

| Type | File | Usage |
|---|---|---|
| `Database["public"]["Tables"]["matches"]["Row"]` | `types/database.ts` | Return type of `getRecentCompletedMatches()` (aliased as `Match` in `dal/matches.ts`) |
| `MatchLeaderboardEntry` | `types/index.ts` | Return type of `getUserMatchPredictionSummaries()` values |

---

## 5. Component Hierarchy

```
GroupHomePage (Server Component — existing)
  |
  +-- [Group Header]           (existing inline JSX)
  +-- [Upcoming/Live Matches]  (existing inline JSX)
  +-- CompletedMatchesSection   ** NEW ** (Server Component)
  |     +-- CompletedMatchCard  ** NEW ** (Server Component, rendered via .map())
  |           +-- TeamBadge     (existing, reused)
  +-- [The Squad]              (existing: h2 + MemberList)
```

### 5.1 `CompletedMatchesSection`

**File**: `web-app/src/components/match/completed-matches-section.tsx`
**Type**: Server Component (no `"use client"`)

**Props**:
```typescript
interface CompletedMatchesSectionProps {
  groupId: string;
  matches: CompletedMatchCardData[];
  predictionSummaries: Map<number, MatchLeaderboardEntry>;
}
```

**Behavior**:
- If `matches.length === 0`, return `null` (render nothing -- no heading, no container).
- Otherwise, render the section heading ("Recent Results") and map over matches to render `CompletedMatchCard` for each.
- Derives the `UserPredictionSummary` and `resultsPending` flag for each card from the `predictionSummaries` map and the match's `resolved_at` field.

**Structural template**:
```tsx
export function CompletedMatchesSection({ groupId, matches, predictionSummaries }: CompletedMatchesSectionProps) {
  if (matches.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 font-display text-lg font-semibold text-[var(--text-primary)]">
        Recent Results
      </h2>
      <div className="space-y-3">
        {matches.map((match) => {
          const leaderboardEntry = predictionSummaries.get(match.id);
          const resultsPending = match.resolved_at === null;

          const predictionSummary: UserPredictionSummary | null = leaderboardEntry
            ? {
                predicted_count: leaderboardEntry.predicted_count,
                correct_count: leaderboardEntry.correct_count,
                points_earned: leaderboardEntry.match_points,
              }
            : null;

          return (
            <CompletedMatchCard
              key={match.id}
              groupId={groupId}
              match={match}
              predictionSummary={predictionSummary}
              resultsPending={resultsPending}
            />
          );
        })}
      </div>
    </div>
  );
}
```

### 5.2 `CompletedMatchCard`

**File**: `web-app/src/components/match/completed-match-card.tsx`
**Type**: Server Component (no `"use client"`)

**Props**:
```typescript
interface CompletedMatchCardProps {
  groupId: string;
  match: CompletedMatchCardData;
  predictionSummary: UserPredictionSummary | null;
  resultsPending: boolean;
}
```

**Structure** (regions top to bottom, per UI/UX spec):

1. **Status bar**: `CheckCircle2` icon + "RESULT" label (left), "Match {N}" (right).
2. **Score rows**: Two rows (one per team). Each row: `TeamBadge` (sm) + team code + score + optional "Won" tag for the winner.
3. **Metadata**: `formatMatchDate(date)` + venue (truncated).
4. **Footer**: Prediction summary badge (left) + `ChevronRight` icon (right).

The entire card is wrapped in a `<Link href={ROUTES.MATCH_LEADERBOARD(groupId, match.id)}>`.

**Winner detection logic**:
```typescript
const isWinnerA = match.match_winner === match.team_a;
const isWinnerB = match.match_winner === match.team_b;
// If match_winner is null (extremely rare), both teams render in primary style, no "Won" tag.
```

**Winner accent**: The "Won" tag uses the winning team's color from `getTeamColor(match.match_winner)` with `color-mix(in srgb, ${color} 15%, transparent)` as background, following the existing pattern in `PredictionStatusPill` and `MemberList`.

**Prediction summary badge logic**:
```typescript
if (resultsPending) {
  // Show "Results pending" in pending color
} else if (predictionSummary === null) {
  // Show "No predictions" in muted text
} else if (predictionSummary.correct_count > 0) {
  // Show "{correct}/{predicted} correct . {points} pts" in success style
} else {
  // Show "0/{predicted} correct . 0 pts" in danger style
}
```

**Accessibility**: The `<Link>` element gets a dynamic `aria-label`:
```typescript
const ariaLabel = match.match_winner
  ? `${match.match_winner} beat ${match.match_winner === match.team_a ? match.team_b : match.team_a}, Match ${match.match_number}. ${predictionAriaText}`
  : `${match.team_a} vs ${match.team_b}, Match ${match.match_number} result. ${predictionAriaText}`;
```

Where `predictionAriaText` is one of:
- `"You scored {N} points from {M} predictions."` (resolved)
- `"You made no predictions."` (no predictions)
- `"Results are pending."` (pending)

---

## 6. Integration with Group Page

### 6.1 Data Fetching Changes

**File**: `web-app/src/app/group/[groupId]/page.tsx`

The existing `Promise.all` block fetches 4 items. We add `getRecentCompletedMatches` as a 5th parallel fetch:

```typescript
// BEFORE:
const [group, members, membership, upcomingMatches] = await Promise.all([
  groupsDal.getGroupById(groupId),
  membersDal.getMembers(groupId),
  membersDal.getMembershipStatus(groupId, user.id),
  matchesDal.getUpcomingMatches(3),
]);

// AFTER:
const [group, members, membership, upcomingMatches, completedMatches] = await Promise.all([
  groupsDal.getGroupById(groupId),
  membersDal.getMembers(groupId),
  membersDal.getMembershipStatus(groupId, user.id),
  matchesDal.getUpcomingMatches(3),
  matchesDal.getRecentCompletedMatches(3),
]);
```

Then, fetch prediction summaries for the completed matches (this depends on `completedMatches` result, so it runs sequentially after the `Promise.all`):

```typescript
// Fetch user's prediction summaries for completed matches (single query, not N+1)
const completedMatchIds = completedMatches.map((m) => m.id);
const predictionSummaries = completedMatchIds.length > 0
  ? await standingsDal.getUserMatchPredictionSummaries(groupId, user.id, completedMatchIds)
  : new Map();
```

**Important**: This secondary query is sequentially dependent on `completedMatches` (we need the match IDs). It cannot be parallelized with the initial `Promise.all`. However, it is a single lightweight query against the `match_leaderboard` view filtered to one user and up to 3 match IDs. Expected latency: <20ms.

**Alternative considered**: We could fetch ALL match leaderboard entries for the user in this group (no match ID filter) and filter client-side. This would avoid the sequential dependency but would over-fetch data for all matches the user has ever predicted on. For a user who has predicted on 50+ matches, this is wasteful. The targeted `.in("match_id", matchIds)` approach is more efficient.

### 6.2 Existing Sequential Fetches (Context)

The page already has sequential fetches after the `Promise.all`:

```typescript
// Existing — sequential, depends on upcomingMatches result
const predictedUserIds = upcomingMatches.length > 0
  ? await predictionsDal.getMembersWhoPredicted(groupId, upcomingMatches[0].id)
  : [];
```

The prediction summaries fetch runs in the same sequential phase. We can parallelize these two sequential queries since they are independent of each other:

```typescript
// AFTER — parallelize the two sequential fetches
const completedMatchIds = completedMatches.map((m) => m.id);

const [predictedUserIds, predictionSummaries] = await Promise.all([
  upcomingMatches.length > 0
    ? predictionsDal.getMembersWhoPredicted(groupId, upcomingMatches[0].id)
    : Promise.resolve([]),
  completedMatchIds.length > 0
    ? standingsDal.getUserMatchPredictionSummaries(groupId, user.id, completedMatchIds)
    : Promise.resolve(new Map()),
]);
```

This ensures no additional sequential latency. The two dependent queries run in parallel.

### 6.3 Import Changes

Add to the imports in `page.tsx`:

```typescript
import * as standingsDal from "@/lib/dal/standings";
import { CompletedMatchesSection } from "@/components/match/completed-matches-section";
```

### 6.4 JSX Placement

Insert the `CompletedMatchesSection` between the existing matches section and "The Squad" section:

```tsx
{/* Matches (upcoming + live) — EXISTING */}
{upcomingMatches.length > 0 ? (
  <div className="space-y-4">
    {/* ... existing match cards ... */}
  </div>
) : (
  <div className="rounded-xl bg-[var(--bg-card)] p-8 text-center">
    <p className="text-sm text-[var(--text-muted)]">No matches on the horizon -- sit tight</p>
  </div>
)}

{/* Completed matches — NEW */}
<CompletedMatchesSection
  groupId={groupId}
  matches={completedMatches}
  predictionSummaries={predictionSummaries}
/>

{/* Member list — EXISTING */}
<div>
  <h2 className="mb-4 font-display text-lg font-semibold text-[var(--text-primary)]">
    The Squad
  </h2>
  <MemberList members={members} />
</div>
```

The `CompletedMatchesSection` component handles the "0 matches" case internally (returns `null`), so no conditional wrapper is needed in the page.

---

## 7. Performance Considerations

### 7.1 Query Cost

| Query | Expected Rows | Index Used | Expected Latency |
|---|---|---|---|
| `getRecentCompletedMatches(3)` | 3 | `idx_matches_status` + ordering on `date`, `time_ist` | <15ms |
| `getUserMatchPredictionSummaries(groupId, userId, [3 IDs])` | 0-3 | `match_leaderboard` view (scans `scenarios` + `predictions` + `profiles` with group_id, match_id, user_id filters) | <20ms |

**Total added latency**: ~20ms (the two new queries run in parallel with the existing sequential `getMembersWhoPredicted` call). This is well under the 100ms budget specified in the non-functional requirements.

### 7.2 Parallelization Summary

```
Phase 1 (Promise.all — parallel):
  getGroupById          ──┐
  getMembers            ──┼── all run in parallel
  getMembershipStatus   ──┤
  getUpcomingMatches    ──┤
  getRecentCompletedMatches ──┘  ** NEW **

Phase 2 (Promise.all — parallel, depends on Phase 1):
  getMembersWhoPredicted          ──┐
  getUserMatchPredictionSummaries ──┘  ** NEW — runs parallel with existing sequential query **

Phase 3 (conditional, depends on Phase 1):
  getPendingRequests  (only if admin)
```

### 7.3 Caching Considerations

Completed match data is stable (scores don't change after completion). The `match_leaderboard` view data for completed matches is also stable once `resolve_match_predictions` has run.

Next.js App Router provides request-level deduplication via `React.cache()` and route-level caching via `revalidatePath()`. The existing pattern relies on `revalidatePath()` after Server Actions (e.g., `enterResults`). No additional caching configuration is needed -- the completed matches data benefits from the same caching as the rest of the page.

If future optimization is needed, `getRecentCompletedMatches` could be wrapped in `React.cache()` to deduplicate within a single request (e.g., if the function is called from both the page and a layout). For now, it's called only once, so this is not necessary.

---

## 8. Edge Cases

| Scenario | Handling |
|---|---|
| **No completed matches** | `getRecentCompletedMatches` returns `[]`. `CompletedMatchesSection` receives empty array, returns `null`. Section is absent from DOM. No heading, no whitespace. |
| **Fewer than 3 completed matches** | `getRecentCompletedMatches` returns 1 or 2 matches. Cards render for available matches only. No placeholder cards. |
| **User has no predictions for a match** | `predictionSummaries.get(match.id)` returns `undefined`. Card receives `predictionSummary: null`. Footer shows "No predictions" in muted text. |
| **Match completed but not resolved** (`resolved_at` is null) | `resultsPending` flag is `true`. Footer shows "Results pending" in pending color. This is correct regardless of whether the user has predictions -- the match results haven't been scored yet. |
| **Match completed and resolved, but user joined group after the match** | User won't have predictions. `match_leaderboard` view won't have a row for this user+match. Card shows "No predictions". Match result (teams, scores, winner) still displays normally. |
| **Database query for completed matches fails** | `getRecentCompletedMatches` returns `[]` (existing fail-silent pattern). Error is logged via `logError`. Section is not rendered. No error toast. |
| **Database query for prediction summaries fails** | `getUserMatchPredictionSummaries` returns empty `Map`. All cards show "No predictions". Error is logged. |
| **`match_winner` is null on a completed match** | Extremely rare (tie before super over resolution). Both team rows render in primary text. No "Won" tag on either team. No crash. |
| **`current_score_a` or `current_score_b` is null** | Display a dash or empty string. The score field renders `match.current_score_a ?? "--"`. |
| **Double-header (2 matches on same date)** | `ORDER BY date DESC, time_ist DESC` correctly orders the later match first. |
| **Only abandoned/no_result matches exist** | These are excluded by `status = 'completed'` filter. Section is not rendered (same as "no completed matches"). |

---

## 9. File-by-File Change Plan

### Files to CREATE

| # | File | Purpose |
|---|---|---|
| 1 | `web-app/src/components/match/completed-matches-section.tsx` | Section wrapper component. Server Component. Renders heading + maps over matches to render cards. Returns null when no matches. ~40 lines. |
| 2 | `web-app/src/components/match/completed-match-card.tsx` | Individual completed match card. Server Component. Renders team rows with scores and winner accent, metadata, prediction summary badge. Wrapped in `<Link>`. ~120 lines. |

### Files to MODIFY

| # | File | Change Description |
|---|---|---|
| 3 | `web-app/src/lib/dal/matches.ts` | Add `getRecentCompletedMatches(limit)` function. ~15 lines added. |
| 4 | `web-app/src/lib/dal/standings.ts` | Add `getUserMatchPredictionSummaries(groupId, userId, matchIds)` function. ~25 lines added. |
| 5 | `web-app/src/types/index.ts` | Add `CompletedMatchCardData` and `UserPredictionSummary` interfaces. ~20 lines added. |
| 6 | `web-app/src/app/group/[groupId]/page.tsx` | (a) Add imports for `standingsDal` and `CompletedMatchesSection`. (b) Add `getRecentCompletedMatches` to the `Promise.all`. (c) Add parallel fetch of `getUserMatchPredictionSummaries` alongside `getMembersWhoPredicted`. (d) Insert `<CompletedMatchesSection>` in JSX between matches and member list. ~20 lines added/modified. |

### Files NOT Modified

| File | Reason |
|---|---|
| `supabase/migrations/*` | No schema changes needed. |
| `src/lib/actions/*` | No new mutations. Read-only feature. |
| `src/components/match/match-scorecard.tsx` | Not used by completed cards. The completed card has its own simpler layout (per UI/UX spec section 3.3). |
| `src/lib/constants.ts` | No new routes or constants. `ROUTES.MATCH_LEADERBOARD` already exists. |
| `src/lib/utils.ts` | `formatMatchDate` and `getTeamColor` already exist and are sufficient. |
| RLS policies | Matches are publicly readable. `match_leaderboard` view uses `security_invoker = true` and respects existing RLS on `predictions` and `scenarios`. |

---

## 10. Detailed Implementation Specifications

### 10.1 `getRecentCompletedMatches` (DAL)

```
Location:   web-app/src/lib/dal/matches.ts
Depends on: createClient (supabase/server), logError (logger)
Returns:    Match[] (Database["public"]["Tables"]["matches"]["Row"][])
```

Implementation notes:
- Do NOT use `.single()` (unlike `getLastCompletedMatch`). Use `.limit(limit)` to get an array.
- The return type is the same `Match` type alias already defined at the top of `matches.ts` (`type Match = Database["public"]["Tables"]["matches"]["Row"]`).
- Error handling: return `[]` on error, log via `logError`. Matches the pattern used by `getUpcomingMatches`.

### 10.2 `getUserMatchPredictionSummaries` (DAL)

```
Location:   web-app/src/lib/dal/standings.ts
Depends on: createClient (supabase/server), logError (logger), MatchLeaderboardEntry (types)
Returns:    Map<number, MatchLeaderboardEntry>
```

Implementation notes:
- Import `MatchLeaderboardEntry` from `@/types` (already imported in this file).
- The `.in("match_id", matchIds)` filter accepts up to 3 IDs. Supabase translates this to a SQL `WHERE match_id IN (...)` clause.
- Return a `Map` rather than an array. The component layer needs O(1) lookup by match ID.
- If `matchIds` is empty, return an empty Map immediately (skip the query).

### 10.3 `CompletedMatchesSection` (Component)

```
Location:   web-app/src/components/match/completed-matches-section.tsx
Type:       Server Component (no "use client" directive)
Depends on: CompletedMatchCard, CompletedMatchCardData, UserPredictionSummary, MatchLeaderboardEntry
```

Implementation notes:
- The component is purely presentational. It receives pre-fetched data as props.
- It derives `predictionSummary` and `resultsPending` for each card from the props.
- No data fetching inside this component.
- JSDoc comment on the export.

### 10.4 `CompletedMatchCard` (Component)

```
Location:   web-app/src/components/match/completed-match-card.tsx
Type:       Server Component (no "use client" directive)
Depends on: Link (next/link), TeamBadge, ROUTES (constants), formatMatchDate, getTeamColor (utils),
            CheckCircle2, ChevronRight (lucide-react),
            CompletedMatchCardData, UserPredictionSummary (types)
```

Implementation notes:
- The card is a `<Link>` element wrapping all content. This makes the entire card tappable/clickable and keyboard-accessible.
- `opacity-75` on the card container provides the "completed" visual distinction per FR-009 and UI/UX spec.
- `hover:opacity-90 transition-opacity` for hover feedback.
- `focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--border-focus)] focus-visible:outline-offset-2` for keyboard focus.
- The "Won" tag uses inline `style` for the `color-mix` background (Tailwind cannot dynamically generate team-specific colors at build time).
- Venue text uses `truncate` class to prevent overflow on long venue names.
- Score display: render `match.current_score_a ?? "--"` and `match.current_score_b ?? "--"` to handle null gracefully.

### 10.5 Group Page Changes

```
Location:   web-app/src/app/group/[groupId]/page.tsx
```

Changes in order:

1. **Add imports** (top of file):
   ```typescript
   import * as standingsDal from "@/lib/dal/standings";
   import { CompletedMatchesSection } from "@/components/match/completed-matches-section";
   ```

2. **Extend the primary `Promise.all`** (line ~34):
   Add `matchesDal.getRecentCompletedMatches(3)` as the 5th element. Destructure as `completedMatches`.

3. **Parallelize the sequential fetches** (after the `Promise.all`, before `return`):
   Replace the standalone `getMembersWhoPredicted` call with a new `Promise.all` that runs both `getMembersWhoPredicted` and `getUserMatchPredictionSummaries` in parallel.

4. **Insert JSX** (in the return statement):
   Add `<CompletedMatchesSection>` between the upcoming matches section and the "The Squad" heading/MemberList.

---

## 11. Dependency Graph

```
page.tsx
  |-- imports matchesDal.getRecentCompletedMatches  (dal/matches.ts)
  |-- imports standingsDal.getUserMatchPredictionSummaries  (dal/standings.ts)
  |-- imports CompletedMatchesSection  (components/match/completed-matches-section.tsx)
       |-- imports CompletedMatchCard  (components/match/completed-match-card.tsx)
       |    |-- imports TeamBadge  (components/shared/team-badge.tsx) [existing]
       |    |-- imports Link  (next/link) [existing]
       |    |-- imports ROUTES  (lib/constants.ts) [existing]
       |    |-- imports formatMatchDate, getTeamColor  (lib/utils.ts) [existing]
       |    |-- imports CheckCircle2, ChevronRight  (lucide-react) [existing]
       |-- imports types: CompletedMatchCardData, UserPredictionSummary  (types/index.ts)
```

All dependencies either already exist or are being created as part of this feature. No new npm packages are needed.

---

## 12. Domain Separation (PSE-Frontend vs PSE-Supabase)

This feature requires **no PSE-Supabase work**. There are no database migrations, no new RLS policies, no Edge Functions, and no database function changes.

All work is **PSE-Frontend only**:
- DAL functions (TypeScript, in the Next.js project)
- Components (TypeScript/TSX, in the Next.js project)
- Type definitions (TypeScript, in the Next.js project)
- Page modifications (TypeScript/TSX, in the Next.js project)

---

## 13. Testing Guidance

### Unit Tests (Vitest)

| Test | File | What to Test |
|---|---|---|
| `CompletedMatchCard` rendering | `completed-match-card.test.tsx` | Renders team names, scores, winner tag for winning team. Renders "No predictions" when `predictionSummary` is null. Renders "Results pending" when `resultsPending` is true. Renders correct/predicted count with proper styling. Link href is correct. |
| `CompletedMatchesSection` visibility | `completed-matches-section.test.tsx` | Returns null when matches array is empty. Renders heading and correct number of cards (1, 2, or 3). |
| `getRecentCompletedMatches` DAL | `matches.test.ts` | Returns completed matches ordered by date DESC. Returns empty array on error. Respects limit parameter. |
| `getUserMatchPredictionSummaries` DAL | `standings.test.ts` | Returns Map with entries keyed by match_id. Returns empty Map when matchIds is empty. Returns empty Map on error. |

### E2E Tests (Playwright)

| Test | What to Verify |
|---|---|
| Completed matches section visible | Navigate to group page. Verify "Recent Results" heading is visible when completed matches exist. |
| Card click navigates to leaderboard | Click a completed match card. Verify navigation to `/group/{id}/match/{id}`. |
| Section hidden when no completed matches | When no matches are completed, verify the "Recent Results" heading is not in the DOM. |

### Storybook Stories

| Story | Variants |
|---|---|
| `CompletedMatchCard` | Default (winner + predictions resolved), No Predictions, Results Pending, No Winner (null match_winner), Zero Correct Predictions |
| `CompletedMatchesSection` | 3 Matches, 1 Match, Empty (should render nothing) |

---

## 14. Implementation Order

The recommended implementation sequence:

1. **Types first** (`types/index.ts`) -- add `CompletedMatchCardData` and `UserPredictionSummary`.
2. **DAL functions** (`dal/matches.ts`, `dal/standings.ts`) -- add the two new query functions.
3. **CompletedMatchCard component** (`components/match/completed-match-card.tsx`) -- build the card in isolation.
4. **CompletedMatchesSection component** (`components/match/completed-matches-section.tsx`) -- build the section wrapper.
5. **Group page integration** (`app/group/[groupId]/page.tsx`) -- wire everything together.
6. **Manual testing** -- verify with real/seed data on the group page.
7. **Automated tests** -- unit tests for components and DAL functions.

Steps 1-2 can be done in parallel. Steps 3-4 can be done in parallel. Step 5 depends on all prior steps.
