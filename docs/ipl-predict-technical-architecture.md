# Bragg — Technical Architecture Document

**For:** Developer handoff
**Last updated:** March 26, 2026
**Read alongside:** PRD v2, Design System Spec, Launch Checklist

---

## 1. System Overview

```
┌────────────────────────────────────────────────────────────────┐
│                        USERS (Mobile/Web)                      │
│     Next.js 16.2 App (Vercel) — SSR + Client Components        │
└──────────────┬─────────────────────────────┬───────────────────┘
               │ Supabase JS Client          │ Supabase Realtime
               │ (REST + Auth)               │ (WebSocket)
               ▼                             ▼
┌────────────────────────────────────────────────────────────────┐
│                     SUPABASE (Backend)                          │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Auth     │  │ Postgres  │  │ Realtime │  │ Edge         │  │
│  │ (Magic   │  │ (DB +     │  │ (Push    │  │ Functions    │  │
│  │  Link)   │  │  RLS +    │  │  updates │  │ (Cron +      │  │
│  │          │  │  Views)   │  │  to FE)  │  │  API client) │  │
│  └──────────┘  └───────────┘  └──────────┘  └──────┬───────┘  │
└────────────────────────────────────────────────────┬───────────┘
                                                     │
                                                     │ HTTP (1/min during match)
                                                     ▼
                                          ┌──────────────────────┐
                                          │  CricketData.org API │
                                          │  api.cricapi.com/v1/ │
                                          └──────────────────────┘
```

---

## 2. Tech Stack Details

| Component | Technology | Version | Notes |
|-----------|-----------|---------|-------|
| Framework | Next.js | 16.2 | App Router, Turbopack for dev |
| React | React | 19.2 | Server + Client components |
| Language | TypeScript | 5.8+ | Strict mode enabled |
| Styling | Tailwind CSS | v4 | With @tailwindcss/postcss |
| Auth | Supabase Auth | - | Magic link (email OTP) |
| Database | Supabase Postgres | 15+ | With RLS, Views, Functions |
| Realtime | Supabase Realtime | - | Subscriptions on predictions, scenarios, group_members |
| Cron | Supabase Edge Functions | Deno | pg_cron for scheduling |
| Hosting | Vercel | - | Free tier, auto-deploy from GitHub |
| Cricket API | CricketData.org | v1 | $5.99/month S plan |
| Package Manager | npm | - | |

---

## 3. Database Schema (Complete SQL)

### 3.1 Extensions & Enums

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE match_status AS ENUM ('upcoming', 'live', 'completed', 'abandoned', 'no_result');
CREATE TYPE member_status AS ENUM ('pending', 'approved', 'rejected', 'removed');
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE scenario_type AS ENUM ('system', 'custom');
CREATE TYPE scenario_approval AS ENUM ('auto_approved', 'pending', 'approved', 'rejected');
```

### 3.2 Profiles

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 30),
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3.3 Groups

```sql
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 50),
  invite_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_groups_invite_code ON public.groups(invite_code);
```

### 3.4 Group Members (with roles + approval)

```sql
CREATE TABLE public.group_members (
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status member_status NOT NULL DEFAULT 'pending',
  role member_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX idx_group_members_status ON public.group_members(group_id, status);
CREATE INDEX idx_group_members_user ON public.group_members(user_id, status);
```

### 3.5 Matches

```sql
CREATE TABLE public.matches (
  id SERIAL PRIMARY KEY,
  match_number INT NOT NULL UNIQUE,
  team_a TEXT NOT NULL,
  team_b TEXT NOT NULL,
  date DATE NOT NULL,
  time_ist TIME NOT NULL,
  venue TEXT NOT NULL,
  status match_status NOT NULL DEFAULT 'upcoming',

  -- Results (populated after match / during match)
  toss_winner TEXT,
  match_winner TEXT,
  top_scorer TEXT,
  top_scorer_runs INT,
  top_wicket_taker TEXT,
  top_wicket_taker_wickets INT,
  player_of_match TEXT,
  first_innings_score INT,
  first_innings_wickets INT,
  total_match_runs INT,
  total_match_wickets INT,
  total_match_sixes INT,
  powerplay_score INT,
  powerplay_wickets INT,
  had_super_over BOOLEAN,
  most_sixes_player TEXT,
  first_wicket_over INT,
  batsman_scored_fifty BOOLEAN,
  bowler_took_three BOOLEAN,

  -- Live snapshot (updated every minute during match)
  current_score_a TEXT,        -- e.g., "172/4"
  current_score_b TEXT,        -- e.g., "85/2"
  current_overs_a DECIMAL(4,1),
  current_overs_b DECIMAL(4,1),
  current_batting_team TEXT,
  live_scorecard_json JSONB,   -- Full cached scorecard response
  last_polled_at TIMESTAMPTZ,

  -- External API mapping
  api_match_id TEXT,

  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_matches_status ON public.matches(status);
CREATE INDEX idx_matches_date ON public.matches(date);
```

### 3.6 Match Group Settings

```sql
CREATE TABLE public.match_group_settings (
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  match_id INT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  prediction_deadline TIMESTAMPTZ,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (group_id, match_id)
);
```

### 3.7 Scenarios

```sql
CREATE TABLE public.scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  match_id INT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  type scenario_type NOT NULL DEFAULT 'custom',
  system_category TEXT,  -- 'match_winner', 'toss_winner', etc.

  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  description TEXT,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- format: ["CSK", "MI"] or ["Yes", "No"] or ["<150", "150-169", "170-189", "190+"]

  correct_answer TEXT,
  points INT NOT NULL DEFAULT 10 CHECK (points IN (5, 10, 15, 20, 25)),
  is_resolved BOOLEAN NOT NULL DEFAULT false,

  approval_status scenario_approval NOT NULL DEFAULT 'pending',

  is_removed BOOLEAN NOT NULL DEFAULT false,
  removed_by UUID REFERENCES public.profiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE NULLS NOT DISTINCT (group_id, match_id, system_category)
);

CREATE INDEX idx_scenarios_group_match ON public.scenarios(group_id, match_id);
CREATE INDEX idx_scenarios_approval ON public.scenarios(group_id, approval_status);
```

### 3.8 Predictions

```sql
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  is_correct BOOLEAN,  -- null = unresolved
  points_earned INT DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, scenario_id)
);

CREATE INDEX idx_predictions_scenario ON public.predictions(scenario_id);
CREATE INDEX idx_predictions_user ON public.predictions(user_id);
```

### 3.9 Notifications

```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 'join_request', 'approved', 'rejected', 'predictions_open', 'results_in', 'scenario_proposed', 'scenario_approved'
  message TEXT NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  match_id INT REFERENCES public.matches(id),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);
```

### 3.10 Points Config

```sql
CREATE TABLE public.points_config (
  system_category TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  default_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  points INT NOT NULL,
  is_auto_scorable BOOLEAN NOT NULL DEFAULT true,
  resolution_phase TEXT  -- 'toss', 'powerplay', 'mid_match', 'innings_break', 'end_of_match', 'post_match'
);

INSERT INTO public.points_config VALUES
  ('match_winner',       'Match Winner',              'Which team wins?',                              '[]', 10, true,  'end_of_match'),
  ('toss_winner',        'Toss Winner',               'Which team wins the toss?',                     '[]', 5,  true,  'toss'),
  ('top_scorer',         'Top Scorer',                'Highest run-scorer in the match',               '[]', 15, true,  'end_of_match'),
  ('top_wicket_taker',   'Top Wicket-Taker',          'Most wickets in the match',                     '[]', 15, true,  'end_of_match'),
  ('total_match_runs',   'Total Match Runs',          'Combined runs both innings',                    '["<300","300-349","350-399","400+"]', 10, true, 'end_of_match'),
  ('first_innings_score','First Innings Score',       'Batting first team total',                      '["<150","150-169","170-189","190+"]', 10, true, 'innings_break'),
  ('player_of_match',    'Player of the Match',       'POTM award winner',                             '[]', 20, true,  'post_match'),
  ('powerplay_score',    'Powerplay Score',           'Batting first team score at end of over 6',     '["<40","40-55","55-70","70+"]', 10, true, 'powerplay'),
  ('powerplay_wickets',  'Wickets in Powerplay',      'Wickets fallen in first 6 overs',               '["0","1","2","3+"]', 10, true, 'powerplay'),
  ('batsman_fifty',      'Will Any Batsman Score 50+?','Will any batsman score a half-century or more?','["Yes","No"]', 10, true, 'mid_match'),
  ('total_sixes',        'Total 6s in Match',         'Total number of sixes hit across both innings',  '["<15","15-25","25-35","35+"]', 10, true, 'end_of_match'),
  ('total_wickets',      'Total Wickets in Match',    'Total wickets fallen across both innings',       '["<12","12-15","15-18","18+"]', 10, true, 'end_of_match'),
  ('bowler_three_wkt',   'Will Any Bowler Take 3+ Wickets?','Will any bowler take 3 or more wickets?',  '["Yes","No"]', 10, true, 'mid_match'),
  ('super_over',         'Super Over?',               'Will the match go to a super over?',             '["Yes","No"]', 25, false, 'end_of_match'),
  ('most_sixes',         'Most Sixes',                'Which player will hit the most sixes?',          '[]', 10, false, 'end_of_match'),
  ('first_wicket_over',  'First Wicket Over',         'In which over will the first wicket fall?',      '["1","2","3","4","5","6"]', 10, false, 'powerplay');
```

### 3.11 Views

```sql
-- Season Standings (per group)
CREATE OR REPLACE VIEW public.season_standings AS
SELECT
  sc.group_id,
  p.user_id,
  pr.display_name,
  gm.role,
  gm.joined_at,
  COALESCE(SUM(p.points_earned), 0) AS total_points,
  COUNT(DISTINCT sc.match_id) AS matches_predicted,
  COUNT(CASE WHEN p.is_correct = true THEN 1 END) AS correct_predictions,
  COUNT(CASE WHEN p.is_correct IS NOT NULL THEN 1 END) AS total_resolved,
  CASE
    WHEN COUNT(CASE WHEN p.is_correct IS NOT NULL THEN 1 END) > 0
    THEN ROUND(
      100.0 * COUNT(CASE WHEN p.is_correct = true THEN 1 END) /
      COUNT(CASE WHEN p.is_correct IS NOT NULL THEN 1 END), 1
    )
    ELSE 0
  END AS accuracy_pct,
  CASE
    WHEN COUNT(DISTINCT sc.match_id) > 0
    THEN ROUND(COALESCE(SUM(p.points_earned), 0)::DECIMAL / COUNT(DISTINCT sc.match_id), 1)
    ELSE 0
  END AS points_per_match,
  RANK() OVER (
    PARTITION BY sc.group_id
    ORDER BY COALESCE(SUM(p.points_earned), 0) DESC
  ) AS rank
FROM public.predictions p
JOIN public.scenarios sc ON sc.id = p.scenario_id
JOIN public.profiles pr ON pr.id = p.user_id
JOIN public.group_members gm ON gm.group_id = sc.group_id AND gm.user_id = p.user_id
WHERE sc.is_removed = false
  AND sc.approval_status IN ('auto_approved', 'approved')
  AND gm.status = 'approved'
GROUP BY sc.group_id, p.user_id, pr.display_name, gm.role, gm.joined_at;

-- Match Leaderboard
CREATE OR REPLACE VIEW public.match_leaderboard AS
SELECT
  sc.group_id,
  sc.match_id,
  p.user_id,
  pr.display_name,
  COALESCE(SUM(p.points_earned), 0) AS match_points,
  COUNT(CASE WHEN p.is_correct = true THEN 1 END) AS correct_count,
  COUNT(CASE WHEN p.is_correct IS NOT NULL THEN 1 END) AS resolved_count,
  COUNT(p.id) AS predicted_count,
  RANK() OVER (
    PARTITION BY sc.group_id, sc.match_id
    ORDER BY COALESCE(SUM(p.points_earned), 0) DESC,
             MIN(p.submitted_at) ASC
  ) AS rank
FROM public.predictions p
JOIN public.scenarios sc ON sc.id = p.scenario_id
JOIN public.profiles pr ON pr.id = p.user_id
WHERE sc.is_removed = false
  AND sc.approval_status IN ('auto_approved', 'approved')
GROUP BY sc.group_id, sc.match_id, p.user_id, pr.display_name;
```

### 3.12 Database Functions

```sql
-- Seed system scenarios for a group + match
CREATE OR REPLACE FUNCTION public.seed_system_scenarios(
  p_group_id UUID,
  p_match_id INT
) RETURNS VOID AS $$
DECLARE
  m RECORD;
  pc RECORD;
  team_options JSONB;
BEGIN
  SELECT * INTO m FROM public.matches WHERE id = p_match_id;
  team_options := jsonb_build_array(m.team_a, m.team_b);

  FOR pc IN SELECT * FROM public.points_config LOOP
    INSERT INTO public.scenarios (
      group_id, match_id, type, system_category,
      title, description, options, points, approval_status
    ) VALUES (
      p_group_id, p_match_id, 'system', pc.system_category,
      pc.label, pc.description,
      CASE
        WHEN pc.system_category IN ('match_winner', 'toss_winner') THEN team_options
        WHEN jsonb_array_length(pc.default_options) > 0 THEN pc.default_options
        ELSE '[]'::jsonb
      END,
      pc.points,
      'auto_approved'
    )
    ON CONFLICT (group_id, match_id, system_category) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Resolve predictions for a completed match (system scenarios)
CREATE OR REPLACE FUNCTION public.resolve_match_predictions(p_match_id INT)
RETURNS VOID AS $$
DECLARE
  m RECORD;
  s RECORD;
  correct_value TEXT;
BEGIN
  SELECT * INTO m FROM public.matches WHERE id = p_match_id;

  IF m.status NOT IN ('completed', 'abandoned') THEN
    RAISE EXCEPTION 'Match % is not completed/abandoned', p_match_id;
  END IF;

  FOR s IN
    SELECT sc.*
    FROM public.scenarios sc
    JOIN public.points_config pc ON pc.system_category = sc.system_category
    WHERE sc.match_id = p_match_id
      AND sc.type = 'system'
      AND sc.is_resolved = false
      AND sc.is_removed = false
      AND pc.is_auto_scorable = true
  LOOP
    correct_value := CASE s.system_category
      WHEN 'match_winner' THEN m.match_winner
      WHEN 'toss_winner' THEN m.toss_winner
      WHEN 'top_scorer' THEN m.top_scorer
      WHEN 'top_wicket_taker' THEN m.top_wicket_taker
      WHEN 'player_of_match' THEN m.player_of_match
      WHEN 'first_innings_score' THEN
        CASE
          WHEN m.first_innings_score < 150 THEN '<150'
          WHEN m.first_innings_score BETWEEN 150 AND 169 THEN '150-169'
          WHEN m.first_innings_score BETWEEN 170 AND 189 THEN '170-189'
          ELSE '190+'
        END
      WHEN 'total_match_runs' THEN
        CASE
          WHEN m.total_match_runs < 300 THEN '<300'
          WHEN m.total_match_runs BETWEEN 300 AND 349 THEN '300-349'
          WHEN m.total_match_runs BETWEEN 350 AND 399 THEN '350-399'
          ELSE '400+'
        END
      WHEN 'powerplay_score' THEN
        CASE
          WHEN m.powerplay_score < 40 THEN '<40'
          WHEN m.powerplay_score BETWEEN 40 AND 55 THEN '40-55'
          WHEN m.powerplay_score BETWEEN 56 AND 70 THEN '55-70'
          ELSE '70+'
        END
      WHEN 'powerplay_wickets' THEN
        CASE
          WHEN m.powerplay_wickets >= 3 THEN '3+'
          ELSE m.powerplay_wickets::TEXT
        END
      WHEN 'batsman_fifty' THEN
        CASE WHEN m.batsman_scored_fifty THEN 'Yes' ELSE 'No' END
      WHEN 'total_sixes' THEN
        CASE
          WHEN m.total_match_sixes < 15 THEN '<15'
          WHEN m.total_match_sixes BETWEEN 15 AND 25 THEN '15-25'
          WHEN m.total_match_sixes BETWEEN 26 AND 35 THEN '25-35'
          ELSE '35+'
        END
      WHEN 'total_wickets' THEN
        CASE
          WHEN m.total_match_wickets < 12 THEN '<12'
          WHEN m.total_match_wickets BETWEEN 12 AND 15 THEN '12-15'
          WHEN m.total_match_wickets BETWEEN 16 AND 18 THEN '15-18'
          ELSE '18+'
        END
      WHEN 'bowler_three_wkt' THEN
        CASE WHEN m.bowler_took_three THEN 'Yes' ELSE 'No' END
      ELSE NULL
    END;

    IF correct_value IS NULL THEN CONTINUE; END IF;

    -- Update scenario
    UPDATE public.scenarios
    SET correct_answer = correct_value, is_resolved = true
    WHERE id = s.id;

    -- Score predictions
    UPDATE public.predictions
    SET is_correct = (lower(value) = lower(correct_value)),
        points_earned = CASE
          WHEN lower(value) = lower(correct_value) THEN s.points
          ELSE 0
        END
    WHERE scenario_id = s.id
      AND is_correct IS NULL;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Void unresolved predictions for abandoned match
CREATE OR REPLACE FUNCTION public.void_abandoned_match(p_match_id INT)
RETURNS VOID AS $$
BEGIN
  -- Void only unresolved predictions (resolved ones keep their points)
  UPDATE public.predictions p
  SET is_correct = NULL, points_earned = 0
  FROM public.scenarios s
  WHERE p.scenario_id = s.id
    AND s.match_id = p_match_id
    AND p.is_correct IS NULL;

  -- Mark unresolved scenarios
  UPDATE public.scenarios
  SET is_removed = true
  WHERE match_id = p_match_id
    AND is_resolved = false;
END;
$$ LANGUAGE plpgsql;
```

### 3.13 Row Level Security

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_group_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_config ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "read all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "update own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Groups
CREATE POLICY "read all" ON public.groups FOR SELECT USING (true);
CREATE POLICY "create" ON public.groups FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Group Members
CREATE POLICY "read" ON public.group_members FOR SELECT USING (true);
CREATE POLICY "join" ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin update" ON public.group_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('owner', 'admin')
      AND gm.status = 'approved'
  )
);

-- Matches (public read, service role write)
CREATE POLICY "read all" ON public.matches FOR SELECT USING (true);

-- Match Group Settings
CREATE POLICY "read" ON public.match_group_settings FOR SELECT USING (true);
CREATE POLICY "admin manage" ON public.match_group_settings FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = match_group_settings.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('owner', 'admin')
      AND gm.status = 'approved'
  )
);

-- Scenarios
CREATE POLICY "read approved" ON public.scenarios FOR SELECT USING (
  approval_status IN ('auto_approved', 'approved') OR created_by = auth.uid()
);
CREATE POLICY "create" ON public.scenarios FOR INSERT WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = scenarios.group_id
      AND gm.user_id = auth.uid()
      AND gm.status = 'approved'
  )
);
CREATE POLICY "admin update" ON public.scenarios FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = scenarios.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('owner', 'admin')
      AND gm.status = 'approved'
  )
);

-- Predictions
CREATE POLICY "read" ON public.predictions FOR SELECT USING (true);
CREATE POLICY "insert own" ON public.predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own" ON public.predictions FOR UPDATE USING (auth.uid() = user_id);

-- Notifications
CREATE POLICY "read own" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "update own" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Points Config (public read)
CREATE POLICY "read all" ON public.points_config FOR SELECT USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scenarios;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

---

## 4. API Integration (CricketData.org)

### 4.1 Authentication

All requests require `apikey` as a query parameter:
```
GET https://api.cricapi.com/v1/matches?apikey=YOUR_KEY&offset=0
```

### 4.2 Key Endpoints

**GET /matches** — List matches
```json
{
  "data": [
    {
      "id": "match-uuid",
      "name": "Chennai Super Kings vs Mumbai Indians",
      "matchType": "t20",
      "status": "Match not started",
      "venue": "Wankhede Stadium, Mumbai",
      "date": "2026-03-28",
      "dateTimeGMT": "2026-03-28T14:00:00",
      "teams": ["Chennai Super Kings", "Mumbai Indians"],
      "series_id": "ipl-2026-uuid"
    }
  ]
}
```

**GET /match_info?id={id}** — Match details (toss, status, result)
```json
{
  "data": {
    "id": "match-uuid",
    "name": "CSK vs MI",
    "status": "Chennai Super Kings won by 6 wickets",
    "tossWinner": "Mumbai Indians",
    "tossChoice": "bat",
    "matchWinner": "Chennai Super Kings"
  }
}
```

**GET /match_scorecard?id={id}** — Full scorecard (THE PRIMARY ENDPOINT)
```json
{
  "data": {
    "id": "match-uuid",
    "scorecard": [
      {
        "inning": "Mumbai Indians Inning 1",
        "batting": [
          { "batsman": { "name": "Rohit Sharma" }, "r": 45, "b": 32, "4s": 5, "6s": 2 }
        ],
        "bowling": [
          { "bowler": { "name": "Deepak Chahar" }, "o": 4, "m": 0, "r": 28, "w": 2 }
        ],
        "totals": { "R": 172, "W": 6, "O": 20 },
        "fow": [
          { "batsman": { "name": "Q de Kock" }, "wkt_nbr": 1, "score_at_dismissal": 23, "overs_at_dismissal": 3.2 }
        ]
      }
    ]
  }
}
```

**GET /match_squad?id={id}** — Playing XI

### 4.3 Scorecard → Match Table Mapping

The cron parses the scorecard response and writes to the `matches` table:

```typescript
function parseScorecard(matchId: number, data: ScorecardResponse) {
  const innings = data.scorecard;
  const firstInnings = innings[0];
  const secondInnings = innings[1];

  // Direct fields
  const toss_winner = data.tossWinner;
  const match_winner = data.matchWinner;

  // Computed from batting stats
  const allBatsmen = [...(firstInnings?.batting || []), ...(secondInnings?.batting || [])];
  const topScorer = allBatsmen.sort((a, b) => b.r - a.r)[0];
  const batsman_scored_fifty = allBatsmen.some(b => b.r >= 50);
  const total_sixes = allBatsmen.reduce((sum, b) => sum + (b['6s'] || 0), 0);

  // Computed from bowling stats
  const allBowlers = [...(firstInnings?.bowling || []), ...(secondInnings?.bowling || [])];
  const topWicketTaker = allBowlers.sort((a, b) => b.w - a.w)[0];
  const bowler_took_three = allBowlers.some(b => b.w >= 3);
  const total_wickets = allBowlers.reduce((sum, b) => sum + b.w, 0);

  // Innings totals
  const first_innings_score = firstInnings?.totals?.R;
  const total_match_runs = (firstInnings?.totals?.R || 0) + (secondInnings?.totals?.R || 0);

  // Powerplay (from fall of wickets — count where overs <= 6)
  const fow = firstInnings?.fow || [];
  const powerplay_wickets = fow.filter(f => f.overs_at_dismissal <= 6).length;
  // Powerplay score: score at 6th over — approximate from last FOW before over 6 or batting data

  // Most sixes player
  const most_sixes_player = allBatsmen.sort((a, b) => (b['6s'] || 0) - (a['6s'] || 0))[0];

  // First wicket over
  const first_wicket_over = fow.length > 0 ? Math.ceil(fow[0].overs_at_dismissal) : null;

  return { /* all fields */ };
}
```

### 4.4 Cron State Machine

```typescript
// Edge Function: runs every 1 minute via pg_cron

async function cronHandler() {
  const now = new Date();
  const hour = now.getUTCHours() + 5.5; // IST offset

  // Only active between 2 PM and 1 AM IST
  if (hour < 14 && hour > 1) return;

  // Get today's matches
  const matches = await supabase
    .from('matches')
    .select('*')
    .eq('date', today())
    .in('status', ['upcoming', 'live']);

  if (matches.length === 0) return; // No matches today, exit

  for (const match of matches) {
    const matchTimeIST = parseTime(match.time_ist);
    const minutesToMatch = diffMinutes(matchTimeIST, now);

    if (match.status === 'upcoming') {
      // Squad fetch: 30 min before match
      if (minutesToMatch <= 30 && !match.api_match_id) {
        await fetchAndMapSquad(match);
      }
      // Auto-lock: check if match went live
      const info = await cricketAPI.getMatchInfo(match.api_match_id);
      if (isLive(info.status)) {
        await supabase.from('matches').update({ status: 'live' }).eq('id', match.id);
        await lockAllGroupPredictions(match.id);
      }
    }

    if (match.status === 'live') {
      // Poll scorecard
      const scorecard = await cricketAPI.getScorecard(match.api_match_id);
      const parsed = parseScorecard(match.id, scorecard);

      // Write live snapshot
      await supabase.from('matches').update({
        ...parsed.liveSnapshot,
        last_polled_at: now,
      }).eq('id', match.id);

      // Progressive resolution
      await progressiveResolve(match.id, parsed);

      // Check if completed
      if (isCompleted(scorecard.status)) {
        await supabase.from('matches').update({
          status: 'completed',
          ...parsed.finalResults,
          resolved_at: now,
        }).eq('id', match.id);
        await supabase.rpc('resolve_match_predictions', { p_match_id: match.id });
      }

      // Check if abandoned
      if (isAbandoned(scorecard.status)) {
        await supabase.from('matches').update({ status: 'abandoned' }).eq('id', match.id);
        await supabase.rpc('void_abandoned_match', { p_match_id: match.id });
      }
    }
  }
}
```

---

## 5. Realtime Subscriptions

### 5.1 What to Subscribe To

| Table | Filter | Purpose |
|-------|--------|---------|
| `predictions` | `scenario_id IN (scenarios for current group + match)` | Live leaderboard updates |
| `scenarios` | `group_id = currentGroupId AND match_id = currentMatchId` | New custom scenarios, resolution updates |
| `group_members` | `group_id = currentGroupId` | New join requests (for admins), approval status changes |
| `matches` | `id = currentMatchId` | Live score snapshot updates |
| `notifications` | `user_id = currentUserId` | Bell icon badge count |

### 5.2 Implementation Pattern

```typescript
// In the group match leaderboard component
useEffect(() => {
  const channel = supabase
    .channel(`match-${matchId}-group-${groupId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'predictions',
      filter: `scenario_id=in.(${scenarioIds.join(',')})`,
    }, (payload) => {
      // Update local leaderboard state
      updatePrediction(payload.new);
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'matches',
      filter: `id=eq.${matchId}`,
    }, (payload) => {
      // Update live score ticker
      updateMatchSnapshot(payload.new);
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [matchId, groupId]);
```

---

## 6. Route Structure

```
/                           → Landing page (SSR, public, SEO)
/login                      → Magic link login
/auth/callback              → Magic link redirect handler (Route Handler)
/join/[code]                → Join group via invite (SSR for OG tags)
/dashboard                  → My groups, create group, join via code (Protected)
/group/[groupId]            → Group home (3 states) (Protected)
/group/[groupId]/predict/[matchId]  → Prediction form (Protected)
/group/[groupId]/match/[matchId]    → Match leaderboard (live + post-match) (Protected)
/group/[groupId]/standings  → Season standings (Protected)
/group/[groupId]/admin      → Admin panel: members, approvals, scenario management (Protected)
/privacy                    → Privacy policy (Public)
/terms                      → Terms of service (Public)
```

---

## 7. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cricket API
CRICKET_API_KEY=your-cricketdata-api-key
CRICKET_API_BASE_URL=https://api.cricapi.com/v1

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME=Bragg
```

---

*This document should be read alongside the PRD (product decisions), Design System (visual specs), and Launch Checklist (operational readiness).*
