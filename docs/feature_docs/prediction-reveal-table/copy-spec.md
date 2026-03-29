# Copy Specification: Prediction Reveal Table
**Copywriter**: Copy Agent
**Date**: 2026-03-29
**Voice Profile**: Casual, cricket-savvy, and playful. Short punchy phrases. Second person ("you"). Uses cricket slang naturally ("calls", "picks", "nailed it"). Matches the existing Bragg voice seen in "Make Your Calls", "Nailed It", "Sweating", "In Play", and "Nobody's made a call yet -- be the first one in!"

---

## Screen: Match Page (`/group/[groupId]/match/[matchId]`)

The Prediction Reveal Table sits below the Match Leaderboard. It shows all squad members' predictions in a matrix: members as rows, scenarios as columns, color-coded by resolution status.

---

### 1. Section Header

- **Context**: Always visible when the table renders (post-lock). Styled like the existing "Match Leaderboard" heading (`font-display text-lg font-semibold`).
- **Primary copy**: "The Reveal"
- **Alternatives considered**:
  - "Everyone's Picks" -- accurate but flat
  - "Squad Predictions" -- descriptive but generic
  - "Prediction Breakdown" -- too analytical; doesn't match the playful Bragg tone
- **Notes**: "The Reveal" fits the drama of predictions becoming visible. It matches the existing section naming style ("Match Leaderboard", "The Squad") -- short, punchy, title-case noun phrases.

---

### 2. Pre-Lock State (Before Predictions Are Revealed)

- **Context**: The match is upcoming and the deadline has not passed. The table section renders as a locked placeholder instead of prediction data. This preserves the secrecy of picks.

#### Variant A: With countdown available
- **Copy**: "Picks stay under wraps until lock-in. Sit tight."
- **Character limit**: ~60 chars
- **Notes**: Matches the existing countdown tone ("Predictions close at 7:00 PM IST"). The countdown timer itself is handled by the UI component; this is the supporting text.

#### Variant B: Deadline imminent (under 1 hour)
- **Copy**: "Almost time -- picks drop soon."
- **Character limit**: ~40 chars

#### Variant C: Generic (no countdown displayed)
- **Copy**: "Everyone's picks will appear here once predictions lock."
- **Character limit**: ~60 chars
- **Notes**: Safe fallback. Clear and informative without being exciting.

---

### 3. Empty States

#### 3a. No Predictions Exist (Nobody in the squad predicted for this match)

| Element | Copy |
|---------|------|
| **Heading** | "No picks on the board" |
| **Body** | "Nobody made a call for this match. Next time, be the one to get things started." |
| **Notes** | Mirrors the leaderboard empty state: "Nobody's made a call yet -- be the first one in!" Keeps the motivating, action-oriented tone. |

#### 3b. A Specific Member Has No Picks (Their row is all dashes)

| Element | Copy |
|---------|------|
| **Cell text** | "\u2014" (em dash) |
| **Tooltip / aria-label** | "{display_name} did not predict this scenario" |
| **Notes** | The em dash is the existing pattern for missing predictions (see `ExpandablePicks`: `prediction?.value || "\u2014"`). Screen readers get the full explanation via the label. |

#### 3c. Solo Squad (Only 1 member in the group)

| Element | Copy |
|---------|------|
| **Heading** | "Just you here" |
| **Body** | "Bragging's better with rivals. Share your invite link to fill the squad." |
| **CTA** | (Reuses existing InviteLink component -- no new CTA copy needed) |
| **Notes** | Friendly nudge, not a dead end. Matches the group page's "{n}/10 in the squad" social proof pattern. |

#### 3d. No Scenarios Published for This Match

| Element | Copy |
|---------|------|
| **Body** | "No scenarios for this match yet." |
| **Notes** | The table section should not render at all per requirements (edge case #7). If it does render as a fallback, this is the copy. Minimal and informational. |

---

### 4. Column Headers (Scenario Names)

- **Context**: Each column header shows the scenario title. On mobile, columns are narrow; titles must be shortened. Full title is available on hover (desktop) or tap (mobile).

#### Abbreviation Map (System Scenarios)

| Category | Full Title (from SYSTEM_SCENARIOS) | Column Header (Short) | Character Limit |
|----------|------------------------------------|-----------------------|-----------------|
| `match_winner` | Who's winning this? | Winner | 6 |
| `toss_winner` | Who calls the toss? | Toss | 4 |
| `top_scorer` | Who tops the run chart? | Top Bat | 7 |
| `top_wicket_taker` | Who's the top wicket-taker? | Top Bowl | 8 |
| `player_of_match` | Who takes the award? | MoM | 3 |
| `first_innings_score` | First innings total? | 1st Inn | 7 |
| `total_match_runs` | How many runs in the match? | Runs | 4 |
| `powerplay_score` | Powerplay total (first 6)? | PP Score | 8 |
| `powerplay_wickets` | Wickets in the powerplay? | PP Wkts | 7 |
| `total_sixes` | How many sixes fly out? | Sixes | 5 |
| `total_wickets` | Total wickets in the match? | Wkts | 4 |
| `batsman_fifty` | Anyone hitting a fifty? | Fifty? | 5 |
| `bowler_three_wkt` | Any bowler grabbing 3+ wickets? | 3-fer? | 4 |
| `had_super_over` | Super Over on the cards? | SO? | 3 |
| `most_sixes` | Who's the six-hitting machine? | Six King | 8 |
| `first_wicket_over` | When does the first wicket fall? | 1st Wkt | 7 |

- **Custom scenarios**: Truncate the user-provided title with ellipsis at the column width. No abbreviation logic needed -- custom titles are freeform.
- **Tooltip**: Show the full scenario title text (e.g., "Who's winning this?") on hover/tap for all columns.
- **Aria-label on `<th>`**: Use the full title, e.g., `aria-label="Who's winning this?"`.
- **Notes**: Abbreviations use widely understood cricket shorthand. "MoM" (Man of the Match), "PP" (Powerplay), "Wkts" (Wickets), "Inn" (Innings) are standard in cricket coverage. The "?" suffix on yes/no categories (Fifty?, 3-fer?, SO?) signals that these are yes/no questions.

---

### 5. Cell Content (Prediction Values)

- **Context**: Each cell displays the prediction value the member submitted. Values come from `predictions.value` and can be team codes ("CSK"), player names ("Virat Kohli"), ranges ("150-169"), or yes/no ("Yes").

| Cell State | Display Value | Notes |
|------------|--------------|-------|
| **Team pick** (e.g., match_winner, toss_winner) | Team code as-is: "CSK", "MI", etc. | Already short. No truncation needed. |
| **Player pick** (e.g., top_scorer, MoM) | First name + last initial: "Virat K." | Full name on hover/tap. Truncate with ellipsis if still too wide. |
| **Range pick** (e.g., first_innings_score) | Range as-is: "150-169", "<40", "3+" | Already compact. |
| **Yes/No pick** (e.g., batsman_fifty) | "Yes" / "No" | Short and clear. |
| **Custom scenario** | Value as-is, truncated with ellipsis | Full value on hover/tap. |
| **No prediction** | "\u2014" (em dash) | Gray/muted styling. See section 3b. |

- **Mobile truncation**: If a cell value exceeds the column width, truncate with ellipsis. The full value is accessible via:
  - Desktop: `title` attribute (native tooltip on hover)
  - Mobile: Tap to show full value (P2 feature; for v1, the tooltip still works on long-press)
  - Screen reader: `aria-label` with full text (see section 7)

---

### 6. Color Legend Labels

- **Context**: A compact legend appears above or below the table (per FR-017). Three status indicators with colored dots/squares and text labels.

| Status | Color Token | Legend Label | Icon Alt Text |
|--------|-------------|--------------|---------------|
| Correct | `var(--success)` / green | "Nailed It" | Checkmark |
| Incorrect | `var(--danger)` / red | "Missed" | Cross |
| Pending | `var(--pending)` / slate | "In Play" | Clock |
| No pick | (neutral/muted) | "No Pick" | Dash |

- **Notes**: "Nailed It", "Missed", and "In Play" are the established Bragg vocabulary from `PredictionStatusPill` and `PREDICTION_STATUS` in constants. Reusing them keeps the voice consistent and avoids introducing new terminology for the same concepts. "No Pick" is added because the legend needs to explain the em-dash cells, which are distinct from "In Play" (pending) cells.
- **Format**: `[colored dot] Label` -- matches the existing `PredictionStatusPill` dot + text pattern.
- **Placement recommendation**: Below the table, left-aligned, single row on desktop, wrapping on mobile. Keep it small (`text-[10px]` or `text-xs`) so it doesn't compete with the table.

---

### 7. Tooltips and Accessibility Labels

- **Context**: Color-coded cells must not rely on color alone (NFR-006, WCAG 2.1 AA). Each cell needs a text-based status indicator and a descriptive label for assistive technology.

#### Cell Aria Labels

| Cell State | `aria-label` Value |
|------------|-------------------|
| Correct prediction | "{display_name} predicted {value} for {scenario_title} -- Nailed It" |
| Incorrect prediction | "{display_name} predicted {value} for {scenario_title} -- Missed" |
| Pending prediction | "{display_name} predicted {value} for {scenario_title} -- In Play" |
| No prediction | "{display_name} did not predict {scenario_title}" |

**Examples**:
- "Alice predicted CSK for Who's winning this? -- Nailed It"
- "Bob predicted Virat Kohli for Who tops the run chart? -- Missed"
- "Charlie predicted 150-169 for First innings total? -- In Play"
- "Dana did not predict Who calls the toss?"

#### Visual Status Indicators (Non-Color)

In addition to the background color tint, each cell should include a small icon or text marker:

| Status | Visual Indicator | Notes |
|--------|-----------------|-------|
| Correct | Compact checkmark icon (lucide `Check`, ~10px) | Green tint + checkmark = redundant confirmation for sighted users, essential for color-blind users. |
| Incorrect | Compact X icon (lucide `X`, ~10px) | Red tint + X. |
| Pending | No icon | Pending is the default/neutral state. Adding a clock icon to every unresolved cell would create too much visual noise. The absence of a checkmark or X implies "not yet resolved." |
| No pick | "\u2014" (em dash) text | Already non-color-dependent. The dash itself communicates "nothing here." |

#### Row Highlight (Current User)

- **Aria label on current user's row**: Add `aria-current="true"` to the `<tr>`.
- **Visual label**: "(you)" appended to the display name in the sticky first column, matching the existing `MatchLeaderboard` pattern.

#### Table Caption (Screen Readers)

- **`<caption>` text**: "Squad predictions for {team_a} vs {team_b}, Match {match_number}"
- **Example**: "Squad predictions for CSK vs MI, Match 12"
- **Notes**: Visually hidden (`sr-only` class) but gives screen reader users immediate context when the table receives focus.

---

### 8. Loading State

- **Context**: While prediction data is being fetched (client-side polling refresh or initial client hydration). The table skeleton/spinner replaces the table body.

| Element | Copy |
|---------|------|
| **Loading text** | "Loading picks..." |
| **Aria label** | "Loading squad predictions" |
| **Notes** | Short, uses "picks" (the Bragg term). Matches the existing spinner pattern in `ExpandablePicks` which uses a `Loader2` icon with no text -- but since the reveal table is a larger section, a brief text label helps orient the user. |

#### Polling Refresh (Background Update)

- **Context**: During a live match, the table polls every ~30 seconds to update cell colors. This happens silently.
- **Copy**: None. No toast, no spinner, no "Updating..." text. The cells just change color/status. Silent background updates match the existing `LiveMatchScorecard` pattern.
- **On poll failure**: No user-facing message. Silent retry on next interval (per edge case #8 in requirements).

---

### 9. Edge Case Copy

#### Match Abandoned / No Result

| Element | Copy |
|---------|------|
| **Banner text** | "Match called off -- unresolved picks stay as-is." |
| **Notes** | Appears as a small inline note above or below the table. Explains why some cells remain in "In Play" state permanently. Uses "called off" instead of "abandoned" (more natural). |

#### Very Long Prediction Value (Overflow)

- **Tooltip**: Show the full value on hover. Example: `title="Ravindra Jadeja"` when the cell shows "Ravindra J..."
- **No additional copy needed** -- this is a pure UI truncation concern.

---

### 10. Copy Constants Summary

For implementation, the following strings should be defined as constants (suggested location: alongside `PREDICTION_STATUS` in `constants.ts` or within the component file):

```ts
// Prediction Reveal Table copy
export const REVEAL_TABLE_COPY = {
  SECTION_TITLE: "The Reveal",
  PRE_LOCK_MESSAGE: "Picks stay under wraps until lock-in. Sit tight.",
  PRE_LOCK_IMMINENT: "Almost time -- picks drop soon.",
  PRE_LOCK_GENERIC: "Everyone's picks will appear here once predictions lock.",
  EMPTY_NO_PREDICTIONS_TITLE: "No picks on the board",
  EMPTY_NO_PREDICTIONS_BODY: "Nobody made a call for this match. Next time, be the one to get things started.",
  EMPTY_SOLO_TITLE: "Just you here",
  EMPTY_SOLO_BODY: "Bragging's better with rivals. Share your invite link to fill the squad.",
  EMPTY_NO_SCENARIOS: "No scenarios for this match yet.",
  NO_PICK_CELL: "\u2014",
  LOADING: "Loading picks...",
  MATCH_ABANDONED: "Match called off -- unresolved picks stay as-is.",
  LEGEND_CORRECT: "Nailed It",
  LEGEND_INCORRECT: "Missed",
  LEGEND_PENDING: "In Play",
  LEGEND_NO_PICK: "No Pick",
} as const;

// Scenario column abbreviations (keyed by system_category)
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

---

### 11. Tone Rationale

| Decision | Reasoning |
|----------|-----------|
| "The Reveal" over "Prediction Breakdown" | Bragg's voice is about social drama and bragging rights, not analytics. "The Reveal" makes checking predictions feel like an event. |
| Reusing "Nailed It" / "Missed" / "In Play" | These labels already exist in `PredictionStatusPill` and `PREDICTION_STATUS`. Consistency > novelty. Users who see these labels in the expandable picks section will recognize them instantly in the table. |
| Cricket abbreviations for column headers | The target audience watches IPL and reads Cricinfo/Cricbuzz. "MoM", "PP", "Wkts" are second nature to them. Non-cricket fans in a cricket prediction app are an edge case not worth optimizing for here. |
| Minimal loading/error copy | The app's existing pattern is to keep loading states quiet (spinner only in `ExpandablePicks`, no text). Adding brief text for the reveal table is justified by its larger visual footprint, but it should stay understated. |
| Em dash for "no pick" | Consistent with `ExpandablePicks` (`prediction?.value \|\| "\u2014"`). Universally understood as "nothing here." |
