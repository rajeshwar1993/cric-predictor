# UI/UX Specification: Refresh Button & Polling State Indicators
**Designer**: UI/UX Agent
**Date**: 2026-03-29
**Status**: Draft

---

## 1. User Flow

The refresh button and polling indicators are passive UI elements within an existing component (`MatchScorecard`). There is no multi-step user journey to map. The interaction is:

```
User sees live scorecard
  -> Notices refresh icon in header area
  -> Taps refresh icon
  -> Icon spins, button becomes non-clickable
  -> Scores update (or remain same if no new data)
  -> Icon stops spinning
  -> "Last updated" timestamp updates
```

Auto-polling follows the same visual cycle but is triggered by the `useMatchPolling` hook every 120 seconds rather than by user action.

### Visibility Rules

| Match Status | Refresh Button | Last Updated Text | Polling Active |
|---|---|---|---|
| `upcoming` | Hidden | Hidden | No |
| `live` | Visible | Visible | Yes |
| `completed` | Hidden | Hidden | No |
| `abandoned` | Hidden | Hidden | No |
| `no_result` | Hidden | Hidden | No |

---

## 2. Screen/View Inventory

| Screen | Purpose | Scorecard Mode | Entry Point |
|---|---|---|---|
| Group Home (`/group/[groupId]`) | List of upcoming/live matches with inline scorecards | `compact` | Navigate to any group |
| Match Leaderboard (`/group/[groupId]/match/[matchId]`) | Full scorecard + prediction leaderboard | `full` (default) | Tap "View Leaderboard" on a live match card |

No new screens are introduced. Both existing screens gain the refresh button and last-updated indicator within their existing `MatchScorecard` instances.

---

## 3. Component Specifications

### 3.1 Refresh Icon Button (within MatchScorecard)

- **Purpose**: Allow users to manually trigger a score refresh during live matches.
- **Existing Component to Extend**: `MatchScorecard` (`web-app/src/components/match/match-scorecard.tsx`). The button itself uses a native `<button>` element (not the `Button` UI component) to keep it visually minimal and avoid the prominence of a styled button.
- **Icon**: `RefreshCw` from `lucide-react` (already used in the codebase by `error-state.tsx`).

#### New Props on MatchScorecardProps

```ts
interface MatchScorecardProps {
  // ... existing props unchanged ...
  onRefresh?: () => void;     // Callback for manual refresh. Button hidden if undefined.
  isPolling?: boolean;         // True while any fetch (auto or manual) is in-flight.
  lastUpdated?: Date | null;   // Timestamp of last successful data fetch.
}
```

Defaults: `onRefresh = undefined`, `isPolling = false`, `lastUpdated = null`.

#### States

| State | Visual | Behavior |
|---|---|---|
| **Default (idle)** | Static `RefreshCw` icon, `text-[var(--text-muted)]` color | Clickable. On click, calls `onRefresh()`. |
| **Hover** | Icon color transitions to `text-[var(--text-secondary)]` | Cursor: pointer. |
| **Active (pressed)** | Brief scale-down via `active:scale-95` | Standard tactile feedback. |
| **Focus-visible** | `outline` ring using `var(--border-focus)` | Keyboard navigation indicator. |
| **Loading (isPolling=true)** | Icon rotates via `animate-spin`. Color: `text-[var(--text-muted)]`. Opacity: `opacity-50`. | `disabled={true}`, `cursor-not-allowed`. Not clickable. |
| **Hidden** | Not rendered | When `status !== "live"` OR `onRefresh` is undefined. |

#### Sizing by Mode

| Mode | Icon Size | Button Hit Target | Rationale |
|---|---|---|---|
| `compact` | `h-3 w-3` (12px) | `h-5 w-5` (20px) padded area | Compact cards have `text-xs` scores. A 12px icon is proportional. The 20px hit target meets the 44px touch recommendation when combined with surrounding padding from the parent card (p-5). |
| `full` (default) | `h-3.5 w-3.5` (14px) | `h-6 w-6` (24px) padded area | Full mode has `text-lg` scores. A 14px icon is proportional. Generous hit target. |

#### Placement

**Full mode** -- The refresh button is placed in the status header row, to the right of the "Live" indicator, pushed to the far right using `justify-between` on the flex container. This creates a natural `[pulsing-dot] [Live text] ... [refresh icon]` layout within the existing `mb-3` status header div.

```
+-------------------------------------------------+
|  * Live                              [refresh]  |   <-- status header
|  [CSK badge] CSK    186/5 (20) BAT              |
|  [MI  badge] MI     142/6 (16.3)                |
|  Updated 1m ago                                 |   <-- last updated
+-------------------------------------------------+
```

**Compact mode** -- The compact mode currently has no status header block (it is suppressed with `{!compact && ...}`). The refresh button is placed inline at the top-right of the compact scorecard container. It is positioned absolutely relative to the scorecard's wrapping `<div>`, sitting in the top-right corner. The compact container needs `relative` added to its className.

```
+-----------------------------------+
|  CSK  186/5 (20) BAT    [refresh] |
|  MI   142/6 (16.3)                |
|  Updated 1m ago                   |
+-----------------------------------+
```

For the waiting state (live but no scores), the refresh button still appears in the same position -- top-right corner for compact, or right side of status header for full.

### 3.2 Last Updated Indicator (within MatchScorecard)

- **Purpose**: Show users when scores were last refreshed so they can gauge data freshness.
- **Existing Component to Extend**: `MatchScorecard` (appended as a footer element).

#### Visual Design

- **Text format**: "Updated Xm ago" (uses relative time: "just now", "1m ago", "5m ago", etc.) This mirrors the `formatTimeAgo` pattern already used in `notification-bell.tsx`.
- **Typography**: `text-[10px]` in compact mode, `text-xs` in full mode.
- **Color**: `text-[var(--text-muted)]` (#4a5068) -- the most subdued text tier in the design system.
- **Font**: Default body font (`font-sans` / Manrope). No `font-display` -- this is utilitarian metadata, not a heading.
- **Position**: Below the score rows, left-aligned. Uses `mt-2` spacing in full mode, `mt-1.5` in compact mode.
- **Visibility**: Only visible when `lastUpdated` is not null AND `status === "live"`.

#### States

| State | Display |
|---|---|
| `lastUpdated` is null | Not rendered |
| `lastUpdated` < 60s ago | "Updated just now" |
| `lastUpdated` 1-59 min ago | "Updated Xm ago" |
| `lastUpdated` 1-23 hours ago | "Updated Xh ago" |
| `status !== "live"` | Not rendered |

Note: Given the 120s polling interval, the typical values shown will be "Updated just now" (right after a poll) through "Updated 2m ago" (just before the next poll). The hours case is a fallback for edge scenarios (e.g., long background tab).

---

## 4. Interaction Details

### Animations

| Element | Animation | CSS | Duration | Trigger |
|---|---|---|---|---|
| Refresh icon spin | Continuous rotation | `animate-spin` (Tailwind built-in, 1s linear infinite) | While `isPolling === true` | Auto-poll or manual refresh starts |
| Refresh icon hover | Color transition | `transition-colors` | 150ms (Tailwind default) | Mouse hover on idle button |
| Refresh icon press | Scale down | `active:scale-95` with `transition-transform` | Instant | Mousedown / touchstart |

### Why `animate-spin` on `RefreshCw` (not `Loader2`)

The codebase convention is to use `Loader2` with `animate-spin` for loading states in buttons and forms (seen in 20+ instances). However, for this refresh button the `RefreshCw` icon itself should spin. Rationale:

1. The button IS the refresh icon -- swapping to `Loader2` during loading would cause a visual pop (icon swap) that draws too much attention for a background poll.
2. `RefreshCw` spinning communicates "refreshing" more clearly than a generic loader.
3. The spinning `RefreshCw` pattern is a well-established convention (Twitter/X pull-to-refresh, many mobile apps).

### Loading Patterns

- **During polling (auto or manual)**: The refresh icon spins. No other loading indicator on the scorecard. Score content remains visible with the last known data (stale-while-revalidate).
- **No skeleton/shimmer**: The scorecard never shows a loading skeleton during polls. The existing score data remains visible. This is intentional per requirements (NFR-004: "The UI shows the last successfully fetched data").
- **No full-overlay spinner**: A spinner overlay would obscure the scores, which defeats the purpose.

### Error Handling UX

- **Network error during poll**: Silent. The refresh icon stops spinning. Previous scores remain. No toast, no error message, no visual change to the scorecard. The next auto-poll or manual refresh retries.
- **Rationale**: Polling errors are transient and self-healing. Surfacing them would create noise during flaky connectivity (common at cricket stadiums with overloaded cell towers).

### Success Feedback

- **After successful poll**: The refresh icon stops spinning. The `lastUpdated` timestamp resets to "Updated just now". Score values update in place (no transition animation on the numbers -- they simply replace).
- **No score-change highlight**: Highlighting changed scores (e.g., flash of color when score updates) is out of scope for v1. The score simply updates to the new value.

---

## 5. Design Tokens Used

All tokens are from the existing Stadium Kinetic design system. No new tokens introduced.

### Colors

| Token | Hex | Usage |
|---|---|---|
| `--text-muted` | `#4a5068` | Refresh icon default color, last-updated text |
| `--text-secondary` | `#9ba1b5` | Refresh icon hover color |
| `--border-focus` | `#f3ffca4D` | Focus-visible ring on the refresh button |
| `--success` | `#34D399` | Existing "Live" indicator (unchanged) |

### Typography

| Token/Class | Usage |
|---|---|
| `text-[10px]` | Last-updated text in compact mode |
| `text-xs` | Last-updated text in full mode |
| `font-sans` (Manrope) | Last-updated text (body font, not display) |

### Spacing

| Token/Class | Usage |
|---|---|
| `mt-2` | Last-updated spacing below scores (full mode) |
| `mt-1.5` | Last-updated spacing below scores (compact mode) |
| `gap-2` | Space between "Live" text and refresh button (full mode status header) |

### Animation

| Class | Usage |
|---|---|
| `animate-spin` | Refresh icon rotation during polling (Tailwind built-in) |
| `animate-ping` | Existing "Live" dot animation (unchanged) |
| `transition-colors` | Refresh icon hover state |
| `transition-transform` | Refresh icon active press state |

---

## 6. New Tokens/Components Introduced

**None.** The entire specification is built from existing design system tokens, existing Tailwind utilities, and an existing icon (`RefreshCw` from lucide-react, already imported in `error-state.tsx`).

No new UI components are created in `components/ui/`. The refresh button and last-updated text are internal elements of the `MatchScorecard` component, not standalone reusable components.

---

## 7. Accessibility

### Refresh Button

| Requirement | Implementation |
|---|---|
| Keyboard focusable | Native `<button>` element (inherently focusable) |
| Keyboard activatable | Enter and Space fire click (native button behavior) |
| Screen reader label | `aria-label="Refresh scores"` |
| Loading announcement | `aria-busy="true"` when `isPolling === true` |
| Disabled state | `disabled={true}` when `isPolling === true` (native disabled, removes from tab order while spinning) |
| Focus ring | `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]` |
| Color contrast | Icon uses `--text-muted` (#4a5068) on `--bg-card` (#171c28). Contrast ratio: 2.1:1. This is below WCAG AA for text, but acceptable for a decorative icon with an `aria-label`. The icon is supplementary to the "Live" text indicator, not the sole means of conveying information. |

### Last Updated Text

| Requirement | Implementation |
|---|---|
| Color contrast | `--text-muted` (#4a5068) on `--bg-card` (#171c28). Ratio: 2.1:1. Below AA for normal text. **Mitigation**: This is supplementary metadata. The score values themselves (using `--text-primary`, 12.7:1 ratio) are the primary information. The last-updated text is a progressive enhancement for users who want to gauge freshness. |
| Screen reader | Text is naturally readable. No `aria-hidden`. |
| Live region | Not used. The last-updated text updates silently. Announcing every 120s poll completion via `aria-live` would be disruptive. |

### Note on Contrast Ratios

The `--text-muted` color is intentionally low-contrast by design system choice ("Stadium Kinetic" prioritizes atmospheric dark-mode aesthetics). Both the refresh icon and last-updated text use this tier because they are deliberately de-emphasized -- they should not compete with score display for visual attention. This is a conscious design trade-off documented in the system. Users who need the refresh action can still access it via keyboard with the clearly visible focus ring.

---

## 8. Responsive Behavior

### Mobile (< 640px / `sm` breakpoint)

**Compact mode (group page)**:
- Match cards are full-width. The compact scorecard fills the available width.
- Refresh button sits in the top-right corner (absolutely positioned). Sufficient space due to card `p-5` padding.
- Last-updated text at `text-[10px]` fits comfortably below scores.
- Touch target: The `h-5 w-5` button area combined with the surrounding card padding provides adequate touch clearance.

**Full mode (match leaderboard page)**:
- The scorecard container has `p-6` padding within a `rounded-[20px]` card.
- Status header row: `[dot + Live] ... [refresh icon]` with `justify-between`.
- Plenty of horizontal space even on narrow screens (scorecard content is ~200px wide at most).

### Tablet (640px - 1024px)

Same as mobile. No layout changes needed. The scorecard is not width-constrained at tablet sizes.

### Desktop (> 1024px)

Same layout. The scorecard sits within a max-width container. Extra horizontal space does not affect the refresh button placement.

### Summary

The refresh button and last-updated indicator are size-responsive (different sizes in compact vs full mode) but not layout-responsive. They maintain the same position at all viewport widths. This is appropriate because:
1. The `MatchScorecard` component itself is not responsive -- it uses the same layout at all sizes, with compact/full controlled by the `compact` prop, not by viewport width.
2. The refresh icon is small enough (12-14px) to fit at any width.

---

## 9. Implementation Guidance for PSE

### Structural Changes to MatchScorecard

The component currently has no `"use client"` directive. Since the new props (`onRefresh`, `isPolling`, `lastUpdated`) are optional and default to passive values, the component can remain a server component when those props are not provided. However, when used with polling (i.e., when `onRefresh` is passed), it will be rendered by a client wrapper component. The `RefreshCw` import and conditional rendering do not require `"use client"` -- the interactivity comes from the parent.

**Important**: `MatchScorecard` must add `"use client"` because it now accepts an `onRefresh` function prop (functions cannot be serialized across the server/client boundary when passed as props from a server component). The client wrapper components will import and render it.

### Full Mode Status Header -- Modified Markup

The current status header for the live state (lines 55-61 of `match-scorecard.tsx`) is:

```tsx
<div className="flex items-center gap-2">
  <span className="relative flex h-2 w-2">...</span>
  <span className="... text-[var(--success)]">Live</span>
</div>
```

This should become:

```tsx
<div className="flex items-center justify-between">
  <div className="flex items-center gap-2">
    <span className="relative flex h-2 w-2">...</span>
    <span className="... text-[var(--success)]">Live</span>
  </div>
  {onRefresh && (
    <button
      onClick={onRefresh}
      disabled={isPolling}
      aria-label="Refresh scores"
      aria-busy={isPolling || undefined}
      className="flex items-center justify-center h-6 w-6 rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors active:scale-95 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-[var(--text-muted)]"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${isPolling ? "animate-spin" : ""}`} />
    </button>
  )}
</div>
```

### Compact Mode -- Refresh Button Positioning

Add `relative` to the compact container's className. Position the button absolutely:

```tsx
{compact && onRefresh && status === "live" && (
  <button
    onClick={onRefresh}
    disabled={isPolling}
    aria-label="Refresh scores"
    aria-busy={isPolling || undefined}
    className="absolute top-0 right-0 flex items-center justify-center h-5 w-5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors active:scale-95 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-[var(--text-muted)]"
  >
    <RefreshCw className={`h-3 w-3 ${isPolling ? "animate-spin" : ""}`} />
  </button>
)}
```

### Last Updated -- Placement

After the score rows `<div className="space-y-2">` block and after the waiting-state message, add:

```tsx
{lastUpdated && status === "live" && (
  <p className={`${compact ? "mt-1.5 text-[10px]" : "mt-2 text-xs"} text-[var(--text-muted)]`}>
    Updated {formatTimeAgo(lastUpdated)}
  </p>
)}
```

The `formatTimeAgo` function should follow the same pattern as `notification-bell.tsx` (lines 155-163). It can be extracted to a shared utility or defined locally within the component.

---

## 10. Visual Reference -- All States

### Full Mode States

**Live, idle (scores present, not polling)**:
```
+---------------------------------------------------+
|  * Live                                [RefreshCw] |
|                                                    |
|  [CSK] CSK     186/5 (20)  BAT                    |
|  [MI]  MI      142/6 (16.3)                       |
|                                                    |
|  Updated 1m ago                                    |
+---------------------------------------------------+
```

**Live, polling (spinner active)**:
```
+---------------------------------------------------+
|  * Live                          [RefreshCw spin]  |
|                                          (dim)     |
|  [CSK] CSK     186/5 (20)  BAT                    |
|  [MI]  MI      142/6 (16.3)                       |
|                                                    |
|  Updated just now                                  |
+---------------------------------------------------+
```

**Live, waiting for first ball**:
```
+---------------------------------------------------+
|  Toss: CSK won the toss                            |
|                                                    |
|  [CSK] CSK     0/0                                 |
|  [MI]  MI      Yet to bat                          |
|                                                    |
|  * Waiting for the first ball...                   |
|  Updated just now                                  |
+---------------------------------------------------+
```
Note: In the waiting state, the refresh button still appears in the status header area. However, the status header shows the toss info instead of "Live" text. The button should be placed to the right of the toss info text using the same `justify-between` pattern.

**Completed (no refresh UI)**:
```
+---------------------------------------------------+
|  CSK won by 44 runs                                |
|                                                    |
|  [CSK] CSK     186/5 (20)                         |
|  [MI]  MI      142/10 (18.2)                      |
+---------------------------------------------------+
```

### Compact Mode States

**Live, idle**:
```
+----------------------------------+
|  [CSK] CSK  186/5 (20) BAT  [R] |
|  [MI]  MI   142/6 (16.3)        |
|  Updated 1m ago                  |
+----------------------------------+
```
`[R]` = small RefreshCw icon, absolutely positioned top-right.

**Live, polling**:
```
+----------------------------------+
|  [CSK] CSK  186/5 (20) BAT  [@] |
|  [MI]  MI   142/6 (16.3)        |
|  Updated just now                |
+----------------------------------+
```
`[@]` = spinning RefreshCw, dimmed.
