"use client";

import { useEffect } from "react";
import { getPostHogClient } from "@/lib/posthog/client";
import { ANALYTICS_EVENTS } from "@/lib/posthog/events";
import { ErrorState } from "@/components/shared/error-state";

export default function GroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    getPostHogClient()?.capture(ANALYTICS_EVENTS.ERROR_BOUNDARY_CAUGHT, {
      error_message: error.message,
      error_digest: error.digest,
      context: "group",
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
