/**
 * Analytics barrel export.
 *
 * IMPORTANT: Only re-export types and the events constant from here.
 * Do NOT re-export client.ts or server.ts — they must be imported
 * directly to avoid bundling posthog-js in server code or
 * posthog-node in client code.
 */
export { ANALYTICS_EVENTS, type AnalyticsEvent } from './events'
