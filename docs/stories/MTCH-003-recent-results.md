# MTCH-003: Recent Results Section

**Phase:** 8 — Matches
**Dependencies:** MTCH-001
**Estimated scope:** Recent results section on gang page showing last 3 completed matches

---

## Description

Build the recent results section on the gang page showing the last 3 matches with status `completed`, `resolved`, `abandoned`, or `no_result`. Shows the user's prediction summary per match.

---

## Acceptance Criteria

### Recent Results Section (`src/components/matches/recent-results.tsx`)
- [ ] Server Component
- [ ] Section title: "RECENT RESULTS" (caption style)
- [ ] Shows last 3 matches chronologically (newest first)
- [ ] Filters: `status IN ('completed', 'resolved', 'abandoned', 'no_result')`

### Result Card (`src/components/matches/result-card.tsx`)
- [ ] Teams with final scores (if available)
- [ ] Match winner indicated (bold/highlighted team name)
- [ ] User's prediction summary:
  - "X/Y correct" — predictions correct out of resolved scenarios
  - Points earned as stat block
  - "You predicted X scenarios" if user predicted
  - "You didn't predict" if user didn't predict
- [ ] Status indicators:
  - `resolved` → results complete, show full summary
  - `completed` → "Results pending" badge (yellow) — match done but scenarios not fully resolved
  - `abandoned` / `no_result` → "Match voided" badge (muted)
- [ ] Each card links to match leaderboard page: `/group/[groupId]/match/[fixtureId]`

### DAL (`src/lib/dal/fixtures.ts` — add)
- [ ] `getRecentResults(gangId: string, userId: string, limit?: number)` → completed fixtures with user's standings

---

## Files to Create

```
web-app/src/components/matches/
├── recent-results.tsx
├── recent-results.stories.tsx
├── result-card.tsx
└── result-card.stories.tsx
```

---

## Technical Notes

### Query Pattern
```typescript
export async function getRecentResults(gangId: string, userId: string, limit = 3) {
  const supabase = await createServerClient()

  // Get gang's season_id
  const { data: gls } = await supabase
    .from('v2_gang_league_seasons')
    .select('season_id')
    .eq('gang_id', gangId)
    .eq('is_active', true)
    .single()

  // Get recent fixtures
  const { data: fixtures } = await supabase
    .from('v2_league_season_fixtures')
    .select(`
      id, match_number, start_datetime, status, venue_name,
      home_team:v2_league_teams!home_team_id (id, name, code, color),
      away_team:v2_league_teams!away_team_id (id, name, code, color),
      v2_fixture_results (match_winner_id)
    `)
    .eq('season_id', gls!.season_id)
    .in('status', ['completed', 'resolved', 'abandoned', 'no_result'])
    .order('start_datetime', { ascending: false })
    .limit(limit)

  // Get user's standings for these fixtures
  const fixtureIds = fixtures?.map(f => f.id) ?? []
  const { data: standings } = await supabase
    .from('v2_gang_fixture_standings')
    .select('fixture_id, predicted_count, correct_count, resolved_count, points_earned')
    .eq('gang_id', gangId)
    .eq('user_id', userId)
    .in('fixture_id', fixtureIds)

  return { fixtures, standings }
}
```

---

## Storybook Requirements

### ResultCard Stories
- `Resolved` — full results with correct/incorrect counts
- `Completed` — "Results pending" badge
- `Abandoned` — "Match voided" badge
- `NoResult` — "Match voided" badge
- `NotPredicted` — user didn't predict this match
- `PerfectScore` — all predictions correct

### RecentResults Stories
- `Default` — 3 recent matches
- `Empty` — no completed matches yet
- `MixedStatuses` — resolved + completed + abandoned
