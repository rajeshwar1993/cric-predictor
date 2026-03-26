import type { MatchLeaderboardEntry, SeasonStanding } from "@/types";

export const MOCK_MATCH_LEADERBOARD: MatchLeaderboardEntry[] = [
  { group_id: "group-001", match_id: 1, user_id: "user-001", display_name: "Rajesh Kumar", predicted_count: 12, correct_count: 8, resolved_count: 12, match_points: 85, earliest_submission: "2026-03-28T12:00:00Z", rank: 1 },
  { group_id: "group-001", match_id: 1, user_id: "user-002", display_name: "Priya Sharma", predicted_count: 16, correct_count: 7, resolved_count: 16, match_points: 70, earliest_submission: "2026-03-28T13:00:00Z", rank: 2 },
  { group_id: "group-001", match_id: 1, user_id: "user-003", display_name: "Arjun Patel", predicted_count: 10, correct_count: 6, resolved_count: 10, match_points: 55, earliest_submission: "2026-03-28T11:30:00Z", rank: 3 },
  { group_id: "group-001", match_id: 1, user_id: "user-004", display_name: "Sneha Iyer", predicted_count: 16, correct_count: 5, resolved_count: 16, match_points: 45, earliest_submission: "2026-03-28T14:00:00Z", rank: 4 },
  { group_id: "group-001", match_id: 1, user_id: "user-005", display_name: "Vikram Singh", predicted_count: 8, correct_count: 3, resolved_count: 8, match_points: 30, earliest_submission: "2026-03-28T14:30:00Z", rank: 5 },
];

export const MOCK_SEASON_STANDINGS: SeasonStanding[] = [
  { group_id: "group-001", user_id: "user-001", display_name: "Rajesh Kumar", role: "owner", matches_predicted: 5, total_points: 385, points_per_match: 77, accuracy_pct: 62.5, rank: 1 },
  { group_id: "group-001", user_id: "user-002", display_name: "Priya Sharma", role: "admin", matches_predicted: 5, total_points: 350, points_per_match: 70, accuracy_pct: 58.3, rank: 2 },
  { group_id: "group-001", user_id: "user-003", display_name: "Arjun Patel", role: "member", matches_predicted: 4, total_points: 290, points_per_match: 72.5, accuracy_pct: 55.0, rank: 3 },
  { group_id: "group-001", user_id: "user-004", display_name: "Sneha Iyer", role: "member", matches_predicted: 5, total_points: 265, points_per_match: 53, accuracy_pct: 48.7, rank: 4 },
  { group_id: "group-001", user_id: "user-005", display_name: "Vikram Singh", role: "member", matches_predicted: 3, total_points: 180, points_per_match: 60, accuracy_pct: 50.0, rank: 5 },
];
