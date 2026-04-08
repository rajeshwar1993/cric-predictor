# LDB-002: Prediction Reveal Table

**Phase:** 10 — Leaderboards
**Dependencies:** LDB-001
**Estimated scope:** Matrix table showing all members' predictions per scenario with correct/incorrect status

---

## Description

Build the prediction reveal table on the match leaderboard page. Shows a matrix of all gang members' predictions for each scenario, with correct/incorrect status after resolution.

---

## Acceptance Criteria

### Prediction Reveal Table (`src/components/leaderboards/prediction-reveal.tsx`)
- [ ] **Gated:** only visible after predictions are locked (same gate as leaderboard)
- [ ] Before lock: countdown placeholder "Predictions revealed when locked"
- [ ] Matrix layout:
  - Rows = scenarios (grouped by phase)
  - Columns = members (ordered by leaderboard rank)
- [ ] Each cell shows: member's prediction value
  - Correct: lime background or green check
  - Incorrect: coral/red X
  - Unresolved: neutral (no indicator)
  - Not predicted: dash or empty
- [ ] Scenario title in first column with point value
- [ ] Correct answer shown in a "ANSWER" column (after resolution)
- [ ] Horizontally scrollable on mobile (member columns overflow)
- [ ] Current user's column highlighted with lime header
- [ ] Auto-polls during live matches (updates as scenarios resolve)

### Empty States
- [ ] Solo gang (1 member): "Invite friends to see how your predictions stack up"
- [ ] No predictions from anyone: "No one predicted for this match"

### DAL (`src/lib/dal/predictions.ts` — add)
- [ ] `getMatchPredictions(gangId: string, fixtureId: string)` → all predictions for all members + scenarios

---

## Files to Create

```
web-app/src/components/leaderboards/
├── prediction-reveal.tsx
├── prediction-reveal.stories.tsx
├── prediction-cell.tsx             # Individual cell with correct/incorrect styling
└── prediction-cell.stories.tsx
```

---

## Technical Notes

### Data Structure
```typescript
// Fetch all predictions for this gang+fixture
const { data } = await supabase
  .from('v2_predictions')
  .select(`
    user_id, scenario_id, value, is_correct, points_earned,
    v2_fixture_scenarios (id, title, slug, points, resolution_phase, correct_answer, is_resolved, is_voided, input_type)
  `)
  .eq('gang_id', gangId)
  .eq('fixture_id', fixtureId)

// Transform into matrix: scenarios × members
```

### Display Value Formatting
- `team_pick` → show team code (e.g., "MI") with team color
- `player_pick` → show player name (short name if available)
- `range` → show bracket (e.g., "160-179")
- `yes_no` → "YES" or "NO"

Need to resolve team UUIDs and player UUIDs back to display names. Join with `v2_league_teams` and `v2_players` respectively.

### Mobile Scrolling
Table is wider than viewport on mobile. Use:
```tsx
<div className="overflow-x-auto -mx-4 px-4">
  <table className="min-w-[600px]">
    {/* ... */}
  </table>
</div>
```

### Correct/Incorrect Cell Styling
```tsx
function PredictionCell({ value, isCorrect, isResolved }: CellProps) {
  if (!value) return <td className="text-text-muted">—</td>

  return (
    <td className={cn(
      'text-center text-sm font-body',
      isResolved && isCorrect && 'bg-success/10 text-success',
      isResolved && !isCorrect && 'bg-error/10 text-error',
      !isResolved && 'text-text-secondary',
    )}>
      {displayValue}
      {isResolved && (isCorrect ? ' ✓' : ' ✗')}
    </td>
  )
}
```

---

## Storybook Requirements

### PredictionReveal Stories
- `FullyResolved` — all scenarios resolved, mix of correct/incorrect
- `PartiallyResolved` — some scenarios still unresolved
- `LiveMatch` — scenarios resolving progressively
- `SingleMember` — solo gang empty state
- `NoPredictions` — no one predicted
- `FourMembers` — fits on mobile
- `EightMembers` — requires horizontal scroll

### PredictionCell Stories
- `Correct`, `Incorrect`, `Unresolved`, `NotPredicted`
- `TeamPick`, `PlayerPick`, `RangePick`, `YesNoPick`
