# ADM-003: Reference Data Browser

**Phase:** 16 — Admin Dashboard
**Dependencies:** ADM-001
**Estimated scope:** Browse sports, leagues, seasons, teams, players, scenario templates

---

## Description

Build the reference data browser at `/admin/reference` — a tabbed view to inspect all reference/seed data in the database: sports, leagues, seasons, teams (with logos and brand colors), players (searchable and filterable), and scenario templates. This is a read-only browser using shadcn/ui Tabs and Table components with data fetched server-side via the admin service role client.

---

## Acceptance Criteria

### Sports / Leagues / Seasons Tab
- [ ] Table listing all `v2_sports` rows (id, name, slug)
- [ ] Table listing all `v2_leagues` rows (id, name, sport, api_id)
- [ ] Table listing all `v2_seasons` rows: name, year, start_date, end_date, is_active, api_id
- [ ] Active season highlighted with lime badge
- [ ] Days remaining for active season shown inline

### Teams Tab
- [ ] Table of `v2_league_teams` in active league
- [ ] Columns: logo (image preview), name, code, brand color (color swatch), is_active, api_id
- [ ] Player count per team (from `v2_league_season_team_players`)
- [ ] Click team row → expands to show player roster inline

### Players Tab
- [ ] Searchable/filterable table of all players
- [ ] Columns: name, team (from `v2_league_season_team_players`), role, batting_style, bowling_style, is_active, api_id
- [ ] Filters: by team, by role (batter, bowler, allrounder, wicketkeeper)
- [ ] Search by player name (client-side filtering)
- [ ] Show unassigned players (in `v2_players` but not mapped to a team in active season)
- [ ] Total player count displayed at top of tab

### Scenario Templates Tab
- [ ] Table of all 20 `v2_scenario_templates`
- [ ] Columns: slug, title, input_type, options (JSON preview in a code badge), points, resolution_phase, is_active
- [ ] Inactive templates visually dimmed (reduced opacity)
- [ ] Total active points budget shown at top (should equal 210)

---

## Files to Create

```
web-app/src/
├── app/
│   └── (admin)/
│       └── admin/
│           └── reference/
│               └── page.tsx
├── components/
│   └── admin/
│       └── reference/
│           ├── reference-tabs.tsx
│           ├── reference-tabs.stories.tsx
│           ├── sports-leagues-table.tsx
│           ├── sports-leagues-table.stories.tsx
│           ├── teams-table.tsx
│           ├── teams-table.stories.tsx
│           ├── players-table.tsx
│           ├── players-table.stories.tsx
│           ├── scenario-templates-table.tsx
│           └── scenario-templates-table.stories.tsx
├── lib/
│   └── dal/
│       └── admin/
│           └── reference.ts             # All reference data DAL functions
```

---

## Technical Notes

### Reference Page
```tsx
// src/app/(admin)/admin/reference/page.tsx
import { ReferenceTabs } from '@/components/admin/reference/reference-tabs'
import {
  getSports,
  getLeagues,
  getSeasons,
  getTeamsWithPlayerCount,
  getPlayers,
  getScenarioTemplates,
} from '@/lib/dal/admin/reference'

export default async function ReferencePage() {
  const [sports, leagues, seasons, teams, players, templates] = await Promise.all([
    getSports(),
    getLeagues(),
    getSeasons(),
    getTeamsWithPlayerCount(),
    getPlayers(),
    getScenarioTemplates(),
  ])

  return (
    <div className="space-y-6">
      <h1 className="font-display font-bold text-2xl uppercase tracking-tight text-white">
        Reference Data
      </h1>
      <ReferenceTabs
        sports={sports}
        leagues={leagues}
        seasons={seasons}
        teams={teams}
        players={players}
        templates={templates}
      />
    </div>
  )
}
```

### Reference Tabs Component
```tsx
// src/components/admin/reference/reference-tabs.tsx
'use client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SportsLeaguesTable } from './sports-leagues-table'
import { TeamsTable } from './teams-table'
import { PlayersTable } from './players-table'
import { ScenarioTemplatesTable } from './scenario-templates-table'

// Tabs: "Sports & Leagues" | "Teams" | "Players" | "Scenario Templates"
// This is a client component because Tabs requires interactivity
// All data is passed as props (fetched server-side in page.tsx)
```

### Teams Table with Expandable Roster
```tsx
// src/components/admin/reference/teams-table.tsx
'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Team {
  id: string
  name: string
  code: string
  logo_url: string | null
  brand_color: string | null
  is_active: boolean
  api_football_id: number | null
  playerCount: number
  players: Player[]
}

// Color swatch: small 16x16 rounded circle using the team's brand_color
// Logo: 32x32 Next.js Image with Sportmonks CDN URL
// Click row → toggle expanded state showing player roster below
```

### Players Table with Search and Filters
```tsx
// src/components/admin/reference/players-table.tsx
'use client'
import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PlayersTableProps {
  players: Player[]
  teams: { id: string; name: string }[]
}

// Client-side filtering — data set is small enough (~200 players)
// Search: filter by player name (case-insensitive includes)
// Team filter: dropdown of all teams + "All Teams" + "Unassigned"
// Role filter: dropdown of "All Roles", "Batter", "Bowler", "Allrounder", "Wicketkeeper"
// Unassigned: players in v2_players but not in v2_league_season_team_players for active season
```

### Scenario Templates Table
```tsx
// src/components/admin/reference/scenario-templates-table.tsx
interface ScenarioTemplate {
  id: string
  slug: string
  title: string
  input_type: string
  options: Record<string, unknown> | null
  points: number
  resolution_phase: string
  is_active: boolean
}

// Options column: JSON.stringify(options) displayed in a monospace code badge
// Truncate to ~80 chars with tooltip for full JSON
// Inactive rows: opacity-50
// Total active points at top: sum of points where is_active = true
// Should equal 210 — show warning badge if not
```

### DAL Functions
```typescript
// src/lib/dal/admin/reference.ts
import { createAdminClient } from '@/lib/supabase/admin'

export async function getSports() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('v2_sports')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function getLeagues() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('v2_leagues')
    .select('*, v2_sports(name)')
    .order('name')
  if (error) throw error
  return data
}

export async function getSeasons() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('v2_seasons')
    .select('*')
    .order('start_date', { ascending: false })
  if (error) throw error
  return data
}

export async function getTeamsWithPlayerCount() {
  const supabase = createAdminClient()

  // Get active season
  const { data: season } = await supabase
    .from('v2_seasons')
    .select('id')
    .eq('is_active', true)
    .maybeSingle()

  if (!season) return []

  // Get teams with player counts
  const { data: teams, error } = await supabase
    .from('v2_league_teams')
    .select(`
      *,
      v2_league_season_team_players!inner(count)
    `)
    .order('name')

  if (error) throw error

  // Also fetch players per team for the expandable roster
  const { data: teamPlayers } = await supabase
    .from('v2_league_season_team_players')
    .select(`
      team_id,
      v2_players(id, name, role, batting_style, bowling_style, is_active)
    `)
    .eq('season_id', season.id)

  // Merge player data into teams
  return (teams ?? []).map((team) => ({
    ...team,
    playerCount: team.v2_league_season_team_players?.[0]?.count ?? 0,
    players: (teamPlayers ?? [])
      .filter((tp) => tp.team_id === team.id)
      .map((tp) => tp.v2_players)
      .filter(Boolean),
  }))
}

export async function getPlayers() {
  const supabase = createAdminClient()

  // Get active season
  const { data: season } = await supabase
    .from('v2_seasons')
    .select('id')
    .eq('is_active', true)
    .maybeSingle()

  // All players with their team assignment (if any) in active season
  const { data: players, error } = await supabase
    .from('v2_players')
    .select(`
      *,
      v2_league_season_team_players(
        team_id,
        v2_league_teams(id, name, code)
      )
    `)
    .order('name')

  if (error) throw error

  return (players ?? []).map((player) => {
    const assignment = player.v2_league_season_team_players?.find(
      (a: { team_id: string }) => a.team_id
    )
    return {
      ...player,
      team: assignment?.v2_league_teams ?? null,
      isUnassigned: !assignment,
    }
  })
}

export async function getScenarioTemplates() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('v2_scenario_templates')
    .select('*')
    .order('slug')
  if (error) throw error
  return data
}
```

### Table Styling
All tables use consistent admin dark styling:
- Table header: `#1A1A1A` background, `#A3A3A3` text, uppercase, caption size
- Table rows: `#111111` background, `#333333` border-bottom, white text
- Hover: `#1A1A1A` background
- Active season / active badge: lime (`#C8E64A`) text on `#C8E64A20` background
- Inactive / dimmed: `opacity-50`
- Color swatches: `w-4 h-4 rounded-full` with inline `backgroundColor`
- Team logos: `next/image` with `width={32} height={32}` and Sportmonks CDN domains in `next.config.ts`

### Key Design Decisions
- Data is fetched server-side and passed to client components as props (tabs need interactivity)
- Player search is client-side since the dataset is small (~200 IPL players)
- Team click-to-expand avoids navigating to a separate page
- Scenario template options are displayed as truncated JSON — full content visible on hover/tooltip
- The points budget check (should equal 210) acts as a quick data integrity indicator

---

## Edge Cases

- No active season → Teams tab shows "No active season" message, Players tab shows all players without team assignments
- Team with zero players → show "0 players" badge, expandable section shows "No players assigned"
- Player with no team assignment → shown in "Unassigned" filter; team column shows "—"
- Scenario template with `null` options → options column shows "—"
- Points budget not equal to 210 → show red warning badge: "Points budget: {actual}/210"
- Team logo URL is null → show placeholder icon (users icon)
- Long player names or team names → truncate with ellipsis, full name in tooltip

---

## Storybook Requirements

### SportsLeaguesTable Stories
- `Default` — 1 sport, 1 league, 2 seasons (one active, one past)

### TeamsTable Stories
- `Default` — 10 IPL teams with logos, colors, and player counts
- `WithPlayerCounts` — varying player counts (0 to 25)
- `ExpandedTeam` — one team expanded showing player roster

### PlayersTable Stories
- `Default` — full player list with all columns
- `FilteredByTeam` — filtered to a single team
- `FilteredByRole` — filtered to bowlers
- `SearchResults` — search term "Virat" showing filtered results
- `UnassignedPlayers` — filter showing only unassigned players
- `EmptySearch` — no results matching search term

### ScenarioTemplatesTable Stories
- `Default` — all 20 templates, 210 points budget
- `WithInactive` — some templates inactive (dimmed rows)
- `PointsBudgetMismatch` — points budget not 210 (red warning)

---

## Testing Requirements

- [ ] Unit test: `getSports()` returns all sports sorted by name
- [ ] Unit test: `getLeagues()` includes sport name via join
- [ ] Unit test: `getSeasons()` returns seasons sorted by start_date descending
- [ ] Unit test: `getTeamsWithPlayerCount()` returns empty array when no active season
- [ ] Unit test: `getTeamsWithPlayerCount()` includes correct player count per team
- [ ] Unit test: `getPlayers()` marks unassigned players correctly
- [ ] Unit test: `getScenarioTemplates()` returns all templates sorted by slug
- [ ] Unit test: PlayersTable client-side search filters by name correctly (case-insensitive)
- [ ] Unit test: PlayersTable team filter shows only players from selected team
- [ ] Unit test: PlayersTable role filter shows only players with selected role
- [ ] Unit test: ScenarioTemplatesTable calculates total active points correctly
- [ ] Unit test: ScenarioTemplatesTable shows warning when points budget is not 210
