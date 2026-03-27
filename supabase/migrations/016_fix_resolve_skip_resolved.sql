-- Bragg — 016 Fix resolve_match_predictions to skip already-resolved scenarios
-- Without this, calling the function re-processes scenarios that were already
-- resolved during progressive resolution (toss, powerplay, etc.), wasting cycles.

CREATE OR REPLACE FUNCTION resolve_match_predictions(p_match_id INT)
RETURNS void AS $$
DECLARE
  v_match RECORD;
  v_scenario RECORD;
  v_correct_answer TEXT;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id;

  FOR v_scenario IN
    SELECT * FROM scenarios
    WHERE match_id = p_match_id
      AND is_removed = false
      AND is_resolved = false
      AND approval_status IN ('auto_approved', 'approved')
  LOOP
    v_correct_answer := NULL;

    CASE v_scenario.system_category
      WHEN 'match_winner' THEN v_correct_answer := v_match.match_winner;
      WHEN 'toss_winner' THEN v_correct_answer := v_match.toss_winner;
      WHEN 'top_scorer' THEN v_correct_answer := v_match.top_scorer;
      WHEN 'top_wicket_taker' THEN v_correct_answer := v_match.top_wicket_taker;
      WHEN 'player_of_match' THEN v_correct_answer := v_match.player_of_match;
      WHEN 'first_innings_score' THEN
        IF v_match.first_innings_score IS NOT NULL THEN
          IF v_match.first_innings_score < 150 THEN v_correct_answer := '<150';
          ELSIF v_match.first_innings_score >= 190 THEN v_correct_answer := '190+';
          ELSIF v_match.first_innings_score >= 170 THEN v_correct_answer := '170-189';
          ELSE v_correct_answer := '150-169';
          END IF;
        END IF;
      WHEN 'total_match_runs' THEN
        IF v_match.total_match_runs IS NOT NULL THEN
          IF v_match.total_match_runs < 300 THEN v_correct_answer := '<300';
          ELSIF v_match.total_match_runs >= 400 THEN v_correct_answer := '400+';
          ELSIF v_match.total_match_runs >= 350 THEN v_correct_answer := '350-399';
          ELSE v_correct_answer := '300-349';
          END IF;
        END IF;
      WHEN 'powerplay_score' THEN
        IF v_match.powerplay_score IS NOT NULL THEN
          IF v_match.powerplay_score < 40 THEN v_correct_answer := '<40';
          ELSIF v_match.powerplay_score >= 71 THEN v_correct_answer := '71+';
          ELSIF v_match.powerplay_score >= 56 THEN v_correct_answer := '56-70';
          ELSE v_correct_answer := '40-55';
          END IF;
        END IF;
      WHEN 'powerplay_wickets' THEN
        IF v_match.powerplay_wickets IS NOT NULL THEN
          IF v_match.powerplay_wickets >= 3 THEN v_correct_answer := '3+';
          ELSE v_correct_answer := v_match.powerplay_wickets::TEXT;
          END IF;
        END IF;
      WHEN 'total_sixes' THEN
        IF v_match.total_match_sixes IS NOT NULL THEN
          IF v_match.total_match_sixes < 15 THEN v_correct_answer := '<15';
          ELSIF v_match.total_match_sixes >= 36 THEN v_correct_answer := '36+';
          ELSIF v_match.total_match_sixes >= 26 THEN v_correct_answer := '26-35';
          ELSE v_correct_answer := '15-25';
          END IF;
        END IF;
      WHEN 'total_wickets' THEN
        IF v_match.total_match_wickets IS NOT NULL THEN
          IF v_match.total_match_wickets >= 22 THEN v_correct_answer := '22+';
          ELSIF v_match.total_match_wickets >= 19 THEN v_correct_answer := '19-21';
          ELSIF v_match.total_match_wickets >= 16 THEN v_correct_answer := '16-18';
          ELSE v_correct_answer := '12-15';
          END IF;
        END IF;
      WHEN 'batsman_fifty' THEN
        IF v_match.batsman_scored_fifty IS NOT NULL THEN
          v_correct_answer := CASE WHEN v_match.batsman_scored_fifty THEN 'Yes' ELSE 'No' END;
        END IF;
      WHEN 'bowler_three_wkt' THEN
        IF v_match.bowler_took_three IS NOT NULL THEN
          v_correct_answer := CASE WHEN v_match.bowler_took_three THEN 'Yes' ELSE 'No' END;
        END IF;
      WHEN 'had_super_over' THEN
        IF v_match.had_super_over IS NOT NULL THEN
          v_correct_answer := CASE WHEN v_match.had_super_over THEN 'Yes' ELSE 'No' END;
        END IF;
      WHEN 'most_sixes' THEN v_correct_answer := v_match.most_sixes_player;
      WHEN 'first_wicket_over' THEN
        IF v_match.first_wicket_over IS NOT NULL THEN
          IF v_match.first_wicket_over <= 2 THEN v_correct_answer := '1-2';
          ELSIF v_match.first_wicket_over <= 4 THEN v_correct_answer := '3-4';
          ELSIF v_match.first_wicket_over <= 6 THEN v_correct_answer := '5-6';
          ELSE v_correct_answer := '7+';
          END IF;
        END IF;
      ELSE
        -- Custom scenario — skip auto-resolution
        NULL;
    END CASE;

    IF v_correct_answer IS NOT NULL THEN
      UPDATE scenarios
      SET correct_answer = v_correct_answer, is_resolved = true
      WHERE id = v_scenario.id;

      UPDATE predictions
      SET is_correct = (value = v_correct_answer),
          points_earned = CASE WHEN value = v_correct_answer THEN v_scenario.points ELSE 0 END
      WHERE scenario_id = v_scenario.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
