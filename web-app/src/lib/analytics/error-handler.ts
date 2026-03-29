/**
 * Global unhandled error and rejection handlers.
 *
 * Catches errors that escape React error boundaries (e.g., errors in
 * third-party scripts, async errors outside the React tree).
 *
 * Uses addEventListener (not window.onerror assignment) to avoid
 * overwriting handlers registered by other libraries.
 *
 * Includes deduplication to prevent event floods when the same error
 * fires repeatedly within a 5-second window.
 *
 * Call `registerGlobalErrorHandlers()` once on app mount.
 * Client-side only. Idempotent -- safe to call multiple times.
 */

import { ANALYTICS_EVENTS } from "@/lib/posthog/events";

interface ErrorRecord {
  key: string;
  timestamp: number;
}

const DEDUP_WINDOW_MS = 5000;
let recentErrors: ErrorRecord[] = [];
let registered = false;

function isDuplicate(key: string): boolean {
  const now = Date.now();
  recentErrors = recentErrors.filter((e) => now - e.timestamp < DEDUP_WINDOW_MS);
  if (recentErrors.some((e) => e.key === key)) return true;
  recentErrors.push({ key, timestamp: now });
  return false;
}

/**
 * Registers global error handlers for errors that escape React error boundaries.
 * Call once on app mount (in PostHogProvider or a similar client-side init point).
 * Idempotent -- duplicate calls are no-ops.
 */
export function registerGlobalErrorHandlers(): void {
  if (typeof window === "undefined") return;
  if (registered) return;
  registered = true;

  window.addEventListener("error", (event: ErrorEvent) => {
    const key = `${String(event.message)}:${event.filename}`;
    if (isDuplicate(key)) return;

    // Async import to avoid loading analytics eagerly
    import("./index").then(({ trackEvent }) => {
      trackEvent(ANALYTICS_EVENTS.UNHANDLED_ERROR, {
        error_message:
          typeof event.message === "string"
            ? event.message.slice(0, 500)
            : "Unknown error",
        error_source: event.filename ? String(event.filename).slice(0, 200) : undefined,
        error_line: event.lineno,
        error_col: event.colno,
        error_stack: event.error?.stack?.slice(0, 1000),
        is_unhandled_rejection: false,
        page_path: window.location.pathname,
      });
    });
  });

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const message =
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason);
    const key = `rejection:${message}`;
    if (isDuplicate(key)) return;

    import("./index").then(({ trackEvent }) => {
      trackEvent(ANALYTICS_EVENTS.UNHANDLED_ERROR, {
        error_message: message.slice(0, 500),
        error_stack:
          event.reason instanceof Error
            ? event.reason.stack?.slice(0, 1000)
            : undefined,
        is_unhandled_rejection: true,
        page_path: window.location.pathname,
      });
    });
  });
}
