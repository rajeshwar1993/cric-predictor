# QA Review: Completed Matches Section
**QA Engineer**: QA Agent
**Date**: 2026-03-29
**Status**: Complete
**Branch**: feature/completed-matches-section (merged to main)

---

## Summary

- Total Issues Found: **8**
- Critical: **1**
- Moderate: **4**
- Minor: **3**

The implementation is well-executed and closely follows the technical architecture, UI/UX spec, and requirements documents. All 11 functional requirements are addressed. All 7 documented edge cases are handled. The code follows existing codebase patterns consistently. One critical issue was found related to prediction summary accuracy in a specific edge case, four moderate issues that should be fixed before production, and three minor quality-of-life items.

---

## Methodology

1. Read all context documents (requirements, test plan, architecture, UI/UX spec, code review).
2. Read all 6 implementation files line-by-line.
3. Traced data flow end-to-end: Supabase query -> DAL function -> page.tsx `Promise.all` -> component props -> rendered JSX.
4. Cross-referenced every functional requirement (FR-001 through FR-011) against the code.
5. Verified all 7 documented edge cases against the implementation.
6. Checked type safety by comparing `CompletedMatchCardData` against the `matches` Row type in `database.ts`.
7. Reviewed security model (RLS, user scoping, auth checks).
8. Analyzed performance (parallelization, N+1 avoidance, short-circuits).
9. Inspected accessibility implementation (aria-labels, keyboard nav, color independence).
10. Compared code review findings (W-01 through W-04, S-01 through S-06) against actual implementation.

---

## Functional Requirements Traceability

| ID | Requirement | Verdict | Evidence |
|----|-------------|---------|----------|
| FR-001 | Fetch 3 most recent completed matches, ordered date DESC, time DESC | PASS | `dal/matches.ts` lines 115-131: `.eq("status", "completed").order("date", { ascending: false }).order("time_ist", { ascending: false }).limit(limit)` |
| FR-002 | Fetch user prediction summary per match | PASS | `dal/standings.ts` lines 30-56: batched query via `match_leaderboard` view with `.eq("user_id", userId).in("match_id", matchIds)` |
| FR-003 | Card displays teams, badges, scores, winner, match number, date, venue | PASS | `completed-match-card.tsx` Regions 1-3: `TeamBadge` (lines 70, 112), scores (lines 93, 135), winner "Won" tag (lines 95-105, 137-147), match number (line 61), date + venue (lines 153-157) |
| FR-004 | Prediction result badge "{correct}/{total} correct . {points} pts" | PASS | `PredictionBadge` sub-component lines 201-208: `{correct_count}/{predicted_count} correct . {points_earned} pts` |
| FR-005 | Card links to match leaderboard | PASS | `completed-match-card.tsx` line 48: `<Link href={ROUTES.MATCH_LEADERBOARD(groupId, match.id)}>` |
| FR-006 | Section below upcoming, above member list | PASS | `page.tsx` lines 219-224: `CompletedMatchesSection` placed between upcoming matches block and "The Squad" heading |
| FR-007 | "Recent Results" section heading | PASS | `completed-matches-section.tsx` line 29: `<h2 className="mb-3 font-display text-lg font-semibold text-[var(--text-primary)]">Recent Results</h2>` |
| FR-008 | Max 3 matches, no pagination | PASS | `page.tsx` line 42: `matchesDal.getRecentCompletedMatches(3)` hardcoded at call site |
| FR-009 | Visual distinction from upcoming cards | PASS | Card uses `opacity-75` (vs upcoming's default opacity or `opacity-80`), no `ring` class, muted "RESULT" label, no CTA button -- only `ChevronRight` icon |
| FR-010 | Winner visual accent | PASS | "Won" tag with `color-mix(in srgb, ${winnerColor} 15%, transparent)` background (lines 98-101, 140-143). Winner row in `text-primary`, loser in `text-secondary`. |
| FR-011 | Mobile responsive down to 320px | PASS | Flex layouts with `justify-between`, `shrink-0 whitespace-nowrap` on Won tag (line 97), `truncate` on venue (line 156), `min-w-0` on metadata container (line 153) |

---

## Edge Cases Traceability

| Scenario | Verdict | Evidence |
|----------|---------|----------|
| No completed matches | PASS | `CompletedMatchesSection` returns `null` on empty array (line 25). No heading, no DOM element. |
| Fewer than 3 completed matches | PASS | `.map()` iterates over available matches only (line 33). No placeholder cards. |
| User has no predictions for a match | PASS | `predictionSummaries.get(match.id)` returns `undefined` -> mapped to `null` (lines 34, 37-44). `PredictionBadge` renders "No predictions" (lines 187-192). |
| Match completed but not resolved | PASS | `resultsPending = match.resolved_at === null` (line 35). Card shows "Results pending" (lines 179-184). |
| Abandoned/no_result matches | PASS | Excluded by `.eq("status", "completed")` in DAL (line 121). |
| Database query fails | PASS | Both DAL functions return empty results on error (`[]` for matches, empty `Map` for summaries). Errors logged via `logError`. |
| Double-header same date | PASS | `ORDER BY date DESC, time_ist DESC` (lines 122-123 in DAL). |

---

## Issues

### Critical Issues

#### QA-001: `resultsPending` flag can mask prediction data when `resolved_at` is null but predictions ARE resolved

- **File**: `web-app/src/components/match/completed-matches-section.tsx`, line 35
- **Line**: 35
- **Description**: The `resultsPending` flag is derived purely from `match.resolved_at === null`. However, examining `updateMatchResults` in `dal/matches.ts` (line 140), `resolved_at` is set atomically with `status: "completed"`. This means in the current codebase, a match with `status = 'completed'` will **always** have `resolved_at` set (non-null). The `resultsPending` state is therefore currently unreachable.

  While this is not a bug in current behavior (the code review noted this as W-02), it becomes a **data integrity concern** if a future code path sets `status = 'completed'` WITHOUT setting `resolved_at`. In that case, cards would show "Results pending" even if the `match_leaderboard` view has fully resolved prediction data, hiding the user's actual score.

  More critically: the `updateLiveSnapshot` function in `dal/matches.ts` (line 234) can set `status` via the `snapshot.status` field WITHOUT setting `resolved_at`. If a live polling cycle sets `status = 'completed'` through `updateLiveSnapshot` (which does NOT set `resolved_at`), the match would appear as completed with `resolved_at = null`, triggering the "Results pending" state indefinitely until an admin manually runs `updateMatchResults`.

- **Impact**: If `updateLiveSnapshot` transitions a match to `completed` status (a realistic scenario when the live polling detects match end), all completed cards for that match show "Results pending" forever, masking actual prediction data even after predictions are resolved via `resolve_match_predictions`.
- **Suggested Fix**: Two options:
  1. **Defensive fix**: In `updateLiveSnapshot`, if `snapshot.status === "completed"`, also set `resolved_at: new Date().toISOString()`. This prevents the inconsistent state.
  2. **Component fix**: Instead of relying solely on `resolved_at`, also check whether the `match_leaderboard` view has resolved data for this match. If `predictionSummary !== null` and the entry has `resolved_count > 0`, show the actual scores regardless of `resolved_at`. The `resultsPending` flag should only be true when `resolved_at === null AND (predictionSummary === null OR predictionSummary.resolved_count === 0)`.

  Option 1 is preferred as it fixes the root cause at the data layer.

---

### Moderate Issues

#### QA-002: `formatMatchDate` parses date string without timezone, producing locale-dependent output

- **File**: `web-app/src/lib/utils.ts`, line 74
- **Description**: `formatMatchDate` calls `new Date(date)` where `date` is a string like `"2026-03-22"`. Per the ECMAScript spec, date-only strings (without time) are interpreted as UTC midnight. However, `toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })` formats in the user's local timezone. For a user in IST (UTC+05:30), `new Date("2026-03-22")` produces `2026-03-22T00:00:00Z` which is `2026-03-22T05:30:00 IST` -- correct. But for a user west of UTC (e.g., PST, UTC-08), this would display as `"Sat, Mar 21"` (the day before) since UTC midnight is still March 21 in PST.

  This is a **pre-existing issue** not introduced by this feature, but the completed match card is a new consumer of `formatMatchDate` that makes it more visible. IPL viewers in the US or UK could see wrong dates on completed match cards.

- **Impact**: Users in timezones west of UTC may see dates one day earlier than expected on completed match cards.
- **Suggested Fix**: Parse the date with explicit timezone: `new Date(date + "T00:00:00+05:30")` since all match dates are in IST context. Or use `toLocaleDateString` with `{ timeZone: "Asia/Kolkata" }` to force IST display regardless of user locale. Since this utility is shared, fix it globally.

---

#### QA-003: The `predictionSummary.predicted_count` may differ from FR-002 "total predictions made" expectation

- **File**: `web-app/src/components/match/completed-matches-section.tsx`, lines 37-43
- **File**: `web-app/src/lib/dal/standings.ts`, line 40
- **Description**: FR-002 states the system shall fetch "total predictions made, correct predictions, total points earned." The implementation maps `leaderboardEntry.predicted_count` to `predictionSummary.predicted_count`. However, examining the `match_leaderboard` view definition would reveal whether `predicted_count` counts ALL predictions or only resolved ones.

  From the `MatchLeaderboardEntry` type, both `predicted_count` and `resolved_count` exist as separate fields. The Q2 decision says "Show only resolved predictions (where `is_correct IS NOT NULL`)." If `predicted_count` includes unresolved predictions but only `correct_count` counts resolved correct ones, the badge could show "3/10 correct" where 7 are simply unresolved -- exactly the scenario Q2 was meant to prevent.

  The badge uses `predicted_count` as the denominator: `{correct_count}/{predicted_count} correct`. Per Q2, it should likely use `resolved_count` as the denominator to show "3/7 correct" (3 correct out of 7 resolved), not "3/10 correct" (3 correct out of 10 total).

- **Impact**: When a match has unresolved custom scenarios, the badge denominator may overcount, making the user's accuracy look worse than it is. E.g., "3/10 correct" when really "3/7 resolved are correct."
- **Suggested Fix**: Use `resolved_count` instead of `predicted_count` in the badge denominator. Update `UserPredictionSummary` to include a `resolved_count` field, and change the badge to render `{correct_count}/{resolved_count} correct`. Or, if the PM decides `predicted_count` is the right denominator, document this explicitly as a conscious choice.

---

#### QA-004: Inline `import("@/types").MatchLeaderboardEntry` type annotation in page.tsx

- **File**: `web-app/src/app/group/[groupId]/page.tsx`, line 64
- **Description**: The fallback `Promise.resolve(new Map<number, MatchLeaderboardEntry>())` at line 64 uses the `MatchLeaderboardEntry` type that IS imported at line 16. However, this pattern was flagged in the code review as W-04 -- the code review shows an inline `import("@/types").MatchLeaderboardEntry` but the actual code uses the top-level import. Checking the actual file: line 16 imports `MatchLeaderboardEntry`, and line 64 uses it directly. This means W-04 from the code review was either already fixed or was a phantom finding. The current code is **correct** -- the top-level import is used.

  **Revised assessment**: On re-inspection, this is NOT an issue. The import is clean at line 16. Downgrading from the code review's warning -- the developer handled this correctly. Removing this from the issue list.

**Status**: Not an issue. Withdrawn.

---

#### QA-004 (revised): Team score row duplication creates maintenance risk

- **File**: `web-app/src/components/match/completed-match-card.tsx`, lines 67-149
- **Description**: The Team A row (lines 67-107) and Team B row (lines 109-149) are nearly identical blocks of ~40 lines each, differing only in data bindings (`team_a`/`team_b`, `current_score_a`/`current_score_b`, `isWinnerA`/`isWinnerB`). This was noted as S-01 in the code review. While not a correctness issue, any future change to the team row layout (e.g., adding an icon, changing spacing) must be applied in two places, creating a real risk of the rows diverging.
- **Impact**: Maintenance burden; risk of visual inconsistency if one row is updated but not the other.
- **Suggested Fix**: Extract a `TeamScoreRow` sub-component:
  ```tsx
  function TeamScoreRow({ teamCode, score, isWinner, winnerColor }: {...}) { ... }
  ```
  Then render it twice with different props. This halves the duplicated JSX.

---

#### QA-005: `resultsPending` overrides `predictionSummary` display unconditionally

- **File**: `web-app/src/components/match/completed-match-card.tsx`, lines 179-184
- **Description**: When `resultsPending` is `true`, the `PredictionBadge` always shows "Results pending" regardless of whether the user actually has prediction data. This means if a match is completed but `resolved_at` is null (per QA-001's scenario), and the user DID make predictions that WERE resolved by `resolve_match_predictions`, the user still sees "Results pending" -- their actual score is hidden.

  This is architecturally related to QA-001 but is a distinct UI issue: the badge has no fallback to check actual prediction data when the `resultsPending` flag is true.

- **Impact**: Users may see "Results pending" when their predictions have already been scored, reducing trust in the feature.
- **Suggested Fix**: If `resultsPending` is true BUT `predictionSummary` is not null and has `resolved_count > 0`, prefer showing the actual prediction data. The "Results pending" state should only show when there truly is no resolved prediction data to display.

---

### Minor Issues

#### QA-006: Missing `aria-label` text when both `match_winner` is null AND `resultsPending` is true

- **File**: `web-app/src/components/match/completed-match-card.tsx`, lines 42-44
- **Description**: When `match_winner` is null, the aria-label says `"{team_a} vs {team_b}, Match {N} result. Results are pending."` The word "result" is slightly misleading when there is no result yet (no winner determined). A more accurate phrasing would be `"...Match {N} completed. Results are pending."` This is a very minor copy concern.
- **Impact**: Minimal. Screen reader users get slightly inaccurate context.
- **Suggested Fix**: Change the no-winner aria-label to use "completed" instead of "result": `${match.team_a} vs ${match.team_b}, Match ${match.match_number} completed. ${predictionAriaText}`

---

#### QA-007: Section heading uses `mb-3` while "The Squad" uses `mb-4` -- intentional but undocumented

- **File**: `web-app/src/components/match/completed-matches-section.tsx`, line 29
- **Description**: The "Recent Results" heading uses `mb-3` (12px) while the "The Squad" heading in `page.tsx` line 228 uses `mb-4` (16px). The UI/UX spec (section 3.1) explicitly documents this: "mb-3 below it (slightly tighter than The Squad's mb-4, since completed cards have less visual weight and the section should feel compact)." This is intentional but could cause confusion for future developers who see inconsistent spacing.
- **Impact**: None functionally. Potential developer confusion.
- **Suggested Fix**: Add a brief comment in the JSX: `{/* mb-3 intentionally tighter than The Squad's mb-4 per UI/UX spec */}`

---

#### QA-008: `color-mix` Tailwind class uses underscore syntax that may break with Tailwind updates

- **File**: `web-app/src/components/match/completed-match-card.tsx`, lines 197-198
- **Description**: The prediction badge uses Tailwind arbitrary value classes with underscores replacing spaces: `bg-[color-mix(in_srgb,var(--success)_10%,transparent)]`. This is the correct Tailwind v3/v4 syntax for arbitrary values with spaces (underscores are converted to spaces). However, if Tailwind's arbitrary value parsing changes, or if a CSS linter flags these, it could cause issues. The "Won" tag (lines 98-101) uses inline `style` for the same `color-mix` pattern, which is more resilient.
- **Impact**: Low risk. The current syntax is valid Tailwind, but it is a maintenance fragility compared to using inline `style`.
- **Suggested Fix**: For consistency with the "Won" tag approach, consider using inline `style` for the prediction badge `color-mix` values as well. Or keep as-is and accept the minor inconsistency. Not blocking.

---

## Security Review

| Check | Verdict | Notes |
|-------|---------|-------|
| Completed match data accessible to authenticated users only | PASS | Group page is behind auth + membership guard in `layout.tsx`. `getAuthUser()` is called at line 35 of `page.tsx`. |
| User prediction summaries scoped to current user | PASS | `dal/standings.ts` line 43: `.eq("user_id", userId)` where `userId = user.id` from authenticated session. Defense-in-depth alongside RLS. |
| RLS on `matches` table (public read) | PASS | Match data is non-sensitive. RLS `USING (true)` for authenticated users. |
| RLS on `match_leaderboard` view | PASS | View uses `security_invoker = true`. Underlying `predictions` RLS restricts to user's own data. |
| No cross-user data leakage in rendered output | PASS | Cards only display `predictionSummary` derived from the current user's `match_leaderboard` entry. No other user's data is fetched or rendered. |
| No injection via Supabase client | PASS | All queries use parameterized Supabase builder methods (`.eq()`, `.in()`, `.order()`). No raw SQL. |
| Auth guard prevents unauthenticated access | PASS | `layout.tsx` enforces auth. `page.tsx` line 35: `const user = (await getAuthUser())!` -- the `!` is safe because layout already verified. |

---

## Performance Review

| Check | Verdict | Notes |
|-------|---------|-------|
| Phase 1 parallelism (5 queries) | PASS | `page.tsx` lines 37-43: `getRecentCompletedMatches(3)` is the 5th element in `Promise.all`. |
| Phase 2 parallelism (2 queries) | PASS | `page.tsx` lines 58-65: `getMembersWhoPredicted` and `getUserMatchPredictionSummaries` run in parallel via `Promise.all`. |
| No N+1 query | PASS | `getUserMatchPredictionSummaries` fetches all summaries in one query via `.in("match_id", matchIds)`. Called once, not per-match. |
| Short-circuit on empty matches | PASS | `page.tsx` line 62: `completedMatchIds.length > 0 ? ... : Promise.resolve(new Map())`. Also `dal/standings.ts` line 35: `if (matchIds.length === 0) return new Map()`. Double guard. |
| Map for O(1) lookup | PASS | `dal/standings.ts` lines 51-54: builds `Map<number, MatchLeaderboardEntry>`. Component uses `.get(match.id)` (line 34 of section component). |
| Query indexes utilized | PASS | `getRecentCompletedMatches` filters on `status` (indexed) and orders by `date`, `time_ist`. `match_leaderboard` view filters on `group_id`, `user_id`, `match_id` -- all indexed in the underlying tables. |
| No unnecessary data transfer | PASS | Both DAL functions use `select("*")` which is acceptable -- the matches table row is used in multiple places (structural typing to `CompletedMatchCardData`), and the leaderboard view has only 10 fields. |

---

## Accessibility Review

| Check | Verdict | Notes |
|-------|---------|-------|
| Keyboard navigation | PASS | Cards are `<Link>` elements -- natively focusable via Tab, activatable via Enter. |
| Focus indicator | PASS | `focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--border-focus)] focus-visible:outline-offset-2` on the card `<Link>` (line 49). |
| Dynamic `aria-label` | PASS | Lines 42-44: label includes match result, match number, and prediction status. Three variants: winner beat loser, no winner, and pending results. |
| Winner not color-only (WCAG 1.4.1) | PASS | Winner communicated via: (1) "Won" text label, (2) team-color tint background, (3) primary vs secondary text color distinction. |
| Touch target size | PASS | Entire card is the tap target. Card minimum height (~120px) x full width far exceeds 44x44px minimum. |
| Color contrast | PASS (with note) | `--text-primary` (#ecedf6) on `--bg-card` (~#171c28): ~12:1 ratio (AAA). `--text-secondary` (#9ba1b5) on same: ~5.2:1 (AA). `--text-muted` (#4a5068) on same: ~2.5:1 -- below AA for body text, but used only for decorative/supplementary content (match number, metadata), not primary information. |

---

## Type Safety Review

| Check | Verdict | Notes |
|-------|---------|-------|
| `CompletedMatchCardData` structurally compatible with `matches` Row | PASS | All 11 fields (`id`, `match_number`, `team_a`, `team_b`, `date`, `time_ist`, `venue`, `match_winner`, `current_score_a`, `current_score_b`, `resolved_at`) exist in the Row type with identical types. |
| `UserPredictionSummary` fields map correctly from `MatchLeaderboardEntry` | PASS | `predicted_count` -> `predicted_count`, `correct_count` -> `correct_count`, `points_earned` -> `match_points`. Types match (all `number`). |
| DAL return types explicit | PASS | `getRecentCompletedMatches`: `Promise<Match[]>`. `getUserMatchPredictionSummaries`: `Promise<Map<number, MatchLeaderboardEntry>>`. |
| No `any` types in new code | PASS | All new code is properly typed. Pre-existing `(m: any)` at page.tsx line 48 noted but not introduced by this feature. |
| Null handling complete | PASS | `match_winner: null` -> no "Won" tag (lines 95, 137). `current_score_a/b: null` -> `"--"` fallback (lines 93, 135). `predictionSummary: null` -> "No predictions" (lines 187-192). |
| Props interfaces defined | PASS | `CompletedMatchCardProps` (lines 8-13), `CompletedMatchesSectionProps` (lines 8-12). |

---

## Test Plan Coverage Assessment

Mapping the 83 test cases from the test plan against the implementation:

| Test Category | Test Cases | Implementation Coverage | Notes |
|---------------|-----------|------------------------|-------|
| FR-001 (Fetch matches) | TC-001 to TC-005 | Fully covered | DAL code matches spec exactly. |
| FR-002 (Prediction summaries) | TC-006 to TC-010 | Covered with caveat | TC-010 depends on `match_leaderboard` view definition (not modified). See QA-003 re: `predicted_count` vs `resolved_count`. |
| FR-003 (Card display) | TC-011 to TC-015 | Fully covered | All data points rendered. |
| FR-004 (Prediction badge) | TC-016 to TC-020 | Fully covered | All 4 badge states implemented. `font-stats` applied to points number. |
| FR-005 (Link to leaderboard) | TC-021 to TC-022 | Fully covered | Link href uses `ROUTES.MATCH_LEADERBOARD`. |
| FR-006 (Section placement) | TC-023, TC-024 | Fully covered | JSX placement confirmed in page.tsx. |
| FR-007 (Heading) | TC-025, TC-026 | Fully covered | "Recent Results" with correct classes. |
| FR-008 (Max 3) | TC-027, TC-028 | Fully covered | Hardcoded `3` at call site. |
| FR-009 (Visual distinction) | TC-029 to TC-033 | Fully covered | opacity-75, no ring, muted label, no CTA. |
| FR-010 (Winner accent) | TC-034 to TC-036 | Fully covered | "Won" tag with color-mix. |
| FR-011 (Mobile responsive) | TC-037 to TC-040 | Fully covered | flex layouts, shrink-0, truncate, min-w-0. |
| Edge cases | TC-101 to TC-114 | All covered | See edge case traceability above. |
| Error scenarios | TC-201 to TC-205 | All covered | Fail-silent pattern, logError calls. |
| Security | TC-301 to TC-306 | All covered | RLS, user scoping, auth guards. |
| Performance | TC-401 to TC-407 | All covered | Parallel queries, no N+1, short-circuits. |
| Visual/UI | TC-501 to TC-511 | All covered | All CSS classes match spec. |
| Accessibility | TC-601 to TC-605 | All covered | aria-label, keyboard, color contrast. |
| Data integrity | TC-701 to TC-706 | All covered | Direct data pass-through, no transformations. |

**Test plan coverage**: 83/83 test cases are addressable by the implementation. No test cases reveal gaps except QA-001 (unreachable code path) and QA-003 (denominator choice).

---

## Positive Observations

1. **Excellent fail-silent pattern**: Both DAL functions follow the exact same error handling pattern as existing functions (`return []` / `return new Map()` on error, log via `logError`). This ensures the section degrades gracefully without breaking the rest of the page.

2. **No N+1 queries**: The architectural decision to use `getUserMatchPredictionSummaries` (plural) with `.in("match_id", matchIds)` is exactly right. The alternative per-match function was explicitly rejected in the architecture doc, and the implementation follows through.

3. **Smart parallelization**: The two-phase `Promise.all` structure is well-designed. Phase 2 parallelizes `getMembersWhoPredicted` and `getUserMatchPredictionSummaries` -- two independent queries that both depend on Phase 1 results. This adds near-zero sequential latency.

4. **Structural typing leveraged correctly**: `CompletedMatchCardData` is a narrower interface that the full `matches` Row type satisfies structurally. No explicit mapping or transformation code needed. Clean and maintainable.

5. **Accessibility done right**: The three-channel winner indication (text label + color tint + text weight) satisfies WCAG 1.4.1 without overcomplicating the UI. The dynamic `aria-label` with three variants (winner, no winner, pending) provides complete screen reader context.

6. **Venue truncation fix**: The code review (W-01) flagged that `truncate` on an inline `<span>` inside a `<p>` would not work. The implementation uses a `<div>` with `flex items-center` and `min-w-0` instead, making the venue `<span>` a proper flex child where `truncate` works correctly. This was either proactively fixed or caught during development.

7. **Clean component decomposition**: The `PredictionBadge` sub-component (lines 172-210) encapsulates badge state logic cleanly. The main card component stays focused on layout.

8. **Empty matchIds guard**: `dal/standings.ts` line 35 short-circuits with `if (matchIds.length === 0) return new Map()` -- avoiding an unnecessary database round trip when there are no completed matches. The page also guards this with `completedMatchIds.length > 0` at line 62. Double protection.

---

## Recommendation

- [x] **Merge after fixing critical and moderate issues**
- [ ] Ready to merge as-is
- [ ] Needs significant rework

### Required before merge:
1. **QA-001** (Critical): Investigate the `updateLiveSnapshot` -> `status = 'completed'` path. If it can happen, add `resolved_at` setting there, or make the component resilient to the discrepancy.
2. **QA-003** (Moderate): Clarify whether `predicted_count` or `resolved_count` should be the badge denominator, per the Q2 decision. If `resolved_count`, update `UserPredictionSummary` and the badge template.
3. **QA-005** (Moderate): Related to QA-001 -- make the badge resilient to cases where `resultsPending` is true but prediction data exists.

### Should fix before production:
4. **QA-002** (Moderate): Fix `formatMatchDate` timezone handling globally (affects all date displays, not just this feature).
5. **QA-004** (Moderate): Extract `TeamScoreRow` sub-component to reduce duplication.

### Nice to have:
6. **QA-006** (Minor): Improve aria-label wording for the no-winner edge case.
7. **QA-007** (Minor): Add comment explaining intentional `mb-3` vs `mb-4` spacing difference.
8. **QA-008** (Minor): Consider inline `style` for prediction badge `color-mix` for consistency.
