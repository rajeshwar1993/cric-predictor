// Mock posthog-node for Storybook (browser environment)
export class PostHog {
  constructor() {}
  capture() {}
  identify() {}
  flush() {
    return Promise.resolve()
  }
}

export default PostHog
