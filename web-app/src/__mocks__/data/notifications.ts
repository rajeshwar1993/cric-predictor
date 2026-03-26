import type { Notification } from "@/types";

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "notif-01", user_id: "user-001", type: "results_in", message: "Results are in for RCB vs SRH — check the leaderboard!", group_id: "group-001", match_id: 1, is_read: false, created_at: "2026-03-28T22:00:00Z" },
  { id: "notif-02", user_id: "user-001", type: "predictions_open", message: "Predictions open for CSK vs MI — deadline 6:45 PM IST", group_id: "group-001", match_id: 2, is_read: false, created_at: "2026-03-29T08:00:00Z" },
  { id: "notif-03", user_id: "user-001", type: "join_request", message: "Vikram Singh wants to join Office Cricket Gang", group_id: "group-001", match_id: null, is_read: false, created_at: "2026-03-27T15:00:00Z" },
  { id: "notif-04", user_id: "user-001", type: "approved", message: "You've been approved to join College Buddies!", group_id: "group-002", match_id: null, is_read: true, created_at: "2026-03-25T10:00:00Z" },
  { id: "notif-05", user_id: "user-001", type: "custom_scenario", message: "Arjun proposed a scenario for CSK vs MI — review it", group_id: "group-001", match_id: 2, is_read: true, created_at: "2026-03-26T12:00:00Z" },
];

export const MOCK_NOTIFICATIONS_EMPTY: Notification[] = [];
