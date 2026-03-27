"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getPostHogClient } from "@/lib/posthog/client";
import { registerTransport } from "@/lib/logger";
import { createPostHogTransport } from "@/lib/posthog/transport";

const NO_TRACK_ROUTES = ["/privacy", "/terms"];

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPathRef = useRef<string>("");

  // Initialize PostHog + register logger transport on mount
  useEffect(() => {
    getPostHogClient();
    registerTransport(createPostHogTransport());
  }, []);

  // Track page views on route changes
  useEffect(() => {
    const posthog = getPostHogClient();
    if (!posthog) return;

    const isNoTrack = NO_TRACK_ROUTES.some((r) => pathname.startsWith(r));

    if (isNoTrack) {
      posthog.opt_out_capturing();
      return;
    }

    if (posthog.has_opted_out_capturing()) {
      posthog.opt_in_capturing();
    }

    const url =
      pathname +
      (searchParams.toString() ? `?${searchParams.toString()}` : "");

    if (url !== lastPathRef.current) {
      posthog.capture("$pageview", { $current_url: url });
      lastPathRef.current = url;
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}
