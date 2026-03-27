import { describe, it, expect } from "vitest";
import {
  safeInt,
  safeFloat,
  filterBatsmen,
  filterBowlers,
  getFirstInningsKey,
  getInningsKeys,
  teamNameFromInningsKey,
  parseTossWinner,
  parseMatchWinner,
  parseInningsTotal,
  parseOverNumber,
  derivePowerplayScore,
  derivePowerplayWickets,
  deriveFirstWicketOver,
  getInningsRuns,
  getInningsOvers,
} from "./parsers";
import type {
  ScorecardEntry,
  CommentEntry,
  WicketEntry,
  ExtraEntry,
} from "@/types/cricket-api";

// ── Helpers to build test fixtures ──────────────────────────────

function makeScorecardEntry(
  overrides: Partial<ScorecardEntry> = {}
): ScorecardEntry {
  return {
    innings: "1",
    player: "Test Player",
    type: "Batsman",
    status: "not out",
    R: "0",
    B: "0",
    Min: "0",
    "4s": "0",
    "6s": "0",
    SR: "0",
    O: "0",
    M: "0",
    W: "0",
    ER: "0",
    ...overrides,
  };
}

function makeCommentEntry(overrides: Partial<CommentEntry> = {}): CommentEntry {
  return {
    innings: "1",
    overs: "1.0",
    balls: "1",
    runs: "1",
    ended: "0",
    post: "",
    ...overrides,
  };
}

function makeWicketEntry(overrides: Partial<WicketEntry> = {}): WicketEntry {
  return {
    innings: "1",
    fall: "3.4 ov",
    balwer: "Bowler Name",
    batsman: "c Fielder b Bowler 12",
    score: "28/1",
    ...overrides,
  };
}

function makeExtraEntry(overrides: Partial<ExtraEntry> = {}): ExtraEntry {
  return {
    innings: "1",
    nr: "12",
    text: "(w 6, nb 3, lb 2, b 1)",
    total: "185 ( 20 )",
    total_overs: null,
    percent_over: null,
    ...overrides,
  };
}

// ── safeInt ─────────────────────────────────────────────────────

describe("safeInt", () => {
  it("returns 0 for null", () => {
    expect(safeInt(null)).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(safeInt(undefined)).toBe(0);
  });

  it("returns 0 for empty string", () => {
    expect(safeInt("")).toBe(0);
  });

  it("parses a valid integer string", () => {
    expect(safeInt("42")).toBe(42);
  });

  it("parses negative integer string", () => {
    expect(safeInt("-7")).toBe(-7);
  });

  it("truncates a float string to integer", () => {
    expect(safeInt("3.9")).toBe(3);
  });

  it("returns 0 for NaN-producing string", () => {
    expect(safeInt("abc")).toBe(0);
  });

  it("returns 0 for string '0'", () => {
    expect(safeInt("0")).toBe(0);
  });
});

// ── safeFloat ───────────────────────────────────────────────────

describe("safeFloat", () => {
  it("returns 0 for null", () => {
    expect(safeFloat(null)).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(safeFloat(undefined)).toBe(0);
  });

  it("returns 0 for empty string", () => {
    expect(safeFloat("")).toBe(0);
  });

  it("parses a valid float string", () => {
    expect(safeFloat("18.3")).toBeCloseTo(18.3);
  });

  it("parses a valid integer string as float", () => {
    expect(safeFloat("20")).toBe(20);
  });

  it("returns 0 for NaN-producing string", () => {
    expect(safeFloat("xyz")).toBe(0);
  });

  it("returns 0 for string '0'", () => {
    expect(safeFloat("0")).toBe(0);
  });
});

// ── filterBatsmen ───────────────────────────────────────────────

describe("filterBatsmen", () => {
  it("returns only Batsman entries from a mixed array", () => {
    const entries = [
      makeScorecardEntry({ type: "Batsman", player: "Virat" }),
      makeScorecardEntry({ type: "Bowler", player: "Bumrah" }),
      makeScorecardEntry({ type: "Batsman", player: "Rohit" }),
    ];
    const result = filterBatsmen(entries);
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.player)).toEqual(["Virat", "Rohit"]);
  });

  it("returns empty array when no batsmen present", () => {
    const entries = [
      makeScorecardEntry({ type: "Bowler", player: "Bumrah" }),
    ];
    expect(filterBatsmen(entries)).toHaveLength(0);
  });

  it("returns empty array for empty input", () => {
    expect(filterBatsmen([])).toHaveLength(0);
  });
});

// ── filterBowlers ───────────────────────────────────────────────

describe("filterBowlers", () => {
  it("returns only Bowler entries from a mixed array", () => {
    const entries = [
      makeScorecardEntry({ type: "Batsman", player: "Virat" }),
      makeScorecardEntry({ type: "Bowler", player: "Bumrah" }),
      makeScorecardEntry({ type: "Bowler", player: "Siraj" }),
    ];
    const result = filterBowlers(entries);
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.player)).toEqual(["Bumrah", "Siraj"]);
  });

  it("returns empty array when no bowlers present", () => {
    const entries = [
      makeScorecardEntry({ type: "Batsman", player: "Virat" }),
    ];
    expect(filterBowlers(entries)).toHaveLength(0);
  });

  it("returns empty array for empty input", () => {
    expect(filterBowlers([])).toHaveLength(0);
  });
});

// ── getFirstInningsKey ──────────────────────────────────────────

describe("getFirstInningsKey", () => {
  it("returns null for null input", () => {
    expect(getFirstInningsKey(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(getFirstInningsKey(undefined)).toBeNull();
  });

  it("returns null for empty object", () => {
    expect(getFirstInningsKey({})).toBeNull();
  });

  it("returns the single key when one key exists", () => {
    expect(getFirstInningsKey({ "Team A 1 INN": [] })).toBe("Team A 1 INN");
  });

  it("returns the first key when multiple keys exist", () => {
    const obj = { "Team A 1 INN": [], "Team B 1 INN": [] };
    const result = getFirstInningsKey(obj);
    expect(result).toBe("Team A 1 INN");
  });
});

// ── getInningsKeys ──────────────────────────────────────────────

describe("getInningsKeys", () => {
  it("returns empty array for null input", () => {
    expect(getInningsKeys(null)).toEqual([]);
  });

  it("returns empty array for undefined input", () => {
    expect(getInningsKeys(undefined)).toEqual([]);
  });

  it("returns empty array for empty object", () => {
    expect(getInningsKeys({})).toEqual([]);
  });

  it("returns all keys for multiple-key object", () => {
    const obj = { "Team A 1 INN": [], "Team B 1 INN": [] };
    expect(getInningsKeys(obj)).toEqual(["Team A 1 INN", "Team B 1 INN"]);
  });
});

// ── teamNameFromInningsKey ──────────────────────────────────────

describe("teamNameFromInningsKey", () => {
  it("extracts team name from standard innings key", () => {
    expect(teamNameFromInningsKey("Royal Challengers Bengaluru 1 INN")).toBe(
      "Royal Challengers Bengaluru"
    );
  });

  it("extracts team name from second innings key", () => {
    expect(teamNameFromInningsKey("Mumbai Indians 2 INN")).toBe(
      "Mumbai Indians"
    );
  });

  it("handles single-word team name", () => {
    expect(teamNameFromInningsKey("Kolkata 1 INN")).toBe("Kolkata");
  });

  it("handles lowercase 'inn'", () => {
    expect(teamNameFromInningsKey("Chennai Super Kings 1 inn")).toBe(
      "Chennai Super Kings"
    );
  });

  it("returns input unchanged when no innings suffix present", () => {
    expect(teamNameFromInningsKey("Some Random String")).toBe(
      "Some Random String"
    );
  });
});

// ── parseTossWinner ─────────────────────────────────────────────

describe("parseTossWinner", () => {
  it("parses 'elected to bat first'", () => {
    expect(
      parseTossWinner(
        "Royal Challengers Bengaluru, elected to bat first"
      )
    ).toBe("Royal Challengers Bengaluru");
  });

  it("parses 'chose to field'", () => {
    expect(parseTossWinner("Mumbai Indians, chose to field")).toBe(
      "Mumbai Indians"
    );
  });

  it("parses 'opted to bat'", () => {
    expect(parseTossWinner("Chennai Super Kings, opted to bat")).toBe(
      "Chennai Super Kings"
    );
  });

  it("falls back to comma split for unknown phrase", () => {
    expect(parseTossWinner("Team A, decided to bowl")).toBe("Team A");
  });

  it("returns null for empty string", () => {
    expect(parseTossWinner("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(parseTossWinner(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseTossWinner(undefined)).toBeNull();
  });

  it("returns null when no delimiter found", () => {
    expect(parseTossWinner("No comma here")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(parseTossWinner("   ")).toBeNull();
  });
});

// ── parseMatchWinner ────────────────────────────────────────────

describe("parseMatchWinner", () => {
  it("parses 'Team won by X wickets'", () => {
    expect(parseMatchWinner("RCB won by 5 wickets")).toBe("RCB");
  });

  it("parses 'Team won by X runs'", () => {
    expect(
      parseMatchWinner("Chennai Super Kings won by 15 runs")
    ).toBe("Chennai Super Kings");
  });

  it("parses 'Team won by X wickets (with N balls remaining)'", () => {
    expect(
      parseMatchWinner(
        "Mumbai Indians won by 7 wickets (with 22 balls remaining)"
      )
    ).toBe("Mumbai Indians");
  });

  it("parses Super Over winner", () => {
    expect(
      parseMatchWinner("Match tied (RCB won Super Over)")
    ).toBe("RCB");
  });

  it("parses Super Over winner with 'the'", () => {
    expect(
      parseMatchWinner("Match tied (Mumbai Indians won the Super Over)")
    ).toBe("Mumbai Indians");
  });

  it("returns null for 'No result'", () => {
    expect(parseMatchWinner("No result")).toBeNull();
  });

  it("returns null for 'Match abandoned'", () => {
    expect(parseMatchWinner("Match abandoned due to rain")).toBeNull();
  });

  it("returns null for 'cancelled'", () => {
    expect(parseMatchWinner("Match cancelled")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseMatchWinner("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(parseMatchWinner(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseMatchWinner(undefined)).toBeNull();
  });

  it("returns null for unrecognised format", () => {
    expect(parseMatchWinner("Some random text")).toBeNull();
  });
});

// ── parseInningsTotal ───────────────────────────────────────────

describe("parseInningsTotal", () => {
  it("parses '185 ( 20 )'", () => {
    expect(parseInningsTotal("185 ( 20 )")).toEqual({
      runs: 185,
      overs: 20,
    });
  });

  it("parses '142 ( 18.3 )'", () => {
    expect(parseInningsTotal("142 ( 18.3 )")).toEqual({
      runs: 142,
      overs: 18.3,
    });
  });

  it("parses '0 ( 0 )'", () => {
    expect(parseInningsTotal("0 ( 0 )")).toEqual({ runs: 0, overs: 0 });
  });

  it("parses compact format '185(20)'", () => {
    expect(parseInningsTotal("185(20)")).toEqual({ runs: 185, overs: 20 });
  });

  it("returns null for null", () => {
    expect(parseInningsTotal(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseInningsTotal(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseInningsTotal("")).toBeNull();
  });

  it("returns null for malformed string without parentheses", () => {
    expect(parseInningsTotal("185 runs")).toBeNull();
  });

  it("returns null for completely malformed string", () => {
    expect(parseInningsTotal("abc")).toBeNull();
  });
});

// ── parseOverNumber ─────────────────────────────────────────────

describe("parseOverNumber", () => {
  it("parses '3.4 ov'", () => {
    expect(parseOverNumber("3.4 ov")).toBeCloseTo(3.4);
  });

  it("parses '15.6 ov'", () => {
    expect(parseOverNumber("15.6 ov")).toBeCloseTo(15.6);
  });

  it("parses '3.4' without suffix", () => {
    expect(parseOverNumber("3.4")).toBeCloseTo(3.4);
  });

  it("parses integer over '6 ov'", () => {
    expect(parseOverNumber("6 ov")).toBe(6);
  });

  it("returns null for null", () => {
    expect(parseOverNumber(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseOverNumber(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseOverNumber("")).toBeNull();
  });

  it("returns null for non-numeric string", () => {
    expect(parseOverNumber("abc ov")).toBeNull();
  });
});

// ── derivePowerplayScore ────────────────────────────────────────

describe("derivePowerplayScore", () => {
  it("sums runs for first 6 overs of ball-by-ball data", () => {
    const comments = {
      "Team A 1 INN": [
        makeCommentEntry({ overs: "0.1", runs: "4" }),
        makeCommentEntry({ overs: "0.2", runs: "1" }),
        makeCommentEntry({ overs: "3.5", runs: "6" }),
        makeCommentEntry({ overs: "5.6", runs: "2" }),
        makeCommentEntry({ overs: "6.0", runs: "3" }),
        makeCommentEntry({ overs: "6.1", runs: "4" }), // beyond powerplay
      ],
    };
    // 4 + 1 + 6 + 2 + 3 = 16 (6.1 is past 6.0 so breaks)
    expect(derivePowerplayScore(comments)).toBe(16);
  });

  it("returns null for null input", () => {
    expect(derivePowerplayScore(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(derivePowerplayScore(undefined)).toBeNull();
  });

  it("returns null for empty object", () => {
    expect(derivePowerplayScore({})).toBeNull();
  });

  it("returns null for innings key with empty array", () => {
    expect(derivePowerplayScore({ "Team A 1 INN": [] })).toBeNull();
  });

  it("returns 0 when first ball is beyond over 6", () => {
    const comments = {
      "Team A 1 INN": [
        makeCommentEntry({ overs: "7.1", runs: "4" }),
      ],
    };
    expect(derivePowerplayScore(comments)).toBe(0);
  });

  it("handles all balls within powerplay", () => {
    const comments = {
      "Team A 1 INN": [
        makeCommentEntry({ overs: "0.1", runs: "1" }),
        makeCommentEntry({ overs: "0.2", runs: "2" }),
      ],
    };
    expect(derivePowerplayScore(comments)).toBe(3);
  });
});

// ── derivePowerplayWickets ──────────────────────────────────────

describe("derivePowerplayWickets", () => {
  it("counts wickets within 6 overs", () => {
    const wickets = {
      "Team A 1 INN": [
        makeWicketEntry({ fall: "0.3 ov" }),
        makeWicketEntry({ fall: "5.4 ov" }),
        makeWicketEntry({ fall: "6.0 ov" }),
        makeWicketEntry({ fall: "7.2 ov" }), // beyond powerplay
      ],
    };
    expect(derivePowerplayWickets(wickets)).toBe(3);
  });

  it("returns 0 when wickets array is empty", () => {
    expect(derivePowerplayWickets({ "Team A 1 INN": [] })).toBe(0);
  });

  it("returns null for null input", () => {
    expect(derivePowerplayWickets(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(derivePowerplayWickets(undefined)).toBeNull();
  });

  it("returns null for empty object", () => {
    expect(derivePowerplayWickets({})).toBeNull();
  });

  it("returns 0 when all wickets are beyond 6 overs", () => {
    const wickets = {
      "Team A 1 INN": [
        makeWicketEntry({ fall: "8.1 ov" }),
        makeWicketEntry({ fall: "12.3 ov" }),
      ],
    };
    expect(derivePowerplayWickets(wickets)).toBe(0);
  });

  it("counts all wickets when all are within powerplay", () => {
    const wickets = {
      "Team A 1 INN": [
        makeWicketEntry({ fall: "1.2 ov" }),
        makeWicketEntry({ fall: "4.5 ov" }),
      ],
    };
    expect(derivePowerplayWickets(wickets)).toBe(2);
  });
});

// ── deriveFirstWicketOver ───────────────────────────────────────

describe("deriveFirstWicketOver", () => {
  it("returns ceiling of early wicket (0.3 ov -> 1)", () => {
    const wickets = {
      "Team A 1 INN": [makeWicketEntry({ fall: "0.3 ov" })],
    };
    expect(deriveFirstWicketOver(wickets)).toBe(1);
  });

  it("returns ceiling of later wicket (7.2 ov -> 8)", () => {
    const wickets = {
      "Team A 1 INN": [makeWicketEntry({ fall: "7.2 ov" })],
    };
    expect(deriveFirstWicketOver(wickets)).toBe(8);
  });

  it("returns exact over when ball is on boundary (6.0 ov -> 6)", () => {
    const wickets = {
      "Team A 1 INN": [makeWicketEntry({ fall: "6.0 ov" })],
    };
    expect(deriveFirstWicketOver(wickets)).toBe(6);
  });

  it("uses only the first wicket entry", () => {
    const wickets = {
      "Team A 1 INN": [
        makeWicketEntry({ fall: "2.5 ov" }),
        makeWicketEntry({ fall: "9.1 ov" }),
      ],
    };
    expect(deriveFirstWicketOver(wickets)).toBe(3);
  });

  it("returns null when no wickets fell", () => {
    expect(deriveFirstWicketOver({ "Team A 1 INN": [] })).toBeNull();
  });

  it("returns null for null input", () => {
    expect(deriveFirstWicketOver(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(deriveFirstWicketOver(undefined)).toBeNull();
  });

  it("returns null for empty object", () => {
    expect(deriveFirstWicketOver({})).toBeNull();
  });
});

// ── getInningsRuns ──────────────────────────────────────────────

describe("getInningsRuns", () => {
  it("returns runs from a valid extra entry", () => {
    const extra = {
      "Team A 1 INN": makeExtraEntry({ total: "185 ( 20 )" }),
    };
    expect(getInningsRuns(extra, "Team A 1 INN")).toBe(185);
  });

  it("returns runs with fractional overs", () => {
    const extra = {
      "Team A 1 INN": makeExtraEntry({ total: "142 ( 18.3 )" }),
    };
    expect(getInningsRuns(extra, "Team A 1 INN")).toBe(142);
  });

  it("returns null for missing innings key", () => {
    const extra = {
      "Team A 1 INN": makeExtraEntry({ total: "185 ( 20 )" }),
    };
    expect(getInningsRuns(extra, "Team B 1 INN")).toBeNull();
  });

  it("returns null for null extra", () => {
    expect(getInningsRuns(null, "Team A 1 INN")).toBeNull();
  });

  it("returns null for undefined extra", () => {
    expect(getInningsRuns(undefined, "Team A 1 INN")).toBeNull();
  });

  it("returns null when total is malformed", () => {
    const extra = {
      "Team A 1 INN": makeExtraEntry({ total: "bad data" }),
    };
    expect(getInningsRuns(extra, "Team A 1 INN")).toBeNull();
  });
});

// ── getInningsOvers ─────────────────────────────────────────────

describe("getInningsOvers", () => {
  it("returns overs from a valid extra entry", () => {
    const extra = {
      "Team A 1 INN": makeExtraEntry({ total: "185 ( 20 )" }),
    };
    expect(getInningsOvers(extra, "Team A 1 INN")).toBe(20);
  });

  it("returns fractional overs", () => {
    const extra = {
      "Team A 1 INN": makeExtraEntry({ total: "142 ( 18.3 )" }),
    };
    expect(getInningsOvers(extra, "Team A 1 INN")).toBeCloseTo(18.3);
  });

  it("returns null for missing innings key", () => {
    const extra = {
      "Team A 1 INN": makeExtraEntry({ total: "185 ( 20 )" }),
    };
    expect(getInningsOvers(extra, "Team B 1 INN")).toBeNull();
  });

  it("returns null for null extra", () => {
    expect(getInningsOvers(null, "Team A 1 INN")).toBeNull();
  });

  it("returns null for undefined extra", () => {
    expect(getInningsOvers(undefined, "Team A 1 INN")).toBeNull();
  });

  it("returns null when total is malformed", () => {
    const extra = {
      "Team A 1 INN": makeExtraEntry({ total: "not valid" }),
    };
    expect(getInningsOvers(extra, "Team A 1 INN")).toBeNull();
  });
});
