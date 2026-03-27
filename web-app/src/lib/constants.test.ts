import {
  ROUTES,
  IPL_TEAMS,
  TEAM_NAME_TO_CODE,
  SYSTEM_SCENARIOS,
  RANGE_OPTIONS,
  LIMITS,
  CUSTOM_SCENARIO_POINTS,
  APP_NAME,
  PREDICTION_STATUS,
} from "./constants";

describe("ROUTES", () => {
  it("HOME is /", () => {
    expect(ROUTES.HOME).toBe("/");
  });

  it("LOGIN is /login", () => {
    expect(ROUTES.LOGIN).toBe("/login");
  });

  it("DASHBOARD is /dashboard", () => {
    expect(ROUTES.DASHBOARD).toBe("/dashboard");
  });

  it("JOIN(code) returns /join/:code", () => {
    expect(ROUTES.JOIN("abc")).toBe("/join/abc");
    expect(ROUTES.JOIN("xyz123")).toBe("/join/xyz123");
  });

  it("GROUP(groupId) returns /group/:groupId", () => {
    expect(ROUTES.GROUP("g1")).toBe("/group/g1");
  });

  it("PREDICT(groupId, matchId) returns correct path", () => {
    expect(ROUTES.PREDICT("gid", 5)).toBe("/group/gid/predict/5");
    expect(ROUTES.PREDICT("abc", 42)).toBe("/group/abc/predict/42");
  });

  it("MATCH_LEADERBOARD(groupId, matchId) returns correct path", () => {
    expect(ROUTES.MATCH_LEADERBOARD("gid", 5)).toBe("/group/gid/match/5");
  });

  it("STANDINGS(groupId) returns correct path", () => {
    expect(ROUTES.STANDINGS("g1")).toBe("/group/g1/standings");
  });

  it("ADMIN(groupId) returns correct path", () => {
    expect(ROUTES.ADMIN("g1")).toBe("/group/g1/admin");
  });

  it("PRIVACY and TERMS are static routes", () => {
    expect(ROUTES.PRIVACY).toBe("/privacy");
    expect(ROUTES.TERMS).toBe("/terms");
  });

  it("AUTH_CALLBACK is /auth/callback", () => {
    expect(ROUTES.AUTH_CALLBACK).toBe("/auth/callback");
  });
});

describe("TEAM_NAME_TO_CODE", () => {
  it("maps full team names to codes", () => {
    expect(TEAM_NAME_TO_CODE["Chennai Super Kings"]).toBe("CSK");
    expect(TEAM_NAME_TO_CODE["Mumbai Indians"]).toBe("MI");
    expect(TEAM_NAME_TO_CODE["Kolkata Knight Riders"]).toBe("KKR");
    expect(TEAM_NAME_TO_CODE["Delhi Capitals"]).toBe("DC");
    expect(TEAM_NAME_TO_CODE["Sunrisers Hyderabad"]).toBe("SRH");
    expect(TEAM_NAME_TO_CODE["Rajasthan Royals"]).toBe("RR");
    expect(TEAM_NAME_TO_CODE["Punjab Kings"]).toBe("PBKS");
    expect(TEAM_NAME_TO_CODE["Gujarat Titans"]).toBe("GT");
    expect(TEAM_NAME_TO_CODE["Lucknow Super Giants"]).toBe("LSG");
  });

  it("maps both RCB name variants", () => {
    expect(TEAM_NAME_TO_CODE["Royal Challengers Bangalore"]).toBe("RCB");
    expect(TEAM_NAME_TO_CODE["Royal Challengers Bengaluru"]).toBe("RCB");
  });

  it("maps short names to codes", () => {
    expect(TEAM_NAME_TO_CODE["Chennai"]).toBe("CSK");
    expect(TEAM_NAME_TO_CODE["Mumbai"]).toBe("MI");
    expect(TEAM_NAME_TO_CODE["Bengaluru"]).toBe("RCB");
    expect(TEAM_NAME_TO_CODE["Kolkata"]).toBe("KKR");
    expect(TEAM_NAME_TO_CODE["Delhi"]).toBe("DC");
    expect(TEAM_NAME_TO_CODE["Hyderabad"]).toBe("SRH");
    expect(TEAM_NAME_TO_CODE["Rajasthan"]).toBe("RR");
    expect(TEAM_NAME_TO_CODE["Punjab"]).toBe("PBKS");
    expect(TEAM_NAME_TO_CODE["Gujarat"]).toBe("GT");
    expect(TEAM_NAME_TO_CODE["Lucknow"]).toBe("LSG");
  });

  it("returns undefined for unknown team names", () => {
    expect(TEAM_NAME_TO_CODE["Unknown Team"]).toBeUndefined();
  });
});

describe("IPL_TEAMS", () => {
  it("has exactly 10 entries", () => {
    expect(IPL_TEAMS).toHaveLength(10);
  });

  it("each entry has code, name, short_name, color, and text_on_color", () => {
    for (const team of IPL_TEAMS) {
      expect(team).toHaveProperty("code");
      expect(team).toHaveProperty("name");
      expect(team).toHaveProperty("short_name");
      expect(team).toHaveProperty("color");
      expect(team).toHaveProperty("text_on_color");
      expect(typeof team.code).toBe("string");
      expect(typeof team.name).toBe("string");
      expect(typeof team.color).toBe("string");
      expect(["light", "dark"]).toContain(team.text_on_color);
    }
  });

  it("all team codes are unique", () => {
    const codes = IPL_TEAMS.map((t) => t.code);
    expect(new Set(codes).size).toBe(10);
  });

  it("color values are valid hex", () => {
    for (const team of IPL_TEAMS) {
      expect(team.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("contains expected team codes", () => {
    const codes = IPL_TEAMS.map((t) => t.code);
    expect(codes).toEqual(
      expect.arrayContaining(["CSK", "MI", "RCB", "KKR", "DC", "SRH", "RR", "PBKS", "GT", "LSG"])
    );
  });
});

describe("SYSTEM_SCENARIOS", () => {
  it("has 16 entries", () => {
    expect(SYSTEM_SCENARIOS).toHaveLength(16);
  });

  it("each entry has category, label, points, and resolution_phase", () => {
    for (const scenario of SYSTEM_SCENARIOS) {
      expect(typeof scenario.category).toBe("string");
      expect(typeof scenario.label).toBe("string");
      expect(typeof scenario.points).toBe("number");
      expect(typeof scenario.resolution_phase).toBe("string");
      expect(scenario.points).toBeGreaterThan(0);
    }
  });

  it("all categories are unique", () => {
    const categories = SYSTEM_SCENARIOS.map((s) => s.category);
    expect(new Set(categories).size).toBe(16);
  });

  it("contains expected categories", () => {
    const categories = SYSTEM_SCENARIOS.map((s) => s.category);
    expect(categories).toContain("match_winner");
    expect(categories).toContain("toss_winner");
    expect(categories).toContain("top_scorer");
    expect(categories).toContain("first_innings_score");
    expect(categories).toContain("had_super_over");
    expect(categories).toContain("most_sixes");
  });
});

describe("RANGE_OPTIONS", () => {
  it("has keys for expected categories", () => {
    expect(RANGE_OPTIONS).toHaveProperty("first_innings_score");
    expect(RANGE_OPTIONS).toHaveProperty("total_match_runs");
    expect(RANGE_OPTIONS).toHaveProperty("powerplay_score");
    expect(RANGE_OPTIONS).toHaveProperty("powerplay_wickets");
    expect(RANGE_OPTIONS).toHaveProperty("total_sixes");
    expect(RANGE_OPTIONS).toHaveProperty("total_wickets");
    expect(RANGE_OPTIONS).toHaveProperty("first_wicket_over");
  });

  it("each category has an array of string options", () => {
    for (const key of Object.keys(RANGE_OPTIONS)) {
      expect(Array.isArray(RANGE_OPTIONS[key])).toBe(true);
      expect(RANGE_OPTIONS[key].length).toBeGreaterThanOrEqual(2);
      for (const opt of RANGE_OPTIONS[key]) {
        expect(typeof opt).toBe("string");
      }
    }
  });

  it("first_innings_score has 4 brackets", () => {
    expect(RANGE_OPTIONS.first_innings_score).toEqual(["<150", "150-169", "170-189", "190+"]);
  });
});

describe("LIMITS", () => {
  it("has expected values", () => {
    expect(LIMITS.MAX_GROUPS_PER_USER).toBe(10);
    expect(LIMITS.MAX_MEMBERS_PER_GROUP).toBe(10);
    expect(LIMITS.MAX_CUSTOM_SCENARIOS_PER_MEMBER_PER_MATCH).toBe(10);
    expect(LIMITS.MAX_CUSTOM_SCENARIOS_PER_GROUP_PER_MATCH).toBe(30);
    expect(LIMITS.MAGIC_LINK_RESEND_SECONDS).toBe(60);
    expect(LIMITS.PREDICTION_DEADLINE_MINUTES_BEFORE_MATCH).toBe(45);
  });
});

describe("CUSTOM_SCENARIO_POINTS", () => {
  it("contains 5 options", () => {
    expect(CUSTOM_SCENARIO_POINTS).toHaveLength(5);
  });

  it("contains specific point values", () => {
    expect([...CUSTOM_SCENARIO_POINTS]).toEqual([5, 10, 15, 20, 25]);
  });
});

describe("PREDICTION_STATUS", () => {
  it("has CORRECT, WRONG, ON_TRACK, IN_DANGER, PENDING", () => {
    expect(PREDICTION_STATUS.CORRECT.label).toBe("Nailed It");
    expect(PREDICTION_STATUS.WRONG.label).toBe("Missed");
    expect(PREDICTION_STATUS.ON_TRACK.label).toBe("On Track");
    expect(PREDICTION_STATUS.IN_DANGER.label).toBe("Sweating");
    expect(PREDICTION_STATUS.PENDING.label).toBe("In Play");
  });
});
