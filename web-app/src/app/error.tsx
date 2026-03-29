"use client";

import { useEffect } from "react";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";
import { ErrorState } from "@/components/shared/error-state";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.ERROR_BOUNDARY_CAUGHT, {
      error_message: error.message,
      error_digest: error.digest,
      error_stack: error.stack?.slice(0, 1000),
      error_context: "app",
      page_path: window.location.pathname,
    });
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <ErrorState
        message="Something went wrong. Our bad — give it another shot."
        onRetry={reset}
      />
    </div>
  );
}
