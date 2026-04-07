/**
 * Centralized analytics event name constants.
 * Grouped by feature area per PRD Analytics section.
 * Later stories extend this file with additional events as needed.
 */

// Auth
export const AUTH_MAGIC_LINK_REQUESTED = 'auth_magic_link_requested' as const
export const AUTH_MAGIC_LINK_RESENT = 'auth_magic_link_resent' as const
export const AUTH_CALLBACK_SUCCESS = 'auth_callback_success' as const
export const AUTH_CALLBACK_FAILED = 'auth_callback_failed' as const
export const AUTH_ONBOARDING_COMPLETED = 'auth_onboarding_completed' as const
export const AUTH_SIGNED_OUT = 'auth_signed_out' as const
export const AUTH_ACCOUNT_DELETED = 'auth_account_deleted' as const

// Gangs
export const GANG_CREATED = 'gang_created' as const
export const GANG_JOIN_REQUESTED = 'gang_join_requested' as const
export const GANG_INVITE_COPIED = 'gang_invite_copied' as const
export const GANG_INVITE_SHARED = 'gang_invite_shared' as const
export const GANG_MEMBER_APPROVED = 'gang_member_approved' as const
export const GANG_MEMBER_REJECTED = 'gang_member_rejected' as const
export const GANG_MEMBER_REMOVED = 'gang_member_removed' as const
export const GANG_MEMBER_LEFT = 'gang_member_left' as const
export const GANG_MEMBER_BLOCKED = 'gang_member_blocked' as const
export const GANG_MEMBER_UNBLOCKED = 'gang_member_unblocked' as const
export const GANG_DELETED = 'gang_deleted' as const
export const GANG_SETTINGS_UPDATED = 'gang_settings_updated' as const

// Predictions
export const PREDICTION_SUBMITTED = 'prediction_submitted' as const
export const PREDICTION_PICK_CHANGED = 'prediction_pick_changed' as const
export const PREDICTION_PAGE_VIEWED = 'prediction_page_viewed' as const
export const PREDICTION_PAGE_REVISITED = 'prediction_page_revisited' as const

// Notifications
export const NOTIFICATION_BELL_OPENED = 'notification_bell_opened' as const
export const NOTIFICATION_CLICKED = 'notification_clicked' as const
export const NOTIFICATION_MARKED_READ = 'notification_marked_read' as const
export const NOTIFICATION_ALL_MARKED_READ = 'notification_all_marked_read' as const

// Performance
export const WEB_VITALS_LCP = 'web_vitals_lcp' as const
export const WEB_VITALS_INP = 'web_vitals_inp' as const
export const WEB_VITALS_CLS = 'web_vitals_cls' as const
export const PAGE_LOAD_TIME = 'page_load_time' as const
export const SERVER_ACTION_DURATION = 'server_action_duration' as const

// Errors
export const ERROR_BOUNDARY_CAUGHT = 'error_boundary_caught' as const
export const ERROR_LOGGED = 'error_logged' as const
export const UNHANDLED_ERROR = 'unhandled_error' as const

// Security
export const RATE_LIMIT_HIT = 'rate_limit_hit' as const
