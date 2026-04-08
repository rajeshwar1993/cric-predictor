# LDB-001: Match Leaderboard Page

**Phase:** 10 — Leaderboards
**Dependencies:** GANG-003, MTCH-002
**Estimated scope:** Match leaderboard page with ranked standings table

---

## Description

Build the match leaderboard page (`/group/[groupId]/match/[fixtureId]`) showing the gang's ranked standings for a specific match, live scorecard (during live matches), and the prediction reveal table (in LDB-002).

---

## Acceptance Criteria

### Match Leaderboard Page
- [ ] Route: `/group/[groupId]/match/[fixtureId]`
- [ ] Match header: match number, teams with badges, date, venue
- [ ] Live scorecard section (reuses LiveScorecard from MTCH-002, only shown for live matches)
- [ ] **Gated leaderboard:** only visible after predictions are locked (deadline passed OR match live)
  - Before lock: countdown placeholder "Leaderboard visible when predictions lock"
- [ ] Match leaderboard table
- [ ] Prediction reveal table (implemented in LDB-002)

### Match Leaderboard Table (`src/components/leaderboards/match-leaderboard.tsx`)
- [ ] Uses LeaderboardRow from DSN-003
- [ ] Columns: rank, avatar + name, correct/resolved, predicted count, points
- [ ] Ranked by: points DESC, then earliest `last_submitted_at` ASC (tiebreaker)
- [ ] Current user highlighted
- [ ] Left/removed members grayed out at bottom
- [ ] Empty state: "No one has predicted for this match yet"
- [ ] Auto-polls during live matches (leaderboard updates as scenarios resolve)

### DAL (`src/lib/dal/leaderboards.ts` — add)
- [ ] `getMatchLeaderboard(gangId: string, fixtureId: string)` → fixture standings with profiles

---

## Files to Create

```
web-app/src/
├── app/
│   └── (app)/
│       └── group/
│           └── [groupId]/
│               └── match/
│                   └── [fixtureId]/
│                       └── page.tsx
├── components/
│   └── leaderboards/
│       ├── match-leaderboard.tsx
│       ├── match-leaderboard.stories.tsx
│       ├── leaderboard-countdown.tsx   # "Visible when predictions lock" placeholder
│       └── leaderboard-countdown.stories.tsx
```

---

## Technical Notes

### Match Leaderboard Query
```typescript
export async function getMatchLeaderboard(gangId: string, fixtureId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('v2_gang_fixture_standings')
    .select(`
      user_id, predicted_count, resolved_count, correct_count, points_earned, rank, last_submitted_at,
      v2_profiles (display_name)
    `)
    .eq('gang_id', gangId)
    .eq('fixture_id', fixtureId)
    .order('rank', { ascending: true, nullsFirst: false })

  if (error) throw error
  return data
}
```

### Gating Logic
```typescript
const isLocked = fixture.status !== 'upcoming' || now >= deadline
```
If not locked, show countdown with `formatTimeAgo` or a real countdown timer.

### Live Polling of Leaderboard
During live matches, the leaderboard changes as scenarios resolve. Use a client component wrapper that polls the standings every 30 seconds (less frequent than live scores since scenario resolution happens less often).

---

## Storybook Requirements

### MatchLeaderboard Stories
- `Default` — 8 members ranked
- `WithTies` — two members sharing rank 2
- `CurrentUserFirst` — user is #1
- `CurrentUserMiddle` — user is #4
- `DepartedMembers` — grayed out members at bottom
- `Empty` — no predictions
- `Loading` — skeleton state

### LeaderboardCountdown Stories
- `Default` — countdown to lock time
- `Locked` — transitions to showing leaderboard
