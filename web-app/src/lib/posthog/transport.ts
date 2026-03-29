import type { LogTransport, LogLevel, LogContext } from "@/lib/logger";
import { ANALYTICS_EVENTS } from "./events";

/**
 * PostHog log transport for the existing logger.
 * Works on both client and server by dynamically importing the right module.
 */
export function createPostHogTransport(): LogTransport {
  return {
    send(
      level: LogLevel,
      message: string,
      context: LogContext,
      error?: unknown
    ): void {
      // Only forward errors and warnings
      if (level !== "error" && level !== "warn") return;

      const properties: Record<string, unknown> = {
        level,
        message,
        layer: context.layer,
        operation: context.operation,
        ...context.metadata,
      };

      if (error instanceof Error) {
        properties.error_message = error.message;
        properties.error_name = error.name;
        properties.error_stack = error.stack?.slice(0, 1000);
        properties.error_code = (error as unknown as Record<string, unknown>).code;
      } else if (error) {
        properties.error_raw = JSON.stringify(error).slice(0, 500);
      }

      if (typeof window !== "undefined") {
        // Client-side
        import("./client").then(({ getPostHogClient }) => {
          const ph = getPostHogClient();
          ph?.capture(ANALYTICS_EVENTS.ERROR_LOGGED, properties);
        });
      } else {
        // Server-side -- use userId from context metadata if available
        const userId =
          (context.metadata?.userId as string) ?? "system";

        import("./server").then(({ getPostHogServer }) => {
          const ph = getPostHogServer();
          ph?.capture({
            distinctId: userId,
            event: ANALYTICS_EVENTS.ERROR_LOGGED,
            properties,
          });
        });
      }
    },
  };
}
