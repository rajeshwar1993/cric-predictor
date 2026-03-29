# Code Review: Prediction Reveal Table

**Reviewer**: PSE Agent (Code Review Mode)
**Date**: 2026-03-29
**Branch**: `feature/prediction-reveal-table`
**Build Status**: PASS (Next.js 16.2.1, compiled in 2.9s, TypeScript clean)

---

## Summary

The implementation is **solid and well-structured**. It closely follows the technical architecture document, reuses existing codebase patterns (polling, countdown, card styling, DAL conventions), and the build passes with zero TypeScript errors. The code is clean, consistently named, and the component hierarchy (server section -> client wrapper -> presentational table) is well-decomposed.

The review found **2 blockers**, **7 warnings**, and **6 suggestions**.

---

## Files Reviewed

| # | File | Action | Lines Changed |
|---|---|---|---|
| 1 | `src/types/index.ts` | Modified | +38 |
| 2 | `src/lib/dal/predictions.ts` | Modified | +33 |
| 3 | `src/lib/constants.ts` | Modified | +44 |
| 4 | `src/hooks/use-prediction-polling.ts` | New | 197 |
| 5 | `src/components/leaderboard/prediction-reveal-section.tsx` | New | 221 |
| 6 | `src/components/leaderboard/prediction-reveal-table.tsx` | New | 243 |
| 7 | `src/components/leaderboard/reveal-table-polling-wrapper.tsx` | New | 57 |
| 8 | `src/components/leaderboard/reveal-locked-placeholder.tsx` | New | 57 |
| 9 | `src/components/leaderboard/reveal-color-legend.tsx` | New | 47 |
| 10 | `src/app/group/[groupId]/match/[matchId]/page.tsx` | Modified | +15 |

---

## Findings

### BLOCKERS

#### B1. `scenarioIds` array in polling hook is unstable, causing infinite re-render loop

**File**: `src/hooks/use-prediction-polling.ts`, line 102
**File**: `src/components/leaderboard/reveal-table-polling-wrapper.tsx`, line 37

```tsx
// reveal-table-polling-wrapper.tsx:37
const scenarioIds = scenarios.map((s) => s.id); // New array every render

// use-prediction-polling.ts:102
}, [supabase, scenarioIds]); // scenarioIds is a dependency -- new ref every render
```

`scenarioIds` is created via `.map()` on every render of `RevealTablePollingWrapper`, producing a new array reference each time. This array is passed to `usePredictionPolling` and used as a dependency of `fetchPredictions` (line 102). Since the reference changes every render, `fetchPredictions` is recreated every render, which triggers the `useEffect` on line 111 every render, which calls `fetchPredictions()` + `startInterval()` every render -- creating an infinite loop of API calls and interval restarts.

**Impact**: Continuous rapid API calls to Supabase when the match is live. Will degrade performance and may hit rate limits.

**Fix**: Memoize `scenarioIds` in the wrapper:
```tsx
const scenarioIds = useMemo(() => scenarios.map((s) => s.id), [scenarios]);
```
And stabilize the dependency in the hook by using a ref for `scenarioIds` (matching the `statusRef` pattern already used for `matchStatus`), or by serializing them for comparison:
```tsx
const scenarioIdsRef = useRef(scenarioIds);
scenarioIdsRef.current = scenarioIds;
```
Then use `scenarioIdsRef.current` inside `fetchPredictions` and remove `scenarioIds` from the dependency array.

---

#### B2. Solo squad edge case not implemented (FR per requirements edge case #1)

**File**: `src/components/leaderboard/prediction-reveal-section.tsx`

The requirements (edge case #1) and copy spec (section 3c) specify that when the squad has only 1 member, the table should show a specific message: "Just you here" / "Bragging's better with rivals." The constants for this exist in `REVEAL_TABLE_COPY.EMPTY_SOLO_TITLE` and `REVEAL_TABLE_COPY.EMPTY_SOLO_BODY`, but the server component never checks for this condition.

Currently, a solo member who predicted will see a table with a single row (their own). While functional, this misses the engagement nudge specified in the requirements.

**Impact**: Missing a specified UX state. The copy constants are defined but unused -- dead code.

**Fix**: Add a check after `orderedMembers` is computed:
```tsx
if (orderedMembers.length <= 1) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
        {REVEAL_TABLE_COPY.SECTION_TITLE}
      </h2>
      <div className="rounded-[14px] border border-[var(--border-light)] bg-[var(--bg-card)] p-8 text-center">
        <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
          {REVEAL_TABLE_COPY.EMPTY_SOLO_TITLE}
        </h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {REVEAL_TABLE_COPY.EMPTY_SOLO_BODY}
        </p>
      </div>
    </div>
  );
}
```

---

### WARNINGS

#### W1. Current user's sticky column background does not match the row highlight color

**File**: `src/components/leaderboard/prediction-reveal-table.tsx`, lines 164-178

The current user row has `bg-[var(--cyan-soft)]` on the `<tr>`, but the sticky `<th>` uses an inline style `backgroundColor: "color-mix(in srgb, var(--cyan) 6%, var(--bg-card))"`. The `--cyan-soft` CSS variable is defined as `#f3ffca15` (6% opacity of `--cyan`), so mathematically these should be close but not identical because `color-mix` and alpha-channel-on-bg behave differently in compositing.

More importantly, there's a dead code branch on lines 167-169:
```tsx
className={`... ${
  isCurrentUser
    ? "bg-[var(--bg-card)]"   // ← always bg-card regardless of branch?
    : "bg-[var(--bg-card)]"   // ← identical to the if-branch
}`}
```
Both branches of the ternary produce the same class. The actual differentiation is done via the inline `style` prop. The dead conditional class is misleading.

**Fix**: Remove the dead ternary in `className` and consolidate the background logic:
```tsx
className="sticky left-0 z-10 px-4 py-2.5 text-left text-sm font-medium text-[var(--text-primary)] truncate"
style={{
  minWidth: "120px",
  maxWidth: "160px",
  boxShadow: "2px 0 4px -1px rgba(0,0,0,0.15)",
  backgroundColor: isCurrentUser
    ? "color-mix(in srgb, var(--cyan) 6%, var(--bg-card))"
    : "var(--bg-card)",
}}
```

---

#### W2. Polling hook does not stop polling when match transitions away from "live"

**File**: `src/hooks/use-prediction-polling.ts`

Unlike `useMatchPolling` which checks `data.status !== "live"` in the poll response and calls `stopInterval()` (line 108-109 of `use-match-polling.ts`), the `usePredictionPolling` hook relies entirely on the `matchStatus` prop to change externally. The tech architecture doc says "Stop condition: Externally signaled via matchStatus prop change." However, if the parent component doesn't re-render with a new `matchStatus` (e.g., the page is stale), polling will continue indefinitely.

**Impact**: Minor -- polling will eventually stop when the user navigates away. But it's an unnecessary divergence from the `useMatchPolling` pattern.

**Recommendation**: This is acceptable given the architecture design decision, but consider adding a max poll count or timeout as a safety net (e.g., stop after 2 hours of polling).

---

#### W3. `PredictionRevealSection` does an additional waterfall fetch that could be parallelized

**File**: `src/components/leaderboard/prediction-reveal-section.tsx`, lines 103-153

The component first fetches `matchGroupSettings` (line 104), evaluates `isRevealed`, and only then fetches `scenarios + members` (line 139). This creates a waterfall: `matchGroupSettings` -> then `scenarios + members + predictions`.

Since `matchGroupSettings` is a fast, single-row lookup but still adds latency in the SSR path, and since the match page already has `matchStatus` available (which covers most lock cases), the scenarios + members could be fetched in parallel with matchGroupSettings. If `isRevealed` turns out to be false, the fetched data is simply unused.

**Impact**: Adds ~50-100ms latency to the reveal table on every page load. For a pre-lock match, this wastes one unnecessary fetch. For a post-lock match (the common case), it saves one round trip.

**Fix**: Fetch all data in parallel:
```tsx
const [matchGroupSettings, scenarios, membersData] = await Promise.all([
  matchesDal.getMatchGroupSettings(groupId, matchId),
  scenariosDal.getScenariosForMatch(groupId, matchId),
  membersDal.getMembers(groupId),
]);
// Then check isRevealed; if not, return placeholder and discard scenarios/members
```

---

#### W4. Missing `role="table"` or equivalent for the scroll region

**File**: `src/components/leaderboard/prediction-reveal-table.tsx`, line 101-106

The scroll container has `role="region"` and `aria-label="Scroll to see more scenario columns"` and `tabIndex={0}`, which is good for keyboard scrolling. However, when a table is inside a scrollable `role="region"`, some screen readers may not announce the table context properly. The `<table>` element itself is semantically correct, so this is low risk, but the `tabIndex={0}` on the scroll container means keyboard users will land on the container before the table, which may be confusing.

**Recommendation**: Consider removing `tabIndex={0}` from the scroll container and relying on the table's natural keyboard navigation. Or keep it but test with VoiceOver/NVDA.

---

#### W5. `REVEAL_TABLE_COPY.LOADING` and `REVEAL_TABLE_COPY.EMPTY_NO_SCENARIOS` are defined but unused

**File**: `src/lib/constants.ts`, lines 128, 126

`LOADING` ("Loading picks...") is never referenced in any component. The architecture specifies SSR with no loading spinner for initial state, and silent polling updates, so this is consistent -- but it's dead code.

`EMPTY_NO_SCENARIOS` ("No scenarios for this match yet.") is also unused because the section returns `null` when there are no scenarios (line 146 of `prediction-reveal-section.tsx`), per requirements edge case #7. This is correct behavior but the constant is dead code.

**Fix**: Either remove these unused constants or add a comment explaining they're reserved for future use.

---

#### W6. Member name column `<span className="truncate">` won't truncate without a width constraint

**File**: `src/components/leaderboard/prediction-reveal-table.tsx`, line 180

```tsx
<span className="truncate">
  {member.displayName}
  ...
</span>
```

The `truncate` class (which applies `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`) requires the element to have a constrained width. The parent `<th>` has `maxWidth: 160px` via inline style, but `<span>` is an inline element and won't inherit the max-width constraint. The truncation may not work as expected for long display names.

**Fix**: Add `block` or `max-w-[120px] inline-block` to the span, or make the `<th>` have `overflow: hidden` directly.

---

#### W7. `points_earned` is fetched but never used

**File**: `src/lib/dal/predictions.ts`, line 127; `src/types/index.ts`, `RevealPrediction.points_earned`

The DAL query selects `points_earned` and the `RevealPrediction` type includes it, but `buildPredictionMatrix` in `prediction-reveal-section.tsx` only uses `value` and `is_correct`. The `points_earned` field is fetched from the database but discarded during matrix transformation.

**Impact**: Minor bandwidth/memory waste. Each prediction carries an unused number.

**Fix**: Either remove `points_earned` from the select query and the type, or preserve it in `RevealCellData` if it will be used in v2 (e.g., "points earned" tooltip per cell). If intentionally reserved, add a comment.

---

### SUGGESTIONS

#### S1. Consider memoizing `scenarioIds` in the polling wrapper

**File**: `src/components/leaderboard/reveal-table-polling-wrapper.tsx`, line 37

Even after fixing B1, wrapping `scenarioIds` in `useMemo` is a good defensive practice:
```tsx
const scenarioIds = useMemo(() => scenarios.map((s) => s.id), [scenarios]);
```

---

#### S2. The `RevealLockedPlaceholder` could show the section heading copy

**File**: `src/components/leaderboard/reveal-locked-placeholder.tsx`

The copy spec (section 2, variant A) mentions a heading "Picks Under Wraps" for the locked state. The current implementation shows the message text but no heading (`<h3>`). The section heading "The Reveal" is rendered by the parent, but the card itself has no title. Compare this with the empty state (lines 183-184 of `prediction-reveal-section.tsx`) which does render an `<h3>`.

**Recommendation**: Add a heading inside the placeholder card to match the empty state pattern.

---

#### S3. Cell transition animation could benefit from `will-change` for smoother GPU rendering

**File**: `src/components/leaderboard/prediction-reveal-table.tsx`, line 204

```tsx
className="... transition-colors duration-500"
```

For tables with 240+ cells, triggering background-color transitions simultaneously on a poll update could cause jank on lower-end mobile devices. Consider adding `will-change: background-color` or testing on a mid-range Android device.

---

#### S4. The legend "No Pick" swatch uses `var(--bg-elevated)` which differs from the cell's `transparent`

**File**: `src/components/leaderboard/reveal-color-legend.tsx`, line 19

The "No Pick" legend swatch has `background: "var(--bg-elevated)"`, but actual "No Pick" cells in the table have `background: "transparent"`. The legend swatch should match the actual cell appearance. On the dark card background, a `transparent` swatch would be invisible, so using `var(--bg-elevated)` is a reasonable visual approximation -- but worth a comment explaining the divergence.

---

#### S5. Table could benefit from `<colgroup>` for consistent column widths

**File**: `src/components/leaderboard/prediction-reveal-table.tsx`

Currently, column widths are set via `minWidth`/`maxWidth` on individual `<th>` and the table's `minWidth` is calculated inline. Using `<colgroup>` with `<col>` elements would be more semantic and give more predictable column sizing across browsers.

---

#### S6. Hover state on rows conflicts with sticky column background

**File**: `src/components/leaderboard/prediction-reveal-table.tsx`, line 161

```tsx
: "border-l-2 border-l-transparent hover:bg-[var(--bg-hover)]"
```

When a non-current-user row is hovered, the row background changes to `var(--bg-hover)`, but the sticky first column retains `bg-[var(--bg-card)]` via its inline style. This creates a visual discontinuity where the sticky name column stays dark while the rest of the row highlights. The `useMatchPolling` leaderboard avoids this issue because it uses CSS grid (not a sticky column).

**Fix**: Use a group-hover pattern or apply the hover background to the sticky cell as well via JavaScript or CSS `group-hover:`.

---

## Checklist Summary

| Criterion | Status | Notes |
|---|---|---|
| **Build** | PASS | Clean TypeScript, 0 errors |
| **Correctness** | Mostly correct | B2 (solo edge case missing) |
| **Architecture compliance** | Excellent | Follows tech architecture doc precisely |
| **Code quality** | Good | Clean decomposition, proper typing, JSDoc on exports |
| **Security** | PASS | RLS is the enforcement layer; frontend shows placeholder pre-lock; no data leaks |
| **Performance** | B1 (infinite loop) | Polling hook has unstable dependency causing excessive re-renders |
| **Accessibility** | Good | Semantic table, aria-labels, aria-current, sr-only caption, role="note" legend, Check/X icons |
| **Mobile responsiveness** | Good | Sticky column, horizontal scroll, touch-friendly padding |
| **Error handling** | Good | Silent failures, graceful empty states, null returns |
| **Consistency** | Excellent | Matches existing patterns (polling hook, card styles, copy constants, DAL conventions) |
| **Edge cases** | B2 missing | Solo squad not handled; other edge cases covered |

---

## Verdict

**Conditional approval**: Fix the 2 blockers (B1: infinite re-render loop in polling, B2: missing solo squad edge case). The warnings are recommended but not blocking. After blocker fixes, this is ready to merge.
