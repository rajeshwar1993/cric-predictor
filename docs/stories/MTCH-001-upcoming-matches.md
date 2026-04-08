# MTCH-001: Upcoming Matches + Match Card

**Phase:** 8 — Matches
**Dependencies:** GANG-001, DSN-002
**Estimated scope:** Upcoming matches section on gang page + reusable match card component

---

## Description

Build the upcoming matches section on the gang page showing the next 3 upcoming/live fixtures. Includes the reusable MatchCard component that displays teams, date/time, venue, prediction deadline, and prediction status.

---

## Acceptance Criteria

### Upcoming Matches Section (`src/components/matches/upcoming-matches.tsx`)
- [ ] Server Component: fetches next 3 fixtures with status `upcoming` or `live`
- [ ] Section title: "UPCOMING MATCHES" (caption style)
- [ ] Shows MatchCard for each fixture
- [ ] Empty state: "No upcoming matches" when none available
- [ ] Sorted chronologically by `start_datetime`

### Match Card (`src/components/matches/match-card.tsx`)
- [ ] Card component (bg `#1A1A1A`, border `#333333`, radius 16px)
- [ ] Match header: "Match {number} . IPL 2026" + status badge
- [ ] Teams display:
  - Home team: logo (if available) + team code (e.g., "MI") + team color accent
  - "vs" separator
  - Away team: same layout
- [ ] Date/time: formatted using `formatMatchTime()` (shows "Today", "Tomorrow", or full date)
- [ ] Venue name in caption style
- [ ] Prediction deadline: "Deadline: {time}" (formatted with timezone)
- [ ] Prediction status badge:
  - "PREDICT" (lime badge) — when prediction window is open and user hasn't predicted
  - "PREDICTED" (default badge with check) — when user has submitted predictions
  - "LOCKED" (default badge) — when deadline has passed
  - "LIVE" (lime badge, pulsing dot) — when match is live
- [ ] Who has predicted: "X/Y predicted" showing count of members who have predicted for next match
- [ ] CTA: "Predict" button links to `/group/[groupId]/predict/[fixtureId]`
- [ ] Entire card clickable → links to predict page (if open) or match leaderboard (if locked/live)

### DAL (`src/lib/dal/fixtures.ts` — create)
- [ ] `getUpcomingFixtures(gangId: string, limit?: number)` → fixtures with team info, prediction status
- [ ] `getFixtureWithTeams(fixtureId: string)` → single fixture with home/away team details
- [ ] Query includes: home_team, away_team (from `v2_league_teams`), prediction deadline from gang settings

### Prediction Window Logic
- [ ] Window opens: 12 hours before `start_datetime`
- [ ] Window closes: `start_datetime` minus `prediction_deadline_mins` (from gang settings, default 45)
- [ ] Show "Opens at {time}" if window hasn't opened yet
- [ ] Show "Closes at {time}" if window is open
- [ ] Show "LOCKED" if window has closed

---

## Files to Create

```
web-app/src/
├── components/
│   └── matches/
│       ├── upcoming-matches.tsx
│       ├── upcoming-matches.stories.tsx
│       ├── match-card.tsx
│       ├── match-card.stories.tsx
│       ├── match-time.tsx          # Client Component — relative time display
│       └── prediction-status-badge.tsx
├── lib/
│   └── dal/
│       └── fixtures.ts             # CREATE
```

---

## Technical Notes

### MatchTime Component (Client)
Date formatting must happen client-side (timezone-dependent). `MatchTime` is a small Client Component that receives an ISO string and renders formatted time:
```tsx
'use client'
export function MatchTime({ datetime }: { datetime: string }) {
  return <time dateTime={datetime}>{formatMatchTime(datetime)}</time>
}
```

### Prediction Status Calculation
```typescript
function getPredictionStatus(fixture: Fixture, deadline: Date, hasPredicted: boolean): string {
  const now = new Date()
  if (fixture.status === 'live') return 'live'
  if (now >= deadline) return 'locked'
  if (hasPredicted) return 'predicted'
  const windowOpens = new Date(fixture.start_datetime)
  windowOpens.setHours(windowOpens.getHours() - 12)
  if (now < windowOpens) return 'not_open'
  return 'predict'
}
```

### Who Has Predicted
Use the `get_members_who_predicted` RPC to get user IDs who have submitted predictions for the next match. Display as "X/Y predicted" on the match card.

---

## Design System Reference

- `Screenshot 2026-04-08 at 22.38.40.png` — Card styling
- `Screenshot 2026-04-08 at 22.38.56.png` — Match card with team logos, scores, status

---

## Storybook Requirements

### MatchCard Stories
- `Upcoming` — prediction window open, not yet predicted
- `Predicted` — user has submitted predictions
- `LockedPreDeadline` — window not yet open
- `Locked` — deadline passed
- `Live` — match in progress with pulsing LIVE badge
- `WithPredictionCount` — "5/8 predicted"
- `Today` — "Today . 7:30 PM IST"
- `Tomorrow` — "Tomorrow . 3:30 PM IST"

### UpcomingMatches Stories
- `Default` — 3 upcoming matches
- `Empty` — no upcoming matches
- `OneMatch` — single match
