# MTCH-002: Live Matches + Scorecard

**Phase:** 8 — Matches
**Dependencies:** MTCH-001, FND-006
**Estimated scope:** Live match section with auto-polling scorecard

---

## Description

Build the live matches section on the gang page and the detailed live scorecard component. Uses client-side polling (15s interval) to fetch updated scores from `v2_fixture_live_scores`.

---

## Acceptance Criteria

### Live Matches Section (`src/components/matches/live-matches-section.tsx`) — Client Component
- [ ] Only renders when there are live fixtures for the gang
- [ ] Section title: "LIVE" with pulsing green dot
- [ ] Shows LiveScorecard for each live fixture
- [ ] Auto-polls every 15 seconds for score updates
- [ ] Loading skeleton while initial data loads
- [ ] Graceful handling when match goes from live → completed (stops polling, shows final score)

### Live Scorecard (`src/components/matches/live-scorecard.tsx`) — Client Component
- [ ] Match header: "Match {number} . IPL 2026" + LIVE badge
- [ ] Team scores display (prominent, Space Grotesk 700):
  - Home team: code + score (e.g., "MI 186/4") + overs
  - Away team: code + score + overs
  - Batting team indicated (highlight or bold)
- [ ] Current run rate: "CRR: 9.30"
- [ ] Last 6 balls: colored pills (4=blue, 6=lime, W=coral, dot=gray, runs=white)
- [ ] Both batsmen: name + score (e.g., "Rohit 45(32)"), on-strike indicator (dot/bullet)
- [ ] Current bowler: name
- [ ] Current partnership: "78(52)"
- [ ] "Stale data" warning: shown if `last_polled_at` is more than 1 minute old — yellow warning badge "Last updated 2m ago"
- [ ] Predictions locked indicator
- [ ] CTA: "View Leaderboard" → links to match leaderboard page

### Live Scores Hook (`src/hooks/use-live-scores.ts`)
- [ ] `useLiveScores(fixtureId: string)` → `{ data, isLoading, error, isStale }`
- [ ] Polls `v2_fixture_live_scores` every 15 seconds using browser Supabase client
- [ ] `isStale`: true when `last_polled_at` > 1 minute ago
- [ ] Cleanup: clears interval on unmount
- [ ] Does NOT poll when tab is not visible (use `document.visibilityState`)

---

## Files to Create

```
web-app/src/
├── components/
│   └── matches/
│       ├── live-matches-section.tsx
│       ├── live-matches-section.stories.tsx
│       ├── live-scorecard.tsx
│       ├── live-scorecard.stories.tsx
│       ├── score-display.tsx       # Team score with animated counter
│       ├── last-6-balls.tsx        # Colored ball pills
│       ├── batsmen-info.tsx        # Current batsmen display
│       └── stale-data-badge.tsx    # "Last updated X ago" warning
├── hooks/
│   └── use-live-scores.ts
```

---

## Technical Notes

### Polling with Visibility API
```typescript
'use client'
export function useLiveScores(fixtureId: string) {
  const [data, setData] = useState<FixtureLiveScore | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    let active = true
    let interval: NodeJS.Timeout

    async function poll() {
      if (document.visibilityState !== 'visible') return
      const { data } = await supabase
        .from('v2_fixture_live_scores')
        .select('*')
        .eq('fixture_id', fixtureId)
        .single()
      if (active && data) {
        setData(data)
        setIsLoading(false)
      }
    }

    poll()
    interval = setInterval(poll, 15_000)

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') poll()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      active = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [fixtureId])

  const isStale = data?.last_polled_at
    ? Date.now() - new Date(data.last_polled_at).getTime() > 60_000
    : false

  return { data, isLoading, isStale }
}
```

### Last 6 Balls Display
Parse `last_6_balls` string (e.g., "1 4 W 0 6 2") into colored pills:
```
"W" → coral bg, white text
"4" → vivid-blue bg, white text
"6" → bragg-lime bg, black text
"0" → wire bg (dim), muted text
others → dark-concrete bg, white text
```

### Score Animation
When score updates, the number should pop (scale overshoot animation):
```css
.score-pop {
  animation: score-pop 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```
Use a key prop that changes on score update to trigger re-mount animation.

---

## Design System Reference

- `Screenshot 2026-04-08 at 22.38.56.png` — Match card with team logos and live scores
- `Screenshot 2026-04-08 at 22.39.15.png` — Motion & animation (score pop)

---

## Storybook Requirements

### LiveScorecard Stories
- `FirstInnings` — home team batting, away yet to bat
- `SecondInnings` — chase scenario with required runs
- `MatchEnding` — close finish, both teams scored
- `StaleData` — last_polled_at > 1 minute, warning shown
- `Loading` — skeleton state
- `NoData` — empty (match not started)

### Last6Balls Stories
- `Mixed` — "1 4 W 0 6 2"
- `AllDots` — "0 0 0 0 0 0"
- `BigOver` — "4 6 6 4 1 6"

### LiveMatchesSection Stories
- `OneLiveMatch` — single match live
- `TwoLiveMatches` — two concurrent (rare but possible)
- `NoLiveMatches` — renders nothing
