/**
 * Storybook mock for @/lib/posthog/server
 * Prevents posthog-node (Node.js-only) from being bundled in the browser.
 */
export function getPostHogServer() {
  return null;
}

export function captureServerEvent(
  _userId: string,
  _event: string,
  _properties?: Record<string, unknown>
) {
  // no-op in Storybook
}

export async function getServerFeatureFlag(
  _userId: string,
  _flagName: string
): Promise<boolean> {
  return false;
}
