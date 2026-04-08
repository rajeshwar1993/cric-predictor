# PRED-001: Predict Page + Scenario Cards

**Phase:** 9 — Predictions
**Dependencies:** MTCH-001, DSN-002
**Estimated scope:** Predict page shell with scenario cards grouped by phase

---

## Description

Build the predict page (`/group/[groupId]/predict/[fixtureId]`) where users make their predictions. Shows scenarios grouped by match phase with individual scenario cards.

---

## Acceptance Criteria

### Predict Page (`src/app/(app)/group/[groupId]/predict/[fixtureId]/page.tsx`)
- [ ] Server Component: fetches fixture, scenarios, existing predictions
- [ ] Verifies: user is approved member, fixture exists, fixture belongs to gang's season
- [ ] Match header: match number, team badges with colors, date, time, venue
- [ ] Prediction deadline or locked status indicator
- [ ] Last updated timestamp (if user has previously submitted)
- [ ] Before window opens: message "Predictions open at {time}" with link back to gang page
- [ ] After deadline: "Predictions locked" message with link to match leaderboard
- [ ] Scenarios grouped by resolution phase with phase headers
- [ ] {Home Team} and {Away Team} in titles already replaced by team codes (done by seed function)

### Scenario Card (`src/components/predictions/scenario-card.tsx`)
- [ ] Card-like display within the form
- [ ] Scenario title: H4 style
- [ ] Point value: stat-block style badge (e.g., "10 PTS" in lime)
- [ ] Input picker area (component from PRED-002)
- [ ] "Picked" indicator when answer selected (small lime check icon)
- [ ] If previously submitted: shows saved value as default selection

### Phase Grouping
Group scenarios by `resolution_phase` with headers:
- `toss` → "TOSS"
- `first_wicket` → "FIRST WICKET"
- `team_powerplay_end` → "POWERPLAY"
- `mid_match` → "DURING MATCH"
- `team_innings_end` → "INNINGS END"
- `end` → "MATCH END"
- `post_match` → "POST MATCH"

### DAL (`src/lib/dal/predictions.ts` — create)
- [ ] `getFixtureScenarios(gangId: string, fixtureId: string)` → scenarios for this gang+fixture
- [ ] `getUserPredictions(gangId: string, fixtureId: string, userId: string)` → existing predictions
- [ ] `getMatchPlayers(seasonId: string, homeTeamId: string, awayTeamId: string)` → players for both teams (for player_pick scenarios)

---

## Files to Create

```
web-app/src/
├── app/
│   └── (app)/
│       └── group/
│           └── [groupId]/
│               └── predict/
│                   └── [fixtureId]/
│                       └── page.tsx
├── components/
│   └── predictions/
│       ├── predict-page-header.tsx
│       ├── predict-page-header.stories.tsx
│       ├── scenario-card.tsx
│       ├── scenario-card.stories.tsx
│       ├── scenario-group.tsx      # Phase group wrapper
│       └── scenario-group.stories.tsx
├── lib/
│   └── dal/
│       └── predictions.ts          # CREATE
```

---

## Technical Notes

### Page Logic
```tsx
export default async function PredictPage({ params }: { params: { groupId: string; fixtureId: string } }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify membership
  // Fetch fixture with teams
  // Fetch scenarios for this gang+fixture
  // Fetch user's existing predictions
  // Fetch players for player_pick scenarios
  // Calculate prediction window status

  return (
    <PageWrapper>
      <PredictPageHeader fixture={fixture} />
      {windowStatus === 'not_open' && <WindowNotOpenMessage opensAt={opensAt} gangId={params.groupId} />}
      {windowStatus === 'locked' && <PredictionsLockedMessage fixtureId={params.fixtureId} gangId={params.groupId} />}
      {windowStatus === 'open' && (
        <PredictionForm
          scenarios={scenarios}
          existingPredictions={predictions}
          players={players}
          fixture={fixture}
          gangId={params.groupId}
        />
      )}
    </PageWrapper>
  )
}
```

### Scenario Grouping
```typescript
const phaseOrder = ['toss', 'first_wicket', 'team_powerplay_end', 'mid_match', 'team_innings_end', 'end', 'post_match']
const phaseLabels: Record<string, string> = {
  toss: 'TOSS',
  first_wicket: 'FIRST WICKET',
  team_powerplay_end: 'POWERPLAY',
  mid_match: 'DURING MATCH',
  team_innings_end: 'INNINGS END',
  end: 'MATCH END',
  post_match: 'POST MATCH',
}
```

---

## Storybook Requirements

### ScenarioCard Stories
- `TeamPick` — team selection scenario
- `PlayerPick` — player selection scenario
- `Range` — range bracket selection
- `YesNo` — yes/no toggle
- `Picked` — with selected answer
- `NotPicked` — no answer yet
- `WithPoints` — showing point value badge

### ScenarioGroup Stories
- `TossGroup` — 1 scenario
- `MatchEndGroup` — 5 scenarios
- `AllGroups` — full predict page preview
