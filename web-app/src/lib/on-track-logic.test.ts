import { describe, it, expect } from "vitest";
import { computeTrackStatus, type LiveMatchState } from "./on-track-logic";
import type { EventResponse, ScorecardEntry } from "@/types/cricket-api";

// ── Helpers ─────────────────────────────────────────────────────

function makeBatter(
  player: string,
  runs: number,
  balls: number,
  sixes: number,
  status = "c Fielder b Bowler"
): ScorecardEntry {
  return {
    innings: "",
    player,
    type: "Batsman",
    status,
    R: String(runs),
    B: String(balls),
    Min: "0",
    "4s": "0",
    "6s": String(sixes),
    SR: balls > 0 ? String(((runs / balls) * 100).toFixed(2)) : "0",
    O: "",
    M: "",
    W: "",
    ER: "",
  };
}

function makeBowler(player: string, overs: number, wickets: number): ScorecardEntry {
  return {
    innings: "",
    player,
    type: "Bowler",
    status: "",
    R: String(overs * 8),
    B: "",
    Min: "",
    "4s": "",
    "6s": "",
    SR: "",
    O: String(overs),
    M: "0",
    W: String(wickets),
    ER: "8.00",
  };
}

function makeEvent(overrides: Partial<EventResponse> = {}): EventResponse {
  return {
    event_key: "test-match",
    event_date_start: "2026-03-28",
    event_date_stop: "2026-03-28",
    event_time: "19:30",
    event_home_team: "Team A",
    home_team_key: "1",
    event_away_team: "Team B",
    away_team_key: "2",
    event_stadium: "Test Stadium",
    event_home_team_logo: "",
    event_away_team_logo: "",
    event_status: "",
    event_status_info: "",
    event_live: "1",
    event_toss: "",
    event_man_of_match: "",
    event_service_home: "",
    event_service_away: "",
    event_home_final_result: "",
    event_away_final_result: "",
    event_home_rr: null,
    event_away_rr: null,
    event_type: "T20",
    league_name: "IPL",
    league_key: "9785",
    league_round: "1",
    league_season: "2026",
    scorecard: {},
    comments: {},
    wickets: {},
    extra: {},
    lineups: {
      home_team: { starting_lineups: [] },
      away_team: { starting_lineups: [] },
    },
    ...overrides,
  };
}

function makeLive(event: EventResponse, matchStatus = "live"): LiveMatchState {
  return { event, matchStatus };
}

// ── Tests ───────────────────────────────────────────────────────

describe("computeTrackStatus", () => {
  describe("completed match", () => {
    it('returns "pending" for completed match', () => {
      const event = makeEvent();
      expect(computeTrackStatus("match_winner", "Team A", makeLive(event, "completed"))).toBe("pending");
    });
  });

  describe("toss_winner", () => {
    it('returns "pending" when no toss data', () => {
      const event = makeEvent({ event_toss: "" });
      expect(computeTrackStatus("toss_winner", "Team A", makeLive(event))).toBe("pending");
    });

    it('returns "correct" when prediction matches', () => {
      const event = makeEvent({ event_toss: "Team A, elected to bat first" });
      expect(computeTrackStatus("toss_winner", "Team A", makeLive(event))).toBe("correct");
    });

    it('returns "wrong" when prediction does not match', () => {
      const event = makeEvent({ event_toss: "Team B, elected to bat first" });
      expect(computeTrackStatus("toss_winner", "Team A", makeLive(event))).toBe("wrong");
    });
  });

  describe("match_winner", () => {
    it('returns "pending" when only first innings', () => {
      const event = makeEvent({
        scorecard: {
          "Team A 1 INN": [makeBatter("Player 1", 50, 30, 2), makeBowler("Bowler 1", 4, 1)],
        },
        extra: { "Team A 1 INN": { innings: "", nr: "0", text: "", total: "180 ( 20 )", total_overs: null, percent_over: null } },
      });
      expect(computeTrackStatus("match_winner", "Team A", makeLive(event))).toBe("pending");
    });

    it('returns "on_track" for chasing team when runs exceed target', () => {
      const event = makeEvent({
        scorecard: {
          "Team A 1 INN": [makeBatter("P1", 80, 50, 3), makeBowler("B1", 4, 2)],
          "Team B 1 INN": [makeBatter("P2", 90, 50, 4), makeBowler("B2", 4, 1)],
        },
        extra: {
          "Team A 1 INN": { innings: "", nr: "0", text: "", total: "180 ( 20 )", total_overs: null, percent_over: null },
          "Team B 1 INN": { innings: "", nr: "0", text: "", total: "185 ( 18 )", total_overs: null, percent_over: null },
        },
      });
      expect(computeTrackStatus("match_winner", "Team B", makeLive(event))).toBe("on_track");
    });

    it('returns "on_track" for batting-first team when RR is very high', () => {
      const event = makeEvent({
        scorecard: {
          "Team A 1 INN": [makeBatter("P1", 80, 50, 3), makeBowler("B1", 4, 2)],
          "Team B 1 INN": [makeBatter("P2", 20, 30, 0), makeBowler("B2", 4, 1)],
        },
        extra: {
          "Team A 1 INN": { innings: "", nr: "0", text: "", total: "200 ( 20 )", total_overs: null, percent_over: null },
          "Team B 1 INN": { innings: "", nr: "0", text: "", total: "30 ( 8 )", total_overs: null, percent_over: null },
        },
      });
      // Need 171 from 12 overs = RR 14.25 > 12
      expect(computeTrackStatus("match_winner", "Team A", makeLive(event))).toBe("on_track");
    });

    it('returns "on_track" for chasing team when RR is comfortable', () => {
      const event = makeEvent({
        scorecard: {
          "Team A 1 INN": [makeBatter("P1", 80, 50, 3), makeBowler("B1", 4, 2)],
          "Team B 1 INN": [makeBatter("P2", 100, 60, 2), makeBowler("B2", 4, 1)],
        },
        extra: {
          "Team A 1 INN": { innings: "", nr: "0", text: "", total: "160 ( 20 )", total_overs: null, percent_over: null },
          "Team B 1 INN": { innings: "", nr: "0", text: "", total: "120 ( 14 )", total_overs: null, percent_over: null },
        },
      });
      // Need 41 from 6 overs = RR 6.83 < 8
      expect(computeTrackStatus("match_winner", "Team B", makeLive(event))).toBe("on_track");
    });
  });

  describe("first_innings_score", () => {
    it("projects during first innings", () => {
      const event = makeEvent({
        scorecard: { "Team A 1 INN": [makeBatter("P1", 60, 30, 2)] },
        extra: { "Team A 1 INN": { innings: "", nr: "0", text: "", total: "90 ( 10 )", total_overs: null, percent_over: null } },
      });
      // Projected: (90/10)*20 = 180 → bracket "170-189"
      expect(computeTrackStatus("first_innings_score", "170-189", makeLive(event))).toBe("on_track");
    });

    it("resolves when second innings started", () => {
      const event = makeEvent({
        scorecard: {
          "Team A 1 INN": [makeBatter("P1", 80, 50, 3)],
          "Team B 1 INN": [makeBatter("P2", 10, 5, 0)],
        },
        extra: {
          "Team A 1 INN": { innings: "", nr: "0", text: "", total: "195 ( 20 )", total_overs: null, percent_over: null },
          "Team B 1 INN": { innings: "", nr: "0", text: "", total: "10 ( 1 )", total_overs: null, percent_over: null },
        },
      });
      expect(computeTrackStatus("first_innings_score", "190+", makeLive(event))).toBe("on_track");
      expect(computeTrackStatus("first_innings_score", "170-189", makeLive(event))).toBe("in_danger");
    });
  });

  describe("batsman_fifty", () => {
    it('returns "on_track" for Yes when a batsman has 50+', () => {
      const event = makeEvent({
        scorecard: { "Team A 1 INN": [makeBatter("P1", 55, 30, 2)] },
        extra: { "Team A 1 INN": { innings: "", nr: "0", text: "", total: "100 ( 10 )", total_overs: null, percent_over: null } },
      });
      expect(computeTrackStatus("batsman_fifty", "Yes", makeLive(event))).toBe("on_track");
    });

    it('returns "on_track" for Yes when someone is not out at 30+', () => {
      const event = makeEvent({
        scorecard: { "Team A 1 INN": [makeBatter("P1", 35, 20, 1, "not out")] },
        extra: { "Team A 1 INN": { innings: "", nr: "0", text: "", total: "50 ( 6 )", total_overs: null, percent_over: null } },
      });
      expect(computeTrackStatus("batsman_fifty", "Yes", makeLive(event))).toBe("on_track");
    });

    it('returns "in_danger" for No when someone has 50+', () => {
      const event = makeEvent({
        scorecard: { "Team A 1 INN": [makeBatter("P1", 55, 30, 2)] },
        extra: { "Team A 1 INN": { innings: "", nr: "0", text: "", total: "100 ( 10 )", total_overs: null, percent_over: null } },
      });
      expect(computeTrackStatus("batsman_fifty", "No", makeLive(event))).toBe("in_danger");
    });
  });

  describe("bowler_three_wkt", () => {
    it('returns "on_track" for Yes when a bowler has 3+', () => {
      const event = makeEvent({
        scorecard: { "Team A 1 INN": [makeBowler("B1", 4, 3)] },
        extra: { "Team A 1 INN": { innings: "", nr: "0", text: "", total: "100 ( 10 )", total_overs: null, percent_over: null } },
      });
      expect(computeTrackStatus("bowler_three_wkt", "Yes", makeLive(event))).toBe("on_track");
    });

    it('returns "pending" for Yes when max is 2', () => {
      const event = makeEvent({
        scorecard: { "Team A 1 INN": [makeBowler("B1", 4, 2)] },
        extra: { "Team A 1 INN": { innings: "", nr: "0", text: "", total: "50 ( 6 )", total_overs: null, percent_over: null } },
      });
      expect(computeTrackStatus("bowler_three_wkt", "Yes", makeLive(event))).toBe("pending");
    });
  });

  describe("top_scorer", () => {
    it('returns "on_track" when predicted player leads by > 15', () => {
      const event = makeEvent({
        scorecard: {
          "Team A 1 INN": [makeBatter("Kohli", 70, 40, 3), makeBatter("Faf", 30, 25, 0)],
        },
        extra: { "Team A 1 INN": { innings: "", nr: "0", text: "", total: "120 ( 12 )", total_overs: null, percent_over: null } },
      });
      expect(computeTrackStatus("top_scorer", "Kohli", makeLive(event))).toBe("on_track");
    });

    it('returns "in_danger" when predicted player is dismissed and behind by > 15', () => {
      const event = makeEvent({
        scorecard: {
          "Team A 1 INN": [
            makeBatter("Kohli", 70, 40, 3),
            makeBatter("Faf", 30, 25, 0, "c X b Y"),
          ],
        },
        extra: { "Team A 1 INN": { innings: "", nr: "0", text: "", total: "120 ( 12 )", total_overs: null, percent_over: null } },
      });
      expect(computeTrackStatus("top_scorer", "Faf", makeLive(event))).toBe("in_danger");
    });
  });

  describe("top_wicket_taker", () => {
    it('returns "on_track" when predicted bowler leads', () => {
      const event = makeEvent({
        scorecard: {
          "Team A 1 INN": [makeBowler("Siraj", 4, 3), makeBowler("Hazlewood", 4, 1)],
        },
        extra: { "Team A 1 INN": { innings: "", nr: "0", text: "", total: "100 ( 10 )", total_overs: null, percent_over: null } },
      });
      expect(computeTrackStatus("top_wicket_taker", "Siraj", makeLive(event))).toBe("on_track");
    });

    it('returns "in_danger" when predicted bowler trails by 2+', () => {
      const event = makeEvent({
        scorecard: {
          "Team A 1 INN": [makeBowler("Siraj", 4, 3), makeBowler("Hazlewood", 4, 1)],
        },
        extra: { "Team A 1 INN": { innings: "", nr: "0", text: "", total: "100 ( 10 )", total_overs: null, percent_over: null } },
      });
      expect(computeTrackStatus("top_wicket_taker", "Hazlewood", makeLive(event))).toBe("in_danger");
    });
  });

  describe("most_sixes", () => {
    it('returns "on_track" when predicted player leads', () => {
      const event = makeEvent({
        scorecard: {
          "Team A 1 INN": [makeBatter("Kohli", 70, 40, 5), makeBatter("Faf", 30, 25, 1)],
        },
        extra: { "Team A 1 INN": { innings: "", nr: "0", text: "", total: "120 ( 12 )", total_overs: null, percent_over: null } },
      });
      expect(computeTrackStatus("most_sixes", "Kohli", makeLive(event))).toBe("on_track");
    });
  });

  describe("total_match_runs", () => {
    it("projects total runs and checks bracket", () => {
      const event = makeEvent({
        scorecard: {
          "Team A 1 INN": [makeBatter("P1", 80, 50, 3)],
          "Team B 1 INN": [makeBatter("P2", 40, 30, 1)],
        },
        extra: {
          "Team A 1 INN": { innings: "", nr: "0", text: "", total: "180 ( 20 )", total_overs: null, percent_over: null },
          "Team B 1 INN": { innings: "", nr: "0", text: "", total: "90 ( 10 )", total_overs: null, percent_over: null },
        },
      });
      // Projected: (270/30)*40 = 360 → bracket "350-399"
      expect(computeTrackStatus("total_match_runs", "350-399", makeLive(event))).toBe("on_track");
    });
  });

  describe("total_sixes", () => {
    it("projects total sixes", () => {
      const event = makeEvent({
        scorecard: {
          "Team A 1 INN": [makeBatter("P1", 80, 50, 8)],
        },
        extra: {
          "Team A 1 INN": { innings: "", nr: "0", text: "", total: "100 ( 10 )", total_overs: null, percent_over: null },
        },
      });
      // Projected: (8/10)*40 = 32 → bracket "26-35"
      expect(computeTrackStatus("total_sixes", "26-35", makeLive(event))).toBe("on_track");
    });
  });

  describe("total_wickets", () => {
    it("projects total wickets", () => {
      const event = makeEvent({
        scorecard: {
          "Team A 1 INN": [makeBowler("B1", 4, 3), makeBowler("B2", 4, 2)],
        },
        extra: {
          "Team A 1 INN": { innings: "", nr: "0", text: "", total: "100 ( 10 )", total_overs: null, percent_over: null },
        },
      });
      // 5 wickets in 10 overs → projected (5/10)*40 = 20 → bracket "19-21"
      expect(computeTrackStatus("total_wickets", "19-21", makeLive(event))).toBe("on_track");
    });
  });

  describe("powerplay_score (NEW - now computable)", () => {
    it("resolves when powerplay is complete", () => {
      const event = makeEvent({
        scorecard: { "Team A 1 INN": [makeBatter("P1", 60, 30, 2)] },
        extra: { "Team A 1 INN": { innings: "", nr: "0", text: "", total: "100 ( 10 )", total_overs: null, percent_over: null } },
        comments: {
          "Team A 1 INN": [
            { innings: "", overs: "0.1", balls: "1", runs: "4", ended: "No", post: "" },
            { innings: "", overs: "1.1", balls: "7", runs: "6", ended: "No", post: "" },
            { innings: "", overs: "3.1", balls: "19", runs: "4", ended: "No", post: "" },
            { innings: "", overs: "5.6", balls: "36", runs: "2", ended: "No", post: "" },
            // Total: 4+6+4+2 = 16, but simplified mock
          ],
        },
      });
      // Powerplay score = 16, overs >= 6 → resolves
      // 16 < 40 → bracket "<40"
      expect(computeTrackStatus("powerplay_score", "<40", makeLive(event))).toBe("on_track");
    });

    it('returns "pending" when no comments', () => {
      const event = makeEvent({
        scorecard: { "Team A 1 INN": [makeBatter("P1", 60, 30, 2)] },
        extra: { "Team A 1 INN": { innings: "", nr: "0", text: "", total: "100 ( 10 )", total_overs: null, percent_over: null } },
      });
      expect(computeTrackStatus("powerplay_score", "<40", makeLive(event))).toBe("pending");
    });
  });

  describe("first_wicket_over (NEW - now computable)", () => {
    it("resolves from wickets data", () => {
      const event = makeEvent({
        scorecard: { "Team A 1 INN": [makeBatter("P1", 10, 8, 0)] },
        extra: { "Team A 1 INN": { innings: "", nr: "0", text: "", total: "20 ( 3 )", total_overs: null, percent_over: null } },
        wickets: {
          "Team A 1 INN": [
            { innings: "", fall: "2.3 ov", balwer: "Bowler", batsman: "b Bowler 10", score: "15/1" },
          ],
        },
      });
      // Over 2.3 → ceil = 3 → bracket "3-4"
      expect(computeTrackStatus("first_wicket_over", "3-4", makeLive(event))).toBe("on_track");
      expect(computeTrackStatus("first_wicket_over", "1-2", makeLive(event))).toBe("in_danger");
    });

    it('returns "pending" when no wickets', () => {
      const event = makeEvent({
        scorecard: { "Team A 1 INN": [makeBatter("P1", 10, 8, 0)] },
        extra: { "Team A 1 INN": { innings: "", nr: "0", text: "", total: "20 ( 3 )", total_overs: null, percent_over: null } },
      });
      expect(computeTrackStatus("first_wicket_over", "1-2", makeLive(event))).toBe("pending");
    });
  });

  describe("powerplay_wickets (NEW - now computable)", () => {
    it("resolves after powerplay", () => {
      const event = makeEvent({
        scorecard: { "Team A 1 INN": [makeBowler("B1", 4, 2)] },
        extra: { "Team A 1 INN": { innings: "", nr: "0", text: "", total: "80 ( 10 )", total_overs: null, percent_over: null } },
        wickets: {
          "Team A 1 INN": [
            { innings: "", fall: "2.3 ov", balwer: "B1", batsman: "b B1 10", score: "15/1" },
            { innings: "", fall: "5.1 ov", balwer: "B1", batsman: "c X b B1 20", score: "40/2" },
            { innings: "", fall: "8.3 ov", balwer: "B2", batsman: "lbw B2 5", score: "60/3" },
          ],
        },
      });
      // 2 wickets in powerplay (2.3 and 5.1 ≤ 6.0), 8.3 is after
      expect(computeTrackStatus("powerplay_wickets", "2", makeLive(event))).toBe("on_track");
    });
  });

  describe("player_of_match (NEW - now computable)", () => {
    it('returns "correct" when POTM matches prediction', () => {
      const event = makeEvent({ event_man_of_match: "Virat Kohli" });
      expect(computeTrackStatus("player_of_match", "Virat Kohli", makeLive(event))).toBe("correct");
    });

    it('returns "wrong" when POTM does not match', () => {
      const event = makeEvent({ event_man_of_match: "Virat Kohli" });
      expect(computeTrackStatus("player_of_match", "Faf du Plessis", makeLive(event))).toBe("wrong");
    });

    it('returns "pending" when POTM not yet announced', () => {
      const event = makeEvent({ event_man_of_match: "" });
      expect(computeTrackStatus("player_of_match", "Virat Kohli", makeLive(event))).toBe("pending");
    });
  });

  describe("had_super_over", () => {
    it('always returns "pending" during live', () => {
      const event = makeEvent({
        scorecard: {
          "Team A 1 INN": [makeBatter("P1", 80, 50, 3)],
          "Team B 1 INN": [makeBatter("P2", 80, 50, 3)],
        },
        extra: {
          "Team A 1 INN": { innings: "", nr: "0", text: "", total: "180 ( 20 )", total_overs: null, percent_over: null },
          "Team B 1 INN": { innings: "", nr: "0", text: "", total: "180 ( 20 )", total_overs: null, percent_over: null },
        },
      });
      expect(computeTrackStatus("had_super_over", "Yes", makeLive(event))).toBe("pending");
    });
  });

  describe("empty scorecard", () => {
    it('returns "pending" for non-toss categories', () => {
      const event = makeEvent();
      expect(computeTrackStatus("match_winner", "Team A", makeLive(event))).toBe("pending");
      expect(computeTrackStatus("top_scorer", "Player", makeLive(event))).toBe("pending");
    });
  });

  describe("unknown category", () => {
    it('returns "pending"', () => {
      const event = makeEvent();
      expect(computeTrackStatus("unknown_cat", "value", makeLive(event))).toBe("pending");
    });
  });
});
