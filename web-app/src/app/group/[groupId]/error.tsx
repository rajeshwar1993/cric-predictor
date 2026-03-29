"use client";

import { useEffect } from "react";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";
import { ErrorState } from "@/components/shared/error-state";

export default function GroupError({
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
      error_context: "group",
      page_path: window.location.pathname,
    });
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <ErrorState
        message="Couldn't load this page. The squad's still there — try again."
        onRetry={reset}
      />
    </div>
  );
}
