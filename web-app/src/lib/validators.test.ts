import {
  loginSchema,
  createGroupSchema,
  joinGroupSchema,
  submitPredictionSchema,
  submitPredictionsSchema,
  createCustomScenarioSchema,
  enterResultSchema,
  updateGroupSettingsSchema,
  updateMemberSchema,
} from "./validators";

// Helper: generate a valid UUID v4
const uuid = () => "550e8400-e29b-41d4-a716-446655440000";

describe("loginSchema", () => {
  it("accepts valid email", () => {
    const result = loginSchema.safeParse({ email: "test@example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects empty email", () => {
    const result = loginSchema.safeParse({ email: "" });
    expect(result.success).toBe(false);
  });
});

describe("createGroupSchema", () => {
  it("accepts valid group name", () => {
    const result = createGroupSchema.safeParse({ name: "My Group" });
    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 3 characters", () => {
    const result = createGroupSchema.safeParse({ name: "AB" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 50 characters", () => {
    const result = createGroupSchema.safeParse({ name: "A".repeat(51) });
    expect(result.success).toBe(false);
  });

  it("accepts boundary lengths (3 and 50)", () => {
    expect(createGroupSchema.safeParse({ name: "ABC" }).success).toBe(true);
    expect(createGroupSchema.safeParse({ name: "A".repeat(50) }).success).toBe(true);
  });
});

describe("joinGroupSchema", () => {
  it("accepts a 12-character invite code", () => {
    const result = joinGroupSchema.safeParse({ inviteCode: "abcdef123456" });
    expect(result.success).toBe(true);
  });

  it("rejects code shorter than 12 characters", () => {
    const result = joinGroupSchema.safeParse({ inviteCode: "abc123" });
    expect(result.success).toBe(false);
  });

  it("rejects code longer than 12 characters", () => {
    const result = joinGroupSchema.safeParse({ inviteCode: "abcdef1234567" });
    expect(result.success).toBe(false);
  });

  it("rejects empty string", () => {
    const result = joinGroupSchema.safeParse({ inviteCode: "" });
    expect(result.success).toBe(false);
  });
});

describe("submitPredictionSchema", () => {
  it("accepts valid prediction", () => {
    const result = submitPredictionSchema.safeParse({
      scenarioId: uuid(),
      value: "CSK",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid scenarioId (not UUID)", () => {
    const result = submitPredictionSchema.safeParse({
      scenarioId: "not-a-uuid",
      value: "CSK",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty value", () => {
    const result = submitPredictionSchema.safeParse({
      scenarioId: uuid(),
      value: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("submitPredictionsSchema", () => {
  it("accepts array with one prediction", () => {
    const result = submitPredictionsSchema.safeParse({
      predictions: [{ scenarioId: uuid(), value: "CSK" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts array with multiple predictions", () => {
    const result = submitPredictionsSchema.safeParse({
      predictions: [
        { scenarioId: uuid(), value: "CSK" },
        { scenarioId: uuid(), value: "MI" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty predictions array", () => {
    const result = submitPredictionsSchema.safeParse({
      predictions: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects prediction with missing fields", () => {
    const result = submitPredictionsSchema.safeParse({
      predictions: [{ scenarioId: uuid() }],
    });
    expect(result.success).toBe(false);
  });
});

describe("createCustomScenarioSchema", () => {
  const validScenario = {
    groupId: uuid(),
    matchId: 1,
    title: "Who will hit the first six?",
    options: ["Player A", "Player B"],
    points: 10,
  };

  it("accepts valid custom scenario", () => {
    const result = createCustomScenarioSchema.safeParse(validScenario);
    expect(result.success).toBe(true);
  });

  it("rejects fewer than 2 options", () => {
    const result = createCustomScenarioSchema.safeParse({
      ...validScenario,
      options: ["Only one"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 6 options", () => {
    const result = createCustomScenarioSchema.safeParse({
      ...validScenario,
      options: ["A", "B", "C", "D", "E", "F", "G"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts exactly 2 and exactly 6 options", () => {
    expect(
      createCustomScenarioSchema.safeParse({
        ...validScenario,
        options: ["A", "B"],
      }).success
    ).toBe(true);
    expect(
      createCustomScenarioSchema.safeParse({
        ...validScenario,
        options: ["A", "B", "C", "D", "E", "F"],
      }).success
    ).toBe(true);
  });

  it("rejects invalid points value", () => {
    const result = createCustomScenarioSchema.safeParse({
      ...validScenario,
      points: 7,
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid point values (5, 10, 15, 20, 25)", () => {
    for (const pts of [5, 10, 15, 20, 25]) {
      expect(
        createCustomScenarioSchema.safeParse({ ...validScenario, points: pts }).success
      ).toBe(true);
    }
  });

  it("rejects title shorter than 5 characters", () => {
    const result = createCustomScenarioSchema.safeParse({
      ...validScenario,
      title: "Who?",
    });
    expect(result.success).toBe(false);
  });

  it("rejects title longer than 120 characters", () => {
    const result = createCustomScenarioSchema.safeParse({
      ...validScenario,
      title: "A".repeat(121),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid groupId", () => {
    const result = createCustomScenarioSchema.safeParse({
      ...validScenario,
      groupId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-positive matchId", () => {
    expect(
      createCustomScenarioSchema.safeParse({ ...validScenario, matchId: 0 }).success
    ).toBe(false);
    expect(
      createCustomScenarioSchema.safeParse({ ...validScenario, matchId: -1 }).success
    ).toBe(false);
  });

  it("rejects empty option string", () => {
    const result = createCustomScenarioSchema.safeParse({
      ...validScenario,
      options: ["Valid", ""],
    });
    expect(result.success).toBe(false);
  });

  it("rejects option string longer than 50 characters", () => {
    const result = createCustomScenarioSchema.safeParse({
      ...validScenario,
      options: ["Valid", "A".repeat(51)],
    });
    expect(result.success).toBe(false);
  });
});

describe("enterResultSchema", () => {
  const validResult = {
    matchId: 1,
    matchWinner: "CSK",
    tossWinner: "MI",
  };

  it("accepts valid minimal result", () => {
    const result = enterResultSchema.safeParse(validResult);
    expect(result.success).toBe(true);
  });

  it("accepts result with all optional fields", () => {
    const result = enterResultSchema.safeParse({
      ...validResult,
      topScorer: "Virat Kohli",
      topScorerRuns: 85,
      topWicketTaker: "Jasprit Bumrah",
      topWicketTakerWickets: 4,
      playerOfMatch: "Virat Kohli",
      firstInningsScore: 185,
      firstInningsWickets: 6,
      totalMatchRuns: 350,
      totalMatchWickets: 14,
      totalMatchSixes: 22,
      powerplayScore: 55,
      powerplayWickets: 2,
      hadSuperOver: false,
      mostSixesPlayer: "AB de Villiers",
      firstWicketOver: 3,
      batsmanScoredFifty: true,
      bowlerTookThree: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid matchId", () => {
    expect(
      enterResultSchema.safeParse({ ...validResult, matchId: 0 }).success
    ).toBe(false);
    expect(
      enterResultSchema.safeParse({ ...validResult, matchId: -1 }).success
    ).toBe(false);
    expect(
      enterResultSchema.safeParse({ ...validResult, matchId: 1.5 }).success
    ).toBe(false);
  });

  it("rejects empty matchWinner", () => {
    const result = enterResultSchema.safeParse({
      ...validResult,
      matchWinner: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty tossWinner", () => {
    const result = enterResultSchema.safeParse({
      ...validResult,
      tossWinner: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid powerplayWickets (>6)", () => {
    const result = enterResultSchema.safeParse({
      ...validResult,
      powerplayWickets: 7,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid firstWicketOver (>20)", () => {
    const result = enterResultSchema.safeParse({
      ...validResult,
      firstWicketOver: 21,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateGroupSettingsSchema", () => {
  it("accepts valid input", () => {
    const result = updateGroupSettingsSchema.safeParse({
      groupId: uuid(),
      matchId: 1,
    });
    expect(result.success).toBe(true);
  });

  it("accepts with optional fields", () => {
    const result = updateGroupSettingsSchema.safeParse({
      groupId: uuid(),
      matchId: 1,
      predictionDeadline: "2026-04-01T12:00:00Z",
      isLocked: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid groupId", () => {
    const result = updateGroupSettingsSchema.safeParse({
      groupId: "not-a-uuid",
      matchId: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-positive matchId", () => {
    const result = updateGroupSettingsSchema.safeParse({
      groupId: uuid(),
      matchId: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateMemberSchema", () => {
  it("accepts valid input", () => {
    const result = updateMemberSchema.safeParse({
      groupId: uuid(),
      userId: uuid(),
      action: "approve",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid actions", () => {
    for (const action of ["approve", "reject", "promote", "demote", "remove"]) {
      expect(
        updateMemberSchema.safeParse({
          groupId: uuid(),
          userId: uuid(),
          action,
        }).success
      ).toBe(true);
    }
  });

  it("rejects invalid action", () => {
    const result = updateMemberSchema.safeParse({
      groupId: uuid(),
      userId: uuid(),
      action: "ban",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid groupId", () => {
    const result = updateMemberSchema.safeParse({
      groupId: "not-uuid",
      userId: uuid(),
      action: "approve",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid userId", () => {
    const result = updateMemberSchema.safeParse({
      groupId: uuid(),
      userId: "not-uuid",
      action: "approve",
    });
    expect(result.success).toBe(false);
  });
});
