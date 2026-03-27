/**
 * Storybook mock for the posthog-node package.
 * Provides a no-op PostHog class to prevent Node.js APIs from loading in the browser.
 */
export class PostHog {
  constructor(_apiKey: string, _options?: Record<string, unknown>) {}
  capture(_event: Record<string, unknown>) {}
  async isFeatureEnabled(_flag: string, _distinctId: string) {
    return false;
  }
  async shutdown() {}
}
