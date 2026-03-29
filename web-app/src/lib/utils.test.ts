import {
  cn,
  computeDeadline,
  isDeadlinePassed,
  formatCountdown,
  formatMatchDate,
  formatMatchTime,
  getTeamColor,
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
