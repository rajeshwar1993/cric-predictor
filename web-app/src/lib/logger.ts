/**
 * Centralized error logging for Bragg.
 *
 * - Console output gated by ENABLE_DEBUG_LOGS env var
 * - Transport system for future remote logging (Sentry, Axiom, etc.)
 * - Structured JSON output in production for log aggregation
 * - PII sanitization on all metadata before output
 * - Zero external dependencies (sanitize module is a pure utility), Edge-compatible, mockable
 */

import { sanitizeProperties } from "@/lib/analytics/sanitize";

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

function isProduction(): boolean {
  try {
    return process.env.NODE_ENV === "production";
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

/**
 * Internal output helper. Handles structured JSON in production
 * and human-readable output in development.
 */
function output(
  level: LogLevel,
  message: string,
  context: LogContext,
  error?: unknown
): void {
  if (!isLoggingEnabled()) return;

  const consoleFn =
    level === "error" ? console.error :
    level === "warn" ? console.warn :
    console.info;

  if (isProduction()) {
    // Structured JSON for log aggregation (Vercel logs, future Axiom/Datadog)
    const entry: Record<string, unknown> = {
      level,
      message,
      layer: context.layer,
      operation: context.operation,
      metadata: context.metadata ? sanitizeProperties(context.metadata) : undefined,
      timestamp: new Date().toISOString(),
    };
    if (error instanceof Error) {
      entry.error = {
        message: error.message,
        name: error.name,
        stack: error.stack?.slice(0, 1000),
      };
    } else if (error) {
      entry.error = error;
    }
    consoleFn(JSON.stringify(entry));
  } else {
    // Human-readable for development (original behavior)
    const devData: Record<string, unknown> = {
      ...(context.metadata ? sanitizeProperties(context.metadata) : {}),
      ...(error ? { error: formatError(error) } : {}),
    };
    // Always pass sanitized data -- never fall back to raw metadata.
    // When devData is empty (no metadata, no error), pass undefined.
    consoleFn(message, Object.keys(devData).length > 0 ? devData : undefined);
  }
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
 * - ENABLE_DEBUG_LOGS=true -> console.error with structured output
 * - ENABLE_DEBUG_LOGS unset -> console silent
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

  output("error", message, context, error);
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

  output("warn", message, context);
}

/**
 * Log an informational message (non-error, non-warning).
 * Useful for action entry points, important state transitions.
 */
export function logInfo(context: LogContext, detail?: string): void {
  const message = `[${context.layer}] ${context.operation}${detail ? `: ${detail}` : ""}`;

  for (const transport of _transports) {
    try {
      transport.send("info", message, context);
    } catch {
      // swallow
    }
  }

  output("info", message, context);
}
