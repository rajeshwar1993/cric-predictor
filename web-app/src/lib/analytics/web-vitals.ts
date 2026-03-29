/**
 * Web Vitals and page load timing reporter.
 *
 * Reports Core Web Vitals (LCP, INP, CLS) and Navigation Timing
 * to the unified analytics layer. Both are dynamically imported
 * to keep them out of the critical rendering path.
 *
 * Call once from PostHogProvider on mount. Client-side only.
 * Both functions are idempotent -- safe to call multiple times.
 */

import type { Metric } from "web-vitals";

let webVitalsInitialized = false;
let pageLoadTimeInitialized = false;

/**
 * Reports Core Web Vitals to the unified analytics layer.
 * Idempotent -- duplicate calls are no-ops.
 */
export function reportWebVitals(): void {
  if (typeof window === "undefined") return;
  if (webVitalsInitialized) return;
  webVitalsInitialized = true;

  import("web-vitals")
    .then(({ onLCP, onINP, onCLS }) => {
      const sendMetric = (metric: Metric) => {
        import("./index").then(({ trackEvent, ANALYTICS_EVENTS }) => {
          const eventMap: Record<string, string> = {
            LCP: ANALYTICS_EVENTS.WEB_VITALS_LCP,
            INP: ANALYTICS_EVENTS.WEB_VITALS_INP,
            CLS: ANALYTICS_EVENTS.WEB_VITALS_CLS,
          };
          const eventName = eventMap[metric.name];
          if (!eventName) return;

          trackEvent(eventName, {
            value: metric.value,
            rating: metric.rating, // "good" | "needs-improvement" | "poor"
            page_path: window.location.pathname,
            navigation_type: metric.navigationType,
          });
        });
      };

      onLCP(sendMetric);
      onINP(sendMetric);
      onCLS(sendMetric);
    })
    .catch(() => {
      // web-vitals not available in this browser -- no-op
    });
}

/**
 * Reports page load timing using Navigation Timing API.
 * Only fires on full page loads (not client-side navigations).
 * Idempotent -- duplicate calls are no-ops.
 */
export function reportPageLoadTime(): void {
  if (typeof window === "undefined") return;
  if (pageLoadTimeInitialized) return;
  pageLoadTimeInitialized = true;

  const report = () => {
    const entries = performance.getEntriesByType("navigation");
    if (entries.length === 0) return;

    const nav = entries[0] as PerformanceNavigationTiming;
    import("./index").then(({ trackEvent, ANALYTICS_EVENTS }) => {
      trackEvent(ANALYTICS_EVENTS.PAGE_LOAD_TIME, {
        dom_content_loaded_ms: Math.round(
          nav.domContentLoadedEventEnd - nav.startTime
        ),
        full_load_ms: Math.round(nav.loadEventEnd - nav.startTime),
        page_path: window.location.pathname,
      });
    });
  };

  if (document.readyState === "complete") {
    // Already loaded -- report immediately (with a small delay for accuracy)
    setTimeout(report, 0);
  } else {
    window.addEventListener("load", () => setTimeout(report, 0), {
      once: true,
    });
  }
}
