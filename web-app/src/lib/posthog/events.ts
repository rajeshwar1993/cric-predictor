/**
 * Centralized PostHog event name constants.
 * snake_case, domain-prefixed.
 */
export const ANALYTICS_EVENTS = {
  // Auth
  AUTH_MAGIC_LINK_REQUESTED: "auth_magic_link_requested",
  AUTH_MAGIC_LINK_RESENT: "auth_magic_link_resent",
  AUTH_CALLBACK_SUCCESS: "auth_callback_success",
  AUTH_CALLBACK_FAILED: "auth_callback_failed",
  AUTH_ONBOARDING_COMPLETED: "auth_onboarding_completed",
  AUTH_SIGNED_OUT: "auth_signed_out",

  // Group lifecycle
  GROUP_CREATED: "group_created",
  GROUP_JOIN_REQUESTED: "group_join_requested",
  GROUP_INVITE_COPIED: "group_invite_copied",
  GROUP_INVITE_SHARED: "group_invite_shared",
  GROUP_MEMBER_APPROVED: "group_member_approved",
  GROUP_MEMBER_REJECTED: "group_member_rejected",
  GROUP_MEMBER_PROMOTED: "group_member_promoted",
  GROUP_MEMBER_DEMOTED: "group_member_demoted",
  GROUP_MEMBER_REMOVED: "group_member_removed",

  // Predictions
  PREDICTION_SUBMITTED: "prediction_submitted",
  PREDICTION_PICK_CHANGED: "prediction_pick_changed",

  // Scenarios
  SCENARIO_CUSTOM_CREATED: "scenario_custom_created",
  SCENARIO_CUSTOM_CREATED_BY_ADMIN: "scenario_custom_created_by_admin",
  SCENARIO_APPROVED: "scenario_approved",
  SCENARIO_REJECTED: "scenario_rejected",
  SCENARIO_REMOVED: "scenario_removed",
  SCENARIO_PUBLISHED: "scenario_published",

  // Admin
  ADMIN_RESULTS_ENTERED: "admin_results_entered",
  ADMIN_SETTINGS_UPDATED: "admin_settings_updated",

  // Notifications
  NOTIFICATION_BELL_OPENED: "notification_bell_opened",
  NOTIFICATION_MARKED_READ: "notification_marked_read",
  NOTIFICATION_ALL_CLEARED: "notification_all_cleared",

  // Errors
  ERROR_BOUNDARY_CAUGHT: "error_boundary_caught",
  ERROR_LOGGED: "error_logged",
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
