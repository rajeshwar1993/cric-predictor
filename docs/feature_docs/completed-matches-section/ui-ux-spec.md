# UI/UX Specification: Completed Matches Section
**Designer**: UI/UX Agent
**Date**: 2026-03-28
**Status**: Draft

---

## 1. User Flow

The completed matches section is a passive, read-only display within the group page. The user flow is linear:

```mermaid
graph TD
    A[User navigates to Group Page] --> B{Any completed matches?}
    B -- No --> C[Section not rendered — no heading, no space]
    B -- Yes --> D[Render "Recent Results" section with up to 3 cards]
    D --> E[User scans cards: teams, scores, winner, their performance]
    E --> F{User taps a card?}
    F -- Yes --> G[Navigate to /group/:groupId/match/:matchId — Match Leaderboard]
    F -- No --> H[User continues scrolling to "The Squad" section]
```

**Critical user intent**: The user is scanning for two things — (1) who won, and (2) how they personally did. The card layout is optimized for these two glances.

---

## 2. Screen/View Inventory

| Screen / Section | Purpose | Entry Point |
|---|---|---|
| Group Page — "Recent Results" section | Show the 3 most recent completed matches with results and user performance | Direct: navigating to `/group/[groupId]`. Section appears between upcoming matches and "The Squad" member list. |
| Match Leaderboard Page (existing) | Full leaderboard and scorecard for a match | Clicking/tapping any completed match card |

No new pages or routes are introduced. This feature adds one new section to the existing group page.

---

## 3. Component Specifications

### 3.1 `CompletedMatchesSection`

- **Purpose**: Container component that wraps the section heading and the list of completed match cards. Controls visibility (renders nothing when no completed matches exist).
- **Existing Component to Extend/Use**: New — because no section wrapper pattern exists on the group page (sections are rendered inline). However, the pattern mirrors the existing "The Squad" heading + content block, so this is structurally consistent.
- **Type**: Server Component (no interactivity needed)
- **Props**:
  ```typescript
  interface CompletedMatchesSectionProps {
    groupId: string;
    matches: CompletedMatchData[];  // Pre-fetched, max 3
  }
  ```
- **States**:
  - **Default** (1-3 matches): Renders heading + cards in a vertical stack.
  - **Empty** (0 matches): Renders **nothing**. No heading, no container, no whitespace. Completely absent from the DOM. Per FR-007/FR-008, this is not an "empty state" design — it is the absence of the section.
  - **Error**: Not handled at this level. The parent page catches query errors and passes an empty array (existing pattern from `getUpcomingMatches`). The section simply does not render.
  - **Loading**: Not applicable — this is a Server Component. The page streams as a whole. No skeleton needed for this section specifically (it loads in the same `Promise.all` as upcoming matches).
- **Responsive Behavior**: No special responsive behavior at the section level. Cards stack vertically at all breakpoints (same as upcoming match cards).
- **Layout**:
  ```
  [Section heading: "Recent Results"]
  [gap: 12px — space-y-3]
  [CompletedMatchCard 1]
  [CompletedMatchCard 2]
  [CompletedMatchCard 3]
  ```
- **Section Heading Style**: Matches the existing "The Squad" heading exactly:
  ```
  font-display text-lg font-semibold text-[var(--text-primary)]
  ```
  With `mb-3` below it (slightly tighter than The Squad's `mb-4`, since completed cards have less visual weight and the section should feel compact).

---

### 3.2 `CompletedMatchCard`

- **Purpose**: Displays a single completed match result: teams with badges, final scores, winner highlight, user prediction summary, and metadata. The entire card is a clickable link to the match leaderboard.
- **Existing Component to Extend/Use**: New component — because the existing inline match cards on the group page are not componentized (they are raw JSX in a `.map()` loop) and they lack completed-state rendering. However, the design intentionally mirrors the existing card structure (same `rounded-xl`, similar padding, same `bg-card-gradient` base) to feel like a natural extension rather than a foreign element.
- **Type**: Server Component (no interactivity)
- **File**: `src/components/match/completed-match-card.tsx`
- **Props**:
  ```typescript
  interface CompletedMatchCardProps {
    groupId: string;
    match: {
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
    };
    predictionSummary: {
      predicted_count: number;
      correct_count: number;
      points_earned: number;
    } | null;  // null = user made no predictions OR results pending
    resultsPending?: boolean; // true when match is completed but predictions not yet resolved
  }
  ```

#### Visual Design — Card Structure

The card is wrapped in a `<Link>` element making the entire card tappable/clickable.

```
+-------------------------------------------------------------------+
|  [Checkmark icon]  RESULT  ·  Match 14                            |
|                                                                   |
|  [TeamBadge A]  CSK        186/4          [winner accent: "Won"]  |
|  [TeamBadge B]  MI         172/8                                  |
|                                                                   |
|  Sat, Mar 22 · Wankhede Stadium                                  |
|                                                                   |
|  [prediction badge: "3/5 correct · 35 pts"]     [arrow icon ->]   |
+-------------------------------------------------------------------+
```

#### Visual Treatment — "Completed" Distinction (FR-009)

To communicate "this is done" at a glance without reading text:

1. **Reduced opacity container**: The card uses `opacity-75` (slightly more muted than the `opacity-80` on secondary upcoming cards, to create a clear hierarchy: primary upcoming > secondary upcoming > completed).
2. **No gradient ring/glow**: Unlike live cards (which have `ring-1 ring-[var(--success)]/30`), completed cards have no ring. They use the base `bg-card-gradient` only.
3. **Muted status indicator**: The top-left label says "RESULT" in `text-[var(--text-muted)]` (gray), compared to the green "Live" or the upcoming "Next Match" treatment.
4. **No CTA button**: Upcoming cards have a prominent "Make Your Calls" CTA. Completed cards have no button — the entire card is the tap target, with only a subtle right-arrow chevron. This absence of a CTA is a strong visual differentiator.

These four differences (opacity, no ring, muted label, no CTA) allow users to distinguish completed from upcoming cards without reading any text, satisfying FR-009.

#### Card Regions (Top to Bottom)

**Region 1 — Status Bar (top)**
- Left side: A small `CheckCircle2` icon (from Lucide, 14px, `text-[var(--text-muted)]`) followed by "RESULT" label in the same style as upcoming cards' status indicators:
  ```
  text-[10px] font-display font-semibold uppercase tracking-wider text-[var(--text-muted)]
  ```
- Right side (same line): "Match {match_number}" in `text-[10px] font-display font-semibold uppercase tracking-wider text-[var(--text-muted)]`.

**Region 2 — Scores (middle)**

Two rows, one per team. Each row:
```
[TeamBadge size="sm"]  [Team Code]  ............  [Score]  [Winner Tag?]
```

- `TeamBadge`: Existing component, size `sm` (32px circle with team code).
- Team code: `text-sm font-display font-semibold`. Winner team gets `text-[var(--text-primary)]`. Losing team gets `text-[var(--text-secondary)]` (muted by one level).
- Score: `font-stats text-sm font-bold`. Winner score gets `text-[var(--text-primary)]`. Losing score gets `text-[var(--text-secondary)]`.
- **Winner accent** (FR-010): The winning team's row gets a small "Won" tag to the right of the score:
  ```
  text-[10px] font-display font-semibold uppercase tracking-wider
  ```
  Styled with the winning team's color as background at 15% opacity and the team color as text:
  ```
  style={{
    backgroundColor: `color-mix(in srgb, ${winnerTeamColor} 15%, transparent)`,
    color: winnerTeamColor,
  }}
  ```
  This uses the same `color-mix` pattern already established in `MemberList` and `PredictionStatusPill`. The tag has `rounded-full px-1.5 py-0.5`.

  **Accessibility for winner indication (FR-010 + non-functional requirement)**: The winner is communicated via three redundant channels: (1) the "Won" text label, (2) the team-color background tint, and (3) the brighter text weight vs. the losing team. This ensures the winner is identifiable without relying solely on color. The `<Link>` wrapping the card includes an `aria-label` that states the result: "CSK beat MI — Match 14 result. You scored 35 points."

  **When `match_winner` is null** (edge case: completed but winner not set, e.g., tie before super over resolution): Both teams render in `text-[var(--text-primary)]` with no "Won" tag. This state should be extremely rare.

**Region 3 — Metadata line**
Below the scores, a single line of metadata:
```
formatMatchDate(date) · venue
```
Style: `text-xs text-[var(--text-muted)]` — same as the upcoming card's metadata line but without time (irrelevant for completed matches).

**Region 4 — Footer (bottom)**
A flex row with `justify-between items-center`:

- **Left: Prediction summary badge**
  - If user has predictions and they are resolved: `"{correct_count}/{predicted_count} correct · {points_earned} pts"`
    - Style: Inline pill with `rounded-full px-2.5 py-1` background.
    - The correct/predicted ratio determines the color:
      - If `correct_count > 0`: Use success styling: `bg-[color-mix(in srgb, var(--success) 10%, transparent)] text-[var(--success)]`
      - If `correct_count === 0` and `predicted_count > 0`: Use danger styling: `bg-[color-mix(in srgb, var(--danger) 10%, transparent)] text-[var(--danger)]`
    - Points value uses `font-stats font-semibold` for the number.
    - Text uses `text-xs font-display`.
  - If user made no predictions (`predictionSummary` is null and `resultsPending` is false): `"No predictions"` in `text-xs text-[var(--text-muted)]`. No pill background.
  - If results are pending (`resultsPending` is true): `"Results pending"` in `text-xs text-[var(--pending)]` (slate gray). Uses the existing `--pending` token.

- **Right: Navigation affordance**
  - A `ChevronRight` icon (Lucide, 16px) in `text-[var(--text-muted)]`.
  - This communicates tappability without a full button, keeping the card visually lighter than upcoming cards.

#### Full Card Styling

```
<Link>
  className="block rounded-xl bg-card-gradient p-4 opacity-75
             hover:opacity-90 transition-opacity
             focus-visible:outline focus-visible:outline-2
             focus-visible:outline-[var(--border-focus)]
             focus-visible:outline-offset-2"
  href={ROUTES.MATCH_LEADERBOARD(groupId, match.id)}
  aria-label="[dynamic: match result + user score summary]"
</Link>
```

Key notes:
- `p-4` (16px) instead of the upcoming cards' `p-5` (20px) — completed cards are intentionally more compact since they carry less actionable weight.
- `hover:opacity-90` provides visual feedback that the card is interactive.
- `focus-visible` outline uses the existing `--border-focus` token (lime at 30% opacity) for keyboard navigation visibility.
- `transition-opacity` for smooth hover/focus state changes.

#### States Summary

| State | Behavior |
|---|---|
| Default (match completed, predictions resolved) | Full card with scores, winner accent, prediction badge with score |
| No predictions by user | Card renders match data normally. Footer shows "No predictions" in muted text |
| Results pending (completed but not resolved) | Card renders match data normally. Footer shows "Results pending" in pending color |
| Match winner is null | Both team rows in primary text, no "Won" tag. Extremely rare edge case. |

#### Responsive Behavior

**Mobile (320px - 639px)**:
- Card is full-width (`w-full`).
- All content stacks naturally. The score rows are flex with `justify-between`, so team badge+name sit left and scores sit right — this works at any width.
- The "Won" tag may wrap below the score at extreme widths. To prevent this, the tag uses `shrink-0 whitespace-nowrap`.
- Footer: prediction badge and chevron are on the same flex row. At 320px, the prediction text is short enough ("3/5 correct · 35 pts") to not overflow. If display name-based text were used it could overflow, but this badge uses only numbers.
- Metadata line: venue names can be long. Apply `truncate` to the venue portion to prevent overflow.

**Tablet (640px+)**:
- No layout change. Cards remain full-width stacked. The content naturally fills the wider space with more breathing room.
- The score rows gain more horizontal space between team name and score, which improves readability.

**Desktop (1024px+)**:
- The group page content area is already max-width constrained by the layout. Cards stretch to fill that constraint.
- No multi-column layout for completed cards — keeping them single-column maintains the scroll hierarchy (upcoming -> completed -> squad) and avoids breaking the visual flow.

---

### 3.3 Components Reused (No Modifications Needed)

| Component | Usage in This Feature |
|---|---|
| `TeamBadge` (`shared/team-badge.tsx`) | Team circles in each score row. Size `sm`. No changes needed. |
| `MatchScorecard` (`match/match-scorecard.tsx`) | **Not used** in completed cards. The completed card has its own simpler score layout because: (1) MatchScorecard includes live-specific logic (batting indicator, waiting state, toss info) that adds irrelevant complexity; (2) the completed card needs a winner accent that MatchScorecard doesn't support; (3) the completed card integrates the prediction summary footer which MatchScorecard has no concept of. Building a dedicated card is simpler and more maintainable than extending MatchScorecard with completed-card concerns. |
| `Skeleton` (`shared/skeleton.tsx`) | Not used — Server Component, no loading state needed. |

---

## 4. Interaction Details

### Animations / Transitions
- **Card hover**: `opacity-75 -> opacity-90` on hover, using `transition-opacity` (default 150ms ease). Subtle enough to signal interactivity without being distracting.
- **No entry animations**: Cards render immediately with the page. No fade-in or stagger animation. The group page currently has zero scroll-triggered animations, and adding them here would feel inconsistent.
- **No skeleton/shimmer**: Server-rendered content. The page streams as a whole — there is no intermediate loading state for this section specifically.

### Loading Patterns
- The completed matches data is fetched in the same `Promise.all` block as the existing `getUpcomingMatches`, `getGroupById`, etc. The page renders as one unit.
- No progressive loading or lazy loading. The section is above the fold on most devices (below 1-3 upcoming cards), so deferring it would hurt perceived performance.

### Error Handling UX
- If the database query for completed matches fails, the DAL function returns `[]` (matching the existing pattern in `getUpcomingMatches`). The section simply does not render. No error toast, no error state component.
- The error is logged server-side via the existing `logError` utility.
- Rationale: Completed results are supplementary information. Failing to show them should not degrade the core group page experience (upcoming matches, member list).

### Navigation Feedback
- Tapping a completed card navigates to the match leaderboard page. Standard Next.js `<Link>` client-side navigation applies — the page transition is handled by the framework.
- No custom loading indicator is needed beyond the browser's standard navigation behavior.

### Success Feedback
- Not applicable. There are no user actions (no form submissions, no mutations). This is a read-only display.

---

## 5. Design Tokens Used

### Colors
| Token | Usage |
|---|---|
| `--text-primary` (#ecedf6) | Winner team name, winner score, section heading |
| `--text-secondary` (#9ba1b5) | Losing team name, losing score |
| `--text-muted` (#4a5068) | Status label ("RESULT"), match number, metadata, chevron icon, "No predictions" text |
| `--success` (#34D399) | Prediction badge background/text when user got at least one correct |
| `--danger` (#F87171) | Prediction badge background/text when user got zero correct |
| `--pending` (#64748B) | "Results pending" text |
| `--border-focus` (#f3ffca4D) | Focus-visible outline for keyboard navigation |
| `--bg-card` / `--bg-elevated` (via `bg-card-gradient`) | Card background |

### Typography
| Token | Usage |
|---|---|
| `font-display` (Space Grotesk) | Section heading, team names, status label, "Won" tag, match number |
| `font-stats` (Lexend) | Score numbers, points value in prediction badge |
| Default sans (Manrope) | Metadata line, prediction count text |

### Spacing
| Token/Value | Usage |
|---|---|
| `space-y-3` (12px) | Gap between completed match cards |
| `p-4` (16px) | Card internal padding |
| `gap-2` (8px) | Gap between team badge and team name, gap between score and "Won" tag |
| `mt-3` (12px) | Gap between scores region and metadata |
| `mt-3` (12px) | Gap between metadata and footer |
| `mb-3` (12px) | Gap between section heading and first card |

### Borders & Radii
| Token/Value | Usage |
|---|---|
| `rounded-xl` (12px) | Card outer radius — matches upcoming cards |
| `rounded-full` | "Won" tag pill, prediction summary pill |

### Effects
| Token/Value | Usage |
|---|---|
| `opacity-75` | Default card opacity (completed treatment) |
| `hover:opacity-90` | Hover state feedback |
| `transition-opacity` | Smooth hover transition |

### Gradients
| Token | Usage |
|---|---|
| `bg-card-gradient` | Card background (linear-gradient from `--bg-card` to `--bg-elevated`) |

---

## 6. New Tokens/Components Introduced

### New Component: `CompletedMatchCard`

**File**: `src/components/match/completed-match-card.tsx`

**Justification**: The existing match card markup is inline in the group page (not a component), and it handles only `upcoming` and `live` states. The completed state has fundamentally different content (final scores instead of countdown, prediction summary instead of CTA, winner accent instead of prediction status pills). Creating a dedicated component is cleaner than adding completed-state branching to the already-dense inline markup. This also positions the codebase for a future refactor where all match card variants could be extracted into components.

### New Component: `CompletedMatchesSection`

**File**: `src/components/match/completed-matches-section.tsx` (or inline in the group page — PSE decision)

**Justification**: Minimal wrapper — could alternatively be inline JSX in the group page (matching the current pattern for the upcoming matches section). Leaving this as a PSE implementation decision. If inline, the heading + `.map()` loop is ~15 lines. If extracted, it becomes a thin Server Component.

### No New Design Tokens

All visual treatments use existing tokens. The `color-mix()` pattern for the "Won" tag background is already established in `MemberList` and `PredictionStatusPill`. The `opacity-75` value is a standard Tailwind utility, not a custom token.

---

## 7. Accessibility Checklist

| Requirement | Implementation |
|---|---|
| **Keyboard navigation** | Each card is a `<Link>` element — inherently focusable and activatable via Enter/Space. |
| **Focus indicator** | `focus-visible:outline` with `--border-focus` token (lime at 30% opacity). 2px width, 2px offset. Visible against the dark card background. |
| **Color contrast (WCAG AA)** | `--text-primary` (#ecedf6) on `--bg-card` (#171c28) = contrast ratio ~12:1 (passes AAA). `--text-muted` (#4a5068) on `--bg-card` (#171c28) = contrast ratio ~2.5:1 — this is decorative/supplementary text (match number, metadata), not primary content. Primary information (teams, scores, winner) all use `--text-primary` or `--text-secondary` (#9ba1b5 on #171c28 = ~5.2:1, passes AA). |
| **Winner not color-only** | Winner indication uses three channels: "Won" text label + team-color tint + brighter text than losing team. Meets WCAG 1.4.1 (Use of Color). |
| **Screen reader** | Card `<Link>` has `aria-label` summarizing the result: e.g., "CSK beat MI, Match 14. You scored 35 points from 5 predictions." This provides full context without requiring visual scanning. |
| **Touch target** | Entire card is the tap target. At minimum card height (~120px) x full width, this far exceeds the 44x44px WCAG minimum. |
| **Reduced motion** | The only animation is `transition-opacity` on hover. This is minimal and non-distracting. No `prefers-reduced-motion` override needed, but it could be added via `motion-safe:transition-opacity` if desired. |

---

## 8. Visual Hierarchy Summary

The group page's vertical visual hierarchy, with this feature added:

```
1. Group Header              [Bold, large]           — identity
2. Upcoming/Live Matches     [Full opacity, CTA]     — primary action area
3. Recent Results            [Reduced opacity, no CTA] — secondary reference
4. The Squad                 [Neutral list]           — social context
```

The completed section sits at hierarchy level 3: present and scannable, but clearly subordinate to the upcoming matches (level 2) which represent the primary user action (making predictions). The `opacity-75` treatment, absence of CTA buttons, and compact padding all reinforce this visual weight ordering.

---

## 9. Content Specifications

| Element | Copy | Notes |
|---|---|---|
| Section heading | "Recent Results" | Per FR-007. Not "Completed Matches" (too clinical) or "Past Matches" (too vague). "Recent Results" is concise and action-oriented. |
| Status label | "RESULT" | Uppercase, matches the "LIVE" / "NEXT MATCH" pattern. |
| Winner tag | "Won" | Short, unambiguous. Not "Winner" (noun vs. statement) or a trophy emoji (accessibility). |
| Prediction badge (has results) | "{X}/{Y} correct \u00b7 {Z} pts" | e.g., "3/5 correct \u00b7 35 pts". The middle dot (\u00b7) matches the metadata separator pattern used elsewhere on the page. |
| Prediction badge (no predictions) | "No predictions" | Neutral tone, no judgment. Not "You didn't predict" (accusatory). |
| Prediction badge (pending) | "Results pending" | Communicates that the match is completed but scoring hasn't happened yet. |
| Card aria-label | "{WinnerTeam} beat {LoserTeam}, Match {N}. You scored {Z} points from {Y} predictions." | Full screen-reader context. When no predictions: "...You made no predictions." When pending: "...Results are pending." |
