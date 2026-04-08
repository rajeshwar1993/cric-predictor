# LDB-003: Season Standings Page

**Phase:** 10 — Leaderboards
**Dependencies:** GANG-003
**Estimated scope:** Season standings page with full ranked table

---

## Description

Build the season standings page (`/group/[groupId]/standings`) showing cumulative season leaderboard across all matches.

---

## Acceptance Criteria

### Season Standings Page
- [ ] Route: `/group/[groupId]/standings`
- [ ] Page title: "SEASON STANDINGS — IPL 2026"
- [ ] Defaults to current active season (future: season selector dropdown)
- [ ] Full standings table with LeaderboardRow layout

### Standings Table Columns
- [ ] Rank (with #1/#2/#3 special styling)
- [ ] Avatar + Display name
- [ ] Total points (prominent, Space Grotesk 700)
- [ ] Matches predicted (count)
- [ ] Points per match (average, 1 decimal)
- [ ] Accuracy percentage (X.X%)
- [ ] Current user highlighted
- [ ] Left/removed members grayed out at bottom

### Ranking
- [ ] Ordered by: total_points DESC → accuracy_pct DESC → matches_predicted DESC
- [ ] Uses SQL `RANK()` — ties share rank, next skips
- [ ] Left/removed members sorted to very bottom regardless of points

### Empty State
- [ ] "No predictions yet this season. Start predicting to climb the leaderboard!"

### DAL (`src/lib/dal/leaderboards.ts` — add)
- [ ] `getSeasonStandings(gangId: string, seasonId: string)` → full season standings with member info

---

## Files to Create

```
web-app/src/
├── app/
│   └── (app)/
│       └── group/
│           └── [groupId]/
│               └── standings/
│                   └── page.tsx
├── components/
│   └── leaderboards/
│       ├── season-standings-table.tsx
│       └── season-standings-table.stories.tsx
```

---

## Technical Notes

### Standings Query
```typescript
export async function getSeasonStandings(gangId: string, seasonId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('v2_gang_season_standings')
    .select(`
      user_id, total_points, matches_predicted, accuracy_pct, points_per_match, rank,
      v2_profiles (display_name)
    `)
    .eq('gang_id', gangId)
    .eq('season_id', seasonId)
    .order('rank', { ascending: true, nullsFirst: false })

  if (error) throw error
  return data
}
```

### Table Design
On mobile, use a compact layout:
- Rank + Avatar + Name (left)
- Points (right, prominent)
- Expandable row for detailed stats (matches, accuracy, PPM)

On tablet+, show full table with all columns.

---

## Storybook Requirements

- `Default` — 8 members with varied stats
- `TopRanked` — current user is #1
- `WithTies` — rank 2 shared by two members
- `DepartedMembers` — grayed out at bottom
- `Empty` — no predictions yet
- `SingleMember` — just the admin
