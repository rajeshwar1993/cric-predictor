import "@testing-library/jest-dom/vitest";

// Mock PostHog globally to prevent analytics calls during tests
vi.mock("posthog-js", () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    isFeatureEnabled: vi.fn().mockReturnValue(false),
    onFeatureFlags: vi.fn(),
    opt_out_capturing: vi.fn(),
    opt_in_capturing: vi.fn(),
    has_opted_out_capturing: vi.fn().mockReturnValue(false),
    debug: vi.fn(),
  },
}));

vi.mock("posthog-node", () => ({
  PostHog: vi.fn().mockImplementation(() => ({
    capture: vi.fn(),
    isFeatureEnabled: vi.fn().mockResolvedValue(false),
    shutdown: vi.fn(),
  })),
}));

// Mock Firebase to prevent analytics calls during tests
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
}));

vi.mock("firebase/analytics", () => ({
  getAnalytics: vi.fn().mockReturnValue({}),
  initializeAnalytics: vi.fn().mockReturnValue({}),
  isSupported: vi.fn().mockResolvedValue(false), // disabled in tests
  logEvent: vi.fn(),
  setUserId: vi.fn(),
}));

// Mock web-vitals
vi.mock("web-vitals", () => ({
  onLCP: vi.fn(),
  onINP: vi.fn(),
  onCLS: vi.fn(),
}));
