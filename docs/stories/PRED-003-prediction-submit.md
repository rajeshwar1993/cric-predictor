# PRED-003: Prediction Form + Submit Action

**Phase:** 9 — Predictions
**Dependencies:** PRED-002, FND-006
**Estimated scope:** Form state management, sticky submit bar, batch upsert server action

---

## Description

Build the prediction form that manages local state for all scenario picks and the sticky submit bar at the bottom. Includes the server action for batch upserting predictions.

---

## Acceptance Criteria

### Prediction Form (`src/components/predictions/prediction-form.tsx`) — Client Component
- [ ] Manages local state for all picks: `Map<scenarioId, value>`
- [ ] Pre-populates from existing predictions (if user has submitted before)
- [ ] Each scenario card's picker updates the local state
- [ ] Tracks which picks are new vs unchanged (for "pick changed" analytics)
- [ ] Submission is additive: partial submissions allowed
- [ ] Shows "last submitted at {time}" if user has previously submitted

### Sticky Submit Bar (`src/components/predictions/submit-bar.tsx`) — Client Component
- [ ] Fixed at bottom of viewport (above safe area)
- [ ] Background: `#1A1A1A` with top border `#333333`
- [ ] Progress counter: "X/19 picked" (number of scenarios with a selection)
- [ ] Submit button: "Lock Predictions" (primary variant)
- [ ] Submit button disabled until at least 1 scenario is answered
- [ ] Loading state during submission
- [ ] Success: toast "Predictions saved!" with green check
- [ ] Error: toast with error message
- [ ] Smooth slide-up animation on mount

### Server Action (`src/lib/actions/predictions.ts` — create)
- [ ] `submitPredictions(gangId, fixtureId, picks: Array<{ scenarioId: string; value: string }>)` → `ActionResult`
- [ ] Auth check
- [ ] Rate limit: 60 per hour
- [ ] Validate:
  - User is approved member of the gang
  - Fixture status is `upcoming`
  - Prediction window is open (not too early, not past deadline)
  - All scenario IDs belong to this gang+fixture
  - At least 1 pick provided
  - Values are valid for each scenario's input type
- [ ] Batch upsert to `v2_predictions` (ON CONFLICT `(user_id, scenario_id)` → update value, submitted_at)
- [ ] Revalidate `/group/{gangId}` and `/group/{gangId}/predict/{fixtureId}`
- [ ] Fire `PREDICTION_SUBMITTED` analytics event with pick count
- [ ] Return `{ success: true }`

---

## Files to Create

```
web-app/src/
├── components/
│   └── predictions/
│       ├── prediction-form.tsx
│       ├── prediction-form.stories.tsx
│       ├── submit-bar.tsx
│       └── submit-bar.stories.tsx
├── lib/
│   └── actions/
│       └── predictions.ts          # CREATE
```

---

## Technical Notes

### Data Flow
The parent Server Component (predict page from PRED-001) fetches all data via DAL and passes it as props:
- `scenarios` → from `getFixtureScenarios()` (PRED-001 DAL)
- `existingPredictions` → from `getUserPredictions()` (PRED-001 DAL)
- `players` → from `getMatchPlayers()` (PRED-001 DAL)
- `fixture` → from `getFixtureWithTeams()` (MTCH-001 DAL)

### Form State Management
```tsx
'use client'
export function PredictionForm({ scenarios, existingPredictions, players, fixture, gangId }) {
  // Initialize picks from existing predictions
  const [picks, setPicks] = useState<Map<string, string>>(() => {
    const map = new Map<string, string>()
    existingPredictions.forEach(p => map.set(p.scenario_id, p.value))
    return map
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handlePickChange(scenarioId: string, value: string) {
    setPicks(prev => new Map(prev).set(scenarioId, value))
  }

  async function handleSubmit() {
    const picksArray = Array.from(picks.entries())
      .filter(([_, value]) => value) // Only submit non-empty
      .map(([scenarioId, value]) => ({ scenarioId, value }))

    if (picksArray.length === 0) return

    setIsSubmitting(true)
    const result = await submitPredictions(gangId, fixture.id, picksArray)
    if (result.success) {
      toast.success('Predictions saved!')
    } else {
      toast.error(result.error)
    }
    setIsSubmitting(false)
  }

  const pickedCount = Array.from(picks.values()).filter(Boolean).length

  return (
    <>
      {/* Render scenario groups */}
      {groupedScenarios.map(group => (
        <ScenarioGroup key={group.phase} phase={group.phase} scenarios={group.scenarios}>
          {group.scenarios.map(scenario => (
            <ScenarioCard key={scenario.id} scenario={scenario}>
              <ScenarioInput
                inputType={scenario.input_type}
                options={scenario.options}
                homeTeam={fixture.home_team}
                awayTeam={fixture.away_team}
                players={players}
                value={picks.get(scenario.id) ?? ''}
                onChange={(value) => handlePickChange(scenario.id, value)}
              />
            </ScenarioCard>
          ))}
        </ScenarioGroup>
      ))}

      <SubmitBar
        pickedCount={pickedCount}
        totalCount={scenarios.length}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        disabled={pickedCount === 0}
      />
    </>
  )
}
```

### Server Action Validation
```typescript
// Validate picks against scenarios
for (const pick of picks) {
  const scenario = scenarios.find(s => s.id === pick.scenarioId)
  if (!scenario) return { success: false, error: 'Invalid scenario' }

  // Validate value based on input type
  if (scenario.input_type === 'team_pick') {
    if (pick.value !== fixture.home_team_id && pick.value !== fixture.away_team_id) {
      return { success: false, error: `Invalid team selection for "${scenario.title}"` }
    }
  }
  // ... similar for other types
}
```

### Upsert Pattern
```typescript
const rows = picks.map(pick => ({
  id: crypto.randomUUID(), // will be ignored on conflict
  user_id: user.id,
  scenario_id: pick.scenarioId,
  gang_id: gangId,
  league_id: gang.league_id,
  season_id: gang.season_id,
  fixture_id: fixtureId,
  value: pick.value,
  submitted_at: new Date().toISOString(),
}))

const { error } = await supabase
  .from('v2_predictions')
  .upsert(rows, { onConflict: 'user_id,scenario_id' })
```

---

## Storybook Requirements

### PredictionForm Stories
- `Empty` — no picks yet
- `PartiallyFilled` — 10/19 picked
- `FullyFilled` — 19/19 picked
- `WithExistingPredictions` — pre-populated from previous submit
- `Submitting` — loading state

### SubmitBar Stories
- `Disabled` — 0/19 picked
- `Partial` — 10/19 picked
- `Full` — 19/19 picked
- `Submitting` — loading spinner
