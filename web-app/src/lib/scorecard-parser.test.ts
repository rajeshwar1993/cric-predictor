import { parseScorecardToResults } from "./scorecard-parser";
import type {
  ScorecardResponse,
  InningsScorecard,
  BattingEntry,
  BowlingEntry,
} from "@/types/cricket-api";

// ── Helpers to build test fixtures ──────────────────────────────────────

function makeBatter(
  name: string,
  runs: number,
  balls: number,
  fours: number,
  sixes: number,
  dismissal = "c Player b Bowler"
): BattingEntry {
  return {
    batsman: { id: name.toLowerCase().replace(/\s/g, "-"), name },
    dismissal,
    "dismissal-text": dismissal === "not out" ? "not out" : "c Player b Bowler",
    r: runs,
    b: balls,
    "4s": fours,
    "6s": sixes,
    sr: balls > 0 ? (runs / balls) * 100 : 0,
  };
}

function makeBowler(
  name: string,
  overs: number,
  maidens: number,
  runs: number,
  wickets: number
): BowlingEntry {
  return {
    bowler: { id: name.toLowerCase().replace(/\s/g, "-"), name },
    o: overs,
    m: maidens,
    r: runs,
    w: wickets,
    nb: 0,
    wd: 0,
    eco: overs > 0 ? runs / overs : 0,
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
    extras: { r: 10, b: 0 },
    totals,
    inning,
  };
}

function makeBaseScorecard(
  overrides: Partial<ScorecardResponse> = {}
): ScorecardResponse {
  return {
    id: "match-1",
    name: "CSK vs MI, 1st Match",
    matchType: "t20",
    status: "Match ended",
    venue: "Chennai",
    date: "2026-04-01",
    dateTimeGMT: "2026-04-01T14:00:00",
    teams: ["Chennai Super Kings", "Mumbai Indians"],
    teamInfo: [
      { name: "Chennai Super Kings", shortname: "CSK", img: "" },
      { name: "Mumbai Indians", shortname: "MI", img: "" },
    ],
    score: [],
    tossWinner: "Chennai Super Kings",
    tossChoice: "bat",
    matchWinner: "Chennai Super Kings",
    matchStarted: true,
    matchEnded: true,
    scorecard: [],
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("parseScorecardToResults", () => {
  describe("team name to code conversion", () => {
    it("converts tossWinner full name to team code", () => {
      const sc = makeBaseScorecard({ tossWinner: "Chennai Super Kings" });
      const result = parseScorecardToResults(sc);
      expect(result.toss_winner).toBe("CSK");
    });

    it("converts matchWinner full name to team code", () => {
      const sc = makeBaseScorecard({ matchWinner: "Mumbai Indians" });
      const result = parseScorecardToResults(sc);
      expect(result.match_winner).toBe("MI");
    });

    it("handles RCB Bangalore variant", () => {
      const sc = makeBaseScorecard({ matchWinner: "Royal Challengers Bangalore" });
      const result = parseScorecardToResults(sc);
      expect(result.match_winner).toBe("RCB");
    });

    it("returns null for undefined team name", () => {
      const sc = makeBaseScorecard();
      // Simulate missing tossWinner by casting
      (sc as any).tossWinner = undefined;
      const result = parseScorecardToResults(sc);
      expect(result.toss_winner).toBeNull();
    });

    it("falls back to raw name for unknown teams", () => {
      const sc = makeBaseScorecard({ matchWinner: "Unknown XI" });
      const result = parseScorecardToResults(sc);
      expect(result.match_winner).toBe("Unknown XI");
    });
  });

  describe("empty scorecard", () => {
    it("returns only toss and match winner when scorecard is empty", () => {
      const sc = makeBaseScorecard({ scorecard: [] });
      const result = parseScorecardToResults(sc);
      expect(result.toss_winner).toBe("CSK");
      expect(result.match_winner).toBe("CSK");
      // All match stats should be absent
      expect(result.first_innings_score).toBeUndefined();
      expect(result.total_match_runs).toBeUndefined();
      expect(result.top_scorer).toBeUndefined();
    });
  });

  describe("full scorecard", () => {
    const firstInnings = makeInnings(
      "Chennai Super Kings Inning 1",
      [
        makeBatter("Ruturaj Gaikwad", 72, 45, 8, 3),
        makeBatter("Devon Conway", 45, 35, 5, 2),
        makeBatter("Shivam Dube", 30, 20, 2, 2),
        makeBatter("MS Dhoni", 18, 10, 1, 1),
      ],
      [
        makeBowler("Jasprit Bumrah", 4, 1, 28, 3),
        makeBowler("Trent Boult", 4, 0, 42, 1),
      ],
      { r: 185, w: 5, o: 20 }
    );

    const secondInnings = makeInnings(
      "Mumbai Indians Inning 1",
      [
        makeBatter("Rohit Sharma", 55, 40, 6, 3),
        makeBatter("Suryakumar Yadav", 40, 28, 4, 1),
        makeBatter("Ishan Kishan", 25, 18, 3, 0),
        makeBatter("Hardik Pandya", 35, 22, 2, 2),
      ],
      [
        makeBowler("Deepak Chahar", 4, 0, 35, 2),
        makeBowler("Ravindra Jadeja", 4, 0, 30, 2),
      ],
      { r: 170, w: 7, o: 20 }
    );

    const fullScorecard = makeBaseScorecard({
      scorecard: [firstInnings, secondInnings],
    });

    it("extracts first innings score and wickets", () => {
      const result = parseScorecardToResults(fullScorecard);
      expect(result.first_innings_score).toBe(185);
      expect(result.first_innings_wickets).toBe(5);
    });

    it("computes total match runs", () => {
      const result = parseScorecardToResults(fullScorecard);
      expect(result.total_match_runs).toBe(355); // 185 + 170
    });

    it("computes total match wickets", () => {
      const result = parseScorecardToResults(fullScorecard);
      expect(result.total_match_wickets).toBe(12); // 5 + 7
    });

    it("computes total match sixes", () => {
      const result = parseScorecardToResults(fullScorecard);
      // CSK: 3+2+2+1 = 8, MI: 3+1+0+2 = 6 => 14
      expect(result.total_match_sixes).toBe(14);
    });

    it("identifies top scorer", () => {
      const result = parseScorecardToResults(fullScorecard);
      expect(result.top_scorer).toBe("Ruturaj Gaikwad");
      expect(result.top_scorer_runs).toBe(72);
    });

    it("identifies top wicket taker", () => {
      const result = parseScorecardToResults(fullScorecard);
      expect(result.top_wicket_taker).toBe("Jasprit Bumrah");
      expect(result.top_wicket_taker_wickets).toBe(3);
    });

    it("identifies most sixes player", () => {
      const result = parseScorecardToResults(fullScorecard);
      // Gaikwad and Sharma both have 3 sixes — reduce picks the later one
      // Let's check: reduce iterates, starts with first element.
      // Gaikwad(3) > 0, then Conway(2) not > 3, Dube(2) no, Dhoni(1) no,
      // Sharma(3) not > 3 (strictly greater), so stays Gaikwad
      expect(result.most_sixes_player).toBe("Ruturaj Gaikwad");
    });

    it("detects batsman scored fifty", () => {
      const result = parseScorecardToResults(fullScorecard);
      expect(result.batsman_scored_fifty).toBe(true);
    });

    it("detects bowler took three wickets", () => {
      const result = parseScorecardToResults(fullScorecard);
      expect(result.bowler_took_three).toBe(true);
    });
  });

  describe("no fifty, no three-wicket haul", () => {
    const first = makeInnings(
      "Team A Inning 1",
      [
        makeBatter("Batter A", 45, 30, 5, 1),
        makeBatter("Batter B", 30, 25, 3, 0),
      ],
      [makeBowler("Bowler A", 4, 0, 30, 2)],
      { r: 120, w: 4, o: 20 }
    );

    const second = makeInnings(
      "Team B Inning 1",
      [
        makeBatter("Batter C", 40, 35, 4, 0),
        makeBatter("Batter D", 20, 15, 2, 0),
      ],
      [makeBowler("Bowler B", 4, 0, 25, 1)],
      { r: 100, w: 3, o: 20 }
    );

    it("batsman_scored_fifty is false when no one reaches 50", () => {
      const sc = makeBaseScorecard({ scorecard: [first, second] });
      const result = parseScorecardToResults(sc);
      expect(result.batsman_scored_fifty).toBe(false);
    });

    it("bowler_took_three is false when no one takes 3+", () => {
      const sc = makeBaseScorecard({ scorecard: [first, second] });
      const result = parseScorecardToResults(sc);
      expect(result.bowler_took_three).toBe(false);
    });
  });

  describe("super over detection", () => {
    // The source reduce() requires at least one batting entry when both innings exist
    const dummyBatting = [makeBatter("X", 50, 30, 5, 2)];
    const dummyBowling = [makeBowler("Y", 4, 0, 30, 1)];

    it("had_super_over is false with 2 innings", () => {
      const first = makeInnings("A Inning 1", dummyBatting, dummyBowling, { r: 150, w: 5, o: 20 });
      const second = makeInnings("B Inning 1", dummyBatting, dummyBowling, { r: 150, w: 5, o: 20 });
      const sc = makeBaseScorecard({ scorecard: [first, second] });
      const result = parseScorecardToResults(sc);
      expect(result.had_super_over).toBe(false);
    });

    it("had_super_over is true with more than 2 innings", () => {
      const first = makeInnings("A Inning 1", dummyBatting, dummyBowling, { r: 150, w: 5, o: 20 });
      const second = makeInnings("B Inning 1", dummyBatting, dummyBowling, { r: 150, w: 5, o: 20 });
      const superA = makeInnings("A Inning 2", dummyBatting, dummyBowling, { r: 15, w: 1, o: 1 });
      const superB = makeInnings("B Inning 2", dummyBatting, dummyBowling, { r: 12, w: 2, o: 1 });
      const sc = makeBaseScorecard({
        scorecard: [first, second, superA, superB],
      });
      const result = parseScorecardToResults(sc);
      expect(result.had_super_over).toBe(true);
    });
  });

  describe("powerplay score", () => {
    const dummyBat = [makeBatter("P", 30, 20, 3, 1)];
    const dummyBowl = [makeBowler("Q", 4, 0, 30, 1)];

    it("sets powerplay score when first innings < 6 overs", () => {
      const first = makeInnings("A Inning 1", dummyBat, dummyBowl, { r: 45, w: 1, o: 5 });
      const second = makeInnings("B Inning 1", dummyBat, dummyBowl, { r: 100, w: 3, o: 20 });
      const sc = makeBaseScorecard({ scorecard: [first, second] });
      const result = parseScorecardToResults(sc);
      expect(result.powerplay_score).toBe(45);
      expect(result.powerplay_wickets).toBe(1);
    });

    it("sets powerplay score when first innings exactly 6 overs", () => {
      const first = makeInnings("A Inning 1", dummyBat, dummyBowl, { r: 55, w: 2, o: 6 });
      const second = makeInnings("B Inning 1", dummyBat, dummyBowl, { r: 100, w: 3, o: 20 });
      const sc = makeBaseScorecard({ scorecard: [first, second] });
      const result = parseScorecardToResults(sc);
      expect(result.powerplay_score).toBe(55);
      expect(result.powerplay_wickets).toBe(2);
    });

    it("does not set powerplay when overs > 6", () => {
      const first = makeInnings("A Inning 1", dummyBat, dummyBowl, { r: 185, w: 5, o: 20 });
      const second = makeInnings("B Inning 1", dummyBat, dummyBowl, { r: 170, w: 7, o: 20 });
      const sc = makeBaseScorecard({ scorecard: [first, second] });
      const result = parseScorecardToResults(sc);
      expect(result.powerplay_score).toBeUndefined();
    });
  });

  describe("most_sixes_player with no sixes", () => {
    it("does not set most_sixes_player when no sixes hit", () => {
      const first = makeInnings(
        "A Inning 1",
        [makeBatter("X", 50, 40, 5, 0)],
        [makeBowler("Y", 4, 0, 30, 1)],
        { r: 150, w: 5, o: 20 }
      );
      const second = makeInnings(
        "B Inning 1",
        [makeBatter("Z", 60, 45, 7, 0)],
        [makeBowler("W", 4, 0, 35, 2)],
        { r: 155, w: 6, o: 20 }
      );
      const sc = makeBaseScorecard({ scorecard: [first, second] });
      const result = parseScorecardToResults(sc);
      expect(result.most_sixes_player).toBeUndefined();
    });
  });
});
