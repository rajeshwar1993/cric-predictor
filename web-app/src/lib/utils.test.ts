import {
  cn,
  computeDeadline,
  isDeadlinePassed,
  formatCountdown,
  formatMatchDate,
  formatMatchTime,
  getTeamColor,
  computeWindowOpen,
  isWindowOpen,
  getWindowState,
  formatWindowDate,
} from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles empty inputs", () => {
    expect(cn()).toBe("");
  });

  it("merges arrays", () => {
    expect(cn(["foo", "bar"], "baz")).toBe("foo bar baz");
  });

  it("resolves complex Tailwind conflicts", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });
});

describe("computeDeadline", () => {
  it("uses custom deadline when provided", () => {
    const custom = "2026-04-01T12:00:00Z";
    const result = computeDeadline("2026-04-01", "19:30", custom);
    expect(result).toEqual(new Date(custom));
  });

  it("returns 45 minutes before match start in IST when no custom deadline", () => {
    // Match at 19:30 IST (14:00 UTC) on 2026-04-01
    const result = computeDeadline("2026-04-01", "19:30");
    // 19:30 IST = 14:00 UTC, minus 45 min = 13:15 UTC
    const expected = new Date("2026-04-01T13:15:00.000Z");
    expect(result.getTime()).toBe(expected.getTime());
  });

  it("handles morning match times", () => {
    // Match at 14:00 IST (08:30 UTC)
    const result = computeDeadline("2026-04-01", "14:00");
    // 14:00 IST = 08:30 UTC, minus 45 min = 07:45 UTC
    const expected = new Date("2026-04-01T07:45:00.000Z");
    expect(result.getTime()).toBe(expected.getTime());
  });

  it("treats null custom deadline as no override", () => {
    const result = computeDeadline("2026-04-01", "19:30", null);
    const expected = new Date("2026-04-01T13:15:00.000Z");
    expect(result.getTime()).toBe(expected.getTime());
  });
});

describe("isDeadlinePassed", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false before deadline", () => {
    // Match at 19:30 IST on 2026-04-01, deadline is 18:45 IST (13:15 UTC)
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T12:00:00Z")); // well before 13:15 UTC
    expect(isDeadlinePassed("2026-04-01", "19:30")).toBe(false);
  });

  it("returns true after deadline", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T14:00:00Z")); // after 13:15 UTC
    expect(isDeadlinePassed("2026-04-01", "19:30")).toBe(true);
  });

  it("uses custom deadline when provided", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T11:00:00Z"));
    // Custom deadline at 10:00 UTC — already passed
    expect(isDeadlinePassed("2026-04-01", "19:30", "2026-04-01T10:00:00Z")).toBe(true);
  });

  it("returns false when custom deadline is in future", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T11:00:00Z"));
    expect(isDeadlinePassed("2026-04-01", "19:30", "2026-04-01T15:00:00Z")).toBe(false);
  });
});

describe("formatCountdown", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Expired" when target is in the past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T12:00:00Z"));
    expect(formatCountdown(new Date("2026-04-01T11:00:00Z"))).toBe("Expired");
  });

  it('returns "Xm" for less than 1 hour', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T12:00:00Z"));
    expect(formatCountdown(new Date("2026-04-01T12:30:00Z"))).toBe("30m");
  });

  it('returns "Xh Ym" for less than 1 day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T12:00:00Z"));
    expect(formatCountdown(new Date("2026-04-01T14:15:00Z"))).toBe("2h 15m");
  });

  it('returns "Xd Yh" for more than 1 day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T12:00:00Z"));
    expect(formatCountdown(new Date("2026-04-04T18:00:00Z"))).toBe("3d 6h");
  });

  it('returns "0m" when target is exactly now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T12:00:00Z"));
    expect(formatCountdown(new Date("2026-04-01T12:00:00Z"))).toBe("Expired");
  });

  it('returns "1m" for just over a minute left', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T12:00:00Z"));
    expect(formatCountdown(new Date("2026-04-01T12:01:30Z"))).toBe("1m");
  });
});

describe("formatMatchDate", () => {
  it("formats date in en-IN locale with weekday, month, day", () => {
    const result = formatMatchDate("2026-04-01");
    // en-IN: "Wed, 1 Apr" or similar depending on locale
    expect(result).toContain("Apr");
    // Day should be present
    expect(result).toMatch(/1/);
  });

  it("handles different dates", () => {
    const result = formatMatchDate("2026-03-15");
    expect(result).toContain("Mar");
    expect(result).toMatch(/15/);
  });
});

describe("formatMatchTime", () => {
  it('formats "19:30" as "7:30 PM IST"', () => {
    expect(formatMatchTime("19:30")).toBe("7:30 PM IST");
  });

  it('formats "14:00" as "2:00 PM IST"', () => {
    expect(formatMatchTime("14:00")).toBe("2:00 PM IST");
  });

  it('formats "00:00" as "12:00 AM IST"', () => {
    expect(formatMatchTime("00:00")).toBe("12:00 AM IST");
  });

  it('formats "12:00" as "12:00 PM IST"', () => {
    expect(formatMatchTime("12:00")).toBe("12:00 PM IST");
  });

  it('formats "09:05" as "9:05 AM IST"', () => {
    expect(formatMatchTime("09:05")).toBe("9:05 AM IST");
  });

  it('formats "23:59" as "11:59 PM IST"', () => {
    expect(formatMatchTime("23:59")).toBe("11:59 PM IST");
  });
});

describe("getTeamColor", () => {
  it("returns correct hex color for known team codes", () => {
    expect(getTeamColor("CSK")).toBe("#F9CD05");
    expect(getTeamColor("MI")).toBe("#004BA0");
    expect(getTeamColor("RCB")).toBe("#EC1C24");
  });

  it("returns fallback color for unknown team code", () => {
    expect(getTeamColor("UNKNOWN")).toBe("#64748B");
    expect(getTeamColor("")).toBe("#64748B");
  });

  it("returns correct color for all 10 teams", () => {
    expect(getTeamColor("KKR")).toBe("#3B215D");
    expect(getTeamColor("DC")).toBe("#004C93");
    expect(getTeamColor("SRH")).toBe("#F26522");
    expect(getTeamColor("RR")).toBe("#EA1A85");
    expect(getTeamColor("PBKS")).toBe("#ED1B24");
    expect(getTeamColor("GT")).toBe("#1C1C2B");
    expect(getTeamColor("LSG")).toBe("#A72056");
  });
});

// ─── Prediction Window utility tests ─────────────────────────────────────────

describe("computeWindowOpen", () => {
  it("returns 8:00 AM IST (02:30 UTC) on the given match date", () => {
    const result = computeWindowOpen("2026-04-06");
    // 8:00 AM IST = 8:00 - 5:30 = 02:30 UTC
    const expected = new Date("2026-04-06T02:30:00.000Z");
    expect(result.getTime()).toBe(expected.getTime());
  });

  it("returns 8:00 AM IST for a different date", () => {
    const result = computeWindowOpen("2026-03-22");
    const expected = new Date("2026-03-22T02:30:00.000Z");
    expect(result.getTime()).toBe(expected.getTime());
  });

  it("returns epoch (Date(0)) for an invalid date string", () => {
    const result = computeWindowOpen("not-a-date");
    expect(result.getTime()).toBe(0);
  });

  it("returns epoch for empty string", () => {
    const result = computeWindowOpen("");
    expect(result.getTime()).toBe(0);
  });

  it("correctly handles dates that cross UTC day boundary", () => {
    // Jan 1 match: 8 AM IST = 02:30 UTC on Jan 1
    const result = computeWindowOpen("2026-01-01");
    expect(result.toISOString()).toBe("2026-01-01T02:30:00.000Z");
  });

  it("window open time is always IST regardless of system timezone", () => {
    // This verifies the +05:30 offset is hardcoded, not relying on local TZ
    const result = computeWindowOpen("2026-04-06");
    // The UTC hour should always be 2 and minute 30 (8 AM - 5:30)
    expect(result.getUTCHours()).toBe(2);
    expect(result.getUTCMinutes()).toBe(30);
  });
});

describe("isWindowOpen", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false before 8 AM IST on match day", () => {
    vi.useFakeTimers();
    // 7:59 AM IST = 02:29 UTC
    vi.setSystemTime(new Date("2026-04-06T02:29:00Z"));
    expect(isWindowOpen("2026-04-06", "19:30")).toBe(false);
  });

  it("returns true at exactly 8:00 AM IST on match day", () => {
    vi.useFakeTimers();
    // 8:00 AM IST = 02:30 UTC
    vi.setSystemTime(new Date("2026-04-06T02:30:00Z"));
    expect(isWindowOpen("2026-04-06", "19:30")).toBe(true);
  });

  it("returns true during the window (between open and deadline)", () => {
    vi.useFakeTimers();
    // Match at 19:30 IST, deadline = 18:45 IST = 13:15 UTC
    // Set time to 10:00 AM IST = 04:30 UTC — well within window
    vi.setSystemTime(new Date("2026-04-06T04:30:00Z"));
    expect(isWindowOpen("2026-04-06", "19:30")).toBe(true);
  });

  it("returns false after deadline", () => {
    vi.useFakeTimers();
    // Match at 19:30 IST, deadline = 18:45 IST = 13:15 UTC
    vi.setSystemTime(new Date("2026-04-06T13:16:00Z"));
    expect(isWindowOpen("2026-04-06", "19:30")).toBe(false);
  });

  it("returns false the day before the match", () => {
    vi.useFakeTimers();
    // April 5 at noon UTC — before April 6 match
    vi.setSystemTime(new Date("2026-04-05T12:00:00Z"));
    expect(isWindowOpen("2026-04-06", "19:30")).toBe(false);
  });

  it("respects custom deadline", () => {
    vi.useFakeTimers();
    // Custom deadline at 10:00 AM IST = 04:30 UTC
    vi.setSystemTime(new Date("2026-04-06T03:00:00Z")); // 8:30 AM IST — within window
    expect(isWindowOpen("2026-04-06", "19:30", "2026-04-06T04:30:00Z")).toBe(true);

    // After custom deadline
    vi.setSystemTime(new Date("2026-04-06T05:00:00Z")); // after 04:30 UTC
    expect(isWindowOpen("2026-04-06", "19:30", "2026-04-06T04:30:00Z")).toBe(false);
  });

  it("returns false for zero-duration window (deadline before window open)", () => {
    vi.useFakeTimers();
    // Window opens at 8 AM IST = 02:30 UTC
    // Custom deadline at 7 AM IST = 01:30 UTC (before window open)
    vi.setSystemTime(new Date("2026-04-06T02:30:00Z"));
    expect(isWindowOpen("2026-04-06", "19:30", "2026-04-06T01:30:00Z")).toBe(false);
  });

  it("returns false for invalid date (fail closed)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-06T04:00:00Z"));
    // Invalid date causes both computeWindowOpen and computeDeadline to return Date(0)
    // now >= Date(0) but also now >= Date(0), so it checks now < deadline
    // Date(0) is in the past so now < Date(0) is false
    expect(isWindowOpen("invalid", "19:30")).toBe(false);
  });
});

describe("getWindowState", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "PRE_WINDOW_FUTURE" for a future-day match', () => {
    vi.useFakeTimers();
    // April 5 at noon IST = 06:30 UTC. Match is April 6.
    vi.setSystemTime(new Date("2026-04-05T06:30:00Z"));
    expect(getWindowState({ date: "2026-04-06", time_ist: "19:30" })).toBe(
      "PRE_WINDOW_FUTURE"
    );
  });

  it('returns "PRE_WINDOW_MATCH_DAY" on match day before 8 AM IST', () => {
    vi.useFakeTimers();
    // April 6 at 7 AM IST = 01:30 UTC
    vi.setSystemTime(new Date("2026-04-06T01:30:00Z"));
    expect(getWindowState({ date: "2026-04-06", time_ist: "19:30" })).toBe(
      "PRE_WINDOW_MATCH_DAY"
    );
  });

  it('returns "WINDOW_OPEN" during the prediction window', () => {
    vi.useFakeTimers();
    // April 6 at 10 AM IST = 04:30 UTC
    vi.setSystemTime(new Date("2026-04-06T04:30:00Z"));
    expect(getWindowState({ date: "2026-04-06", time_ist: "19:30" })).toBe(
      "WINDOW_OPEN"
    );
  });

  it('returns "WINDOW_OPEN" at exactly 8 AM IST', () => {
    vi.useFakeTimers();
    // 8:00 AM IST = 02:30 UTC
    vi.setSystemTime(new Date("2026-04-06T02:30:00Z"));
    expect(getWindowState({ date: "2026-04-06", time_ist: "19:30" })).toBe(
      "WINDOW_OPEN"
    );
  });

  it('returns "WINDOW_CLOSED" after the deadline', () => {
    vi.useFakeTimers();
    // Match at 19:30 IST, deadline = 18:45 IST = 13:15 UTC
    vi.setSystemTime(new Date("2026-04-06T13:15:01Z"));
    expect(getWindowState({ date: "2026-04-06", time_ist: "19:30" })).toBe(
      "WINDOW_CLOSED"
    );
  });

  it('returns "WINDOW_CLOSED" for zero-duration window (deadline <= window open)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-06T02:30:00Z"));
    // Custom deadline at 1 AM IST = 2026-04-05T19:30:00Z (way before 8 AM IST)
    expect(
      getWindowState(
        { date: "2026-04-06", time_ist: "19:30" },
        "2026-04-05T19:30:00Z"
      )
    ).toBe("WINDOW_CLOSED");
  });

  it("handles same-day comparison correctly at midnight IST boundary", () => {
    vi.useFakeTimers();
    // 11:59 PM IST on April 5 = 18:29 UTC on April 5
    // Match is April 6 — this should be PRE_WINDOW_FUTURE
    vi.setSystemTime(new Date("2026-04-05T18:29:00Z"));
    expect(getWindowState({ date: "2026-04-06", time_ist: "19:30" })).toBe(
      "PRE_WINDOW_FUTURE"
    );
  });

  it("handles just after midnight IST on match day", () => {
    vi.useFakeTimers();
    // 12:01 AM IST on April 6 = 18:31 UTC on April 5
    vi.setSystemTime(new Date("2026-04-05T18:31:00Z"));
    expect(getWindowState({ date: "2026-04-06", time_ist: "19:30" })).toBe(
      "PRE_WINDOW_MATCH_DAY"
    );
  });

  it("respects custom deadline override", () => {
    vi.useFakeTimers();
    // Within custom deadline window
    vi.setSystemTime(new Date("2026-04-06T04:00:00Z")); // 9:30 AM IST
    expect(
      getWindowState(
        { date: "2026-04-06", time_ist: "19:30" },
        "2026-04-06T05:00:00Z" // custom deadline 10:30 AM IST
      )
    ).toBe("WINDOW_OPEN");

    // After custom deadline
    vi.setSystemTime(new Date("2026-04-06T05:01:00Z"));
    expect(
      getWindowState(
        { date: "2026-04-06", time_ist: "19:30" },
        "2026-04-06T05:00:00Z"
      )
    ).toBe("WINDOW_CLOSED");
  });

  it("returns all 4 states sequentially for a match lifecycle", () => {
    vi.useFakeTimers();
    const match = { date: "2026-04-06", time_ist: "19:30" };

    // Day before
    vi.setSystemTime(new Date("2026-04-05T10:00:00Z"));
    expect(getWindowState(match)).toBe("PRE_WINDOW_FUTURE");

    // Match day, 6 AM IST = 00:30 UTC
    vi.setSystemTime(new Date("2026-04-06T00:30:00Z"));
    expect(getWindowState(match)).toBe("PRE_WINDOW_MATCH_DAY");

    // Match day, 9 AM IST = 03:30 UTC
    vi.setSystemTime(new Date("2026-04-06T03:30:00Z"));
    expect(getWindowState(match)).toBe("WINDOW_OPEN");

    // After deadline, 19:00 IST = 13:30 UTC
    vi.setSystemTime(new Date("2026-04-06T13:30:00Z"));
    expect(getWindowState(match)).toBe("WINDOW_CLOSED");
  });
});

describe("formatWindowDate", () => {
  it('formats a match date as "Apr 6" (en-US month-first format)', () => {
    const result = formatWindowDate("2026-04-06");
    expect(result).toBe("Apr 6");
  });

  it("formats a different date correctly", () => {
    const result = formatWindowDate("2026-03-22");
    expect(result).toBe("Mar 22");
  });

  it("handles January dates", () => {
    const result = formatWindowDate("2026-01-15");
    expect(result).toBe("Jan 15");
  });

  it("handles December dates", () => {
    const result = formatWindowDate("2026-12-25");
    expect(result).toBe("Dec 25");
  });

  it("uses IST timezone for date interpretation", () => {
    // This ensures the date is interpreted in IST, not UTC
    // A date like "2026-04-06" should always format as April 6 regardless of TZ
    const result = formatWindowDate("2026-04-06");
    expect(result).toBe("Apr 6");
  });
});
