export const ANALYTICS_EVENTS = {
  // Auth
  MAGIC_LINK_REQUESTED: 'magic_link_requested',
  MAGIC_LINK_RESENT: 'magic_link_resent',
  AUTH_CALLBACK_SUCCESS: 'auth_callback_success',
  AUTH_CALLBACK_FAILURE: 'auth_callback_failure',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  TERMS_ACCEPTED: 'terms_accepted',
  SIGNED_OUT: 'signed_out',
  ACCOUNT_DELETED: 'account_deleted',

  // Gangs
  GANG_CREATED: 'gang_created',
  JOIN_REQUESTED: 'join_requested',
  INVITE_COPIED: 'invite_copied',
  INVITE_SHARED: 'invite_shared',
  MEMBER_APPROVED: 'member_approved',
  MEMBER_REJECTED: 'member_rejected',
  MEMBER_REMOVED: 'member_removed',
  MEMBER_LEFT: 'member_left',
  GANG_DELETED: 'gang_deleted',

  // Predictions
  PREDICTION_SUBMITTED: 'prediction_submitted',
  PICK_CHANGED: 'pick_changed',
  PREDICT_PAGE_VIEWED: 'predict_page_viewed',
  PREDICT_PAGE_REVISITED: 'predict_page_revisited',

  // Notifications
  BELL_OPENED: 'bell_opened',
  NOTIFICATION_CLICKED: 'notification_clicked',
  NOTIFICATION_MARKED_READ: 'notification_marked_read',
  ALL_NOTIFICATIONS_MARKED_READ: 'all_notifications_marked_read',

  // Performance
  WEB_VITALS: 'web_vitals',
  PAGE_LOAD: 'page_load',
  SERVER_ACTION_DURATION: 'server_action_duration',

  // Security
  RATE_LIMIT_HIT: 'rate_limit_hit',

  // Errors
  ERROR_LOGGED: 'error_logged',
} as const

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]
