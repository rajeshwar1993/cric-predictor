import { z } from "zod/v4";
import { LIMITS, CUSTOM_SCENARIO_POINTS } from "./constants";

// Auth — email only (display name collected in onboarding)
export const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
});

// Onboarding — collected after first sign-in
export const onboardingSchema = z.object({
  displayName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(30, "Name must be at most 30 characters"),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine(
      (val) => {
        const dob = new Date(val);
        if (isNaN(dob.getTime())) return false;
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        return age >= 18;
      },
      "You must be 18 or older to use Bragg"
    ),
  acceptedTerms: z.literal(true, "You must accept the terms to continue"),
});

// Groups
export const createGroupSchema = z.object({
  name: z
    .string()
    .min(3, "Group name must be at least 3 characters")
    .max(50, "Group name must be at most 50 characters"),
});

export const joinGroupSchema = z.object({
  inviteCode: z.string().length(12, "Invalid invite code"),
});

// Predictions
export const submitPredictionSchema = z.object({
  scenarioId: z.uuid(),
  value: z.string().min(1, "Please select a prediction"),
});

export const submitPredictionsSchema = z.object({
  predictions: z
    .array(submitPredictionSchema)
    .min(1, "Submit at least one prediction"),
});

// Custom Scenarios
export const createCustomScenarioSchema = z.object({
  groupId: z.uuid(),
  matchId: z.number().int().positive(),
  title: z
    .string()
    .min(5, "Scenario title must be at least 5 characters")
    .max(120, "Scenario title must be at most 120 characters"),
  options: z
    .array(z.string().min(1).max(50))
    .min(2, "At least 2 options required")
    .max(6, "At most 6 options allowed"),
  points: z.literal(CUSTOM_SCENARIO_POINTS[0])
    .or(z.literal(CUSTOM_SCENARIO_POINTS[1]))
    .or(z.literal(CUSTOM_SCENARIO_POINTS[2]))
    .or(z.literal(CUSTOM_SCENARIO_POINTS[3]))
    .or(z.literal(CUSTOM_SCENARIO_POINTS[4])),
});

// Admin — Result Entry
export const enterResultSchema = z.object({
  matchId: z.number().int().positive(),
  matchWinner: z.string().min(1),
  tossWinner: z.string().min(1),
  topScorer: z.string().optional(),
  topScorerRuns: z.number().int().nonnegative().optional(),
  topWicketTaker: z.string().optional(),
  topWicketTakerWickets: z.number().int().nonnegative().optional(),
  playerOfMatch: z.string().optional(),
  firstInningsScore: z.number().int().nonnegative().optional(),
  firstInningsWickets: z.number().int().min(0).max(10).optional(),
  totalMatchRuns: z.number().int().nonnegative().optional(),
  totalMatchWickets: z.number().int().min(0).max(20).optional(),
  totalMatchSixes: z.number().int().nonnegative().optional(),
  powerplayScore: z.number().int().nonnegative().optional(),
  powerplayWickets: z.number().int().min(0).max(6).optional(),
  hadSuperOver: z.boolean().optional(),
  mostSixesPlayer: z.string().optional(),
  firstWicketOver: z.number().int().min(1).max(20).optional(),
  batsmanScoredFifty: z.boolean().optional(),
  bowlerTookThree: z.boolean().optional(),
});

// Admin — Settings
export const updateGroupSettingsSchema = z.object({
  groupId: z.uuid(),
  matchId: z.number().int().positive(),
  predictionDeadline: z.iso.datetime().optional(),
  isLocked: z.boolean().optional(),
});

// Member management
export const updateMemberSchema = z.object({
  groupId: z.uuid(),
  userId: z.uuid(),
  action: z.enum(["approve", "reject", "promote", "demote", "remove"]),
});

// Types inferred from schemas
export type LoginInput = z.infer<typeof loginSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type JoinGroupInput = z.infer<typeof joinGroupSchema>;
export type SubmitPredictionInput = z.infer<typeof submitPredictionSchema>;
export type SubmitPredictionsInput = z.infer<typeof submitPredictionsSchema>;
export type CreateCustomScenarioInput = z.infer<typeof createCustomScenarioSchema>;
export type EnterResultInput = z.infer<typeof enterResultSchema>;
export type UpdateGroupSettingsInput = z.infer<typeof updateGroupSettingsSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
