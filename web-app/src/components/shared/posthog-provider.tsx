"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getPostHogClient } from "@/lib/posthog/client";
import { registerTransport } from "@/lib/logger";
import { createPostHogTransport } from "@/lib/posthog/transport";
import { trackPageView } from "@/lib/analytics";
import { registerGlobalErrorHandlers } from "@/lib/analytics/error-handler";
import { reportWebVitals, reportPageLoadTime } from "@/lib/analytics/web-vitals";

const NO_TRACK_ROUTES = ["/privacy", "/terms"];

// Module-level flags (persist across re-renders, reset on HMR full reload).
// Guards against duplicate registration in React Strict Mode double-mount.
let clientTransportRegistered = false;
let globalErrorHandlersRegistered = false;
let webVitalsRegistered = false;
let pageLoadTimeRegistered = false;

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPathRef = useRef<string>("");

  // Initialize PostHog + register logger transport + global error handlers on mount
  useEffect(() => {
    getPostHogClient();
    if (!clientTransportRegistered) {
      registerTransport(createPostHogTransport());
      clientTransportRegistered = true;
    }
    if (!globalErrorHandlersRegistered) {
      registerGlobalErrorHandlers();
      globalErrorHandlersRegistered = true;
    }
    if (!webVitalsRegistered) {
      reportWebVitals();
      webVitalsRegistered = true;
    }
    if (!pageLoadTimeRegistered) {
      reportPageLoadTime();
      pageLoadTimeRegistered = true;
    }
  }, []);

  // Track page views on route changes -- independent of PostHog availability.
  // trackPageView dispatches to both PostHog and Firebase via the unified layer.
  // PostHog opt-out for no-track routes is handled separately.
  useEffect(() => {
    const isNoTrack = NO_TRACK_ROUTES.some((r) => pathname.startsWith(r));

    // Manage PostHog opt-out/opt-in for privacy routes (PostHog-specific).
    // This is separate from page view dispatch so Firebase still works
    // even when PostHog is blocked or unconfigured.
    const posthog = getPostHogClient();
    if (posthog) {
      if (isNoTrack) {
        posthog.opt_out_capturing();
      } else if (posthog.has_opted_out_capturing()) {
        posthog.opt_in_capturing();
      }
    }

    // Do not track page views on privacy-sensitive routes
    if (isNoTrack) return;

    const url =
      pathname +
      (searchParams.toString() ? `?${searchParams.toString()}` : "");

    if (url !== lastPathRef.current) {
      trackPageView(url);
      lastPathRef.current = url;
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}
