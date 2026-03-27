-- Bragg — 015 Add CHECK Constraints on Match Stats
-- Prevents negative or out-of-range values from corrupting leaderboard calculations.

ALTER TABLE matches ADD CONSTRAINT chk_top_scorer_runs
  CHECK (top_scorer_runs IS NULL OR top_scorer_runs >= 0);

ALTER TABLE matches ADD CONSTRAINT chk_top_wicket_taker_wickets
  CHECK (top_wicket_taker_wickets IS NULL OR top_wicket_taker_wickets >= 0);

ALTER TABLE matches ADD CONSTRAINT chk_first_innings_score
  CHECK (first_innings_score IS NULL OR first_innings_score >= 0);

ALTER TABLE matches ADD CONSTRAINT chk_first_innings_wickets
  CHECK (first_innings_wickets IS NULL OR (first_innings_wickets >= 0 AND first_innings_wickets <= 10));

ALTER TABLE matches ADD CONSTRAINT chk_total_match_runs
  CHECK (total_match_runs IS NULL OR total_match_runs >= 0);

ALTER TABLE matches ADD CONSTRAINT chk_total_match_wickets
  CHECK (total_match_wickets IS NULL OR (total_match_wickets >= 0 AND total_match_wickets <= 20));

ALTER TABLE matches ADD CONSTRAINT chk_total_match_sixes
  CHECK (total_match_sixes IS NULL OR total_match_sixes >= 0);

ALTER TABLE matches ADD CONSTRAINT chk_powerplay_score
  CHECK (powerplay_score IS NULL OR powerplay_score >= 0);

ALTER TABLE matches ADD CONSTRAINT chk_powerplay_wickets
  CHECK (powerplay_wickets IS NULL OR (powerplay_wickets >= 0 AND powerplay_wickets <= 6));

ALTER TABLE matches ADD CONSTRAINT chk_first_wicket_over
  CHECK (first_wicket_over IS NULL OR (first_wicket_over >= 1 AND first_wicket_over <= 20));

ALTER TABLE matches ADD CONSTRAINT chk_current_overs
  CHECK (
    (current_overs_a IS NULL OR (current_overs_a >= 0 AND current_overs_a <= 20))
    AND (current_overs_b IS NULL OR (current_overs_b >= 0 AND current_overs_b <= 20))
  );
