import { computeTrackStatus, type TrackStatus } from "./on-track-logic";
import type {
  ScorecardResponse,
  InningsScorecard,
  BattingEntry,
  BowlingEntry,
} from "@/types/cricket-api";

// ── Helpers ─────────────────────────────────────────────────────────────

function makeBatter(
  name: string,
  runs: number,
  balls: number,
  sixes: number,
  dismissal = "c Fielder b Bowler"
): BattingEntry {
  return {
    batsman: { id: name.toLowerCase().replace(/\s/g, "-"), name },
    dismissal,
    "dismissal-text": dismissal,
    r: runs,
    b: balls,
    "4s": 0,
    "6s": sixes,
    sr: balls > 0 ? (runs / balls) * 100 : 0,
  };
}

function makeBowler(name: string, overs: number, wickets: number): BowlingEntry {
  return {
    bowler: { id: name.toLowerCase().replace(/\s/g, "-"), name },
    o: overs,
    m: 0,
    r: overs * 8,
    w: wickets,
    nb: 0,
    wd: 0,
    eco: 8,
  };
}

function makeInnings(
  inning: string,
  batting: BattingEntry[],
  bowling: BowlingEntry[],
  totals: { r: number; w: number; o: number }
): InningsScorecard {
  return {
    batting,
    bowling,
    extras: { r: 5, b: 0 },
    totals,
    inning,
  };
}

function makeScorecard(
  overrides: Partial<ScorecardResponse> = {}
): ScorecardResponse {
  return {
    id: "m1",
    name: "CSK vs MI",
    matchType: "t20",
    status: "",
    venue: "Chennai",
    date: "2026-04-01",
    dateTimeGMT: "2026-04-01T14:00:00",
    teams: ["CSK", "MI"],
    teamInfo: [
      { name: "CSK", shortname: "CSK", img: "" },
      { name: "MI", shortname: "MI", img: "" },
    ],
    score: [],
    tossWinner: "",
    tossChoice: "bat",
    matchWinner: "",
    matchStarted: true,
    matchEnded: false,
    scorecard: [],
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("computeTrackStatus", () => {
  describe("completed match", () => {
    it('returns "pending" when matchStatus is completed', () => {
      const sc = makeScorecard();
      expect(computeTrackStatus("match_winner", "CSK", { scorecard: sc, matchStatus: "completed" }))
        .toBe("pending");
    });
  });

  describe("toss_winner", () => {
    it('returns "correct" when toss prediction matches', () => {
      const sc = makeScorecard({ tossWinner: "CSK" });
      expect(computeTrackStatus("toss_winner", "CSK", { scorecard: sc, matchStatus: "live" }))
        .toBe("correct");
    });

    it('returns "wrong" when toss prediction does not match', () => {
      const sc = makeScorecard({ tossWinner: "MI" });
      expect(computeTrackStatus("toss_winner", "CSK", { scorecard: sc, matchStatus: "live" }))
        .toBe("wrong");
    });

    it('returns "pending" when tossWinner is empty', () => {
      const sc = makeScorecard({ tossWinner: "" });
      expect(computeTrackStatus("toss_winner", "CSK", { scorecard: sc, matchStatus: "live" }))
        .toBe("pending");
    });

    it('returns correct/wrong from toss even with scorecard data', () => {
      const first = makeInnings("CSK Inning 1", [], [], { r: 100, w: 3, o: 10 });
      const sc = makeScorecard({ tossWinner: "MI", scorecard: [first] });
      expect(computeTrackStatus("toss_winner", "MI", { scorecard: sc, matchStatus: "live" }))
        .toBe("correct");
    });
  });

  describe("empty scorecard (toss only)", () => {
    it('returns "pending" for non-toss categories with empty scorecard', () => {
      const sc = makeScorecard({ tossWinner: "CSK" });
      expect(computeTrackStatus("match_winner", "CSK", { scorecard: sc, matchStatus: "live" }))
        .toBe("pending");
      expect(computeTrackStatus("first_innings_score", "<150", { scorecard: sc, matchStatus: "live" }))
        .toBe("pending");
    });
  });

  describe("match_winner", () => {
    it('returns "pending" when only first innings available', () => {
      const first = makeInnings("CSK Inning 1", [], [], { r: 180, w: 5, o: 20 });
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("match_winner", "CSK", { scorecard: sc, matchStatus: "live" }))
        .toBe("pending");
    });

    it('returns "on_track" when chasing team has reached target', () => {
      const first = makeInnings("CSK Inning 1", [], [], { r: 150, w: 5, o: 20 });
      const second = makeInnings("MI Inning 1", [], [], { r: 155, w: 3, o: 18 });
      const sc = makeScorecard({ scorecard: [first, second] });
      // MI has reached target (151), so MI is on track
      expect(computeTrackStatus("match_winner", "MI", { scorecard: sc, matchStatus: "live" }))
        .toBe("on_track");
    });

    it('returns "in_danger" when chasing team has reached target but predicted batting first', () => {
      const first = makeInnings("CSK Inning 1", [], [], { r: 150, w: 5, o: 20 });
      const second = makeInnings("MI Inning 1", [], [], { r: 155, w: 3, o: 18 });
      const sc = makeScorecard({ scorecard: [first, second] });
      expect(computeTrackStatus("match_winner", "CSK", { scorecard: sc, matchStatus: "live" }))
        .toBe("in_danger");
    });

    it('returns "on_track" for batting first when chasing team all out', () => {
      const first = makeInnings("CSK Inning 1", [], [], { r: 180, w: 5, o: 20 });
      const second = makeInnings("MI Inning 1", [], [], { r: 120, w: 10, o: 18 });
      const sc = makeScorecard({ scorecard: [first, second] });
      expect(computeTrackStatus("match_winner", "CSK", { scorecard: sc, matchStatus: "live" }))
        .toBe("on_track");
    });

    it('returns "in_danger" for chasing team when all out', () => {
      const first = makeInnings("CSK Inning 1", [], [], { r: 180, w: 5, o: 20 });
      const second = makeInnings("MI Inning 1", [], [], { r: 120, w: 10, o: 18 });
      const sc = makeScorecard({ scorecard: [first, second] });
      expect(computeTrackStatus("match_winner", "MI", { scorecard: sc, matchStatus: "live" }))
        .toBe("in_danger");
    });

    it('returns "on_track" for batting first when required rate > 12', () => {
      const first = makeInnings("CSK Inning 1", [], [], { r: 200, w: 5, o: 20 });
      // MI needs 201, scored 50 in 15 overs. Remaining: 5 overs, need 151. RR = 151/5 = 30.2
      const second = makeInnings("MI Inning 1", [], [], { r: 50, w: 4, o: 15 });
      const sc = makeScorecard({ scorecard: [first, second] });
      expect(computeTrackStatus("match_winner", "CSK", { scorecard: sc, matchStatus: "live" }))
        .toBe("on_track");
    });

    it('returns "on_track" for chasing team when required rate < 8', () => {
      const first = makeInnings("CSK Inning 1", [], [], { r: 150, w: 5, o: 20 });
      // MI needs 151, scored 120 in 15 overs. Remaining: 5 overs, need 31. RR = 31/5 = 6.2
      const second = makeInnings("MI Inning 1", [], [], { r: 120, w: 3, o: 15 });
      const sc = makeScorecard({ scorecard: [first, second] });
      expect(computeTrackStatus("match_winner", "MI", { scorecard: sc, matchStatus: "live" }))
        .toBe("on_track");
    });

    it('returns "pending" when required rate is between 8 and 12', () => {
      const first = makeInnings("CSK Inning 1", [], [], { r: 180, w: 5, o: 20 });
      // MI needs 181, scored 100 in 10 overs. Remaining: 10 overs, need 81. RR = 8.1
      const second = makeInnings("MI Inning 1", [], [], { r: 100, w: 3, o: 10 });
      const sc = makeScorecard({ scorecard: [first, second] });
      expect(computeTrackStatus("match_winner", "MI", { scorecard: sc, matchStatus: "live" }))
        .toBe("pending");
    });
  });

  describe("first_innings_score", () => {
    it("projects during first innings and matches bracket", () => {
      // 80 runs in 10 overs => projected 160 => bracket 150-169 should match
      const first = makeInnings("CSK Inning 1", [], [], { r: 80, w: 2, o: 10 });
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("first_innings_score", "150-169", { scorecard: sc, matchStatus: "live" }))
        .toBe("on_track");
    });

    it("projects during first innings and does not match bracket", () => {
      // 80 in 10 overs => projected 160 => "<150" does not match
      const first = makeInnings("CSK Inning 1", [], [], { r: 80, w: 2, o: 10 });
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("first_innings_score", "<150", { scorecard: sc, matchStatus: "live" }))
        .toBe("in_danger");
    });

    it("resolves after first innings is complete (second innings started)", () => {
      const first = makeInnings("CSK Inning 1", [], [], { r: 185, w: 5, o: 20 });
      const second = makeInnings("MI Inning 1", [], [], { r: 50, w: 2, o: 8 });
      const sc = makeScorecard({ scorecard: [first, second] });
      // 185 falls in 170-189
      expect(computeTrackStatus("first_innings_score", "170-189", { scorecard: sc, matchStatus: "live" }))
        .toBe("on_track");
      expect(computeTrackStatus("first_innings_score", "190+", { scorecard: sc, matchStatus: "live" }))
        .toBe("in_danger");
    });

    it('returns "pending" when 0 overs bowled', () => {
      const first = makeInnings("CSK Inning 1", [], [], { r: 0, w: 0, o: 0 });
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("first_innings_score", "150-169", { scorecard: sc, matchStatus: "live" }))
        .toBe("pending");
    });
  });

  describe("total_match_runs", () => {
    it("projects total runs and matches bracket", () => {
      // 100 runs in 10 overs => projected over 40 overs = 400+
      const first = makeInnings("A Inning 1", [], [], { r: 100, w: 3, o: 10 });
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("total_match_runs", "400+", { scorecard: sc, matchStatus: "live" }))
        .toBe("on_track");
    });

    it("projects total runs that do not match bracket", () => {
      // 60 runs in 10 overs => projected 240 over 40 => "<300" bracket
      const first = makeInnings("A Inning 1", [], [], { r: 60, w: 3, o: 10 });
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("total_match_runs", "<300", { scorecard: sc, matchStatus: "live" }))
        .toBe("on_track");
      expect(computeTrackStatus("total_match_runs", "400+", { scorecard: sc, matchStatus: "live" }))
        .toBe("in_danger");
    });

    it('returns "pending" when no overs bowled', () => {
      const first = makeInnings("A Inning 1", [], [], { r: 0, w: 0, o: 0 });
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("total_match_runs", "300-349", { scorecard: sc, matchStatus: "live" }))
        .toBe("pending");
    });
  });

  describe("total_sixes", () => {
    it("projects and matches bracket", () => {
      // 5 sixes in 10 overs => projected 20 over 40 => 15-25
      const first = makeInnings(
        "A Inning 1",
        [makeBatter("X", 50, 30, 5, "out")],
        [],
        { r: 80, w: 3, o: 10 }
      );
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("total_sixes", "15-25", { scorecard: sc, matchStatus: "live" }))
        .toBe("on_track");
    });

    it('returns "pending" when 0 overs', () => {
      const first = makeInnings("A Inning 1", [], [], { r: 0, w: 0, o: 0 });
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("total_sixes", "15-25", { scorecard: sc, matchStatus: "live" }))
        .toBe("pending");
    });
  });

  describe("total_wickets", () => {
    it("projects and matches bracket", () => {
      // 4 wickets in 10 overs => projected 16 over 40 => 16-18
      const first = makeInnings("A Inning 1", [], [], { r: 80, w: 4, o: 10 });
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("total_wickets", "16-18", { scorecard: sc, matchStatus: "live" }))
        .toBe("on_track");
    });

    it("projected does not match bracket", () => {
      // 4 wickets in 10 overs => projected 16 => "22+" does not match
      const first = makeInnings("A Inning 1", [], [], { r: 80, w: 4, o: 10 });
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("total_wickets", "22+", { scorecard: sc, matchStatus: "live" }))
        .toBe("in_danger");
    });
  });

  describe("batsman_fifty", () => {
    it('"Yes" is on_track when someone has scored 50+', () => {
      const first = makeInnings(
        "A Inning 1",
        [makeBatter("X", 55, 35, 2, "c F b B")],
        [],
        { r: 100, w: 3, o: 15 }
      );
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("batsman_fifty", "Yes", { scorecard: sc, matchStatus: "live" }))
        .toBe("on_track");
    });

    it('"Yes" is on_track when a batter at 30+ is not out', () => {
      const first = makeInnings(
        "A Inning 1",
        [makeBatter("X", 35, 25, 1, "not out")],
        [],
        { r: 80, w: 2, o: 10 }
      );
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("batsman_fifty", "Yes", { scorecard: sc, matchStatus: "live" }))
        .toBe("on_track");
    });

    it('"Yes" is in_danger when almost all out and nobody near 50', () => {
      const first = makeInnings(
        "A Inning 1",
        [
          makeBatter("A", 20, 15, 0, "caught"),
          makeBatter("B", 25, 20, 0, "caught"),
        ],
        [],
        { r: 120, w: 9, o: 18 }
      );
      const second = makeInnings(
        "B Inning 1",
        [
          makeBatter("C", 15, 10, 0, "caught"),
          makeBatter("D", 30, 25, 0, "caught"),
        ],
        [],
        { r: 80, w: 9, o: 15 }
      );
      const sc = makeScorecard({ scorecard: [first, second] });
      expect(computeTrackStatus("batsman_fifty", "Yes", { scorecard: sc, matchStatus: "live" }))
        .toBe("in_danger");
    });

    it('"No" is in_danger when someone has scored 50+', () => {
      const first = makeInnings(
        "A Inning 1",
        [makeBatter("X", 65, 40, 3, "c F b B")],
        [],
        { r: 100, w: 3, o: 15 }
      );
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("batsman_fifty", "No", { scorecard: sc, matchStatus: "live" }))
        .toBe("in_danger");
    });

    it('"No" is in_danger when someone at 40+ is not out', () => {
      const first = makeInnings(
        "A Inning 1",
        [makeBatter("X", 42, 30, 1, "not out")],
        [],
        { r: 80, w: 2, o: 10 }
      );
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("batsman_fifty", "No", { scorecard: sc, matchStatus: "live" }))
        .toBe("in_danger");
    });

    it('"No" is on_track when no one near 50', () => {
      const first = makeInnings(
        "A Inning 1",
        [
          makeBatter("A", 20, 15, 0, "caught"),
          makeBatter("B", 25, 20, 0, "caught"),
        ],
        [],
        { r: 80, w: 5, o: 12 }
      );
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("batsman_fifty", "No", { scorecard: sc, matchStatus: "live" }))
        .toBe("on_track");
    });
  });

  describe("bowler_three_wkt", () => {
    it('"Yes" is on_track when a bowler has 3+', () => {
      const first = makeInnings(
        "A Inning 1",
        [],
        [makeBowler("BowlerX", 4, 3)],
        { r: 150, w: 5, o: 20 }
      );
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("bowler_three_wkt", "Yes", { scorecard: sc, matchStatus: "live" }))
        .toBe("on_track");
    });

    it('"Yes" is pending when max is 2 wickets', () => {
      const first = makeInnings(
        "A Inning 1",
        [],
        [makeBowler("BowlerX", 3, 2)],
        { r: 100, w: 4, o: 15 }
      );
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("bowler_three_wkt", "Yes", { scorecard: sc, matchStatus: "live" }))
        .toBe("pending");
    });

    it('"Yes" is in_danger late in match with max wickets 0 or 1', () => {
      const first = makeInnings(
        "A Inning 1",
        [],
        [makeBowler("BowlerX", 4, 1)],
        { r: 150, w: 5, o: 20 }
      );
      const second = makeInnings(
        "B Inning 1",
        [],
        [makeBowler("BowlerY", 4, 1)],
        { r: 130, w: 4, o: 15 }
      );
      const sc = makeScorecard({ scorecard: [first, second] });
      // totalOvers = 35 > 30, max wickets = 1
      expect(computeTrackStatus("bowler_three_wkt", "Yes", { scorecard: sc, matchStatus: "live" }))
        .toBe("in_danger");
    });

    it('"No" is in_danger when a bowler has 3+', () => {
      const first = makeInnings(
        "A Inning 1",
        [],
        [makeBowler("BowlerX", 4, 4)],
        { r: 150, w: 5, o: 20 }
      );
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("bowler_three_wkt", "No", { scorecard: sc, matchStatus: "live" }))
        .toBe("in_danger");
    });

    it('"No" is in_danger when bowler at 2 early in match', () => {
      const first = makeInnings(
        "A Inning 1",
        [],
        [makeBowler("BowlerX", 3, 2)],
        { r: 60, w: 3, o: 8 }
      );
      const sc = makeScorecard({ scorecard: [first] });
      // totalOvers = 8 < 30, max = 2
      expect(computeTrackStatus("bowler_three_wkt", "No", { scorecard: sc, matchStatus: "live" }))
        .toBe("in_danger");
    });

    it('"No" is on_track when max wickets is 0 or 1', () => {
      const first = makeInnings(
        "A Inning 1",
        [],
        [makeBowler("BowlerX", 4, 1)],
        { r: 150, w: 5, o: 20 }
      );
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("bowler_three_wkt", "No", { scorecard: sc, matchStatus: "live" }))
        .toBe("on_track");
    });
  });

  describe("top_scorer", () => {
    it('"on_track" when predicted player is leading by >15 runs', () => {
      const first = makeInnings(
        "A Inning 1",
        [
          makeBatter("Player A", 70, 45, 2, "caught"),
          makeBatter("Player B", 40, 30, 1, "caught"),
        ],
        [],
        { r: 150, w: 5, o: 20 }
      );
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("top_scorer", "Player A", { scorecard: sc, matchStatus: "live" }))
        .toBe("on_track");
    });

    it('"in_danger" when predicted player is dismissed and far behind', () => {
      const first = makeInnings(
        "A Inning 1",
        [
          makeBatter("Leader", 70, 45, 2, "caught"),
          makeBatter("Predicted", 40, 30, 1, "caught"),
        ],
        [],
        { r: 150, w: 5, o: 20 }
      );
      const sc = makeScorecard({ scorecard: [first] });
      // Predicted is not top, is dismissed, and gap > 15
      expect(computeTrackStatus("top_scorer", "Predicted", { scorecard: sc, matchStatus: "live" }))
        .toBe("in_danger");
    });

    it('"pending" when close race', () => {
      const first = makeInnings(
        "A Inning 1",
        [
          makeBatter("Player A", 50, 35, 1, "not out"),
          makeBatter("Player B", 45, 30, 1, "not out"),
        ],
        [],
        { r: 100, w: 2, o: 12 }
      );
      const sc = makeScorecard({ scorecard: [first] });
      // Gap is only 5, so pending
      expect(computeTrackStatus("top_scorer", "Player A", { scorecard: sc, matchStatus: "live" }))
        .toBe("pending");
    });

    it('"pending" with no batting data', () => {
      const first = makeInnings("A Inning 1", [], [], { r: 0, w: 0, o: 0 });
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("top_scorer", "X", { scorecard: sc, matchStatus: "live" }))
        .toBe("pending");
    });
  });

  describe("top_wicket_taker", () => {
    it('"on_track" when predicted bowler is leading', () => {
      const first = makeInnings(
        "A Inning 1",
        [],
        [
          makeBowler("BowlerA", 4, 3),
          makeBowler("BowlerB", 4, 1),
        ],
        { r: 150, w: 5, o: 20 }
      );
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("top_wicket_taker", "BowlerA", { scorecard: sc, matchStatus: "live" }))
        .toBe("on_track");
    });

    it('"in_danger" when predicted bowler is 2+ behind leader', () => {
      const first = makeInnings(
        "A Inning 1",
        [],
        [
          makeBowler("Leader", 4, 4),
          makeBowler("Predicted", 4, 1),
        ],
        { r: 150, w: 5, o: 20 }
      );
      const sc = makeScorecard({ scorecard: [first] });
      // Leader 4, Predicted 1, gap >= 2
      expect(computeTrackStatus("top_wicket_taker", "Predicted", { scorecard: sc, matchStatus: "live" }))
        .toBe("in_danger");
    });

    it('"pending" when gap is small', () => {
      const first = makeInnings(
        "A Inning 1",
        [],
        [
          makeBowler("Leader", 3, 2),
          makeBowler("Predicted", 3, 1),
        ],
        { r: 100, w: 4, o: 15 }
      );
      const sc = makeScorecard({ scorecard: [first] });
      // Gap = 1, not isTop, gap < 2
      expect(computeTrackStatus("top_wicket_taker", "Predicted", { scorecard: sc, matchStatus: "live" }))
        .toBe("pending");
    });

    it('"pending" with no bowling data', () => {
      const first = makeInnings("A Inning 1", [], [], { r: 0, w: 0, o: 0 });
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("top_wicket_taker", "X", { scorecard: sc, matchStatus: "live" }))
        .toBe("pending");
    });
  });

  describe("most_sixes", () => {
    it('"on_track" when predicted player leads in sixes', () => {
      const first = makeInnings(
        "A Inning 1",
        [
          makeBatter("SixKing", 60, 30, 5, "not out"),
          makeBatter("Other", 40, 30, 1, "caught"),
        ],
        [],
        { r: 120, w: 3, o: 15 }
      );
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("most_sixes", "SixKing", { scorecard: sc, matchStatus: "live" }))
        .toBe("on_track");
    });

    it('"in_danger" when predicted player is 2+ behind leader', () => {
      const first = makeInnings(
        "A Inning 1",
        [
          makeBatter("Leader", 60, 30, 5, "not out"),
          makeBatter("Predicted", 30, 25, 2, "caught"),
        ],
        [],
        { r: 120, w: 3, o: 15 }
      );
      const sc = makeScorecard({ scorecard: [first] });
      // Leader 5, Predicted 2, gap = 3 >= 2
      expect(computeTrackStatus("most_sixes", "Predicted", { scorecard: sc, matchStatus: "live" }))
        .toBe("in_danger");
    });

    it('"pending" when close or no data', () => {
      const first = makeInnings(
        "A Inning 1",
        [
          makeBatter("A", 30, 20, 3, "not out"),
          makeBatter("B", 25, 18, 2, "not out"),
        ],
        [],
        { r: 80, w: 2, o: 10 }
      );
      const sc = makeScorecard({ scorecard: [first] });
      // B not leading, gap = 1 < 2
      expect(computeTrackStatus("most_sixes", "B", { scorecard: sc, matchStatus: "live" }))
        .toBe("pending");
    });
  });

  describe("categories that always return pending", () => {
    const first = makeInnings("A Inning 1", [], [], { r: 80, w: 3, o: 10 });
    const sc = makeScorecard({ scorecard: [first] });

    it.each([
      "powerplay_score",
      "first_wicket_over",
      "powerplay_wickets",
      "had_super_over",
      "player_of_match",
    ] as const)('%s returns "pending"', (category) => {
      expect(computeTrackStatus(category, "some_value", { scorecard: sc, matchStatus: "live" }))
        .toBe("pending");
    });
  });

  describe("unknown category", () => {
    it('returns "pending" for unknown category', () => {
      const first = makeInnings("A Inning 1", [], [], { r: 80, w: 3, o: 10 });
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("completely_unknown", "val", { scorecard: sc, matchStatus: "live" }))
        .toBe("pending");
    });
  });

  describe("null category", () => {
    it('returns "pending" for null category', () => {
      const first = makeInnings("A Inning 1", [], [], { r: 80, w: 3, o: 10 });
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus(null, "val", { scorecard: sc, matchStatus: "live" }))
        .toBe("pending");
    });
  });

  describe("powerplay_score always pending", () => {
    it('returns "pending" even when >= 6 overs', () => {
      const first = makeInnings("A Inning 1", [], [], { r: 55, w: 2, o: 8 });
      const sc = makeScorecard({ scorecard: [first] });
      expect(computeTrackStatus("powerplay_score", "40-55", { scorecard: sc, matchStatus: "live" }))
        .toBe("pending");
    });
  });
});
