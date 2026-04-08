# GANG-003: Member List / Mini Leaderboard

**Phase:** 7 — Gang Page
**Dependencies:** GANG-001, DSN-003
**Estimated scope:** Member list sorted by season points, using LeaderboardRow component

---

## Description

Build the member list section on the gang page. Displays all approved members ranked by their season standings points. Uses the LeaderboardRow component from DSN-003. Left/removed members are grayed out at the bottom.

---

## Acceptance Criteria

### Member List Section (`src/components/gangs/member-list.tsx`)
- [ ] Section title: "MEMBERS" (caption style)
- [ ] Lists all members using LeaderboardRow component
- [ ] Sorted by season standings: points DESC (same ordering as season standings)
- [ ] Current user's row highlighted (lime left border + lime wash bg)
- [ ] Left/removed members shown at bottom, grayed out
- [ ] Rank displayed for active members
- [ ] Points displayed per member (from `v2_gang_season_standings`)
- [ ] Role badge: "ADMIN" badge next to admin's name

### DAL (`src/lib/dal/leaderboards.ts` — create)
- [ ] `getGangSeasonStandings(gangId: string, seasonId: string)` → standings with profile and member info

---

## Files to Create

```
web-app/src/components/gangs/
├── member-list.tsx
├── member-list.stories.tsx

web-app/src/lib/dal/
├── leaderboards.ts                 # CREATE
```

---

## Technical Notes

### Data Query
```typescript
export async function getGangSeasonStandings(gangId: string, seasonId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('v2_gang_season_standings')
    .select(`
      user_id, total_points, matches_predicted, accuracy_pct, rank,
      v2_profiles (display_name)
    `)
    .eq('gang_id', gangId)
    .eq('season_id', seasonId)
    .order('rank', { ascending: true, nullsFirst: false })

  if (error) throw error
  return data
}
```

### Handling Members With No Standings
Members who haven't predicted any matches won't have a row in `v2_gang_season_standings`. Merge the member list from `v2_gang_members` (approved) with standings data, placing members with no standings at the bottom (after ranked members, before departed members).

### Departed Members
Members with status `left` or `removed` should:
- Be sorted to the very bottom
- Have reduced opacity / grayed out styling
- Still show their points (data is preserved)

---

## Storybook Requirements

- `Default` — 6 members with varied ranks and points
- `CurrentUserHighlighted` — user at rank #3
- `WithDepartedMembers` — 2 grayed out members at bottom
- `SingleMember` — just the admin (new gang)
- `NoStandings` — all members show 0 points
