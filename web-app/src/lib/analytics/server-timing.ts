/**
 * Server action timing instrumentation.
 *
 * Provides a `withTiming` higher-order function that wraps server actions
 * to measure wall-clock execution time and report via the unified analytics
 * layer (which applies PII sanitization).
 *
 * Usage:
 *   export const submitPredictions = withTiming("submitPredictions", async (...) => {
 *     // ... existing action body
 *   });
 */

import { trackServerEvent } from "@/lib/analytics";
import { ANALYTICS_EVENTS } from "@/lib/posthog/events";
import { logWarn } from "@/lib/logger";

const SLOW_THRESHOLD_MS = 3000;

/**
 * Wraps a server action with timing instrumentation.
 * Measures wall-clock execution time and reports via the unified analytics layer.
 * Actions taking longer than SLOW_THRESHOLD_MS are also logged as warnings.
 */
export function withTiming<TArgs extends unknown[], TReturn>(
  actionName: string,
  fn: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    const start = performance.now();
    let success = true;

    try {
      const result = await fn(...args);
      // Check ActionResponse pattern
      if (
        result &&
        typeof result === "object" &&
        "success" in result &&
        (result as Record<string, unknown>).success === false
      ) {
        success = false;
      }
      return result;
    } catch (err) {
      success = false;
      throw err;
    } finally {
      const duration = Math.round(performance.now() - start);

      // Fire-and-forget: send timing event through the unified analytics layer
      trackServerEvent("system", ANALYTICS_EVENTS.SERVER_ACTION_DURATION, {
        action_name: actionName,
        duration_ms: duration,
        success,
      });

      if (duration > SLOW_THRESHOLD_MS) {
        logWarn(
          {
            layer: "action",
            operation: actionName,
            metadata: { duration_ms: duration },
          },
          `Slow server action: ${duration}ms`
        );
      }
    }
  };
}
