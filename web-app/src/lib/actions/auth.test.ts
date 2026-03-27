import {
  createMockSupabaseClient,
} from "@/test/helpers/mock-supabase";

const mockClient = createMockSupabaseClient();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockClient)),
}));

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (...args: any[]) => mockRedirect(...args),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  })),
}));

import { signInWithMagicLink, signOut } from "./auth";

beforeEach(() => {
  vi.clearAllMocks();
  mockClient.auth.signInWithOtp.mockResolvedValue({ error: null });
  mockClient.auth.signOut.mockResolvedValue({ error: null });
});

// ---------------------------------------------------------------------------
// signInWithMagicLink (email only — no displayName)
// ---------------------------------------------------------------------------
describe("signInWithMagicLink", () => {
  it("returns error for empty email", async () => {
    const result = await signInWithMagicLink("");
    expect(result).toEqual({ success: false, error: "Please enter a valid email address" });
    expect(mockClient.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("returns error for email without @", async () => {
    const result = await signInWithMagicLink("notanemail");
    expect(result).toEqual({ success: false, error: "Please enter a valid email address" });
  });

  it("returns error for email longer than 254 chars", async () => {
    const longEmail = "a".repeat(246) + "@test.com";
    const result = await signInWithMagicLink(longEmail);
    expect(result).toEqual({ success: false, error: "Please enter a valid email address" });
  });

  it("sends magic link with valid email (no display_name metadata)", async () => {
    const result = await signInWithMagicLink("test@example.com");
    expect(result).toEqual({ success: true });
    expect(mockClient.auth.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "test@example.com",
      })
    );
    // Verify no display_name in metadata
    const callArgs = mockClient.auth.signInWithOtp.mock.calls[0][0];
    expect(callArgs.options?.data).toBeUndefined();
  });

  it("sanitizes safe redirect path", async () => {
    await signInWithMagicLink("test@example.com", "/dashboard");
    const callOptions = mockClient.auth.signInWithOtp.mock.calls[0][0].options;
    expect(callOptions.emailRedirectTo).toContain(
      encodeURIComponent("/dashboard")
    );
  });

  it("strips protocol-relative URL redirect (//evil.com)", async () => {
    await signInWithMagicLink("test@example.com", "//evil.com");
    const callOptions = mockClient.auth.signInWithOtp.mock.calls[0][0].options;
    expect(callOptions.emailRedirectTo).not.toContain("evil.com");
  });

  it("strips absolute URL redirect", async () => {
    await signInWithMagicLink("test@example.com", "https://evil.com");
    const callOptions = mockClient.auth.signInWithOtp.mock.calls[0][0].options;
    expect(callOptions.emailRedirectTo).not.toContain("evil.com");
  });

  it("maps known rate limit error", async () => {
    mockClient.auth.signInWithOtp.mockResolvedValue({
      error: { message: "Email rate limit exceeded" },
    });
    const result = await signInWithMagicLink("test@example.com");
    expect(result).toEqual({
      success: false,
      error: "Too many requests. Please wait a moment and try again.",
    });
  });

  it("maps known 60-second cooldown error", async () => {
    mockClient.auth.signInWithOtp.mockResolvedValue({
      error: {
        message: "For security purposes, you can only request this once every 60 seconds",
      },
    });
    const result = await signInWithMagicLink("test@example.com");
    expect(result).toEqual({
      success: false,
      error: "Please wait 60 seconds before requesting another link.",
    });
  });

  it("returns generic error for unknown errors", async () => {
    mockClient.auth.signInWithOtp.mockResolvedValue({
      error: { message: "Some random internal error" },
    });
    const result = await signInWithMagicLink("test@example.com");
    expect(result).toEqual({
      success: false,
      error: "Unable to send magic link. Please try again.",
    });
  });
});

// ---------------------------------------------------------------------------
// signOut
// ---------------------------------------------------------------------------
describe("signOut", () => {
  it("calls supabase signOut and redirects to /", async () => {
    await signOut();
    expect(mockClient.auth.signOut).toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });
});
