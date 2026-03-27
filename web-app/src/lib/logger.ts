/**
 * Centralized error logging for Bragg.
 *
 * - Console output gated by ENABLE_DEBUG_LOGS env var
 * - Transport system for future remote logging (Sentry, Axiom, etc.)
 * - Zero dependencies, Edge-compatible, mockable
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  /** Which layer: "dal", "action", "api", "hook" */
  layer: string;
  /** Function that failed, e.g. "getGroupById" */
  operation: string;
  /** Key-value pairs for debugging (function arguments, IDs, etc.) */
  metadata?: Record<string, unknown>;
}

export interface LogTransport {
  send(level: LogLevel, message: string, context: LogContext, error?: unknown): void;
}

// ── Private state ──────────────────────────────────────────────────
let _transports: LogTransport[] = [];

function isLoggingEnabled(): boolean {
  try {
    return process.env.ENABLE_DEBUG_LOGS === "true";
  } catch {
    return false;
  }
}

interface SupabaseError extends Error {
  code?: string;
  details?: string;
  hint?: string;
}

function formatError(error: unknown): Record<string, unknown> | unknown {
  if (error instanceof Error) {
    const supaErr = error as SupabaseError;
    return {
      message: supaErr.message,
      ...(supaErr.code && { code: supaErr.code }),
      ...(supaErr.details && { details: supaErr.details }),
      ...(supaErr.hint && { hint: supaErr.hint }),
    };
  }
  if (error && typeof error === "object") {
    return error;
  }
  return error;
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Register a log transport (e.g., Sentry, Axiom, Datadog).
 * Call once at app startup.
 */
export function registerTransport(transport: LogTransport): void {
  _transports.push(transport);
}

/**
 * Clear all transports. Useful for tests.
 */
export function clearTransports(): void {
  _transports = [];
}

/**
 * Log an error. Called at every error-handling site in DAL and actions.
 *
 * - ENABLE_DEBUG_LOGS=true → console.error with structured output
 * - ENABLE_DEBUG_LOGS unset → console silent
 * - Transports ALWAYS fire (for production remote logging)
 */
export function logError(context: LogContext, error?: unknown): void {
  const message = `[${context.layer}] ${context.operation} failed`;

  // Always send to remote transports
  for (const transport of _transports) {
    try {
      transport.send("error", message, context, error);
    } catch {
      // Transport failure must never crash the app
    }
  }

  // Console logging gated by env var
  if (isLoggingEnabled()) {
    console.error(message, {
      ...context.metadata,
      error: formatError(error),
    });
  }
}

/**
 * Log a warning (non-fatal).
 */
export function logWarn(context: LogContext, detail?: string): void {
  const message = `[${context.layer}] ${context.operation}: ${detail ?? "unexpected state"}`;

  for (const transport of _transports) {
    try {
      transport.send("warn", message, context);
    } catch {
      // swallow
    }
  }

  if (isLoggingEnabled()) {
    console.warn(message, context.metadata);
  }
}
