import { describe, it, expect } from "vitest";
import { parseScorecardToResults } from "./scorecard-parser";
import type {
  EventResponse,
  ScorecardEntry,
  CommentEntry,
  WicketEntry,
  ExtraEntry,
  LineupsResponse,
} from "@/types/cricket-api";

// ── Helpers to build test fixtures ──────────────────────────────────────

function makeBatter(
  player: string,
  runs: number,
  balls: number,
  fours: number,
  sixes: number,
  status = "c Player b Bowler"
): ScorecardEntry {
  return {
    innings: "",
    player,
    type: "Batsman",
    status,
    R: String(runs),
    B: String(balls),
    Min: "0",
    "4s": String(fours),
    "6s": String(sixes),
    SR: balls > 0 ? String(((runs / balls) * 100).toFixed(2)) : "0.00",
    // Bowling fields — unused for batsmen but required by the type
    O: "0",
    M: "0",
    W: "0",
    ER: "0.00",
  };
}

function makeBowler(
  player: string,
  overs: number,
  maidens: number,
  runs: number,
  wickets: number
): ScorecardEntry {
  return {
    innings: "",
    player,
    type: "Bowler",
    status: "",
    // Batting fields — unused for bowlers but required by the type
    R: String(runs),
    B: "0",
    Min: "0",
    "4s": "0",
    "6s": "0",
    SR: "0.00",
    // Bowling fields
    O: String(overs),
    M: String(maidens),
    W: String(wickets),
    ER: overs > 0 ? String((runs / overs).toFixed(2)) : "0.00",
  };
}

function makeEvent(overrides: Partial<EventResponse> = {}): EventResponse {
  const defaultLineups: LineupsResponse = {
    home_team: { starting_lineups: [] },
    away_team: { starting_lineups: [] },
  };

  return {
    event_key: "match-1",
    event_date_start: "2026-04-01",
    event_date_stop: "2026-04-01",
    event_time: "14:00",
    event_home_team: "Chennai Super Kings",
    home_team_key: "csk-key",
    event_away_team: "Mumbai Indians",
    away_team_key: "mi-key",
    event_stadium: "MA Chidambaram Stadium, Chennai",
    event_home_team_logo: "",
    event_away_team_logo: "",
    event_status: "Finished",
    event_status_info: "Chennai Super Kings won by 15 runs",
    event_live: "0",
    event_toss: "Chennai Super Kings, elected to bat first",
    event_man_of_match: "Ruturaj Gaikwad",
    event_service_home: "",
    event_service_away: "",
    event_home_final_result: "185/5",
    event_away_final_result: "170/7",
    event_home_rr: "9.25",
    event_away_rr: "8.50",
    event_type: "T20",
    league_name: "Indian Premier League 2026",
    league_key: "ipl-2026",
    league_round: "1",
    league_season: "2026",
    scorecard: {},
    comments: {},
    wickets: {},
    extra: {},
    lineups: defaultLineups,
    ...overrides,
  };
}

/** Helper to build an extra entry for an innings. */
function makeExtra(
  inningsKey: string,
  totalRuns: number,
  totalOvers: number
): ExtraEntry {
  return {
    innings: inningsKey,
    nr: "0",
    text: "(w 3, nb 2, lb 3, b 2)",
    total: `${totalRuns} ( ${totalOvers} )`,
    total_overs: null,
    percent_over: null,
  };
}

/** Helper to build a comment (ball-by-ball) entry. */
function makeComment(
  inningsKey: string,
  overs: number,
  balls: number,
  runs: number
): CommentEntry {
  return {
    innings: inningsKey,
    overs: String(overs),
    balls: String(balls),
    runs: String(runs),
    ended: "0",
    post: `${runs} run`,
  };
}

/** Helper to build a wicket entry. */
function makeWicket(
  inningsKey: string,
  fall: string,
  batsman: string,
  score: string
): WicketEntry {
  return {
    innings: inningsKey,
    fall,
    balwer: "Bowler Name",
    batsman,
    score,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("parseScorecardToResults", () => {
  // ── Toss winner parsing ───────────────────────────────────────────

  describe("toss winner parsing from sentence format", () => {
    it("parses toss winner from 'elected to bat' sentence", () => {
      const ev = makeEvent({
        event_toss: "Chennai Super Kings, elected to bat first",
      });
      const result = parseScorecardToResults(ev);
      expect(result.toss_winner).toBe("CSK");
    });

    it("parses toss winner from 'chose to bowl' sentence", () => {
      const ev = makeEvent({
        event_toss: "Mumbai Indians, chose to bowl first",
      });
      const result = parseScorecardToResults(ev);
      expect(result.toss_winner).toBe("MI");
    });

    it("parses toss winner from 'opted to field' sentence", () => {
      const ev = makeEvent({
        event_toss: "Rajasthan Royals, opted to field first",
      });
      const result = parseScorecardToResults(ev);
      expect(result.toss_winner).toBe("RR");
    });

    it("returns null for empty toss string", () => {
      const ev = makeEvent({ event_toss: "" });
      const result = parseScorecardToResults(ev);
      expect(result.toss_winner).toBeNull();
    });

    it("handles RCB Bengaluru variant in toss", () => {
      const ev = makeEvent({
        event_toss: "Royal Challengers Bengaluru, elected to bat first",
      });
      const result = parseScorecardToResults(ev);
      expect(result.toss_winner).toBe("RCB");
    });

    it("handles RCB Bangalore variant in toss", () => {
      const ev = makeEvent({
        event_toss: "Royal Challengers Bangalore, elected to bat first",
      });
      const result = parseScorecardToResults(ev);
      expect(result.toss_winner).toBe("RCB");
    });

    it("falls back to raw name for unknown team in toss", () => {
      const ev = makeEvent({
        event_toss: "Unknown XI, elected to bat first",
      });
      const result = parseScorecardToResults(ev);
      expect(result.toss_winner).toBe("Unknown XI");
    });
  });

  // ── Match winner parsing ──────────────────────────────────────────

  describe("match winner parsing from sentence format", () => {
    it("parses match winner from 'won by runs' sentence", () => {
      const ev = makeEvent({
        event_status_info: "Chennai Super Kings won by 15 runs",
      });
      const result = parseScorecardToResults(ev);
      expect(result.match_winner).toBe("CSK");
    });

    it("parses match winner from 'won by wickets' sentence", () => {
      const ev = makeEvent({
        event_status_info: "Mumbai Indians won by 5 wickets",
      });
      const result = parseScorecardToResults(ev);
      expect(result.match_winner).toBe("MI");
    });

    it("parses match winner with extra parenthetical info", () => {
      const ev = makeEvent({
        event_status_info:
          "Royal Challengers Bengaluru won by 5 wickets (with 22 balls remaining)",
      });
      const result = parseScorecardToResults(ev);
      expect(result.match_winner).toBe("RCB");
    });

    it("returns null for 'no result' status", () => {
      const ev = makeEvent({ event_status_info: "Match abandoned - no result" });
      const result = parseScorecardToResults(ev);
      expect(result.match_winner).toBeNull();
    });

    it("returns null for empty status info", () => {
      const ev = makeEvent({ event_status_info: "" });
      const result = parseScorecardToResults(ev);
      expect(result.match_winner).toBeNull();
    });

    it("falls back to raw name for unknown team in match winner", () => {
      const ev = makeEvent({
        event_status_info: "Unknown XI won by 20 runs",
      });
      const result = parseScorecardToResults(ev);
      expect(result.match_winner).toBe("Unknown XI");
    });
  });

  // ── Player of the match ───────────────────────────────────────────

  describe("player of the match", () => {
    it("extracts player of match from event_man_of_match", () => {
      const ev = makeEvent({ event_man_of_match: "Ruturaj Gaikwad" });
      const result = parseScorecardToResults(ev);
      expect(result.player_of_match).toBe("Ruturaj Gaikwad");
    });

    it("trims whitespace from player of match", () => {
      const ev = makeEvent({ event_man_of_match: "  Virat Kohli  " });
      const result = parseScorecardToResults(ev);
      expect(result.player_of_match).toBe("Virat Kohli");
    });

    it("does not set player_of_match when empty", () => {
      const ev = makeEvent({ event_man_of_match: "" });
      const result = parseScorecardToResults(ev);
      expect(result.player_of_match).toBeUndefined();
    });

    it("does not set player_of_match when whitespace only", () => {
      const ev = makeEvent({ event_man_of_match: "   " });
      const result = parseScorecardToResults(ev);
      expect(result.player_of_match).toBeUndefined();
    });
  });

  // ── Empty scorecard ───────────────────────────────────────────────

  describe("empty scorecard", () => {
    it("returns only toss and match winner when scorecard is empty", () => {
      const ev = makeEvent({ scorecard: {} });
      const result = parseScorecardToResults(ev);
      expect(result.toss_winner).toBe("CSK");
      expect(result.match_winner).toBe("CSK");
      expect(result.first_innings_score).toBeUndefined();
      expect(result.total_match_runs).toBeUndefined();
      expect(result.top_scorer).toBeUndefined();
    });
  });

  // ── Full scorecard ────────────────────────────────────────────────

  describe("full scorecard", () => {
    const FIRST_KEY = "Chennai Super Kings 1 INN";
    const SECOND_KEY = "Mumbai Indians 1 INN";

    const fullEvent = makeEvent({
      scorecard: {
        [FIRST_KEY]: [
          makeBatter("Ruturaj Gaikwad", 72, 45, 8, 3),
          makeBatter("Devon Conway", 45, 35, 5, 2),
          makeBatter("Shivam Dube", 30, 20, 2, 2),
          makeBatter("MS Dhoni", 18, 10, 1, 1),
          makeBowler("Deepak Chahar", 4, 0, 35, 2),
          makeBowler("Ravindra Jadeja", 4, 0, 30, 2),
        ],
        [SECOND_KEY]: [
          makeBatter("Rohit Sharma", 55, 40, 6, 3),
          makeBatter("Suryakumar Yadav", 40, 28, 4, 1),
          makeBatter("Ishan Kishan", 25, 18, 3, 0),
          makeBatter("Hardik Pandya", 35, 22, 2, 2),
          makeBowler("Jasprit Bumrah", 4, 1, 28, 3),
          makeBowler("Trent Boult", 4, 0, 42, 1),
        ],
      },
      extra: {
        [FIRST_KEY]: makeExtra(FIRST_KEY, 185, 20),
        [SECOND_KEY]: makeExtra(SECOND_KEY, 170, 20),
      },
    });

    it("extracts first innings score from extra total", () => {
      const result = parseScorecardToResults(fullEvent);
      expect(result.first_innings_score).toBe(185);
    });

    it("extracts first innings wickets from bowler W fields", () => {
      const result = parseScorecardToResults(fullEvent);
      // Bowlers in first innings are CSK's bowlers batting in second key?
      // No — first innings key is FIRST_KEY, bowlers in that entry are the
      // bowling side (MI bowlers). But in our test data structure, we put
      // bowlers in the same innings entry. Looking at the parser:
      // firstBowlers = filterBowlers(event.scorecard[firstKey])
      // That means bowlers listed under FIRST_KEY. In our data:
      // FIRST_KEY has Deepak Chahar (W=2) and Ravindra Jadeja (W=2) => 4
      // Wait, those are CSK bowlers — but they're listed under the CSK innings key.
      // The API puts bowlers in the batting team's innings entry.
      // So first_innings_wickets = sum of W for bowlers in FIRST_KEY = 2+2 = 4
      expect(result.first_innings_wickets).toBe(4);
    });

    it("computes total match runs from both innings extras", () => {
      const result = parseScorecardToResults(fullEvent);
      expect(result.total_match_runs).toBe(355); // 185 + 170
    });

    it("computes total match wickets from all bowlers", () => {
      const result = parseScorecardToResults(fullEvent);
      // First innings bowlers (FIRST_KEY): Chahar 2 + Jadeja 2 = 4
      // Second innings bowlers (SECOND_KEY): Bumrah 3 + Boult 1 = 4
      expect(result.total_match_wickets).toBe(8);
    });

    it("computes total match sixes from all batsmen", () => {
      const result = parseScorecardToResults(fullEvent);
      // FIRST_KEY batsmen: 3+2+2+1 = 8
      // SECOND_KEY batsmen: 3+1+0+2 = 6
      // Total = 14
      expect(result.total_match_sixes).toBe(14);
    });

    it("identifies top scorer across both innings", () => {
      const result = parseScorecardToResults(fullEvent);
      expect(result.top_scorer).toBe("Ruturaj Gaikwad");
      expect(result.top_scorer_runs).toBe(72);
    });

    it("identifies top wicket taker across both innings", () => {
      const result = parseScorecardToResults(fullEvent);
      // Bumrah: 3, Chahar: 2, Jadeja: 2, Boult: 1
      expect(result.top_wicket_taker).toBe("Jasprit Bumrah");
      expect(result.top_wicket_taker_wickets).toBe(3);
    });

    it("identifies most sixes player", () => {
      const result = parseScorecardToResults(fullEvent);
      // Gaikwad: 3, Sharma: 3 — strict greater, so Gaikwad stays (first encountered)
      expect(result.most_sixes_player).toBe("Ruturaj Gaikwad");
    });

    it("detects batsman scored fifty", () => {
      const result = parseScorecardToResults(fullEvent);
      // Gaikwad: 72, Sharma: 55
      expect(result.batsman_scored_fifty).toBe(true);
    });

    it("detects bowler took three wickets", () => {
      const result = parseScorecardToResults(fullEvent);
      // Bumrah: 3
      expect(result.bowler_took_three).toBe(true);
    });
  });

  // ── No fifty, no three-wicket haul ────────────────────────────────

  describe("no fifty, no three-wicket haul", () => {
    const FIRST_KEY = "Team A 1 INN";
    const SECOND_KEY = "Team B 1 INN";

    const modestEvent = makeEvent({
      event_toss: "Chennai Super Kings, elected to bat first",
      event_status_info: "Chennai Super Kings won by 20 runs",
      scorecard: {
        [FIRST_KEY]: [
          makeBatter("Batter A", 45, 30, 5, 1),
          makeBatter("Batter B", 30, 25, 3, 0),
          makeBowler("Bowler X", 4, 0, 25, 1),
        ],
        [SECOND_KEY]: [
          makeBatter("Batter C", 40, 35, 4, 0),
          makeBatter("Batter D", 20, 15, 2, 0),
          makeBowler("Bowler Y", 4, 0, 30, 2),
        ],
      },
      extra: {
        [FIRST_KEY]: makeExtra(FIRST_KEY, 120, 20),
        [SECOND_KEY]: makeExtra(SECOND_KEY, 100, 20),
      },
    });

    it("batsman_scored_fifty is false when no one reaches 50", () => {
      const result = parseScorecardToResults(modestEvent);
      expect(result.batsman_scored_fifty).toBe(false);
    });

    it("bowler_took_three is false when no one takes 3+", () => {
      const result = parseScorecardToResults(modestEvent);
      expect(result.bowler_took_three).toBe(false);
    });
  });

  // ── Super over detection ──────────────────────────────────────────

  describe("super over detection", () => {
    const dummyBatting = makeBatter("X", 50, 30, 5, 2);
    const dummyBowling = makeBowler("Y", 4, 0, 30, 1);

    it("had_super_over is false with 2 innings", () => {
      const ev = makeEvent({
        scorecard: {
          "Team A 1 INN": [dummyBatting, dummyBowling],
          "Team B 1 INN": [dummyBatting, dummyBowling],
        },
        extra: {
          "Team A 1 INN": makeExtra("Team A 1 INN", 150, 20),
          "Team B 1 INN": makeExtra("Team B 1 INN", 150, 20),
        },
      });
      const result = parseScorecardToResults(ev);
      expect(result.had_super_over).toBe(false);
    });

    it("had_super_over is true with more than 2 innings", () => {
      const ev = makeEvent({
        event_status_info:
          "Match tied (Team A won Super Over)",
        scorecard: {
          "Team A 1 INN": [dummyBatting, dummyBowling],
          "Team B 1 INN": [dummyBatting, dummyBowling],
          "Team A 2 INN": [dummyBatting, dummyBowling],
          "Team B 2 INN": [dummyBatting, dummyBowling],
        },
        extra: {
          "Team A 1 INN": makeExtra("Team A 1 INN", 150, 20),
          "Team B 1 INN": makeExtra("Team B 1 INN", 150, 20),
          "Team A 2 INN": makeExtra("Team A 2 INN", 15, 1),
          "Team B 2 INN": makeExtra("Team B 2 INN", 12, 1),
        },
      });
      const result = parseScorecardToResults(ev);
      expect(result.had_super_over).toBe(true);
    });
  });

  // ── First innings score from extra ────────────────────────────────

  describe("first innings score from extra", () => {
    it("parses runs from 'total' field format '185 ( 20 )'", () => {
      const KEY = "CSK 1 INN";
      const ev = makeEvent({
        scorecard: { [KEY]: [makeBatter("A", 50, 30, 5, 2)] },
        extra: { [KEY]: makeExtra(KEY, 185, 20) },
      });
      const result = parseScorecardToResults(ev);
      expect(result.first_innings_score).toBe(185);
    });

    it("parses runs from partial overs format '142 ( 18.3 )'", () => {
      const KEY = "CSK 1 INN";
      const ev = makeEvent({
        scorecard: { [KEY]: [makeBatter("A", 50, 30, 5, 2)] },
        extra: {
          [KEY]: {
            innings: KEY,
            nr: "0",
            text: "(w 3, nb 1)",
            total: "142 ( 18.3 )",
            total_overs: null,
            percent_over: null,
          },
        },
      });
      const result = parseScorecardToResults(ev);
      expect(result.first_innings_score).toBe(142);
    });

    it("returns undefined when extra is missing", () => {
      const KEY = "CSK 1 INN";
      const ev = makeEvent({
        scorecard: { [KEY]: [makeBatter("A", 50, 30, 5, 2)] },
        extra: {},
      });
      const result = parseScorecardToResults(ev);
      expect(result.first_innings_score).toBeUndefined();
    });
  });

  // ── Powerplay score from comments ─────────────────────────────────

  describe("powerplay score from comments", () => {
    const FIRST_KEY = "Team A 1 INN";
    const SECOND_KEY = "Team B 1 INN";

    it("sums runs from ball-by-ball for first 6 overs", () => {
      const comments: CommentEntry[] = [
        makeComment(FIRST_KEY, 0.1, 1, 4),
        makeComment(FIRST_KEY, 0.2, 2, 1),
        makeComment(FIRST_KEY, 0.3, 3, 0),
        makeComment(FIRST_KEY, 1.1, 1, 6),
        makeComment(FIRST_KEY, 2.1, 1, 2),
        makeComment(FIRST_KEY, 3.1, 1, 4),
        makeComment(FIRST_KEY, 4.1, 1, 1),
        makeComment(FIRST_KEY, 5.1, 1, 3),
        makeComment(FIRST_KEY, 5.6, 6, 2),
        // Over 6.0 is still within powerplay (0-5.6 is 6 overs)
        makeComment(FIRST_KEY, 6.0, 6, 1),
        // Over 7 is outside powerplay — should stop here
        makeComment(FIRST_KEY, 7.1, 1, 4),
      ];

      const ev = makeEvent({
        scorecard: {
          [FIRST_KEY]: [makeBatter("A", 50, 30, 5, 2), makeBowler("B", 4, 0, 30, 1)],
          [SECOND_KEY]: [makeBatter("C", 40, 30, 4, 1), makeBowler("D", 4, 0, 25, 0)],
        },
        comments: { [FIRST_KEY]: comments },
        extra: {
          [FIRST_KEY]: makeExtra(FIRST_KEY, 150, 20),
          [SECOND_KEY]: makeExtra(SECOND_KEY, 140, 20),
        },
      });
      const result = parseScorecardToResults(ev);
      // 4+1+0+6+2+4+1+3+2+1 = 24 (all balls up to and including over 6.0)
      expect(result.powerplay_score).toBe(24);
    });

    it("returns undefined when comments are empty", () => {
      const ev = makeEvent({
        scorecard: {
          [FIRST_KEY]: [makeBatter("A", 50, 30, 5, 2), makeBowler("B", 4, 0, 30, 1)],
          [SECOND_KEY]: [makeBatter("C", 40, 30, 4, 1), makeBowler("D", 4, 0, 25, 0)],
        },
        comments: {},
        extra: {
          [FIRST_KEY]: makeExtra(FIRST_KEY, 150, 20),
          [SECOND_KEY]: makeExtra(SECOND_KEY, 140, 20),
        },
      });
      const result = parseScorecardToResults(ev);
      expect(result.powerplay_score).toBeUndefined();
    });
  });

  // ── Powerplay wickets from wickets object ─────────────────────────

  describe("powerplay wickets from wickets object", () => {
    const FIRST_KEY = "Team A 1 INN";
    const SECOND_KEY = "Team B 1 INN";

    function makeFullEvent(
      firstWickets: WicketEntry[]
    ): EventResponse {
      return makeEvent({
        scorecard: {
          [FIRST_KEY]: [makeBatter("A", 50, 30, 5, 2), makeBowler("B", 4, 0, 30, 1)],
          [SECOND_KEY]: [makeBatter("C", 40, 30, 4, 1), makeBowler("D", 4, 0, 25, 0)],
        },
        wickets: {
          [FIRST_KEY]: firstWickets,
        },
        extra: {
          [FIRST_KEY]: makeExtra(FIRST_KEY, 150, 20),
          [SECOND_KEY]: makeExtra(SECOND_KEY, 140, 20),
        },
      });
    }

    it("counts wickets that fell within first 6 overs", () => {
      const ev = makeFullEvent([
        makeWicket(FIRST_KEY, "2.3 ov", "c X b Y 12", "25/1"),
        makeWicket(FIRST_KEY, "5.1 ov", "b Y 8", "45/2"),
        makeWicket(FIRST_KEY, "8.4 ov", "lbw b Z 15", "70/3"),
      ]);
      const result = parseScorecardToResults(ev);
      expect(result.powerplay_wickets).toBe(2);
    });

    it("returns 0 when no wickets fell in powerplay", () => {
      const ev = makeFullEvent([
        makeWicket(FIRST_KEY, "7.2 ov", "c X b Y 30", "65/1"),
        makeWicket(FIRST_KEY, "12.0 ov", "run out 22", "100/2"),
      ]);
      const result = parseScorecardToResults(ev);
      expect(result.powerplay_wickets).toBe(0);
    });

    it("returns 0 when wickets array is empty", () => {
      const ev = makeFullEvent([]);
      const result = parseScorecardToResults(ev);
      expect(result.powerplay_wickets).toBe(0);
    });

    it("counts wickets at exactly 6.0 overs as in powerplay", () => {
      const ev = makeFullEvent([
        makeWicket(FIRST_KEY, "6.0 ov", "c A b B 20", "50/1"),
      ]);
      const result = parseScorecardToResults(ev);
      expect(result.powerplay_wickets).toBe(1);
    });
  });

  // ── First wicket over from wickets object ─────────────────────────

  describe("first wicket over from wickets object", () => {
    const FIRST_KEY = "Team A 1 INN";
    const SECOND_KEY = "Team B 1 INN";

    function makeFullEvent(
      firstWickets: WicketEntry[]
    ): EventResponse {
      return makeEvent({
        scorecard: {
          [FIRST_KEY]: [makeBatter("A", 50, 30, 5, 2), makeBowler("B", 4, 0, 30, 1)],
          [SECOND_KEY]: [makeBatter("C", 40, 30, 4, 1), makeBowler("D", 4, 0, 25, 0)],
        },
        wickets: {
          [FIRST_KEY]: firstWickets,
        },
        extra: {
          [FIRST_KEY]: makeExtra(FIRST_KEY, 150, 20),
          [SECOND_KEY]: makeExtra(SECOND_KEY, 140, 20),
        },
      });
    }

    it("returns ceiling of first wicket fall over", () => {
      const ev = makeFullEvent([
        makeWicket(FIRST_KEY, "3.4 ov", "c X b Y 12", "28/1"),
        makeWicket(FIRST_KEY, "8.2 ov", "b Z 20", "65/2"),
      ]);
      const result = parseScorecardToResults(ev);
      expect(result.first_wicket_over).toBe(4); // ceil(3.4) = 4
    });

    it("returns 1 for wicket in first over", () => {
      const ev = makeFullEvent([
        makeWicket(FIRST_KEY, "0.3 ov", "c A b B 0", "2/1"),
      ]);
      const result = parseScorecardToResults(ev);
      expect(result.first_wicket_over).toBe(1); // ceil(0.3) = 1
    });

    it("does not set first_wicket_over when no wickets", () => {
      const ev = makeFullEvent([]);
      const result = parseScorecardToResults(ev);
      expect(result.first_wicket_over).toBeUndefined();
    });
  });

  // ── Most sixes player with no sixes ───────────────────────────────

  describe("most sixes player with no sixes", () => {
    it("does not set most_sixes_player when no sixes hit", () => {
      const FIRST_KEY = "Team A 1 INN";
      const SECOND_KEY = "Team B 1 INN";
      const ev = makeEvent({
        scorecard: {
          [FIRST_KEY]: [
            makeBatter("X", 50, 40, 5, 0),
            makeBowler("Y", 4, 0, 35, 2),
          ],
          [SECOND_KEY]: [
            makeBatter("Z", 60, 45, 7, 0),
            makeBowler("W", 4, 0, 30, 1),
          ],
        },
        extra: {
          [FIRST_KEY]: makeExtra(FIRST_KEY, 150, 20),
          [SECOND_KEY]: makeExtra(SECOND_KEY, 155, 20),
        },
      });
      const result = parseScorecardToResults(ev);
      expect(result.most_sixes_player).toBeUndefined();
    });
  });

  // ── Dismissal status field ────────────────────────────────────────

  describe("dismissal status differentiation", () => {
    it("handles not out status", () => {
      const KEY = "Team A 1 INN";
      const KEY2 = "Team B 1 INN";
      const ev = makeEvent({
        scorecard: {
          [KEY]: [
            makeBatter("Batter A", 80, 50, 8, 4, "not out"),
            makeBatter("Batter B", 30, 20, 3, 1, "c X b Y"),
            makeBowler("Bowler A", 4, 0, 30, 1),
          ],
          [KEY2]: [
            makeBatter("Batter C", 40, 30, 4, 0, "b Z"),
            makeBowler("Bowler B", 4, 0, 40, 2),
          ],
        },
        extra: {
          [KEY]: makeExtra(KEY, 160, 20),
          [KEY2]: makeExtra(KEY2, 120, 20),
        },
      });
      const result = parseScorecardToResults(ev);
      // The parser does not use dismissal status for results — just verify
      // it still processes batsmen correctly regardless of status
      expect(result.top_scorer).toBe("Batter A");
      expect(result.top_scorer_runs).toBe(80);
    });
  });

  // ── Total match runs and wickets ──────────────────────────────────

  describe("total match runs and wickets", () => {
    it("computes correctly with uneven innings", () => {
      const KEY1 = "Team A 1 INN";
      const KEY2 = "Team B 1 INN";
      const ev = makeEvent({
        scorecard: {
          [KEY1]: [
            makeBatter("A", 100, 60, 10, 5),
            makeBowler("B", 4, 0, 40, 1),
          ],
          [KEY2]: [
            makeBatter("C", 20, 15, 2, 0),
            makeBowler("D", 4, 0, 50, 4),
          ],
        },
        extra: {
          [KEY1]: makeExtra(KEY1, 200, 20),
          [KEY2]: makeExtra(KEY2, 90, 14.2),
        },
      });
      const result = parseScorecardToResults(ev);
      expect(result.total_match_runs).toBe(290); // 200 + 90
      expect(result.total_match_wickets).toBe(5); // 1 + 4
    });

    it("does not compute totals with only one innings", () => {
      const KEY = "Team A 1 INN";
      const ev = makeEvent({
        scorecard: {
          [KEY]: [
            makeBatter("A", 50, 30, 5, 2),
            makeBowler("B", 4, 0, 30, 1),
          ],
        },
        extra: {
          [KEY]: makeExtra(KEY, 150, 20),
        },
      });
      const result = parseScorecardToResults(ev);
      expect(result.first_innings_score).toBe(150);
      expect(result.total_match_runs).toBeUndefined();
      expect(result.total_match_wickets).toBeUndefined();
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles scorecard with entries that have zero/empty string values", () => {
      const KEY1 = "Team A 1 INN";
      const KEY2 = "Team B 1 INN";
      const ev = makeEvent({
        scorecard: {
          [KEY1]: [
            makeBatter("Zero Batter", 0, 1, 0, 0),
            makeBowler("Zero Bowler", 1, 0, 0, 0),
          ],
          [KEY2]: [
            makeBatter("Another Batter", 0, 2, 0, 0),
            makeBowler("Another Bowler", 2, 0, 0, 0),
          ],
        },
        extra: {
          [KEY1]: makeExtra(KEY1, 0, 1),
          [KEY2]: makeExtra(KEY2, 0, 2),
        },
      });
      const result = parseScorecardToResults(ev);
      expect(result.total_match_runs).toBe(0);
      expect(result.total_match_wickets).toBe(0);
      expect(result.total_match_sixes).toBe(0);
      expect(result.top_scorer).toBeUndefined(); // No one scored > 0
      expect(result.top_wicket_taker).toBeUndefined(); // No one took > 0
      expect(result.most_sixes_player).toBeUndefined();
      expect(result.batsman_scored_fifty).toBe(false);
      expect(result.bowler_took_three).toBe(false);
    });

    it("handles event with all empty/default fields", () => {
      const ev = makeEvent({
        event_toss: "",
        event_status_info: "",
        event_man_of_match: "",
        scorecard: {},
        comments: {},
        wickets: {},
        extra: {},
      });
      const result = parseScorecardToResults(ev);
      expect(result.toss_winner).toBeNull();
      expect(result.match_winner).toBeNull();
      expect(result.player_of_match).toBeUndefined();
      expect(result.first_innings_score).toBeUndefined();
    });

    it("handles innings with only batsmen, no bowlers", () => {
      const KEY1 = "Team A 1 INN";
      const KEY2 = "Team B 1 INN";
      const ev = makeEvent({
        scorecard: {
          [KEY1]: [makeBatter("A", 50, 30, 5, 2)],
          [KEY2]: [makeBatter("B", 40, 25, 4, 1)],
        },
        extra: {
          [KEY1]: makeExtra(KEY1, 100, 20),
          [KEY2]: makeExtra(KEY2, 80, 20),
        },
      });
      const result = parseScorecardToResults(ev);
      expect(result.total_match_runs).toBe(180);
      expect(result.total_match_wickets).toBe(0);
      expect(result.top_scorer).toBe("A");
      expect(result.top_wicket_taker).toBeUndefined();
    });

    it("handles innings with only bowlers, no batsmen", () => {
      const KEY1 = "Team A 1 INN";
      const KEY2 = "Team B 1 INN";
      const ev = makeEvent({
        scorecard: {
          [KEY1]: [makeBowler("X", 4, 0, 30, 2)],
          [KEY2]: [makeBowler("Y", 4, 0, 25, 3)],
        },
        extra: {
          [KEY1]: makeExtra(KEY1, 100, 20),
          [KEY2]: makeExtra(KEY2, 80, 20),
        },
      });
      const result = parseScorecardToResults(ev);
      expect(result.total_match_wickets).toBe(5);
      expect(result.top_scorer).toBeUndefined();
      expect(result.top_wicket_taker).toBe("Y");
      expect(result.total_match_sixes).toBe(0);
    });

    it("handles malformed extra total string gracefully", () => {
      const KEY = "Team A 1 INN";
      const ev = makeEvent({
        scorecard: {
          [KEY]: [makeBatter("A", 50, 30, 5, 2)],
        },
        extra: {
          [KEY]: {
            innings: KEY,
            nr: "0",
            text: "",
            total: "invalid data here",
            total_overs: null,
            percent_over: null,
          },
        },
      });
      const result = parseScorecardToResults(ev);
      expect(result.first_innings_score).toBeUndefined();
    });
  });
});
