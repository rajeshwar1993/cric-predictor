import type { Prediction } from "@/types";

export const MOCK_PREDICTIONS: Prediction[] = [
  { id: "pred-01", user_id: "user-001", scenario_id: "sc-01", value: "CSK", is_correct: null, points_earned: 0, submitted_at: "2026-03-29T12:00:00Z" },
  { id: "pred-02", user_id: "user-001", scenario_id: "sc-02", value: "MI", is_correct: null, points_earned: 0, submitted_at: "2026-03-29T12:00:00Z" },
  { id: "pred-03", user_id: "user-001", scenario_id: "sc-06", value: "170-189", is_correct: null, points_earned: 0, submitted_at: "2026-03-29T12:00:00Z" },
  { id: "pred-04", user_id: "user-001", scenario_id: "sc-09", value: "Yes", is_correct: null, points_earned: 0, submitted_at: "2026-03-29T12:00:00Z" },
];

export const MOCK_RESOLVED_PREDICTIONS: Prediction[] = [
  { id: "pred-r1", user_id: "user-001", scenario_id: "sc-01", value: "RCB", is_correct: true, points_earned: 10, submitted_at: "2026-03-28T12:00:00Z" },
  { id: "pred-r2", user_id: "user-001", scenario_id: "sc-02", value: "SRH", is_correct: false, points_earned: 0, submitted_at: "2026-03-28T12:00:00Z" },
  { id: "pred-r3", user_id: "user-001", scenario_id: "sc-06", value: "170-189", is_correct: true, points_earned: 10, submitted_at: "2026-03-28T12:00:00Z" },
];
