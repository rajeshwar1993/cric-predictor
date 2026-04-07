# Sportmonks — IPL 2026 Seed IDs

> **Purpose:** Reference for FND-DB-005 (seed migration). All values verified against live Sportmonks Cricket API v2.0 responses in `api-tester/responses/sportsmonk/general-calls/`.
>
> **Base URL:** `https://cricket.sportmonks.com/api/v2.0/`
> **Auth:** `?api_token=YOUR_TOKEN` on every request
> **Full API spec:** `api-tester/responses/sportsmonk/general-calls/SPORTMONKS_API_SPEC.md`

---

## Sport

Sportmonks Cricket API is cricket-only — there is no `/sports` endpoint. Our `v2_sports` table creates an internal row.

| Field | Value |
|-------|-------|
| `code` | `cricket` |
| `name` | `Cricket` |
| `api_id` | `NULL` (no Sportmonks sport ID — the API is cricket-specific) |

---

## League

**Source:** `GET /leagues/1?include=seasons`

| Field | Value |
|-------|-------|
| `api_id` | `1` |
| `name` | `Indian Premier League` |
| `code` | `ipl` |
| `image_path` | `https://cdn.sportmonks.com/images/cricket/leagues/1/1.png` |
| `sport_id` | → `v2_sports` row for Cricket |

---

## Season

**Source:** `GET /leagues/1?include=seasons` → find entry with `name: "2026"`

| Field | Value |
|-------|-------|
| `api_id` | `1795` |
| `name` | `IPL 2026` |
| `code` | `2026` |
| `year` | `2026` |
| `is_active` | `true` |
| `league_id` | → `v2_leagues` row for IPL |

**Stages (for reference, not seeded):**

| Stage ID | Name | Code |
|----------|------|------|
| 6468 | Regular Season | RS |
| 6469 | Play Offs | PO |

**Other IPL seasons (for reference):**

| Season | API ID |
|--------|--------|
| IPL 2025 | `1689` |
| IPL 2024 | `1484` |
| IPL 2023 | `1223` |
| IPL 2022 | `932` |

---

## Teams (10 IPL franchises for 2026)

**Source:** `GET /teams` (filtered for IPL franchises) + team colors from `web-app/src/lib/constants.ts`

| # | API ID | Code | Full Name | Short Name | Color | Text on Color | Logo URL |
|---|--------|------|-----------|------------|-------|---------------|----------|
| 1 | `2` | CSK | Chennai Super Kings | Chennai | `#F9CD05` | dark | `https://cdn.sportmonks.com/images/cricket/teams/2/2.png` |
| 2 | `3` | DC | Delhi Capitals | Delhi | `#004C93` | light | `https://cdn.sportmonks.com/images/cricket/teams/3/3.png` |
| 3 | `4` | PBKS | Punjab Kings | Punjab | `#ED1B24` | dark | `https://cdn.sportmonks.com/images/cricket/teams/4/4.png` |
| 4 | `5` | KKR | Kolkata Knight Riders | Kolkata | `#3B215D` | light | `https://cdn.sportmonks.com/images/cricket/teams/5/5.png` |
| 5 | `6` | MI | Mumbai Indians | Mumbai | `#004BA0` | light | `https://cdn.sportmonks.com/images/cricket/teams/6/6.png` |
| 6 | `7` | RR | Rajasthan Royals | Rajasthan | `#EA1A85` | dark | `https://cdn.sportmonks.com/images/cricket/teams/7/7.png` |
| 7 | `8` | RCB | Royal Challengers Bengaluru | Bengaluru | `#EC1C24` | dark | `https://cdn.sportmonks.com/images/cricket/teams/8/8.png` |
| 8 | `9` | SRH | Sunrisers Hyderabad | Hyderabad | `#F26522` | dark | `https://cdn.sportmonks.com/images/cricket/teams/9/9.png` |
| 9 | `1976` | GT | Gujarat Titans | Gujarat | `#1C1C2B` | light | `https://cdn.sportmonks.com/images/cricket/teams/24/1976.png` |
| 10 | `1979` | LSG | Lucknow Super Giants | Lucknow | `#A72056` | light | `https://cdn.sportmonks.com/images/cricket/teams/27/1979.png` |

---

## API Calls to Verify (at implementation time)

Before writing the seed migration, run these 3 calls to confirm the data is still current:

```bash
# 1. Confirm IPL league + current season ID
curl "https://cricket.sportmonks.com/api/v2.0/leagues/1?include=seasons&api_token=$SPORTMONKS_TOKEN"
# → Verify season_id is 1795, season name is "2026"

# 2. Confirm all 10 teams exist for the season
curl "https://cricket.sportmonks.com/api/v2.0/teams?filter[season_id]=1795&api_token=$SPORTMONKS_TOKEN"
# → Verify 10 franchise teams (filter out national teams via national_team=false)

# 3. Confirm fixture count (should be ~74 for a full IPL season)
curl "https://cricket.sportmonks.com/api/v2.0/fixtures?filter[season_id]=1795&sort=starting_at&api_token=$SPORTMONKS_TOKEN"
# → Verify fixtures exist and starting_at dates look correct
```

Save raw responses to `api-tester/responses/sportsmonk/2026-seed/` for audit trail.

---

## Seed SQL Snippet (for reference)

```sql
-- Sport
INSERT INTO v2_sports (id, code, name, api_id)
VALUES (gen_random_uuid(), 'cricket', 'Cricket', NULL)
ON CONFLICT DO NOTHING;

-- League (api_id = 1)
INSERT INTO v2_leagues (id, code, name, api_id, sport_id, image_url)
VALUES (gen_random_uuid(), 'ipl', 'Indian Premier League', 1, (SELECT id FROM v2_sports WHERE code = 'cricket'), 'https://cdn.sportmonks.com/images/cricket/leagues/1/1.png')
ON CONFLICT DO NOTHING;

-- Season (api_id = 1795)
INSERT INTO v2_seasons (id, league_id, api_id, name, code, year, is_active, start_date, end_date)
VALUES (gen_random_uuid(), (SELECT id FROM v2_leagues WHERE code = 'ipl'), 1795, 'IPL 2026', '2026', 2026, true, '2026-03-28', '2026-06-01')
ON CONFLICT DO NOTHING;

-- Teams (10 rows)
-- CSK:  api_id=2,  code='CSK',  color='#F9CD05'
-- DC:   api_id=3,  code='DC',   color='#004C93'
-- PBKS: api_id=4,  code='PBKS', color='#ED1B24'
-- KKR:  api_id=5,  code='KKR',  color='#3B215D'
-- MI:   api_id=6,  code='MI',   color='#004BA0'
-- RR:   api_id=7,  code='RR',   color='#EA1A85'
-- RCB:  api_id=8,  code='RCB',  color='#EC1C24'
-- SRH:  api_id=9,  code='SRH',  color='#F26522'
-- GT:   api_id=1976, code='GT',  color='#1C1C2B'
-- LSG:  api_id=1979, code='LSG', color='#A72056'
```

---

## TBC Team (Playoffs)

Sportmonks uses a placeholder team for undecided playoff matchups:

| Field | Value |
|-------|-------|
| `api_id` | `2732` |
| `code` | `TBC` |
| `name` | To Be Confirmed |

This team appears in playoff fixtures (Qualifier 1, Eliminator, Qualifier 2, Final) before the participating teams are determined. These fixtures sync normally into `v2_league_season_fixtures` — the `round` column (e.g., "Qualifier 1", "Final") makes each fixture unique within the season even when teams are TBC.

---

## Round Values

Each fixture in Sportmonks has a `round` string that identifies the match within the season. Examples:

| Round | Type |
|-------|------|
| `1st Match` | Regular season |
| `2nd Match` | Regular season |
| `70th Match` | Regular season |
| `Qualifier 1` | Playoff |
| `Eliminator` | Playoff |
| `Qualifier 2` | Playoff |
| `Final` | Playoff |

The `round` value is stored in `v2_league_season_fixtures.round` and used as the unique constraint `(season_id, round)` instead of `(season_id, match_number)`, because playoff fixtures can share `match_number` values with regular season matches.

---

## Notes

- **Team colors** are NOT from Sportmonks (they don't provide brand colors). Colors are from the existing `web-app/src/lib/constants.ts` and should not be overwritten by the sync cron (per SYNC-CRON-001 story).
- **Logo URLs** are from the Sportmonks CDN. Consider proxying through our own CDN for stability post-launch, but direct URLs are acceptable for launch.
- **`text_on_color`** indicates whether text placed on the team color should be dark (`#0A0A0F`) or light (`#F0F0F5`). Used for team badges and UI elements.
- **Season `start_date` and `end_date`** should be confirmed from fixture data — the first and last fixture `starting_at` dates for season 1795.
